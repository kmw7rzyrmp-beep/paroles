// Petits outils partagés par toutes les pages :
// - ssConfirm() : une vraie fenêtre « Tu es sûr ? » (à la place de confirm())
// - needLogin() : le grand message « Tu dois te connecter »
// - sayHello() : un message de bienvenue tiré au hasard quand on se reconnecte
(() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const css = `
  dialog.ss-modal { width: min(25rem, calc(100vw - 2rem)); padding: 0; border: 0; border-radius: 26px; background: #141416; color: #f4f4f5; box-shadow: 0 30px 80px rgba(0,0,0,.7); overflow: hidden; }
  dialog.ss-modal[open] { animation: ssPop .32s cubic-bezier(.2, 1.25, .4, 1); }
  dialog.ss-modal::backdrop { background: rgba(0,0,0,.62); backdrop-filter: blur(5px); }
  @keyframes ssPop { from { opacity: 0; transform: translateY(18px) scale(.95); } }
  .ss-body { padding: 1.6rem 1.5rem 1.1rem; text-align: center; }
  .ss-ico { width: 4rem; height: 4rem; margin: 0 auto .9rem; border-radius: 20px; display: grid; place-items: center; font-size: 2rem; background: rgba(242, 107, 58, .16); }
  .ss-modal.danger .ss-ico { background: rgba(255, 90, 90, .14); }
  .ss-body h2 { margin: 0 0 .45rem; font: 800 1.3rem/1.2 Inter, system-ui, sans-serif; letter-spacing: -.02em; }
  .ss-body p { margin: 0; color: #a1a1aa; font-size: .95rem; line-height: 1.45; }
  .ss-foot { display: flex; gap: .5rem; padding: 0 1.5rem 1.5rem; }
  .ss-foot button { flex: 1; min-height: 2.9rem; border: 0; border-radius: 999px; font: 700 .95rem Inter, system-ui, sans-serif; cursor: pointer; }
  .ss-foot .no { background: #232327; color: #f4f4f5; }
  .ss-foot .yes { background: #f26b3a; color: #fff; }
  .ss-modal.danger .ss-foot .yes { background: #e5484d; }
  .ss-foot button:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }

  .ss-hello { position: fixed; left: 1rem; right: 1rem; margin: 0 auto; width: fit-content; top: 1.4rem; z-index: 200; display: flex; align-items: center; gap: .8rem; max-width: calc(100vw - 2rem);
    padding: .8rem 1.3rem .8rem .8rem; border-radius: 20px; background: linear-gradient(135deg, #f26b3a, #c8401f); color: #fff; box-shadow: 0 20px 50px rgba(242, 107, 58, .35);
    animation: helloIn .6s cubic-bezier(.2, 1.4, .4, 1) both, helloOut .5s ease-in 4.6s forwards; pointer-events: none; }
  .ss-hello .wave { font-size: 1.9rem; animation: wave 1.2s .3s ease-in-out 2; transform-origin: 70% 70%; }
  .ss-hello b { display: block; font: 800 1.05rem Inter, system-ui, sans-serif; }
  .ss-hello span { font-size: .85rem; opacity: .9; }
  @keyframes helloIn { from { opacity: 0; transform: translateY(-30px) scale(.85); } }
  @keyframes helloOut { to { opacity: 0; transform: translateY(-20px); } }
  @keyframes wave { 25% { transform: rotate(18deg); } 50% { transform: rotate(-10deg); } 75% { transform: rotate(14deg); } }
  @media (prefers-reduced-motion: reduce) { dialog.ss-modal[open], .ss-hello, .ss-hello .wave { animation: none !important; } }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  // --- « Tu es sûr ? » ---
  window.ssConfirm = ({ icon = '🤔', title, text = '', ok = 'Oui', cancel = 'Annuler', danger = false } = {}) => new Promise((resolve) => {
    const d = el('dialog', 'ss-modal' + (danger ? ' danger' : ''));
    d.setAttribute('aria-labelledby', 'ssT');
    const body = el('div', 'ss-body');
    const h = el('h2', '', title); h.id = 'ssT';
    body.append(el('div', 'ss-ico', icon), h);
    if (text) body.append(el('p', '', text));
    const foot = el('div', 'ss-foot');
    const no = el('button', 'no', cancel); no.type = 'button';
    const yes = el('button', 'yes', ok); yes.type = 'button';
    foot.append(no, yes);
    d.append(body, foot);
    let answer = false;
    no.onclick = () => d.close();
    yes.onclick = () => { answer = true; d.close(); };
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { d.remove(); resolve(answer); });
    document.body.append(d);
    d.showModal();
    no.focus();
  });

  // --- « Tu dois te connecter » ---
  const loginTo = (mode) => {
    const b = document.getElementById(mode === 'signup' ? 'signupBtn' : 'loginBtn');
    if (b && location.pathname === '/') b.click(); else location.href = '/?' + (mode === 'signup' ? 'signup' : 'login') + '=1';
  };
  window.needLogin = (what = 'ça') => {
    const d = el('dialog', 'ss-modal');
    d.setAttribute('aria-labelledby', 'ssL');
    const body = el('div', 'ss-body');
    const h = el('h2', '', 'Tu dois te connecter'); h.id = 'ssL';
    body.append(el('div', 'ss-ico', '🔒'), h, el('p', '', `Pour ${what}, connecte-toi à ton compte Star Song. Pas encore de compte ? Il se crée en 10 secondes.`));
    const foot = el('div', 'ss-foot');
    const su = el('button', 'no', 'Créer un compte'); su.type = 'button';
    const li = el('button', 'yes', 'Se connecter'); li.type = 'button';
    su.onclick = () => { d.close(); loginTo('signup'); };
    li.onclick = () => { d.close(); loginTo('login'); };
    foot.append(su, li);
    d.append(body, foot);
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => d.remove());
    document.body.append(d);
    d.showModal();
    li.focus();
  };

  // --- « Content de te revoir » : 40 phrases tirées au hasard ---
  const HELLO = [
    'Hey, ça fait longtemps qu’on ne t’a pas vu !', 'Un plaisir de te revoir !', 'Te revoilà ! Le son n’attendait que toi.', 'Bon retour parmi nous !',
    'La légende est de retour 🔥', 'On commençait à s’ennuyer sans toi.', 'Tiens, tiens… qui revoilà ?', 'Content de te revoir, la scène est à toi.',
    'Le blind test t’a manqué, avoue.', 'Ça faisait un bail ! Prêt à tout casser ?', 'Re ! Les platines sont encore chaudes.', 'Revoilà la meilleure oreille du site.',
    'Bienvenue à la maison 🏠', 'On t’a gardé ta place au chaud.', 'Te voilà enfin ! Les sons t’attendaient.', 'Quel bonheur de te retrouver !',
    'Le retour du boss 👑', 'Allez, on remet le son ?', 'Tes amis vont être contents de te voir.', 'Tu nous avais manqué, sérieux.',
    'Retour gagnant ! On lance une partie ?', 'Ah, enfin quelqu’un qui a du goût.', 'Le micro est à toi, bon retour !', 'Encore toi ? On adore.',
    'Prêt pour un nouveau record ?', 'Les classements tremblent déjà.', 'Hello ! Ta flamme t’attendait 🔥', 'Ravi de te revoir dans le game.',
    'On reprend là où on s’était arrêtés ?', 'Remets ton casque, c’est parti 🎧', 'Bienvenue de retour, star !', 'Ça sent la victoire depuis que t’es là.',
    'Coucou ! Les paroles n’ont pas bougé.', 'De retour pour régner sur le blind test ?', 'Ton public t’attendait 🎤', 'Te revoilà, on monte le volume !',
    'Bon retour ! Quoi de neuf dans tes playlists ?', 'Hey toi ! Une petite partie pour se chauffer ?', 'Quelle joie de te revoir ici !', 'Le son est meilleur quand t’es là.',
  ];
  window.sayHello = (name) => {
    document.querySelector('.ss-hello')?.remove();
    const box = el('div', 'ss-hello');
    box.setAttribute('role', 'status');
    const t = el('div');
    t.append(el('b', '', HELLO[Math.floor(Math.random() * HELLO.length)]));
    if (name) { const s = el('span', '', String(name).startsWith('@') ? name : '@' + name); s.setAttribute('data-notranslate', ''); t.append(s); }
    box.append(el('span', 'wave', '👋'), t);
    document.body.append(box);
    setTimeout(() => box.remove(), 5300);
  };
})();
