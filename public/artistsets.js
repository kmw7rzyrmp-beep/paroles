// Playlists d'artistes : on choisit ses artistes une fois (tous genres mélangés),
// puis un clic les met tous dans le blind test.
// Affichées à côté des playlists de sons (#asGrid), et en petites pastilles dans le salon pour l'hôte.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const EMOJIS = ['⭐', '🎵', '🔥', '🎧', '💿', '🎤', '🌙', '⚡', '💜', '🚗', '🏖️', '🖤', '👑'];
  const ALL = 'tout';

  const css = `
  .pl-duo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1.6rem; align-items: start; margin-top: 2.2rem; }
  .pl-duo > .pl-box { margin-top: 0; }
  .pl-duo .pl-grid { grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); }
  @media (max-width: 1000px) { .pl-duo { grid-template-columns: 1fr; } }
  .as-art { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 3px; background: #121214; }
  .as-art span { display: grid; place-items: center; font: 800 1.35rem var(--texte); color: #111; background: var(--c); transition: transform .5s ease; }
  .pl-card:hover .as-art span { transform: scale(1.06); }
  .as-art.few span:first-child { grid-column: 1 / -1; grid-row: 1 / -1; font-size: 3rem; }
  .as-art .badge { position: absolute; left: .4rem; bottom: .4rem; font-size: 1.3rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); background: none; }
  .as-msg { min-height: 1.2rem; margin: .6rem 0 0; font-size: .85rem; color: var(--gris); }
  .as-msg.ok { color: #6fdc8c; }

  .as-row { margin: 0 0 1.1rem; }
  .as-chips { display: flex; flex-wrap: wrap; gap: .45rem; }
  .as-chip { display: inline-flex; align-items: center; gap: .45rem; min-height: 2.6rem; padding: .25rem .9rem; border-radius: 999px; background: #232327; color: var(--blanc);
    font-size: .9rem; border: 0; cursor: pointer; transition: transform .18s cubic-bezier(.2, 1.4, .4, 1), background .2s; animation: asIn .35s cubic-bezier(.2, 1.3, .4, 1) both; animation-delay: calc(var(--i, 0) * 40ms); }
  .as-chip:hover { transform: translateY(-2px); background: #2c2c31; }
  .as-chip small { color: var(--gris); font-size: .75rem; }
  .as-chip.on { background: var(--blanc); color: #0b0b0c; }
  .as-chip.go, .pl-card.go { animation: asGo .7s ease; }
  @keyframes asIn { from { opacity: 0; transform: scale(.8); } }
  @keyframes asGo { 30% { transform: scale(1.06); box-shadow: 0 0 0 5px rgba(242, 107, 58, .35); } }

  dialog.as-dialog { width: min(40rem, calc(100vw - 1.5rem)); height: min(46rem, calc(100dvh - 2rem)); padding: 0; border: 0; border-radius: 26px; background: #141416; color: var(--blanc); overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.7); }
  dialog.as-dialog[open] { display: flex; flex-direction: column; animation: asPop .35s cubic-bezier(.2, 1.2, .4, 1); }
  dialog.as-dialog::backdrop { background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }
  @media (max-width: 40rem) { dialog.as-dialog { width: 100vw; height: 100dvh; max-width: 100vw; max-height: none; border-radius: 0; margin: 0; } }
  @keyframes asPop { from { opacity: 0; transform: translateY(20px) scale(.96); } }
  .as-d-head { padding: calc(1.2rem + env(safe-area-inset-top, 0px)) 1.4rem .8rem; background: linear-gradient(135deg, rgba(242, 107, 58, .2), transparent 70%); }
  .as-d-head h2 { margin: 0 0 .2rem; font: 800 1.35rem var(--texte); }
  .as-d-head p { margin: 0; color: var(--gris); font-size: .88rem; }
  .as-d-body { flex: 1; min-height: 0; padding: .4rem 1.4rem 1rem; overflow-y: auto; display: grid; align-content: start; gap: .9rem; }
  .as-d-body .l { display: block; margin-bottom: .35rem; font-size: .82rem; color: var(--gris); font-weight: 600; }
  .as-name, .as-search { width: 100%; min-height: 2.8rem; padding: 0 .95rem; border-radius: 14px; border: 1px solid #2c2c31; background: #0b0b0c; color: var(--blanc); font: 500 16px var(--texte); box-sizing: border-box; }
  .as-name:focus, .as-search:focus { outline: none; border-color: var(--orange); }
  .as-emo-list { display: flex; flex-wrap: wrap; gap: .25rem; }
  .as-emo-list button { min-height: 2.3rem; min-width: 2.3rem; padding: 0; border-radius: 10px; background: transparent; font-size: 1.15rem; box-shadow: none; }
  .as-emo-list button[aria-pressed="true"] { background: #2c2c31; box-shadow: inset 0 0 0 2px var(--orange); }
  .as-genres { display: flex; gap: .35rem; overflow-x: auto; padding-bottom: .2rem; scrollbar-width: none; }
  .as-genres button { flex: none; min-height: 2.2rem; padding: 0 .85rem; border-radius: 999px; background: #232327; color: var(--blanc); font-size: .82rem; }
  .as-genres button[aria-pressed="true"] { background: var(--blanc); color: #0b0b0c; }
  .as-picked { display: flex; flex-wrap: wrap; gap: .3rem; min-height: 1.5rem; }
  .as-picked button { min-height: 1.9rem; padding: 0 .55rem 0 .7rem; border-radius: 999px; background: rgba(242, 107, 58, .16); color: var(--orange); font-size: .8rem; font-weight: 700; animation: asIn .25s ease both; }
  .as-picked button::after { content: " ✕"; opacity: .7; }
  .as-artists { display: flex; flex-wrap: wrap; gap: .35rem; }
  .as-artists button { min-height: 2.3rem; padding: 0 .75rem; border-radius: 999px; background: #1d1d21; color: var(--blanc); font-size: .84rem; border: 1px solid #2c2c31; transition: background .15s, transform .15s; }
  .as-artists button small { margin-left: .35rem; color: var(--gris); font-size: .7rem; }
  .as-artists button[aria-pressed="true"] { background: var(--orange); border-color: var(--orange); color: #fff; animation: asTick .3s ease; }
  .as-artists button[aria-pressed="true"] small { color: rgba(255,255,255,.8); }
  @keyframes asTick { 50% { transform: scale(1.08); } }
  .as-count { font-size: .82rem; color: var(--gris); }
  .as-count b { color: var(--orange); }
  .as-d-foot { display: flex; gap: .5rem; align-items: center; padding: .9rem 1.4rem calc(1.2rem + env(safe-area-inset-bottom, 0px)); border-top: 1px solid #222226; }
  .as-d-foot .sp { flex: 1; }
  .as-d-foot button { min-height: 2.8rem; padding: 0 1.1rem; border-radius: 999px; font-weight: 600; }
  .as-d-foot .del { background: transparent; color: #ff8f8f; box-shadow: none; padding: 0 .6rem; }
  .as-d-foot .cancel { background: #232327; color: var(--blanc); }
  .as-d-foot .ok { background: var(--orange); color: #fff; }
  .as-err { margin: 0; color: var(--danger, #ff6b6b); font-size: .84rem; min-height: 1rem; }
  @media (prefers-reduced-motion: reduce) { .as-chip, dialog.as-dialog[open], .as-artists button[aria-pressed="true"], .as-chip.go, .pl-card.go, .as-picked button { animation: none !important; } }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  let sets = null, loggedIn = true;
  const bridge = () => window.btBridge;
  const cats = () => bridge()?.cats() || [];
  const catOf = (id) => cats().find((c) => c.id === id);
  const genreName = (id) => catOf(id)?.nom || id;
  const allArtists = () => (catOf(ALL)?.artists || []);
  const colorOf = (name) => { let h = 0; for (const c of String(name)) h = (h * 31 + c.codePointAt(0)) % 360; return `hsl(${h} 80% 66%)`; };
  // genres d'une playlist (calculés à partir des artistes)
  const genresOf = (s) => {
    const all = new Map(allArtists().map((a) => [a.nom, a.genres || []]));
    const g = new Set();
    for (const a of s.artists) for (const x of all.get(a) || (s.category !== ALL ? [s.category] : [])) g.add(x);
    return [...g];
  };

  async function load() {
    try {
      const r = await fetch('/api/playlists/artists', { cache: 'no-store' });
      if (r.status === 401) { loggedIn = false; sets = []; return; }
      sets = (await r.json()).sets || []; loggedIn = true;
    } catch { sets = sets || []; }
  }
  async function post(path, body) {
    const r = await fetch('/api/playlists/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Erreur, réessaie.');
    return d;
  }

  // ---------- les cartes (à côté des playlists de sons) ----------
  const grid = document.getElementById('asGrid');
  const homeMsg = document.getElementById('asHomeMsg');
  function art(s) {
    const a = el('div', 'as-art' + (s.artists.length < 4 ? ' few' : ''));
    a.setAttribute('aria-hidden', 'true');
    if (s.artists.length < 4) { const x = el('span', '', s.emoji); x.style.setProperty('--c', 'linear-gradient(135deg, #f28c1c, #e2412b 55%, #6b2bd1)'); x.style.background = 'linear-gradient(135deg, #f28c1c, #e2412b 55%, #6b2bd1)'; a.append(x); return a; }
    for (const n of s.artists.slice(0, 4)) { const x = el('span', '', n.slice(0, 1).toUpperCase()); x.style.setProperty('--c', colorOf(n)); a.append(x); }
    a.append(el('span', 'badge', s.emoji));
    return a;
  }
  function drawGrid(animate) {
    if (!grid) return;
    if (!loggedIn) {
      const p = el('p', 'pl-login');
      const a = el('a', '', 'Connecte-toi'); a.href = '/?login=1';
      p.append(a, ' pour créer tes playlists d’artistes.');
      grid.replaceChildren(p);
      return;
    }
    const cards = (sets || []).map((s) => {
      const c = el('div', 'pl-card');
      c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', `Jouer avec ${s.name}`);
      const name = el('div', 'pl-name', s.name); name.setAttribute('data-notranslate', '');
      const g = genresOf(s);
      const meta = el('div', 'pl-meta', `${s.artists.length} artiste${s.artists.length > 1 ? 's' : ''}${g.length ? ' · ' + (g.length > 1 ? `${g.length} genres` : genreName(g[0])) : ''}`);
      const actions = el('div', 'pl-actions');
      const play = el('button', '', 'Jouer'); play.type = 'button';
      play.onclick = (e) => { e.stopPropagation(); apply(s, c, homeMsg, true); };
      const edit = el('button', 'ghost', 'Modifier'); edit.type = 'button';
      edit.onclick = (e) => { e.stopPropagation(); editor(s); };
      actions.append(play, edit);
      c.append(art(s), name, meta, actions);
      c.onclick = () => apply(s, c, homeMsg, true);
      c.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); apply(s, c, homeMsg, true); } };
      return c;
    });
    const n = el('button', 'pl-card pl-new'); n.type = 'button';
    n.append(el('span', 'plus', '+'), el('b', '', 'Nouvelle playlist'), el('span', '', 'Choisis tes artistes'));
    n.onclick = () => editor(null);
    cards.push(n);
    grid.replaceChildren(...cards);
    cards.forEach((c, i) => {
      if (reduce || !animate) { c.classList.add('in'); return; }
      c.style.transitionDelay = `${Math.min(i, 8) * 60}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('in')));
      setTimeout(() => { c.style.transitionDelay = ''; }, 900);
    });
  }

  // ---------- les pastilles dans le salon (pour l'hôte) ----------
  let lobbyRow = null;
  function drawLobby() {
    if (!lobbyRow || document.documentElement.dataset.skin === 'anime') return; // pas de playlists d'artistes en mode animé
    const chips = lobbyRow.querySelector('.as-chips');
    const cur = bridge()?.current() || {};
    lobbyRow.hidden = !loggedIn || !(sets || []).length;
    chips.replaceChildren(...(sets || []).map((s, i) => {
      const b = el('button', 'as-chip'); b.type = 'button'; b.style.setProperty('--i', String(i));
      const on = Array.isArray(cur.artists) && cur.artists.length === s.artists.length && s.artists.every((a) => cur.artists.includes(a));
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
      b.append(el('span', '', s.emoji), el('span', '', s.name), el('small', '', `${s.artists.length}`));
      b.setAttribute('data-notranslate', '');
      b.onclick = () => apply(s, b, lobbyRow.querySelector('.as-msg'), false);
      return b;
    }));
  }

  async function apply(s, btn, msg, scroll) {
    if (msg) msg.className = 'as-msg';
    const known = new Set(allArtists().map((a) => a.nom));
    const artists = s.artists.filter((a) => known.has(a));
    if (!artists.length) { if (msg) msg.textContent = 'Aucun de ces artistes n’est encore dans le blind test.'; return; }
    try {
      await bridge().applyArtists(ALL, artists);
      btn.classList.remove('go'); void btn.offsetWidth; btn.classList.add('go');
      if (msg) {
        msg.className = 'as-msg ok';
        msg.textContent = `${s.emoji} ${artists.length} artiste${artists.length > 1 ? 's' : ''} chargé${artists.length > 1 ? 's' : ''} dans la partie : ${artists.slice(0, 3).join(', ')}${artists.length > 3 ? '…' : ''}`;
      }
      if (scroll) {
        const box = document.getElementById('createBox');
        if (box) { box.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash'); }
      }
      drawLobby();
    } catch (err) { if (msg) msg.textContent = err.message; }
  }

  // ---------- l'éditeur : tous les artistes, tous les genres ----------
  let dlg = null;
  function editor(s) {
    if (!loggedIn) { if (window.needLogin) window.needLogin('créer des playlists d’artistes'); return; }
    if (!dlg) { dlg = el('dialog', 'as-dialog'); dlg.setAttribute('aria-labelledby', 'asTitle'); document.body.append(dlg); dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); }
    const editing = s && s.id ? s : null;
    const artists = allArtists().slice().sort((x, y) => x.nom.localeCompare(y.nom, 'fr', { sensitivity: 'base', numeric: true }));
    const genres = [...new Set(artists.flatMap((a) => a.genres || []))];
    let chosen = new Set((s && s.artists) || []);
    let emoji = (s && s.emoji) || '⭐';
    let genre = '', q = '';

    const head = el('div', 'as-d-head');
    const h = el('h2', '', editing ? 'Modifier la playlist d’artistes' : 'Nouvelle playlist d’artistes'); h.id = 'asTitle';
    head.append(h, el('p', '', 'Mélange les genres comme tu veux. Ensuite, un clic les met tous dans le blind test.'));
    const body = el('div', 'as-d-body');
    const nameBox = el('div');
    const nl = el('label', 'l', 'Nom'); nl.htmlFor = 'asName';
    const name = el('input', 'as-name'); name.id = 'asName'; name.maxLength = 40; name.placeholder = 'Ex. Ma soirée rap'; name.value = (s && s.name) || ''; name.setAttribute('data-notranslate', '');
    nameBox.append(nl, name);
    const emoBox = el('div'); emoBox.append(el('span', 'l', 'Icône'));
    const emoList = el('div', 'as-emo-list'); emoList.setAttribute('role', 'group'); emoList.setAttribute('aria-label', 'Icône');
    const drawEmo = () => emoList.replaceChildren(...EMOJIS.map((e) => { const b = el('button', '', e); b.type = 'button'; b.setAttribute('aria-pressed', String(e === emoji)); b.onclick = () => { emoji = e; drawEmo(); }; return b; }));
    drawEmo(); emoBox.append(emoList);
    const pickedBox = el('div');
    const pHead = el('div'); pHead.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:.5rem';
    const count = el('span', 'as-count');
    pHead.append(el('span', 'l', 'Dans ta playlist'), count);
    const picked = el('div', 'as-picked');
    pickedBox.append(pHead, picked);
    const artBox = el('div');
    artBox.append(el('span', 'l', 'Ajoute des artistes'));
    const genreRow = el('div', 'as-genres'); genreRow.setAttribute('role', 'group'); genreRow.setAttribute('aria-label', 'Genre');
    const search = el('input', 'as-search'); search.type = 'search'; search.placeholder = 'Chercher un artiste'; search.setAttribute('aria-label', 'Chercher un artiste');
    search.style.margin = '.5rem 0';
    const artRow = el('div', 'as-artists'); artRow.setAttribute('role', 'group'); artRow.setAttribute('aria-label', 'Artistes');
    artBox.append(genreRow, search, artRow);
    const err = el('p', 'as-err'); err.setAttribute('role', 'alert');
    body.append(nameBox, emoBox, pickedBox, artBox, err);

    const drawGenres = () => genreRow.replaceChildren(...[['', 'Tous les genres'], ...genres.map((g) => [g, genreName(g)])].map(([id, label]) => {
      const b = el('button', '', label); b.type = 'button'; b.setAttribute('aria-pressed', String(id === genre));
      b.onclick = () => { genre = id; drawGenres(); drawArtists(); };
      return b;
    }));
    const toggle = (nom) => { if (chosen.has(nom)) chosen.delete(nom); else chosen.add(nom); drawPicked(); drawArtists(); };
    const drawPicked = () => {
      const list = [...chosen];
      picked.replaceChildren(...(list.length ? list.map((nom) => { const b = el('button', '', nom); b.type = 'button'; b.setAttribute('aria-label', 'Retirer ' + nom); b.setAttribute('data-notranslate', ''); b.onclick = () => toggle(nom); return b; })
        : [el('span', 'as-count', 'Aucun artiste pour l’instant : clique sur ceux que tu veux en dessous.')]));
      const songs = artists.filter((a) => chosen.has(a.nom)).reduce((n, a) => n + a.count, 0);
      const g = new Set(artists.filter((a) => chosen.has(a.nom)).flatMap((a) => a.genres || []));
      count.replaceChildren(el('b', '', String(chosen.size)), document.createTextNode(` artiste${chosen.size > 1 ? 's' : ''}${songs ? `, ${songs} sons` : ''}${g.size > 1 ? `, ${g.size} genres` : ''}`));
    };
    const drawArtists = () => {
      const list = artists.filter((a) => (!genre || (a.genres || []).includes(genre)) && (!q || a.nom.toLowerCase().includes(q)));
      artRow.replaceChildren(...list.map((a) => {
        const b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(chosen.has(a.nom))); b.setAttribute('data-notranslate', '');
        b.append(document.createTextNode(a.nom));
        if (!genre && a.genres && a.genres.length) b.append(el('small', '', a.genres.map(genreName).join(', ')));
        b.onclick = () => toggle(a.nom);
        return b;
      }));
      if (!list.length) artRow.replaceChildren(el('span', 'as-count', 'Aucun artiste avec ce nom.'));
    };
    search.oninput = () => { q = search.value.trim().toLowerCase(); drawArtists(); };
    drawGenres(); drawPicked(); drawArtists();

    const foot = el('div', 'as-d-foot');
    if (editing) {
      const del = el('button', 'del', 'Supprimer'); del.type = 'button';
      del.onclick = async () => {
        const ok = await window.ssConfirm({ icon: '🗑️', title: `Supprimer « ${editing.name} » ?`, text: 'Cette playlist d’artistes sera supprimée pour de bon.', ok: 'Supprimer', danger: true });
        if (!ok) return;
        try { const d = await post('artists/delete', { id: editing.id }); sets = d.sets; dlg.close(); paint(false); } catch (e) { err.textContent = e.message; }
      };
      foot.append(del);
    }
    foot.append(el('span', 'sp'));
    const cancel = el('button', 'cancel', 'Annuler'); cancel.type = 'button'; cancel.onclick = () => dlg.close();
    const ok = el('button', 'ok', editing ? 'Enregistrer' : 'Créer'); ok.type = 'button';
    ok.onclick = async () => {
      err.textContent = '';
      if (!name.value.trim()) { err.textContent = 'Donne un nom à ta playlist d’artistes.'; name.focus(); return; }
      if (!chosen.size) { err.textContent = 'Choisis au moins un artiste.'; return; }
      ok.disabled = true;
      try {
        const d = await post('artists/save', { id: editing ? editing.id : undefined, name: name.value.trim(), emoji, category: ALL, artists: [...chosen] });
        sets = d.sets;
        dlg.close();
        paint(true);
      } catch (e) { err.textContent = e.message; } finally { ok.disabled = false; }
    };
    foot.append(cancel, ok);
    dlg.replaceChildren(head, body, foot);
    dlg.showModal();
    if (matchMedia('(hover: hover)').matches) name.focus();
  }

  function paint(animate) { drawGrid(animate); drawLobby(); }

  async function init() {
    const host = document.getElementById('hostSettings');
    if (host && !host.querySelector('.as-row')) {
      lobbyRow = el('div', 'as-row');
      lobbyRow.append(el('p', 'lbl', 'Mes playlists d’artistes'), el('div', 'as-chips'), el('p', 'as-msg'));
      host.prepend(lobbyRow);
    }
    await load();
    paint(true);
    let sig = '';
    setInterval(() => {
      const c = bridge()?.current() || {};
      const s2 = c.category + '|' + (Array.isArray(c.artists) ? c.artists.join(',') : '*');
      if (s2 !== sig) { sig = s2; drawLobby(); }
    }, 700);
    window.addEventListener('account-changed', async () => { await load(); paint(false); });
  }
  if (window.btBridge) init(); else window.addEventListener('bt-ready', init, { once: true });
})();
