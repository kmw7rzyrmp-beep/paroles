// Serveur sans dépendance (Node 20.12+). Sert la page et relaie la recherche vers Genius.
import { PATCH_NOTES } from './patchnotes.js';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAuth, clientIp, sessionUser, findFriend, recordBlindtest, blindtestLeaderboard, markInBlindtest, countStat, isAdmin, adminStats, recordActivity, recordListen, streakOf, notifyUser, usersStreak, getPlaylist, playlistsFor, adminNotify, atReplacer, runAdminCommand, addAdminCommand, ADMIN_COMMANDS, liveState, isMuted } from './auth.js';
import { createBlindtest } from './blindtest.js';
import { CATEGORIES } from './categories.js';

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
  { title: 'Titre d’exemple A', artist: 'Artiste démo', image: '', url: '', preview: '', at: 83 },
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

// Compare mot par mot (et pas lettre par lettre) : « SCH » ne doit pas matcher « Schoolboy Q »,
// et « Otto » ne doit pas matcher un son qui s'appelle « To ».
const padWords = (s) => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const coreTitle = (s) => padWords(String(s || '').replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''));
const hasWords = (big, small) => small.trim() !== '' && big.includes(small);

function sameSong(title, artist, candTitle, candArtist, strict = false) {
  const t = coreTitle(title), ct = coreTitle(candTitle);
  if (!t.trim() || !ct.trim()) return false;
  const a = padWords(artist), ca = padWords(candArtist);
  const titleOk = strict ? t === ct : (hasWords(ct, t) || hasWords(t, ct));
  const artistOk = !a.trim() || !ca.trim() || hasWords(ca, a) || hasWords(a, ca);
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

// --- La vidéo YouTube d'un son (pour écouter le passage exact des paroles tapées) ---
// Pas de clé YouTube : on lit la page de résultats et on prend la première vidéo « audio » si possible
// (la version audio a le même minutage que les paroles synchronisées).
const videoCache = new Map();
async function findVideo(title, artist) {
  const key = norm(title + artist);
  if (videoCache.has(key)) return videoCache.get(key);
  // la durée exacte du morceau (paroles synchronisées) : la vidéo qui a la même durée a le même minutage
  const target = (await findLyrics(title, artist).catch(() => ({}))).duration || 0;
  const seconds = (txt) => String(txt || '').split(':').reduce((n, x) => n * 60 + Number(x), 0);
  const found = [];
  for (const q of [`${artist} ${title} audio`, `${artist} ${title}`]) {
    try {
      const res = await fetch(`https://www.youtube.com/results?${new URLSearchParams({ search_query: q, hl: 'fr', gl: 'FR' })}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'fr-FR,fr;q=0.9', Cookie: 'SOCS=CAI; CONSENT=YES+cb' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      // chaque vidéo : son identifiant et sa durée (« 3:45 »)
      const re = /"videoRenderer":\{"videoId":"([\w-]{11})"[\s\S]{0,4000}?"lengthText":\{[^}]*?"simpleText":"([\d:]+)"/g;
      let m;
      while ((m = re.exec(html)) && found.length < 20) if (!found.some((f) => f.id === m[1])) found.push({ id: m[1], dur: seconds(m[2]), rank: found.length });
      if (!found.length) { const one = html.match(/"videoId":"([\w-]{11})"/); if (one) found.push({ id: one[1], dur: 0, rank: 0 }); }
      if (target && found.some((f) => Math.abs(f.dur - target) <= 2)) break; // une vidéo à la bonne durée : on a ce qu'il faut
    } catch (err) { console.error('YouTube :', err.message); }
  }
  let id = '';
  if (found.length) {
    // la plus proche de la durée du morceau, sinon la première de la liste
    const pick = target ? [...found].sort((a, b) => (Math.abs(a.dur - target) - Math.abs(b.dur - target)) || a.rank - b.rank)[0] : found[0];
    id = pick.id;
  }
  if (videoCache.size >= CACHE_MAX * 4) videoCache.delete(videoCache.keys().next().value);
  videoCache.set(key, id);
  return id;
}

// --- Pochettes d'albums de rap (le disque de l'accueil change à chaque visite) ---
const albumCache = new Map(); // artiste -> [{ cover, album, artist }]
async function randomCover() {
  const rap = CATEGORIES.filter((c) => c.id === 'rap-fr' || c.id === 'rap-us');
  const artists = [...new Set(rap.flatMap((c) => c.chansons.map((s) => s.artiste)))];
  if (!artists.length || DEMO) return { cover: '' };
  for (let tries = 0; tries < 4; tries++) {
    const artist = artists[Math.floor(Math.random() * artists.length)];
    let albums = albumCache.get(artist);
    if (!albums) {
      albums = [];
      // 1) Deezer (albums de l'artiste), 2) iTunes en secours
      try {
        const json = await getJson(`https://api.deezer.com/search/album?${new URLSearchParams({ q: `artist:"${artist}"`, limit: '25' })}`, 'Deezer');
        albums = (json.data || []).filter((a) => a.cover_xl && norm(a.artist?.name).includes(norm(artist).slice(0, 5)))
          .map((a) => ({ cover: a.cover_xl, album: a.title, artist: a.artist.name }));
      } catch (err) { console.error('Pochette (Deezer) :', err.message); }
      if (!albums.length) {
        try {
          const params = new URLSearchParams({ term: artist, media: 'music', entity: 'album', limit: '25', country: 'FR' });
          const json = await getJson(`https://itunes.apple.com/search?${params}`, 'iTunes');
          albums = (json.results || []).filter((r) => r.artworkUrl100 && norm(r.artistName).includes(norm(artist).slice(0, 5)))
            .map((r) => ({ cover: r.artworkUrl100.replace('100x100bb', '600x600bb'), album: r.collectionName, artist: r.artistName }));
        } catch (err) { console.error('Pochette (iTunes) :', err.message); }
      }
      if (albums.length) { // on ne garde en mémoire que les réussites (un échec sera réessayé plus tard)
        albumCache.set(artist, albums);
        if (albumCache.size > 300) albumCache.delete(albumCache.keys().next().value);
      }
    }
    if (albums.length) return albums[Math.floor(Math.random() * albums.length)];
  }
  return { cover: '' };
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
        data = { lyrics, synced, duration: Number(best.duration) || 0 }; // duration : durée du morceau (s), pour choisir la bonne vidéo
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

// Trouve la ligne (ou les 2 lignes qui se suivent) des paroles synchronisées qui contient le mieux ce qu'on a tapé
function lyricsMoment(q, synced) {
  if (!Array.isArray(synced) || !synced.length) return null;
  const qw = words(q).split(' ').filter(Boolean);
  if (!qw.length) return null;
  // chaque mot des paroles reçoit son heure : début de la ligne + sa place dans la ligne
  // (on suppose que la ligne est chantée sur ~85 % du temps jusqu'à la ligne suivante, 6 s max)
  const flat = [];
  for (let i = 0; i < synced.length; i++) {
    const ws = words(synced[i].text).split(' ').filter(Boolean);
    const next = synced[i + 1] ? synced[i + 1].t : synced[i].t + 4;
    const span = Math.min(6, Math.max(0.5, next - synced[i].t)) * 0.85;
    ws.forEach((w, k) => flat.push({ w, t: synced[i].t + (span * k) / ws.length }));
  }
  const same = (a, b) => a === b || (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a)));
  // on cherche l'endroit où les mots tapés apparaissent dans l'ordre (avec un peu de tolérance)
  let best = { score: 0, t: null };
  for (let j = 0; j < flat.length; j++) {
    if (!same(flat[j].w, qw[0]) && !(qw.length > 1 && same(flat[j].w, qw[1]))) continue; // ça commence par un des 2 premiers mots tapés
    let qi = same(flat[j].w, qw[0]) ? 0 : 1, matched = 0, last = j, pos = j;
    const end = Math.min(flat.length, j + qw.length + 4);
    for (; pos < end && qi < qw.length; pos++) {
      // le mot tapé peut être sauté s'il ne se trouve pas tout de suite (faute de frappe, mot oublié)
      if (same(flat[pos].w, qw[qi])) { matched++; qi++; last = pos; }
      else if (qi + 1 < qw.length && same(flat[pos].w, qw[qi + 1])) { matched++; qi += 2; last = pos; }
    }
    // les mots trouvés comptent, et les mots en trop au milieu font perdre un peu
    const score = matched / qw.length - 0.02 * Math.max(0, last - j + 1 - matched);
    if (score > best.score + 1e-6) best = { score, t: flat[j].t };
  }
  return best.score >= 0.6 ? Math.max(0, Math.round(best.t * 10) / 10) : null;
}

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
  if (DEMO) return { demo: true, yt: true, results: DEMO_RESULTS.map((r) => ({ ...r })) };

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
    // le moment du son où se trouvent les paroles tapées (paroles synchronisées), en secondes
    const at = lyricsMoment(q, lyr.synced);
    if (at !== null) r.at = at;
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

  const data = { demo: false, byTitle, results, yt: true };
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(q, { at: Date.now(), data });
  return data;
}

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body, atReplacer));
}

const handleBlindtest = createBlindtest({ getJson, sameSong, clientIp, sessionUser, findFriend, recordBlindtest, blindtestLeaderboard, markInBlindtest, countStat, recordListen, streakOf: usersStreak, notifyUser, getPlaylist, playlistsFor, isMuted, demo: DEMO });
const STARTED = Date.now();
// commandes de la console admin qui touchent au blind test
addAdminCommand({ name: 'salons', use: 'salons', help: 'Les parties de blind test en cours.',
  run: () => { const list = handleBlindtest.rooms(); return list.length ? list.map((r) => `${r.code} · ${r.phase} · ${r.mode === 'br' ? 'battle royale' : 'normal'} · ${r.category} · ${r.players.join(', ')}`).join('\n') : 'Aucun salon ouvert.'; } });
addAdminCommand({ name: 'fermer-salon', use: 'fermer-salon CODE', help: 'Ferme un salon de blind test.',
  run: ([code]) => (handleBlindtest.closeRoom(code) ? `Salon ${String(code).toUpperCase()} fermé.` : 'Ce salon n’existe pas.') });
// visiteurs uniques du jour (empreinte de l'adresse IP, jamais l'adresse elle-même ; remis à zéro chaque jour)
let visitorDay = '';
const visitorsToday = new Set();
function countVisit(req) {
  countStat('visits');
  const d = new Date().toISOString().slice(0, 10);
  if (d !== visitorDay) { visitorDay = d; visitorsToday.clear(); }
  const h = createHash('sha256').update(clientIp(req) + d).digest('base64url').slice(0, 16);
  if (!visitorsToday.has(h)) { visitorsToday.add(h); countStat('visitors'); }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // Comptes : /api/signup, /api/login, /api/logout, /api/me
  if (await handleAuth(req, res, url)) return;

  // Blind test entre amis : /api/bt/...
  if (await handleBlindtest(req, res, url)) return;

  // Notification envoyée par l'admin à la personne de son choix
  if (url.pathname === '/api/patchnotes') { // le patch note : visible par tout le monde
    return sendJson(res, 200, { notes: PATCH_NOTES });
  }
  if (url.pathname === '/api/video') {
    const title = String(url.searchParams.get('title') || '').slice(0, 200), artist = String(url.searchParams.get('artist') || '').slice(0, 200);
    if (!title) return sendJson(res, 400, { error: 'Titre manquant.' });
    if (tooMany(clientIp(req))) return sendJson(res, 429, { error: 'Trop de demandes, réessaie dans une minute.' });
    return sendJson(res, 200, { videoId: DEMO ? '' : await findVideo(title, artist) });
  }
  // Une pochette d'album d'un rappeur au hasard (le disque de l'accueil)
  if (url.pathname === '/api/cover/random') return sendJson(res, 200, await randomCover());
  // Les effets en direct (annonce, confettis, couronnes) : pour tout le monde
  if (url.pathname === '/api/live') return sendJson(res, 200, liveState());
  // La console des admins
  if (url.pathname === '/api/admin/commands') {
    if (!isAdmin(sessionUser(req))) return sendJson(res, 404, { error: 'Introuvable.' });
    return sendJson(res, 200, { commands: ADMIN_COMMANDS.map((c) => ({ name: c.name, use: c.use, help: c.help })) });
  }
  if (url.pathname === '/api/admin/cmd' && req.method === 'POST') {
    const user = sessionUser(req);
    if (!isAdmin(user)) return sendJson(res, 404, { error: 'Introuvable.' });
    let body = {};
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 5000) throw new Error('trop long'); }
      body = JSON.parse(raw || '{}');
    } catch { return sendJson(res, 400, { error: 'Requête invalide.' }); }
    try {
      return sendJson(res, 200, { out: runAdminCommand(user, body.line) });
    } catch (err) {
      return sendJson(res, err.status || 500, { error: err.status ? err.message : 'Erreur : ' + err.message });
    }
  }
  if (url.pathname === '/api/admin/notify' && req.method === 'POST') {
    const user = sessionUser(req);
    if (!isAdmin(user)) return sendJson(res, 404, { error: 'Introuvable.' });
    let body = {};
    try {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 5000) throw new Error('trop long'); }
      body = JSON.parse(raw || '{}');
    } catch { return sendJson(res, 400, { error: 'Requête invalide.' }); }
    try {
      return sendJson(res, 200, adminNotify(user, body.username, body));
    } catch (err) {
      return sendJson(res, err.status || 500, { error: err.message });
    }
  }

  // Statistiques du site : seulement pour l'admin (ADMIN_USERNAME sur Render)
  if (url.pathname === '/api/admin/stats') {
    const user = sessionUser(req);
    if (!isAdmin(user)) return sendJson(res, 404, { error: 'Introuvable.' });
    const mem = process.memoryUsage();
    return sendJson(res, 200, adminStats({
      live: handleBlindtest.stats(),
      songs: CATEGORIES.map((c) => ({ nom: c.nom, count: c.chansons.length, artists: new Set(c.chansons.map((s) => s.artiste)).size })),
      server: { startedAt: new Date(STARTED).toISOString(), uptimeSec: Math.round((Date.now() - STARTED) / 1000), memoryMb: Math.round(mem.rss / 1048576), node: process.version, demo: DEMO },
    }));
  }

  if (url.pathname === '/api/search') {
    const ip = clientIp(req);
    if (tooMany(ip)) return sendJson(res, 429, { error: 'Trop de recherches, réessaie dans une minute.' });

    const q = (url.searchParams.get('q') || '').trim().slice(0, 200);
    if (q.length < 3) return sendJson(res, 400, { error: 'Tape au moins 3 caractères.' });

    try {
      const found = await searchLyrics(q);
      countStat('searches');
      const who = sessionUser(req);
      if (who) recordActivity(who.id); // une recherche par jour garde la flamme allumée
      return sendJson(res, 200, found);
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
      const found = await findLyrics(title, artist);
      countStat('lyrics');
      const who = sessionUser(req);
      if (who && artist) recordListen(who.id, artist); // badge de l'artiste
      return sendJson(res, 200, found);
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
    countStat('clicks_' + go[1]);
    const who = sessionUser(req);
    if (who && artist) recordListen(who.id, artist);
    const q = encodeURIComponent(`${title} ${artist}`.trim());
    let target = go[1] === 'deezer' ? `https://www.deezer.com/search/${q}` : `https://open.spotify.com/search/${q}`;
    if (!DEMO && !tooMany(clientIp(req))) target = (await findLink(go[1], title, artist)).url;
    res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' });
    return res.end();
  }

  // Fichiers statiques (uniquement dans /public)
  const name = url.pathname === '/' ? '/index.html' : url.pathname === '/blindtest' ? '/blindtest.html' : url.pathname;
  if ((name === '/index.html' || name === '/blindtest.html') && req.method === 'GET') countVisit(req);
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
    if (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.webmanifest') headers['Cache-Control'] = 'no-cache';
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
