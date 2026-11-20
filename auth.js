// Comptes utilisateurs : inscription, connexion, déconnexion, session par cookie.
// Sans dépendance : mots de passe hachés avec scrypt (node:crypto),
// données gardées dans data/db.json (créé automatiquement, ignoré par git).
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const DATA_DIR = resolve(process.env.DATA_DIR || fileURLToPath(new URL('./data', import.meta.url)));
const DB_FILE = join(DATA_DIR, 'db.json');
const COOKIE = 'sid';
const SESSION_TTL = 30 * 24 * 3600 * 1000; // 30 jours
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

// --- Données en mémoire (sauvegardées dans db.json à chaque changement) ---
const usersById = new Map();
const usersByLogin = new Map(); // e-mail ou identifiant (en minuscules) -> utilisateur

function indexUser(u) {
  if (u.email) usersByLogin.set(u.email, u);
  if (u.username) usersByLogin.set(u.username.toLowerCase(), u);
}
function unindexUser(u) {
  if (u.email) usersByLogin.delete(u.email);
  if (u.username) usersByLogin.delete(u.username.toLowerCase());
}
const sessions = new Map(); // empreinte du jeton -> { userId, exp }

async function load() {
  await mkdir(DATA_DIR, { recursive: true });
  let db = {};
  try {
    db = JSON.parse(await readFile(DB_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Lecture de ${DB_FILE} impossible : ${err.message}`);
  }
  for (const u of db.users || []) {
    usersById.set(u.id, u);
    indexUser(u);
  }
  const now = Date.now();
  for (const s of db.sessions || []) if (s.exp > now && usersById.has(s.userId)) sessions.set(s.h, { userId: s.userId, exp: s.exp });
}

let writing = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify({
    users: [...usersById.values()],
    sessions: [...sessions].map(([h, s]) => ({ h, ...s })),
  });
  const job = writing.then(async () => {
    const tmp = DB_FILE + '.tmp';
    await writeFile(tmp, snapshot, { mode: 0o600 });
    await rename(tmp, DB_FILE); // écriture atomique : jamais de fichier à moitié écrit
  });
  writing = job.catch(() => {});
  return job;
}

// --- Mots de passe ---
const SCRYPT = { N: 16384, r: 8, p: 1 };

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [alg, N, r, p, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

// Faux hachage utilisé quand l'e-mail n'existe pas, pour que la réponse prenne le même temps
const DUMMY_HASH = await hashPassword('mot-de-passe-factice');

// --- Sessions (le jeton n'est jamais stocké en clair) ---
const hashToken = (t) => createHash('sha256').update(t).digest('hex');

function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(hashToken(token), { userId, exp: Date.now() + SESSION_TTL });
  return token;
}

function readCookie(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function currentUser(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const s = sessions.get(hashToken(token));
  if (!s || s.exp < Date.now()) return null;
  return usersById.get(s.userId) || null;
}

const isSecure = (req) => Boolean(req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https';

function cookie(req, value, maxAgeSec) {
  const parts = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (isSecure(req)) parts.push('Secure');
  return parts.join('; ');
}

// --- Limitation des tentatives : par IP, et par e-mail contre les attaques réparties ---
const ipHits = new Map();
const loginFails = new Map();

const clientIp = (req) => {
  if (TRUST_PROXY) {
    const last = String(req.headers['x-forwarded-for'] || '').split(',').pop().trim();
    if (last) return last;
  }
  return req.socket.remoteAddress || 'inconnu';
};

function tooManyFromIp(ip) {
  const now = Date.now();
  let h = ipHits.get(ip);
  if (!h || now > h.reset) {
    h = { count: 0, reset: now + 10 * 60_000 };
    ipHits.set(ip, h);
  }
  h.count += 1;
  return h.count > 20; // 20 inscriptions/connexions par IP et par 10 minutes
}

const loginLocked = (email) => {
  const f = loginFails.get(email);
  return Boolean(f) && Date.now() < f.reset && f.count >= 8;
};

function noteFailure(email) {
  const now = Date.now();
  let f = loginFails.get(email);
  if (!f || now > f.reset) {
    if (loginFails.size >= 10_000) loginFails.delete(loginFails.keys().next().value);
    f = { count: 0, reset: now + 15 * 60_000 };
    loginFails.set(email, f);
  }
  f.count += 1;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, h] of ipHits) if (now > h.reset) ipHits.delete(k);
  for (const [k, f] of loginFails) if (now > f.reset) loginFails.delete(k);
  let changed = false;
  for (const [k, s] of sessions) if (s.exp < now) { sessions.delete(k); changed = true; }
  if (changed) persist().catch((e) => console.error('Sauvegarde des comptes :', e.message));
}, 10 * 60_000).unref();

// --- Utilitaires HTTP ---
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
  return true;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 10_000) throw new HttpError(413, 'Requête trop volumineuse.');
    chunks.push(c);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch { /* erreur ci-dessous */ }
  throw new HttpError(400, 'Requête invalide.');
}

// Protection CSRF : on n'accepte que du JSON envoyé depuis ce même site
function sameSiteJson(req) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

const publicUser = (u) => (u ? { username: u.username || '', email: u.email || '', name: u.username || u.email } : null);
const normEmail = (e) => String(e || '').trim().toLowerCase();
const validEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
// Identifiant : 3 à 30 caractères, sans @ (pour ne jamais être confondu avec un e-mail)
const validUsername = (u) => u.length >= 3 && u.length <= 30 && /^[\p{L}\p{N}._-]+$/u.test(u);

const ROUTES = new Set(['/api/me', '/api/signup', '/api/login', '/api/logout']);

// Renvoie true si la requête a été traitée ici
export async function handleAuth(req, res, url) {
  const path = url.pathname;
  if (!ROUTES.has(path)) return false;

  try {
    if (path === '/api/me') {
      if (req.method !== 'GET') throw new HttpError(405, 'Méthode non autorisée.');
      return send(res, 200, { user: publicUser(currentUser(req)) });
    }

    if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
    if (!sameSiteJson(req)) throw new HttpError(400, 'Requête invalide.');

    if (path === '/api/logout') {
      const token = readCookie(req, COOKIE);
      if (token && sessions.delete(hashToken(token))) await persist();
      return send(res, 200, { user: null }, { 'Set-Cookie': cookie(req, '', 0) });
    }

    if (tooManyFromIp(clientIp(req))) throw new HttpError(429, 'Trop de tentatives, réessaie dans quelques minutes.');
    const body = await readJson(req);
    const password = body.password;

    if (path === '/api/signup') {
      const email = normEmail(body.email);
      const username = String(body.username || '').trim();
      if (!email && !username) throw new HttpError(400, 'Choisis un identifiant ou renseigne une adresse e-mail.');
      if (email && !validEmail(email)) throw new HttpError(400, 'Adresse e-mail invalide.');
      if (username && !validUsername(username)) throw new HttpError(400, 'Identifiant invalide : 3 à 30 caractères, avec des lettres, chiffres, points, tirets ou underscores.');
      if (typeof password !== 'string' || password.length < 1) throw new HttpError(400, 'Choisis un mot de passe.');
      if (password.length > 128) throw new HttpError(400, 'Le mot de passe est trop long (128 caractères maximum).');

      const checkFree = () => {
        if (email && usersByLogin.has(email)) throw new HttpError(409, 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.');
        if (username && usersByLogin.has(username.toLowerCase())) throw new HttpError(409, 'Cet identifiant est déjà pris.');
      };
      checkFree();
      const hash = await hashPassword(password);
      checkFree(); // au cas où une autre requête l'aurait pris entre-temps

      const user = { id: randomUUID(), hash, createdAt: new Date().toISOString() };
      if (email) user.email = email;
      if (username) user.username = username;
      usersById.set(user.id, user);
      indexUser(user);
      const token = createSession(user.id);
      try {
        await persist();
      } catch (err) {
        usersById.delete(user.id);
        unindexUser(user);
        sessions.delete(hashToken(token));
        console.error('Création de compte :', err.message);
        throw new HttpError(500, 'Impossible de créer le compte pour le moment.');
      }
      return send(res, 201, { user: publicUser(user) }, { 'Set-Cookie': cookie(req, token, SESSION_TTL / 1000) });
    }

    // /api/login : identifiant ou e-mail
    const login = String(body.login ?? body.email ?? '').trim().toLowerCase();
    if (!login || login.length > 254 || typeof password !== 'string' || password.length > 128) {
      throw new HttpError(400, 'Renseigne ton identifiant (ou e-mail) et ton mot de passe.');
    }
    if (loginLocked(login)) throw new HttpError(429, 'Trop de tentatives, réessaie dans quelques minutes.');

    const user = usersByLogin.get(login);
    const ok = await verifyPassword(password, user ? user.hash : DUMMY_HASH);
    if (!user || !ok) {
      noteFailure(login);
      throw new HttpError(401, 'Identifiant ou mot de passe incorrect.');
    }
    loginFails.delete(login);
    const token = createSession(user.id);
    await persist();
    return send(res, 200, { user: publicUser(user) }, { 'Set-Cookie': cookie(req, token, SESSION_TTL / 1000) });
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error('Erreur compte :', err.message);
    return send(res, 500, { error: 'Erreur du serveur.' });
  }
}

await load();
