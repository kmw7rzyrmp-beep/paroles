// Serveur sans dépendance (Node 20.12+). Sert la page et relaie la recherche vers Genius.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAuth, clientIp, sessionUser, findFriend, recordBlindtest, blindtestLeaderboard } from './auth.js';
import { createBlindtest } from './blindtest.js';

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
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

// Extensions testées pour l'image de fond (/fond -> public/fond.jpg, .png, .webp...)
const FOND_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];

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
  { title: 'Titre d’exemple A', artist: 'Artiste démo', image: '', url: '', preview: '' },
  { title: 'Titre d’exemple B', artist: 'Artiste démo', image: '', url: '', preview: '' },
  { title: 'Titre d’exemple C', artist: 'Autre artiste démo', image: '', url: '', preview: '' },
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
  // Seulement la partie « paroles » : les autres parties de la réponse cherchent par titre
  const section = sections.find((s) => s.type === 'lyric');
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

// 3) Extrait audio de ~30 s : iTunes d'abord, Deezer en secours (API publiques, sans clé)
const previewCache = new Map();
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

function sameSong(title, artist, candTitle, candArtist) {
  const t = norm(title), a = norm(artist), ct = norm(candTitle), ca = norm(candArtist);
  if (!t || !ct) return false;
  const titleOk = ct.includes(t) || t.includes(ct);
  const artistOk = !a || !ca || a.includes(ca) || ca.includes(a);
  return titleOk && artistOk;
}

async function getJson(url, label) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  return res.json();
}

async function previewFromItunes(title, artist) {
  const params = new URLSearchParams({ term: `${title} ${artist}`, media: 'music', entity: 'song', limit: '10', country: 'FR' });
  const json = await getJson(`https://itunes.apple.com/search?${params}`, 'iTunes');
  const m = (json.results || []).find((r) => r.previewUrl && sameSong(title, artist, r.trackName, r.artistName));
  return m?.previewUrl || '';
}

async function previewFromDeezer(title, artist) {
  const params = new URLSearchParams({ q: `${title} ${artist}`, limit: '10' });
  const json = await getJson(`https://api.deezer.com/search?${params}`, 'Deezer');
  const m = (json.data || []).find((r) => r.preview && sameSong(title, artist, r.title, r.artist?.name));
  return m?.preview || '';
}

async function findPreview(title, artist) {
  const key = norm(title + artist);
  if (previewCache.has(key)) return previewCache.get(key);

  let preview = '';
  let failed = false;
  for (const source of [previewFromItunes, previewFromDeezer]) {
    try {
      preview = await source(title, artist);
    } catch (err) {
      failed = true;
      console.error('Extrait audio :', err.message);
    }
    if (preview) break;
  }
  console.log(`Extrait « ${title} » (${artist}) : ${preview ? 'trouvé' : 'aucun'}`);

  if (!preview && failed) return ''; // erreur réseau : on ne met pas en cache
  if (previewCache.size >= CACHE_MAX * 4) previewCache.delete(previewCache.keys().next().value);
  previewCache.set(key, preview);
  return preview;
}

// 4) Paroles via LRCLIB (API publique et gratuite, sans clé), avec les horodatages quand ils existent
const lyricsCache = new Map();

function parseLrc(lrc) {
  const out = [];
  for (const line of String(lrc || '').split('\n')) {
    const m = line.match(/^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/);
    if (m && m[3].trim()) out.push({ t: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim() });
  }
  return out;
}

async function findLyrics(title, artist) {
  if (DEMO) return { lyrics: 'Paroles d’exemple.\nCeci est le mode démo.', synced: [] };
  const key = norm(title + artist);
  if (lyricsCache.has(key)) return lyricsCache.get(key);

  const base = 'https://lrclib.net/api/search';
  const tries = [
    `${base}?${new URLSearchParams({ track_name: title, artist_name: artist })}`,
    `${base}?${new URLSearchParams({ q: `${title} ${artist}` })}`,
  ];
  let data = { lyrics: '', synced: [] };
  let failed = false;
  for (const u of tries) {
    try {
      const list = await getJson(u, 'LRCLIB');
      const matches = (Array.isArray(list) ? list : []).filter(
        (r) => (r.syncedLyrics || r.plainLyrics) && sameSong(title, artist, r.trackName, r.artistName)
      );
      const best = matches.find((r) => r.syncedLyrics) || matches[0];
      if (best) {
        const synced = parseLrc(best.syncedLyrics);
        const lyrics = (best.plainLyrics || synced.map((l) => l.text).join('\n')).trim();
        data = { lyrics, synced };
        break;
      }
    } catch (err) {
      failed = true;
      console.error('Paroles :', err.message);
    }
  }
  console.log(`Paroles « ${title} » (${artist}) : ${data.synced.length ? 'synchronisées' : data.lyrics ? 'simples' : 'aucune'}`);

  if (!data.lyrics && failed) return data;
  if (lyricsCache.size >= CACHE_MAX) lyricsCache.delete(lyricsCache.keys().next().value);
  lyricsCache.set(key, data);
  return data;
}

// 5) Liens directs vers le son sur Spotify et Deezer (cherchés seulement au clic, puis gardés en cache)
const SPOTIFY_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const linkCache = new Map();
let spotifyToken = { value: '', exp: 0 };

async function deezerTrack(title, artist) {
  const tries = [`artist:"${artist}" track:"${title}"`, `${title} ${artist}`];
  for (const q of tries) {
    const json = await getJson(`https://api.deezer.com/search?${new URLSearchParams({ q, limit: '10' })}`, 'Deezer');
    const m = (json.data || []).find((r) => r.link && sameSong(title, artist, r.title, r.artist?.name));
    if (m) return m.link;
  }
  return '';
}

async function spotifyApiTrack(title, artist) {
  if (!SPOTIFY_ID || !SPOTIFY_SECRET) return '';
  if (Date.now() > spotifyToken.exp) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_ID}:${SPOTIFY_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Spotify (jeton) HTTP ${res.status}`);
    const t = await res.json();
    spotifyToken = { value: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
  }
  const params = new URLSearchParams({ q: `track:${title} artist:${artist}`, type: 'track', limit: '10', market: 'FR' });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${spotifyToken.value}` },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Spotify HTTP ${res.status}`);
  const json = await res.json();
  const m = (json.tracks?.items || []).find((t) => sameSong(title, artist, t.name, t.artists?.map((a) => a.name).join(' ')));
  return m?.external_urls?.spotify || '';
}

// Sans clé Spotify : on passe par song.link (Odesli), qui connaît l'équivalent Spotify d'un lien Deezer
async function spotifyViaOdesli(title, artist) {
  const deezer = await findLink('deezer', title, artist);
  if (!deezer.direct) return '';
  const json = await getJson(`https://api.song.link/v1-alpha.1/links?${new URLSearchParams({ url: deezer.url, userCountry: 'FR' })}`, 'song.link');
  return json.linksByPlatform?.spotify?.url || '';
}

// Renvoie { url, direct } : direct = lien vers le morceau, sinon une page de recherche sur la plateforme
async function findLink(platform, title, artist) {
  const key = platform + norm(title + artist);
  if (linkCache.has(key)) return linkCache.get(key);
  let url = '';
  let failed = false;
  try {
    if (platform === 'deezer') url = await deezerTrack(title, artist);
    else url = (await spotifyApiTrack(title, artist)) || (await spotifyViaOdesli(title, artist));
  } catch (err) {
    failed = true;
    console.error(`Lien ${platform} :`, err.message);
  }
  const q = encodeURIComponent(`${title} ${artist}`.trim());
  const result = url
    ? { url, direct: true }
    : { url: platform === 'deezer' ? `https://www.deezer.com/search/${q}` : `https://open.spotify.com/search/${q}`, direct: false };
  if (!failed) {
    if (linkCache.size >= CACHE_MAX * 4) linkCache.delete(linkCache.keys().next().value);
    linkCache.set(key, result);
  }
  return result;
}

// Vérifie qu'une chanson contient bien ce qu'on a tapé, en lisant ses paroles (LRCLIB)
const words = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/['’`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

function lyricsScore(q, lyrics) {
  const text = ' ' + words(lyrics) + ' ';
  if (text.trim() === '') return null; // paroles introuvables : on ne peut pas savoir
  const qw = words(q);
  if (text.includes(' ' + qw + ' ')) return 1.5; // la phrase exacte est dans les paroles
  const list = qw.split(' ').filter((w) => w.length >= 2);
  if (!list.length) return 0;
  // Tolère les petites fautes et les accords : « cauchemar » trouve « cauchemars », « fini » trouve « finis »
  const lyricWords = new Set(text.trim().split(' '));
  const close = (a, b) => {
    const min = Math.min(a.length, b.length);
    if (min < 4 || Math.abs(a.length - b.length) > 2) return false;
    let i = 0;
    while (i < min && a[i] === b[i]) i++;
    return i >= min - 1; // même début de mot, seule la fin change
  };
  const found = list.filter((w) => lyricWords.has(w) || [...lyricWords].some((lw) => close(w, lw))).length;
  return found / list.length;
}

async function searchLyrics(q) {
  if (DEMO) return { demo: true, results: DEMO_RESULTS };

  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  let results;
  let byTitle = false; // true si on a dû se rabattre sur la recherche par titre
  try {
    results = await searchByLyrics(q);
    console.log(`Recherche « ${q} » : par paroles (Genius), ${results.length} résultat(s)`);
  } catch (err) {
    console.error(`Recherche par paroles impossible (${err.message}).`);
    if (!TOKEN) throw err;
    results = await searchOfficial(q);
    byTitle = true;
    console.log(`Recherche « ${q} » : secours par titre (API officielle), ${results.length} résultat(s) à vérifier`);
  }

  // Supprime les doublons éventuels
  const seen = new Set();
  results = results.filter((r) => r.title && !seen.has(r.url || r.title + r.artist) && seen.add(r.url || r.title + r.artist));

  // Pour chaque son : extrait audio + vérification dans les paroles (en parallèle)
  await Promise.all(results.map(async (r, i) => {
    const [preview, lyr] = await Promise.all([
      findPreview(r.title, r.artist),
      findLyrics(r.title, r.artist).catch(() => ({ lyrics: '' })),
    ]);
    r.preview = preview;
    r._score = lyricsScore(q, lyr.lyrics);
    r._rank = i;
  }));

  // Les sons dont les paroles contiennent les mots tapés passent devant
  const MATCH = 0.6;
  const matched = results.filter((r) => r._score !== null && r._score >= MATCH);
  const unknown = results.filter((r) => r._score === null);
  const others = results.filter((r) => r._score !== null && r._score < MATCH);
  matched.sort((a, b) => b._score - a._score || a._rank - b._rank);
  // En secours par titre, on ne garde que ce qui est confirmé par les paroles.
  // Avec la vraie recherche par paroles, les sons non confirmés restent, mais à la fin.
  results = byTitle ? matched : [...matched, ...unknown, ...others];
  console.log(`  → ${matched.length} confirmé(s) par les paroles, ${unknown.length} sans paroles connues, ${others.length} ${byTitle ? 'écarté(s)' : 'mis à la fin'}`);
  for (const r of results) { delete r._score; delete r._rank; }

  const data = { demo: false, byTitle, results };
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(q, { at: Date.now(), data });
  return data;
}

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

const handleBlindtest = createBlindtest({ getJson, sameSong, clientIp, sessionUser, findFriend, recordBlindtest, blindtestLeaderboard, demo: DEMO });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Comptes : /api/signup, /api/login, /api/logout, /api/me
  if (await handleAuth(req, res, url)) return;

  // Blind test entre amis : /api/bt/...
  if (await handleBlindtest(req, res, url)) return;

  if (url.pathname === '/api/search') {
    const ip = clientIp(req);
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

  if (url.pathname === '/api/lyrics') {
    const ip = clientIp(req);
    if (tooMany(ip)) return sendJson(res, 429, { error: 'Trop de recherches, réessaie dans une minute.' });

    const title = (url.searchParams.get('title') || '').trim().slice(0, 200);
    const artist = (url.searchParams.get('artist') || '').trim().slice(0, 200);
    if (!title) return sendJson(res, 400, { error: 'Titre manquant.' });

    try {
      return sendJson(res, 200, await findLyrics(title, artist));
    } catch (err) {
      console.error('Erreur paroles :', err.message);
      return sendJson(res, 502, { error: 'Le service de paroles ne répond pas.' });
    }
  }

  // /api/go/spotify ou /api/go/deezer : redirige vers le son sur la plateforme
  const go = url.pathname.match(/^\/api\/go\/(spotify|deezer)$/);
  if (go) {
    const title = (url.searchParams.get('title') || '').trim().slice(0, 200);
    const artist = (url.searchParams.get('artist') || '').trim().slice(0, 200);
    if (!title) return sendJson(res, 400, { error: 'Titre manquant.' });
    const q = encodeURIComponent(`${title} ${artist}`.trim());
    let target = go[1] === 'deezer' ? `https://www.deezer.com/search/${q}` : `https://open.spotify.com/search/${q}`;
    if (!DEMO && !tooMany(clientIp(req))) target = (await findLink(go[1], title, artist)).url;
    res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' });
    return res.end();
  }

  // Fichiers statiques (uniquement dans /public)
  const name = url.pathname === '/' ? '/index.html' : url.pathname === '/blindtest' ? '/blindtest.html' : url.pathname;
  let file;
  try {
    file = resolve(join(PUBLIC_DIR, decodeURIComponent(name)));
  } catch {
    res.writeHead(400).end('Requête invalide');
    return;
  }
  if (!file.startsWith(PUBLIC_DIR + sep)) {
    res.writeHead(403).end('Interdit');
    return;
  }
  try {
    let body;
    // /fond (sans extension) : on cherche public/fond.jpg, .png, .webp, etc.
    if (url.pathname === '/fond') {
      for (const e of FOND_EXTS) {
        try {
          body = await readFile(file + e);
          file = file + e;
          break;
        } catch { /* extension suivante */ }
      }
      if (!body) throw new Error('fond introuvable');
    } else {
      body = await readFile(file);
    }
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    // La page, le service worker et le manifeste doivent toujours être relus, pour que les mises à jour arrivent
    if (ext === '.html' || ext === '.js' || ext === '.webmanifest') headers['Cache-Control'] = 'no-cache';
    else headers['Cache-Control'] = 'public, max-age=3600';
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page introuvable');
  }
});

server.listen(PORT, () => {
  console.log(`Site disponible sur http://localhost:${PORT}`);
  if (DEMO) console.log('⚠ Mode démo : résultats fictifs.');
});
