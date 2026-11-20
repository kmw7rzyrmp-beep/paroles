// Serveur sans dépendance (Node 20.12+). Sert la page et relaie la recherche vers Genius.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Charge le fichier .env s'il existe (le jeton Genius y est facultatif, voir README).
try { process.loadEnvFile(); } catch { /* pas de .env : pas grave */ }

const PORT = Number(process.env.PORT) || 3000;
const TOKEN = process.env.GENIUS_ACCESS_TOKEN || '';
const DEMO = process.argv.includes('--demo');
const PUBLIC_DIR = resolve(fileURLToPath(new URL('./public', import.meta.url)));
const UA = 'Mozilla/5.0 (compatible; recherche-paroles/1.0)';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// --- Limitation de débit (30 requêtes / minute / IP) et cache (10 min) ---
const hits = new Map();
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;
const CACHE_MAX = 500;

function tooMany(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.reset) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  h.count += 1;
  return h.count > 30;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of hits) if (now > h.reset) hits.delete(ip);
}, 60_000).unref();

// --- Résultats d'exemple pour le mode démo (npm run demo) ---
const DEMO_RESULTS = [
  { title: 'Titre d’exemple A', artist: 'Artiste démo', image: '', url: '' },
  { title: 'Titre d’exemple B', artist: 'Artiste démo', image: '', url: '' },
  { title: 'Titre d’exemple C', artist: 'Autre artiste démo', image: '', url: '' },
];

// --- Genius ---
function toResult(r) {
  return {
    title: r.title,
    artist: r.primary_artist_names || r.primary_artist?.name || '',
    image: r.song_art_image_thumbnail_url || r.header_image_thumbnail_url || '',
    url: r.url || '',
  };
}

// 1) Recherche par paroles (point d'accès public de Genius, non documenté officiellement)
async function searchByLyrics(q) {
  const params = new URLSearchParams({ q, per_page: '10' });
  const res = await fetch(`https://genius.com/api/search/lyric?${params}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Genius (paroles) HTTP ${res.status}`);
  const json = await res.json();
  const sections = json?.response?.sections || [];
  const section = sections.find((s) => s.type === 'lyric') || sections[0];
  return (section?.hits || []).map((h) => toResult(h.result));
}

// 2) Secours : API officielle (nécessite GENIUS_ACCESS_TOKEN), recherche surtout par titre/artiste
async function searchOfficial(q) {
  const res = await fetch(`https://api.genius.com/search?${new URLSearchParams({ q, per_page: '10' })}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Genius (officiel) HTTP ${res.status}`);
  const json = await res.json();
  return (json?.response?.hits || []).filter((h) => h.type === 'song').map((h) => toResult(h.result));
}

async function searchLyrics(q) {
  if (DEMO) return { demo: true, results: DEMO_RESULTS };

  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  let results;
  try {
    results = await searchByLyrics(q);
  } catch (err) {
    console.error(err.message);
    if (!TOKEN) throw err;
    results = await searchOfficial(q);
  }

  // Supprime les doublons éventuels
  const seen = new Set();
  results = results.filter((r) => r.title && !seen.has(r.url || r.title + r.artist) && seen.add(r.url || r.title + r.artist));

  const data = { demo: false, results };
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(q, { at: Date.now(), data });
  return data;
}

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/search') {
    const ip = req.socket.remoteAddress || 'inconnu';
    if (tooMany(ip)) return sendJson(res, 429, { error: 'Trop de recherches, réessaie dans une minute.' });

    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    if (q.length < 3) return sendJson(res, 400, { error: 'Tape au moins 3 caractères.' });

    try {
      return sendJson(res, 200, await searchLyrics(q));
    } catch (err) {
      console.error('Erreur de recherche :', err.message);
      return sendJson(res, 502, { error: 'Le service de paroles ne répond pas. Réessaie dans un instant.' });
    }
  }

  // Fichiers statiques (uniquement dans /public)
  const name = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = resolve(join(PUBLIC_DIR, decodeURIComponent(name)));
  if (!file.startsWith(PUBLIC_DIR + sep)) {
    res.writeHead(403).end('Interdit');
    return;
  }
  try {
    const body = await readFile(file);
    const ext = file.slice(file.lastIndexOf('.'));
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page introuvable');
  }
});

server.listen(PORT, () => {
  console.log(`Site disponible sur http://localhost:${PORT}`);
  if (DEMO) console.log('⚠ Mode démo : résultats fictifs.');
});
