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

// --- Stockage ---
// Si SUPABASE_URL et SUPABASE_KEY sont définis (recommandé en ligne, par exemple sur Render),
// tout est gardé dans une base Supabase qui ne s'efface jamais. Sinon, dans le fichier data/db.json.
// On ne garde que le début de l'adresse (https://xxxx.supabase.co), même si /rest/v1 ou autre chose a été collé après
const SUPABASE_URL = (() => {
  const raw = (process.env.SUPABASE_URL || '').trim();
  if (!raw) return '';
  try { return new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).origin; } catch { return raw.replace(/\/+$/, ''); }
})();
const SUPABASE_KEY = (process.env.SUPABASE_KEY || '').trim();
const REMOTE = Boolean(SUPABASE_URL && SUPABASE_KEY);
const TABLE = 'app_state';
const ROW_ID = 'main';

function supabaseHeaders(extra = {}) {
  const h = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json', Accept: 'application/json', ...extra };
  if (SUPABASE_KEY.startsWith('eyJ')) h.Authorization = `Bearer ${SUPABASE_KEY}`; // ancienne clé « service_role »
  return h;
}

async function supabase(method, query, body, extra) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}${query}`, {
    method,
    headers: supabaseHeaders(extra),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status} : ${(await res.text()).slice(0, 300)}`);
  return res;
}

async function readLocalFile() {
  try {
    return JSON.parse(await readFile(DB_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`Lecture de ${DB_FILE} impossible : ${err.message}`);
  }
}

// Lit la base. En cas d'erreur, on arrête le serveur plutôt que de démarrer avec une base vide
// (sinon la première sauvegarde effacerait tous les comptes).
async function readStore() {
  if (!REMOTE) {
    await mkdir(DATA_DIR, { recursive: true });
    return (await readLocalFile()) || {};
  }
  let rows;
  for (let attempt = 1; ; attempt++) {
    try {
      rows = await (await supabase('GET', `?id=eq.${ROW_ID}&select=data`)).json();
      break;
    } catch (err) {
      if (attempt >= 5) throw new Error(`Impossible de lire les comptes sur Supabase : ${err.message}`);
      console.error(`Supabase (essai ${attempt}/5) :`, err.message);
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  if (rows.length) return rows[0].data || {};
  // Base Supabase encore vide : on reprend data/db.json s'il existe (migration), puis on l'envoie
  const local = await readLocalFile().catch(() => null);
  if (local) {
    await writeStore(JSON.stringify(local));
    console.log(`Comptes de ${DB_FILE} copiés dans Supabase.`);
  }
  return local || {};
}

async function writeStore(snapshot) {
  if (REMOTE) {
    await supabase('POST', '?on_conflict=id', { id: ROW_ID, data: JSON.parse(snapshot), updated_at: new Date().toISOString() },
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
    return;
  }
  const tmp = DB_FILE + '.tmp';
  await writeFile(tmp, snapshot, { mode: 0o600 });
  await rename(tmp, DB_FILE); // écriture atomique : jamais de fichier à moitié écrit
}

async function load() {
  const db = await readStore();
  for (const u of db.users || []) {
    usersById.set(u.id, u);
    indexUser(u);
  }
  const now = Date.now();
  for (const s of db.sessions || []) if (s.exp > now && usersById.has(s.userId)) sessions.set(s.h, { userId: s.userId, exp: s.exp });
  console.log(`Comptes : ${usersById.size} chargé(s) depuis ${REMOTE ? 'Supabase' : DB_FILE}.`);
  if (!REMOTE && process.env.RENDER) {
    console.warn('⚠ Sur Render, data/db.json est effacé à chaque redémarrage : configure SUPABASE_URL et SUPABASE_KEY (voir README).');
  }
}

let writing = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify({
    users: [...usersById.values()],
    sessions: [...sessions].map(([h, s]) => ({ h, ...s })),
  });
  const job = writing.then(() => writeStore(snapshot));
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
  const u = usersById.get(s.userId) || null;
  if (u) u.lastSeen = Date.now(); // présence : la page envoie un signe de vie toutes les 30 s
  return u;
}

// Considéré « en ligne » si un signe de vie est arrivé il y a moins de 75 s
const ONLINE_MS = 75_000;
const presence = (u) => ({ online: Boolean(u.lastSeen) && Date.now() - u.lastSeen < ONLINE_MS, lastSeen: u.lastSeen || 0 });

const isSecure = (req) => Boolean(req.socket.encrypted) || req.headers['x-forwarded-proto'] === 'https';

function cookie(req, value, maxAgeSec) {
  const parts = [`${COOKIE}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (isSecure(req)) parts.push('Secure');
  return parts.join('; ');
}

// --- Limitation des tentatives : par IP, et par e-mail contre les attaques réparties ---
const ipHits = new Map();
const loginFails = new Map();

export const clientIp = (req) => {
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
  for (const [k, w] of dataWrites) if (now > w.reset) dataWrites.delete(k);
  for (const [k, w] of friendActs) if (now > w.reset) friendActs.delete(k);
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

async function readJson(req, max = 10_000) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > max) throw new HttpError(413, 'Requête trop volumineuse.');
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
const USERNAME_HELP = 'Identifiant invalide : 3 à 30 caractères, avec des lettres, chiffres, points, tirets ou underscores.';
const validUsername = (u) => u.length >= 3 && u.length <= 30 && /^[\p{L}\p{N}._-]+$/u.test(u);

// --- Données du compte : favoris, historique, nombre de recherches, calages des paroles ---
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const httpsUrl = (v) => { const u = str(v, 500); return /^https:\/\//.test(u) ? u : ''; };

// Ne garde que ce qu'on attend, avec des tailles limitées (le client n'est jamais digne de confiance)
function cleanData(d) {
  const out = { favorites: [], history: [], searches: 0, offsets: {} };
  const seen = new Set();
  for (const f of Array.isArray(d.favorites) ? d.favorites.slice(0, 500) : []) {
    if (!f || typeof f !== 'object') continue;
    const title = str(f.title, 200).trim();
    if (!title) continue;
    const artist = str(f.artist, 200);
    const key = (title + '|' + artist).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.favorites.push({ key, title, artist, image: httpsUrl(f.image), url: httpsUrl(f.url), preview: httpsUrl(f.preview) });
  }
  for (const h of Array.isArray(d.history) ? d.history.slice(0, 20) : []) {
    if (!h || typeof h !== 'object') continue;
    const q = str(h.q, 200).trim();
    const title = str(h.title, 200).trim();
    if (q && title) out.history.push({ q, title, artist: str(h.artist, 200) });
  }
  const n = Number(d.searches);
  if (Number.isFinite(n)) out.searches = Math.min(Math.max(0, Math.floor(n)), 1e9);
  if (d.offsets && typeof d.offsets === 'object') {
    for (const [k, v] of Object.entries(d.offsets).slice(0, 500)) {
      const num = Number(v);
      if (k && k.length <= 300 && k !== '__proto__' && Number.isFinite(num) && Math.abs(num) < 1e5) out.offsets[k] = num;
    }
  }
  return out;
}

const dataWrites = new Map(); // userId -> { count, reset }
const friendActs = new Map();
function hitLimit(map, id, max) {
  const now = Date.now();
  let w = map.get(id);
  if (!w || now > w.reset) {
    w = { count: 0, reset: now + 60_000 };
    map.set(id, w);
  }
  w.count += 1;
  return w.count > max;
}
const tooManyWrites = (userId) => hitLimit(dataWrites, userId, 60); // 60 sauvegardes par minute et par compte

// --- Amis : demandes, acceptation, et consultation de l'historique et des favoris ---
const ensureFriendFields = (u) => {
  u.friends ||= [];
  u.incoming ||= [];
  u.outgoing ||= [];
};

function findByUsername(v) {
  const name = String(v || '').trim();
  if (!validUsername(name)) return null; // un identifiant ne contient jamais « @ » : on ne peut pas tomber sur un e-mail
  return usersByLogin.get(name.toLowerCase()) || null;
}

function listFriends(me) {
  const users = (ids) => ids.map((id) => usersById.get(id)).filter((u) => u && u.username);
  const names = (ids) => users(ids)
    .map((u) => ({ username: u.username }))
    .sort((a, b) => a.username.localeCompare(b.username));
  // Seuls les amis voient si tu es en ligne (pas les demandes en attente)
  const friends = users(me.friends)
    .map((u) => ({ username: u.username, ...presence(u) }))
    .sort((a, b) => b.online - a.online || a.username.localeCompare(b.username));
  return { friends, incoming: names(me.incoming), outgoing: names(me.outgoing) };
}

const FRIEND_ACTIONS = new Set(['request', 'accept', 'decline', 'cancel', 'remove']);

async function handleFriends(req, res, url, me) {
  ensureFriendFields(me);
  const action = url.pathname.slice('/api/friends'.length).replace(/^\//, '');

  if (req.method === 'GET') {
    if (action === '') return send(res, 200, listFriends(me));
    if (action === 'data') {
      const target = findByUsername(url.searchParams.get('username'));
      if (!target || !me.friends.includes(target.id)) throw new HttpError(403, 'Tu ne peux voir que les données de tes amis.');
      const d = target.data || cleanData({});
      return send(res, 200, { username: target.username, favorites: d.favorites, history: d.history });
    }
    throw new HttpError(404, 'Introuvable.');
  }

  if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
  if (!FRIEND_ACTIONS.has(action)) throw new HttpError(404, 'Introuvable.');
  if (!sameSiteJson(req)) throw new HttpError(400, 'Requête invalide.');
  if (hitLimit(friendActs, me.id, 30)) throw new HttpError(429, 'Trop d’actions, réessaie dans une minute.');
  if (!me.username) throw new HttpError(403, 'Choisis d’abord un identifiant pour utiliser les amis.');

  const body = await readJson(req);
  const target = findByUsername(body.username);
  if (!target) throw new HttpError(404, 'Aucun utilisateur avec cet identifiant.');
  if (target.id === me.id) throw new HttpError(400, 'Tu ne peux pas t’ajouter toi-même.');
  ensureFriendFields(target);

  const snapshot = [me, target].map((u) => ({ u, friends: [...u.friends], incoming: [...u.incoming], outgoing: [...u.outgoing] }));
  const rm = (arr, id) => { const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); };
  const add = (arr, id) => { if (!arr.includes(id)) arr.push(id); };
  const befriend = () => {
    rm(me.incoming, target.id); rm(me.outgoing, target.id);
    rm(target.incoming, me.id); rm(target.outgoing, me.id);
    add(me.friends, target.id); add(target.friends, me.id);
  };

  if (action === 'request') {
    if (me.friends.includes(target.id)) throw new HttpError(409, 'Vous êtes déjà amis.');
    if (me.outgoing.includes(target.id)) throw new HttpError(409, 'Demande déjà envoyée.');
    if (me.incoming.includes(target.id)) befriend(); // il t'avait déjà invité : c'est accepté
    else { add(me.outgoing, target.id); add(target.incoming, me.id); }
  } else if (action === 'accept') {
    if (!me.incoming.includes(target.id)) throw new HttpError(404, 'Aucune demande de cette personne.');
    befriend();
  } else if (action === 'decline') {
    rm(me.incoming, target.id); rm(target.outgoing, me.id);
  } else if (action === 'cancel') {
    rm(me.outgoing, target.id); rm(target.incoming, me.id);
  } else { // remove
    rm(me.friends, target.id); rm(target.friends, me.id);
  }

  try {
    await persist();
  } catch (err) {
    for (const x of snapshot) Object.assign(x.u, { friends: x.friends, incoming: x.incoming, outgoing: x.outgoing });
    console.error('Amis :', err.message);
    throw new HttpError(500, 'Action impossible pour le moment.');
  }
  return send(res, 200, listFriends(me));
}

const ROUTES = new Set(['/api/me', '/api/signup', '/api/login', '/api/logout', '/api/data', '/api/username']);

// Renvoie true si la requête a été traitée ici
export async function handleAuth(req, res, url) {
  const path = url.pathname;
  const isFriends = path === '/api/friends' || path.startsWith('/api/friends/');
  if (!ROUTES.has(path) && !isFriends) return false;

  try {
    if (path === '/api/me') {
      if (req.method !== 'GET') throw new HttpError(405, 'Méthode non autorisée.');
      return send(res, 200, { user: publicUser(currentUser(req)) });
    }

    if (isFriends) {
      const me = currentUser(req);
      if (!me) throw new HttpError(401, 'Connecte-toi pour utiliser les amis.');
      return await handleFriends(req, res, url, me);
    }

    if (path === '/api/data') {
      const me = currentUser(req);
      if (!me) throw new HttpError(401, 'Connecte-toi pour retrouver tes données.');
      // fresh : rien n'a encore jamais été enregistré pour ce compte (le navigateur peut alors alimenter le compte)
      if (req.method === 'GET') return send(res, 200, { data: me.data || cleanData({}), fresh: !me.data });
      if (req.method !== 'PUT') throw new HttpError(405, 'Méthode non autorisée.');
      if (!sameSiteJson(req)) throw new HttpError(400, 'Requête invalide.');
      if (tooManyWrites(me.id)) throw new HttpError(429, 'Trop de sauvegardes, réessaie dans une minute.');
      const previous = me.data;
      me.data = cleanData(await readJson(req, 400_000));
      try {
        await persist();
      } catch (err) {
        me.data = previous;
        console.error('Sauvegarde des données du compte :', err.message);
        throw new HttpError(500, 'Sauvegarde impossible pour le moment.');
      }
      return send(res, 200, { ok: true });
    }

    if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
    if (!sameSiteJson(req)) throw new HttpError(400, 'Requête invalide.');

    if (path === '/api/logout') {
      const token = readCookie(req, COOKIE);
      const leaving = currentUser(req);
      if (leaving) leaving.lastSeen = Date.now() - ONLINE_MS; // n'apparaît plus « en ligne » tout de suite
      if (token && sessions.delete(hashToken(token))) await persist();
      return send(res, 200, { user: null }, { 'Set-Cookie': cookie(req, '', 0) });
    }

    if (tooManyFromIp(clientIp(req))) throw new HttpError(429, 'Trop de tentatives, réessaie dans quelques minutes.');
    // Choix de l'identifiant pour un compte qui n'en a pas encore (comptes créés avant qu'il soit obligatoire)
    if (path === '/api/username') {
      const me = currentUser(req);
      if (!me) throw new HttpError(401, 'Connecte-toi d’abord.');
      if (me.username) throw new HttpError(409, 'Tu as déjà un identifiant.');
      const username = String((await readJson(req)).username || '').trim();
      if (!validUsername(username)) throw new HttpError(400, USERNAME_HELP);
      if (usersByLogin.has(username.toLowerCase())) throw new HttpError(409, 'Cet identifiant est déjà pris.');
      me.username = username;
      indexUser(me);
      try {
        await persist();
      } catch (err) {
        usersByLogin.delete(username.toLowerCase());
        delete me.username;
        console.error('Identifiant :', err.message);
        throw new HttpError(500, 'Impossible d’enregistrer l’identifiant pour le moment.');
      }
      return send(res, 200, { user: publicUser(me) });
    }

    const body = await readJson(req);
    const password = body.password;

    if (path === '/api/signup') {
      const email = normEmail(body.email);
      const username = String(body.username || '').trim();
      if (!username) throw new HttpError(400, 'Choisis un identifiant.');
      if (email && !validEmail(email)) throw new HttpError(400, 'Adresse e-mail invalide.');
      if (!validUsername(username)) throw new HttpError(400, USERNAME_HELP);
      if (typeof password !== 'string' || password.length < 1) throw new HttpError(400, 'Choisis un mot de passe.');
      if (password.length < 8) throw new HttpError(400, 'Le mot de passe doit faire au moins 8 caractères.');
      if (password.length > 128) throw new HttpError(400, 'Le mot de passe est trop long (128 caractères maximum).');

      const checkFree = () => {
        if (email && usersByLogin.has(email)) throw new HttpError(409, 'Un compte existe déjà avec cet e-mail. Connecte-toi plutôt.');
        if (usersByLogin.has(username.toLowerCase())) throw new HttpError(409, 'Cet identifiant est déjà pris.');
      };
      checkFree();
      const hash = await hashPassword(password);
      checkFree(); // au cas où une autre requête l'aurait pris entre-temps

      const user = { id: randomUUID(), username, hash, createdAt: new Date().toISOString() };
      if (email) user.email = email;
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
