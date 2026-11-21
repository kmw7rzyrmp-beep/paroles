// La page « Classement » : podium animé, plusieurs classements (points, victoires, flammes, record, badges),
// Monde ou Mes amis, ta place et combien il te manque pour monter.
(() => {
  const page = document.getElementById('pageRanking');
  if (!page) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nf = new Intl.NumberFormat('fr-FR');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  const css = `
  .rk-hero { position: relative; overflow: hidden; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1.2rem; align-items: end;
    padding: 2rem 2.2rem; margin: 0 0 1.4rem; border-radius: var(--r-xl); background: radial-gradient(120% 140% at 100% 0%, #ff9b6b 0%, var(--orange) 40%, #c8401f 100%); color: #fff; }
  .rk-hero::before { content: "🏆"; position: absolute; right: 1.2rem; top: -1.2rem; font-size: 9rem; opacity: .16; transform: rotate(12deg); }
  .rk-hero h1 { margin: 0; font: 800 clamp(2.2rem, 5vw, 3.4rem)/1 var(--texte); letter-spacing: -.04em; }
  .rk-hero p { margin: .5rem 0 0; color: rgba(255,255,255,.88); max-width: 30rem; }
  .rk-hero .page-eyebrow { color: rgba(255,255,255,.9); }
  .rk-scope { display: inline-flex; padding: .25rem; border-radius: 999px; background: rgba(0,0,0,.22); position: relative; z-index: 1; }
  .rk-scope button { min-height: 2.3rem; padding: 0 1.1rem; background: transparent; color: #fff; font-size: .85rem; }
  .rk-scope button[aria-pressed="true"] { background: #fff; color: #0b0b0c; }
  .rk-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .8rem; margin: 0 0 1.4rem; }
  .rk-stat { padding: 1rem 1.1rem; border-radius: 18px; background: var(--coque); }
  .rk-stat b { display: block; font: 800 1.7rem/1 var(--texte); letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .rk-stat span { display: block; margin-top: .35rem; color: var(--gris); font-size: .8rem; }
  .rk-tabs { display: flex; gap: .45rem; flex-wrap: wrap; margin: 0 0 1.2rem; position: relative; }
  .rk-tab { min-height: 2.6rem; padding: .2rem 1rem; background: var(--coque-hi); color: var(--blanc); font-size: .88rem; }
  .rk-tab .e { font-size: 1rem; }
  .rk-tab[aria-selected="true"] { background: var(--blanc); color: #0b0b0c; }
  .rk-hint { margin: -.5rem 0 1.2rem; color: var(--gris); font-size: .85rem; }

  /* podium */
  .rk-podium { display: grid; grid-template-columns: 1fr 1.15fr 1fr; align-items: end; gap: .8rem; padding: 2.2rem 1rem 0; margin: 0 0 1.4rem; border-radius: 26px;
    background: radial-gradient(60% 80% at 50% 100%, rgba(242, 107, 58, .25), transparent 70%), var(--coque); overflow: hidden; position: relative; }
  .rk-spot { display: flex; flex-direction: column; align-items: center; gap: .45rem; min-width: 0; cursor: pointer; }
  .rk-spot.empty { cursor: default; opacity: .35; }
  .rk-av { position: relative; width: 4.2rem; height: 4.2rem; border-radius: 22px; display: grid; place-items: center; background: var(--coque-hi); font: 800 1.5rem var(--texte);
    overflow: visible; box-shadow: 0 0 0 3px var(--ring, #3a3a3f), 0 12px 26px rgba(0,0,0,.5); transition: transform .3s cubic-bezier(.2, 1.4, .4, 1); }
  .rk-av img { width: 100%; height: 100%; object-fit: cover; border-radius: 22px; }
  .rk-spot:hover .rk-av { transform: translateY(-4px) scale(1.04); }
  .rk-spot.p1 .rk-av { width: 5.4rem; height: 5.4rem; border-radius: 28px; --ring: #ffd34d; }
  .rk-spot.p1 .rk-av img { border-radius: 28px; }
  .rk-spot.p2 .rk-av { --ring: #d8d8e0; } .rk-spot.p3 .rk-av { --ring: #e08a4c; }
  .rk-spot.p1 .rk-av::before { content: "👑"; position: absolute; top: -1.9rem; left: 50%; font-size: 1.9rem; transform: translateX(-50%) rotate(-8deg); animation: crownFloat 2.6s ease-in-out infinite; }
  @keyframes crownFloat { 50% { transform: translateX(-50%) translateY(-5px) rotate(6deg); } }
  .rk-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; font-size: .95rem; }
  .rk-val { color: var(--gris); font-size: .8rem; font-variant-numeric: tabular-nums; }
  .rk-step { width: 100%; margin-top: .3rem; display: grid; place-items: start center; padding-top: .7rem; border-radius: 16px 16px 0 0; font: 800 2.2rem/1 var(--texte); color: rgba(255,255,255,.9);
    height: var(--h); transform-origin: bottom; animation: stepUp .9s cubic-bezier(.2, .9, .3, 1.15) both; }
  .p1 .rk-step { --h: 9.5rem; background: linear-gradient(180deg, #ffd34d, #c99a12); animation-delay: .25s; color: #3b2b00; }
  .p2 .rk-step { --h: 7rem; background: linear-gradient(180deg, #e6e6ee, #8f8f99); animation-delay: .1s; color: #2a2a30; }
  .p3 .rk-step { --h: 5.6rem; background: linear-gradient(180deg, #f2a066, #a3521d); animation-delay: .4s; color: #3a1a05; }
  @keyframes stepUp { from { transform: scaleY(0); } }
  .rk-spark { position: absolute; width: 6px; height: 6px; border-radius: 2px; top: -10px; opacity: 0; animation: spark 3.2s linear infinite; }
  @keyframes spark { 0% { opacity: 0; transform: translateY(0) rotate(0); } 10% { opacity: 1; } 100% { opacity: 0; transform: translateY(19rem) rotate(540deg); } }

  /* colonnes : la liste + ta place */
  .rk-cols { display: grid; grid-template-columns: minmax(0, 1fr) 19rem; gap: 1.4rem; align-items: start; }
  @media (max-width: 1180px) { .rk-cols { grid-template-columns: 1fr; } }
  .rk-search { width: 100%; min-height: 2.8rem; margin: 0 0 .8rem; padding: 0 1rem; border: 1px solid var(--ligne); border-radius: 999px; background: #0b0b0c; color: var(--blanc); font: 500 .92rem var(--texte); }
  .rk-search:focus { outline: none; border-color: var(--orange); }
  .rk-list { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
  .rk-row { display: grid; grid-template-columns: 2.4rem 2.6rem minmax(0, 1fr) auto; align-items: center; gap: .8rem; padding: .6rem .9rem; border-radius: 16px; background: var(--coque);
    cursor: pointer; position: relative; overflow: hidden; transition: background .2s, transform .2s; }
  .rk-row:hover { background: #18181b; transform: translateX(3px); }
  .rk-row.anim { animation: rowIn .45s cubic-bezier(.2, .9, .3, 1) both; animation-delay: calc(var(--i) * 28ms); }
  @keyframes rowIn { from { opacity: 0; transform: translateY(10px); } }
  .rk-row .bar { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: linear-gradient(90deg, rgba(242, 107, 58, .14), transparent); transition: width 1s cubic-bezier(.2, .9, .3, 1); pointer-events: none; }
  .rk-row > *:not(.bar) { position: relative; }
  .rk-row .n { color: var(--gris); font-weight: 700; text-align: center; font-variant-numeric: tabular-nums; }
  .rk-row .a { width: 2.6rem; height: 2.6rem; border-radius: 12px; display: grid; place-items: center; background: var(--coque-hi); font-weight: 700; overflow: hidden; }
  .rk-row .a img { width: 100%; height: 100%; object-fit: cover; }
  .rk-row .w { min-width: 0; }
  .rk-row .w b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
  .rk-row .w span { display: block; color: var(--gris); font-size: .78rem; }
  .rk-row .v { font: 800 1.05rem var(--texte); font-variant-numeric: tabular-nums; text-align: right; }
  .rk-row .v small { display: block; color: var(--gris); font: 500 .7rem var(--texte); }
  .rk-row.me { box-shadow: inset 0 0 0 2px var(--orange); }
  .rk-row.friend .w b::after { content: "ami"; margin-left: .45rem; padding: .05rem .4rem; border-radius: 6px; background: rgba(63, 191, 106, .16); color: #6fdc8c; font-size: .68rem; vertical-align: .1em; }
  .rk-empty { padding: 2.6rem 1rem; text-align: center; color: var(--gris); border-radius: 22px; background: var(--coque); }
  .rk-empty b { display: block; color: var(--blanc); font-size: 1.05rem; margin-bottom: .3rem; }

  .rk-me { position: sticky; top: 1rem; padding: 1.3rem; border-radius: 22px; background: linear-gradient(180deg, #1f1f22, #121214); display: flex; flex-direction: column; align-items: flex-start; gap: .9rem; }
  .rk-me > * { margin: 0; } .rk-me .rk-prog, .rk-me .rk-tips { align-self: stretch; }
  .rk-me h3 { margin: 0; font: 600 .9rem var(--texte); color: var(--gris); }
  .rk-me .big { font: 800 3rem/1 var(--texte); letter-spacing: -.04em; }
  .rk-me .big small { font-size: 1rem; color: var(--gris); font-weight: 600; margin-left: .3rem; }
  .rk-me .rk-topchip { width: auto; height: auto; display: inline-block; padding: .2rem .6rem; border-radius: 999px; background: rgba(242, 107, 58, .16); color: var(--jaune); font-size: .8rem; font-weight: 700; }
  .rk-me .goal { font-size: .88rem; color: var(--blanc); }
  .rk-me .goal b { color: var(--orange); }
  .rk-prog { height: 8px; border-radius: 4px; background: var(--ligne); overflow: hidden; }
  .rk-prog i { display: block; height: 100%; width: 0; border-radius: 4px; background: linear-gradient(90deg, var(--orange), #ffd34d); transition: width 1.2s cubic-bezier(.2, .9, .3, 1); }
  .rk-me .cta { justify-self: start; background: var(--orange); color: #fff; text-decoration: none; display: inline-flex; align-items: center; min-height: 2.6rem; padding: 0 1.2rem; border-radius: 999px; font-weight: 600; }
  .rk-tips { margin: 0; padding: 0; list-style: none; display: grid; gap: .45rem; font-size: .82rem; color: var(--gris); }
  .rk-tips li::before { content: "→ "; color: var(--orange); }
  @media (max-width: 760px) {
    .rk-hero { grid-template-columns: 1fr; padding: 1.6rem 1.3rem; }
    .rk-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .rk-podium { padding: 2rem .4rem 0; gap: .4rem; }
    .rk-av { width: 3.3rem; height: 3.3rem; } .rk-spot.p1 .rk-av { width: 4.2rem; height: 4.2rem; }
    .p1 .rk-step { --h: 7.5rem; } .p2 .rk-step { --h: 5.6rem; } .p3 .rk-step { --h: 4.4rem; }
    .rk-me { position: static; }
  }
  @media (prefers-reduced-motion: reduce) { .rk-step, .rk-row.anim, .rk-spark, .rk-spot.p1 .rk-av::before { animation: none !important; } }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);

  const BOARDS = [
    { id: 'points', e: '🏆', label: 'Points', unit: 'points', hint: 'Tous les points gagnés au blind test, depuis toujours.' },
    { id: 'wins', e: '👑', label: 'Victoires', unit: 'victoires', hint: 'Les parties gagnées à au moins 2 joueurs.' },
    { id: 'streak', e: '🔥', label: 'Flammes', unit: 'jours', hint: 'La série en cours : un blind test ou une recherche par jour.' },
    { id: 'best', e: '⚡', label: 'Record', unit: 'pts en 1 partie', hint: 'Le meilleur score fait en une seule partie.' },
    { id: 'badges', e: '🏅', label: 'Badges', unit: 'badges', hint: 'Le nombre d’artistes avec au moins le badge Bronze.' },
    { id: 'time', e: '⏱️', label: 'Temps sur le site', unit: '', hint: 'Le temps passé sur Star Song, pages ouvertes (paroles, blind test, messages…).', fmt: (m) => dur(m) },
  ];
  // 125 minutes -> « 2 h 05 »
  function dur(m) {
    m = Math.max(0, Math.round(m));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), r = m % 60;
    if (h < 24) return `${h} h ${String(r).padStart(2, '0')}`;
    const d = Math.floor(h / 24);
    return `${d} j ${h % 24} h`;
  }
  const show = (def, v) => (def.fmt ? def.fmt(v) : `${nf.format(v)} ${def.unit}`);
  let data = null, board = 'points', scope = 'monde', query = '';
  const at = (u) => (String(u).startsWith('@') ? u : '@' + u);
  const initial = (u) => String(u).replace(/^@/, '').slice(0, 1).toUpperCase();

  function countUp(node, to) {
    if (reduce) { node.textContent = nf.format(to); return; }
    const t0 = performance.now(), dur = 1100;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); node.textContent = nf.format(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const avatar = (r, cls) => {
    const a = el('span', cls);
    if (r && r.avatarUrl) { const i = el('img'); i.src = r.avatarUrl; i.alt = ''; i.loading = 'lazy'; a.append(i); } else a.textContent = r ? initial(r.username) : '?';
    a.setAttribute('aria-hidden', 'true');
    return a;
  };
  const openProfile = (r) => window.openProfile && window.openProfile(r.username);

  function build() {
    page.replaceChildren();
    const hero = el('div', 'rk-hero');
    const left = el('div');
    left.append(el('p', 'page-eyebrow', 'Hall of fame'));
    const h = el('h1', '', 'Classement'); h.id = 'rkTitle';
    left.append(h, el('p', '', 'Qui connaît le mieux ses sons ? Grimpe en jouant au blind test, garde ta flamme allumée et collectionne les badges.'));
    const sc = el('div', 'rk-scope'); sc.setAttribute('role', 'group'); sc.setAttribute('aria-label', 'Qui afficher');
    for (const [id, label] of [['monde', '🌍 Monde'], ['amis', '🤝 Mes amis']]) {
      const b = el('button', '', label); b.type = 'button'; b.dataset.scope = id;
      b.onclick = () => { scope = id; paint(true); };
      sc.append(b);
    }
    hero.append(left, sc);
    const back = el('div', 'page-head');
    const bb = el('button', 'ghost page-back'); bb.type = 'button'; bb.setAttribute('data-page-close', ''); bb.setAttribute('aria-label', 'Retour');
    bb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="pb-lbl">Retour</span>';
    back.append(bb);
    back.style.margin = '0 0 .8rem';
    const stats = el('div', 'rk-stats');
    const tabs = el('div', 'rk-tabs'); tabs.setAttribute('role', 'tablist');
    for (const b of BOARDS) {
      const t = el('button', 'rk-tab'); t.type = 'button'; t.setAttribute('role', 'tab'); t.dataset.board = b.id;
      t.append(el('span', 'e', b.e), document.createTextNode(' ' + b.label));
      t.onclick = () => { board = b.id; paint(true); };
      tabs.append(t);
    }
    const hint = el('p', 'rk-hint');
    const podium = el('div', 'rk-podium');
    const cols = el('div', 'rk-cols');
    const listCol = el('div');
    const search = el('input', 'rk-search'); search.type = 'search'; search.placeholder = 'Chercher un joueur'; search.setAttribute('aria-label', 'Chercher un joueur');
    search.oninput = () => { query = search.value.trim().replace(/^@/, '').toLowerCase(); paintList(false); };
    const list = el('ol', 'rk-list');
    listCol.append(search, list);
    const meBox = el('div', 'rk-me');
    cols.append(listCol, meBox);
    page.append(back, hero, stats, tabs, hint, podium, cols);
  }

  function rowsFor() {
    const b = data.boards[board];
    return scope === 'amis' ? b.friends : b.top;
  }

  function paint(animate) {
    if (!data) return;
    const def = BOARDS.find((b) => b.id === board);
    page.querySelectorAll('.rk-scope button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.scope === scope)));
    page.querySelectorAll('.rk-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.board === board)));
    page.querySelector('.rk-hint').textContent = def.hint;
    // podium
    const rows = rowsFor();
    const podium = page.querySelector('.rk-podium');
    podium.replaceChildren();
    const order = [rows[1], rows[0], rows[2]];
    order.forEach((r, i) => {
      const place = [2, 1, 3][i];
      const spot = el('div', `rk-spot p${place}` + (r ? '' : ' empty'));
      spot.append(avatar(r, 'rk-av'));
      const nm = el('span', 'rk-name', r ? at(r.username) : '—'); nm.setAttribute('data-notranslate', '');
      spot.append(nm, el('span', 'rk-val', r ? show(def, r.value) : 'Place libre'), el('div', 'rk-step', String(place)));
      if (r) { spot.tabIndex = 0; spot.setAttribute('role', 'button'); spot.onclick = () => openProfile(r); spot.onkeydown = (e) => { if (e.key === 'Enter') openProfile(r); }; }
      podium.append(spot);
    });
    if (rows[0] && !reduce) {
      for (let i = 0; i < 18; i++) {
        const s = el('span', 'rk-spark');
        s.style.left = `${8 + Math.random() * 84}%`;
        s.style.background = ['#ffd34d', '#f26b3a', '#fff', '#ff9b6b'][i % 4];
        s.style.animationDelay = `${Math.random() * 3.2}s`;
        s.style.animationDuration = `${2.6 + Math.random() * 1.6}s`;
        podium.append(s);
      }
    }
    if (animate) podium.querySelectorAll('.rk-step').forEach((s) => { s.style.animation = 'none'; void s.offsetWidth; s.style.animation = ''; });
    paintList(animate);
    paintMe(def);
  }

  function paintList(animate) {
    const def = BOARDS.find((b) => b.id === board);
    const all = rowsFor();
    const max = Math.max(1, ...all.map((r) => r.value));
    const list = page.querySelector('.rk-list');
    const rows = all.filter((r) => !query || r.username.replace(/^@/, '').toLowerCase().includes(query));
    if (!rows.length) {
      const e = el('li', 'rk-empty');
      e.append(el('b', '', query ? 'Personne avec ce nom' : scope === 'amis' ? 'Tes amis n’ont pas encore joué' : 'Personne pour l’instant'),
        document.createTextNode(query ? 'Essaie un autre pseudo.' : 'Lance un blind test et prends la première place !'));
      list.replaceChildren(e);
      return;
    }
    list.replaceChildren(...rows.map((r, i) => {
      const li = el('li', 'rk-row' + (animate ? ' anim' : '') + (r.me ? ' me' : '') + (r.friend ? ' friend' : ''));
      li.style.setProperty('--i', String(Math.min(i, 20)));
      const bar = el('span', 'bar');
      const n = el('span', 'n', String(r.rank));
      const w = el('span', 'w');
      const b = el('b', '', at(r.username) + (r.me ? ' (toi)' : '')); b.setAttribute('data-notranslate', '');
      const extra = [];
      if (board !== 'streak' && r.streak) extra.push(`🔥 ${r.streak}`);
      if (board !== 'points' && r.points) extra.push(`${nf.format(r.points)} pts`);
      if (board !== 'wins' && r.wins) extra.push(`${r.wins} victoire${r.wins > 1 ? 's' : ''}`);
      if (board !== 'badges' && r.badges) extra.push(`🏅 ${r.badges}`);
      if (board === 'time' && r.time) extra.unshift(`⏱️ ${dur(r.time)} au total`);
      w.append(b, el('span', '', extra.slice(0, 3).join(' · ') || `${r.games} partie${r.games > 1 ? 's' : ''}`));
      const v = el('span', 'v', def.fmt ? def.fmt(r.value) : nf.format(r.value)); v.append(el('small', '', def.fmt ? 'sur le site' : def.unit));
      li.append(bar, n, avatar(r, 'a'), w, v);
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `${r.rank}, ${at(r.username)}, ${show(def, r.value)}`);
      li.onclick = () => openProfile(r);
      li.onkeydown = (e) => { if (e.key === 'Enter') openProfile(r); };
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = `${Math.max(4, (r.value / max) * 100)}%`; }));
      return li;
    }));
  }

  function paintMe(def) {
    const box = page.querySelector('.rk-me');
    const b = data.boards[board];
    box.replaceChildren(el('h3', '', 'Ta place'));
    if (!data.loggedIn) {
      box.append(el('p', 'goal', 'Connecte-toi et joue pour apparaître dans le classement.'));
      const a = el('a', 'cta', 'Jouer au blind test'); a.href = '/blindtest'; box.append(a);
      return;
    }
    const me = b.me;
    if (!me) {
      box.append(el('div', 'big', '—'), el('p', 'goal', board === 'streak' ? 'Ta flamme est éteinte : un blind test ou une recherche aujourd’hui la rallume.' : 'Tu n’es pas encore dans ce classement. Une partie suffit pour y entrer !'));
      const a = el('a', 'cta', 'Jouer maintenant'); a.href = '/blindtest'; box.append(a);
    } else {
      const big = el('div', 'big', '#' + me.rank); big.append(el('small', '', `sur\u00a0${b.total}`));
      const pct = Math.max(1, Math.round((me.rank / b.total) * 100));
      box.append(big, el('span', 'rk-topchip', me.rank === 1 ? '👑 Numéro 1' : `Top ${pct} %`));
      const above = b.top.find((x) => x.rank === me.rank - 1);
      const goal = el('p', 'goal');
      const prog = el('div', 'rk-prog'); const fill = el('i'); prog.append(fill);
      if (me.rank === 1) {
        goal.textContent = 'T’es tout en haut. Garde ta place !';
        requestAnimationFrame(() => { fill.style.width = '100%'; });
      } else if (above) {
        const gap = above.value - me.value + 1;
        goal.append('Encore ', el('b', '', show(def, gap)), ' pour dépasser ');
        const who = el('b', '', at(above.username)); who.setAttribute('data-notranslate', ''); goal.append(who, '.');
        requestAnimationFrame(() => { fill.style.width = `${Math.min(100, (me.value / Math.max(1, above.value)) * 100)}%`; });
      }
      box.append(goal, prog);
    }
    const tips = el('ul', 'rk-tips');
    for (const t of ['Réponds vite : jusqu’à 500 points de bonus.', 'Gagne un battle royale pour une victoire.', 'Un blind test par jour garde ta flamme.', 'Écoute un artiste 5 fois pour son badge Bronze.']) tips.append(el('li', '', t));
    box.append(tips);
  }

  async function load(animate) {
    try {
      const d = await (await fetch('/api/rankings', { cache: 'no-store' })).json();
      const first = !data;
      data = d;
      if (first) {
        const stats = page.querySelector('.rk-stats');
        stats.replaceChildren(...[[d.totals.players, 'joueurs classés'], [d.totals.games, 'parties jouées'], [d.totals.points, 'points gagnés'], [d.totals.flames, 'flammes allumées']].map(([n, l]) => {
          const s = el('div', 'rk-stat'); const b = el('b', '', '0'); s.append(b, el('span', '', l)); countUp(b, n); return s;
        }));
      }
      paint(animate);
    } catch {
      page.querySelector('.rk-list')?.replaceChildren(el('li', 'rk-empty', 'Classement indisponible pour le moment.'));
    }
  }

  let built = false, timer = null;
  window.addEventListener('ranking-open', () => {
    if (!built) { build(); built = true; }
    data = null;
    load(true);
    clearInterval(timer);
    timer = setInterval(() => { if (!page.hidden && document.visibilityState === 'visible') load(false); }, 30_000);
  });
})();
