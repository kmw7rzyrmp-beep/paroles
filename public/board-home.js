// Classement mondial du blind test, en version courte sur la page d'accueil (top 10 + ta place).
(() => {
  const anchor = document.querySelector('.bt-link');
  if (!anchor) return;
  const css = `
  .hb { margin: 2.6rem 0 0; max-width: 40rem; }
  .hb-head { display: flex; align-items: baseline; gap: .8rem; flex-wrap: wrap; }
  .hb-head h2 { margin: 0; font: 900 clamp(1.6rem, 5vw, 2.2rem)/1 var(--texte); font-stretch: 62%; text-transform: uppercase; }
  .hb-head .hb-count { color: var(--gris); font-size: .92rem; }
  .hb-head a { margin-left: auto; color: var(--jaune); font-weight: 700; font-size: .95rem; }
  .hb-note { color: var(--gris); margin: .35rem 0 .9rem; min-height: 1.2rem; font-size: .95rem; }
  .hb-note a { color: var(--jaune); }
  .hb-list, .hb-me { list-style: none; margin: 0; padding: 0; }
  .hb-row {
    display: grid; grid-template-columns: 2.2rem 2.2rem 1fr auto; align-items: center; gap: .7rem;
    padding: .5rem .75rem; margin: 0 0 .35rem; border-radius: 6px; background: var(--coque); cursor: pointer;
    opacity: 0; transform: translateY(12px); transition: opacity .4s ease, transform .4s cubic-bezier(.2, .8, .2, 1), background .2s;
  }
  .hb-row.in { opacity: 1; transform: none; }
  .hb-row:hover { background-color: #302f37; }
  .hb-row:focus-visible { outline: 3px solid var(--jaune); outline-offset: 2px; }
  .hb-row .rk { font: 900 1.4rem/1 var(--texte); font-stretch: 62%; color: var(--gris); text-align: center; }
  .hb-row .av { width: 2.2rem; height: 2.2rem; border-radius: 50%; background: var(--coque-hi); display: grid; place-items: center; font-weight: 800; overflow: hidden; }
  .hb-row .av img { width: 100%; height: 100%; object-fit: cover; }
  .hb-row .who { min-width: 0; }
  .hb-row .name { display: block; font: 800 1.05rem/1.15 var(--texte); font-stretch: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb-row .name .fl { margin-left: .35rem; font-size: .8rem; color: #ffb15c; }
  .hb-row .meta { display: block; color: var(--gris); font-size: .8rem; }
  .hb-row .pts { font: 900 1.3rem/1 var(--texte); font-stretch: 65%; font-variant-numeric: tabular-nums; text-align: right; }
  .hb-row .pts small { display: block; font: 500 .7rem var(--texte); color: var(--gris); }
  .hb-row.p1 { background: linear-gradient(90deg, rgba(245, 196, 58, .28), var(--coque) 70%); }
  .hb-row.p2 { background: linear-gradient(90deg, rgba(220, 220, 228, .18), var(--coque) 70%); }
  .hb-row.p3 { background: linear-gradient(90deg, rgba(242, 140, 28, .22), var(--coque) 70%); }
  .hb-row.p1 .rk { color: var(--jaune); } .hb-row.p2 .rk { color: #dcdce4; } .hb-row.p3 .rk { color: var(--orange); }
  .hb-row.me { outline: 2px solid var(--orange); outline-offset: -2px; }
  .hb-me { margin-top: .7rem; padding-top: .7rem; border-top: 1px dashed var(--ligne); }
  .hb-me[hidden] { display: none; }
  .hb-empty { color: var(--gris); font-style: italic; }
  @media (prefers-reduced-motion: reduce) { .hb-row { opacity: 1; transform: none; transition: none; } }
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.append(st);

  const nf = new Intl.NumberFormat('fr-FR');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sec = document.createElement('section');
  sec.className = 'hb';
  sec.id = 'classement';
  sec.setAttribute('aria-labelledby', 'hbTitle');
  sec.innerHTML = `
    <div class="hb-head"><h2 id="hbTitle">Classement mondial</h2><span class="hb-count"></span><a href="/blindtest">Jouer pour grimper</a></div>
    <p class="hb-note"></p>
    <ol class="hb-list"></ol>
    <ol class="hb-me" hidden></ol>`;
  anchor.after(sec);
  const list = sec.querySelector('.hb-list'), meBox = sec.querySelector('.hb-me'), note = sec.querySelector('.hb-note'), count = sec.querySelector('.hb-count');

  function row(r, isMe) {
    const li = document.createElement('li');
    li.className = 'hb-row' + (r.rank <= 3 ? ' p' + r.rank : '') + (isMe ? ' me' : '');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    const rk = document.createElement('span'); rk.className = 'rk'; rk.textContent = r.rank;
    const av = document.createElement('span'); av.className = 'av'; av.setAttribute('aria-hidden', 'true');
    if (r.avatarUrl) { const img = document.createElement('img'); img.src = r.avatarUrl; img.alt = ''; img.loading = 'lazy'; av.append(img); } else av.textContent = r.username.slice(0, 1).toUpperCase();
    const who = document.createElement('span'); who.className = 'who';
    const name = document.createElement('span'); name.className = 'name'; name.setAttribute('data-notranslate', '');
    name.textContent = r.username + (isMe ? ' (toi)' : '');
    if (r.streak) { const f = document.createElement('span'); f.className = 'fl'; f.textContent = '🔥' + r.streak; f.title = `Série de ${r.streak} jour${r.streak > 1 ? 's' : ''}`; name.append(f); }
    const meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = `${r.games} partie${r.games > 1 ? 's' : ''}, ${r.wins} victoire${r.wins > 1 ? 's' : ''}`;
    who.append(name, meta);
    const pts = document.createElement('span'); pts.className = 'pts';
    pts.append(document.createTextNode(nf.format(r.points)));
    const sm = document.createElement('small'); sm.textContent = 'points'; pts.append(sm);
    li.append(rk, av, who, pts);
    li.setAttribute('aria-label', `${r.rank}, ${r.username}, ${r.points} points. Afficher le profil`);
    const open = () => window.openProfile && window.openProfile(r.username);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    return li;
  }

  let sig = '';
  async function load() {
    try {
      const r = await fetch('/api/bt/leaderboard', { cache: 'no-store' });
      const d = await r.json();
      const s = JSON.stringify(d);
      if (s === sig) return;
      const first = !sig;
      sig = s;
      const meName = d.me ? d.me.username.toLowerCase() : '';
      const top = (d.top || []).slice(0, 10);
      const rows = top.map((x) => row(x, x.username.toLowerCase() === meName));
      if (!rows.length) { const p = document.createElement('li'); p.className = 'hb-empty'; p.textContent = 'Personne n’a encore joué. Lance un blind test et prends la première place !'; rows.push(p); }
      list.replaceChildren(...rows);
      const showMe = d.me && !top.some((x) => x.username.toLowerCase() === meName);
      meBox.hidden = !showMe;
      meBox.replaceChildren(...(showMe ? [row(d.me, true)] : []));
      count.textContent = d.total ? `${d.total} joueur${d.total > 1 ? 's' : ''}` : '';
      note.replaceChildren();
      if (!d.loggedIn) note.textContent = 'Connecte-toi et joue au blind test pour apparaître dans le classement.';
      else if (!d.me) note.textContent = 'Joue une partie de blind test pour entrer dans le classement.';
      else note.textContent = d.me.rank === 1 ? 'T’es numéro 1 mondial. Garde ta place.' : `T’es ${d.me.rank}e mondial. Encore un effort.`;
      // apparition en cascade
      const items = [...sec.querySelectorAll('.hb-row')];
      items.forEach((li, i) => {
        if (reduce || !first) { li.classList.add('in'); return; }
        li.style.transitionDelay = `${Math.min(i, 10) * 50}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => li.classList.add('in')));
      });
    } catch {
      if (!sig) note.textContent = 'Classement indisponible pour le moment.';
    }
  }
  // on charge quand le classement arrive à l'écran, puis toutes les 30 s
  let started = false;
  new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting) && !started) { started = true; load(); setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30_000); } }, { rootMargin: '200px' }).observe(sec);
  window.addEventListener('account-changed', () => { sig = ''; load(); });
})();
