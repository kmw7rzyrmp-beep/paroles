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
  .ch-head h2 { margin: 0; font: 900 1.45rem/1 var(--texte); font-stretch: 62%; text-transform: uppercase; }
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
  .fb-msg { position: absolute; top: -.2rem; left: -.2rem; min-width: 1.35rem; height: 1.35rem; padding: 0 .3rem; border-radius: 999px; background: var(--orange); color: #1b1b22; font: 800 .78rem/1.35rem var(--texte); text-align: center; border: 2px solid var(--mur); }
  .fb-msg:empty { display: none; }
  .invite-toast[data-key^="msg:"] { border-left-color: var(--orange); }
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
  };
  const iconBtn = (svg, label, cls) => { const b = $('button', 'ghost ch-icon ' + (cls || '')); b.type = 'button'; b.innerHTML = svg; b.setAttribute('aria-label', label); b.title = label; return b; };

  const MAX = 500;
  let loggedIn = null;     // null = pas encore vérifié
  let dialog, head, body, form, input, note;
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
    if (url) { const img = $('img'); img.src = url; img.alt = ''; img.loading = 'lazy'; a.append(img); } else a.textContent = name.slice(0, 1).toUpperCase();
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
    const send = $('button');
    send.type = 'submit';
    send.innerHTML = SVG.send;
    send.setAttribute('aria-label', 'Envoyer');
    send.title = 'Envoyer';
    form.append(input, send);
    dialog.append(head, body, note, form);
    document.body.append(dialog);

    // la zone de texte grandit avec le message ; Entrée envoie, Maj + Entrée va à la ligne
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight + 2, 128) + 'px';
      const left = MAX - input.value.length;
      if (left <= 50) setNote(`${left} caractère${left > 1 ? 's' : ''} restant${left > 1 ? 's' : ''}`);
      else if (!note.classList.contains('err')) setNote('');
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
    });
    form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { stopPoll(); current = null; conv = null; refreshBadge(); });
  }

  function setNote(text, err) { note.textContent = text; note.classList.toggle('err', Boolean(err)); }
  function stopPoll() { clearInterval(poll); poll = null; }

  // --- liste des conversations ---
  async function showList() {
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
    view = 'conv'; current = name; conv = null;
    stopPoll();
    setNote('');
    form.hidden = false;
    input.value = ''; input.style.height = '';
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
      const el = $('div', `ch-msg ${who}${first ? ' first' : ''}${m.sending ? ' sending' : ''}`, m.text);
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
    input.value = ''; input.style.height = '';
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
      input.value = text;
      setNote(err.message, true);
      drawMessages(true);
    }
  }

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

  // --- ouvrir la messagerie depuis n'importe où ---
  window.openChat = async (name) => {
    if (loggedIn === false) { alertLogin(); return; }
    if (!dialog) build();
    document.querySelectorAll('dialog[open]').forEach((d) => { if (d !== dialog) d.close(); });
    if (!dialog.open) dialog.showModal();
    if (name) showConv(name); else showList();
  };
  function alertLogin() {
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
