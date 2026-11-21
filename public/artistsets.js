// Playlists d'artistes : on enregistre une sélection d'artistes, puis un clic les met tous dans le blind test.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const EMOJIS = ['⭐', '🎵', '🔥', '🎧', '💿', '🎤', '🌙', '⚡', '💜', '🚗', '🏖️', '🖤', '👑'];

  const css = `
  .as-row { margin: 0 0 1.1rem; }
  .as-row .lbl { display: flex; align-items: center; gap: .5rem; }
  .as-chips { display: flex; flex-wrap: wrap; gap: .45rem; }
  .as-chip { display: inline-flex; align-items: center; gap: .45rem; min-height: 2.6rem; padding: .25rem .5rem .25rem .8rem; border-radius: 999px; background: #232327; color: var(--blanc);
    font-size: .9rem; border: 0; cursor: pointer; transition: transform .18s cubic-bezier(.2, 1.4, .4, 1), background .2s; animation: asIn .35s cubic-bezier(.2, 1.3, .4, 1) both; animation-delay: calc(var(--i, 0) * 40ms); }
  .as-chip:hover { transform: translateY(-2px); background: #2c2c31; }
  .as-chip:active { transform: scale(.95); }
  .as-chip small { color: var(--gris); font-size: .75rem; }
  .as-chip .edit { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; border-radius: 50%; color: var(--gris); font-size: .85rem; }
  .as-chip .edit:hover { background: #3a3a40; color: var(--blanc); }
  .as-chip.on { background: var(--blanc); color: #0b0b0c; }
  .as-chip.on small { color: #555; }
  .as-chip.go { animation: asGo .7s ease; }
  .as-new { background: transparent; border: 1.5px dashed #4a4a52; color: var(--gris); padding-right: .9rem; }
  .as-new:hover { color: var(--blanc); border-color: var(--orange); background: transparent; }
  .as-save { background: rgba(242, 107, 58, .14); color: var(--orange); padding-right: .9rem; }
  @keyframes asIn { from { opacity: 0; transform: scale(.8); } }
  @keyframes asGo { 30% { transform: scale(1.08); box-shadow: 0 0 0 5px rgba(242, 107, 58, .35); } }
  .as-msg { min-height: 1.2rem; margin: .4rem 0 0; font-size: .82rem; color: var(--gris); }
  .as-msg.ok { color: #6fdc8c; }

  dialog.as-dialog { width: min(36rem, calc(100vw - 1.5rem)); max-height: min(44rem, calc(100vh - 2rem)); padding: 0; border: 0; border-radius: 26px; background: #141416; color: var(--blanc); overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.7); }
  dialog.as-dialog[open] { display: flex; flex-direction: column; animation: asPop .35s cubic-bezier(.2, 1.2, .4, 1); }
  dialog.as-dialog::backdrop { background: rgba(0,0,0,.6); backdrop-filter: blur(4px); }
  @keyframes asPop { from { opacity: 0; transform: translateY(20px) scale(.96); } }
  .as-d-head { padding: 1.3rem 1.4rem .8rem; background: linear-gradient(135deg, rgba(242, 107, 58, .2), transparent 70%); }
  .as-d-head h2 { margin: 0 0 .2rem; font: 800 1.35rem var(--texte); }
  .as-d-head p { margin: 0; color: var(--gris); font-size: .88rem; }
  .as-d-body { padding: .4rem 1.4rem 1rem; overflow-y: auto; display: grid; gap: .9rem; }
  .as-d-body label.l { display: block; margin-bottom: .35rem; font-size: .82rem; color: var(--gris); font-weight: 600; }
  .as-name { display: flex; gap: .5rem; }
  .as-name input, .as-search { flex: 1; min-width: 0; min-height: 2.8rem; padding: 0 .95rem; border-radius: 14px; border: 1px solid #2c2c31; background: #0b0b0c; color: var(--blanc); font: 500 .95rem var(--texte); }
  .as-name input:focus, .as-search:focus { outline: none; border-color: var(--orange); }
  .as-emo { position: relative; }
  .as-emo > button { min-height: 2.8rem; min-width: 2.8rem; padding: 0; border-radius: 14px; background: #232327; font-size: 1.3rem; }
  .as-emo-list { display: flex; flex-wrap: wrap; gap: .25rem; }
  .as-emo-list button { min-height: 2.2rem; min-width: 2.2rem; padding: 0; border-radius: 10px; background: transparent; font-size: 1.15rem; box-shadow: none; }
  .as-emo-list button[aria-pressed="true"] { background: #2c2c31; box-shadow: inset 0 0 0 2px var(--orange); }
  .as-cats { display: flex; flex-wrap: wrap; gap: .35rem; }
  .as-cats button { min-height: 2.3rem; padding: 0 .85rem; border-radius: 999px; background: #232327; color: var(--blanc); font-size: .84rem; }
  .as-cats button[aria-pressed="true"] { background: var(--blanc); color: #0b0b0c; }
  .as-artists { display: flex; flex-wrap: wrap; gap: .35rem; max-height: 15rem; overflow-y: auto; padding: .1rem; }
  .as-artists button { min-height: 2.2rem; padding: 0 .75rem; border-radius: 999px; background: #1d1d21; color: var(--gris); font-size: .84rem; border: 1px solid #2c2c31; transition: background .15s, color .15s, transform .15s; }
  .as-artists button[aria-pressed="true"] { background: var(--orange); border-color: var(--orange); color: #fff; animation: asTick .3s ease; }
  @keyframes asTick { 50% { transform: scale(1.08); } }
  .as-count { font-size: .82rem; color: var(--gris); }
  .as-count b { color: var(--orange); }
  .as-d-foot { display: flex; gap: .5rem; align-items: center; padding: .9rem 1.4rem 1.2rem; border-top: 1px solid #222226; }
  .as-d-foot .sp { flex: 1; }
  .as-d-foot button { min-height: 2.7rem; padding: 0 1.1rem; border-radius: 999px; font-weight: 600; }
  .as-d-foot .del { background: transparent; color: #ff8f8f; box-shadow: none; padding: 0 .6rem; }
  .as-d-foot .cancel { background: #232327; color: var(--blanc); }
  .as-d-foot .ok { background: var(--orange); color: #fff; }
  .as-err { margin: 0; color: var(--danger, #ff6b6b); font-size: .84rem; min-height: 1rem; }
  @media (prefers-reduced-motion: reduce) { .as-chip, dialog.as-dialog[open], .as-artists button[aria-pressed="true"], .as-chip.go { animation: none !important; } }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  let sets = null, loggedIn = true, max = 20;
  const rows = [];

  async function load() {
    try {
      const r = await fetch('/api/playlists/artists', { cache: 'no-store' });
      if (r.status === 401) { loggedIn = false; sets = []; return; }
      const d = await r.json(); sets = d.sets || []; max = d.max || 20; loggedIn = true;
    } catch { sets = sets || []; }
  }
  async function post(path, body) {
    const r = await fetch('/api/playlists/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Erreur, réessaie.');
    return d;
  }
  const bridge = () => window.btBridge;
  const catOf = (id) => (bridge()?.cats() || []).find((c) => c.id === id);

  function makeRow(where) {
    const row = el('div', 'as-row');
    const lbl = el('p', 'lbl', 'Mes playlists d’artistes');
    const chips = el('div', 'as-chips');
    const msg = el('p', 'as-msg'); msg.setAttribute('role', 'status');
    row.append(lbl, chips, msg);
    rows.push({ row, chips, msg, where });
    return row;
  }

  function paint() {
    for (const r of rows) {
      const cur = bridge()?.current() || {};
      const items = [];
      (sets || []).forEach((s, i) => {
        const b = el('button', 'as-chip'); b.type = 'button'; b.style.setProperty('--i', String(i));
        const on = cur.category === s.category && Array.isArray(cur.artists) && cur.artists.length === s.artists.length && s.artists.every((a) => cur.artists.includes(a));
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
        const cat = catOf(s.category);
        b.append(el('span', '', s.emoji), el('span', '', s.name), el('small', '', `${s.artists.length} artiste${s.artists.length > 1 ? 's' : ''}${cat ? ' · ' + cat.nom : ''}`));
        b.setAttribute('data-notranslate', '');
        const ed = el('span', 'edit', '✎'); ed.setAttribute('role', 'button'); ed.setAttribute('aria-label', 'Modifier ' + s.name); ed.tabIndex = 0;
        ed.onclick = (e) => { e.stopPropagation(); editor(s); };
        ed.onkeydown = (e) => { if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); editor(s); } };
        b.append(ed);
        b.onclick = () => apply(s, b, r.msg);
        items.push(b);
      });
      // « enregistrer la sélection actuelle » quand on a coché des artistes à la main
      if (loggedIn && Array.isArray(cur.artists) && cur.artists.length && catOf(cur.category) && !catOf(cur.category).playlist
        && !(sets || []).some((s) => s.category === cur.category && s.artists.length === cur.artists.length && s.artists.every((a) => cur.artists.includes(a)))) {
        const sv = el('button', 'as-chip as-save', '💾 Enregistrer cette sélection'); sv.type = 'button';
        sv.onclick = () => editor({ category: cur.category, artists: cur.artists });
        items.push(sv);
      }
      const nw = el('button', 'as-chip as-new', '+ Nouvelle playlist d’artistes'); nw.type = 'button';
      nw.onclick = () => {
        if (!loggedIn) { r.msg.className = 'as-msg'; r.msg.textContent = 'Connecte-toi pour créer tes playlists d’artistes.'; return; }
        editor(null);
      };
      items.push(nw);
      r.chips.replaceChildren(...items);
    }
  }

  async function apply(s, btn, msg) {
    const cat = catOf(s.category);
    msg.className = 'as-msg';
    if (!cat) { msg.textContent = 'Cette catégorie n’existe plus.'; return; }
    const known = new Set((cat.artists || []).map((a) => a.nom));
    const artists = s.artists.filter((a) => known.has(a));
    if (!artists.length) { msg.textContent = 'Aucun de ces artistes n’est encore dans le blind test.'; return; }
    try {
      await bridge().applyArtists(s.category, artists);
      btn.classList.remove('go'); void btn.offsetWidth; btn.classList.add('go');
      msg.className = 'as-msg ok';
      msg.textContent = `${s.emoji} ${artists.length} artiste${artists.length > 1 ? 's' : ''} chargé${artists.length > 1 ? 's' : ''} : ${artists.slice(0, 3).join(', ')}${artists.length > 3 ? '…' : ''}`;
      paint();
    } catch (err) { msg.textContent = err.message; }
  }

  // --- l'éditeur ---
  let dlg = null;
  function editor(s) {
    if (!dlg) { dlg = el('dialog', 'as-dialog'); dlg.setAttribute('aria-labelledby', 'asTitle'); document.body.append(dlg); dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); }
    const editing = s && s.id ? s : null;
    const cats = (bridge()?.cats() || []).filter((c) => !c.playlist && c.artists && c.artists.length);
    let category = (s && s.category) || bridge()?.current().category;
    if (!cats.some((c) => c.id === category)) category = cats[0] && cats[0].id;
    let chosen = new Set((s && s.artists) || []);
    let emoji = (s && s.emoji) || '⭐';
    let q = '';

    const head = el('div', 'as-d-head');
    const h = el('h2', '', editing ? 'Modifier la playlist d’artistes' : 'Nouvelle playlist d’artistes'); h.id = 'asTitle';
    head.append(h, el('p', '', 'Coche tes artistes une fois. Ensuite, un clic les met tous dans le blind test.'));
    const body = el('div', 'as-d-body');
    // nom + emoji
    const nameBox = el('div');
    const nl = el('label', 'l', 'Nom'); nl.htmlFor = 'asName';
    const nameRow = el('div', 'as-name');
    const name = el('input'); name.id = 'asName'; name.maxLength = 40; name.placeholder = 'Ex. Mes rappeurs préférés'; name.value = (s && s.name) || ''; name.setAttribute('data-notranslate', '');
    nameRow.append(name);
    nameBox.append(nl, nameRow);
    const emoBox = el('div');
    emoBox.append(el('span', 'l', 'Icône'));
    const emoList = el('div', 'as-emo-list'); emoList.setAttribute('role', 'group'); emoList.setAttribute('aria-label', 'Icône');
    const drawEmo = () => emoList.replaceChildren(...EMOJIS.map((e) => { const b = el('button', '', e); b.type = 'button'; b.setAttribute('aria-pressed', String(e === emoji)); b.onclick = () => { emoji = e; drawEmo(); }; return b; }));
    drawEmo();
    emoBox.querySelector('.l').className = 'l';
    emoBox.append(emoList);
    // catégorie
    const catBox = el('div');
    catBox.append(el('span', 'l', 'Catégorie'));
    const catRow = el('div', 'as-cats');
    catBox.append(catRow);
    // artistes
    const artBox = el('div');
    const artHead = el('div'); artHead.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:.5rem';
    const count = el('span', 'as-count');
    artHead.append(el('span', 'l', 'Artistes'), count);
    const search = el('input', 'as-search'); search.type = 'search'; search.placeholder = 'Chercher un artiste'; search.setAttribute('aria-label', 'Chercher un artiste'); search.style.marginBottom = '.5rem';
    const artRow = el('div', 'as-artists'); artRow.setAttribute('role', 'group'); artRow.setAttribute('aria-label', 'Artistes');
    artBox.append(artHead, search, artRow);
    const err = el('p', 'as-err'); err.setAttribute('role', 'alert');
    body.append(nameBox, emoBox, catBox, artBox, err);

    const drawCats = () => catRow.replaceChildren(...cats.map((c) => {
      const b = el('button', '', c.nom); b.type = 'button'; b.setAttribute('aria-pressed', String(c.id === category));
      b.onclick = () => { if (c.id !== category) { category = c.id; chosen = new Set(); q = ''; search.value = ''; drawCats(); drawArtists(); } };
      return b;
    }));
    const drawArtists = () => {
      const cat = cats.find((c) => c.id === category);
      const list = (cat ? cat.artists : []).slice().sort((x, y) => x.nom.localeCompare(y.nom, 'fr', { sensitivity: 'base', numeric: true }));
      artRow.replaceChildren(...list.filter((a) => !q || a.nom.toLowerCase().includes(q)).map((a) => {
        const b = el('button', '', a.nom); b.type = 'button'; b.setAttribute('aria-pressed', String(chosen.has(a.nom))); b.setAttribute('data-notranslate', '');
        b.onclick = () => { if (chosen.has(a.nom)) chosen.delete(a.nom); else chosen.add(a.nom); b.setAttribute('aria-pressed', String(chosen.has(a.nom))); drawCount(); };
        return b;
      }));
      search.hidden = list.length < 12;
      drawCount();
    };
    const drawCount = () => {
      const cat = cats.find((c) => c.id === category);
      const songs = (cat ? cat.artists : []).filter((a) => chosen.has(a.nom)).reduce((n, a) => n + a.count, 0);
      count.replaceChildren(el('b', '', String(chosen.size)), document.createTextNode(` choisi${chosen.size > 1 ? 's' : ''}${songs ? `, ${songs} sons` : ''}`));
    };
    search.oninput = () => { q = search.value.trim().toLowerCase(); drawArtists(); };
    drawCats(); drawArtists();

    const foot = el('div', 'as-d-foot');
    if (editing) {
      const del = el('button', 'del', 'Supprimer'); del.type = 'button';
      del.onclick = async () => {
        if (del.dataset.sure !== '1') { del.dataset.sure = '1'; del.textContent = 'Sûr ? Clique encore'; return; }
        try { const d = await post('artists/delete', { id: editing.id }); sets = d.sets; dlg.close(); paint(); } catch (e) { err.textContent = e.message; }
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
        const d = await post('artists/save', { id: editing ? editing.id : undefined, name: name.value.trim(), emoji, category, artists: [...chosen] });
        sets = d.sets;
        dlg.close();
        paint();
        // on la charge tout de suite dans la partie
        const r = rows.find((x) => x.where === (bridge()?.inLobby() ? 'lobby' : 'home')) || rows[0];
        const btn = r && [...r.chips.children].find((b) => b.textContent.includes(d.set.name));
        if (r && btn) apply(d.set, btn, r.msg);
      } catch (e) { err.textContent = e.message; } finally { ok.disabled = false; }
    };
    foot.append(cancel, ok);
    dlg.replaceChildren(head, body, foot);
    dlg.showModal();
    if (!reduce && matchMedia('(hover: hover)').matches) name.focus();
  }

  async function init() {
    const create = document.getElementById('createBox');
    if (create && !create.querySelector('.as-row')) create.querySelector('h2').after(makeRow('home'));
    const host = document.getElementById('hostSettings');
    if (host && !host.querySelector('.as-row')) host.prepend(makeRow('lobby'));
    await load();
    paint();
    // repeindre quand la sélection change (la catégorie ou les artistes cochés)
    let sig = '';
    setInterval(() => {
      const c = bridge()?.current() || {};
      const s = c.category + '|' + (Array.isArray(c.artists) ? c.artists.join(',') : '*');
      if (s !== sig) { sig = s; paint(); }
    }, 600);
    window.addEventListener('account-changed', async () => { await load(); paint(); });
  }
  if (window.btBridge) init(); else window.addEventListener('bt-ready', init, { once: true });
})();
