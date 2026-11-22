// Blind test entre amis : salons avec un code, manches de 20 s, 4 propositions, points selon la rapidité.
// Les parties sont gardées en mémoire (elles n'ont pas besoin de survivre à un redémarrage).
import { randomBytes, randomInt } from 'node:crypto';
import { CATEGORIES } from './categories.js';

const ROUND_MS = 20_000;      // durée pour répondre
// Battle royale : la « zone » se resserre, il y a 1 s de moins pour répondre à chaque son (8 s minimum)
const BR_MIN_MS = 8_000, BR_STEP_MS = 1_000;
const LIVES = [1, 2, 3];       // battle royale : nombre de vies au départ
const REVEAL_MS = 6_000;      // affichage de la bonne réponse
const COUNTDOWN_MS = 4_000;   // compte à rebours avant la 1re manche
const MAX_ROOMS = 300;
const MAX_PLAYERS = 12;
const ROOM_TTL = 2 * 3600_000; // un salon inactif disparaît au bout de 2 h
const ROUND_CHOICES = [5, 10, 15, 30, 50]; // raccourcis proposés (on peut aussi taper un autre nombre)
const MAX_ROUNDS = 300;        // nombre de sons maximum quand on tape un nombre
const INFINITE = 0;            // 0 = mode infini : on continue tant qu'il reste des sons
// nombre de sons demandé -> nombre valide (ou null si ce n'est pas un nombre accepté)
const parseRounds = (v) => {
  const n = Number(v);
  if (n === INFINITE) return INFINITE;
  return Number.isInteger(n) && n >= 1 && n <= MAX_ROUNDS ? n : null;
};
const ALL = 'tout';
// Modes de jeu : classique (aux points) ou battle royale (une erreur = éliminé, le dernier debout gagne)
const MODES = [{ id: 'classique', nom: 'Normal' }, { id: 'br', nom: 'Battle royale' }];
const MODE_IDS = MODES.map((m) => m.id);
// Chat et réactions dans les salons
const CHAT_MAX = 200;
const REACTIONS = ['🔥', '😂', '😱', '👏', '💀', '😭', '🤯', '❤️'];

const rooms = new Map(); // code -> salon
const previewCache = new Map(); // "titre|artiste" -> url ('' = aucun extrait)

class BtError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 : impossibles à confondre
const newCode = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
const newToken = () => randomBytes(18).toString('base64url');
// les pseudos des comptes s'affichent avec un « @ » devant
const atReplacer = (k, v) => ((k === 'owner' || k === 'from' || k === 'username') && typeof v === 'string' && v && v[0] !== '@' ? '@' + v : v);
const cleanName = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 20);

// Les playlists des joueurs : « pl:<id> » (le contenu vient des comptes, voir auth.js)
let playlistLookup = () => null; // (id) -> { name, emoji, songs } ou null
const isPlaylist = (id) => typeof id === 'string' && id.startsWith('pl:');
function categorySongs(id) {
  if (isPlaylist(id)) {
    const pl = playlistLookup(id.slice(3));
    return pl ? pl.songs.map((s) => ({ titre: s.titre, artiste: s.artiste, cover: s.cover || '', cat: id, verifierArtiste: true })) : null;
  }
  if (id === ALL) return CATEGORIES.flatMap((c) => c.chansons.map((s) => ({ ...s, cat: c.id, verifierArtiste: c.verifierArtiste !== false })));
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.chansons.map((s) => ({ ...s, cat: c.id, verifierArtiste: c.verifierArtiste !== false })) : null;
}
// Artistes d'une catégorie, avec leur nombre de sons
function categoryArtists(id) {
  const songs = categorySongs(id) || [];
  const map = new Map();
  for (const s of songs) map.set(s.artiste, (map.get(s.artiste) || 0) + 1);
  return [...map].map(([nom, count]) => ({ nom, count }));
}
// Tous les artistes du site, avec leurs genres (pour les playlists d'artistes qui mélangent les genres)
let allArtistsCache = null;
function allArtists() {
  if (allArtistsCache) return allArtistsCache;
  const map = new Map();
  for (const c of CATEGORIES) for (const s of c.chansons) {
    const a = map.get(s.artiste) || { nom: s.artiste, count: 0, genres: [] };
    a.count += 1;
    if (!a.genres.includes(c.id)) a.genres.push(c.id);
    map.set(s.artiste, a);
  }
  return (allArtistsCache = [...map.values()]);
}
// Garde seulement les artistes qui existent dans la catégorie.
// null = tous les artistes ; [] = aucun (la partie ne pourra pas démarrer)
function cleanArtists(id, list) {
  if (!Array.isArray(list)) return null;
  const valid = new Set(categoryArtists(id).map((a) => a.nom));
  const picked = [...new Set(list.filter((a) => typeof a === 'string' && valid.has(a)))];
  return picked.length === valid.size ? null : picked;
}

// --- Bonus du jour ×2 : chaque jour (heure de Paris), un artiste, une catégorie ou « les parties avec une playlist » ---
// double les points gagnés. Le choix est le même pour tout le monde et ne change qu'à minuit.
// La liste est figée au démarrage (avant le chargement des sons Deezer) pour que le choix reste stable.
const BONUS_ARTISTS = (() => {
  const n = new Map();
  for (const c of CATEGORIES) { for (const a of c.artistesAuto || []) n.set(a, (n.get(a) || 0) + 99); for (const x of c.chansons) n.set(x.artiste, (n.get(x.artiste) || 0) + 1); }
  return [...n].filter(([, k]) => k >= 5).map(([a]) => a).sort();
})();
const BONUS_CATS = CATEGORIES.map((c) => ({ id: c.id, nom: c.nom }));
export function dailyBonus(at = Date.now()) {
  const day = new Date(at).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const n = Math.floor(Date.parse(day + 'T00:00:00Z') / 86_400_000);
  const kind = ['artist', 'category', 'playlist'][n % 3];
  const k = Math.floor(n / 3);
  if (kind === 'artist' && BONUS_ARTISTS.length) { const a = BONUS_ARTISTS[(k * 7 + 3) % BONUS_ARTISTS.length]; return { day, kind, value: a, label: a, text: `les sons de ${a}` }; }
  if (kind === 'category' && BONUS_CATS.length) { const c = BONUS_CATS[(k * 5 + 1) % BONUS_CATS.length]; return { day, kind, value: c.id, label: c.nom, text: `la catégorie ${c.nom}` }; }
  return { day, kind: 'playlist', value: '', label: 'Playlists', text: 'les parties avec une playlist' };
}
const bonusApplies = (b, room, round) => b.kind === 'playlist' ? isPlaylist(room.category)
  : b.kind === 'category' ? (room.category === b.value || (room.category === ALL && round.cat === b.value))
  : round.song.artiste === b.value;

// Niveaux de difficulté : les sons les plus écoutés en Facile, les moins connus en HARRR MODE
const LEVELS = [
  { id: 'facile', nom: 'Facile' },
  { id: 'intermediaire', nom: 'Intermédiaire' },
  { id: 'hard', nom: 'HARRR MODE' },
];
const LEVEL_IDS = LEVELS.map((l) => l.id);
const levelName = (id) => LEVELS.find((l) => l.id === id)?.nom || id;

const categoryName = (id) => {
  if (isPlaylist(id)) { const pl = playlistLookup(id.slice(3)); return pl ? `${pl.emoji} ${pl.name}` : 'Playlist'; }
  return id === ALL ? 'Tout mélangé' : CATEGORIES.find((c) => c.id === id)?.nom || id;
};

const INVITE_TTL = 15 * 60_000; // une invitation reste valable 15 min
const invites = new Map(); // identifiant invité (minuscules) -> Map(code -> { from, code, category, at })

export function createBlindtest({ getJson, sameSong, clientIp, sessionUser, findFriend, recordBlindtest, blindtestLeaderboard, markInBlindtest = () => {}, countStat = () => {}, recordListen = () => null, streakOf = null, notifyUser = () => {},
  getPlaylist = () => null, playlistsFor = () => [], isMuted = () => false, demo }) {
  // le contenu des playlists est lu sans vérifier les droits ici : on vérifie à la création du salon et aux réglages
  playlistLookup = (id) => getPlaylist(id, null, true);
  // --- Trouver l'extrait de 30 s (et la pochette) d'une chanson ---
  async function resolveSong(song) {
    const key = song.titre + '|' + song.artiste;
    const cached = previewCache.get(key);
    // les liens d'extraits finissent par expirer : on les redemande au bout de 6 h
    if (cached && Date.now() - cached.at < 6 * 3600_000) return cached;
    if (demo) return { preview: '', cover: '' };
    const check = (t, a, strict) => sameSong(song.titre, song.verifierArtiste ? song.artiste : '', t, a, strict);
    // d'abord le titre exact, sinon un titre proche (ex. « Otto (feat. X) »)
    const pick = (list, ok) => list.find((r) => ok(r, true)) || list.find((r) => ok(r, false));
    let failed = false;
    // iTunes ET Deezer sont interrogés EN MÊME TEMPS (avant, c'était l'un après l'autre : deux fois plus long).
    // On préfère le résultat iTunes s'il arrive avec un extrait, sinon celui de Deezer.
    const itunes = (async () => {
      const p = new URLSearchParams({ term: `${song.titre} ${song.artiste}`, media: 'music', entity: 'song', limit: '15', country: 'FR' });
      const json = await getJson(`https://itunes.apple.com/search?${p}`, 'iTunes');
      const m = pick(json.results || [], (r, strict) => r.previewUrl && check(r.trackName, r.artistName, strict));
      return m ? { preview: m.previewUrl, cover: (m.artworkUrl100 || '').replace('100x100', '300x300') } : null;
    })().catch((err) => { failed = true; console.error('Blind test, iTunes :', err.message); return null; });
    const deezer = (async () => {
      const json = await getJson(`https://api.deezer.com/search?${new URLSearchParams({ q: `${song.titre} ${song.artiste}`, limit: '15' })}`, 'Deezer');
      const m = pick(json.data || [], (r, strict) => r.preview && check(r.title, r.artist?.name, strict));
      return m ? { preview: m.preview, cover: m.album?.cover_medium || '' } : null;
    })().catch((err) => { failed = true; console.error('Blind test, Deezer :', err.message); return null; });
    // dès qu'iTunes répond on s'arrête (Deezer tourne déjà en parallèle en secours)
    let found = await itunes;
    if (!found) found = await deezer;
    const result = { ...(found || { preview: '', cover: '' }), at: Date.now() };
    if (found || !failed) previewCache.set(key, result); // une erreur réseau ne doit pas être gardée
    return result;
  }

  // --- Popularité de chaque son (le « rank » de Deezer : plus il est haut, plus le son est écouté) ---
  const popularity = new Map(); // "titre|artiste" -> nombre (0 = introuvable sur Deezer)
  const songKey = (s) => s.titre + '|' + s.artiste;
  // file d'attente : au maximum ~8 requêtes Deezer par seconde (leur limite est 50 toutes les 5 s)
  let deezerSlot = 0;
  const deezerTurn = () => {
    const now = Date.now();
    deezerSlot = Math.max(deezerSlot, now) + 125;
    return new Promise((r) => setTimeout(r, deezerSlot - 125 - now));
  };
  // une seule demande à la fois par son (sinon la file d'attente Deezer grossit pour rien)
  const popInflight = new Map();
  function fetchPopularity(song) {
    const key = songKey(song);
    if (popularity.has(key)) return Promise.resolve(popularity.get(key));
    if (!popInflight.has(key)) popInflight.set(key, fetchPopularityNow(song).finally(() => popInflight.delete(key)));
    return popInflight.get(key);
  }
  async function fetchPopularityNow(song) {
    const key = songKey(song);
    if (popularity.has(key)) return popularity.get(key);
    if (demo) {
      // en démo : une popularité « au hasard » mais toujours la même pour un son
      let h = 0; for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
      popularity.set(key, h % 1_000_000);
      return popularity.get(key);
    }
    await deezerTurn();
    try {
      const q = song.verifierArtiste ? `artist:"${song.artiste}" track:"${song.titre}"` : `${song.titre} ${song.artiste}`;
      const json = await getJson(`https://api.deezer.com/search?${new URLSearchParams({ q, limit: '25' })}`, 'Deezer');
      const ranks = (json.data || [])
        .filter((r) => sameSong(song.titre, song.verifierArtiste ? song.artiste : '', r.title, r.artist?.name))
        .map((r) => Number(r.rank) || 0);
      popularity.set(key, ranks.length ? Math.max(...ranks) : 0);
    } catch (err) {
      console.error('Popularité Deezer :', err.message); // pas gardé en cache : on réessaiera
      return null;
    }
    return popularity.get(key);
  }

  // Range les sons d'une catégorie en 3 niveaux, par popularité (un niveau écrit à la main dans categories.js passe avant)
  function levelOf(song, catSongs) {
    if (LEVEL_IDS.includes(song.niveau)) return song.niveau;
    const known = catSongs.filter((x) => !LEVEL_IDS.includes(x.niveau) && popularity.has(songKey(x)));
    const mine = popularity.get(songKey(song));
    if (mine === undefined || mine === null) return 'intermediaire';
    if (mine === 0) return 'hard'; // introuvable sur Deezer : forcément peu connu
    const sorted = known.map((x) => popularity.get(songKey(x))).sort((a, b) => b - a);
    const pos = sorted.indexOf(mine) / Math.max(1, sorted.length - 1);
    return pos < 1 / 3 ? 'facile' : pos < 2 / 3 ? 'intermediaire' : 'hard';
  }

  // --- Compléter les artistes : au moins 60 sons chacun (s'ils en ont assez) ---
  // Au démarrage, on demande à Deezer les sons les plus écoutés de chaque artiste qui en a moins de 60.
  // Ce sont de vrais titres, avec leur extrait et leur popularité : rien d'inventé.
  const TARGET_PER_ARTIST = 60;
  const AUTO_FILL = new Set(['rap-fr', 'rap-us', 'pop', 'rnb', 'rock', 'annees-2000']); // pas « Classique » (sur Deezer ce sont les orchestres, pas les compositeurs)
  const simple = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  // titre « de base » : sans (feat. …), [Remix], - Live, etc.
  const baseTitle = (t) => simple(String(t || '').replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, ''));
  const NOT_A_REAL_SONG = /\b(remix|live|instrumental|a ?cappella|acapella|version|edit|interlude|intro|outro|skit|medley|mixed|karaoke|sped up|slowed|nightcore)\b/i;

  async function deezer(url) {
    await deezerTurn();
    return getJson(url, 'Deezer');
  }

  const targetFor = (cat, artiste) => {
    const m = Object.entries(cat.maxParArtiste || {}).find(([k]) => simple(k) === simple(artiste));
    return m ? m[1] : TARGET_PER_ARTIST;
  };

  async function fillArtist(cat, artiste, have) {
    const target = targetFor(cat, artiste);
    // 1) retrouver l'artiste sur Deezer (le nom doit être exactement le même)
    const found = await deezer(`https://api.deezer.com/search/artist?${new URLSearchParams({ q: artiste, limit: '10' })}`);
    const squash = (x) => simple(x).replace(/ /g, ''); // « Supreme Nova » = « Supremenova »
    const byFans = (x, y) => (y.nb_fan || 0) - (x.nb_fan || 0);
    const results = found.data || [];
    // d'abord le nom exact ; sinon un nom à 1 lettre près (ex. « Bedry » / « Bedri »), pour les noms assez longs
    const match = results.filter((a) => squash(a.name) === squash(artiste)).sort(byFans)[0]
      || (squash(artiste).length >= 5 ? results.filter((a) => typo(squash(a.name), squash(artiste)) <= 1).sort(byFans)[0] : null);
    if (!match) { missing.push(artiste); return 0; }
    // 2) ses sons les plus écoutés
    const top = await deezer(`https://api.deezer.com/artist/${match.id}/top?limit=100`);
    if (have === 0) artiste = match.name; // nouvel artiste : on prend son nom exact sur Deezer
    const seen = new Set(cat.chansons.filter((s) => s.artiste === artiste).map((s) => baseTitle(s.titre)));
    let added = 0;
    for (const t of top.data || []) {
      if (have + added >= target) break;
      if (!t.preview || t.artist?.id !== match.id) continue; // seulement ses propres sons (pas ceux où il est en feat.)
      const titre = String(t.title_short || t.title || '').trim();
      if (!titre || titre.length > 60 || NOT_A_REAL_SONG.test(t.title || titre)) continue;
      const key = baseTitle(titre);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const song = { titre, artiste, auto: true };
      cat.chansons.push(song);
      // on garde directement sa popularité (l'extrait, lui, est recherché au moment de jouer : les liens expirent)
      popularity.set(songKey(song), Number(t.rank) || 0);
      added++;
    }
    // artiste avec un grand objectif (> 100) : le « top » de Deezer s'arrête à 100, alors on va chercher aussi ses albums
    if (target > 100 && have + added < target) {
      try {
        const albums = await deezer(`https://api.deezer.com/artist/${match.id}/albums?limit=100`);
        for (const al of albums.data || []) {
          if (have + added >= target) break;
          const tr = await deezer(`https://api.deezer.com/album/${al.id}/tracks?limit=100`);
          for (const t of tr.data || []) {
            if (have + added >= target) break;
            if (!t.preview || t.artist?.id !== match.id) continue;
            const titre = String(t.title_short || t.title || '').trim();
            if (!titre || titre.length > 60 || NOT_A_REAL_SONG.test(t.title || titre)) continue;
            const key = baseTitle(titre);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            const song = { titre, artiste, auto: true };
            cat.chansons.push(song);
            popularity.set(songKey(song), Number(t.rank) || 0);
            added++;
          }
        }
      } catch (err) { console.error(`Blind test, albums de ${artiste} :`, err.message); }
    }
    return added;
  }

  // nombre de lettres à changer pour passer d'un mot à l'autre
  function typo(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  }
  const missing = []; // artistes introuvables sur Deezer (affichés dans les logs)

  async function fillAllArtists() {
    let total = 0;
    for (const cat of CATEGORIES) {
      if (!AUTO_FILL.has(cat.id)) continue;
      const counts = new Map();
      for (const s of cat.chansons) counts.set(s.artiste, (counts.get(s.artiste) || 0) + 1);
      // artistes ajoutés seulement par leur nom (categories.js → artistesAuto) : on part de 0 son
      for (const nom of cat.artistesAuto || []) if (![...counts.keys()].some((k) => simple(k) === simple(nom))) counts.set(nom, 0);
      for (const [artiste, have] of counts) {
        if (have >= targetFor(cat, artiste)) continue;
        try { total += await fillArtist(cat, artiste, have); allArtistsCache = null; }
        catch (err) { console.error(`Blind test, sons de ${artiste} :`, err.message); }
      }
    }
    console.log(`Blind test : ${total} sons ajoutés automatiquement (objectif ${TARGET_PER_ARTIST} par artiste).`);
    if (missing.length) console.log(`Blind test : artistes introuvables sur Deezer : ${missing.join(', ')}`);
  }

  // Au démarrage du serveur : on complète les artistes, puis on récupère la popularité des sons restants
  (async () => {
    if (demo) return;
    await new Promise((r) => setTimeout(r, 5000));
    await fillAllArtists().catch((err) => console.error('Blind test, compléter les artistes :', err.message));
    let n = 0;
    for (const c of CATEGORIES) for (const s of categorySongs(c.id)) if (!popularity.has(songKey(s))) { await fetchPopularity(s); n++; }
    console.log(`Blind test : popularité de ${n} sons récupérée (niveaux prêts).`);
    // On pré-charge les extraits des sons (du plus populaire au moins), par paquets de 10 en parallèle.
    // Ainsi, quand quelqu'un lance une partie, les extraits sont déjà prêts → lancement instantané.
    const allSongs = [...new Map(CATEGORIES.flatMap((c) => categorySongs(c.id)).map((s) => [songKey(s), s])).values()]
      .sort((a, b) => (popularity.get(songKey(b)) || 0) - (popularity.get(songKey(a)) || 0));
    let warm = 0;
    for (let i = 0; i < allSongs.length; i += 10) {
      await Promise.all(allSongs.slice(i, i + 10).map((s) => resolveSong(s).then((r) => { if (r.preview) warm++; }).catch(() => {})));
      await new Promise((r) => setTimeout(r, 300)); // on ménage iTunes et Deezer
    }
    console.log(`Blind test : ${warm} extraits pré-chargés (parties instantanées).`);
  })().catch((err) => console.error('Blind test, popularité :', err.message));

  // --- Préparer les manches : N chansons avec un extrait, + 3 mauvaises réponses chacune ---
  // Prépare la « pioche » d'une partie : tous les sons possibles, dans l'ordre où ils passeront
  async function makeDeck(categoryId, level = 'intermediaire', artists = null) {
    const own = categorySongs(categoryId);
    if (!own) throw new BtError(404, 'Cette playlist n’existe plus.');
    let all = own;
    if (isPlaylist(categoryId)) {
      // pour les mauvaises réponses : les autres sons des mêmes artistes dans tout le site
      const names = new Set(all.map((s) => s.artiste.toLowerCase()));
      const have = new Set(all.map((s) => (s.titre + '|' + s.artiste).toLowerCase()));
      const extra = categorySongs(ALL).filter((s) => names.has(s.artiste.toLowerCase()) && !have.has((s.titre + '|' + s.artiste).toLowerCase()));
      all = [...all, ...extra];
    }
    // seulement les artistes choisis (null = tous)
    if (artists && !artists.length) throw new BtError(400, 'Coche au moins un artiste.');
    const wanted = artists ? new Set(artists) : null;
    const songs = wanted ? own.filter((s) => wanted.has(s.artiste)) : own;
    if (songs.length < 3) throw new BtError(400, 'Pas assez de sons avec ces artistes : coche-en quelques-uns de plus.');
    // popularité manquante (serveur qui vient de démarrer) : on la cherche, mais sans faire attendre les joueurs.
    // Si la plupart des sons sont déjà classés, on démarre tout de suite ; sinon on patiente 1,5 s au maximum.
    // Les sons pas encore classés comptent comme « Intermédiaire » pour cette partie.
    const missing = songs.filter((s) => !popularity.has(songKey(s)));
    if (missing.length) {
      const jobs = shuffle(missing).slice(0, 60).map(fetchPopularity);
      // petite sélection : on patiente un peu (0,8 s max) pour avoir de bons niveaux ; grosse sélection : on démarre tout de suite
      if (songs.length <= 120 && missing.length / songs.length > 0.4) await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 800))]);
    }
    // les niveaux se calculent parmi les sons choisis (par catégorie pour « Tout mélangé »)
    const byCat = new Map();
    for (const s of songs) { if (!byCat.has(s.cat)) byCat.set(s.cat, []); byCat.get(s.cat).push(s); }
    for (const list of byCat.values()) for (const s of list) s.level = levelOf(s, list);
    // les sons du niveau choisi d'abord ; ensuite le niveau le plus proche (utile pour les longues parties)
    const order = { facile: ['facile', 'intermediaire', 'hard'], intermediaire: ['intermediaire', 'facile', 'hard'], hard: ['hard', 'intermediaire', 'facile'] }[level];
    const pool = order.flatMap((lv) => fair(songs.filter((s) => s.level === lv)));
    return { all, songs, pool, pos: 0 };
  }

  // les artistes passent chacun leur tour, pour qu'un artiste avec 100 sons n'écrase pas les autres
  function fair(list) {
    const groups = new Map();
    for (const x of shuffle(list)) { if (!groups.has(x.artiste)) groups.set(x.artiste, []); groups.get(x.artiste).push(x); }
    const queues = shuffle([...groups.values()]);
    const out = [];
    while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
    return out;
  }

  // Une manche : le son + 4 propositions
  function makeRound(deck, song) {
    const { all, songs } = deck;
    // Mauvaises réponses : d'abord d'autres sons DU MÊME ARTISTE (reconnaître la voix ne suffit plus),
    // puis, s'il n'en a pas assez, des sons d'autres artistes (leurs noms sont cachés pendant la manche).
    const tkey = (x) => String(x.titre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const used = new Set([tkey(song)]);
    const take = (list, n) => {
      const out = [];
      for (const x of list) {
        if (out.length >= n) break;
        if (used.has(tkey(x))) continue; // jamais deux titres identiques
        used.add(tkey(x));
        out.push(x);
      }
      return out;
    };
    const others = take(shuffle(all.filter((x) => x.artiste === song.artiste)), 3);
    if (others.length < 3) {
      const source = songs.length >= 4 ? songs : all;
      others.push(...take(fair(source.filter((x) => x.artiste !== song.artiste)), 3 - others.length));
    }
    const options = shuffle([song, ...others]).map((x) => ({ titre: x.titre, artiste: x.artiste }));
    return {
      song: { titre: song.titre, artiste: song.artiste, cover: song.cover || '', level: song.level },
      preview: song.preview || '',
      options,
      correct: options.findIndex((o) => o.titre === song.titre && o.artiste === song.artiste),
      cat: song.cat,
      answers: new Map(), // playerId -> { choice, at, points }
    };
  }

  // Ajoute des manches à la partie jusqu'à en avoir « upto » (on cherche les extraits par paquets de 6)
  async function fillRounds(g, upto) {
    const deck = g.deck;
    // On cherche les extraits par paquets de 8 en parallèle, et on n'attend PAS le plus lent :
    // dès qu'on a assez de manches, on continue (les autres arrivent en arrière-plan).
    while (g.rounds.length < Math.min(upto, g.target) && deck.pos < deck.pool.length) {
      const batch = deck.pool.slice(deck.pos, deck.pos + 8);
      deck.pos += batch.length;
      g.pending = (g.pending || 0) + batch.length;
      await new Promise((done) => {
        let left = batch.length;
        for (const s of batch) {
          resolveSong(s)
            .then((r) => { if ((r.preview || demo) && g.rounds.length < g.target) g.rounds.push(makeRound(deck, { ...s, ...r })); })
            .catch(() => {})
            .finally(() => { left -= 1; g.pending -= 1; if (!left || g.rounds.length >= Math.min(upto, g.target)) done(); });
        }
      });
    }
    if (deck.pos >= deck.pool.length) g.exhausted = true; // plus aucun son à piocher
  }

  // Pendant la partie, on garde toujours quelques manches d'avance (sans bloquer le jeu)
  function topUp(g) {
    if (g.filling || g.exhausted || g.rounds.length >= g.target || g.rounds.length - g.index > 5) return;
    g.filling = fillRounds(g, g.rounds.length + 6)
      .catch((err) => console.error('Blind test, extraits suivants :', err.message))
      .finally(() => { g.filling = null; });
  }

  // La partie est-elle finie ? (nombre de sons atteint, ou plus aucun son disponible)
  const noMoreRounds = (g) => g.index + 1 >= g.rounds.length && (g.rounds.length >= g.target || (g.exhausted && !g.filling && !g.pending));

  // Battle royale : qui est encore en vie
  const alive = (room) => [...room.players.values()].filter((p) => p.out === null);
  // Après chaque son : ceux qui se sont trompés (ou n'ont pas répondu) sont éliminés.
  // Si TOUT LE MONDE s'est trompé, personne n'est éliminé (sinon il n'y aurait pas de gagnant).
  // Avec des vies : une erreur = une vie en moins, plus de vie = éliminé.
  // Un joueur qui ne répond pas 2 fois de suite est éliminé quoi qu'il arrive (sinon la partie ne finit jamais).
  function eliminate(room, round, index) {
    const inGame = alive(room);
    for (const p of inGame) p.missed = round.answers.has(p.id) ? 0 : (p.missed || 0) + 1;
    const losers = inGame.filter((p) => round.answers.get(p.id)?.choice !== round.correct);
    const afk = inGame.filter((p) => p.missed >= 2);
    round.survivedAll = losers.length === inGame.length && !afk.length;
    round.hit = [];
    round.eliminated = [];
    const out = (p) => { p.lives = 0; p.out = index; round.eliminated.push(p.id); };
    if (round.survivedAll) return;
    for (const p of afk) out(p);
    for (const p of losers) {
      if (p.out !== null) continue;
      p.lives = Math.max(0, (p.lives ?? 1) - 1);
      if (p.lives <= 0) out(p); else round.hit.push(p.id);
    }
    // personne ne doit être éliminé « en même temps que tout le monde » : s'il ne reste plus personne, les derniers restent
    if (!alive(room).length) for (const id of round.eliminated) { const p = room.players.get(id); if (p && p.missed < 2) { p.out = null; p.lives = 1; } }
    if (!alive(room).length) for (const id of round.eliminated) { const p = room.players.get(id); if (p) { p.out = null; p.lives = 1; } }
    round.eliminated = round.eliminated.filter((id) => room.players.get(id)?.out !== null);
  }
  // durée d'un son : fixe en normal, de plus en plus court en battle royale
  const roundMs = (room, index) => (room.mode === 'br' ? Math.max(BR_MIN_MS, ROUND_MS - index * BR_STEP_MS) : ROUND_MS);

  function endGame(room) {
    room.phase = 'end';
    recordGame(room);
  }

  // --- Avance la partie selon l'heure (appelé à chaque requête : pas besoin de minuterie) ---
  function tick(room) {
    const g = room.game;
    if (!g || room.phase === 'lobby' || room.phase === 'loading' || room.phase === 'end') return;
    const now = Date.now();
    for (;;) {
      const round = g.rounds[g.index];
      if (room.phase === 'countdown') {
        if (now < g.phaseEnd) return;
        // le 1er son n'est pas encore prêt : on prolonge un peu le compte à rebours (chargement) au lieu de bloquer
        if (!round) {
          if (g.exhausted && !g.filling && !g.pending) { // aucun extrait trouvé : retour au salon
            room.phase = 'lobby'; room.game = null;
            room.error = 'Impossible de charger les extraits. Réessaie, ou choisis d’autres artistes.';
            return;
          }
          topUp(g);
          g.phaseEnd = now + 600; // on repasse vérifier dans un instant
          return;
        }
        room.phase = 'playing';
        g.roundStart = Math.min(g.phaseEnd, now); // si on a attendu le 1er son, il démarre maintenant
        g.phaseEnd = g.roundStart + roundMs(room, g.index);
      } else if (room.phase === 'playing') {
        const inGame = [...room.players.values()].filter((p) => p.out === null);
        const everyone = inGame.length > 0 && inGame.every((p) => round.answers.has(p.id));
        if (now < g.phaseEnd && !everyone) return;
        room.phase = 'reveal';
        if (room.mode === 'br') eliminate(room, round, g.index);
        // badges : chaque son entendu compte pour son artiste
        for (const p of room.players.values()) {
          if (!p.userId) continue;
          const up = recordListen(p.userId, round.song.artiste);
          if (up) (p.newBadges ||= []).push(up);
        }
        const end = Math.min(now, g.phaseEnd);
        g.phaseEnd = end + REVEAL_MS;
      } else if (room.phase === 'reveal') {
        if (now < g.phaseEnd) return;
        if (noMoreRounds(g) || (room.mode === 'br' && alive(room).length <= 1)) { endGame(room); return; }
        if (g.index + 1 >= g.rounds.length) {
          // le son suivant est encore en chargement : on patiente un peu sur la réponse
          topUp(g);
          g.phaseEnd = now + 1000;
          return;
        }
        g.index += 1;
        room.phase = 'playing';
        g.roundStart = Math.max(g.phaseEnd, now - 1000);
        g.phaseEnd = g.roundStart + roundMs(room, g.index);
        topUp(g);
      } else return;
    }
  }

  // Enregistre la partie dans le classement mondial (comptes connectés seulement)
  // Classement de la partie. Battle royale : les survivants d'abord, puis ceux éliminés le plus tard.
  function ranking(room) {
    const list = [...room.players.values()];
    if (room.mode !== 'br') return list.sort((a, b) => b.score - a.score);
    const rank = (p) => (p.out === null ? Infinity : p.out);
    return list.sort((a, b) => rank(b) - rank(a) || b.score - a.score);
  }
  // Les gagnants : meilleur score (classique) ; en battle royale, le meilleur des survivants
  function winners(room) {
    const pool = room.mode === 'br' ? alive(room) : [...room.players.values()];
    const top = Math.max(0, ...pool.map((p) => p.score));
    if (room.mode === 'br') return pool.length === 1 ? pool : pool.filter((p) => p.score === top);
    return top > 0 ? pool.filter((p) => p.score === top) : [];
  }

  function recordGame(room) {
    if (!room.game || room.game.recorded) return;
    room.game.recorded = true;
    const players = [...room.players.values()];
    // une victoire ne compte que s'il y avait au moins 2 joueurs
    const won = players.length >= 2 ? new Set(winners(room).map((p) => p.id)) : new Set();
    for (const p of players) {
      if (!p.userId) continue;
      recordBlindtest(p.userId, { points: p.score, won: won.has(p.id) });
    }
  }

  function getRoom(code) {
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) throw new BtError(404, 'Cette partie n’existe pas (ou plus). Vérifie le code.');
    room.seen = Date.now();
    return room;
  }

  function getPlayer(room, token) {
    const p = [...room.players.values()].find((x) => x.token === token);
    if (!p) throw new BtError(403, 'Tu ne fais pas partie de cette partie. Rejoins-la avec le code.');
    return p;
  }

  function addPlayer(room, name, user) {
    // un compte déjà dans la partie la retrouve (pas de double inscription pour gonfler le classement)
    if (user) {
      const again = [...room.players.values()].find((p) => p.userId === user.id);
      if (again) return again;
    }
    if (room.players.size >= MAX_PLAYERS) throw new BtError(409, `La partie est pleine (${MAX_PLAYERS} joueurs maximum).`);
    let base = user && user.username ? '@' + user.username : cleanName(name).replace(/^@+/, ''); // « @ » réservé aux comptes
    if (!base) throw new BtError(400, 'Choisis un pseudo.');
    let n = base;
    for (let i = 2; [...room.players.values()].some((p) => p.name.toLowerCase() === n.toLowerCase()); i++) n = `${base.slice(0, 17)} ${i}`;
    const p = { id: newToken().slice(0, 10), name: n, token: newToken(), score: 0, out: null, lives: 1, ready: false, userId: user ? user.id : null };
    room.players.set(p.id, p);
    return p;
  }

  // Ce que voit un joueur (jamais la bonne réponse avant la révélation)
  function view(room, me) {
    tick(room);
    const g = room.game;
    const now = Date.now();
    const out = {
      code: room.code,
      phase: room.phase,
      // le chat du salon (40 derniers messages) et les réactions des 6 dernières secondes
      chat: (room.chat || []).slice(-40).map((m) => ({ id: m.id, name: m.name, text: m.text, at: m.at, mine: m.pid === me.id })),
      reacts: (room.reacts || []).filter((r) => now - r.at < 6000).map((r) => ({ id: r.id, emoji: r.emoji, name: r.name, mine: r.pid === me.id })),
      // qui est en train d'écrire dans le chat (sauf soi)
      typing: [...(room.typing || new Map()).entries()].filter(([pid, t]) => pid !== me.id && now - t.at < 3500).map(([, t]) => t.name).slice(0, 4),
      category: room.category,
      categoryName: categoryName(room.category),
      bonus: dailyBonus(),
      rounds: room.roundCount,
      level: room.level,
      artists: room.artists,
      levelName: levelName(room.level),
      hostId: room.hostId,
      me: me.id,
      error: room.error || '',
      serverNow: Date.now(),
      mode: room.mode,
      modeName: MODES.find((m) => m.id === room.mode).nom,
      players: ranking(room).map((p) => ({ id: p.id, name: p.name, score: p.score, out: room.mode === 'br' && p.out !== null, ready: Boolean(p.ready), lives: p.lives ?? 1 })),
      lives: room.lives || 1,
      // l'hôte n'a pas besoin d'être « prêt » : c'est lui qui lance
      allReady: [...room.players.values()].every((p) => p.ready || p.id === room.hostId),
      meOut: room.mode === 'br' && me.out !== null && room.phase !== 'lobby',
    };
    if (!g || room.phase === 'lobby' || room.phase === 'loading') return out;
    out.index = g.index;
    // nombre total de sons : null = mode infini (tant qu'on ne sait pas quand ça s'arrête)
    out.total = g.exhausted && !g.filling ? Math.min(g.rounds.length, g.target) : g.target === Infinity ? null : g.target;
    out.phaseEnd = g.phaseEnd;
    if (room.phase === 'countdown') return out;
    const round = g.rounds[g.index];
    out.roundStart = g.roundStart;
    out.roundMs = roundMs(room, g.index);
    out.preview = round.preview;
    // pendant la manche, on ne montre que les titres : les artistes apparaissent avec la réponse
    out.options = room.phase === 'playing' ? round.options.map((o) => ({ titre: o.titre })) : round.options;
    const mine = round.answers.get(me.id);
    out.myChoice = mine ? mine.choice : null;
    out.answered = round.answers.size;
    if (room.phase === 'reveal' || room.phase === 'end') {
      out.correct = round.correct;
      out.song = round.song;
      out.results = [...round.answers.entries()].map(([id, a]) => ({ name: room.players.get(id)?.name || '?', points: a.points, ok: a.choice === round.correct, x2: !!a.x2 }))
        .sort((a, b) => b.points - a.points);
    }
    if (room.mode === 'br') {
      out.alive = alive(room).length;
      out.nextMs = roundMs(room, g.index + 1);
      if (room.phase === 'reveal' || room.phase === 'end') {
        out.hit = (round.hit || []).map((id) => room.players.get(id)?.name).filter(Boolean);
        out.eliminated = (round.eliminated || []).map((id) => room.players.get(id)?.name).filter(Boolean);
        out.survivedAll = Boolean(round.survivedAll);
      }
    }
    if (room.phase === 'end') {
      out.winners = winners(room).map((p) => p.name);
      out.newBadges = me.newBadges || [];
      if (me.userId && streakOf) out.myStreak = streakOf(me.userId);
    }
    if (room.phase === 'end') out.history = g.rounds.slice(0, g.index + 1).map((r) => r.song);
    return out;
  }

  async function start(room) {
    room.phase = 'loading';
    room.error = '';
    for (const p of room.players.values()) { p.score = 0; p.out = null; p.newBadges = []; p.lives = room.mode === 'br' ? room.lives || 1 : 1; p.missed = 0; p.ready = false; }
    try {
      const deck = await makeDeck(room.category, room.level, room.artists);
      if (room.mode === 'br' && room.players.size < 2) throw new BtError(400, 'Il faut être au moins 2 pour jouer en battle royale. Invite un pote !');
      // en battle royale, on joue jusqu'à ce qu'il ne reste qu'un survivant
      const target = room.mode === 'br' || room.roundCount === INFINITE ? Infinity : room.roundCount;
      // On NE charge PLUS le 1er extrait avant de répondre : le compte à rebours démarre tout de suite,
      // et les premiers sons se chargent pendant ces 4 secondes (voir le garde du compte à rebours dans tick()).
      const g = { rounds: [], deck, target, exhausted: false, filling: null, index: 0, phaseEnd: 0, roundStart: 0 };
      g.phaseEnd = Date.now() + COUNTDOWN_MS;
      room.game = g;
      room.phase = 'countdown';
      countStat('bt_games');
      countStat('bt_players', room.players.size);
      topUp(g); // charge les premiers sons en arrière-plan
    } catch (err) {
      room.phase = 'lobby';
      room.error = err instanceof BtError ? err.message : 'Impossible de lancer la partie pour le moment.';
      console.error('Blind test, lancement :', err.message);
    }
  }

  // --- Limite simple contre les abus ---
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, h] of hits) if (now > h.reset) hits.delete(k);
    for (const [code, r] of rooms) if (now - r.seen > ROOM_TTL) rooms.delete(code);
  }, 60_000).unref();
  function limited(ip, max) {
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || now > h.reset) { h = { count: 0, reset: now + 60_000 }; hits.set(ip, h); }
    h.count += 1;
    return h.count > max;
  }

  async function readBody(req) {
    let raw = '';
    for await (const c of req) {
      raw += c;
      if (raw.length > 5000) throw new BtError(413, 'Requête trop volumineuse.');
    }
    try {
      const d = JSON.parse(raw || '{}');
      if (d && typeof d === 'object' && !Array.isArray(d)) return d;
    } catch { /* plus bas */ }
    throw new BtError(400, 'Requête invalide.');
  }

  const send = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body, atReplacer));
    return true;
  };

  // Routes : /api/bt/categories, /api/bt/rooms, /api/bt/rooms/CODE(/join|/start|/answer|/leave)
  // une catégorie qu'on a le droit de choisir (une playlist : seulement la sienne ou celle d'un ami)
  function usable(req, id) {
    if (!categorySongs(id)) return false;
    if (!isPlaylist(id)) return true;
    const user = sessionUser(req);
    const pl = user && getPlaylist(id.slice(3), user.id);
    if (!pl) throw new BtError(403, 'Tu ne peux jouer que tes playlists ou celles de tes amis.');
    if (pl.songs.length < 4) throw new BtError(400, 'Il faut au moins 4 sons dans la playlist pour jouer.');
    return true;
  }

  // Pour la page de stats de l'admin : ce qui se passe en ce moment
  // pour la console des admins : la liste des salons, et fermer un salon
  handleBlindtest.rooms = () => [...rooms.values()].map((r) => ({ code: r.code, phase: r.phase, mode: r.mode, category: categoryName(r.category), players: [...r.players.values()].map((p) => p.name) }));
  handleBlindtest.closeRoom = (code) => {
    const r = rooms.get(String(code || '').toUpperCase());
    if (!r) return false;
    rooms.delete(r.code);
    return true;
  };
  handleBlindtest.stats = () => {
    const list = [...rooms.values()];
    return {
      rooms: list.length,
      players: list.reduce((n, r) => n + r.players.size, 0),
      playing: list.filter((r) => ['countdown', 'playing', 'reveal'].includes(r.phase)).length,
      battleRoyale: list.filter((r) => r.mode === 'br' && ['countdown', 'playing', 'reveal'].includes(r.phase)).length,
    };
  };
  return handleBlindtest;
  async function handleBlindtest(req, res, url) {
    if (!url.pathname.startsWith('/api/bt/')) return false;
    try {
      const ip = clientIp(req);
      const parts = url.pathname.split('/').filter(Boolean).slice(2); // après "api/bt"

      if (parts[0] === 'categories' && req.method === 'GET') {
        const user = sessionUser(req);
        // les playlists jouables (les miennes + celles de mes amis), avec au moins 4 sons
        const pls = user ? playlistsFor(user.id).filter((p) => p.count >= 4).map((p) => ({
          id: 'pl:' + p.id, nom: `${p.emoji} ${p.name}`, count: p.count, playlist: true, mine: p.mine, owner: p.owner, artists: categoryArtists('pl:' + p.id),
        })) : [];
        return send(res, 200, {
          categories: [...CATEGORIES.map((c) => ({ id: c.id, nom: c.nom, count: c.chansons.length, artists: categoryArtists(c.id) })),
            { id: ALL, nom: 'Tout mélangé', count: CATEGORIES.reduce((n, c) => n + c.chansons.length, 0), artists: allArtists() }, ...pls],
          bonus: dailyBonus(),
          rounds: ROUND_CHOICES,
          maxRounds: MAX_ROUNDS,
          levels: LEVELS,
          reactions: REACTIONS,
          modes: MODES,
          lives: LIVES,
        });
      }

      // Recherche de sons pour créer une playlist (catalogue iTunes)
      if (parts[0] === 'search' && req.method === 'GET') {
        const q = String(url.searchParams.get('q') || '').trim().slice(0, 80);
        if (q.length < 2) return send(res, 200, { results: [] });
        if (limited('search:' + clientIp(req), 60)) throw new BtError(429, 'Trop de recherches, attends une minute.');
        if (demo) {
          return send(res, 200, { results: Array.from({ length: 8 }, (_, i) => ({ titre: `${q} ${i + 1}`, artiste: ['SCH', 'Drake', 'Makala', 'Josman'][i % 4], cover: '', preview: '' })) });
        }
        const p = new URLSearchParams({ term: q, country: 'FR', media: 'music', entity: 'song', limit: '20' });
        const json = await getJson(`https://itunes.apple.com/search?${p}`, 'iTunes');
        const seen = new Set();
        const results = [];
        for (const r of json.results || []) {
          if (!r.trackName || !r.artistName) continue;
          const titre = String(r.trackName).replace(/\s*\((?:feat|ft)\.?[^)]*\)/i, '').trim();
          const key = (titre + '|' + r.artistName).toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          results.push({ titre, artiste: r.artistName, cover: String(r.artworkUrl100 || '').replace('100x100bb', '200x200bb'), preview: r.previewUrl || '' });
        }
        return send(res, 200, { results: results.slice(0, 15) });
      }

      // Classement mondial
      if (parts[0] === 'leaderboard' && req.method === 'GET') {
        const user = sessionUser(req);
        return send(res, 200, { ...blindtestLeaderboard(user ? user.id : null, 50), loggedIn: Boolean(user) });
      }

      // Invitations reçues par la personne connectée
      if (parts[0] === 'invites') {
        const user = sessionUser(req);
        if (!user) return send(res, 200, { invites: [] });
        const mine = invites.get(user.username.toLowerCase()) || new Map();
        if (req.method === 'POST' && parts[1] === 'decline') {
          const body = await readBody(req);
          mine.delete(String(body.code || '').toUpperCase());
          return send(res, 200, { ok: true });
        }
        if (req.method !== 'GET') throw new BtError(405, 'Méthode non autorisée.');
        const now = Date.now();
        for (const [code, inv] of mine) {
          const r = rooms.get(code);
          // invitation périmée, partie disparue ou déjà lancée : on l'oublie
          if (now - inv.at > INVITE_TTL || !r || (r.phase !== 'lobby' && r.phase !== 'end')) mine.delete(code);
        }
        return send(res, 200, { invites: [...mine.values()].map((i) => ({ from: i.from, code: i.code, category: categoryName(rooms.get(i.code).category) + ', ' + levelName(rooms.get(i.code).level) })) });
      }

      if (parts[0] !== 'rooms') throw new BtError(404, 'Introuvable.');

      // Créer une partie
      if (parts.length === 1 && req.method === 'POST') {
        if (limited('creer:' + ip, 10)) throw new BtError(429, 'Trop de parties créées, attends une minute.');
        if (rooms.size >= MAX_ROOMS) throw new BtError(503, 'Trop de parties en cours, réessaie plus tard.');
        const body = await readBody(req);
        const category = usable(req, body.category) ? body.category : 'rap-fr';
        const roundCount = parseRounds(body.rounds) ?? 10;
        const level = LEVEL_IDS.includes(body.level) ? body.level : 'intermediaire';
        const mode = MODE_IDS.includes(body.mode) ? body.mode : 'classique';
        const artists = cleanArtists(category, body.artists);
        let code;
        do code = newCode(); while (rooms.has(code));
        const lives = LIVES.includes(Number(body.lives)) ? Number(body.lives) : 1;
        const room = { code, phase: 'lobby', category, roundCount, level, mode, lives, artists, players: new Map(), hostId: '', game: null, seen: Date.now(), error: '', chat: [], reacts: [], seq: 0 };
        const host = addPlayer(room, body.name, sessionUser(req));
        room.hostId = host.id;
        rooms.set(code, room);
        return send(res, 201, { code, token: host.token, playerId: host.id });
      }

      const room = getRoom(parts[1]);
      const action = parts[2] || '';

      if (req.method === 'GET' && action === '') {
        const me = getPlayer(room, url.searchParams.get('token'));
        if (me.userId) markInBlindtest(me.userId); // ses amis voient « En blind test »
        return send(res, 200, view(room, me));
      }
      if (req.method !== 'POST') throw new BtError(405, 'Méthode non autorisée.');
      if (limited('jeu:' + ip, 240)) throw new BtError(429, 'Doucement ! Réessaie dans une minute.');
      const body = await readBody(req);

      if (action === 'join') {
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie a déjà commencé. Attends la prochaine !');
        const p = addPlayer(room, body.name, sessionUser(req));
        return send(res, 200, { code: room.code, token: p.token, playerId: p.id });
      }

      const me = getPlayer(room, body.token);

      if (action === 'invite') { // inviter un ami du site (il faut être connecté et amis)
        const user = sessionUser(req);
        if (!user) throw new BtError(401, 'Connecte-toi sur Star Song pour inviter tes amis.');
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie a déjà commencé.');
        const friend = findFriend(user.id, body.username);
        if (!friend) throw new BtError(403, 'Tu ne peux inviter que tes amis.');
        if (limited('inv:' + user.id, 30)) throw new BtError(429, 'Trop d’invitations, attends une minute.');
        const key = friend.username.toLowerCase();
        if (!invites.has(key)) invites.set(key, new Map());
        invites.get(key).set(room.code, { from: user.username, code: room.code, at: Date.now() });
        notifyUser(friend.id, 'inv', { title: `@${user.username} t’invite à un blind test`, body: 'Rejoins la partie avant qu’elle commence !', url: '/blindtest?room=' + room.code, tag: 'inv:' + room.code });
        return send(res, 200, { ok: true, invited: friend.username });
      }

      if (action === 'settings') { // l'hôte change la catégorie ou le nombre de manches
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut changer les réglages.');
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie est en cours.');
        if (usable(req, body.category) && body.category !== room.category) { room.category = body.category; room.artists = null; }
        if ('artists' in body) room.artists = cleanArtists(room.category, body.artists);
        if ('rounds' in body && parseRounds(body.rounds) !== null) room.roundCount = parseRounds(body.rounds);
        if (LEVEL_IDS.includes(body.level)) room.level = body.level;
        if (MODE_IDS.includes(body.mode)) room.mode = body.mode;
        if (LIVES.includes(Number(body.lives))) room.lives = Number(body.lives);
        if (room.phase === 'end') room.phase = 'lobby';
        return send(res, 200, view(room, me));
      }

      if (action === 'start') {
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut lancer la partie.');
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie est déjà lancée.');
        if (room.mode === 'br' && room.players.size < 2) throw new BtError(400, 'Il faut être au moins 2 pour jouer en battle royale. Invite un pote !');
        // tout le monde doit avoir cliqué sur « Je suis prêt »
        const waiting = [...room.players.values()].filter((p) => !p.ready && p.id !== room.hostId);
        if (waiting.length) throw new BtError(409, `Tout le monde doit être prêt. Pas encore prêt${waiting.length > 1 ? 's' : ''} : ${waiting.map((p) => p.name).join(', ')}.`);
        start(room); // continue en arrière-plan : les joueurs voient « chargement »
        return send(res, 202, view(room, me));
      }

      if (action === 'rematch') { // revanche : l'hôte relance tout de suite, mêmes réglages, tout le monde est prêt
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut lancer la revanche.');
        if (room.phase !== 'end') throw new BtError(409, 'La revanche se lance à la fin d’une partie.');
        if (room.mode === 'br' && room.players.size < 2) throw new BtError(400, 'Il faut être au moins 2 pour jouer en battle royale. Invite un pote !');
        for (const p of room.players.values()) p.ready = true;
        room.chat.push({ id: ++room.seq, pid: '', name: '🔁', text: `${me.name} lance la revanche !`, at: Date.now() });
        start(room);
        return send(res, 202, view(room, me));
      }

      if (action === 'ready') { // « Je suis prêt » (ou plus prêt)
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie est déjà lancée.');
        if (room.phase === 'end') room.phase = 'lobby';
        me.ready = body.ready !== false;
        return send(res, 200, view(room, me));
      }

      if (action === 'forfeit') { // « Terminer la partie » : on quitte la partie en cours, ses points sont annulés
        tick(room);
        me.score = 0;
        for (const r of room.game ? room.game.rounds : []) { const a = r.answers.get(me.id); if (a) a.points = 0; }
        room.players.delete(me.id);
        room.typing?.delete(me.id);
        if (!room.players.size) { rooms.delete(room.code); return send(res, 200, { ok: true }); }
        if (room.hostId === me.id) room.hostId = room.players.keys().next().value;
        // en battle royale, s'il ne reste qu'un survivant, il gagne tout de suite
        if (room.mode === 'br' && ['countdown', 'playing', 'reveal'].includes(room.phase) && alive(room).length <= 1) endGame(room);
        if (['countdown', 'playing', 'reveal'].includes(room.phase) && room.players.size) {
          room.chat.push({ id: ++room.seq, pid: '', name: '🏳️', text: `${me.name} a quitté la partie.`, at: Date.now() });
        }
        return send(res, 200, { ok: true });
      }

      if (action === 'stop') { // l'hôte arrête la partie (utile en mode infini)
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut arrêter la partie.');
        tick(room);
        if (!room.game || !['countdown', 'playing', 'reveal'].includes(room.phase)) throw new BtError(409, 'Aucune partie en cours.');
        if (room.phase === 'countdown') { room.phase = 'lobby'; room.game = null; return send(res, 200, view(room, me)); }
        endGame(room);
        return send(res, 200, view(room, me));
      }

      if (action === 'chat') { // message dans le chat du salon
        const text = String(body.text || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
        if (!text) throw new BtError(400, 'Écris un message.');
        if (me.userId && isMuted(me.userId)) throw new BtError(403, 'Un admin t’a mis en sourdine : tu ne peux pas écrire pour le moment.');
        if (limited('chat:' + me.id, 20)) throw new BtError(429, 'Doucement sur le chat !');
        tick(room);
        // pas de spoil : pendant une manche, on refuse un message qui contient la réponse
        if (room.phase === 'playing') {
          const flat = (x) => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
          const answer = flat(room.game.rounds[room.game.index].song.titre);
          if (answer.length >= 3 && flat(text).includes(answer)) throw new BtError(400, 'Pas de spoil pendant la manche ! 🤫');
        }
        room.chat.push({ id: ++room.seq, pid: me.id, name: me.name, text, at: Date.now() });
        room.typing?.delete(me.id);
        if (room.chat.length > 80) room.chat.splice(0, room.chat.length - 80);
        return send(res, 200, view(room, me));
      }

      if (action === 'typing') { // « … est en train d'écrire »
        if (limited('typing:' + me.id, 40)) return send(res, 200, { ok: true });
        if (!room.typing) room.typing = new Map();
        room.typing.set(me.id, { name: me.name, at: Date.now() });
        return send(res, 200, { ok: true });
      }

      if (action === 'react') { // réaction emoji animée
        const emoji = String(body.emoji || '');
        if (!REACTIONS.includes(emoji)) throw new BtError(400, 'Réaction inconnue.');
        if (limited('react:' + me.id, 40)) throw new BtError(429, 'Doucement sur les réactions !');
        const now = Date.now();
        room.reacts = room.reacts.filter((r) => now - r.at < 6000);
        if (room.reacts.filter((r) => r.pid === me.id && now - r.at < 1500).length >= 4) throw new BtError(429, 'Doucement sur les réactions !');
        room.reacts.push({ id: ++room.seq, pid: me.id, name: me.name, emoji, at: now });
        return send(res, 200, view(room, me));
      }

      if (action === 'answer') {
        tick(room);
        if (room.phase !== 'playing') throw new BtError(409, 'Trop tard pour cette manche !');
        const g = room.game;
        if (Number(body.index) !== g.index) throw new BtError(409, 'Trop tard pour cette manche !');
        const round = g.rounds[g.index];
        if (round.answers.has(me.id)) throw new BtError(409, 'Tu as déjà répondu.');
        if (me.out !== null) throw new BtError(409, 'Tu es éliminé : regarde les autres finir la partie.');
        const choice = Number(body.choice);
        if (!Number.isInteger(choice) || choice < 0 || choice >= round.options.length) throw new BtError(400, 'Réponse invalide.');
        const elapsed = Math.max(0, Date.now() - g.roundStart);
        // bonne réponse : 500 points + jusqu'à 500 de bonus selon la rapidité
        const base = choice === round.correct ? 500 + Math.round(500 * Math.max(0, 1 - elapsed / roundMs(room, g.index))) : 0;
        const x2 = base > 0 && bonusApplies(dailyBonus(), room, round);
        const points = x2 ? base * 2 : base; // bonus du jour
        round.answers.set(me.id, { choice, at: elapsed, points, x2 });
        me.score += points;
        return send(res, 200, view(room, me));
      }

      if (action === 'leave') {
        room.players.delete(me.id);
        if (!room.players.size) rooms.delete(room.code);
        else if (room.hostId === me.id) room.hostId = room.players.keys().next().value; // un autre joueur devient l'hôte
        return send(res, 200, { ok: true });
      }

      throw new BtError(404, 'Introuvable.');
    } catch (err) {
      if (err instanceof BtError) return send(res, err.status, { error: err.message });
      console.error('Blind test :', err.message);
      return send(res, 500, { error: 'Erreur du serveur.' });
    }
  };
}
