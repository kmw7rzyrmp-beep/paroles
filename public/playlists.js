// Playlists de blind test : chaque joueur crée ses playlists, puis lance une partie avec.
// Cartes animées, éditeur avec recherche de sons (iTunes), ajout « qui vole » dans la playlist.
(() => {
  const grid = document.getElementById('plGrid');
  if (!grid) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = `
  .pl-box { margin-top: 2.2rem; }
  .pl-head { display: flex; align-items: baseline; flex-wrap: wrap; gap: .4rem 1rem; margin-bottom: .9rem; }
  .pl-head h2 { margin: 0; }
  .pl-sub { color: var(--gris); font-size: .95rem; }
  .pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: .8rem; }
  .pl-card {
    position: relative; display: flex; flex-direction: column; gap: .55rem; padding: .7rem; border-radius: 12px; background: #1d1c21; border: 1px solid #34333b;
    cursor: pointer; text-align: left; color: inherit; font: inherit; box-shadow: none; min-height: 0;
    opacity: 0; transform: translateY(14px) scale(.97); transition: opacity .45s ease, transform .45s cubic-bezier(.2, .9, .3, 1.15), border-color .2s, box-shadow .2s;
  }
  .pl-card.in { opacity: 1; transform: none; }
  .pl-card:hover { border-color: var(--orange); box-shadow: 0 10px 26px rgba(0,0,0,.45); transform: translateY(-3px); }
  .pl-card:active { transform: scale(.98); background: #1d1c21; }
  .pl-card:focus-visible { outline: 3px solid var(--jaune); outline-offset: 2px; }
  .pl-art { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
    background: linear-gradient(135deg, #f28c1c, #e2412b 55%, #6b2bd1); }
  .pl-art img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s ease; }
  .pl-card:hover .pl-art img { transform: scale(1.06); }
  .pl-art.one img { grid-column: 1 / -1; grid-row: 1 / -1; }
  .pl-art .emo { grid-column: 1 / -1; grid-row: 1 / -1; display: grid; place-items: center; font-size: 3.2rem; }
  .pl-art .badge { position: absolute; left: .4rem; bottom: .4rem; font-size: 1.3rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
  .pl-name { font-weight: 800; font-size: 1rem; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pl-meta { color: var(--gris); font-size: .8rem; margin-top: -.35rem; }
  .pl-actions { display: flex; gap: .4rem; }
  .pl-actions button { flex: 1; min-height: 2.3rem; padding: .2rem .5rem; font-size: .85rem; }
  .pl-new { align-items: center; justify-content: center; min-height: 13rem; border: 2px dashed #3a3940; background: transparent; color: var(--gris); }
  .pl-new .plus { width: 3rem; height: 3rem; border-radius: 50%; display: grid; place-items: center; font-size: 2rem; background: #26252c; color: var(--orange); transition: transform .3s cubic-bezier(.2, 1.5, .4, 1); }
  .pl-new:hover .plus { transform: rotate(90deg) scale(1.1); }
  .pl-new b { color: var(--blanc); }
  .pl-login { color: var(--gris); }
  .pl-login a { color: var(--jaune); }

  dialog.pl-ed { width: min(52rem, calc(100vw - 1rem)); height: min(44rem, calc(100dvh - 1rem)); max-height: none; padding: 0; border: 0; border-radius: 14px;
    background: #18171c; color: var(--blanc); box-shadow: 0 30px 80px rgba(0,0,0,.75); display: none; flex-direction: column; overflow: hidden; }
  dialog.pl-ed[open] { display: flex; animation: edIn .35s cubic-bezier(.2, .9, .3, 1.1); }
  dialog.pl-ed.closing { animation: edOut .22s ease forwards; }
  dialog.pl-ed::backdrop { background: rgba(8, 8, 10, .72); backdrop-filter: blur(3px); }
  @keyframes edIn { from { opacity: 0; transform: translateY(26px) scale(.97); } }
  @keyframes edOut { to { opacity: 0; transform: translateY(18px) scale(.98); } }
  @media (max-width: 40rem) { dialog.pl-ed { width: 100vw; height: 100dvh; max-width: 100vw; border-radius: 0; margin: 0; } }
  .ed-head { display: flex; align-items: center; gap: .6rem; padding: .8rem .9rem; border-bottom: 1px solid #2c2b31; background: #1d1c21; }
  .ed-emoji { position: relative; flex: none; width: 2.8rem; height: 2.8rem; min-height: 0; padding: 0; font-size: 1.5rem; border-radius: 10px; }
  .ed-name { flex: 1; min-width: 0; min-height: 2.8rem; padding: .3rem .8rem; border-radius: 10px; border: 1px solid #3a3940; background: #121115; color: var(--blanc);
    font: 800 1.15rem var(--texte); }
  .ed-name:focus { outline: none; border-color: var(--orange); }
  .ed-close { flex: none; min-height: 2.6rem; min-width: 2.6rem; padding: 0; }
  .ed-emojis { position: absolute; top: calc(100% + .4rem); left: 0; z-index: 3; display: grid; grid-template-columns: repeat(6, 2.4rem); gap: .2rem; padding: .4rem;
    background: #26252c; border: 1px solid #3a3940; border-radius: 10px; box-shadow: 0 12px 30px rgba(0,0,0,.6); animation: popIn .18s ease-out; }
  .ed-emojis[hidden] { display: none; }
  .ed-emojis button { min-height: 2.4rem; padding: 0; font-size: 1.3rem; background: none; border: 0; box-shadow: none; border-radius: 8px; }
  .ed-emojis button:hover { background: #34333b; }
  @keyframes popIn { from { opacity: 0; transform: translateY(-4px) scale(.96); } }
  .ed-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; }
  @media (max-width: 40rem) { .ed-body { grid-template-columns: 1fr; grid-template-rows: auto 1fr; overflow-y: auto; } }
  .ed-col { min-height: 0; display: flex; flex-direction: column; padding: .8rem .9rem; }
  .ed-col + .ed-col { border-left: 1px solid #2c2b31; }
  @media (max-width: 40rem) { .ed-col + .ed-col { border-left: 0; border-top: 1px solid #2c2b31; } .ed-col { overflow: visible; } }
  .ed-col h3 { margin: 0 0 .6rem; font: 900 1.05rem var(--texte); font-stretch: 70%; text-transform: uppercase; color: var(--gris); display: flex; align-items: center; gap: .5rem; }
  .ed-count { display: inline-block; min-width: 1.6rem; padding: .05rem .45rem; border-radius: 999px; background: var(--orange); color: #1b1b22; font-size: .8rem; text-align: center; }
  .ed-count.bump { animation: bump .45s cubic-bezier(.2, 1.8, .4, 1); }
  @keyframes bump { 40% { transform: scale(1.45); } }
  .ed-search { min-height: 2.6rem; padding: .3rem .9rem; border-radius: 999px; border: 1px solid #3a3940; background: #121115; color: var(--blanc); font: inherit; }
  .ed-search:focus { outline: none; border-color: var(--orange); }
  .ed-results, .ed-songs { list-style: none; margin: .6rem 0 0; padding: 0; overflow-y: auto; flex: 1; min-height: 0; overscroll-behavior: contain; }
  @media (max-width: 40rem) { .ed-results { max-height: 45vh; } }
  .ed-row { display: grid; grid-template-columns: 2.8rem 1fr auto; align-items: center; gap: .6rem; padding: .4rem; border-radius: 8px;
    transition: background .2s, opacity .3s, transform .3s; }
  .ed-row:hover { background: #222127; }
  .ed-results .ed-row { opacity: 0; transform: translateX(-10px); }
  .ed-results .ed-row.in { opacity: 1; transform: none; }
  .ed-cover { position: relative; width: 2.8rem; height: 2.8rem; border-radius: 6px; overflow: hidden; background: #2c2b32; display: grid; place-items: center; }
  .ed-cover img { width: 100%; height: 100%; object-fit: cover; }
  .ed-cover button { position: absolute; inset: 0; min-height: 0; padding: 0; border: 0; border-radius: 0; background: rgba(0,0,0,.45); color: #fff; opacity: 0; transition: opacity .2s; box-shadow: none; }
  .ed-row:hover .ed-cover button, .ed-cover button.playing, .ed-cover button:focus-visible { opacity: 1; }
  .ed-cover button svg { width: 1rem; height: 1rem; }
  .ed-txt { min-width: 0; }
  .ed-txt b { display: block; font-size: .93rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ed-txt span { display: block; font-size: .8rem; color: var(--gris); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ed-add, .ed-del { min-height: 2.2rem; min-width: 2.2rem; padding: 0; border-radius: 50%; font-size: 1.2rem; line-height: 1; }
  .ed-add.done { background: #2f6b40; border-color: #2f6b40; color: #fff; box-shadow: none; }
  .ed-del { background: none; border: 1px solid #3a3940; color: var(--gris); box-shadow: none; }
  .ed-del:hover { color: var(--danger); border-color: var(--danger); }
  .ed-songs .ed-row { grid-template-columns: 1.4rem 2.8rem 1fr auto; }
  .ed-songs .num { color: var(--gris); font-size: .8rem; text-align: right; font-variant-numeric: tabular-nums; }
  .ed-songs .ed-row.new { animation: rowIn .5s cubic-bezier(.2, 1.3, .4, 1); background: rgba(242, 140, 28, .14); }
  @keyframes rowIn { from { opacity: 0; transform: translateY(-10px) scale(.95); } }
  .ed-songs .ed-row.gone { opacity: 0; transform: translateX(30px); }
  .ed-empty { color: var(--gris); font-size: .92rem; margin: 1.2rem .3rem; text-align: center; }
  .ed-foot { display: flex; align-items: center; gap: .6rem; padding: .7rem .9rem calc(.7rem + env(safe-area-inset-bottom, 0px)); border-top: 1px solid #2c2b31; background: #1d1c21; }
  .ed-foot .ed-msg { flex: 1; font-size: .85rem; color: var(--gris); }
  .ed-foot .ed-msg.err { color: var(--danger); }
  .ed-foot .ed-msg.ok { color: #6fdc8c; }
  .ed-foot button { min-height: 2.6rem; }
  .ed-flyer { position: fixed; z-index: 1000; width: 2.8rem; height: 2.8rem; border-radius: 6px; overflow: hidden; pointer-events: none; box-shadow: 0 8px 20px rgba(0,0,0,.6);
    background: #2c2b32 center / cover; display: grid; place-items: center; font-size: 1.4rem; }
  @media (prefers-reduced-motion: reduce) {
    .pl-card, .ed-results .ed-row { opacity: 1; transform: none; transition: none; }
    dialog.pl-ed[open], dialog.pl-ed.closing, .ed-songs .ed-row.new, .ed-count.bump { animation: none; }
  }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);

  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const api = async (url, body) => {
    const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'Erreur réseau, réessaie.'), { status: r.status });
    return d;
  };
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>';
  let lists = [], emojis = ['🎵'], limits = { playlists: 12, songs: 150 }, loggedIn = null;

  // ---------- les cartes ----------
  function art(pl) {
    const a = $('div', 'pl-art');
    const covers = (pl.songs || []).filter((x) => x.cover).slice(0, 4).map((x) => x.cover);
    if (covers.length >= 4) covers.forEach((c) => { const i = $('img'); i.src = c; i.alt = ''; i.loading = 'lazy'; a.append(i); });
    else if (covers.length) { a.classList.add('one'); const i = $('img'); i.src = covers[0]; i.alt = ''; i.loading = 'lazy'; a.append(i); }
    else a.append($('span', 'emo', pl.emoji));
    if (covers.length) a.append($('span', 'badge', pl.emoji));
    a.setAttribute('aria-hidden', 'true');
    return a;
  }
  function draw(animate) {
    if (loggedIn === false) {
      const p = $('p', 'pl-login');
      const a = $('a', '', 'Connecte-toi'); a.href = '/';
      p.append(a, ' pour créer tes propres playlists de blind test.');
      grid.replaceChildren(p);
      return;
    }
    const cards = lists.map((pl) => {
      const c = $('div', 'pl-card');
      c.tabIndex = 0;
      c.setAttribute('role', 'button');
      c.setAttribute('aria-label', `Modifier la playlist ${pl.name}`);
      const name = $('div', 'pl-name', pl.name); name.setAttribute('data-notranslate', '');
      const n = pl.songs.length;
      const meta = $('div', 'pl-meta', `${n} son${n > 1 ? 's' : ''}${n < 4 ? ` · encore ${4 - n} pour jouer` : ''}`);
      const actions = $('div', 'pl-actions');
      const play = $('button', '', 'Jouer'); play.type = 'button';
      play.disabled = n < 4;
      play.onclick = (e) => { e.stopPropagation(); playIt(pl); };
      const edit = $('button', 'ghost', 'Modifier'); edit.type = 'button';
      edit.onclick = (e) => { e.stopPropagation(); openEditor(pl); };
      actions.append(play, edit);
      c.append(art(pl), name, meta, actions);
      c.onclick = () => openEditor(pl);
      c.onkeydown = (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); openEditor(pl); } };
      return c;
    });
    if (lists.length < limits.playlists) {
      const c = $('button', 'pl-card pl-new');
      c.type = 'button';
      c.append($('span', 'plus', '+'), $('b', '', 'Nouvelle playlist'), $('span', '', 'Choisis tes sons'));
      c.onclick = () => openEditor(null);
      cards.push(c);
    }
    grid.replaceChildren(...cards);
    cards.forEach((c, i) => {
      if (reduce || !animate) { c.classList.add('in'); return; }
      c.style.transitionDelay = `${Math.min(i, 8) * 60}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add('in')));
      setTimeout(() => { c.style.transitionDelay = ''; }, 900);
    });
  }
  async function load(animate = true) {
    try {
      const d = await api('/api/playlists');
      loggedIn = true; lists = d.playlists; emojis = d.emojis || emojis; limits = d.limits || limits;
    } catch (err) {
      if (err.status === 401) loggedIn = false;
    }
    draw(animate);
  }
  function playIt(pl) {
    const go = () => window.btBridge && window.btBridge.pick('pl:' + pl.id);
    if (!go()) window.btBridge?.reloadCats().then(go);
  }

  // ---------- l'éditeur ----------
  let dlg, ed = null; // ed = { id, name, emoji, songs, dirty }
  const audio = new Audio();
  let playingBtn = null;
  function stopPreview() { audio.pause(); if (playingBtn) { playingBtn.innerHTML = PLAY; playingBtn.classList.remove('playing'); } playingBtn = null; }
  audio.addEventListener('ended', stopPreview);

  function build() {
    dlg = $('dialog', 'pl-ed');
    dlg.setAttribute('aria-label', 'Playlist');
    dlg.innerHTML = `
      <div class="ed-head">
        <button type="button" class="ed-emoji ghost" aria-label="Choisir un emoji" aria-haspopup="true"></button>
        <div class="ed-emojis" hidden></div>
        <input class="ed-name" maxlength="40" placeholder="Nom de la playlist" aria-label="Nom de la playlist" data-notranslate>
        <button type="button" class="ed-close ghost" aria-label="Fermer"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
      </div>
      <div class="ed-body">
        <div class="ed-col">
          <h3>Ajouter des sons</h3>
          <input class="ed-search" type="search" placeholder="Cherche un titre ou un artiste" aria-label="Chercher un son">
          <ul class="ed-results" aria-live="polite"></ul>
        </div>
        <div class="ed-col">
          <h3>Dans la playlist <span class="ed-count">0</span></h3>
          <ul class="ed-songs"></ul>
        </div>
      </div>
      <div class="ed-foot">
        <button type="button" class="ed-delete ghost">Supprimer</button>
        <span class="ed-msg" role="status"></span>
        <button type="button" class="ed-save">Enregistrer</button>
      </div>`;
    document.body.append(dlg);
    const q = (sel) => dlg.querySelector(sel);
    const picker = q('.ed-emojis');
    q('.ed-emoji').onclick = () => {
      picker.replaceChildren(...emojis.map((e) => {
        const b = $('button', '', e); b.type = 'button';
        b.onclick = () => { ed.emoji = e; ed.dirty = true; q('.ed-emoji').textContent = e; picker.hidden = true; };
        return b;
      }));
      picker.hidden = !picker.hidden;
    };
    q('.ed-name').addEventListener('input', () => { ed.dirty = true; setMsg(''); });
    q('.ed-close').onclick = () => close(true);
    q('.ed-save').onclick = () => save(false);
    q('.ed-delete').onclick = del;
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(true); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(true); if (!picker.hidden && !e.target.closest('.ed-emoji, .ed-emojis')) picker.hidden = true; });
    let timer = null;
    q('.ed-search').addEventListener('input', (e) => {
      clearTimeout(timer);
      const v = e.target.value.trim();
      timer = setTimeout(() => search(v), 320);
    });
  }
  const q = (sel) => dlg.querySelector(sel);
  function setMsg(t, cls) { const m = q('.ed-msg'); m.textContent = t; m.className = 'ed-msg' + (cls ? ' ' + cls : ''); }
  const key = (x) => (x.titre + '|' + x.artiste).toLowerCase();

  function openEditor(pl) {
    if (!dlg) build();
    ed = pl ? { id: pl.id, name: pl.name, emoji: pl.emoji, songs: pl.songs.map((x) => ({ ...x })), dirty: false }
      : { id: null, name: '', emoji: emojis[Math.floor(Math.random() * emojis.length)], songs: [], dirty: false };
    q('.ed-emoji').textContent = ed.emoji;
    q('.ed-name').value = ed.name;
    q('.ed-search').value = '';
    q('.ed-results').replaceChildren($('li', 'ed-empty', 'Tape le nom d’un son ou d’un artiste pour le trouver.'));
    q('.ed-delete').hidden = !ed.id;
    q('.ed-emojis').hidden = true;
    setMsg('');
    drawSongs();
    dlg.classList.remove('closing');
    dlg.showModal();
    (ed.id ? q('.ed-search') : q('.ed-name')).focus();
  }

  async function close(autosave) {
    stopPreview();
    if (autosave && ed && ed.dirty && (q('.ed-name').value.trim() || ed.songs.length)) {
      const ok = await save(true);
      if (!ok) return; // on garde la fenêtre ouverte pour corriger
    }
    if (reduce) { dlg.close(); return; }
    dlg.classList.add('closing');
    setTimeout(() => { dlg.classList.remove('closing'); dlg.close(); }, 200);
  }

  async function search(v) {
    const box = q('.ed-results');
    if (v.length < 2) { box.replaceChildren($('li', 'ed-empty', 'Tape le nom d’un son ou d’un artiste pour le trouver.')); return; }
    box.replaceChildren($('li', 'ed-empty', 'Recherche…'));
    let d;
    try { d = await api('/api/bt/search?q=' + encodeURIComponent(v)); } catch (err) { box.replaceChildren($('li', 'ed-empty', err.message)); return; }
    if (q('.ed-search').value.trim() !== v) return; // une autre recherche a été tapée depuis
    if (!d.results.length) { box.replaceChildren($('li', 'ed-empty', 'Aucun son trouvé. Essaie avec d’autres mots.')); return; }
    const have = new Set(ed.songs.map(key));
    const rows = d.results.map((r) => {
      const li = $('li', 'ed-row');
      li.append(cover(r, true));
      const t = $('div', 'ed-txt'); t.setAttribute('data-notranslate', '');
      t.append($('b', '', r.titre), $('span', '', r.artiste));
      const add = $('button', 'ed-add');
      add.type = 'button';
      const mark = () => { const inIt = ed.songs.some((x) => key(x) === key(r)); add.textContent = inIt ? '✓' : '+'; add.classList.toggle('done', inIt); add.setAttribute('aria-label', inIt ? `Retirer ${r.titre}` : `Ajouter ${r.titre}`); };
      add.onclick = () => {
        const i = ed.songs.findIndex((x) => key(x) === key(r));
        if (i >= 0) { removeSong(i); mark(); return; }
        if (ed.songs.length >= limits.songs) { setMsg(`${limits.songs} sons maximum par playlist.`, 'err'); return; }
        fly(li.querySelector('.ed-cover'), r);
        ed.songs.unshift({ titre: r.titre, artiste: r.artiste, cover: r.cover });
        ed.dirty = true;
        drawSongs(key(r));
        mark();
      };
      mark();
      li.append(t, add);
      if (have.has(key(r))) li.dataset.has = '1';
      return li;
    });
    box.replaceChildren(...rows);
    rows.forEach((li, i) => {
      if (reduce) { li.classList.add('in'); return; }
      li.style.transitionDelay = `${Math.min(i, 12) * 35}ms`;
      requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add('in')));
    });
  }

  function cover(r, withPlay) {
    const c = $('span', 'ed-cover');
    if (r.cover) { const i = $('img'); i.src = r.cover; i.alt = ''; i.loading = 'lazy'; c.append(i); } else c.append($('span', '', '🎵'));
    if (withPlay && r.preview) {
      const b = $('button'); b.type = 'button'; b.innerHTML = PLAY; b.setAttribute('aria-label', `Écouter ${r.titre}`);
      b.onclick = () => {
        if (playingBtn === b) { stopPreview(); return; }
        stopPreview();
        audio.src = r.preview; audio.volume = 0.8;
        audio.play().then(() => { playingBtn = b; b.innerHTML = PAUSE; b.classList.add('playing'); }).catch(() => {});
      };
      c.append(b);
    }
    return c;
  }

  // la pochette « vole » du résultat jusqu'au compteur de la playlist
  function fly(from, r) {
    if (reduce || !from) return;
    const target = q('.ed-count');
    const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    const f = $('div', 'ed-flyer');
    if (r.cover) f.style.backgroundImage = `url("${r.cover}")`; else f.textContent = '🎵';
    f.style.left = a.left + 'px'; f.style.top = a.top + 'px';
    document.body.append(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    f.animate([
      { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.15) rotate(-8deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(.25) rotate(6deg)`, opacity: 0.2 },
    ], { duration: 620, easing: 'cubic-bezier(.4, .0, .3, 1)' }).finished.then(() => f.remove(), () => f.remove());
  }

  function drawSongs(newKey) {
    const ul = q('.ed-songs');
    const count = q('.ed-count');
    if (count.textContent !== String(ed.songs.length)) {
      count.textContent = String(ed.songs.length);
      if (!reduce) { count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump'); }
    }
    if (!ed.songs.length) {
      ul.replaceChildren($('li', 'ed-empty', 'Ta playlist est vide. Ajoute au moins 4 sons pour pouvoir jouer.'));
      return;
    }
    ul.replaceChildren(...ed.songs.map((s, i) => {
      const li = $('li', 'ed-row' + (newKey && key(s) === newKey ? ' new' : ''));
      const t = $('div', 'ed-txt'); t.setAttribute('data-notranslate', '');
      t.append($('b', '', s.titre), $('span', '', s.artiste));
      const del = $('button', 'ed-del', '×'); del.type = 'button'; del.setAttribute('aria-label', `Retirer ${s.titre}`);
      del.onclick = () => removeSong(i, li);
      li.append($('span', 'num', String(i + 1)), cover(s, false), t, del);
      return li;
    }));
    if (newKey) ul.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  function removeSong(i, li) {
    const done = () => {
      ed.songs.splice(i, 1);
      ed.dirty = true;
      drawSongs();
      refreshMarks(); // le bouton « ✓ » des résultats redevient « + »
    };
    if (!li || reduce) { done(); return; }
    li.classList.add('gone');
    const h = li.offsetHeight;
    li.animate([{ height: h + 'px' }, { height: '0px', paddingTop: '0', paddingBottom: '0' }], { duration: 260, delay: 140, easing: 'ease-in' }).finished.then(done, done);
  }
  function refreshMarks() {
    const keys = new Set(ed.songs.map(key));
    q('.ed-results').querySelectorAll('.ed-row').forEach((row) => {
      const b = row.querySelector('.ed-add'); const t = row.querySelector('.ed-txt');
      if (!b || !t) return;
      const k = (t.querySelector('b').textContent + '|' + t.querySelector('span').textContent).toLowerCase();
      const inIt = keys.has(k);
      b.textContent = inIt ? '✓' : '+'; b.classList.toggle('done', inIt);
    });
  }

  async function save(quiet) {
    const name = q('.ed-name').value.trim();
    if (!name) { setMsg('Donne un nom à ta playlist.', 'err'); q('.ed-name').focus(); return false; }
    const btn = q('.ed-save');
    btn.disabled = true;
    setMsg('Enregistrement…');
    try {
      const d = await api('/api/playlists/save', { id: ed.id, name, emoji: ed.emoji, songs: ed.songs });
      ed.id = d.playlist.id; ed.dirty = false;
      q('.ed-delete').hidden = false;
      setMsg(ed.songs.length >= 4 ? 'Enregistrée ! Tu peux la jouer.' : `Enregistrée. Encore ${4 - ed.songs.length} son${4 - ed.songs.length > 1 ? 's' : ''} pour pouvoir jouer.`, 'ok');
      await load(false);
      window.btBridge && window.btBridge.reloadCats();
      if (!quiet && ed.songs.length >= 4) setTimeout(() => close(false), 700);
      return true;
    } catch (err) {
      setMsg(err.message, 'err');
      return false;
    } finally { btn.disabled = false; }
  }

  let delArmed = 0;
  async function del() {
    const b = q('.ed-delete');
    if (Date.now() - delArmed > 3000) { delArmed = Date.now(); b.textContent = 'Sûr ? Re-clique'; setTimeout(() => { b.textContent = 'Supprimer'; }, 3000); return; }
    delArmed = 0; b.textContent = 'Supprimer';
    try {
      await api('/api/playlists/delete', { id: ed.id });
      ed.dirty = false;
      await load(true);
      window.btBridge && window.btBridge.reloadCats();
      close(false);
    } catch (err) { setMsg(err.message, 'err'); }
  }

  load(true);
  window.addEventListener('account-changed', () => load(true));
})();
