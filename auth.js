// Comptes utilisateurs : inscription, connexion, déconnexion, session par cookie.
// Sans dépendance : mots de passe hachés avec scrypt (node:crypto),
// données gardées dans data/db.json (créé automatiquement, ignoré par git).
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { newVapidKeys, sendPush, validSubscription } from './push.js';
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

// --- Statistiques du site (visibles seulement par l'admin) ---
// total : compteurs depuis le début ; days : les mêmes compteurs jour par jour (90 derniers jours)
const stats = { since: new Date().toISOString(), total: {}, days: {} };
let statsDirty = false;
const today = () => new Date().toISOString().slice(0, 10);
export function countStat(name, n = 1) {
  stats.total[name] = (stats.total[name] || 0) + n;
  const d = (stats.days[today()] ||= {});
  d[name] = (d[name] || 0) + n;
  statsDirty = true;
}
// on sauvegarde les compteurs au plus une fois par minute (pas à chaque recherche)
setInterval(() => {
  if (!statsDirty) return;
  statsDirty = false;
  const keys = Object.keys(stats.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 90))) delete stats.days[k];
  persist().catch((err) => { statsDirty = true; console.error('Stats : sauvegarde impossible :', err.message); });
}, 60_000).unref();

// Les « effets en direct » lancés par les admins : annonce en haut du site, confettis, couronnes
const live = { announce: null, confetti: null, crowns: [], shake: null };
export function liveState() {
  const now = Date.now();
  return {
    announce: live.announce && live.announce.until > now ? live.announce : null,
    confetti: live.confetti && now - live.confetti.at < 60_000 ? live.confetti : null,
    shake: live.shake && now - live.shake.at < 60_000 ? live.shake : null,
    crowns: live.crowns || [],
  };
}

// L'admin : les identifiants listés dans ADMIN_USERNAME (sur Render), séparés par des virgules
const ADMINS = new Set(String(process.env.ADMIN_USERNAME || '').split(',').map((x) => x.trim().replace(/^@+/, '').toLowerCase()).filter(Boolean));
export const isAdmin = (u) => Boolean(u && u.username && ADMINS.has(u.username.toLowerCase()));

export function adminStats(extra = {}) {
  const users = [...usersById.values()].filter((u) => u.username);
  const now = Date.now();
  const day = 86_400_000;
  const created = (u) => Date.parse(u.createdAt || '') || 0;
  const startOfToday = Date.parse(today() + 'T00:00:00Z');
  const sumDays = (name, n) => {
    let t = 0;
    for (let i = 0; i < n; i++) t += (stats.days[new Date(now - i * day).toISOString().slice(0, 10)] || {})[name] || 0;
    return t;
  };
  const counter = (name) => ({ total: stats.total[name] || 0, today: sumDays(name, 1), week: sumDays(name, 7) });
  const pr = users.map((u) => presence(u));
  const friendships = users.reduce((n, u) => n + (u.friends || []).length, 0) / 2;
  const signupsOn = (date) => users.filter((u) => (u.createdAt || '').slice(0, 10) === date).length;
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * day).toISOString().slice(0, 10);
    const d = stats.days[date] || {};
    days.push({ date, searches: d.searches || 0, visits: d.visits || 0, signups: signupsOn(date), games: d.bt_games || 0 });
  }
  const played = users.filter((u) => u.bt && u.bt.games);
  return {
    generatedAt: new Date().toISOString(),
    since: stats.since,
    accounts: {
      total: users.length,
      today: users.filter((u) => created(u) >= startOfToday).length,
      week: users.filter((u) => created(u) >= now - 7 * day).length,
      month: users.filter((u) => created(u) >= now - 30 * day).length,
      online: pr.filter((p) => p.online).length,
      inBlindtest: pr.filter((p) => p.inBlindtest).length,
      activeWeek: users.filter((u) => (u.lastSeen || 0) >= now - 7 * day).length,
      withAvatar: users.filter((u) => profileOf(u).avatarV).length,
      withBio: users.filter((u) => profileOf(u).bio).length,
      friendships: Math.round(friendships),
      pending: users.reduce((n, u) => n + (u.incoming || []).length, 0),
      sessions: sessions.size,
    },
    recent: users.sort((a, b) => created(b) - created(a)).slice(0, 10).map((u) => ({ username: u.username, createdAt: u.createdAt || '' })),
    activity: {
      searches: counter('searches'), lyrics: counter('lyrics'), visits: counter('visits'), visitors: counter('visitors'),
      spotify: counter('clicks_spotify'), deezer: counter('clicks_deezer'), logins: counter('logins'), messages: counter('messages'),
    },
    blindtest: {
      games: counter('bt_games'),
      players: counter('bt_players'),
      accountsPlayed: played.length,
      totalPoints: played.reduce((n, u) => n + u.bt.points, 0),
      top: played.sort((a, b) => b.bt.points - a.bt.points).slice(0, 5)
        .map((u) => ({ username: u.username, points: u.bt.points, games: u.bt.games, wins: u.bt.wins })),
    },
    days,
    ...extra,
  };
}

async function load() {
  const db = await readStore();
  if (db.stats) Object.assign(stats, db.stats);
  vapid = db.vapid || null;
  migrations = new Set(db.migrations || []);
  if (db.live) Object.assign(live, db.live);
  if (!vapid) { vapid = newVapidKeys(); vapidIsNew = true; } // première fois : on crée les clés des notifications
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
    stats,
    vapid,
    migrations: [...migrations],
    live,
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
  if (u) {
    const now = Date.now();
    // temps passé sur le site : on additionne les écarts entre deux signes de vie (s'ils sont proches)
    if (u.lastSeen && now - u.lastSeen < 90_000) { u.timeMs = (u.timeMs || 0) + (now - u.lastSeen); timeDirty = true; }
    u.lastSeen = now; // présence : la page envoie un signe de vie toutes les 30 s
  }
  return u;
}
let timeDirty = false;
setInterval(() => { if (timeDirty) { timeDirty = false; saveSoon(); } }, 120_000).unref();

// Considéré « en ligne » si un signe de vie est arrivé il y a moins de 75 s
const ONLINE_MS = 75_000;
// « En blind test » : la page du blind test donne des nouvelles toutes les secondes ; sans nouvelles depuis 15 s, c'est fini
const BLINDTEST_MS = 15_000;
const presence = (u) => {
  const online = Boolean(u.lastSeen) && Date.now() - u.lastSeen < ONLINE_MS;
  const inBlindtest = online && Boolean(u.playingAt) && Date.now() - u.playingAt < BLINDTEST_MS;
  return { online, inBlindtest, lastSeen: u.lastSeen || 0 };
};
// ===================== Flammes, badges, notifications =====================
let vapid = null, vapidIsNew = false;
let migrations = new Set(); // changements à faire une seule fois sur les comptes déjà créés
let saveTimer = null;
function saveSoon() { // une seule sauvegarde pour plein de petits changements
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; persist().catch((err) => console.error('Sauvegarde :', err.message)); }, 4000);
}

// --- Flammes 🔥 : un jour avec au moins une activité (une partie de blind test ou une recherche) = une flamme de plus.
// Les jours sont ceux de l'heure française. Un jour raté : la série repart de zéro.
const parisDay = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const dayBefore = (day) => { const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
export function streakOf(u) {
  const st = u && u.streak;
  if (!st || !st.last) return { count: 0, best: (st && st.best) || 0, today: false };
  const today = parisDay();
  const alive = st.last === today || st.last === dayBefore(today);
  return { count: alive ? st.count : 0, best: st.best || 0, today: st.last === today };
}
export const usersStreak = (userId) => streakOf(usersById.get(userId));
// renvoie la série si elle vient d'augmenter aujourd'hui (pour afficher « +1 flamme »)
export function recordActivity(userId) {
  const u = usersById.get(userId);
  if (!u || !u.username) return null;
  const today = parisDay();
  const st = u.streak || (u.streak = { count: 0, best: 0, last: '' });
  if (st.last === today) return null;
  st.count = st.last === dayBefore(today) ? st.count + 1 : 1;
  st.best = Math.max(st.best || 0, st.count);
  st.last = today;
  saveSoon();
  return { count: st.count, best: st.best };
}

// --- Badges : plus tu écoutes un artiste (blind test, paroles ouvertes, liens Spotify/Deezer), plus son badge monte
export const BADGE_TIERS = [
  { id: 'bronze', name: 'Bronze', min: 5 },
  { id: 'argent', name: 'Argent', min: 25 },
  { id: 'or', name: 'Or', min: 75 },
  { id: 'platine', name: 'Platine', min: 200 },
  { id: 'diamant', name: 'Diamant', min: 500 },
];
const tierOf = (n) => { let t = null; for (const x of BADGE_TIERS) if (n >= x.min) t = x; return t; };
const artistKey = (name) => String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
// « Drake, Future » ou « Drake feat. Future » : on garde l'artiste principal (« Bigflo & Oli » reste entier)
const mainArtist = (name) => String(name || '').split(/\s*(?:,|\(?\bfeat\.?|\(?\bft\.?|\bwith\b)\s*/i)[0].trim().slice(0, 60);
// renvoie le badge si l'écoute fait passer un nouveau palier
export function recordListen(userId, artistName, n = 1) {
  const u = usersById.get(userId);
  const name = mainArtist(artistName);
  const key = artistKey(name);
  if (!u || !u.username || !key) return null;
  const listens = u.listens || (u.listens = {});
  const cur = listens[key] || (listens[key] = { name, n: 0 });
  const before = tierOf(cur.n);
  cur.n += n;
  // on garde les 400 artistes les plus écoutés
  const keys = Object.keys(listens);
  if (keys.length > 400) { keys.sort((a, b) => listens[a].n - listens[b].n); for (const k of keys.slice(0, keys.length - 400)) delete listens[k]; }
  saveSoon();
  const after = tierOf(cur.n);
  return after && after !== before ? { artist: cur.name, tier: after.id, tierName: after.name } : null;
}
export function badgesOf(u, limit = 60) {
  return Object.values(u.listens || {})
    .filter((x) => x.n >= BADGE_TIERS[0].min)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((x) => {
      const t = tierOf(x.n);
      const next = BADGE_TIERS.find((b) => b.min > x.n) || null;
      return { artist: x.name, count: x.n, tier: t.id, tierName: t.name, next: next ? { tierName: next.name, at: next.min } : null, from: t.min };
    });
}

// --- Notifications sur le téléphone / l'ordinateur (Web Push) ---
const NOTIF_TYPES = ['req', 'inv', 'msg', 'streak'];
const prefsOf = (u) => ({ req: true, inv: true, msg: true, streak: true, ...(u.notif || {}) });
// on prévient seulement si la personne n'est pas déjà sur le site (sinon elle voit la notification dans la page)
// --- Historique des notifications (visible dans l'onglet « Notifications ») ---
// On garde les 100 dernières. Plusieurs messages d'une même personne se regroupent en une seule ligne.
export function logNotif(userId, type, data) {
  const u = usersById.get(userId);
  if (!u || !u.username) return;
  const list = u.notifs || (u.notifs = []);
  const now = Date.now();
  const group = data.group || '';
  const same = group && list.find((n) => n.group === group && !n.read);
  if (same) {
    Object.assign(same, { title: data.title, body: data.body || '', url: data.url || '/', at: now, count: (same.count || 1) + 1 });
    list.splice(list.indexOf(same), 1);
    list.push(same);
  } else {
    list.push({ id: randomBytes(6).toString('base64url'), type, title: data.title, body: data.body || '', url: data.url || '/', at: now, read: false, group, from: data.from || '' });
  }
  if (list.length > 100) list.splice(0, list.length - 100);
  saveSoon();
}
const notifUnread = (u) => (u.notifs || []).filter((n) => !n.read).length;

export function notifyUser(userId, type, data, { evenIfOnline = false } = {}) {
  const u = usersById.get(userId);
  if (u && u.username && type !== 'streak-silent') logNotif(userId, type, data); // toujours dans l'historique
  if (!u || !vapid || !(u.push || []).length || !prefsOf(u)[type]) return;
  if (!evenIfOnline && presence(u).online) return;
  const payload = { title: data.title, body: data.body || '', url: data.url || '/', tag: data.tag || type };
  for (const sub of [...u.push]) {
    sendPush(sub, payload, vapid).then((r) => {
      if (r === 'gone') { u.push = (u.push || []).filter((x) => x.endpoint !== sub.endpoint); saveSoon(); }
    }).catch((err) => console.error('Notification :', err.message));
  }
}

async function handlePush(req, res, url, me) {
  const action = url.pathname.slice('/api/push/'.length);
  if (action === 'key' && req.method === 'GET') return send(res, 200, { publicKey: vapid ? vapid.publicKey : '' });
  if (!me || !me.username) throw new HttpError(401, 'Connecte-toi pour activer les notifications.');
  if (action === 'prefs' && req.method === 'GET') return send(res, 200, { prefs: prefsOf(me), devices: (me.push || []).length });
  if (action === 'history' && req.method === 'GET') return send(res, 200, { items: [...(me.notifs || [])].reverse(), unread: notifUnread(me) });
  const body = await readJson(req, 6_000);
  if (action === 'subscribe') {
    const sub = body.subscription || {};
    if (!validSubscription(sub)) throw new HttpError(400, 'Abonnement aux notifications invalide.');
    me.push = (me.push || []).filter((x) => x.endpoint !== sub.endpoint);
    me.push.push({ endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }, at: Date.now() });
    me.push = me.push.slice(-5); // 5 appareils maximum
    // les autres comptes qui utilisaient ce même appareil ne le reçoivent plus
    for (const u of usersById.values()) if (u !== me && u.push) u.push = u.push.filter((x) => x.endpoint !== sub.endpoint);
    await persist();
    return send(res, 200, { ok: true, devices: me.push.length });
  }
  if (action === 'unsubscribe') {
    me.push = (me.push || []).filter((x) => x.endpoint !== String(body.endpoint || ''));
    await persist();
    return send(res, 200, { ok: true, devices: me.push.length });
  }
  if (action === 'prefs') {
    me.notif = prefsOf(me);
    for (const k of NOTIF_TYPES) if (typeof body[k] === 'boolean') me.notif[k] = body[k];
    saveSoon();
    return send(res, 200, { prefs: me.notif });
  }
  if (action === 'history' && req.method === 'POST') { // tout marquer comme lu / effacer
    if (body.clear) me.notifs = [];
    else for (const n of me.notifs || []) if (!body.id || n.id === body.id) n.read = true;
    saveSoon();
    return send(res, 200, { ok: true, unread: notifUnread(me) });
  }
  if (action === 'inbox-seen') { // la personne a vu le message de l'admin
    me.inbox = (me.inbox || []).filter((x) => x.id !== body.id);
    saveSoon();
    return send(res, 200, { ok: true });
  }
  if (action === 'gift-seen') {
    delete me.gift;
    saveSoon();
    return send(res, 200, { ok: true });
  }
  if (action === 'test') {
    notifyUser(me.id, 'msg', { title: 'Star Song', body: 'Les notifications marchent ! 🔥', tag: 'test' }, { evenIfOnline: true });
    return send(res, 200, { ok: true });
  }
  throw new HttpError(404, 'Introuvable.');
}

// --- Notification envoyée par un admin à une personne ---
// Elle part sur son téléphone (si les notifications sont activées) ET s'affiche sur le site à sa prochaine visite.
export function adminNotify(fromUser, username, { title, body, url }) {
  const target = findByUsername(username);
  if (!target || !target.username) throw new HttpError(404, 'Ce compte n’existe pas.');
  const clean = (x, n) => String(x || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const t = clean(title, 80) || 'Message de Star Song';
  const b = clean(body, 300);
  if (!b) throw new HttpError(400, 'Écris le message de la notification.');
  const link = /^\/[^\s]*$/.test(String(url || '')) ? String(url) : '/';
  const item = { id: randomBytes(6).toString('base64url'), title: t, body: b, url: link, from: fromUser.username, at: Date.now() };
  target.inbox = [...(target.inbox || []), item].slice(-10);
  logNotif(target.id, 'admin', { title: t, body: b, url: link, from: fromUser.username });
  saveSoon();
  const devices = (target.push || []).length;
  if (devices && vapid) {
    for (const sub of [...target.push]) {
      sendPush(sub, { title: t, body: b, url: link, tag: 'admin:' + item.id }, vapid).then((r) => {
        if (r === 'gone') { target.push = (target.push || []).filter((x) => x.endpoint !== sub.endpoint); saveSoon(); }
      }).catch((err) => console.error('Notification admin :', err.message));
    }
  }
  countStat('admin_notifs');
  return { username: target.username, devices };
}

// --- La console des admins : des commandes tapées dans l'onglet Admin ---
// Chaque commande : { use, help, run(args, admin) -> texte }. « @pseudo » ou « pseudo », les deux marchent.
const ADMIN_LOG = []; // les 50 dernières commandes (qui, quoi, quand)
const who = (name) => {
  const u = findByUsername(name);
  if (!u || !u.username) throw new HttpError(404, `Personne ne s’appelle @${normUsername(name) || '?'}.`);
  return u;
};
const intArg = (v, label) => { const n = Number(v); if (!Number.isInteger(n)) throw new HttpError(400, `${label} : écris un nombre entier.`); return n; };
const fmtMin = (ms) => { const m = Math.round((ms || 0) / 60_000); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
function notifyAll(admin, title, body, url = '/') {
  let people = 0, devices = 0;
  for (const u of usersById.values()) {
    if (!u.username) continue;
    try { const r = adminNotify(admin, u.username, { title, body, url }); people++; devices += r.devices; } catch { /* compte sans pseudo */ }
  }
  return { people, devices };
}
export const ADMIN_COMMANDS = [
  { name: 'aide', use: 'aide', help: 'Affiche toutes les commandes.', run: () => ADMIN_COMMANDS.map((c) => `• ${c.use}\n    ${c.help}`).join('\n') },
  { name: 'notif', use: 'notif @pseudo message', help: 'Envoie une notification à une personne.',
    run: ([name, ...rest], admin) => { const r = adminNotify(admin, name, { title: 'Message de Star Song', body: rest.join(' ') }); return `Notification envoyée à @${r.username} (${r.devices} appareil${r.devices > 1 ? 's' : ''}).`; } },
  { name: 'notif-tous', use: 'notif-tous message', help: 'Envoie une notification à TOUS les utilisateurs.',
    run: (rest, admin) => { const text = rest.join(' ').trim(); if (!text) throw new HttpError(400, 'Écris le message.'); const r = notifyAll(admin, 'Star Song', text); return `Notification envoyée à ${r.people} comptes (${r.devices} téléphones/ordinateurs).`; } },
  { name: 'annonce', use: 'annonce [minutes] message', help: 'Affiche une bannière en haut du site pour tout le monde (60 min par défaut).',
    run: (rest, admin) => {
      let min = 60; if (/^\d+$/.test(rest[0] || '')) min = Math.min(10080, Number(rest.shift()));
      const text = rest.join(' ').trim().slice(0, 200); if (!text) throw new HttpError(400, 'Écris le texte de l’annonce.');
      live.announce = { id: randomBytes(4).toString('hex'), text, by: admin.username, until: Date.now() + min * 60_000 }; saveSoon();
      return `Annonce affichée pendant ${min} min : « ${text} »`;
    } },
  { name: 'annonce-stop', use: 'annonce-stop', help: 'Retire l’annonce en cours.', run: () => { live.announce = null; saveSoon(); return 'Annonce retirée.'; } },
  { name: 'confettis', use: 'confettis [message]', help: 'Pluie de confettis chez tous ceux qui sont sur le site.',
    run: (rest, admin) => { live.confetti = { id: randomBytes(4).toString('hex'), at: Date.now(), text: rest.join(' ').slice(0, 120), by: admin.username }; return '🎉 Confettis envoyés à tout le monde !'; } },
  { name: 'secousse', use: 'secousse', help: 'Fait trembler l’écran de tout le monde (une fois).',
    run: () => { live.shake = { id: randomBytes(4).toString('hex'), at: Date.now() }; return '📳 Ça tremble !'; } },
  { name: 'couronne', use: 'couronne @pseudo', help: 'Donne (ou retire) une couronne 👑 à côté du pseudo.',
    run: ([name]) => {
      const u = who(name); live.crowns ||= [];
      const had = live.crowns.includes(u.username);
      live.crowns = had ? live.crowns.filter((x) => x !== u.username) : [...live.crowns, u.username]; saveSoon();
      return had ? `Couronne retirée à @${u.username}.` : `👑 @${u.username} a maintenant une couronne.`;
    } },
  { name: 'flammes', use: 'flammes @pseudo nombre', help: 'Change la série de flammes 🔥 d’une personne.',
    run: ([name, n]) => {
      const u = who(name); const v = Math.max(0, intArg(n, 'Nombre de flammes'));
      u.streak = { count: v, best: Math.max(u.streak?.best || 0, v), last: v ? parisDay() : '' }; saveSoon();
      return `🔥 @${u.username} a maintenant ${v} flamme${v > 1 ? 's' : ''}.`;
    } },
  { name: 'points', use: 'points @pseudo +100 (ou -100)', help: 'Ajoute ou retire des points de blind test.',
    run: ([name, n]) => {
      const u = who(name); const v = intArg(n, 'Points');
      const bt = u.bt || (u.bt = { points: 0, games: 0, wins: 0, best: 0 });
      bt.points = Math.max(0, bt.points + v); saveSoon();
      return `@${u.username} a maintenant ${bt.points} points.`;
    } },
  { name: 'badge', use: 'badge @pseudo artiste écoutes', help: 'Ajoute des écoutes d’un artiste (pour monter son badge).',
    run: ([name, ...rest]) => {
      const u = who(name); const n = intArg(rest.pop(), 'Écoutes'); const artist = rest.join(' ').trim();
      if (!artist) throw new HttpError(400, 'Écris le nom de l’artiste.');
      const up = recordListen(u.id, artist, Math.max(1, Math.min(1000, n)));
      return `🏅 +${n} écoutes de ${artist} pour @${u.username}${up ? ` : nouveau badge ${up.tierName} !` : '.'}`;
    } },
  { name: 'muet', use: 'muet @pseudo minutes', help: 'Empêche une personne d’écrire (messages et chat) pendant X minutes. 0 = enlever.',
    run: ([name, n]) => {
      const u = who(name); const m = Math.max(0, Math.min(10080, intArg(n, 'Minutes')));
      u.mutedUntil = m ? Date.now() + m * 60_000 : 0; saveSoon();
      return m ? `🔇 @${u.username} ne peut plus écrire pendant ${m} min.` : `🔊 @${u.username} peut de nouveau écrire.`;
    } },
  { name: 'deconnecter', use: 'deconnecter @pseudo', help: 'Déconnecte une personne de tous ses appareils.',
    run: ([name]) => {
      const u = who(name); let n = 0;
      for (const [h, x] of sessions) if (x.userId === u.id) { sessions.delete(h); n++; }
      saveSoon(); return `@${u.username} est déconnecté (${n} session${n > 1 ? 's' : ''}).`;
    } },
  { name: 'renommer', use: 'renommer @ancien nouveau', help: 'Change le pseudo de quelqu’un.',
    run: ([oldName, newName]) => {
      const u = who(oldName); const next = normUsername(newName);
      if (!validUsername(next)) throw new HttpError(400, 'Nouveau pseudo invalide (3 à 30 caractères : lettres, chiffres, points, tirets).');
      const other = findByUsername(next); if (other && other.id !== u.id) throw new HttpError(409, `@${next} est déjà pris.`);
      const before = u.username; unindexUser(u); u.username = next; indexUser(u); saveSoon();
      return `@${before} s’appelle maintenant @${next}.`;
    } },
  { name: 'info', use: 'info @pseudo', help: 'Les infos d’un compte.',
    run: ([name]) => {
      const u = who(name); const pr = presence(u); const st = streakOf(u);
      return [`@${u.username}${isAdmin(u) ? ' (admin)' : ''}`, `Créé le : ${new Date(u.createdAt || 0).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`,
        `État : ${pr.inBlindtest ? 'en blind test' : pr.online ? 'en ligne' : 'hors ligne'}${u.lastSeen ? `, vu le ${new Date(u.lastSeen).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}` : ''}`,
        `Temps sur le site : ${fmtMin(u.timeMs)}`, `Blind test : ${u.bt?.points || 0} pts, ${u.bt?.games || 0} parties, ${u.bt?.wins || 0} victoires`,
        `Flammes : ${st.count} (record ${st.best})`, `Amis : ${(u.friends || []).length}`, `Favoris : ${u.data?.favorites?.length || 0}`,
        `Notifications : ${(u.push || []).length} appareil(s)`, u.mutedUntil > Date.now() ? `🔇 Muet jusqu’à ${new Date(u.mutedUntil).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' })}` : ''].filter(Boolean).join('\n');
    } },
  { name: 'en-ligne', use: 'en-ligne', help: 'Qui est sur le site en ce moment.',
    run: () => { const list = [...usersById.values()].filter((u) => u.username && presence(u).online); return list.length ? `${list.length} en ligne : ` + list.map((u) => '@' + u.username + (presence(u).inBlindtest ? ' 🎮' : '')).join(', ') : 'Personne en ligne pour le moment.'; } },
  { name: 'stats', use: 'stats', help: 'Les chiffres du site en bref.',
    run: () => { const a = adminStats(); return `Comptes : ${a.accounts.total} (dont ${a.accounts.today} aujourd’hui) · En ligne : ${a.accounts.online} · Recherches : ${a.activity.searches.total} · Parties de blind test : ${a.blindtest.games.total}`; } },
  { name: 'journal', use: 'journal', help: 'Les dernières commandes tapées par les admins.',
    run: () => (ADMIN_LOG.length ? ADMIN_LOG.slice(-15).map((l) => `${new Date(l.at).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })} @${l.by} : ${l.line}`).join('\n') : 'Rien pour l’instant.') },
];
// Les commandes du blind test (salons) sont ajoutées par server.js
export function addAdminCommand(cmd) { ADMIN_COMMANDS.push(cmd); }
export function runAdminCommand(admin, line) {
  const raw = String(line || '').trim().slice(0, 600);
  if (!raw) throw new HttpError(400, 'Tape une commande (ou « aide »).');
  const parts = raw.replace(/^\//, '').split(/\s+/);
  const name = parts.shift().toLowerCase();
  const cmd = ADMIN_COMMANDS.find((c) => c.name === name);
  if (!cmd) throw new HttpError(400, `Commande inconnue : « ${name} ». Tape « aide » pour voir la liste.`);
  const out = cmd.run(parts, admin);
  ADMIN_LOG.push({ at: Date.now(), by: admin.username, line: raw.slice(0, 120) });
  if (ADMIN_LOG.length > 50) ADMIN_LOG.shift();
  countStat('admin_cmds');
  return out;
}
export const isMuted = (userId) => { const u = usersById.get(userId); return Boolean(u && u.mutedUntil && u.mutedUntil > Date.now()); };

// Rappel du soir : « ta série va s'éteindre » (entre 19 h et 22 h, une fois par jour)
setInterval(() => {
  const hour = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date()));
  if (hour < 19 || hour >= 22) return;
  const today = parisDay();
  for (const u of usersById.values()) {
    const st = u.streak;
    if (!st || st.last !== dayBefore(today) || st.count < 1 || st.reminded === today || !(u.push || []).length) continue;
    st.reminded = today;
    notifyUser(u.id, 'streak', {
      title: `🔥 Ta série de ${st.count} jour${st.count > 1 ? 's' : ''} va s’éteindre !`,
      body: 'Fais un blind test ou une recherche avant minuit pour la garder.',
      url: '/blindtest', tag: 'streak',
    });
    saveSoon();
  }
}, 10 * 60_000).unref();

// ===================== Playlists de blind test =====================
// Chaque compte peut créer ses playlists (12 max, 150 sons chacune). Ses amis peuvent aussi les jouer.
const PL_MAX = 12, PL_SONGS = 150, PL_NAME = 40;
const PL_EMOJIS = ['🎵', '🔥', '🎧', '💿', '🎤', '🌙', '⚡', '💜', '🚗', '🏖️', '🖤', '👑'];
const clean = (x, n) => String(x || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
function plSummary(pl, owner, viewerId) {
  return {
    id: pl.id, name: pl.name, emoji: pl.emoji, count: pl.songs.length, updatedAt: pl.updatedAt,
    covers: pl.songs.filter((x) => x.cover).slice(0, 4).map((x) => x.cover),
    owner: owner.username, mine: owner.id === viewerId,
  };
}
// les playlists qu'une personne peut jouer : les siennes + celles de ses amis
export function playlistsFor(userId) {
  const me = usersById.get(userId);
  if (!me || !me.username) return [];
  const out = (me.playlists || []).map((pl) => plSummary(pl, me, me.id));
  for (const fid of me.friends || []) {
    const f = usersById.get(fid);
    if (f && f.username) for (const pl of f.playlists || []) if (pl.songs.length >= 4) out.push(plSummary(pl, f, me.id));
  }
  return out;
}
// une playlist, si cette personne a le droit de la jouer
export function getPlaylist(id, userId, noCheck = false) {
  for (const u of usersById.values()) {
    const pl = (u.playlists || []).find((x) => x.id === id);
    if (!pl) continue;
    const me = usersById.get(userId);
    const ok = noCheck || u.id === userId || (me && (me.friends || []).includes(u.id));
    return ok ? { ...pl, owner: u.username, ownerId: u.id } : null;
  }
  return null;
}
const AS_MAX = 20, AS_ARTISTS = 120; // playlists d'artistes : 20 max, 60 artistes chacune
async function handlePlaylists(req, res, url, me) {
  if (!me || !me.username) throw new HttpError(401, 'Connecte-toi pour créer tes playlists.');
  me.playlists ||= [];
  const action = url.pathname.slice('/api/playlists'.length).replace(/^\//, '');
  if (req.method === 'GET' && action === '') {
    return send(res, 200, { playlists: me.playlists.map((pl) => ({ ...pl })), emojis: PL_EMOJIS, limits: { playlists: PL_MAX, songs: PL_SONGS } });
  }
  if (req.method === 'POST' && action === 'save') {
    const body = await readJson(req, 120_000);
    const name = clean(body.name, PL_NAME);
    if (!name) throw new HttpError(400, 'Donne un nom à ta playlist.');
    const seen = new Set();
    const songs = [];
    for (const x of Array.isArray(body.songs) ? body.songs : []) {
      const titre = clean(x && x.titre, 120), artiste = clean(x && x.artiste, 80);
      if (!titre || !artiste) continue;
      const key = (titre + '|' + artiste).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const cover = /^https:\/\/[a-z0-9.-]+\.(mzstatic\.com|dzcdn\.net|deezer\.com)\//i.test(String(x.cover || '')) ? String(x.cover).slice(0, 300) : '';
      songs.push({ titre, artiste, cover });
      if (songs.length >= PL_SONGS) break;
    }
    const emoji = PL_EMOJIS.includes(body.emoji) ? body.emoji : '🎵';
    let pl = body.id ? me.playlists.find((x) => x.id === body.id) : null;
    if (body.id && !pl) throw new HttpError(404, 'Cette playlist n’existe plus.');
    if (!pl) {
      if (me.playlists.length >= PL_MAX) throw new HttpError(400, `Tu as déjà ${PL_MAX} playlists : supprimes-en une d’abord.`);
      pl = { id: randomBytes(6).toString('base64url'), createdAt: Date.now() };
      me.playlists.push(pl);
    }
    Object.assign(pl, { name, emoji, songs, updatedAt: Date.now() });
    await persist();
    return send(res, 200, { playlist: { ...pl } });
  }
  // playlists d'artistes : une sélection d'artistes d'une catégorie, rechargée en un clic dans le blind test
  if (action.startsWith('artists')) {
    me.artistSets ||= [];
    if (req.method === 'GET' && action === 'artists') return send(res, 200, { sets: me.artistSets, max: AS_MAX });
    if (req.method === 'POST' && action === 'artists/save') {
      const body = await readJson(req, 20_000);
      const name = clean(body.name, PL_NAME);
      if (!name) throw new HttpError(400, 'Donne un nom à ta playlist d’artistes.');
      const category = String(body.category || '').slice(0, 40);
      if (!/^[a-z0-9-]+$/.test(category)) throw new HttpError(400, 'Choisis une catégorie.');
      const artists = [...new Set((Array.isArray(body.artists) ? body.artists : []).map((a) => clean(a, 80)).filter(Boolean))].slice(0, AS_ARTISTS);
      if (!artists.length) throw new HttpError(400, 'Choisis au moins un artiste.');
      const emoji = ['⭐', ...PL_EMOJIS].includes(body.emoji) ? body.emoji : '⭐';
      let set = body.id ? me.artistSets.find((x) => x.id === body.id) : null;
      if (body.id && !set) throw new HttpError(404, 'Cette playlist d’artistes n’existe plus.');
      if (!set) {
        if (me.artistSets.length >= AS_MAX) throw new HttpError(400, `Tu as déjà ${AS_MAX} playlists d’artistes : supprimes-en une d’abord.`);
        set = { id: randomBytes(6).toString('base64url'), createdAt: Date.now() };
        me.artistSets.push(set);
      }
      Object.assign(set, { name, emoji, category, artists, updatedAt: Date.now() });
      await persist();
      return send(res, 200, { set, sets: me.artistSets });
    }
    if (req.method === 'POST' && action === 'artists/delete') {
      const body = await readJson(req, 2_000);
      const before = me.artistSets.length;
      me.artistSets = me.artistSets.filter((x) => x.id !== body.id);
      if (me.artistSets.length === before) throw new HttpError(404, 'Cette playlist d’artistes n’existe plus.');
      await persist();
      return send(res, 200, { ok: true, sets: me.artistSets });
    }
    throw new HttpError(404, 'Introuvable.');
  }
  if (req.method === 'POST' && action === 'delete') {
    const body = await readJson(req, 2_000);
    const before = me.playlists.length;
    me.playlists = me.playlists.filter((x) => x.id !== body.id);
    if (me.playlists.length === before) throw new HttpError(404, 'Cette playlist n’existe plus.');
    await persist();
    return send(res, 200, { ok: true });
  }
  throw new HttpError(404, 'Introuvable.');
}

// appelé par le blind test tant que la personne est dans une partie
export function markInBlindtest(userId) {
  const u = usersById.get(userId);
  if (!u) return;
  u.playingAt = Date.now();
  u.lastSeen = Date.now();
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

// Les pseudos s'affichent toujours avec un « @ » devant : on l'ajoute au moment d'envoyer la réponse.
// (dans la base, ils restent sans « @ » et en minuscules)
const AT_KEYS = new Set(['username', 'owner', 'from', 'by']);
export const atReplacer = (k, v) => (AT_KEYS.has(k) && typeof v === 'string' && v && v[0] !== '@' && !v.includes('/') ? '@' + v : v);

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body, atReplacer));
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

const publicUser = (u) => (u ? { username: u.username || '', email: u.email || '', name: u.username ? '@' + u.username : u.email, ...(u.username ? { streak: streakOf(u), ...(u.gift ? { gift: u.gift } : {}), ...((u.inbox || []).length ? { inbox: u.inbox } : {}), notifUnread: notifUnread(u) } : {}), ...(isAdmin(u) ? { admin: true } : {}) } : null);
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

// enlève le « @ » d'affichage et met en minuscules
export const normUsername = (v) => String(v || '').trim().replace(/^@+/, '').toLowerCase();

function findByUsername(v) {
  const name = normUsername(v);
  if (!validUsername(name)) return null; // un identifiant ne contient jamais « @ » : on ne peut pas tomber sur un e-mail
  return usersByLogin.get(name.toLowerCase()) || null;
}

function listFriends(me) {
  const users = (ids) => ids.map((id) => usersById.get(id)).filter((u) => u && u.username);
  // photo de profil (vide si la personne n'en a pas mis)
  const avatar = (u) => { const v = profileOf(u).avatarV; return v ? `/api/profile/image?u=${encodeURIComponent(u.username)}&k=avatar&v=${v}` : ''; };
  const names = (ids) => users(ids)
    .map((u) => ({ username: u.username, avatarUrl: avatar(u) }))
    .sort((a, b) => a.username.localeCompare(b.username));
  // Seuls les amis voient si tu es en ligne (pas les demandes en attente)
  const friends = users(me.friends)
    .map((u) => ({ username: u.username, avatarUrl: avatar(u), ...presence(u), unread: (me.chats && me.chats[u.id]?.unread) || 0, streak: streakOf(u).count }))
    .sort((a, b) => b.inBlindtest - a.inBlindtest || b.online - a.online || a.username.localeCompare(b.username));
  return { friends, incoming: names(me.incoming), outgoing: names(me.outgoing) };
}

// Pour le blind test : qui est connecté, et est-ce que telle personne est son ami ?
export function sessionUser(req) {
  const u = currentUser(req);
  return u && u.username ? { id: u.id, username: u.username } : null;
}
export function findFriend(userId, username) {
  const me = usersById.get(userId);
  const target = findByUsername(username);
  if (!me || !target || !(me.friends || []).includes(target.id)) return null;
  return { id: target.id, username: target.username };
}

// --- Classement mondial du blind test : stats gardées dans chaque compte ---
export async function recordBlindtest(userId, { points, won }) {
  const u = usersById.get(userId);
  if (!u || !u.username) return;
  const bt = u.bt || (u.bt = { points: 0, games: 0, wins: 0, best: 0 });
  bt.points += Math.max(0, Math.round(points) || 0);
  bt.games += 1;
  if (won) bt.wins += 1;
  bt.best = Math.max(bt.best, Math.round(points) || 0);
  recordActivity(userId);
  try { await persist(); } catch (err) { console.error('Classement : sauvegarde impossible :', err.message); }
}

export function blindtestLeaderboard(userId, limit = 50) {
  const all = [...usersById.values()]
    .filter((u) => u.username && u.bt && u.bt.games > 0)
    .sort((a, b) => b.bt.points - a.bt.points || b.bt.wins - a.bt.wins || a.bt.games - b.bt.games || a.username.localeCompare(b.username));
  const row = (u, i) => {
    const v = profileOf(u).avatarV;
    return {
      rank: i + 1, username: u.username, points: u.bt.points, games: u.bt.games, wins: u.bt.wins, best: u.bt.best,
      streak: streakOf(u).count, avatarUrl: v ? `/api/profile/image?u=${encodeURIComponent(u.username)}&k=avatar&v=${v}` : '',
    };
  };
  const meIndex = userId ? all.findIndex((u) => u.id === userId) : -1;
  return {
    total: all.length,
    top: all.slice(0, limit).map(row),
    me: meIndex >= 0 ? row(all[meIndex], meIndex) : null,
  };
}

// --- Classements (page « Classement ») : plusieurs façons d'être le meilleur ---
export function rankings(viewerId) {
  const viewer = usersById.get(viewerId);
  const friendIds = new Set(viewer ? [viewer.id, ...(viewer.friends || [])] : []);
  const users = [...usersById.values()].filter((u) => u.username);
  const avatarOf = (u) => { const v = profileOf(u).avatarV; return v ? `/api/profile/image?u=${encodeURIComponent(u.username)}&k=avatar&v=${v}` : ''; };
  const badgeCount = (u) => Object.values(u.listens || {}).filter((x) => x.n >= BADGE_TIERS[0].min).length;
  const topTier = (u) => { let best = 0; for (const x of Object.values(u.listens || {})) { const i = BADGE_TIERS.findLastIndex((t) => x.n >= t.min); if (i + 1 > best) best = i + 1; } return best ? BADGE_TIERS[best - 1].id : ''; };
  const base = (u) => ({
    username: u.username, avatarUrl: avatarOf(u), friend: friendIds.has(u.id) && u.id !== viewerId, me: u.id === viewerId,
    points: u.bt?.points || 0, games: u.bt?.games || 0, wins: u.bt?.wins || 0, best: u.bt?.best || 0,
    streak: streakOf(u).count, bestStreak: streakOf(u).best, badges: badgeCount(u), tier: topTier(u),
    time: Math.round((u.timeMs || 0) / 60_000), // minutes passées sur le site
  });
  const all = users.map(base);
  const board = (key, filter) => {
    const list = all.filter(filter).sort((a, b) => b[key] - a[key] || b.points - a.points || a.username.localeCompare(b.username));
    return list.map((x, i) => ({ ...x, rank: i + 1, value: x[key] }));
  };
  const played = (x) => x.games > 0;
  const boards = {
    points: board('points', played),
    wins: board('wins', (x) => x.wins > 0),
    streak: board('streak', (x) => x.streak > 0),
    best: board('best', played),
    badges: board('badges', (x) => x.badges > 0),
    time: board('time', (x) => x.time > 0),
  };
  const out = {};
  for (const [k, list] of Object.entries(boards)) {
    out[k] = { total: list.length, top: list.slice(0, 50), me: list.find((x) => x.me) || null, friends: list.filter((x) => x.friend || x.me).slice(0, 50) };
  }
  return {
    boards: out,
    totals: {
      players: all.filter(played).length,
      games: Math.round(all.reduce((n, x) => n + x.games, 0)),
      points: all.reduce((n, x) => n + x.points, 0),
      flames: all.reduce((n, x) => n + x.streak, 0),
      minutes: all.reduce((n, x) => n + x.time, 0),
    },
    loggedIn: Boolean(viewer && viewer.username),
  };
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
    else {
      add(me.outgoing, target.id); add(target.incoming, me.id);
      notifyUser(target.id, 'req', { title: `@${me.username} veut être ton ami`, body: 'Ouvre Star Song pour accepter.', url: '/#amis', tag: 'req:' + me.id, from: me.username });
    }
  } else if (action === 'accept') {
    if (!me.incoming.includes(target.id)) throw new HttpError(404, 'Aucune demande de cette personne.');
    befriend();
    notifyUser(target.id, 'req', { title: `@${me.username} a accepté ta demande d’ami`, body: 'Vous pouvez vous écrire et jouer ensemble.', url: '/#amis', tag: 'acc:' + me.id, from: me.username });
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

// ===================== Profils =====================
// Chaque compte peut avoir : une photo, une bannière (image ou couleurs prêtes), une bio et ses sons préférés.
// Les images sont rangées à part (pas dans la fiche du compte) pour que les sauvegardes restent légères.
const BANNER_PRESETS = ['cassette', 'nuit', 'neon', 'or', 'bitume'];
const IMG_LIMITS = { avatar: 150_000, banner: 400_000 }; // octets, après décodage
const imgCache = new Map(); // "userId:kind" -> { buf, type }

function profileOf(u) {
  const p = u.profile || {};
  return {
    bio: typeof p.bio === 'string' ? p.bio : '',
    banner: BANNER_PRESETS.includes(p.banner) || p.banner === 'image' ? p.banner : 'cassette',
    bannerV: Number(p.bannerV) || 0,
    avatarV: Number(p.avatarV) || 0,
    top: Array.isArray(p.top) ? p.top : [],
  };
}

function parseImage(dataUrl, kind) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new HttpError(400, 'Image invalide : utilise une photo JPEG, PNG ou WebP.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > IMG_LIMITS[kind]) throw new HttpError(413, 'Image trop lourde.');
  return { buf, type: m[1] };
}

async function saveImage(key, img) {
  if (REMOTE) {
    await supabase('POST', '?on_conflict=id', { id: 'img:' + key, data: img ? { type: img.type, b64: img.buf.toString('base64') } : {}, updated_at: new Date().toISOString() },
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
  } else {
    await mkdir(join(DATA_DIR, 'img'), { recursive: true });
    await writeFile(join(DATA_DIR, 'img', key.replace(/[^a-z0-9:_-]/gi, '_') + '.json'),
      JSON.stringify(img ? { type: img.type, b64: img.buf.toString('base64') } : {}));
  }
  if (imgCache.size > 300) imgCache.delete(imgCache.keys().next().value);
  imgCache.set(key, img);
}

async function loadImage(key) {
  if (imgCache.has(key)) return imgCache.get(key);
  let raw = null;
  try {
    if (REMOTE) {
      const rows = await (await supabase('GET', `?id=eq.${encodeURIComponent('img:' + key)}&select=data`)).json();
      raw = rows[0]?.data || null;
    } else {
      raw = JSON.parse(await readFile(join(DATA_DIR, 'img', key.replace(/[^a-z0-9:_-]/gi, '_') + '.json'), 'utf8'));
    }
  } catch { raw = null; }
  const img = raw && raw.b64 ? { type: raw.type, buf: Buffer.from(raw.b64, 'base64') } : null;
  if (imgCache.size > 300) imgCache.delete(imgCache.keys().next().value);
  imgCache.set(key, img);
  return img;
}

// --- Messagerie entre amis ---
// Les messages d'une conversation sont rangés à part (une ligne Supabase « chat:<id1>:<id2> »),
// et chaque compte garde un résumé de ses conversations (dernier message, non lus, lu jusqu'à) dans u.chats.
const CHAT_KEEP = 300;          // messages gardés par conversation
const CHAT_MAX_LEN = 500;       // caractères par message
const chatCache = new Map();    // clé -> tableau de messages
const chatKey = (a, b) => [a, b].sort().join(':');

async function loadChat(key) {
  if (chatCache.has(key)) return chatCache.get(key);
  let list = [];
  try {
    if (REMOTE) {
      const rows = await (await supabase('GET', `?id=eq.${encodeURIComponent('chat:' + key)}&select=data`)).json();
      list = rows[0]?.data?.m || [];
    } else {
      list = JSON.parse(await readFile(join(DATA_DIR, 'chat', key.replace(/[^a-z0-9:_-]/gi, '_') + '.json'), 'utf8')).m || [];
    }
  } catch (err) {
    if (err.code !== 'ENOENT') { console.error('Messagerie, lecture :', err.message); throw new HttpError(503, 'Messages indisponibles, réessaie dans un instant.'); }
  }
  if (chatCache.size > 300) chatCache.delete(chatCache.keys().next().value);
  chatCache.set(key, list);
  return list;
}

async function saveChat(key, list) {
  const data = { m: list.slice(-CHAT_KEEP) };
  if (REMOTE) {
    await supabase('POST', '?on_conflict=id', { id: 'chat:' + key, data, updated_at: new Date().toISOString() },
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
  } else {
    await mkdir(join(DATA_DIR, 'chat'), { recursive: true });
    await writeFile(join(DATA_DIR, 'chat', key.replace(/[^a-z0-9:_-]/gi, '_') + '.json'), JSON.stringify(data));
  }
  chatCache.set(key, data.m);
}

// messages vocaux : rangés à part (« voice:<id> »), comme les photos de profil
const VOICE_MAX_SEC = 120;
const VOICE_MAX_BYTES = 2_600_000; // ~2 min en Opus 64 kbit/s (+ marge pour Safari)
const voiceCache = new Map();
const voiceFile = (id) => join(DATA_DIR, 'voice', id.replace(/[^a-z0-9:_-]/gi, '_') + '.json');
async function saveVoice(id, v) {
  const data = { type: v.type, b64: v.buf.toString('base64') };
  if (REMOTE) {
    await supabase('POST', '?on_conflict=id', { id: 'voice:' + id, data, updated_at: new Date().toISOString() },
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
  } else {
    await mkdir(join(DATA_DIR, 'voice'), { recursive: true });
    await writeFile(voiceFile(id), JSON.stringify(data));
  }
  if (voiceCache.size > 60) voiceCache.delete(voiceCache.keys().next().value);
  voiceCache.set(id, v);
}
async function loadVoice(id) {
  if (voiceCache.has(id)) return voiceCache.get(id);
  let raw = null;
  try {
    if (REMOTE) raw = (await (await supabase('GET', `?id=eq.${encodeURIComponent('voice:' + id)}&select=data`)).json())[0]?.data || null;
    else raw = JSON.parse(await readFile(voiceFile(id), 'utf8'));
  } catch { raw = null; }
  const v = raw && raw.b64 ? { type: raw.type, buf: Buffer.from(raw.b64, 'base64') } : null;
  if (v) { if (voiceCache.size > 60) voiceCache.delete(voiceCache.keys().next().value); voiceCache.set(id, v); }
  return v;
}

// les résumés (non lus…) sont sauvegardés quelques secondes plus tard, en une seule fois
let chatSaveTimer = null;
function saveChatsSoon() {
  if (chatSaveTimer) return;
  chatSaveTimer = setTimeout(() => {
    chatSaveTimer = null;
    persist().catch((err) => console.error('Messagerie, sauvegarde :', err.message));
  }, 4000);
}

const chatSends = new Map(); // anti-spam : userId -> [heures d'envoi]
function chatSummary(me) {
  const chats = me.chats || {};
  const avatar = (u) => { const v = profileOf(u).avatarV; return v ? `/api/profile/image?u=${encodeURIComponent(u.username)}&k=avatar&v=${v}` : ''; };
  const list = Object.entries(chats)
    .map(([id, c]) => ({ u: usersById.get(id), c }))
    .filter((x) => x.u && x.u.username)
    .map(({ u, c }) => ({
      username: u.username, avatarUrl: avatar(u), ...presence(u), friend: (me.friends || []).includes(u.id),
      at: c.at, text: c.text, fromMe: c.from === me.id, unread: c.unread || 0,
    }))
    .sort((a, b) => b.at - a.at);
  return { conversations: list, unread: list.reduce((n, c) => n + c.unread, 0) };
}

async function handleMessages(req, res, url, me) {
  ensureFriendFields(me);
  me.chats ||= {};
  const action = url.pathname.slice('/api/messages'.length).replace(/^\//, '');

  if (req.method === 'GET' && action === '') return send(res, 200, chatSummary(me));

  // une conversation (et on la marque comme lue)
  if (req.method === 'GET' && action === 'with') {
    const other = findByUsername(url.searchParams.get('username'));
    if (!other || other.id === me.id) throw new HttpError(404, 'Cette personne n’existe pas.');
    const isFriend = me.friends.includes(other.id);
    if (!isFriend && !me.chats[other.id]) throw new HttpError(403, 'Tu ne peux écrire qu’à tes amis.');
    const list = await loadChat(chatKey(me.id, other.id));
    const after = Number(url.searchParams.get('after')) || 0;
    const mine = me.chats[other.id];
    if (mine && (mine.unread || (list.length && (mine.readAt || 0) < list[list.length - 1].at))) {
      mine.unread = 0;
      mine.readAt = Date.now();
      saveChatsSoon();
    }
    const theirs = other.chats && other.chats[me.id];
    const avatarV = profileOf(other).avatarV;
    return send(res, 200, {
      username: other.username,
      avatarUrl: avatarV ? `/api/profile/image?u=${encodeURIComponent(other.username)}&k=avatar&v=${avatarV}` : '',
      friend: isFriend,
      ...presence(other),
      seenAt: (theirs && theirs.readAt) || 0, // jusqu'où l'autre a lu
      messages: list.filter((m) => m.at > after).slice(-100).map((m) => ({
        fromMe: m.f === me.id, text: m.t || '', at: m.at, ...(m.v ? { voice: { id: m.v, duration: m.d || 0 } } : {}),
      })),
    });
  }

  // pour envoyer : il faut être amis, et pas plus de 30 messages par minute
  const target = (username) => {
    const other = findByUsername(username);
    if (!other || other.id === me.id) throw new HttpError(404, 'Cette personne n’existe pas.');
    if (!me.friends.includes(other.id)) throw new HttpError(403, 'Tu ne peux écrire qu’à tes amis.');
    const now = Date.now();
    const recent = (chatSends.get(me.id) || []).filter((t) => now - t < 60_000);
    if (recent.length >= 30) throw new HttpError(429, 'Doucement ! Attends un peu avant d’envoyer d’autres messages.');
    recent.push(now);
    chatSends.set(me.id, recent);
    return other;
  };
  // ajoute un message à la conversation et met à jour les résumés (non lus…)
  const append = async (other, entry, preview) => {
    const key = chatKey(me.id, other.id);
    const list = [...(await loadChat(key))];
    const at = Math.max(Date.now(), (list[list.length - 1]?.at || 0) + 1); // jamais deux messages à la même milliseconde
    list.push({ f: me.id, ...entry, at });
    await saveChat(key, list);
    me.chats[other.id] = { ...(me.chats[other.id] || {}), at, text: preview, from: me.id, unread: 0, readAt: at };
    other.chats ||= {};
    const theirs = other.chats[me.id] || {};
    other.chats[me.id] = { ...theirs, at, text: preview, from: me.id, unread: Math.min(99, (theirs.unread || 0) + 1) };
    countStat('messages');
    saveChatsSoon();
    // les messages arrivent toujours sur le téléphone, même si la personne a le site ouvert ailleurs
    notifyUser(other.id, 'msg', { title: `Message de @${me.username}`, body: preview, url: '/?chat=' + encodeURIComponent(me.username), tag: 'msg:' + me.id, group: 'msg:' + me.id, from: me.username }, { evenIfOnline: true });
    return at;
  };

  if (req.method === 'POST' && (action === 'send' || action === 'voice') && isMuted(me.id)) {
    throw new HttpError(403, `Un admin t’a mis en sourdine : tu pourras de nouveau écrire à ${new Date(me.mutedUntil).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })}.`);
  }
  if (req.method === 'POST' && action === 'send') {
    const body = await readJson(req, 5_000);
    const text = String(body.text || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) throw new HttpError(400, 'Écris un message.');
    if (text.length > CHAT_MAX_LEN) throw new HttpError(400, `Message trop long (${CHAT_MAX_LEN} caractères maximum).`);
    const other = target(body.username);
    const at = await append(other, { t: text }, text.replace(/\s+/g, ' ').slice(0, 80));
    return send(res, 201, { message: { fromMe: true, text, at } });
  }

  // message vocal : l'enregistrement est rangé à part, le message garde juste sa référence et sa durée
  if (req.method === 'POST' && action === 'voice') {
    const body = await readJson(req, Math.ceil(VOICE_MAX_BYTES * 1.4) + 2_000);
    const m = /^data:(audio\/(?:webm|ogg|mp4|mpeg|aac|x-m4a|wav))(?:;[^,]*)?;base64,([A-Za-z0-9+/=]+)$/.exec(String(body.audio || ''));
    if (!m) throw new HttpError(400, 'Enregistrement invalide.');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 500) throw new HttpError(400, 'Message vocal trop court.');
    if (buf.length > VOICE_MAX_BYTES) throw new HttpError(413, 'Message vocal trop long (2 minutes maximum).');
    const duration = Math.round(Number(body.duration) || 0);
    if (duration < 1 || duration > VOICE_MAX_SEC) throw new HttpError(400, 'Message vocal : entre 1 seconde et 2 minutes.');
    const other = target(body.username);
    const id = chatKey(me.id, other.id) + ':' + randomBytes(9).toString('base64url');
    await saveVoice(id, { type: m[1], buf });
    const mins = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;
    const at = await append(other, { v: id, d: duration }, `🎤 Message vocal (${mins})`);
    return send(res, 201, { message: { fromMe: true, text: '', voice: { id, duration }, at } });
  }

  // écouter un message vocal : seulement les deux personnes de la conversation
  if (req.method === 'GET' && action === 'voice') {
    const id = String(url.searchParams.get('id') || '');
    const parts = id.split(':');
    if (parts.length !== 3 || !parts.slice(0, 2).includes(me.id)) throw new HttpError(404, 'Introuvable.');
    const voice = await loadVoice(id);
    if (!voice) throw new HttpError(404, 'Ce message vocal n’existe plus.');
    // lecture par morceaux (Safari en a besoin pour lire l'audio)
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    const size = voice.buf.length;
    const headers = { 'Content-Type': voice.type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=31536000, immutable' };
    if (range && (range[1] || range[2])) {
      let a = range[1] ? Number(range[1]) : size - Number(range[2]);
      let b = range[1] && range[2] ? Number(range[2]) : size - 1;
      a = Math.max(0, a); b = Math.min(size - 1, b);
      if (a > b) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true; }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
      res.end(voice.buf.subarray(a, b + 1));
      return true;
    }
    res.writeHead(200, { ...headers, 'Content-Length': size });
    res.end(voice.buf);
    return true;
  }

  throw new HttpError(404, 'Introuvable.');
}

// Ce que tout le monde voit d'un profil (les favoris et l'historique restent réservés aux amis)
function publicProfile(u, viewer) {
  const p = profileOf(u);
  const isMe = Boolean(viewer && viewer.id === u.id);
  const isFriend = Boolean(viewer && (viewer.friends || []).includes(u.id));
  const bt = blindtestLeaderboard(u.id, 0).me;
  return {
    username: u.username,
    bio: p.bio,
    banner: p.banner,
    bannerUrl: p.banner === 'image' && p.bannerV ? `/api/profile/image?u=${encodeURIComponent(u.username)}&k=banner&v=${p.bannerV}` : '',
    avatarUrl: p.avatarV ? `/api/profile/image?u=${encodeURIComponent(u.username)}&k=avatar&v=${p.avatarV}` : '',
    top: p.top,
    since: u.createdAt || '',
    blindtest: bt ? { rank: bt.rank, points: bt.points, games: bt.games, wins: bt.wins, best: bt.best } : null,
    friends: (u.friends || []).length,
    streak: streakOf(u),
    badges: badgesOf(u),
    isMe,
    relation: isMe ? 'me' : isFriend ? 'friend'
      : viewer && (viewer.outgoing || []).includes(u.id) ? 'outgoing'
      : viewer && (viewer.incoming || []).includes(u.id) ? 'incoming' : viewer ? 'none' : 'guest',
    ...(isMe || isFriend ? presence(u) : {}),
    banners: BANNER_PRESETS,
  };
}

async function handleProfile(req, res, url) {
  const viewer = currentUser(req);

  // l'image elle-même (photo ou bannière)
  if (url.pathname === '/api/profile/image' && req.method === 'GET') {
    const u = findByUsername(url.searchParams.get('u') || '');
    const kind = url.searchParams.get('k');
    if (!u || !IMG_LIMITS[kind]) throw new HttpError(404, 'Introuvable.');
    const img = await loadImage(`${u.id}:${kind}`);
    if (!img) throw new HttpError(404, 'Introuvable.');
    res.writeHead(200, { 'Content-Type': img.type, 'Content-Length': img.buf.length, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    res.end(img.buf);
    return true;
  }

  if (url.pathname === '/api/profile' && req.method === 'GET') {
    const name = url.searchParams.get('username') || (viewer && viewer.username) || '';
    const u = findByUsername(name);
    if (!u || !u.username) throw new HttpError(404, 'Ce profil n’existe pas.');
    return send(res, 200, { profile: publicProfile(u, viewer) });
  }

  if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
  if (!sameSiteJson(req)) throw new HttpError(400, 'Requête invalide.');
  if (!viewer) throw new HttpError(401, 'Connecte-toi pour modifier ton profil.');
  if (!viewer.username) throw new HttpError(403, 'Choisis d’abord un identifiant.');
  if (tooManyWrites(viewer.id)) throw new HttpError(429, 'Trop de sauvegardes, réessaie dans une minute.');
  const p = profileOf(viewer);

  // nouvelle photo ou nouvelle bannière (null = l'enlever)
  if (url.pathname === '/api/profile/image') {
    const body = await readJson(req, 600_000);
    const kind = body.kind;
    if (!IMG_LIMITS[kind]) throw new HttpError(400, 'Requête invalide.');
    const img = body.image ? parseImage(body.image, kind) : null;
    try {
      await saveImage(`${viewer.id}:${kind}`, img);
    } catch (err) {
      console.error('Image de profil :', err.message);
      throw new HttpError(500, 'Sauvegarde impossible pour le moment.');
    }
    if (kind === 'avatar') p.avatarV = img ? Date.now() : 0;
    else { p.bannerV = img ? Date.now() : 0; p.banner = img ? 'image' : 'cassette'; }
    viewer.profile = p;
    await persist();
    return send(res, 200, { profile: publicProfile(viewer, viewer) });
  }

  // bio, bannière de couleur, sons préférés
  if (url.pathname === '/api/profile') {
    const body = await readJson(req, 20_000);
    if (typeof body.bio === 'string') p.bio = body.bio.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 300);
    if (BANNER_PRESETS.includes(body.banner)) p.banner = body.banner;
    if (Array.isArray(body.top)) {
      const seen = new Set();
      p.top = body.top.filter((x) => x && typeof x === 'object').map((x) => ({
        title: str(x.title, 200).trim(), artist: str(x.artist, 200).trim(), image: httpsUrl(x.image),
      })).filter((x) => x.title && !seen.has((x.title + '|' + x.artist).toLowerCase()) && seen.add((x.title + '|' + x.artist).toLowerCase())).slice(0, 6);
    }
    viewer.profile = p;
    try { await persist(); } catch (err) {
      console.error('Profil :', err.message);
      throw new HttpError(500, 'Sauvegarde impossible pour le moment.');
    }
    return send(res, 200, { profile: publicProfile(viewer, viewer) });
  }
  throw new HttpError(404, 'Introuvable.');
}

const ROUTES = new Set(['/api/me', '/api/signup', '/api/login', '/api/logout', '/api/data', '/api/username', '/api/rankings', '/api/favorites']);

// Renvoie true si la requête a été traitée ici
export async function handleAuth(req, res, url) {
  const path = url.pathname;
  const isFriends = path === '/api/friends' || path.startsWith('/api/friends/');
  const isProfile = path === '/api/profile' || path === '/api/profile/image';
  const isMessages = path === '/api/messages' || path.startsWith('/api/messages/');
  const isPush = path.startsWith('/api/push/');
  const isPlaylists = path === '/api/playlists' || path.startsWith('/api/playlists/');
  if (!ROUTES.has(path) && !isFriends && !isProfile && !isMessages && !isPush && !isPlaylists) return false;

  try {
    if (isProfile) return await handleProfile(req, res, url);

    if (path === '/api/rankings') {
      const me = currentUser(req);
      return send(res, 200, rankings(me ? me.id : null));
    }

    if (path === '/api/me') {
      if (req.method !== 'GET') throw new HttpError(405, 'Méthode non autorisée.');
      return send(res, 200, { user: publicUser(currentUser(req)) });
    }

    if (isPush) return await handlePush(req, res, url, currentUser(req));
    if (isPlaylists) return await handlePlaylists(req, res, url, currentUser(req));

    if (isMessages) {
      const me = currentUser(req);
      if (!me || !me.username) throw new HttpError(401, 'Connecte-toi pour envoyer des messages.');
      return await handleMessages(req, res, url, me);
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

    if (path === '/api/favorites') { // ajouter / retirer un favori sans renvoyer toutes les données (blind test)
      const me = currentUser(req);
      if (!me) throw new HttpError(401, 'Connecte-toi pour garder tes favoris.');
      if (tooManyWrites(me.id)) throw new HttpError(429, 'Doucement ! Réessaie dans une minute.');
      const body = await readJson(req, 4_000);
      const title = str(body.title, 200).trim();
      if (!title) throw new HttpError(400, 'Son invalide.');
      const artist = str(body.artist, 200);
      const key = (title + '|' + artist).toLowerCase().trim();
      const data = me.data || cleanData({});
      data.favorites = data.favorites.filter((f) => f.key !== key);
      if (body.on !== false) data.favorites.unshift({ key, title, artist, image: httpsUrl(body.image), url: '', preview: httpsUrl(body.preview) });
      me.data = cleanData(data);
      await persist();
      return send(res, 200, { ok: true, count: me.data.favorites.length });
    }

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
      const username = normUsername((await readJson(req)).username);
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
      const username = normUsername(body.username);
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
      countStat('signups');
      return send(res, 201, { user: publicUser(user) }, { 'Set-Cookie': cookie(req, token, SESSION_TTL / 1000) });
    }

    // /api/login : identifiant ou e-mail
    const login = normUsername(body.login ?? body.email ?? '');
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
    countStat('logins');
    await persist();
    return send(res, 200, { user: publicUser(user) }, { 'Set-Cookie': cookie(req, token, SESSION_TTL / 1000) });
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    console.error('Erreur compte :', err.message);
    return send(res, 500, { error: 'Erreur du serveur.' });
  }
}

await load();
if (vapidIsNew) persist().catch((err) => console.error('Notifications, clés :', err.message));

// Pseudos (une seule fois) : tous en minuscules. Si deux comptes tombent sur le même pseudo,
// le plus récent reçoit un chiffre à la fin (et on garde la trace dans u.oldUsername).
if (!migrations.has('usernames-lower-1')) {
  const users = [...usersById.values()].filter((u) => u.username).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  for (const u of users) unindexUser(u);
  const taken = new Set();
  let changed = 0;
  for (const u of users) {
    let name = u.username.toLowerCase().replace(/^@+/, '');
    if (taken.has(name)) { let i = 2; while (taken.has(`${name.slice(0, 28)}${i}`)) i++; name = `${name.slice(0, 28)}${i}`; }
    taken.add(name);
    if (name !== u.username) { u.oldUsername = u.username; u.username = name; changed++; }
  }
  for (const u of usersById.values()) indexUser(u);
  migrations.add('usernames-lower-1');
  persist().then(() => console.log(`Pseudos : ${changed} passé(s) en minuscules.`)).catch((err) => console.error('Pseudos :', err.message));
}

// Cadeau de lancement (une seule fois) : une flamme pour chaque compte déjà créé.
// Elle s'éteint s'ils ne jouent pas ou ne cherchent pas un son demain, comme une flamme normale.
if (!migrations.has('flame-gift-1')) {
  const today = parisDay();
  let n = 0;
  for (const u of usersById.values()) {
    if (!u.username) continue;
    const st = u.streak || (u.streak = { count: 0, best: 0, last: '' });
    if (streakOf(u).count === 0) { st.count = 1; st.last = today; st.best = Math.max(st.best || 0, 1); }
    u.gift = 'flame-1'; // message affiché à la prochaine visite
    n++;
    notifyUser(u.id, 'streak', {
      title: '🎁 Cadeau : une flamme 🔥 pour toi !',
      body: 'Joue au blind test ou cherche un son chaque jour pour la garder, sinon elle s’éteint.',
      url: '/blindtest', tag: 'gift',
    }, { evenIfOnline: true });
  }
  migrations.add('flame-gift-1');
  persist().then(() => console.log(`Cadeau : une flamme offerte à ${n} compte(s).`)).catch((err) => console.error('Cadeau flamme :', err.message));
}
