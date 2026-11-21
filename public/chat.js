// Messagerie entre amis : une fenêtre « Messages » (liste des conversations + discussion).
// Utilisable partout : window.openChat() ouvre la liste, window.openChat('pseudo') ouvre la discussion.
(() => {
  const css = `
  dialog.chat {
    width: min(26rem, calc(100vw - 1rem)); height: min(40rem, calc(100dvh - 1rem)); max-height: none; padding: 0;
    display: none; flex-direction: column; overflow: hidden;
    background: #1d1c21; color: var(--blanc); border: 0; border-radius: 10px; box-shadow: 0 24px 60px rgba(0,0,0,.7);
  }
  dialog.chat[open] { display: flex; animation: chatIn .25s cubic-bezier(.2, .9, .3, 1.1); }
  dialog.chat::backdrop { background: rgba(10, 10, 12, .7); }
  @keyframes chatIn { from { transform: translateY(14px); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { dialog.chat[open] { animation: none; } }
  @media (max-width: 34rem) { dialog.chat { width: 100vw; height: 100dvh; max-width: 100vw; border-radius: 0; margin: 0; } }
  .ch-head { display: flex; align-items: center; gap: .6rem; padding: .7rem .8rem; border-bottom: 1px solid var(--ligne); background: #18171c; }
  .ch-head h2 { margin: 0; font: 800 1.35rem/1 var(--texte); letter-spacing: -.02em; }
  .ch-head .ch-close { margin-left: auto; }
  .ch-icon { min-height: 2.3rem; min-width: 2.3rem; padding: 0 .55rem; display: inline-flex; align-items: center; justify-content: center; gap: .3rem; font-size: .9rem; }
  .ch-icon svg { width: 1.1rem; height: 1.1rem; }
  .ch-who { display: flex; align-items: center; gap: .55rem; min-width: 0; background: none; border: 0; box-shadow: none; padding: 0; color: inherit; text-align: left; cursor: pointer; min-height: 2.4rem; }
  .ch-who:active { transform: none; background: none; box-shadow: none; }
  .ch-who b { display: block; font-size: 1.02rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ch-who small { display: block; color: var(--gris); font-size: .78rem; }
  .ch-who small.on { color: #6fdc8c; }
  .ch-who small.game { color: #ffb15c; }
  .ch-av { position: relative; flex: none; width: 2.3rem; height: 2.3rem; border-radius: 50%; background: #34333b; display: grid; place-items: center; font-weight: 800; overflow: hidden; }
  .ch-av img { width: 100%; height: 100%; object-fit: cover; }
  .ch-av i { position: absolute; right: 0; bottom: 0; width: .65rem; height: .65rem; border-radius: 50%; background: #3fbf6a; border: 2px solid #1d1c21; }
  .ch-av i.game { background: var(--orange); }
  .ch-body { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .ch-list { list-style: none; margin: 0; padding: .3rem 0; }
  .ch-row { display: flex; align-items: center; gap: .7rem; width: 100%; padding: .65rem .9rem; min-height: 3.6rem; background: none; border: 0; border-radius: 0; box-shadow: none; color: inherit; text-align: left; cursor: pointer; font: inherit; }
  .ch-row:hover { background: #24232a; }
  .ch-row:active { transform: none; background: #2a2930; box-shadow: none; }
  .ch-row .ch-mid { flex: 1; min-width: 0; }
  .ch-row .ch-name { display: flex; justify-content: space-between; gap: .5rem; font-weight: 700; }
  .ch-row .ch-name time { color: var(--gris); font-weight: 500; font-size: .75rem; flex: none; }
  .ch-row .ch-prev { color: var(--gris); font-size: .86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ch-row.unread .ch-prev { color: var(--blanc); font-weight: 600; }
  .ch-badge { flex: none; min-width: 1.3rem; height: 1.3rem; padding: 0 .35rem; border-radius: 999px; background: var(--orange); color: #1b1b22; font: 800 .75rem/1.3rem var(--texte); text-align: center; }
  .ch-sub { margin: 1rem .9rem .3rem; color: var(--gris); font-size: .8rem; font-weight: 600; }
  .ch-empty { margin: 2.5rem 1.4rem; color: var(--gris); text-align: center; font-size: .95rem; }
  .ch-msgs { display: flex; flex-direction: column; gap: .2rem; padding: .8rem .8rem 1rem; }
  .ch-day { align-self: center; margin: .8rem 0 .4rem; padding: .15rem .6rem; border-radius: 999px; background: #26252c; color: var(--gris); font-size: .74rem; }
  .ch-msg { max-width: 80%; padding: .45rem .7rem; border-radius: 14px; white-space: pre-wrap; overflow-wrap: anywhere; font-size: .96rem; line-height: 1.35; }
  .ch-msg.them { align-self: flex-start; background: #2c2b32; border-bottom-left-radius: 4px; }
  .ch-msg.me { align-self: flex-end; background: var(--orange); color: #1b1b22; border-bottom-right-radius: 4px; }
  .ch-msg.sending { opacity: .6; }
  .ch-msg + .ch-msg.them.first, .ch-msg + .ch-msg.me.first { margin-top: .45rem; }
  .ch-time { font-size: .7rem; color: var(--gris); margin: .1rem .3rem .2rem; }
  .ch-time.me { align-self: flex-end; }
  .ch-time.them { align-self: flex-start; }
  .ch-form { display: flex; align-items: flex-end; gap: .5rem; padding: .6rem .7rem calc(.6rem + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--ligne); background: #18171c; }
  .ch-form[hidden] { display: none; }
  .ch-form textarea {
    flex: 1; min-height: 2.6rem; max-height: 8rem; resize: none; padding: .55rem .8rem; border: 1px solid var(--ligne); border-radius: 18px;
    background: #121115; color: var(--blanc); font: 400 1rem/1.35 var(--texte); font-stretch: 95%;
  }
  .ch-form textarea:focus { outline: none; border-color: var(--orange); }
  .ch-form button { min-height: 2.6rem; min-width: 2.6rem; padding: 0 .8rem; border-radius: 999px; }
  .ch-form button svg { width: 1.15rem; height: 1.15rem; }
  .ch-note { padding: 0 .9rem .5rem; color: var(--gris); font-size: .78rem; min-height: 0; }
  .ch-note:empty { display: none; }
  .ch-note.err { color: var(--danger, #ff8a7a); }
  /* messages vocaux */
  .ch-form .ch-mic[hidden], .ch-form .ch-send[hidden] { display: none; }
  .ch-rec { flex: 1; display: flex; align-items: center; gap: .6rem; min-height: 2.6rem; padding: 0 .4rem; }
  .ch-rec[hidden] { display: none; }
  .ch-rec .dot { width: .7rem; height: .7rem; border-radius: 50%; background: #e2412b; animation: recDot 1s ease-in-out infinite; }
  @keyframes recDot { 50% { opacity: .25; } }
  .ch-rec .t { font-variant-numeric: tabular-nums; font-weight: 700; }
  .ch-rec .lvl { flex: 1; height: 4px; border-radius: 2px; background: #2c2b32; overflow: hidden; }
  .ch-rec .lvl i { display: block; height: 100%; width: 0; background: #e2412b; transition: width .08s linear; }
  .ch-form.recording textarea { display: none; }
  .ch-msg.voice { display: flex; align-items: center; gap: .55rem; min-width: 12.5rem; padding: .35rem .7rem .35rem .4rem; white-space: normal; }
  .ch-play { flex: none; width: 2.2rem; height: 2.2rem; min-height: 0; padding: 0; border-radius: 50%; display: grid; place-items: center; }
  .ch-msg.me .ch-play { background: #1b1b22; color: var(--orange); border-color: #1b1b22; box-shadow: none; }
  .ch-play svg { width: .95rem; height: .95rem; }
  .ch-wave { flex: 1; height: 1.6rem; display: flex; align-items: center; gap: 2px; cursor: pointer; }
  .ch-wave i { flex: 1; min-width: 2px; border-radius: 1px; background: currentColor; opacity: .35; transition: opacity .12s; }
  .ch-wave i.done { opacity: 1; }
  .ch-dur { flex: none; font-size: .78rem; font-variant-numeric: tabular-nums; opacity: .85; }
  @media (prefers-reduced-motion: reduce) { .ch-rec .dot { animation: none; } }
  .fb-msg { position: absolute; top: -.2rem; left: -.2rem; min-width: 1.35rem; height: 1.35rem; padding: 0 .3rem; border-radius: 999px; background: var(--orange); color: #1b1b22; font: 800 .78rem/1.35rem var(--texte); text-align: center; border: 2px solid var(--mur); }
  .fb-msg:empty { display: none; }
  .invite-toast[data-key^="msg:"] { border-left-color: var(--orange); }
  .ch-row { box-sizing: border-box; overflow: hidden; }
  .ch-row .ch-mid { overflow: hidden; }
  /* ----- téléphone : plein écran, grosses zones à toucher, le clavier ne cache plus la zone d'écriture ----- */
  @media (max-width: 34rem) {
    dialog.chat { inset: 0 auto auto 0; width: 100vw; height: var(--ch-vh, 100dvh); max-height: none; border-radius: 0; background: #121214; }
    dialog.chat[open] { animation: chatUp .3s cubic-bezier(.2, .9, .3, 1); }
    @keyframes chatUp { from { transform: translateY(40px); opacity: 0; } }
    .ch-head { padding: calc(.7rem + env(safe-area-inset-top, 0px)) .9rem .7rem; gap: .7rem; background: #121214; border-bottom-color: #232327; }
    .ch-head h2 { font-size: 1.7rem; }
    .ch-icon { min-height: 2.75rem; min-width: 2.75rem; border-radius: 50%; }
    .ch-av { width: 2.6rem; height: 2.6rem; }
    .ch-row { min-height: 4.6rem; padding: .7rem 1rem; gap: .85rem; }
    .ch-row .ch-av { width: 3.2rem; height: 3.2rem; font-size: 1.15rem; }
    .ch-row .ch-name { font-size: 1.02rem; }
    .ch-row .ch-prev { font-size: .9rem; margin-top: .15rem; }
    .ch-row + .ch-row { border-top: 1px solid #1d1d21; }
    .ch-badge { min-width: 1.5rem; height: 1.5rem; line-height: 1.5rem; font-size: .8rem; }
    .ch-sub { margin: 1.3rem 1rem .4rem; font-size: .85rem; }
    .ch-msgs { padding: .8rem .75rem 1.2rem; gap: .25rem; }
    .ch-msg { max-width: 84%; font-size: 1rem; padding: .55rem .8rem; border-radius: 18px; }
    .ch-form { padding: .55rem .6rem calc(.55rem + env(safe-area-inset-bottom, 0px)); gap: .45rem; background: #121214; border-top-color: #232327; }
    .ch-form textarea { font-size: 16px; min-height: 2.9rem; padding: .7rem 1rem; border-radius: 22px; } /* 16px : l'iPhone ne zoome plus */
    .ch-form button { min-height: 2.9rem; min-width: 2.9rem; padding: 0; }
    .ch-msg.voice { min-width: 13.5rem; }
    .ch-play { width: 2.5rem; height: 2.5rem; }
    .ch-rec { min-height: 2.9rem; }
  }
  .invite-toast[data-key^="msg:"] small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 16rem; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const SVG = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>',
  };
  const iconBtn = (svg, label, cls) => { const b = $('button', 'ghost ch-icon ' + (cls || '')); b.type = 'button'; b.innerHTML = svg; b.setAttribute('aria-label', label); b.title = label; return b; };

  const MAX = 500;
  let loggedIn = null;     // null = pas encore vérifié
  let dialog, head, body, form, input, note, recBox, syncButtons = () => {};
  let view = 'list';       // 'list' ou 'conv'
  let current = null;      // pseudo de la discussion ouverte
  let conv = null;         // { username, messages, seenAt, ... }
  let poll = null;
  let known = new Map();   // pseudo (minuscules) -> nombre de non lus déjà signalés

  // --- dates ---
  const time = (at) => new Date(at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dayKey = (at) => new Date(at).toDateString();
  function dayLabel(at) {
    const d = new Date(at), now = new Date();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Aujourd’hui';
    if (d.toDateString() === y.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function shortWhen(at) {
    const d = new Date(at), now = new Date();
    if (d.toDateString() === now.toDateString()) return time(at);
    const diff = (now - d) / 86_400_000;
    if (diff < 6) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  const status = (p) => (p.inBlindtest ? ['En blind test', 'game'] : p.online ? ['En ligne', 'on'] : ['Hors ligne', '']);

  function avatar(name, url, p) {
    const a = $('span', 'ch-av');
    a.setAttribute('aria-hidden', 'true');
    if (url) { const img = $('img'); img.src = url; img.alt = ''; img.loading = 'lazy'; a.append(img); } else a.textContent = name.replace(/^@/, '').slice(0, 1).toUpperCase();
    if (p && (p.online || p.inBlindtest)) a.append($('i', p.inBlindtest ? 'game' : ''));
    return a;
  }

  async function api(url, body) {
    const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur réseau, réessaie.'), { status: res.status });
    return data;
  }

  // --- la fenêtre ---
  function build() {
    dialog = $('dialog', 'chat');
    dialog.setAttribute('aria-label', 'Messages');
    head = $('div', 'ch-head');
    body = $('div', 'ch-body');
    note = $('p', 'ch-note');
    note.setAttribute('role', 'status');
    form = $('form', 'ch-form');
    input = $('textarea');
    input.rows = 1;
    input.maxLength = MAX;
    input.placeholder = 'Écris un message…';
    input.setAttribute('aria-label', 'Ton message');
    input.setAttribute('data-notranslate', '');
    const send = $('button', 'ch-send');
    send.type = 'submit';
    send.innerHTML = SVG.send;
    send.setAttribute('aria-label', 'Envoyer');
    send.title = 'Envoyer';
    // micro : visible quand la zone de texte est vide (comme sur WhatsApp)
    const mic = $('button', 'ch-mic');
    mic.type = 'button';
    mic.innerHTML = SVG.mic;
    mic.setAttribute('aria-label', 'Enregistrer un message vocal');
    mic.title = 'Message vocal';
    mic.onclick = startRecording;
    recBox = $('div', 'ch-rec');
    recBox.hidden = true;
    form.append(input, recBox, mic, send);
    syncButtons = () => {
      const typing = input.value.trim().length > 0;
      mic.hidden = typing || Boolean(rec) || !canRecord();
      send.hidden = !typing && !rec && canRecord();
    };
    syncButtons();
    dialog.append(head, body, note, form);
    document.body.append(dialog);

    // la zone de texte grandit avec le message ; Entrée envoie, Maj + Entrée va à la ligne
    input.addEventListener('input', () => {
      syncButtons();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight + 2, 128) + 'px';
      const left = MAX - input.value.length;
      if (left <= 50) setNote(`${left} caractère${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`);
      else if (!note.classList.contains('err')) setNote('');
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); if (rec) stopRecording(true); else sendMessage(); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { stopRecording(false); stopVoice(); stopPoll(); current = null; conv = null; refreshBadge(); });
  }

  function setNote(text, err) { note.textContent = text; note.classList.toggle('err', Boolean(err)); }
  function stopPoll() { clearInterval(poll); poll = null; }

  // --- liste des conversations ---
  async function showList() {
    stopRecording(false); stopVoice();
    view = 'list'; current = null; conv = null;
    stopPoll();
    form.hidden = true;
    setNote('');
    const close = iconBtn(SVG.close, 'Fermer', 'ch-close');
    close.onclick = () => dialog.close();
    head.replaceChildren($('h2', '', 'Messages'), close);
    if (!body.querySelector('.ch-list, .ch-empty')) body.replaceChildren($('p', 'ch-empty', 'Chargement…'));
    await drawList();
    poll = setInterval(() => { if (document.visibilityState === 'visible') drawList(); }, 8000);
  }

  async function drawList() {
    let d, f;
    try { [d, f] = await Promise.all([api('/api/messages'), api('/api/friends').catch(() => ({ friends: [] }))]); }
    catch (err) { body.replaceChildren($('p', 'ch-empty', err.message)); return; }
    if (view !== 'list') return;
    const ul = $('ul', 'ch-list');
    for (const c of d.conversations) {
      const li = $('li');
      const row = $('button', 'ch-row' + (c.unread ? ' unread' : ''));
      row.type = 'button';
      const mid = $('span', 'ch-mid');
      const name = $('span', 'ch-name');
      const nm = $('span', '', c.username); nm.setAttribute('data-notranslate', '');
      const t = $('time', '', shortWhen(c.at));
      name.append(nm, t);
      const prev = $('span', 'ch-prev');
      prev.setAttribute('data-notranslate', '');
      prev.textContent = (c.fromMe ? 'Toi : ' : '') + c.text;
      mid.append(name, prev);
      row.append(avatar(c.username, c.avatarUrl, c), mid);
      if (c.unread) row.append($('span', 'ch-badge', String(c.unread)));
      row.setAttribute('aria-label', `${c.username}${c.unread ? `, ${c.unread} non lu${c.unread > 1 ? 's' : ''}` : ''}`);
      row.onclick = () => showConv(c.username);
      li.append(row);
      ul.append(li);
    }
    // les amis à qui on n'a pas encore écrit
    const talked = new Set(d.conversations.map((c) => c.username.toLowerCase()));
    const others = (f.friends || []).filter((x) => !talked.has(x.username.toLowerCase()));
    const parts = [];
    if (d.conversations.length) parts.push(ul);
    if (others.length) {
      parts.push($('p', 'ch-sub', d.conversations.length ? 'Écrire à un ami' : 'Choisis un ami pour lui écrire'));
      const ul2 = $('ul', 'ch-list');
      for (const x of others) {
        const li = $('li');
        const row = $('button', 'ch-row');
        row.type = 'button';
        const mid = $('span', 'ch-mid');
        const nm = $('span', 'ch-name'); const s = $('span', '', x.username); s.setAttribute('data-notranslate', ''); nm.append(s);
        const [label] = status(x);
        mid.append(nm, $('span', 'ch-prev', label));
        row.append(avatar(x.username, x.avatarUrl, x), mid);
        row.onclick = () => showConv(x.username);
        li.append(row);
        ul2.append(li);
      }
      parts.push(ul2);
    }
    if (!parts.length) parts.push($('p', 'ch-empty', 'Ajoute des amis pour pouvoir leur écrire. Tu les trouves dans la fenêtre Amis.'));
    body.replaceChildren(...parts);
    applyUnread(d);
  }

  // --- une discussion ---
  async function showConv(name) {
    stopRecording(false); stopVoice();
    view = 'conv'; current = name; conv = null;
    stopPoll();
    setNote('');
    form.hidden = false;
    input.value = ''; input.style.height = ''; syncButtons();
    const back = iconBtn(SVG.back, 'Retour aux messages');
    back.onclick = showList;
    const close = iconBtn(SVG.close, 'Fermer', 'ch-close');
    close.onclick = () => dialog.close();
    head.replaceChildren(back, $('span', 'ch-who'), close);
    body.replaceChildren($('p', 'ch-empty', 'Chargement…'));
    try {
      conv = await api('/api/messages/with?username=' + encodeURIComponent(name));
    } catch (err) {
      body.replaceChildren($('p', 'ch-empty', err.message));
      form.hidden = true;
      return;
    }
    if (current !== name) return;
    current = conv.username;
    drawHead();
    drawMessages(true);
    if (!conv.friend) { form.hidden = true; setNote('Vous n’êtes plus amis : tu peux relire la discussion, mais plus écrire.'); }
    else if (matchMedia('(hover: hover)').matches) input.focus();
    known.set(current.toLowerCase(), 0);
    refreshBadge();
    poll = setInterval(() => { if (document.visibilityState === 'visible') pullNew(); }, 2500);
  }

  function drawHead() {
    const who = $('button', 'ch-who');
    who.type = 'button';
    who.title = 'Afficher le profil';
    const txt = $('span');
    const b = $('b', '', conv.username); b.setAttribute('data-notranslate', '');
    const [label, cls] = status(conv);
    txt.append(b, $('small', cls, label));
    who.append(avatar(conv.username, conv.avatarUrl, conv), txt);
    who.onclick = () => window.openProfile && window.openProfile(conv.username);
    head.children[1].replaceWith(who);
  }

  function drawMessages(toBottom) {
    const wasBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 60;
    const box = $('div', 'ch-msgs');
    if (!conv.messages.length) {
      body.replaceChildren($('p', 'ch-empty', `Dis bonjour à ${conv.username} !`));
      return;
    }
    let lastDay = '', prev = null;
    const lastMine = [...conv.messages].reverse().find((m) => m.fromMe && !m.sending);
    conv.messages.forEach((m, i) => {
      if (dayKey(m.at) !== lastDay) { lastDay = dayKey(m.at); box.append($('span', 'ch-day', dayLabel(m.at))); prev = null; }
      const who = m.fromMe ? 'me' : 'them';
      const first = !prev || prev.fromMe !== m.fromMe || m.at - prev.at > 5 * 60_000;
      const el = m.voice ? voiceBubble(m, who, first) : $('div', `ch-msg ${who}${first ? ' first' : ''}${m.sending ? ' sending' : ''}`, m.text);
      el.setAttribute('data-notranslate', '');
      el.title = time(m.at);
      box.append(el);
      const next = conv.messages[i + 1];
      // l'heure sous le dernier message d'une série ; « Vu » sous mon dernier message lu
      if (!next || next.fromMe !== m.fromMe || next.at - m.at > 5 * 60_000 || dayKey(next.at) !== dayKey(m.at)) {
        let t = m.sending ? 'Envoi…' : time(m.at);
        if (m === lastMine && conv.seenAt >= m.at) t += ' · Vu';
        box.append($('span', 'ch-time ' + who, t));
      }
      prev = m;
    });
    body.replaceChildren(box);
    if (toBottom || wasBottom) body.scrollTop = body.scrollHeight;
  }

  async function pullNew() {
    if (view !== 'conv' || !conv) return;
    const name = current;
    const last = conv.messages.filter((m) => !m.sending).at(-1);
    try {
      const d = await api(`/api/messages/with?username=${encodeURIComponent(name)}&after=${last ? last.at : 0}`);
      if (current !== name || !conv) return;
      const changed = d.messages.length || d.seenAt !== conv.seenAt || d.online !== conv.online || d.inBlindtest !== conv.inBlindtest;
      Object.assign(conv, { seenAt: d.seenAt, online: d.online, inBlindtest: d.inBlindtest, friend: d.friend });
      if (d.messages.length) {
        const have = new Set(conv.messages.map((m) => m.at));
        conv.messages.push(...d.messages.filter((m) => !have.has(m.at)));
        conv.messages.sort((a, b) => a.at - b.at);
      }
      if (changed) { drawHead(); drawMessages(false); }
    } catch { /* on réessaiera */ }
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || !conv) return;
    const name = current;
    const temp = { fromMe: true, text, at: Date.now(), sending: true };
    conv.messages.push(temp);
    input.value = ''; input.style.height = ''; syncButtons();
    setNote('');
    drawMessages(true);
    try {
      const d = await api('/api/messages/send', { username: name, text });
      if (current !== name) return;
      Object.assign(temp, d.message, { sending: false });
      drawMessages(true);
    } catch (err) {
      conv.messages = conv.messages.filter((m) => m !== temp);
      if (current !== name) return;
      input.value = text; syncButtons();
      setNote(err.message, true);
      drawMessages(true);
    }
  }

  // --- messages vocaux : enregistrer ---
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  const canRecord = () => Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const MAX_SEC = 120;
  let rec = null; // { recorder, stream, chunks, start, timer, ctx, raf }

  async function startRecording() {
    if (rec || !conv) return;
    setNote('');
    let stream;
    try {
      // voix nette : micro en mono 48 kHz, réduction de bruit, écho et volume automatique
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 48000, sampleSize: 16, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (err) {
      setNote(err && err.name === 'NotAllowedError'
        ? 'Autorise le micro dans ton navigateur pour envoyer des messages vocaux.'
        : 'Impossible d’utiliser le micro sur cet appareil.', true);
      return;
    }
    // le format que le navigateur sait faire (Chrome/Firefox : webm, Safari : mp4)
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    // 64 kbit/s en Opus : une voix claire (avant : 32 kbit/s, la voix sonnait comme au téléphone)
    const recorder = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 64000 } : { audioBitsPerSecond: 64000 });
    rec = { recorder, stream, chunks: [], start: Date.now(), send: false };
    recorder.ondataavailable = (e) => { if (e.data && e.data.size) rec && rec.chunks.push(e.data); };
    recorder.onstop = () => finishRecording();
    recorder.start(250);
    // l'écran pendant l'enregistrement : point rouge, chrono, niveau du micro, poubelle
    const dot = $('span', 'dot'); dot.setAttribute('aria-hidden', 'true');
    const t = $('span', 't', '0:00');
    const lvl = $('span', 'lvl'); const bar = $('i'); lvl.append(bar);
    const cancel = iconBtn(SVG.trash, 'Annuler l’enregistrement');
    cancel.onclick = () => stopRecording(false);
    recBox.replaceChildren(cancel, dot, t, lvl);
    recBox.hidden = false;
    form.classList.add('recording');
    syncButtons();
    setNote('Enregistrement… appuie sur la flèche pour envoyer.');
    rec.timer = setInterval(() => {
      const sec = (Date.now() - rec.start) / 1000;
      t.textContent = fmt(sec);
      if (sec >= MAX_SEC) stopRecording(true);
    }, 200);
    try { // petite barre qui bouge avec la voix
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const an = ac.createAnalyser(); an.fftSize = 256;
      ac.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      const tick = () => {
        if (!rec) return;
        an.getByteTimeDomainData(data);
        let peak = 0; for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        bar.style.width = Math.min(100, peak * 1.6) + '%';
        rec.raf = requestAnimationFrame(tick);
      };
      rec.ctx = ac; tick();
    } catch { /* pas grave */ }
  }

  function stopRecording(sendIt) {
    if (!rec) return;
    rec.send = sendIt;
    rec.duration = Math.round((Date.now() - rec.start) / 1000);
    clearInterval(rec.timer);
    cancelAnimationFrame(rec.raf);
    try { rec.ctx && rec.ctx.close(); } catch {}
    if (rec.recorder.state !== 'inactive') rec.recorder.stop(); else finishRecording();
    rec.stream.getTracks().forEach((tr) => tr.stop());
    recBox.hidden = true;
    form.classList.remove('recording');
  }

  async function finishRecording() {
    const r = rec;
    rec = null;
    syncButtons();
    if (!r || !r.send) { setNote(''); return; }
    if (r.duration < 1) { setNote('Message vocal trop court : garde le micro au moins 1 seconde.', true); return; }
    const blob = new Blob(r.chunks, { type: (r.recorder.mimeType || 'audio/webm').split(';')[0] });
    const name = current;
    const temp = { fromMe: true, text: '', at: Date.now(), sending: true, voice: { id: '', duration: r.duration, local: URL.createObjectURL(blob) } };
    conv.messages.push(temp);
    setNote('');
    drawMessages(true);
    try {
      const audio = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(blob); });
      const d = await api('/api/messages/voice', { username: name, audio, duration: r.duration });
      if (current !== name) return;
      Object.assign(temp, d.message, { sending: false });
      temp.voice.local = temp.voice.local || '';
      drawMessages(true);
    } catch (err) {
      if (conv) conv.messages = conv.messages.filter((m) => m !== temp);
      if (current !== name) return;
      setNote(err.message, true);
      drawMessages(true);
    }
  }

  // --- messages vocaux : écouter ---
  const player = new Audio();
  player.preload = 'auto';
  let playingId = '';
  function stopVoice() { player.pause(); playingId = ''; }
  const voiceSrc = (v) => v.local || '/api/messages/voice?id=' + encodeURIComponent(v.id);
  // une « onde » toujours la même pour un même message (fausse, juste pour le style)
  function wave(id, n) {
    let h = 7; for (const c of id || 'x') h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return Array.from({ length: n }, () => { h = (h * 1103515245 + 12345) >>> 0; return 25 + (h % 75); });
  }
  function voiceBubble(m, who, first) {
    const el = $('div', `ch-msg voice ${who}${first ? ' first' : ''}${m.sending ? ' sending' : ''}`);
    const key = m.voice.id || m.voice.local;
    const b = $('button', 'ch-play');
    b.type = 'button';
    const isMe = playingId === key && !player.paused;
    b.innerHTML = isMe ? SVG.pause : SVG.play;
    b.setAttribute('aria-label', isMe ? 'Pause' : 'Écouter le message vocal');
    const w = $('span', 'ch-wave');
    w.setAttribute('aria-hidden', 'true');
    for (const h of wave(key, 26)) { const i = $('i'); i.style.height = h + '%'; w.append(i); }
    const dur = $('span', 'ch-dur', fmt(m.voice.duration));
    el.append(b, w, dur);
    const paint = () => {
      const on = playingId === key;
      // les enregistrements webm n'ont souvent pas de durée connue : on prend celle du message
      const total = isFinite(player.duration) && player.duration > 0 ? player.duration : m.voice.duration;
      const p = on && total ? Math.min(1, player.currentTime / total) : 0;
      const bars = w.children;
      for (let i = 0; i < bars.length; i++) bars[i].classList.toggle('done', on && i / bars.length < p);
      dur.textContent = on && !player.paused ? fmt(player.currentTime) : fmt(m.voice.duration);
      const playingNow = on && !player.paused;
      b.innerHTML = playingNow ? SVG.pause : SVG.play;
      b.setAttribute('aria-label', playingNow ? 'Pause' : 'Écouter le message vocal');
    };
    el._paint = paint;
    b.onclick = () => {
      if (m.sending && !m.voice.local) return;
      if (playingId === key) { if (player.paused) player.play().catch(() => {}); else player.pause(); return; }
      playingId = key;
      player.src = voiceSrc(m.voice);
      player.play().catch(() => setNote('Impossible de lire ce message vocal.', true));
    };
    // clic sur l'onde : avancer dans le message
    w.onclick = (e) => {
      const total = isFinite(player.duration) && player.duration > 0 ? player.duration : m.voice.duration;
      if (playingId !== key || !total) return;
      const r = w.getBoundingClientRect();
      player.currentTime = ((e.clientX - r.left) / r.width) * total;
    };
    paint();
    return el;
  }
  const repaint = () => body && body.querySelectorAll('.ch-msg.voice').forEach((el) => el._paint && el._paint());
  for (const ev of ['play', 'pause', 'ended', 'seeked']) player.addEventListener(ev, repaint);
  // l'onde avance en douceur (60 images/s) au lieu de sauter 4 fois par seconde
  let waveRaf = 0;
  const smooth = () => { repaint(); if (!player.paused) waveRaf = requestAnimationFrame(smooth); };
  player.addEventListener('playing', () => { cancelAnimationFrame(waveRaf); waveRaf = requestAnimationFrame(smooth); });
  player.addEventListener('ended', () => { playingId = ''; repaint(); });

  // --- pastille sur la bulle Amis + notification quand un message arrive ---
  const wants = () => { try { return localStorage.getItem('notif-msg') !== '0'; } catch { return true; } };
  let firstCheck = true;
  function applyUnread(d) {
    const total = d.unread || 0;
    const bubble = document.getElementById('tabFriends');
    if (bubble) {
      let dot = bubble.querySelector('.fb-msg');
      if (!dot) { dot = $('span', 'fb-msg'); dot.setAttribute('aria-hidden', 'true'); bubble.append(dot); }
      dot.textContent = total ? String(Math.min(99, total)) : '';
    }
    window.dispatchEvent(new CustomEvent('chat-unread', { detail: d }));
    for (const c of d.conversations || []) {
      const k = c.username.toLowerCase();
      const before = known.get(k) || 0;
      known.set(k, c.unread);
      const open = dialog && dialog.open && current && current.toLowerCase() === k;
      if (!firstCheck && c.unread > before && !c.fromMe && !open && wants()) notify(c);
    }
    firstCheck = false;
  }

  function notify(c) {
    const stack = document.querySelector('.toast-stack');
    if (!stack) return;
    const key = 'msg:' + c.username.toLowerCase();
    stack.querySelector(`[data-key="${CSS.escape(key)}"]`)?.remove();
    const box = $('div', 'invite-toast');
    box.dataset.key = key;
    box.setAttribute('role', 'alert');
    const dot = $('span', 'it-dot'); dot.setAttribute('aria-hidden', 'true');
    const p = $('p'); const b = $('b', '', c.username); b.setAttribute('data-notranslate', '');
    p.append(b, ' t’a envoyé un message');
    const small = $('small', '', c.text); small.setAttribute('data-notranslate', '');
    const txt = $('div'); txt.append(p, small);
    const row = $('div', 'it-actions');
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
    const reply = $('button', 'it-main', 'Répondre'); reply.type = 'button'; reply.onclick = () => { close(); window.openChat(c.username); };
    const later = $('button', '', 'Plus tard'); later.type = 'button'; later.onclick = close;
    row.append(reply, later);
    box.append(dot, txt, row);
    stack.append(box);
    setTimeout(() => box.isConnected && close(), 15_000);
  }

  async function refreshBadge() {
    if (loggedIn === false) return;
    try { applyUnread(await api('/api/messages')); loggedIn = true; }
    catch (err) { if (err.status === 401) loggedIn = false; }
  }

  // téléphone : quand le clavier s'ouvre, la fenêtre prend la hauteur visible (la zone d'écriture reste au-dessus du clavier)
  if (window.visualViewport) {
    const fit = () => {
      if (!dialog || !dialog.open || innerWidth > 544) return;
      dialog.style.setProperty('--ch-vh', visualViewport.height + 'px');
      dialog.style.transform = `translateY(${visualViewport.offsetTop}px)`;
    };
    visualViewport.addEventListener('resize', fit);
    visualViewport.addEventListener('scroll', fit);
  }

  // --- ouvrir la messagerie depuis n'importe où ---
  window.openChat = async (name) => {
    if (loggedIn !== true) { // on revérifie : on vient peut-être de se connecter
      try { const d = await (await fetch('/api/me', { cache: 'no-store' })).json(); loggedIn = Boolean(d.user && d.user.username); } catch {}
      if (!loggedIn) { alertLogin(); return; }
    }
    if (!dialog) build();
    document.querySelectorAll('dialog[open]').forEach((d) => { if (d !== dialog && !d.classList.contains('as-page')) d.close(); });
    if (!dialog.open) dialog.showModal();
    if (name) showConv(name); else showList();
  };
  function alertLogin() {
    if (window.needLogin) { window.needLogin('envoyer des messages à tes amis'); return; }
    const stack = document.querySelector('.toast-stack');
    if (!stack) return;
    const box = $('div', 'invite-toast');
    box.dataset.key = 'msg:login';
    const p = $('p', '', 'Connecte-toi pour envoyer des messages à tes amis.');
    box.append($('span', 'it-dot'), p);
    stack.append(box);
    setTimeout(() => box.remove(), 4000);
  }

  // vérifie les nouveaux messages toutes les 10 s (seulement quand la page est visible)
  fetch('/api/me').then((r) => r.json()).then((d) => {
    loggedIn = Boolean(d.user && d.user.username);
    if (!loggedIn) return;
    refreshBadge();
    setInterval(() => { if (document.visibilityState === 'visible' && !(dialog && dialog.open && view === 'list')) refreshBadge(); }, 10_000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshBadge(); });
    // ouvrir directement une discussion avec /?chat=pseudo
    const want = new URLSearchParams(location.search).get('chat');
    if (want) window.openChat(want);
  }).catch(() => {});
  // connexion / déconnexion sans recharger la page
  window.addEventListener('account-changed', () => { loggedIn = null; firstCheck = true; known = new Map(); refreshBadge(); });
})();
