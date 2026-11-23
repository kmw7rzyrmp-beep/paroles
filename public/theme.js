// Thème clair / sombre + guide de bienvenue (3 écrans)
(() => {
  const L = (() => { try { return localStorage.getItem('lang') || document.documentElement.lang || 'fr'; } catch { return 'fr'; } })();
  const T = {
    fr: { light: 'Thème clair', dark: 'Thème sombre', guide: 'Guide de bienvenue', next: 'Suivant', go: "C'est parti", skip: 'Passer',
      s: [['🎵', 'Retrouve un son', 'Tape quelques mots des paroles : on te donne le titre et l’artiste.'],
          ['🎮', 'Blind test entre potes', 'Musique ou animé : crée un salon, invite tes amis, gagne des points. Bonus ×2 chaque jour !'],
          ['🔥', 'Reviens chaque jour', 'Une flamme de plus par jour si tu joues. Crée un compte pour garder tes amis et ton classement.']] },
    en: { light: 'Light theme', dark: 'Dark theme', guide: 'Welcome guide', next: 'Next', go: "Let's go", skip: 'Skip',
      s: [['🎵', 'Find a song', 'Type a few lyrics: we give you the title and the artist.'],
          ['🎮', 'Blind test with friends', 'Music or anime: create a room, invite friends, earn points. Daily ×2 bonus!'],
          ['🔥', 'Come back every day', 'One more flame each day you play. Sign up to keep your friends and ranking.']] },
    dz: { light: 'Thème clair', dark: 'Thème sombre', guide: 'Guide de bienvenue', next: 'Suivant', go: 'Yalla on y va', skip: 'Passer',
      s: [['🎵', 'Retrouve un son khoya', 'Tape deux trois mots des paroles : on te sort le titre et l’artiste.'],
          ['🎮', 'Blind test entre potes', 'Musique ou animé : crée un salon, invite les khawa, gagne des points. Bonus ×2 chaque jour !'],
          ['🔥', 'Reviens chaque jour', 'Une flamme de plus par jour si tu joues. Crée un compte pour garder tes amis et ton classement.']] },
  };
  const t = () => T[L] || T.fr;
  const get = () => { try { return localStorage.getItem('ss-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } };
  const apply = (m) => {
    if (m === 'light') document.documentElement.dataset.theme = 'light'; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('ss-theme', m); } catch {}
    const mc = document.querySelector('meta[name="theme-color"]'); if (mc) mc.content = m === 'light' ? '#ee7a4c' : '#000000';
    const b = document.getElementById('themeBtn'); if (b) { b.textContent = m === 'light' ? '🌙' : '☀️'; b.title = b.ariaLabel = m === 'light' ? t().dark : t().light; }
  };
  const css = document.createElement('style');
  css.textContent = `.ss-tbtn{width:2.4rem;height:2.4rem;border-radius:50%;padding:0;font-size:1.1rem;display:inline-grid;place-items:center;background:rgba(128,128,128,.18)!important;color:inherit!important}
  .ssg{position:fixed;inset:0;z-index:400;display:grid;place-items:center;background:rgba(0,0,0,.6);padding:1rem}
  .ssg-card{width:min(24rem,100%);background:var(--coque,#141416);color:var(--blanc,#fff);border-radius:26px;padding:1.8rem 1.5rem 1.3rem;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.45)}
  .ssg-ico{font-size:3.4rem;line-height:1}.ssg-card h2{margin:.8rem 0 .4rem;font-size:1.4rem}.ssg-card p{margin:0;color:var(--gris,#aaa);line-height:1.45}
  .ssg-dots{display:flex;gap:.4rem;justify-content:center;margin:1.2rem 0}.ssg-dots i{width:.5rem;height:.5rem;border-radius:50%;background:rgba(128,128,128,.4)}.ssg-dots i.on{background:var(--fond,#f60);width:1.4rem;border-radius:9px}
  .ssg-row{display:flex;gap:.6rem;justify-content:center}.ssg-row button{padding:.65rem 1.2rem;border-radius:999px}.ssg-row .sk{background:transparent!important;color:var(--gris,#aaa)!important}`;
  document.head.append(css);
  function guide() {
    const s = t().s; let i = 0;
    const o = document.createElement('div'); o.className = 'ssg'; o.setAttribute('role', 'dialog');
    const draw = () => {
      const [ic, h, p] = s[i];
      o.innerHTML = `<div class="ssg-card"><div class="ssg-ico">${ic}</div><h2>${h}</h2><p>${p}</p><div class="ssg-dots">${s.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><div class="ssg-row">${i < s.length - 1 ? `<button class="sk" type="button">${t().skip}</button>` : ''}<button class="nx" type="button">${i < s.length - 1 ? t().next : t().go}</button></div></div>`;
      const end = () => { fetch('/api/push/guide-seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin' }).catch(() => {}); o.remove(); };
      o.querySelector('.nx').onclick = () => (i < s.length - 1 ? (i++, draw()) : end());
      const sk = o.querySelector('.sk'); if (sk) sk.onclick = end;
    };
    draw(); document.body.append(o);
  }
  window.ssGuide = guide;
  function mount() {
    delete document.documentElement.dataset.theme;
    // guide : seulement à la toute première connexion d'un compte tout neuf
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).then((d) => {
      if (!d.user || !d.user.guide || document.documentElement.dataset.skin) return;
      let n = 0; const w = setInterval(() => { const x = document.querySelector('dialog[open]'); if (!x || ++n > 60) { clearInterval(w); if (!x) setTimeout(guide, 500); } }, 700);
    }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
