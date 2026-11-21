// Statistiques du site : une fenêtre visible SEULEMENT par l'admin (ADMIN_USERNAME sur Render).
// Le serveur vérifie aussi : sans être admin, /api/admin/stats répond « Introuvable ».
(() => {
  const css = `
  .adm-btn { min-height: 2.3rem; padding: .3rem .8rem; font-size: .93rem; display: inline-flex; align-items: center; gap: .4rem; }
  .adm-btn svg { width: 1rem; height: 1rem; }
  dialog.adm { width: min(60rem, calc(100vw - 1.2rem)); max-height: calc(100dvh - 1.2rem); overflow: auto; }
  .adm-in { padding: 1.3rem 1.4rem 1.6rem; }
  .adm-head { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
  .adm-head h2 { margin: 0; font: 900 1.9rem/1 var(--texte); font-stretch: 62%; text-transform: uppercase; }
  .adm-head .adm-when { color: var(--gris); font-size: .85rem; }
  .adm-head .adm-actions { margin-left: auto; display: flex; gap: .5rem; }
  .adm-head button { min-height: 2.2rem; padding: .2rem .8rem; font-size: .9rem; }
  .adm-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: .7rem; }
  .adm-tile { padding: .8rem .9rem .75rem; background: #141317; border-left: 3px solid var(--orange); }
  .adm-tile .n { font: 900 2.2rem/1 var(--texte); font-stretch: 62%; font-variant-numeric: tabular-nums; }
  .adm-tile .l { margin-top: .3rem; font-size: .86rem; color: var(--blanc); }
  .adm-tile .s { margin-top: .15rem; font-size: .78rem; color: var(--gris); }
  .adm h3 { margin: 1.8rem 0 .7rem; font: 900 1.25rem/1 var(--texte); font-stretch: 65%; text-transform: uppercase; }
  .adm-tabs { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .8rem; }
  .adm-tabs button { min-height: 2rem; padding: .15rem .7rem; font-size: .85rem; }
  .adm-tabs button[aria-checked="true"] { background: var(--orange); color: #1b1b22; border-color: var(--orange); }
  .adm-chart { position: relative; }
  .adm-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
  .adm-chart .grid { stroke: #2c2b31; stroke-width: 1; }
  .adm-chart .axis { fill: var(--gris); font: 500 11px var(--texte); }
  .adm-chart .bar { fill: var(--orange); pointer-events: none; }
  .adm-chart .bar.zero { fill: #3a3940; }
  .adm-chart .hit { fill: transparent; cursor: default; }
  .adm-chart .bar.hl { fill: #ffb15c; }
  .adm-tip { position: absolute; pointer-events: none; transform: translate(-50%, -110%); padding: .35rem .55rem; background: #0d0c0f; border: 1px solid var(--ligne); font-size: .8rem; white-space: nowrap; }
  .adm-tip b { font-variant-numeric: tabular-nums; }
  .adm-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0 2rem; }
  .adm table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  .adm td, .adm th { padding: .4rem .2rem; border-top: 1px solid var(--ligne); text-align: left; }
  .adm th { color: var(--gris); font-weight: 600; font-size: .8rem; }
  .adm td.r, .adm th.r { text-align: right; font-variant-numeric: tabular-nums; }
  .adm .muted { color: var(--gris); }
  .adm-err { color: var(--danger, #ff8a7a); }
  .adm-notify { margin-top: .4rem; padding: 1rem; border-radius: 16px; background: #141317; }
  .adm-notify h3 { margin-top: 0 !important; }
  .adm-nf { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem 1rem; align-items: end; }
  .adm-nf label { display: grid; gap: .3rem; font-size: .82rem; color: var(--gris); margin: 0; }
  .adm-nf label:nth-of-type(3) { grid-column: 1 / -1; }
  .adm-nf input, .adm-nf textarea, .adm-nf select { width: 100%; min-height: 2.5rem; padding: .45rem .7rem; border: 1px solid var(--ligne); border-radius: 10px; background: #0b0b0c; color: var(--blanc); font: 500 .92rem var(--texte); resize: vertical; }
  .adm-nf input:focus, .adm-nf textarea:focus, .adm-nf select:focus { outline: none; border-color: var(--orange); }
  .adm-nf button { justify-self: start; }
  .adm-nf-out { grid-column: 1 / -1; margin: 0; font-size: .85rem; color: var(--gris); }
  .adm-nf-out.ok { color: #6fdc8c; } .adm-nf-out.err { color: var(--danger, #ff8a7a); }
  @media (max-width: 560px) { .adm-nf { grid-template-columns: 1fr; } }
  .adm details summary { cursor: pointer; color: var(--gris); font-size: .85rem; margin-top: .6rem; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const nf = new Intl.NumberFormat('fr-FR');
  const n = (x) => nf.format(x || 0);
  const date = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const ago = (sec) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h} h ${m} min` : `${m} min`; };

  let dialog, body, metric = 'searches', data = null, timer = null;

  function build() {
    dialog = $('dialog', 'adm');
    dialog.setAttribute('aria-labelledby', 'admTitle');
    dialog.setAttribute('data-notranslate', '');
    const inner = $('div', 'adm-in');
    const head = $('div', 'adm-head');
    const h = $('h2', '', 'Stats du site'); h.id = 'admTitle';
    const when = $('span', 'adm-when');
    const actions = $('div', 'adm-actions');
    const refresh = $('button', 'ghost', 'Actualiser'); refresh.type = 'button'; refresh.onclick = load;
    const close = $('button', '', 'Fermer'); close.type = 'button'; close.onclick = () => dialog.close();
    actions.append(refresh, close);
    head.append(h, when, actions);
    body = $('div');
    inner.append(head, body);
    dialog.append(inner);
    dialog.addEventListener('close', () => { clearInterval(timer); timer = null; });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.body.append(dialog);
  }

  async function load() {
    try {
      const r = await fetch('/api/admin/stats', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status === 404 ? 'Accès réservé à l’admin.' : 'Erreur ' + r.status);
      data = await r.json();
      render();
    } catch (err) {
      body.replaceChildren($('p', 'adm-err', err.message));
    }
  }

  function tile(num, label, sub) {
    const t = $('div', 'adm-tile');
    t.append($('div', 'n', num), $('div', 'l', label));
    if (sub) t.append($('div', 's', sub));
    return t;
  }

  function table(head, rows) {
    const t = $('table');
    const tr = $('tr');
    head.forEach(([label, right]) => tr.append($('th', right ? 'r' : '', label)));
    t.append(tr);
    for (const row of rows) {
      const r = $('tr');
      row.forEach((v, i) => r.append($('td', head[i][1] ? 'r' : '', v)));
      t.append(r);
    }
    return t;
  }

  // Histogramme des 30 derniers jours (une seule mesure à la fois, survol = valeur exacte)
  const METRICS = [['searches', 'Recherches'], ['visits', 'Visites'], ['signups', 'Comptes créés'], ['games', 'Parties de blind test']];
  function chart() {
    const box = $('div');
    const tabs = $('div', 'adm-tabs');
    tabs.setAttribute('role', 'radiogroup');
    for (const [id, label] of METRICS) {
      const b = $('button', id === metric ? 'on' : '', label);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(id === metric));
      b.onclick = () => { metric = id; render(); };
      tabs.append(b);
    }
    const wrap = $('div', 'adm-chart');
    const days = data.days;
    const vals = days.map((d) => d[metric]);
    const max = Math.max(1, ...vals);
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    let top = Math.ceil(max / step) * step;
    if ((top / 2) % 1) top += step; // des graduations rondes (pas de « 3,5 »)
    const W = Math.max(300, Math.round(body.clientWidth || 600)), H = 180, L = 30, B = 20, T = 6; // taille réelle : le texte ne rétrécit pas sur téléphone
    const bw = (W - L) / days.length;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('role', 'img');
    const label = METRICS.find((m) => m[0] === metric)[1];
    svg.setAttribute('aria-label', `${label} par jour sur 30 jours, maximum ${max}`);
    const el = (name, attrs) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    for (const v of [0, top / 2, top]) {
      svg.append(el('line', { class: 'grid', x1: L, x2: W, y1: y(v), y2: y(v) }));
      const t = el('text', { class: 'axis', x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = n(v); svg.append(t);
    }
    const tip = $('div', 'adm-tip'); tip.hidden = true;
    days.forEach((d, i) => {
      const v = d[metric];
      const x = L + i * bw + 1;
      const w = Math.max(1, bw - 2); // 2 px d'écart entre les barres
      const h = Math.max(v ? 2 : 1, H - B - y(v));
      const hit = el('rect', { class: 'hit', x: L + i * bw, y: T, width: bw, height: H - B - T });
      const bar = el('rect', { class: 'bar' + (v ? '' : ' zero'), x, y: H - B - h, width: w, height: h, rx: Math.min(4, w / 2) });
      const show = () => {
        bar.classList.add('hl');
        tip.hidden = false;
        tip.replaceChildren($('span', '', new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + ' : '), $('b', '', n(v)));
        const rect = svg.getBoundingClientRect();
        const half = tip.offsetWidth / 2;
        tip.style.left = Math.min(rect.width - half, Math.max(half, ((x + w / 2) / W) * rect.width)) + 'px';
        tip.style.top = ((H - B - h) / H) * rect.height + 'px';
      };
      const hide = () => { bar.classList.remove('hl'); tip.hidden = true; };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('mouseleave', hide);
      hit.addEventListener('touchstart', show, { passive: true });
      svg.append(hit, bar);
      if ((days.length - 1 - i) % 7 === 0) { // une date par semaine, en partant d'aujourd'hui
        const t = el('text', { class: 'axis', x: x + w / 2, y: H - 5, 'text-anchor': 'middle' });
        t.textContent = new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        svg.append(t);
      }
    });
    wrap.append(svg, tip);
    // la même chose en tableau, pour lire les chiffres exacts
    const det = $('details');
    det.append($('summary', '', 'Voir les chiffres jour par jour'),
      table([['Jour'], ['Recherches', 1], ['Visites', 1], ['Comptes', 1], ['Parties', 1]],
        [...days].reverse().map((d) => [date(d.date), n(d.searches), n(d.visits), n(d.signups), n(d.games)])));
    box.append(tabs, wrap, det);
    return box;
  }

  // Envoyer une notification à la personne de son choix
  let draft = { username: '', title: '', body: '', url: '/' };
  function notifyForm(d) {
    const box = $('section', 'adm-notify');
    box.append($('h3', '', 'Envoyer une notification'));
    const f = $('form', 'adm-nf');
    const field = (label, input) => { const l = $('label', ''); l.append($('span', '', label), input); return l; };
    const who = $('input'); who.required = true; who.placeholder = 'Identifiant'; who.value = draft.username; who.setAttribute('list', 'admUsers'); who.autocomplete = 'off';
    const dl = $('datalist'); dl.id = 'admUsers';
    for (const u of d.recent || []) { const o = $('option'); o.value = u.username; dl.append(o); }
    const title = $('input'); title.maxLength = 80; title.placeholder = 'Titre (ex : Nouveau défi !)'; title.value = draft.title;
    const msg = $('textarea'); msg.required = true; msg.maxLength = 300; msg.rows = 3; msg.placeholder = 'Ton message'; msg.value = draft.body;
    const link = $('select');
    for (const [v, t] of [['/', 'Accueil'], ['/blindtest', 'Blind test'], ['/?amis=1', 'Fenêtre Amis'], ['/?notifs=1', 'Réglages des notifications']]) { const o = $('option', '', t); o.value = v; if (v === draft.url) o.selected = true; link.append(o); }
    const send = $('button', '', 'Envoyer'); send.type = 'submit';
    const out = $('p', 'adm-nf-out'); out.setAttribute('role', 'status');
    const keep = () => { draft = { username: who.value, title: title.value, body: msg.value, url: link.value }; };
    for (const x of [who, title, msg, link]) x.addEventListener('input', keep);
    f.append(field('À qui', who), dl, field('Titre', title), field('Message', msg), field('En cliquant, ouvrir', link), send, out);
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); keep();
      send.disabled = true; out.className = 'adm-nf-out'; out.textContent = 'Envoi…';
      try {
        const r = await fetch('/api/admin/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Erreur ' + r.status);
        out.className = 'adm-nf-out ok';
        out.textContent = j.devices
          ? `Envoyé à ${j.username} : sur son téléphone (${j.devices} appareil${j.devices > 1 ? 's' : ''}) et sur le site.`
          : `Envoyé à ${j.username}. Ses notifications téléphone ne sont pas activées : il le verra sur le site à sa prochaine visite.`;
        draft = { username: '', title: '', body: '', url: '/' };
        who.value = ''; title.value = ''; msg.value = '';
      } catch (err) { out.className = 'adm-nf-out err'; out.textContent = err.message; }
      finally { send.disabled = false; }
    });
    box.append(f);
    return box;
  }

  function render() {
    const d = data;
    dialog.querySelector('.adm-when').textContent = 'mis à jour à ' + new Date(d.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const a = d.accounts, act = d.activity, bt = d.blindtest, live = d.live || {};
    const tiles = $('div', 'adm-tiles');
    tiles.append(
      tile(n(a.total), 'Comptes créés', `+${n(a.today)} aujourd’hui · +${n(a.week)} en 7 jours`),
      tile(n(a.online), 'En ligne maintenant', `${n(a.inBlindtest)} en blind test`),
      tile(n(act.searches.total), 'Recherches', `${n(act.searches.today)} aujourd’hui · ${n(act.searches.week)} en 7 jours`),
      tile(n(act.visitors.today), 'Visiteurs aujourd’hui', `${n(act.visits.today)} pages vues`),
      tile(n(bt.games.total), 'Parties de blind test', `${n(bt.games.today)} aujourd’hui · ${n(live.playing)} en cours`),
      tile(n(a.activeWeek), 'Comptes actifs', 'venus ces 7 derniers jours'),
    );

    const h3 = (t) => $('h3', '', t);
    const cols = $('div', 'adm-cols');
    const left = $('div'), right = $('div');
    left.append(h3('Derniers comptes'),
      a.total ? table([['Identifiant'], ['Créé le', 1]], d.recent.map((u) => [u.username, date(u.createdAt)])) : $('p', 'muted', 'Aucun compte pour l’instant.'));
    right.append(h3('Top blind test'),
      bt.top.length ? table([['Joueur'], ['Points', 1], ['Parties', 1], ['Victoires', 1]], bt.top.map((u) => [u.username, n(u.points), n(u.games), n(u.wins)]))
        : $('p', 'muted', 'Personne n’a encore joué avec un compte.'));
    cols.append(left, right);

    const cols2 = $('div', 'adm-cols');
    const l2 = $('div'), r2 = $('div');
    l2.append(h3('Activité'), table([['Quoi'], ['Total', 1], ['Aujourd’hui', 1], ['7 jours', 1]], [
      ['Recherches', act.searches], ['Paroles ouvertes', act.lyrics], ['Pages vues', act.visits], ['Visiteurs uniques', act.visitors],
      ['Clics Spotify', act.spotify], ['Clics Deezer', act.deezer], ['Connexions', act.logins], ['Messages envoyés', act.messages || { total: 0, today: 0, week: 0 }], ['Parties de blind test', bt.games], ['Joueurs (toutes parties)', bt.players],
    ].map(([k, c]) => [k, n(c.total), n(c.today), n(c.week)])));
    r2.append(h3('Comptes et amis'), table([['Quoi'], ['Nombre', 1]], [
      ['Comptes au total', n(a.total)], ['Créés ces 30 jours', n(a.month)], ['Avec une photo de profil', n(a.withAvatar)], ['Avec une bio', n(a.withBio)],
      ['Amitiés', n(a.friendships)], ['Demandes d’ami en attente', n(a.pending)], ['Sessions ouvertes', n(a.sessions)],
      ['Comptes qui ont joué au blind test', n(bt.accountsPlayed)], ['Points de blind test distribués', n(bt.totalPoints)],
    ]));
    cols2.append(l2, r2);

    const cols3 = $('div', 'adm-cols');
    const l3 = $('div'), r3 = $('div');
    l3.append(h3('Sons du blind test'), table([['Catégorie'], ['Artistes', 1], ['Sons', 1]],
      (d.songs || []).map((c) => [c.nom, n(c.artists), n(c.count)])));
    const s = d.server || {};
    r3.append(h3('Serveur'), table([['Quoi'], ['Valeur', 1]], [
      ['En ligne depuis', s.uptimeSec !== undefined ? ago(s.uptimeSec) : '—'],
      ['Mémoire utilisée', s.memoryMb !== undefined ? `${s.memoryMb} Mo` : '—'],
      ['Salons de blind test ouverts', n(live.rooms)], ['Joueurs dans un salon', n(live.players)], ['Battle royale en cours', n(live.battleRoyale)],
      ['Stats comptées depuis le', date(d.since)],
    ]));
    cols3.append(l3, r3);

    body.replaceChildren(tiles, notifyForm(d), h3('30 derniers jours'), chart(), cols, cols2, cols3);
  }

  function open() {
    if (!dialog) build();
    if (!dialog.open) dialog.showModal();
    body.replaceChildren($('p', 'muted', 'Chargement…'));
    load();
    clearInterval(timer);
    // mise à jour toute seule, sauf pendant qu'on écrit une notification
    timer = setInterval(() => { if (document.visibilityState === 'visible' && !document.activeElement?.closest('.adm-nf')) load(); }, 30_000);
  }

  // Le bouton n'apparaît que si le serveur dit que tu es l'admin
  fetch('/api/me').then((r) => r.json()).then((d) => {
    if (!d.user || !d.user.admin) return;
    const account = document.getElementById('account');
    if (!account) return;
    const b = $('button', 'ghost adm-btn');
    b.type = 'button';
    b.setAttribute('data-notranslate', '');
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 14V8M6 14V4M10 14V9M14 14V2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg>';
    b.append(document.createTextNode('Stats'));
    b.title = 'Statistiques du site';
    b.onclick = open;
    account.prepend(b);
  }).catch(() => {});
})();
