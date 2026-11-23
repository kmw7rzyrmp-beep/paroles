// Guide de bienvenue (1re connexion d'un nouveau compte) — le thème clair est désactivé
(() => {
  const L = (() => { try { return localStorage.getItem('lang') || document.documentElement.lang || 'fr'; } catch { return 'fr'; } })();
  const T = {
    fr: { next: 'Suivant', back: 'Retour', skip: 'Passer', go: "C'est parti !", s: [
      ['Bienvenue {u} !', 'Star Song, c’est retrouver n’importe quel son et défier tes potes. Petit tour d’une minute ?'],
      ['Retrouve un son avec ses paroles', 'Tape les mots qui te restent en tête, même approximatifs : on te donne le titre, l’artiste et un extrait.'],
      ['Blind test entre potes', 'Un extrait se lance, quatre réponses s’affichent. Plus tu réponds vite, plus tu marques de points.'],
      ['Le blind test animé', 'Les openings cultes : devine l’anime, et le clip se lance à la réponse.'],
      ['Tes amis, ta team', 'Ajoute tes potes, vois qui est en ligne, discute avec eux et invite-les en partie.'],
      ['Une flamme par jour', 'Joue chaque jour pour faire grandir ta flamme. Et chaque jour, un bonus ×2 t’attend.'],
      ['Tu es prêt !', 'Grimpe au classement et deviens la légende de Star Song.']],
      typed: 'un refrain dans ma tête…', found: 'Trouvé !', foundSub: 'Titre, artiste et extrait', q: 'C’est quel anime ?', streak: 'jours d’affilée', bonus: '⚡ Bonus ×2 du jour', hi: 'On se fait un blind ?', yes: 'Go 🔥' },
    en: { next: 'Next', back: 'Back', skip: 'Skip', go: "Let's go!", s: [
      ['Welcome {u}!', 'Star Song lets you find any song and challenge your friends. Quick one-minute tour?'],
      ['Find a song from its lyrics', 'Type the words stuck in your head, even roughly: we give you the title, the artist and a preview.'],
      ['Blind test with friends', 'A preview plays, four answers show up. The faster you answer, the more points you score.'],
      ['The anime blind test', 'Iconic openings: guess the anime, and the clip plays on the reveal.'],
      ['Your friends, your crew', 'Add friends, see who’s online, chat and invite them to a game.'],
      ['One flame a day', 'Play every day to grow your flame. And every day, a ×2 bonus is waiting.'],
      ['You’re ready!', 'Climb the leaderboard and become a Star Song legend.']],
      typed: 'a chorus in my head…', found: 'Found it!', foundSub: 'Title, artist and preview', q: 'Which anime is it?', streak: 'days in a row', bonus: '⚡ Daily ×2 bonus', hi: 'Blind test?', yes: 'Go 🔥' },
    dz: { next: 'Suivant', back: 'Retour', skip: 'Passer', go: 'Yalla on y va !', s: [
      ['Marhba {u} ! 🇩🇿', 'Star Song, c’est retrouver n’importe quel son et clasher tes khawa. Petit tour d’une minute, sahbi ?'],
      ['Retrouve un son avec ses paroles', 'Tape les mots qui te trottent dans la tête, même à moitié : on te sort le titre, l’artiste et un extrait.'],
      ['Blind test entre khawa', 'Un extrait se lance, quatre réponses s’affichent. Plus t’es rapide, plus tu ramasses des points.'],
      ['Le blind test animé', 'Les openings cultes : devine l’anime, et le clip se lance à la réponse.'],
      ['Tes amis, ta team', 'Ajoute tes khawa, vois qui est en ligne, parle avec eux et invite-les en partie.'],
      ['Une flamme par jour', 'Joue chaque jour pour faire grandir ta flamme. Et chaque jour, un bonus ×2 t’attend.'],
      ['T’es chaud !', 'Grimpe au classement et deviens la légende de Star Song, khoya.']],
      typed: 'un refrain dans ma tête…', found: 'Trouvé !', foundSub: 'Titre, artiste et extrait', q: 'C’est quel anime ?', streak: 'jours d’affilée', bonus: '⚡ Bonus ×2 du jour', hi: 'On se fait un blind ?', yes: 'Yalla 🔥' },
  };
  const t = T[L] || T.fr;
  const logo = () => (document.querySelector('img.star-logo') || {}).src || '/logo.svg';
  const R = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');

  const css = document.createElement('style');
  css.textContent = `
  .gd{position:fixed;inset:0;z-index:500;display:grid;place-items:center;padding:1rem;background:rgba(5,5,7,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:gdFade .35s ease}
  .gd.out{animation:gdFade .3s ease reverse forwards}
  @keyframes gdFade{from{opacity:0}}
  .gd-card{--ac:#f26b3a;position:relative;width:min(25rem,100%);background:#131315;color:#f4f4f5;border-radius:30px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.06);animation:gdPop .55s cubic-bezier(.2,1.4,.4,1)}
  @keyframes gdPop{from{transform:translateY(30px) scale(.9);opacity:0}}
  .gd-bars{position:absolute;top:.85rem;left:1rem;right:1rem;z-index:3;display:flex;gap:.3rem}
  .gd-bars i{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.28);overflow:hidden}
  .gd-bars i b{display:block;height:100%;width:0;background:#fff;transition:width .45s ease}
  .gd-bars i.done b{width:100%}
  .gd-x{position:absolute;top:1.5rem;right:.9rem;z-index:3;background:rgba(0,0,0,.28)!important;color:#fff!important;border-radius:999px;padding:.3rem .8rem;font-size:.8rem}
  .gd-scene{position:relative;height:16rem;overflow:hidden;background:var(--bg);transition:background .5s}
  .gd-scene>.sc{position:absolute;inset:0;display:grid;place-items:center}
  .sc.in-r{animation:inR .5s cubic-bezier(.2,.9,.3,1)}.sc.in-l{animation:inL .5s cubic-bezier(.2,.9,.3,1)}
  @keyframes inR{from{transform:translateX(40%);opacity:0}}@keyframes inL{from{transform:translateX(-40%);opacity:0}}
  .gd-body{padding:1.3rem 1.5rem 1.3rem;text-align:center}
  .gd-body h2{margin:0 0 .45rem;font-size:1.45rem;line-height:1.2;letter-spacing:-.01em}
  .gd-body p{margin:0;color:#a6a6ad;line-height:1.5;min-height:4.5em}
  .gd-body.anim h2{animation:up .5s .05s both}.gd-body.anim p{animation:up .5s .15s both}
  @keyframes up{from{transform:translateY(12px);opacity:0}}
  @keyframes show{from{transform:translateY(12px);opacity:0}to{opacity:1;transform:none}}
  .gd-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:1.1rem}
  .gd-row .bk{background:transparent!important;color:#8e8e95!important;padding:.7rem .4rem}
  .gd-row .bk[hidden]{display:inline-block!important;visibility:hidden}
  .gd-row .nx{background:var(--ac)!important;color:#fff!important;padding:.8rem 1.5rem;border-radius:999px;font-weight:700;box-shadow:0 10px 26px -8px var(--ac);transition:transform .15s,background .4s}
  .gd-row .nx:active{transform:scale(.95)}
  .gd-row .nx.final{animation:pulse 1.4s infinite}
  @keyframes pulse{50%{transform:scale(1.06)}}
  .gd-count{font-size:.8rem;color:#6d6d74}
  /* 1. bienvenue */
  .g-vin{width:9.5rem;height:9.5rem;border-radius:50%;background:repeating-radial-gradient(circle,#111 0 3px,#1c1c1f 3px 5px);display:grid;place-items:center;box-shadow:0 20px 50px rgba(0,0,0,.5),0 0 0 6px rgba(255,255,255,.08);animation:spin 4s linear infinite,popIn .7s cubic-bezier(.2,1.5,.4,1)}
  .g-vin img{width:3.6rem;height:3.6rem;border-radius:50%}
  @keyframes spin{to{transform:rotate(360deg)}}@keyframes popIn{from{transform:scale(.3)}}
  .g-glow{position:absolute;width:15rem;height:15rem;border-radius:50%;background:radial-gradient(circle,rgba(255,200,120,.55),transparent 65%);animation:breathe 2.4s ease-in-out infinite}
  @keyframes breathe{50%{transform:scale(1.15);opacity:.7}}
  .g-note{position:absolute;bottom:-2rem;left:var(--x);font-size:var(--s);color:#fff;opacity:0;animation:noteUp 3.2s var(--d) ease-in infinite}
  @keyframes noteUp{0%{opacity:0;transform:translateY(0) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(-19rem) rotate(25deg)}}
  /* 2. recherche */
  .g-srch{width:85%;display:flex;flex-direction:column;gap:.8rem}
  .g-bar{display:flex;align-items:center;gap:.6rem;background:rgba(0,0,0,.3);border:2px solid rgba(255,255,255,.35);border-radius:999px;padding:.8rem 1rem;color:#fff;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.25)}
  .g-caret{width:2px;height:1.1em;background:#fff;animation:blink .8s steps(1) infinite}@keyframes blink{50%{opacity:0}}
  .g-res{display:flex;align-items:center;gap:.8rem;background:#fff;color:#17171a;border-radius:18px;padding:.7rem;opacity:0;transform:translateY(20px);box-shadow:0 18px 40px rgba(0,0,0,.3)}
  .g-res.on{animation:resIn .55s cubic-bezier(.2,1.4,.4,1) forwards}@keyframes resIn{to{opacity:1;transform:none}}
  .g-cov{width:3rem;height:3rem;border-radius:12px;background:conic-gradient(from 40deg,#f26b3a,#ffb347,#ff5e8a,#f26b3a);flex:none;animation:spin 6s linear infinite}
  .g-res b{display:block}.g-res small{color:#77777e}
  .g-ok{margin-left:auto;width:1.9rem;height:1.9rem;border-radius:50%;background:#1fbf6a;color:#fff;display:grid;place-items:center;font-weight:800;transform:scale(0)}
  .g-res.on .g-ok{animation:popIn2 .4s .4s cubic-bezier(.2,1.8,.4,1) forwards}@keyframes popIn2{to{transform:scale(1)}}
  /* 3. blind test */
  .g-bt{width:86%;margin-top:1.4rem;display:flex;flex-direction:column;align-items:center;gap:.9rem;position:relative}
  .g-eq{display:flex;gap:.3rem;align-items:flex-end;height:2.6rem}
  .g-eq i{width:.5rem;border-radius:4px;background:#fff;animation:eq .9s var(--d) ease-in-out infinite alternate}
  @keyframes eq{from{height:18%}to{height:100%}}
  .g-opts{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;width:100%}
  .g-opts span{background:rgba(0,0,0,.28);border:1.5px solid rgba(255,255,255,.25);color:#fff;border-radius:14px;padding:.6rem;text-align:center;font-weight:600;font-size:.9rem;opacity:0;animation:show .4s var(--d) forwards}
  .g-opts span.good{animation:show .4s var(--d) forwards,good .4s 1.9s forwards}
  .g-opts span.bad{animation:show .4s var(--d) forwards,bad .4s 1.9s forwards}
  @keyframes good{to{background:#1fbf6a;border-color:#1fbf6a;transform:scale(1.06)}}@keyframes bad{from{opacity:1}to{opacity:.45}}
  .g-pts{position:absolute;left:0;top:-.2rem;font-size:1.6rem;font-weight:900;color:#fff;text-shadow:0 4px 14px rgba(0,0,0,.4);opacity:0;animation:pts 1.4s 2.1s forwards}
  @keyframes pts{0%{opacity:0;transform:translateY(20px) scale(.6)}30%{opacity:1;transform:translateY(0) scale(1.2)}100%{opacity:1;transform:translateY(-8px) scale(1)}}
  /* 4. animé */
  .g-sun{position:absolute;bottom:-6.5rem;width:12rem;height:12rem;opacity:.85;border-radius:50%;background:linear-gradient(#ffd36e,#ff4f9a 60%,#b23cff);-webkit-mask:repeating-linear-gradient(#000 0 14px,transparent 14px 18px);mask:repeating-linear-gradient(#000 0 14px,transparent 14px 18px);animation:sunUp 1s cubic-bezier(.2,.9,.3,1)}
  @keyframes sunUp{from{transform:translateY(5rem)}}
  .g-petal{position:absolute;top:-1rem;left:var(--x);width:.7rem;height:.5rem;border-radius:70% 0;background:#ffb7d5;opacity:.9;animation:petal var(--t) var(--d) linear infinite}
  @keyframes petal{to{transform:translate(-3rem,18rem) rotate(540deg)}}
  .g-an{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:.7rem;width:84%;margin-top:1.6rem}
  .g-an .g-opts span{background:rgba(20,6,40,.7);font-size:.82rem;padding:.5rem}
  .g-q{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:999px;padding:.35rem 1rem;font-weight:700;color:#fff;backdrop-filter:blur(4px)}
  .g-kanji{font-size:1.7rem;line-height:1;font-weight:900;color:#fff;text-shadow:0 0 18px #ff4f9a,0 0 40px #b23cff;animation:kj 3s steps(1) infinite}
  /* 5. amis */
  .g-fr{position:relative;width:18rem;height:13rem}
  .g-fr svg{position:absolute;inset:0;width:100%;height:100%}
  .g-fr path{fill:none;stroke:rgba(255,255,255,.55);stroke-width:2.5;stroke-dasharray:200;stroke-dashoffset:200;animation:draw 1s var(--d) forwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  .g-av{position:absolute;width:3.6rem;height:3.6rem;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:1.3rem;color:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.2),0 10px 24px rgba(0,0,0,.3);transform:scale(0);animation:popIn2 .5s var(--d) cubic-bezier(.2,1.6,.4,1) forwards}
  .g-av::after{content:'';position:absolute;right:.05rem;bottom:.1rem;width:.85rem;height:.85rem;border-radius:50%;background:#1fd36f;border:3px solid #2b5cff}
  .g-bub{position:absolute;background:#fff;color:#17171a;border-radius:16px;padding:.45rem .8rem;font-weight:600;font-size:.85rem;box-shadow:0 10px 24px rgba(0,0,0,.25);transform:scale(0);animation:popIn2 .45s var(--d) cubic-bezier(.2,1.6,.4,1) forwards;white-space:nowrap}
  /* 6. flamme */
  .g-fl{display:flex;flex-direction:column;align-items:center;gap:.6rem}
  .g-fire{font-size:4.6rem;line-height:1;filter:drop-shadow(0 0 22px #ffb020);animation:flick .5s ease-in-out infinite alternate,popIn .7s cubic-bezier(.2,1.5,.4,1)}
  @keyframes flick{from{transform:scale(1) rotate(-3deg)}to{transform:scale(1.08) rotate(3deg)}}
  .g-num{font-size:1rem;font-weight:800;color:#fff}.g-num b{font-size:1.6rem}
  .g-days{display:flex;gap:.4rem}
  .g-days i{width:1.5rem;height:1.5rem;border-radius:50%;background:rgba(0,0,0,.25);border:2px solid rgba(255,255,255,.35);animation:day .3s var(--d) forwards}
  @keyframes day{to{background:#ffd23f;border-color:#fff;box-shadow:0 0 12px #ffd23f}}
  .g-bon{background:#fff;color:#c2410c;font-weight:800;border-radius:999px;padding:.35rem .9rem;font-size:.85rem;opacity:0;animation:show .45s 2.1s forwards,wig 1s 2.6s ease-in-out infinite}
  @keyframes wig{50%{transform:rotate(-4deg) scale(1.05)}}
  /* 7. final */
  .g-rays{position:absolute;width:30rem;height:30rem;background:repeating-conic-gradient(rgba(255,255,255,.16) 0 10deg,transparent 10deg 20deg);animation:spin 14s linear infinite;border-radius:50%}
  .g-cup{position:relative;font-size:5.5rem;filter:drop-shadow(0 12px 24px rgba(0,0,0,.35));animation:popIn .8s cubic-bezier(.2,1.6,.4,1),float 2.4s 1s ease-in-out infinite}
  @keyframes float{50%{transform:translateY(-10px)}}
  .g-conf{position:absolute;top:-1rem;left:var(--x);width:.5rem;height:.8rem;background:var(--c);border-radius:2px;animation:conf var(--t) var(--d) linear infinite}
  @keyframes conf{to{transform:translateY(19rem) rotate(720deg)}}
  @media (prefers-reduced-motion:reduce){.gd *{animation-duration:.01s!important;animation-iteration-count:1!important}}`;
  document.head.append(css);

  const S = [
    { bg: 'radial-gradient(circle at 50% 45%,#ff9a5a,#e8541f 55%,#8f2a0c)', ac: '#f26b3a',
      sc: () => `<div class="g-glow"></div><div class="g-vin"><img src="${logo()}" alt=""></div>` + R(9, (i) => `<span class="g-note" style="--x:${8 + i * 10}%;--d:${(i * 0.37) % 2.6}s;--s:${1 + (i % 3) * 0.4}rem">${'♪♫♬'[i % 3]}</span>`) },
    { bg: 'linear-gradient(145deg,#ff5e8a,#f26b3a 60%,#ffb347)', ac: '#ff5e7a',
      sc: () => `<div class="g-srch"><div class="g-bar">🔍 <span class="g-typ"></span><span class="g-caret"></span></div><div class="g-res"><div class="g-cov"></div><div><b>${t.found}</b><small>${t.foundSub}</small></div><span class="g-ok">✓</span></div></div>`,
      init: (el, T2) => { const s = t.typed, out = el.querySelector('.g-typ'); let i = 0; T2.push(setTimeout(function k() { out.textContent = s.slice(0, ++i); if (i < s.length) T2.push(setTimeout(k, 55)); else T2.push(setTimeout(() => el.querySelector('.g-res').classList.add('on'), 250)); }, 500)); } },
    { bg: 'linear-gradient(150deg,#0fae7a,#0b7a6a 55%,#0a3d4a)', ac: '#14b87d',
      sc: () => `<div class="g-bt"><div class="g-eq">${R(9, (i) => `<i style="--d:${(i * 0.13) % 0.9}s"></i>`)}</div><div class="g-opts">${['Nova', 'Kyky', 'Lune Rouge', 'Saphir'].map((n, i) => `<span class="${i === 1 ? 'good' : 'bad'}" style="--d:${0.3 + i * 0.12}s">${n}</span>`).join('')}</div><div class="g-pts">+500</div></div>` },
    { bg: 'linear-gradient(#1a0b3d,#3a0f6b 60%,#6b1a7a)', ac: '#d14bff',
      sc: () => `<div class="g-sun"></div>` + R(14, (i) => `<i class="g-petal" style="--x:${(i * 7.3) % 100}%;--d:${(i * 0.41) % 3}s;--t:${3 + (i % 4) * 0.6}s"></i>`) + `<div class="g-an"><div class="g-kanji">アニメ</div><div class="g-q">${t.q}</div><div class="g-opts">${['Naruto', 'One Piece', 'Jujutsu Kaisen', 'Demon Slayer'].map((n, i) => `<span class="${i === 2 ? 'good' : 'bad'}" style="--d:${0.3 + i * 0.12}s">${n}</span>`).join('')}</div></div>` },
    { bg: 'linear-gradient(150deg,#3b6bff,#2b4fd8 55%,#1b2a7a)', ac: '#4a7bff',
      sc: () => `<div class="g-fr"><svg viewBox="0 0 288 208"><path style="--d:.6s" d="M60 150 Q144 40 228 150"/><path style="--d:.9s" d="M60 150 L228 150"/><path style="--d:1.1s" d="M144 60 L144 150"/></svg>
        <div class="g-av" style="left:1.9rem;top:7.4rem;background:#f26b3a;--d:.1s">L</div><div class="g-av" style="right:1.9rem;top:7.4rem;background:#14b87d;--d:.3s">Z</div><div class="g-av" style="left:7.2rem;top:1.6rem;background:#d14bff;--d:.5s">M</div>
        <div class="g-bub" style="left:.2rem;top:.6rem;--d:1.5s">${t.hi}</div><div class="g-bub" style="right:.2rem;top:3.4rem;--d:2.1s">${t.yes}</div></div>` },
    { bg: 'linear-gradient(160deg,#ffb020,#ff6a1a 55%,#c2280c)', ac: '#ff7a1a',
      sc: () => `<div class="g-fl"><div class="g-fire">🔥</div><div class="g-num"><b class="g-n">0</b> ${t.streak}</div><div class="g-days">${R(7, (i) => `<i style="--d:${0.4 + i * 0.22}s"></i>`)}</div><div class="g-bon">${t.bonus}</div></div>`,
      init: (el, T2) => { const n = el.querySelector('.g-n'); for (let i = 1; i <= 7; i++) T2.push(setTimeout(() => { n.textContent = i; }, 400 + i * 220)); } },
    { bg: 'radial-gradient(circle at 50% 55%,#ffd36e,#f5a623 50%,#c96a0c)', ac: '#f26b3a',
      sc: () => `<div class="g-rays"></div><div class="g-cup">🏆</div>` + R(26, (i) => `<i class="g-conf" style="--x:${(i * 3.9) % 100}%;--d:${(i * 0.17) % 2.5}s;--t:${2 + (i % 5) * 0.4}s;--c:${['#ff5e8a', '#fff', '#14b87d', '#4a7bff', '#d14bff', '#f26b3a'][i % 6]}"></i>`) },
  ];

  function guide(name) {
    let i = 0, timers = [];
    const o = document.createElement('div'); o.className = 'gd'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = `<div class="gd-card"><div class="gd-bars">${S.map(() => '<i><b></b></i>').join('')}</div><button class="gd-x" type="button">${t.skip}</button><div class="gd-scene"></div><div class="gd-body"><h2></h2><p></p><div class="gd-row"><button class="bk" type="button">‹ ${t.back}</button><span class="gd-count"></span><button class="nx" type="button"></button></div></div></div>`;
    const card = o.querySelector('.gd-card'), scene = o.querySelector('.gd-scene'), body = o.querySelector('.gd-body');
    const end = () => { timers.forEach(clearTimeout); o.classList.add('out'); setTimeout(() => o.remove(), 300); document.removeEventListener('keydown', key);
      fetch('/api/push/guide-seen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin' }).catch(() => {}); };
    const show = (dir) => {
      timers.forEach(clearTimeout); timers = [];
      const s = S[i];
      card.style.setProperty('--ac', s.ac); scene.style.setProperty('--bg', s.bg);
      const sc = document.createElement('div'); sc.className = 'sc ' + (dir < 0 ? 'in-l' : 'in-r'); sc.innerHTML = s.sc();
      scene.replaceChildren(sc); if (s.init) s.init(sc, timers);
      o.querySelectorAll('.gd-bars i').forEach((b, k) => b.classList.toggle('done', k <= i));
      body.classList.remove('anim'); void body.offsetWidth; body.classList.add('anim');
      body.querySelector('h2').textContent = t.s[i][0].replace('{u}', name || '');
      body.querySelector('p').textContent = t.s[i][1];
      body.querySelector('.gd-count').textContent = `${i + 1} / ${S.length}`;
      body.querySelector('.bk').hidden = i === 0;
      const nx = body.querySelector('.nx'); const last = i === S.length - 1;
      nx.textContent = last ? t.go : t.next + ' ›'; nx.classList.toggle('final', last);
      o.querySelector('.gd-x').hidden = last;
    };
    const go = (d) => { const j = i + d; if (j < 0) return; if (j >= S.length) return end(); i = j; show(d); };
    o.querySelector('.nx').onclick = () => go(1);
    o.querySelector('.bk').onclick = () => go(-1);
    o.querySelector('.gd-x').onclick = end;
    function key(e) { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') end(); }
    document.addEventListener('keydown', key);
    let x0 = null;
    card.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); });
    document.body.append(o); show(1);
  }
  window.ssGuidePreview = guide; // aperçu (console) uniquement

  function mount() {
    delete document.documentElement.dataset.theme;
    // guide : seulement à la toute première connexion d'un compte tout neuf
    fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).then((d) => {
      if (!d.user || !d.user.guide || document.documentElement.dataset.skin) return;
      let n = 0; const w = setInterval(() => { const x = document.querySelector('dialog[open]'); if (!x || ++n > 60) { clearInterval(w); if (!x) setTimeout(() => guide(d.user.name), 500); } }, 700);
    }).catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
