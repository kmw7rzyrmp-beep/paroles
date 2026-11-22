// Flammes 🔥 (série de jours), réglages des notifications sur le téléphone / l'ordinateur.
(() => {
  const css = `
  .flame-chip { display: inline-flex; align-items: center; gap: .25rem; min-height: 2.3rem; padding: .2rem .7rem; border-radius: 999px;
    background: #1d1c21; border: 1px solid #3a3940; color: var(--blanc); font: 800 .95rem var(--texte); font-variant-numeric: tabular-nums; cursor: pointer; }
  .flame-chip.out { color: var(--gris); }
  .flame-chip.out .fl { filter: grayscale(1); opacity: .6; }
  .flame-chip.lit { border-color: #f28c1c; box-shadow: 0 0 0 2px rgba(242, 140, 28, .18); }
  .flame-chip.pop .fl { display: inline-block; animation: flPop .9s cubic-bezier(.2, 1.6, .4, 1); }
  @keyframes flPop { 0% { transform: scale(.4); } 60% { transform: scale(1.4); } 100% { transform: scale(1); } }
  .gift-toast { border-left-color: #f28c1c !important; }
  .gift-toast .gift-ic { font-size: 1.8rem; line-height: 1; animation: flPop .9s cubic-bezier(.2, 1.6, .4, 1); }
  .gift-toast small { display: block; margin-top: .2rem; }
  .gift-toast a.it-main { text-decoration: none; display: inline-flex; align-items: center; }
  .friend-flame { margin-left: .35rem; font-size: .82rem; font-weight: 800; color: #ffb15c; white-space: nowrap; }
  .push-box { margin: .9rem 0 .3rem; padding: .8rem; border: 1px dashed #3a3940; border-radius: 8px; }
  .push-box p { margin: 0 0 .55rem; font-size: .88rem; color: var(--gris); }
  .push-box p b { color: var(--blanc); }
  .push-box .row { display: flex; flex-wrap: wrap; gap: .5rem; }
  .push-box button { min-height: 2.4rem; font-size: .88rem; }
  .push-box .ok { color: #6fdc8c; }
  .push-box .err { color: var(--danger, #ff8a7a); }
  @media (prefers-reduced-motion: reduce) { .flame-chip.pop .fl { animation: none; } }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);

  const $ = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const api = async (url, body) => {
    const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Erreur réseau.');
    return d;
  };
  let me = null;

  // ---------- la flamme en haut de la page ----------
  function drawFlame(streak, popIt) {
    const account = document.getElementById('account');
    if (!account || !me) return;
    let chip = account.querySelector('.flame-chip');
    if (!chip) {
      chip = $('button', 'flame-chip');
      chip.type = 'button';
      chip.setAttribute('data-notranslate', '');
      chip.onclick = () => window.openProfile && window.openProfile(me.username);
      account.prepend(chip);
    }
    const n = streak.count;
    chip.classList.toggle('out', !n);
    chip.classList.toggle('lit', Boolean(streak.today && n));
    chip.replaceChildren($('span', 'fl', '🔥'), document.createTextNode(String(n)));
    const fr = n
      ? (streak.today ? `Série de ${n} jour${n > 1 ? 's' : ''} : flamme d’aujourd’hui gagnée` : `Série de ${n} jour${n > 1 ? 's' : ''} : joue ou cherche un son aujourd’hui pour la garder`)
      : 'Pas de série en cours : joue au blind test ou cherche un son pour allumer ta flamme';
    const en = n
      ? (streak.today ? `${n}-day streak: today's flame earned` : `${n}-day streak: play or search today to keep it`)
      : 'No streak yet: play a blind test or search a song to light your flame';
    const label = document.documentElement.lang === 'en' ? en : fr;
    chip.title = label;
    chip.setAttribute('aria-label', label);
    if (popIt) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  }

  // ---------- la fête : une pluie de flammes quand on gagne sa flamme du jour ----------
  const parisDay = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const FLAME_WORDS = ['Bravo, ta flamme est allumée !', 'Tu es en feu !', 'Une flamme de plus, bien joué !', 'Ça chauffe, continue comme ça !', 'Flamme gagnée, tu assures !'];
  function celebrateFlame(n) {
    if (!me) return;
    const key = 'ss-flame-day:' + me.username;
    let seen = '';
    try { seen = localStorage.getItem(key) || ''; } catch { /* stockage bloqué */ }
    const today = parisDay();
    if (seen === today) return;
    try { localStorage.setItem(key, today); } catch { /* pas grave */ }
    const calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const box = $('div', 'fl-party'); box.setAttribute('aria-hidden', 'true');
    if (!calm) {
      for (let i = 0; i < 34; i++) {
        const f = $('span', 'fl-p', i % 7 === 3 ? '✨' : '🔥');
        f.style.cssText = `left:${Math.random() * 100}%;font-size:${1.1 + Math.random() * 2.2}rem;animation-delay:${(Math.random() * 1.3).toFixed(2)}s;animation-duration:${(2.4 + Math.random() * 1.8).toFixed(2)}s;--sway:${(Math.random() * 90 - 45).toFixed(0)}px`;
        box.append(f);
      }
    }
    const card = $('div', 'fl-card');
    card.append($('div', 'fl-big', '🔥'), $('b', '', n > 1 ? `${n} jours de suite !` : 'Première flamme !'), $('p', '', FLAME_WORDS[Math.floor(Math.random() * FLAME_WORDS.length)]));
    box.append(card);
    document.body.append(box);
    try { navigator.vibrate && navigator.vibrate([80, 40, 80, 40, 200]); } catch { /* pas de vibreur */ }
    const chip = document.querySelector('#account .flame-chip');
    if (chip) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
    setTimeout(() => { box.classList.add('out'); setTimeout(() => box.remove(), 600); }, 3600);
  }
  window.ssCelebrateFlame = (n) => { try { localStorage.removeItem('ss-flame-day:' + (me && me.username)); } catch { /* */ } celebrateFlame(n || 1); }; // pour tester

  let lastCount = null;
  async function refreshMe() {
    try {
      const d = await api('/api/me');
      me = d.user && d.user.username ? d.user : null;
      if (!me) { document.querySelector('#account .flame-chip')?.remove(); return; }
      const s = me.streak || { count: 0 };
      drawFlame(s, lastCount !== null && s.count > lastCount);
      lastCount = s.count;
      if (s.today && s.count) celebrateFlame(s.count);
      if (me.gift === 'flame-1') showGift(s);
      if (me.newTrophies && me.newTrophies.length) showTrophies(me.newTrophies);
    } catch { /* hors ligne */ }
  }
  // trophées gagnés : un toast, puis on prévient le serveur que c'est vu
  let trophyBusy = false;
  function showTrophies(list) {
    if (trophyBusy) return;
    trophyBusy = true;
    api('/api/push/trophy-seen', {}).catch(() => {});
    let stack = document.querySelector('.toast-stack');
    if (!stack) { stack = $('div', 'toast-stack'); document.body.append(stack); }
    list.slice(0, 3).forEach((t, i) => setTimeout(() => {
      const box = $('div', 'invite-toast gift-toast trophy-toast');
      box.setAttribute('role', 'alert');
      const ic = $('span', 'gift-ic', t.icon); ic.setAttribute('aria-hidden', 'true');
      const txt = $('div');
      const p = $('p'); p.append($('b', '', 'Trophée gagné : ' + t.name));
      txt.append(p, $('small', '', t.desc));
      const row = $('div', 'it-actions');
      const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
      const see = $('button', 'it-main', 'Voir mes trophées'); see.type = 'button';
      see.onclick = () => { close(); window.openProfile && window.openProfile(); };
      const ok = $('button', '', 'OK'); ok.type = 'button'; ok.onclick = close;
      row.append(see, ok);
      box.append(ic, txt, row);
      stack.append(box);
      setTimeout(() => box.isConnected && close(), 12_000);
    }, i * 1200));
    setTimeout(() => { trophyBusy = false; me && (me.newTrophies = []); }, 6000);
  }
  // le cadeau de lancement : une flamme offerte, expliquée une seule fois
  let giftShown = false;
  function showGift(streak) {
    if (giftShown) return;
    giftShown = true;
    api('/api/push/gift-seen', {}).catch(() => {});
    if (!streak.count) return; // déjà éteinte : inutile d'en parler
    let stack = document.querySelector('.toast-stack');
    if (!stack) { stack = $('div', 'toast-stack'); document.body.append(stack); }
    const box = $('div', 'invite-toast gift-toast');
    box.setAttribute('role', 'alert');
    const ic = $('span', 'gift-ic', '🔥'); ic.setAttribute('aria-hidden', 'true');
    const txt = $('div');
    const p = $('p'); p.append($('b', '', 'Cadeau : ta première flamme !'));
    txt.append(p, $('small', '', streak.today
      ? 'Elle est allumée pour aujourd’hui. Reviens demain jouer au blind test ou chercher un son pour la garder, sinon elle s’éteint.'
      : 'Joue au blind test ou cherche un son aujourd’hui pour la garder, sinon elle s’éteint à minuit.'));
    const row = $('div', 'it-actions');
    const close = () => { box.classList.add('out'); setTimeout(() => box.remove(), 250); };
    const play = $('a', 'it-main', 'Jouer au blind test'); play.href = '/blindtest';
    const ok = $('button', '', 'OK'); ok.type = 'button'; ok.onclick = close;
    row.append(play, ok);
    box.append(ic, txt, row);
    stack.append(box);
    setTimeout(() => box.isConnected && close(), 20_000);
    const chip = document.querySelector('#account .flame-chip');
    if (chip) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
  }

  refreshMe();
  // la flamme peut aussi s'allumer en jouant (blind test) : on revérifie de temps en temps
  setInterval(() => { if (!document.hidden && me) refreshMe(); }, 20_000);
  // après une recherche, la flamme peut s'allumer : on revérifie
  const realFetch = window.fetch;
  window.fetch = function (...args) {
    const p = realFetch.apply(this, args);
    const url = String(args[0] && args[0].url ? args[0].url : args[0]);
    if (/\/api\/search\?/.test(url)) p.then(() => setTimeout(refreshMe, 400)).catch(() => {});
    return p;
  };
  window.addEventListener('account-changed', refreshMe);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshMe(); });
  new MutationObserver(() => { if (me) drawFlame(me.streak || { count: 0 }, false); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // ---------- les notifications sur l'appareil ----------
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const keyToBytes = (b64) => { const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };

  async function swReg() {
    const reg = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.register('/sw.js');
    return navigator.serviceWorker.ready.then(() => reg);
  }
  async function currentSub() {
    if (!supported) return null;
    try { const reg = await swReg(); return await reg.pushManager.getSubscription(); } catch { return null; }
  }

  async function enablePush(status) {
    status.className = ''; status.textContent = 'Activation…';
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Tu as refusé les notifications. Tu peux les autoriser dans les réglages du navigateur.');
      const { publicKey } = await api('/api/push/key');
      if (!publicKey) throw new Error('Notifications indisponibles sur le serveur.');
      const reg = await swReg();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) });
      await api('/api/push/subscribe', { subscription: sub.toJSON() });
      return true;
    } catch (err) {
      status.className = 'err'; status.textContent = err.message || 'Impossible d’activer les notifications.';
      return false;
    }
  }
  async function disablePush() {
    const sub = await currentSub();
    if (sub) { await api('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  }

  async function drawPushBox() {
    const settings = document.querySelector('.notif-settings');
    if (!settings) return;
    let box = settings.querySelector('.push-box');
    if (!box) { box = $('div', 'push-box'); if (settings.id === 'notifSettings') settings.prepend(box); else settings.append(box); }
    if (!me) { box.replaceChildren($('p', '', 'Connecte-toi pour recevoir les notifications sur ton téléphone.')); return; }
    const text = $('p');
    const row = $('div', 'row');
    const status = $('span');
    if (!supported) {
      text.textContent = isIos && !standalone
        ? 'Sur iPhone : ajoute d’abord Star Song à l’écran d’accueil (bouton Partager → « Sur l’écran d’accueil »), puis ouvre-le depuis l’icône pour activer les notifications.'
        : 'Ce navigateur ne permet pas les notifications.';
      box.replaceChildren(text);
      return;
    }
    const sub = await currentSub();
    const on = Boolean(sub) && Notification.permission === 'granted';
    text.innerHTML = '';
    text.append($('b', '', 'Sur cet appareil : '), on ? 'les notifications sont activées, même quand le site est fermé.' : 'reçois les notifications même quand le site est fermé.');
    if (on) {
      const test = $('button', 'ghost', 'Envoyer un test'); test.type = 'button';
      test.onclick = async () => { await api('/api/push/test', {}).catch(() => {}); status.className = 'ok'; status.textContent = 'Envoyé ! Regarde tes notifications.'; };
      const off = $('button', 'ghost', 'Désactiver'); off.type = 'button';
      off.onclick = async () => { await disablePush(); drawPushBox(); window.dispatchEvent(new Event('notif-changed')); };
      row.append(test, off);
    } else {
      const go = $('button', '', 'Activer les notifications'); go.type = 'button';
      go.onclick = async () => { if (await enablePush(status)) { drawPushBox(); window.dispatchEvent(new Event('notif-changed')); } };
      row.append(go);
    }
    box.replaceChildren(text, row, status);
  }

  // les interrupteurs (demandes, invitations, messages, flamme) sont aussi gardés sur le serveur
  async function syncSwitches() {
    if (!me) return;
    try {
      const { prefs } = await api('/api/push/prefs');
      for (const box of document.querySelectorAll('[data-notif]')) {
        const k = box.dataset.notif;
        if (k in prefs) { box.checked = prefs[k]; try { localStorage.setItem('notif-' + k, prefs[k] ? '1' : '0'); } catch {} }
      }
    } catch { /* pas grave */ }
  }
  document.addEventListener('change', (e) => {
    const box = e.target.closest && e.target.closest('[data-notif]');
    if (!box || !me || !['req', 'inv', 'msg', 'streak'].includes(box.dataset.notif)) return;
    api('/api/push/prefs', { [box.dataset.notif]: box.checked }).catch(() => {});
  });
  const settings = document.querySelector('.notif-settings');
  if (settings) settings.addEventListener('toggle', () => { if (settings.open) { drawPushBox(); syncSwitches(); } });
  // la fenêtre « Notifications » du menu principal
  window.addEventListener('notif-open', () => { drawPushBox(); syncSwitches(); });
  // pastille « ! » sur « Notifications » tant qu'elles ne sont pas activées sur cet appareil
  window.notifState = async () => {
    if (!me) return 'guest';
    if (!supported) return 'unsupported';
    const sub = await currentSub();
    return sub && Notification.permission === 'granted' ? 'on' : 'off';
  };

  // pour l'affiche « Active les notifications » (app.js) : active directement, depuis un clic
  window.enablePushNow = async (statusEl) => {
    const ok = await enablePush(statusEl || document.createElement('span'));
    if (ok) { drawPushBox(); window.dispatchEvent(new Event('notif-changed')); }
    return ok;
  };
  window.notifHelp = () => ({ ios: isIos && !standalone, denied: supported && Notification.permission === 'denied' });

  // anciens liens des notifications : /?amis=1 et /?notifs=1 deviennent /#amis et /#notifications
  const q = new URLSearchParams(location.search);
  if (location.pathname === '/' && (q.get('amis') || q.get('notifs'))) window.history.replaceState(null, '', '/#' + (q.get('amis') ? 'amis' : 'notifications'));
})();
