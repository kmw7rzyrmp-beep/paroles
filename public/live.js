// Les effets lancés par les admins, visibles par tout le monde sur le site :
// une annonce en haut de la page, des confettis, l'écran qui tremble, et des couronnes 👑.
(() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = `
  .live-bar { position: fixed; left: 50%; top: .8rem; z-index: 150; transform: translateX(-50%); display: flex; align-items: center; gap: .7rem; width: min(40rem, calc(100vw - 1.5rem));
    padding: .7rem .7rem .7rem 1rem; border-radius: 16px; background: linear-gradient(135deg, #f26b3a, #c8401f); color: #fff; box-shadow: 0 16px 40px rgba(242, 107, 58, .35);
    animation: liveIn .5s cubic-bezier(.2, 1.3, .4, 1) both; font: 600 .95rem/1.35 Inter, system-ui, sans-serif; }
  .live-bar .mega { font-size: 1.4rem; animation: megaphone 1.6s ease-in-out infinite; }
  .live-bar p { flex: 1; margin: 0; overflow-wrap: anywhere; }
  .live-bar button { flex: none; width: 2.2rem; height: 2.2rem; min-height: 0; padding: 0; border: 0; border-radius: 50%; background: rgba(0,0,0,.2); color: #fff; font-size: 1rem; cursor: pointer; }
  @keyframes liveIn { from { opacity: 0; transform: translate(-50%, -20px); } }
  @keyframes megaphone { 50% { transform: rotate(-12deg) scale(1.1); } }
  .confetti { position: fixed; inset: 0; z-index: 160; pointer-events: none; overflow: hidden; }
  .confetti i { position: absolute; top: -12px; width: 9px; height: 14px; border-radius: 2px; animation: fall linear forwards; }
  @keyframes fall { to { transform: translate3d(var(--dx), 110vh, 0) rotate(var(--r)); } }
  .confetti-msg { position: fixed; left: 50%; top: 40%; z-index: 161; transform: translate(-50%, -50%); padding: 1rem 1.6rem; border-radius: 22px; background: rgba(15, 15, 17, .92); color: #fff;
    font: 800 clamp(1.2rem, 4vw, 2rem) Inter, system-ui, sans-serif; text-align: center; animation: cmsg 4.5s ease forwards; pointer-events: none; max-width: calc(100vw - 2rem); }
  @keyframes cmsg { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.7); } 12% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); } 20%, 80% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { opacity: 0; } }
  body.shake { animation: shake .7s cubic-bezier(.36, .07, .19, .97); }
  @keyframes shake { 10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(4px); } 30%, 50%, 70% { transform: translateX(-8px) rotate(-.4deg); } 40%, 60% { transform: translateX(8px) rotate(.4deg); } }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  const seen = (k) => { try { return sessionStorage.getItem('live:' + k) === '1'; } catch { return false; } };
  const mark = (k) => { try { sessionStorage.setItem('live:' + k, '1'); } catch {} };
  const hidden = (k) => { try { return localStorage.getItem('live-hide:' + k) === '1'; } catch { return false; } };

  let bar = null;
  function announce(a) {
    if (!a || hidden(a.id)) { if (bar) { bar.remove(); bar = null; } return; }
    if (bar && bar.dataset.id === a.id) return;
    if (bar) bar.remove();
    bar = el('div', 'live-bar'); bar.dataset.id = a.id; bar.setAttribute('role', 'status');
    const p = el('p', '', a.text); p.setAttribute('data-notranslate', '');
    const x = el('button', '', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Fermer l’annonce');
    x.onclick = () => { try { localStorage.setItem('live-hide:' + a.id, '1'); } catch {} bar.remove(); bar = null; };
    bar.append(el('span', 'mega', '📣'), p, x);
    document.body.append(bar);
  }
  function confetti(c) {
    if (!c || seen('c' + c.id)) return;
    mark('c' + c.id);
    if (c.text) { const m = el('div', 'confetti-msg', c.text); m.setAttribute('data-notranslate', ''); document.body.append(m); setTimeout(() => m.remove(), 4600); }
    if (reduce) return;
    const box = el('div', 'confetti');
    const colors = ['#f26b3a', '#ffd34d', '#6fdc8c', '#8dbbff', '#ff6fb1', '#ffffff'];
    for (let i = 0; i < 140; i++) {
      const p = el('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
      p.style.setProperty('--r', (Math.random() * 1080 - 540) + 'deg');
      p.style.animationDuration = 2.4 + Math.random() * 2.2 + 's';
      p.style.animationDelay = Math.random() * 0.9 + 's';
      if (i % 3 === 0) { p.style.width = '7px'; p.style.height = '7px'; p.style.borderRadius = '50%'; }
      box.append(p);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 6000);
  }
  function shake(s) {
    if (!s || seen('s' + s.id)) return;
    mark('s' + s.id);
    if (reduce) return;
    document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
    if (navigator.vibrate) try { navigator.vibrate([80, 40, 80]); } catch {}
    setTimeout(() => document.body.classList.remove('shake'), 800);
  }
  async function poll() {
    if (document.visibilityState !== 'visible') return;
    try {
      const d = await (await fetch('/api/live', { cache: 'no-store' })).json();
      announce(d.announce);
      confetti(d.confetti);
      shake(d.shake);
      if (window.setCrowns) window.setCrowns(d.crowns || []);
    } catch { /* pas grave */ }
  }
  poll();
  setInterval(poll, 12_000);
  document.addEventListener('visibilitychange', poll);
  window.addEventListener('live-poll', poll);
})();
