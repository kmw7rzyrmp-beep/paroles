// Le « cadre » de l'appli : menu, pastilles, colonne de droite, lecteur du bas,
// fenêtre des notifications et la couronne de KylRom. Utilisé sur toutes les pages.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  let me = null;

  // ---------- la couronne 👑 ----------
  const CROWNED = new Set(['kylrom']);
  const crownable = (t) => {
    const v = t.trim().replace(/\s*\(toi\)$/i, '').replace(/^@/, '').toLowerCase();
    return CROWNED.has(v);
  };
  function crownIn(root) {
    if (!root || root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.length < 40 && crownable(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const hits = [];
    while (walker.nextNode()) hits.push(walker.currentNode);
    for (const n of hits) {
      const parent = n.parentElement;
      if (!parent || parent.closest('input, textarea, script, style, .crown, title, option')) continue;
      const next = n.nextSibling;
      if (next && next.nodeType === 1 && next.classList.contains('crown')) continue;
      const c = el('span', 'crown', '👑');
      c.setAttribute('aria-label', 'couronne');
      c.title = 'Le boss de Star Song';
      parent.insertBefore(c, next);
    }
  }
  crownIn(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      for (const n of m.addedNodes) if (n.nodeType === 1 && !n.classList.contains('crown')) crownIn(n);
      if (m.type === 'characterData' && m.target.parentElement) crownIn(m.target.parentElement);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  // ---------- les entrées du menu ----------
  const login = () => { const b = $('#loginBtn'); if (b && !b.hidden) b.click(); else location.href = '/'; };
  function open(what) {
    if (what === 'friends') { const b = $('#tabFriends'); if (b && !b.hidden) b.click(); else if (location.pathname === '/') login(); else location.href = '/?amis=1'; }
    else if (what === 'messages') { if (window.openChat) window.openChat(); }
    else if (what === 'profile') { if (me && window.openProfile) window.openProfile(me.username); }
    else if (what === 'notifs') openNotifs();
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (b) { e.preventDefault(); open(b.dataset.open); }
  });

  // pastilles : messages non lus, demandes d'amis
  window.addEventListener('chat-unread', (e) => {
    const n = e.detail.unread || 0;
    $$('[data-msg-badge]').forEach((b) => { b.textContent = n ? String(Math.min(99, n)) : ''; });
  });
  const fc = $('#friendCount');
  if (fc) {
    const sync = () => $$('[data-friend-badge]').forEach((b) => { b.textContent = fc.textContent; });
    new MutationObserver(sync).observe(fc, { childList: true, characterData: true, subtree: true });
    sync();
  }

  // ---------- fenêtre des notifications ----------
  function openNotifs() {
    const d = $('#notifDialog');
    if (!d) { location.href = '/?notifs=1'; return; }
    if (!d.open) d.showModal();
    window.dispatchEvent(new Event('notif-open'));
  }
  const nd = $('#notifDialog');
  if (nd) {
    $('.nd-close', nd).onclick = () => nd.close();
    nd.addEventListener('click', (e) => { if (e.target === nd) nd.close(); });
    nd.addEventListener('close', refreshNotifBadge);
  }
  async function refreshNotifBadge() {
    const st = window.notifState ? await window.notifState() : 'guest';
    $$('[data-notif-badge]').forEach((b) => { b.textContent = st === 'off' ? '!' : ''; });
    return st;
  }
  window.addEventListener('notif-changed', refreshNotifBadge);

  // un petit message pour montrer comment activer les notifications (une seule fois)
  async function announce() {
    let seen = false;
    try { seen = localStorage.getItem('notif-announce') === '1'; } catch {}
    const st = await refreshNotifBadge();
    if (seen || st !== 'off') return;
    try { localStorage.setItem('notif-announce', '1'); } catch {}
    let stack = $('.toast-stack');
    if (!stack) { stack = el('div', 'toast-stack'); document.body.append(stack); }
    const box = el('div', 'invite-toast');
    box.setAttribute('role', 'status');
    const dot = el('span', 'it-dot'); dot.setAttribute('aria-hidden', 'true');
    const txt = el('div');
    const p = el('p'); p.append(el('b', '', '🔔 Nouveau : les notifications'));
    txt.append(p, el('small', '', 'Reçois tes messages, tes invitations et le rappel de ta flamme directement sur ton téléphone. Ça prend 10 secondes.'));
    const row = el('div', 'it-actions');
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
    const go = el('button', 'it-main', 'Activer'); go.type = 'button'; go.onclick = () => { close(); openNotifs(); };
    const later = el('button', '', 'Plus tard'); later.type = 'button'; later.onclick = close;
    row.append(go, later);
    box.append(dot, txt, row);
    stack.append(box);
    setTimeout(() => box.isConnected && close(), 25_000);
  }

  // ---------- messages envoyés par un admin ----------
  const shownInbox = new Set();
  function showInbox(list) {
    for (const m of list || []) {
      if (shownInbox.has(m.id)) continue;
      shownInbox.add(m.id);
      let stack = $('.toast-stack');
      if (!stack) { stack = el('div', 'toast-stack'); document.body.append(stack); }
      const box = el('div', 'invite-toast admin-toast');
      box.setAttribute('role', 'alert');
      const dot = el('span', 'it-dot'); dot.setAttribute('aria-hidden', 'true');
      const txt = el('div');
      const p = el('p'); const b = el('b', '', m.title); b.setAttribute('data-notranslate', ''); p.append(b);
      const sm = el('small', '', m.body); sm.setAttribute('data-notranslate', '');
      txt.append(p, sm);
      const row = el('div', 'it-actions');
      const done = () => { fetch('/api/push/inbox-seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id }) }).catch(() => {}); box.classList.add('out'); setTimeout(() => box.remove(), 250); };
      if (m.url && m.url !== '/' && m.url !== location.pathname) { const go = el('a', 'it-main', 'Voir'); go.href = m.url; go.onclick = done; row.append(go); }
      const ok = el('button', m.url && m.url !== '/' ? '' : 'it-main', 'OK'); ok.type = 'button'; ok.onclick = done;
      row.append(ok);
      box.append(dot, txt, row);
      stack.append(box);
    }
  }

  // ---------- la colonne de droite : amis en ligne ----------
  const railFriends = $('#railFriends');
  async function drawRailFriends() {
    if (!railFriends) return;
    if (!me) { railFriends.replaceChildren(el('li', 'rail-empty', 'Connecte-toi pour voir tes amis en ligne.')); return; }
    try {
      const d = await (await fetch('/api/friends', { cache: 'no-store' })).json();
      const list = (d.friends || []).slice(0, 6);
      if (!list.length) { railFriends.replaceChildren(el('li', 'rail-empty', 'Ajoute des amis pour les voir ici.')); return; }
      railFriends.replaceChildren(...list.map((f) => {
        const li = el('li');
        const b = el('button', 'rail-item'); b.type = 'button';
        const av = el('span', 'av');
        if (f.avatarUrl) { const i = el('img'); i.src = f.avatarUrl; i.alt = ''; i.loading = 'lazy'; av.append(i); } else av.textContent = f.username.slice(0, 1).toUpperCase();
        const nm = el('span', 'nm', f.username); nm.setAttribute('data-notranslate', '');
        if (f.streak) nm.append(' ', el('span', 'rt game', '🔥' + f.streak));
        const rt = el('span', 'rt' + (f.inBlindtest ? ' game' : f.online ? ' on' : ''), f.inBlindtest ? 'En blind test' : f.online ? 'En ligne' : '');
        b.append(av, nm, rt);
        b.onclick = () => window.openProfile && window.openProfile(f.username);
        li.append(b);
        return li;
      }));
    } catch { /* hors ligne */ }
  }

  // ---------- qui est connecté ----------
  async function refreshMe() {
    try { const d = await (await fetch('/api/me', { cache: 'no-store' })).json(); me = d.user && d.user.username ? d.user : null; } catch { me = null; }
    $$('[data-open="profile"]').forEach((b) => { b.hidden = !me; });
    if (me && me.inbox) showInbox(me.inbox);
    drawRailFriends();
    if (me) setTimeout(announce, 2500); else refreshNotifBadge();
  }
  refreshMe();
  window.addEventListener('account-changed', refreshMe);
  setInterval(() => { if (document.visibilityState === 'visible') drawRailFriends(); }, 30_000);
  // nouveaux messages d'un admin : on revérifie de temps en temps
  setInterval(async () => {
    if (!me || document.visibilityState !== 'visible') return;
    try { const d = await (await fetch('/api/me', { cache: 'no-store' })).json(); if (d.user && d.user.inbox) showInbox(d.user.inbox); } catch {}
  }, 45_000);
  if (new URLSearchParams(location.search).get('notifs')) window.addEventListener('load', () => setTimeout(openNotifs, 400));

  // ---------- le lecteur du bas : il montre l'extrait en cours ----------
  const bar = $('#nowBar');
  if (bar) {
    let cur = null;
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    const PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>';
    const PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>';
    const toggle = $('[data-now="toggle"]', bar);
    const paint = () => {
      if (!cur) return;
      const d = isFinite(cur.duration) && cur.duration > 0 ? cur.duration : 30;
      $('.now-bar i', bar).style.width = Math.min(100, (cur.currentTime / d) * 100) + '%';
      $('[data-now-time]', bar).textContent = `${fmt(cur.currentTime)} / ${fmt(d)}`;
      toggle.innerHTML = cur.paused ? PLAY : PAUSE;
      toggle.setAttribute('aria-label', cur.paused ? 'Lecture' : 'Pause');
    };
    const show = (audio) => {
      // on retrouve le son à partir du bouton qui joue dans la liste
      const li = $('.play.playing')?.closest('li.result');
      if (!li) return;
      cur = audio;
      $('.now-txt b', bar).textContent = li.querySelector('.title')?.textContent || '';
      $('.now-txt span', bar).textContent = li.querySelector('.meta')?.textContent || '';
      const img = $('.now-cover', bar);
      const src = li.querySelector('img.disc')?.src || '';
      img.hidden = !src; if (src) img.src = src;
      bar.hidden = false;
      paint();
    };
    const realPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const a = this;
      if (!a.__nowWatch) {
        a.__nowWatch = true;
        for (const ev of ['timeupdate', 'pause', 'play']) a.addEventListener(ev, () => { if (a === cur) paint(); });
        a.addEventListener('ended', () => { if (a === cur) { bar.hidden = true; cur = null; } });
      }
      const p = realPlay.apply(a, args);
      setTimeout(() => show(a), 60);
      return p;
    };
    toggle.onclick = () => { if (!cur) return; const btn = $('.play.playing') || null; if (cur.paused) cur.play().catch(() => {}); else if (btn) btn.click(); else cur.pause(); };
    $('[data-now="back"]', bar).onclick = () => { if (cur) cur.currentTime = 0; };
    $('[data-now="stop"]', bar).onclick = () => { const btn = $('.play.playing'); if (btn) btn.click(); else cur && cur.pause(); bar.hidden = true; cur = null; };
    // si plus rien ne joue (bouton relâché dans la liste), on cache le lecteur
    setInterval(() => { if (cur && cur.paused && !$('.play.playing')) { bar.hidden = true; cur = null; } }, 800);
  }
})();
