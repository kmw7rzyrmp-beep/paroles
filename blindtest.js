// Blind test entre amis : salons avec un code, manches de 20 s, 4 propositions, points selon la rapidité.
// Les parties sont gardées en mémoire (elles n'ont pas besoin de survivre à un redémarrage).
import { randomBytes, randomInt } from 'node:crypto';
import { CATEGORIES } from './categories.js';

const ROUND_MS = 20_000;      // durée pour répondre
const REVEAL_MS = 6_000;      // affichage de la bonne réponse
const COUNTDOWN_MS = 4_000;   // compte à rebours avant la 1re manche
const MAX_ROOMS = 300;
const MAX_PLAYERS = 12;
const ROOM_TTL = 2 * 3600_000; // un salon inactif disparaît au bout de 2 h
const ROUND_CHOICES = [5, 10, 15];
const ALL = 'tout';

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
const cleanName = (v) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 20);

function categorySongs(id) {
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
// Garde seulement les artistes qui existent dans la catégorie.
// null = tous les artistes ; [] = aucun (la partie ne pourra pas démarrer)
function cleanArtists(id, list) {
  if (!Array.isArray(list)) return null;
  const valid = new Set(categoryArtists(id).map((a) => a.nom));
  const picked = [...new Set(list.filter((a) => typeof a === 'string' && valid.has(a)))];
  return picked.length === valid.size ? null : picked;
}

// Niveaux de difficulté : les sons les plus écoutés en Facile, les moins connus en HARRR MODE
const LEVELS = [
  { id: 'facile', nom: 'Facile' },
  { id: 'intermediaire', nom: 'Intermédiaire' },
  { id: 'hard', nom: 'HARRR MODE' },
];
const LEVEL_IDS = LEVELS.map((l) => l.id);
const levelName = (id) => LEVELS.find((l) => l.id === id)?.nom || id;

const categoryName = (id) => (id === ALL ? 'Tout mélangé' : CATEGORIES.find((c) => c.id === id)?.nom || id);

const INVITE_TTL = 15 * 60_000; // une invitation reste valable 15 min
const invites = new Map(); // identifiant invité (minuscules) -> Map(code -> { from, code, category, at })

export function createBlindtest({ getJson, sameSong, clientIp, sessionUser, findFriend, recordBlindtest, blindtestLeaderboard, demo }) {
  // --- Trouver l'extrait de 30 s (et la pochette) d'une chanson ---
  async function resolveSong(song) {
    const key = song.titre + '|' + song.artiste;
    if (previewCache.has(key)) return previewCache.get(key);
    if (demo) return { preview: '', cover: '' };
    const check = (t, a) => sameSong(song.titre, song.verifierArtiste ? song.artiste : '', t, a);
    let found = null;
    let failed = false;
    try {
      const p = new URLSearchParams({ term: `${song.titre} ${song.artiste}`, media: 'music', entity: 'song', limit: '15', country: 'FR' });
      const json = await getJson(`https://itunes.apple.com/search?${p}`, 'iTunes');
      const m = (json.results || []).find((r) => r.previewUrl && check(r.trackName, r.artistName));
      if (m) found = { preview: m.previewUrl, cover: (m.artworkUrl100 || '').replace('100x100', '300x300') };
    } catch (err) { failed = true; console.error('Blind test, iTunes :', err.message); }
    if (!found) {
      try {
        const json = await getJson(`https://api.deezer.com/search?${new URLSearchParams({ q: `${song.titre} ${song.artiste}`, limit: '15' })}`, 'Deezer');
        const m = (json.data || []).find((r) => r.preview && check(r.title, r.artist?.name));
        if (m) found = { preview: m.preview, cover: m.album?.cover_medium || '' };
      } catch (err) { failed = true; console.error('Blind test, Deezer :', err.message); }
    }
    const result = found || { preview: '', cover: '' };
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
  async function fetchPopularity(song) {
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

  // Au démarrage du serveur, on récupère tranquillement la popularité de tous les sons
  (async () => {
    if (demo) return;
    await new Promise((r) => setTimeout(r, 5000));
    let n = 0;
    for (const c of CATEGORIES) for (const s of categorySongs(c.id)) if (!popularity.has(songKey(s))) { await fetchPopularity(s); n++; }
    console.log(`Blind test : popularité de ${n} sons récupérée (niveaux prêts).`);
  })().catch((err) => console.error('Blind test, popularité :', err.message));

  // --- Préparer les manches : N chansons avec un extrait, + 3 mauvaises réponses chacune ---
  async function buildRounds(categoryId, count, level = 'intermediaire', artists = null) {
    const all = categorySongs(categoryId);
    // seulement les artistes choisis (null = tous)
    if (artists && !artists.length) throw new BtError(400, 'Coche au moins un artiste.');
    const wanted = artists ? new Set(artists) : null;
    const songs = wanted ? all.filter((s) => wanted.has(s.artiste)) : all;
    if (songs.length < 3) throw new BtError(400, 'Pas assez de sons avec ces artistes : coche-en quelques-uns de plus.');
    // popularité manquante (serveur qui vient de démarrer) : on la cherche maintenant
    // (on attend 6 s au maximum : les sons pas encore classés comptent comme « Intermédiaire » pour cette partie)
    await Promise.race([
      Promise.all(songs.filter((s) => !popularity.has(songKey(s))).map(fetchPopularity)),
      new Promise((r) => setTimeout(r, 6000)),
    ]);
    // les niveaux se calculent parmi les sons choisis (par catégorie pour « Tout mélangé »)
    const byCat = new Map();
    for (const s of songs) { if (!byCat.has(s.cat)) byCat.set(s.cat, []); byCat.get(s.cat).push(s); }
    for (const list of byCat.values()) for (const s of list) s.level = levelOf(s, list);
    // les sons du niveau choisi d'abord ; s'il n'y en a pas assez, on complète avec le niveau le plus proche
    const order = { facile: ['facile', 'intermediaire', 'hard'], intermediaire: ['intermediaire', 'facile', 'hard'], hard: ['hard', 'intermediaire', 'facile'] }[level];
    // les artistes passent chacun leur tour, pour qu'un artiste avec 100 sons n'écrase pas les autres
    const fair = (list) => {
      const groups = new Map();
      for (const x of shuffle(list)) { if (!groups.has(x.artiste)) groups.set(x.artiste, []); groups.get(x.artiste).push(x); }
      const queues = shuffle([...groups.values()]);
      const out = [];
      while (queues.some((q) => q.length)) for (const q of queues) if (q.length) out.push(q.shift());
      return out;
    };
    const pool = order.flatMap((lv) => fair(songs.filter((s) => s.level === lv)));
    const picked = [];
    // on cherche les extraits par petits paquets, jusqu'à en avoir assez
    for (let i = 0; i < pool.length && picked.length < count; i += 6) {
      const batch = pool.slice(i, i + 6);
      const res = await Promise.all(batch.map(async (s) => ({ s, r: await resolveSong(s) })));
      for (const { s, r } of res) if ((r.preview || demo) && picked.length < count) picked.push({ ...s, ...r });
    }
    if (picked.length < Math.min(count, 3)) throw new BtError(502, 'Impossible de charger assez d’extraits avec ces artistes. Ajoute des artistes ou réessaie dans un instant.');
    return picked.map((song) => {
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
        answers: new Map(), // playerId -> { choice, at, points }
      };
    });
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
        room.phase = 'playing';
        g.roundStart = g.phaseEnd;
        g.phaseEnd = g.roundStart + ROUND_MS;
      } else if (room.phase === 'playing') {
        const everyone = room.players.size > 0 && [...room.players.keys()].every((id) => round.answers.has(id));
        if (now < g.phaseEnd && !everyone) return;
        room.phase = 'reveal';
        const end = Math.min(now, g.phaseEnd);
        g.phaseEnd = end + REVEAL_MS;
      } else if (room.phase === 'reveal') {
        if (now < g.phaseEnd) return;
        if (g.index + 1 >= g.rounds.length) {
          room.phase = 'end';
          recordGame(room);
          return;
        }
        g.index += 1;
        room.phase = 'playing';
        g.roundStart = g.phaseEnd;
        g.phaseEnd = g.roundStart + ROUND_MS;
      } else return;
    }
  }

  // Enregistre la partie dans le classement mondial (comptes connectés seulement)
  function recordGame(room) {
    if (!room.game || room.game.recorded) return;
    room.game.recorded = true;
    const players = [...room.players.values()];
    const top = Math.max(0, ...players.map((p) => p.score));
    // une victoire ne compte que s'il y avait au moins 2 joueurs et un score
    const multi = players.length >= 2;
    for (const p of players) {
      if (!p.userId) continue;
      recordBlindtest(p.userId, { points: p.score, won: multi && top > 0 && p.score === top });
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
    let base = cleanName(name);
    if (!base) throw new BtError(400, 'Choisis un pseudo.');
    let n = base;
    for (let i = 2; [...room.players.values()].some((p) => p.name.toLowerCase() === n.toLowerCase()); i++) n = `${base.slice(0, 17)} ${i}`;
    const p = { id: newToken().slice(0, 10), name: n, token: newToken(), score: 0, userId: user ? user.id : null };
    room.players.set(p.id, p);
    return p;
  }

  // Ce que voit un joueur (jamais la bonne réponse avant la révélation)
  function view(room, me) {
    tick(room);
    const g = room.game;
    const out = {
      code: room.code,
      phase: room.phase,
      category: room.category,
      categoryName: categoryName(room.category),
      rounds: room.roundCount,
      level: room.level,
      artists: room.artists,
      levelName: levelName(room.level),
      hostId: room.hostId,
      me: me.id,
      error: room.error || '',
      serverNow: Date.now(),
      players: [...room.players.values()].map((p) => ({ id: p.id, name: p.name, score: p.score })).sort((a, b) => b.score - a.score),
    };
    if (!g || room.phase === 'lobby' || room.phase === 'loading') return out;
    out.index = g.index;
    out.total = g.rounds.length;
    out.phaseEnd = g.phaseEnd;
    if (room.phase === 'countdown') return out;
    const round = g.rounds[g.index];
    out.roundStart = g.roundStart;
    out.roundMs = ROUND_MS;
    out.preview = round.preview;
    // pendant la manche, on ne montre que les titres : les artistes apparaissent avec la réponse
    out.options = room.phase === 'playing' ? round.options.map((o) => ({ titre: o.titre })) : round.options;
    const mine = round.answers.get(me.id);
    out.myChoice = mine ? mine.choice : null;
    out.answered = round.answers.size;
    if (room.phase === 'reveal' || room.phase === 'end') {
      out.correct = round.correct;
      out.song = round.song;
      out.results = [...round.answers.entries()].map(([id, a]) => ({ name: room.players.get(id)?.name || '?', points: a.points, ok: a.choice === round.correct }))
        .sort((a, b) => b.points - a.points);
    }
    if (room.phase === 'end') out.history = g.rounds.map((r) => r.song);
    return out;
  }

  async function start(room) {
    room.phase = 'loading';
    room.error = '';
    for (const p of room.players.values()) p.score = 0;
    try {
      const rounds = await buildRounds(room.category, room.roundCount, room.level, room.artists);
      room.game = { rounds, index: 0, phaseEnd: Date.now() + COUNTDOWN_MS, roundStart: 0 };
      room.phase = 'countdown';
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
    res.end(JSON.stringify(body));
    return true;
  };

  // Routes : /api/bt/categories, /api/bt/rooms, /api/bt/rooms/CODE(/join|/start|/answer|/leave)
  return async function handleBlindtest(req, res, url) {
    if (!url.pathname.startsWith('/api/bt/')) return false;
    try {
      const ip = clientIp(req);
      const parts = url.pathname.split('/').filter(Boolean).slice(2); // après "api/bt"

      if (parts[0] === 'categories' && req.method === 'GET') {
        return send(res, 200, {
          categories: [...CATEGORIES.map((c) => ({ id: c.id, nom: c.nom, count: c.chansons.length, artists: categoryArtists(c.id) })),
            { id: ALL, nom: 'Tout mélangé', count: CATEGORIES.reduce((n, c) => n + c.chansons.length, 0) }],
          rounds: ROUND_CHOICES,
          levels: LEVELS,
        });
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
        const category = categorySongs(body.category) ? body.category : 'rap-fr';
        const roundCount = ROUND_CHOICES.includes(Number(body.rounds)) ? Number(body.rounds) : 10;
        const level = LEVEL_IDS.includes(body.level) ? body.level : 'intermediaire';
        const artists = cleanArtists(category, body.artists);
        let code;
        do code = newCode(); while (rooms.has(code));
        const room = { code, phase: 'lobby', category, roundCount, level, artists, players: new Map(), hostId: '', game: null, seen: Date.now(), error: '' };
        const host = addPlayer(room, body.name, sessionUser(req));
        room.hostId = host.id;
        rooms.set(code, room);
        return send(res, 201, { code, token: host.token, playerId: host.id });
      }

      const room = getRoom(parts[1]);
      const action = parts[2] || '';

      if (req.method === 'GET' && action === '') {
        const me = getPlayer(room, url.searchParams.get('token'));
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
        return send(res, 200, { ok: true, invited: friend.username });
      }

      if (action === 'settings') { // l'hôte change la catégorie ou le nombre de manches
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut changer les réglages.');
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie est en cours.');
        if (categorySongs(body.category) && body.category !== room.category) { room.category = body.category; room.artists = null; }
        if ('artists' in body) room.artists = cleanArtists(room.category, body.artists);
        if (ROUND_CHOICES.includes(Number(body.rounds))) room.roundCount = Number(body.rounds);
        if (LEVEL_IDS.includes(body.level)) room.level = body.level;
        if (room.phase === 'end') room.phase = 'lobby';
        return send(res, 200, view(room, me));
      }

      if (action === 'start') {
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut lancer la partie.');
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie est déjà lancée.');
        start(room); // continue en arrière-plan : les joueurs voient « chargement »
        return send(res, 202, view(room, me));
      }

      if (action === 'answer') {
        tick(room);
        if (room.phase !== 'playing') throw new BtError(409, 'Trop tard pour cette manche !');
        const g = room.game;
        if (Number(body.index) !== g.index) throw new BtError(409, 'Trop tard pour cette manche !');
        const round = g.rounds[g.index];
        if (round.answers.has(me.id)) throw new BtError(409, 'Tu as déjà répondu.');
        const choice = Number(body.choice);
        if (!Number.isInteger(choice) || choice < 0 || choice >= round.options.length) throw new BtError(400, 'Réponse invalide.');
        const elapsed = Math.max(0, Date.now() - g.roundStart);
        // bonne réponse : 500 points + jusqu'à 500 de bonus selon la rapidité
        const points = choice === round.correct ? 500 + Math.round(500 * Math.max(0, 1 - elapsed / ROUND_MS)) : 0;
        round.answers.set(me.id, { choice, at: elapsed, points });
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
