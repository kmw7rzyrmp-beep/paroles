// Le « cadre » de l'appli : menu, pastilles, colonne de droite, lecteur du bas,
// fenêtre des notifications et la couronne de KylRom. Utilisé sur toutes les pages.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  let me = null, meKnown = false;

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
    if (what === 'friends') { if (location.pathname !== '/') location.href = '/#amis'; else go('amis'); }
    else if (what === 'messages') { if (window.openChat) window.openChat(); }
    else if (what === 'profile') { if (me && window.openProfile) window.openProfile(me.username); }
    else if (what === 'notifs') openNotifs();
    else if (what === 'patch') { if (location.pathname !== '/') location.href = '/#patch'; else go('patch'); }
    else if (what === 'ranking') { if (location.pathname !== '/') location.href = '/#classement'; else go('classement'); }
  }

  // ---------- les « grandes pages » (Amis, Notifications, Classement) ----------
  // Elles prennent toute la place du contenu, le menu de gauche reste là. L'adresse change (#amis…),
  // donc le bouton « retour » du téléphone ou du navigateur ramène à l'accueil.
  const PAGES = { amis: 'friendsDialog', notifications: 'pageNotifs', classement: 'pageRanking', patch: 'pagePatch' };
  const frame = $('.frame');
  let current = '';
  function go(name) { if (location.hash !== '#' + name) location.hash = name; else route(); }
  function pageEl(name) { return document.getElementById(PAGES[name]); }
  function setNav(name) {
    $$('.nav a, .top-tabs a, .tabbar a, .tabbar button').forEach((a) => {
      const target = a.dataset.pageLink || (a.dataset.open === 'friends' ? 'amis' : a.dataset.open === 'notifs' ? 'notifications' : a.dataset.open === 'ranking' ? 'classement' : a.dataset.open === 'patch' ? 'patch' : '');
      const isHome = !target && (a.getAttribute('href') === '/' || a.textContent.trim() === 'Paroles');
      const on = name ? target === name : isHome;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $$('.nav button').forEach((b) => {
      const t = b.dataset.open === 'friends' || b.id === 'tabFriends' ? 'amis' : b.dataset.open === 'notifs' ? 'notifications' : '';
      b.classList.toggle('active', Boolean(name && t === name));
    });
  }
  function route() {
    if (!frame || location.pathname !== '/') return;
    const name = location.hash.slice(1);
    const want = PAGES[name] ? name : '';
    if (want === 'amis' && !me) { const lb = $('#loginBtn'); if (meKnown) { history.replaceState(null, '', '/'); if (lb && !lb.hidden) lb.click(); return route(); } }
    if (want === current) return;
    // on ferme l'ancienne page
    if (current) {
      const old = pageEl(current);
      if (old) { if (old.tagName === 'DIALOG') { if (old.open) old.close(); } else old.hidden = true; }
    }
    current = want;
    document.body.dataset.page = want;
    setNav(want);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (!want) return;
    const el2 = pageEl(want);
    if (!el2) return;
    if (want === 'amis') {
      if (!el2.open) { const b = $('#tabFriends'); if (b) b.click(); }
    } else el2.hidden = false;
    el2.classList.remove('page-in'); void el2.offsetWidth; el2.classList.add('page-in');
    if (want === 'notifications') { window.dispatchEvent(new Event('notif-open')); drawHistory(); }
    if (want === 'classement') window.dispatchEvent(new Event('ranking-open'));
    if (want === 'patch') drawPatch();
  }
  function closePage() {
    if (!current) return;
    if (history.length > 1 && document.referrer.startsWith(location.origin) || history.state === 'page') history.back();
    else { history.replaceState(null, '', '/'); route(); }
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', (e) => { if (e.target.closest('[data-page-close]')) { e.preventDefault(); location.hash = ''; history.replaceState(null, '', '/'); route(); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && current && !document.querySelector('dialog[open]:modal')) { history.replaceState(null, '', '/'); route(); }
  });

  // la fenêtre Amis devient une grande page
  const fd = $('#friendsDialog');
  if (fd && frame) {
    frame.append(fd);
    fd.classList.add('as-page');
    fd.showModal = function () { this.show(); };
    fd.addEventListener('close', () => { if (current === 'amis') { history.replaceState(null, '', '/'); route(); } });
    // deux colonnes : à gauche ajouter / demandes, à droite la liste des amis
    const view = $('#friendsView', fd);
    if (view && !view.querySelector('.fpg-left')) {
      const left = el('div', 'fpg-left'), right = el('div', 'fpg-right');
      for (const id of ['friendForm', 'openMessages', 'friendMsg', 'friendIncoming', 'friendOutgoing']) { const x = document.getElementById(id); if (x) left.append(x); }
      const h = [...view.children].find((x) => x.tagName === 'H2');
      if (h) right.append(h);
      for (const id of ['friendList', 'friendDetail']) { const x = document.getElementById(id); if (x) right.append(x); }
      view.prepend(left, right);
    }
    const title = $('#friendsTitle', fd);
    if (title && !title.previousElementSibling?.classList?.contains('page-eyebrow')) {
      const wrap = el('div'); title.replaceWith(wrap); wrap.append(el('p', 'page-eyebrow', 'Social'), title); title.textContent = 'Amis';
    }
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
    if (!$('#pageNotifs')) { location.href = '/#notifications'; return; }
    go('notifications');
  }

  // ---------- historique des notifications ----------
  const NF_TYPES = {
    msg: ['💬', 'Messages'], req: ['🤝', 'Amis'], inv: ['🎧', 'Blind test'], streak: ['🔥', 'Flamme'], admin: ['📣', 'Star Song'],
  };
  let nfItems = [], nfFilter = 'all', unreadCount = 0;
  const ago = (t) => {
    const s2 = Math.round((Date.now() - t) / 1000);
    if (s2 < 60) return 'à l’instant';
    if (s2 < 3600) return `il y a ${Math.floor(s2 / 60)} min`;
    if (s2 < 86400) return `il y a ${Math.floor(s2 / 3600)} h`;
    return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  const dayOf = (t) => {
    const d = new Date(t), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Aujourd’hui';
    if (d.toDateString() === y.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  async function drawHistory() {
    const list = $('#nfList');
    if (!list) return;
    if (!me) { list.replaceChildren(el('p', 'nf-empty', 'Connecte-toi pour voir tes notifications.')); return; }
    try { const d = await (await fetch('/api/push/history', { cache: 'no-store' })).json(); nfItems = d.items || []; } catch { nfItems = []; }
    drawFilters();
    paintHistory(true);
  }
  function drawFilters() {
    const box = $('.nf-filters');
    if (!box) return;
    const counts = {};
    for (const n of nfItems) counts[n.type] = (counts[n.type] || 0) + 1;
    const opts = [['all', 'Tout', nfItems.length], ...Object.entries(NF_TYPES).filter(([k]) => counts[k]).map(([k, [, label]]) => [k, label, counts[k]])];
    box.replaceChildren(...opts.map(([k, label, n]) => {
      const b = el('button', 'nf-chip' + (nfFilter === k ? ' on' : ''));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(nfFilter === k));
      b.append(document.createTextNode(label), el('span', '', String(n)));
      b.onclick = () => { nfFilter = k; drawFilters(); paintHistory(true); };
      return b;
    }));
  }
  function paintHistory(animate) {
    const list = $('#nfList');
    const items = nfItems.filter((n) => nfFilter === 'all' || n.type === nfFilter);
    if (!items.length) {
      const e = el('div', 'nf-empty');
      e.append(el('span', 'nf-empty-ic', '🔔'), el('b', '', 'Rien pour l’instant'), el('span', '', 'Tes messages, invitations, demandes d’amis et rappels de flamme apparaîtront ici.'));
      list.replaceChildren(e);
      return;
    }
    const out = [];
    let day = '';
    items.forEach((n, i) => {
      const d = dayOf(n.at);
      if (d !== day) { day = d; out.push(el('p', 'nf-day', d)); }
      const [ic] = NF_TYPES[n.type] || ['🔔'];
      const row = el('a', 'nf-item t-' + n.type + (n.read ? '' : ' unread'));
      row.href = n.url || '/';
      row.style.setProperty('--i', String(Math.min(i, 14)));
      const icon = el('span', 'nf-ic', ic); icon.setAttribute('aria-hidden', 'true');
      const txt = el('span', 'nf-txt');
      const t = el('b', '', n.title + (n.count > 1 ? ` (${n.count})` : '')); t.setAttribute('data-notranslate', '');
      txt.append(t);
      if (n.body) { const bd = el('span', 'nf-body', n.body); bd.setAttribute('data-notranslate', ''); txt.append(bd); }
      const when = el('span', 'nf-when', ago(n.at));
      row.append(icon, txt, when);
      row.onclick = (e) => {
        n.read = true; row.classList.remove('unread');
        fetch('/api/push/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).then(() => refreshUnread()).catch(() => {});
        const chat = /[?&]chat=([^&]+)/.exec(n.url || '');
        if (chat && window.openChat) { e.preventDefault(); window.openChat(decodeURIComponent(chat[1])); }
        else if ((n.url || '').startsWith('/#')) { e.preventDefault(); location.hash = n.url.slice(2); }
      };
      out.push(row);
    });
    list.replaceChildren(...out);
    list.classList.toggle('anim', Boolean(animate));
  }
  const readAll = $('#nfReadAll');
  if (readAll) readAll.onclick = async () => {
    for (const n of nfItems) n.read = true;
    paintHistory(false);
    await fetch('/api/push/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }).catch(() => {});
    refreshUnread();
  };

  // la pastille de « Notifications » : nombre de non lues (ou « ! » si elles ne sont pas activées sur l'appareil)
  let notifOff = false;
  async function refreshNotifBadge() {
    const st = window.notifState ? await window.notifState() : 'guest';
    notifOff = st === 'off';
    paintBell();
    return st;
  }
  function paintBell() {
    $$('[data-notif-badge]').forEach((b) => { b.textContent = unreadCount ? String(Math.min(99, unreadCount)) : notifOff ? '!' : ''; });
  }
  async function refreshUnread(fromMe) {
    let n = fromMe;
    if (n === undefined) {
      try { const d = await (await fetch('/api/me', { cache: 'no-store' })).json(); n = d.user ? d.user.notifUnread || 0 : 0; if (d.user && d.user.inbox) showInbox(d.user.inbox); } catch { return; }
    }
    const before = unreadCount;
    unreadCount = n;
    paintBell();
    if (n > before && before >= 0 && seenOnce) {
      // nouvelle notification : la cloche sonne
      $$('[data-open="notifs"]').forEach((b) => { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); });
      if (current === 'notifications') drawHistory();
      else newNotifToast();
    }
    seenOnce = true;
  }
  let seenOnce = false;
  async function newNotifToast() {
    let items = [];
    try { items = (await (await fetch('/api/push/history', { cache: 'no-store' })).json()).items || []; } catch { return; }
    const n = items.find((x) => !x.read);
    if (!n || ['msg', 'inv', 'req', 'admin'].includes(n.type)) return; // celles-là ont déjà leur propre alerte
    let stack = $('.toast-stack');
    if (!stack) { stack = el('div', 'toast-stack'); document.body.append(stack); }
    const box = el('div', 'invite-toast');
    const dot = el('span', 'it-dot'); dot.setAttribute('aria-hidden', 'true');
    const txt = el('div'); const p = el('p'); p.append(el('b', '', n.title)); txt.append(p, el('small', '', n.body || ''));
    const row = el('div', 'it-actions');
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
    const see = el('button', 'it-main', 'Voir'); see.type = 'button'; see.onclick = () => { close(); openNotifs(); };
    const ok = el('button', '', 'OK'); ok.type = 'button'; ok.onclick = close;
    row.append(see, ok); box.append(dot, txt, row); stack.append(box);
    setTimeout(() => box.isConnected && close(), 12_000);
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
        if (f.avatarUrl) { const i = el('img'); i.src = f.avatarUrl; i.alt = ''; i.loading = 'lazy'; av.append(i); } else av.textContent = f.username.replace(/^@/, '').slice(0, 1).toUpperCase();
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

  // ---------- pseudo : jamais de majuscules, et le « @ » est déjà affiché ----------
  document.addEventListener('input', (e) => {
    const i = e.target;
    if (!(i instanceof HTMLInputElement) || i.id !== 'authUsername') return;
    const v = i.value.toLowerCase().replace(/^@+/, '').replace(/\s+/g, '');
    if (v !== i.value) { const p = i.selectionStart; i.value = v; try { i.setSelectionRange(p, p); } catch {} }
  });

  // ---------- le patch note (visible par tout le monde) ----------
  const PN_TAGS = { new: ['Nouveau', 'pn-new'], better: ['Amélioré', 'pn-better'], fix: ['Corrigé', 'pn-fix'], removed: ['Retiré', 'pn-removed'] };
  function setupPatch() {
    const navs = $$('.side .nav');
    const social = navs[navs.length - 1];
    if (social && !$('[data-open="patch"]', social)) {
      const li = el('li');
      const b = el('button'); b.type = 'button'; b.dataset.open = 'patch';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg><span>Patch note</span>';
      li.append(b); social.append(li);
    }
    if (frame && location.pathname === '/' && !$('#pagePatch')) {
      const sec = el('section', 'page'); sec.id = 'pagePatch'; sec.hidden = true; sec.setAttribute('aria-labelledby', 'pnTitle');
      frame.append(sec);
    }
  }
  let patchData = null;
  async function drawPatch() {
    const page = $('#pagePatch');
    if (!page) return;
    if (!patchData) {
      try { const r = await fetch('/api/patchnotes', { cache: 'no-store' }); if (!r.ok) throw 0; patchData = (await r.json()).notes; } catch { page.replaceChildren(el('p', 'nf-empty', 'Patch note indisponible.')); return; }
    }
    const head = el('div', 'page-head');
    const back = el('button', 'ghost page-back'); back.type = 'button'; back.setAttribute('data-page-close', ''); back.setAttribute('aria-label', 'Retour');
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const tw = el('div'); const h = el('h1', '', 'Patch note'); h.id = 'pnTitle';
    tw.append(el('p', 'page-eyebrow', 'Quoi de neuf'), h);
    head.append(back, tw);
    const count = patchData.reduce((n, v) => n + v.items.length, 0);
    const intro = el('p', 'pn-intro', `${patchData.length} versions, ${count} changements depuis le lancement de Star Song.`);
    const tl = el('ol', 'pn-timeline');
    patchData.forEach((v, i) => {
      const li = el('li', 'pn-ver' + (i === 0 ? ' latest' : ''));
      li.style.setProperty('--i', String(Math.min(i, 12)));
      const top = el('div', 'pn-top');
      top.append(el('span', 'pn-num', 'v' + v.version));
      const t = el('h2', '', v.title);
      top.append(t);
      if (i === 0) top.append(el('span', 'pn-latest', 'Dernière version'));
      const d = el('time', 'pn-date', new Date(v.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })); d.dateTime = v.date;
      top.append(d);
      const ul = el('ul', 'pn-items');
      for (const [tag, text] of v.items) {
        const it = el('li');
        const [lbl, cls] = PN_TAGS[tag] || PN_TAGS.new;
        it.append(el('span', 'pn-tag ' + cls, lbl), el('span', '', text));
        ul.append(it);
      }
      li.append(top, ul);
      tl.append(li);
    });
    page.replaceChildren(head, intro, tl);
  }

  // ---------- qui est connecté ----------
  async function refreshMe() {
    try { const d = await (await fetch('/api/me', { cache: 'no-store' })).json(); me = d.user && d.user.username ? d.user : null; } catch { me = null; }
    meKnown = true;
    $$('[data-open="profile"]').forEach((b) => { b.hidden = !me; });
    setupPatch();
    if (me && me.inbox) showInbox(me.inbox);
    refreshUnread(me ? me.notifUnread || 0 : 0);
    route();
    drawRailFriends();
    if (me) setTimeout(announce, 2500); else refreshNotifBadge();
  }
  setupPatch();
  refreshMe();
  window.addEventListener('account-changed', refreshMe);
  setInterval(() => { if (document.visibilityState === 'visible') drawRailFriends(); }, 30_000);
  // nouveaux messages d'un admin : on revérifie de temps en temps
  setInterval(() => { if (me && document.visibilityState === 'visible') refreshUnread(); }, 20_000);
  if (new URLSearchParams(location.search).get('notifs')) { history.replaceState(null, '', '/#notifications'); }

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
