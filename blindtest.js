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
  if (id === ALL) return CATEGORIES.flatMap((c) => c.chansons.map((s) => ({ ...s, verifierArtiste: c.verifierArtiste !== false })));
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? c.chansons.map((s) => ({ ...s, verifierArtiste: c.verifierArtiste !== false })) : null;
}
const categoryName = (id) => (id === ALL ? 'Tout mélangé' : CATEGORIES.find((c) => c.id === id)?.nom || id);

export function createBlindtest({ getJson, sameSong, clientIp, demo }) {
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

  // --- Préparer les manches : N chansons avec un extrait, + 3 mauvaises réponses chacune ---
  async function buildRounds(categoryId, count) {
    const songs = categorySongs(categoryId);
    const pool = shuffle(songs);
    const picked = [];
    // on cherche les extraits par petits paquets, jusqu'à en avoir assez
    for (let i = 0; i < pool.length && picked.length < count; i += 6) {
      const batch = pool.slice(i, i + 6);
      const res = await Promise.all(batch.map(async (s) => ({ s, r: await resolveSong(s) })));
      for (const { s, r } of res) if ((r.preview || demo) && picked.length < count) picked.push({ ...s, ...r });
    }
    if (picked.length < Math.min(count, 3)) throw new BtError(502, 'Impossible de charger assez d’extraits pour cette catégorie. Réessaie dans un instant.');
    return picked.map((song) => {
      const others = shuffle(songs.filter((x) => x.titre !== song.titre || x.artiste !== song.artiste)).slice(0, 3);
      const options = shuffle([song, ...others]).map((x) => ({ titre: x.titre, artiste: x.artiste }));
      return {
        song: { titre: song.titre, artiste: song.artiste, cover: song.cover || '' },
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
          return;
        }
        g.index += 1;
        room.phase = 'playing';
        g.roundStart = g.phaseEnd;
        g.phaseEnd = g.roundStart + ROUND_MS;
      } else return;
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

  function addPlayer(room, name) {
    if (room.players.size >= MAX_PLAYERS) throw new BtError(409, `La partie est pleine (${MAX_PLAYERS} joueurs maximum).`);
    let base = cleanName(name);
    if (!base) throw new BtError(400, 'Choisis un pseudo.');
    let n = base;
    for (let i = 2; [...room.players.values()].some((p) => p.name.toLowerCase() === n.toLowerCase()); i++) n = `${base.slice(0, 17)} ${i}`;
    const p = { id: newToken().slice(0, 10), name: n, token: newToken(), score: 0 };
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
    out.options = round.options;
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
      const rounds = await buildRounds(room.category, room.roundCount);
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
          categories: [...CATEGORIES.map((c) => ({ id: c.id, nom: c.nom, count: c.chansons.length })),
            { id: ALL, nom: 'Tout mélangé', count: CATEGORIES.reduce((n, c) => n + c.chansons.length, 0) }],
          rounds: ROUND_CHOICES,
        });
      }

      if (parts[0] !== 'rooms') throw new BtError(404, 'Introuvable.');

      // Créer une partie
      if (parts.length === 1 && req.method === 'POST') {
        if (limited(ip, 10)) throw new BtError(429, 'Trop de parties créées, attends une minute.');
        if (rooms.size >= MAX_ROOMS) throw new BtError(503, 'Trop de parties en cours, réessaie plus tard.');
        const body = await readBody(req);
        const category = categorySongs(body.category) ? body.category : 'rap-fr';
        const roundCount = ROUND_CHOICES.includes(Number(body.rounds)) ? Number(body.rounds) : 10;
        let code;
        do code = newCode(); while (rooms.has(code));
        const room = { code, phase: 'lobby', category, roundCount, players: new Map(), hostId: '', game: null, seen: Date.now(), error: '' };
        const host = addPlayer(room, body.name);
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
      if (limited(ip, 240)) throw new BtError(429, 'Doucement ! Réessaie dans une minute.');
      const body = await readBody(req);

      if (action === 'join') {
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie a déjà commencé. Attends la prochaine !');
        const p = addPlayer(room, body.name);
        return send(res, 200, { code: room.code, token: p.token, playerId: p.id });
      }

      const me = getPlayer(room, body.token);

      if (action === 'settings') { // l'hôte change la catégorie ou le nombre de manches
        if (me.id !== room.hostId) throw new BtError(403, 'Seul l’hôte peut changer les réglages.');
        if (room.phase !== 'lobby' && room.phase !== 'end') throw new BtError(409, 'La partie est en cours.');
        if (categorySongs(body.category)) room.category = body.category;
        if (ROUND_CHOICES.includes(Number(body.rounds))) room.roundCount = Number(body.rounds);
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
