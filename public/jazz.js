// Musique de fond : du jazz doux, joué en direct par le navigateur (Web Audio).
// Pas de fichier audio : piano électrique, contrebasse qui marche et balais sur la caisse claire
// sont fabriqués par le code, donc aucun droit d'auteur et rien à télécharger.
// Les navigateurs interdisent le son avant un premier clic : la musique démarre au premier geste.
(() => {
  const KEY = 'jazz-on';
  let wanted = true;
  try { wanted = localStorage.getItem(KEY) !== '0'; } catch {}

  const css = `
  .jazz-btn {
    position: fixed; left: 1rem; bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); z-index: 20;
    display: inline-flex; align-items: center; gap: .45rem; min-height: 2.5rem; padding: .3rem .85rem .3rem .6rem;
    border-radius: 999px; font-size: .88rem; box-shadow: 0 6px 18px rgba(0,0,0,.5);
    background: #1d1c21; border: 1px solid #3a3940; color: var(--blanc);
  }
  .jazz-btn .jz-bars { display: inline-flex; align-items: flex-end; gap: 2px; width: 1rem; height: .95rem; }
  .jazz-btn .jz-bars i { width: 3px; height: 30%; background: currentColor; border-radius: 1px; }
  .jazz-btn.playing .jz-bars i { animation: jz 1.1s ease-in-out infinite; }
  .jazz-btn.playing .jz-bars i:nth-child(2) { animation-delay: -.35s; }
  .jazz-btn.playing .jz-bars i:nth-child(3) { animation-delay: -.7s; }
  .jazz-btn:not(.playing) { color: var(--gris); }
  .jazz-btn.playing { border-color: var(--orange); }
  .jazz-btn:not(.playing) .jz-bars i { height: 2px; }
  @keyframes jz { 0%, 100% { height: 25%; } 50% { height: 100%; } }
  @media (prefers-reduced-motion: reduce) { .jazz-btn.playing .jz-bars i { animation: none; height: 70%; } }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ghost jazz-btn';
  btn.innerHTML = '<span class="jz-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="jz-lbl"></span>';
  document.body.append(btn);

  let ctx = null, master = null, bus = null, playing = false, timer = null;
  let ducked = new Set(); // ce qui joue en ce moment sur la page (extrait, vidéo) : le jazz se tait
  const VOLUME = 0.16;

  function draw() {
    btn.classList.toggle('playing', playing);
    btn.querySelector('.jz-lbl').textContent = wanted ? 'Jazz' : 'Jazz coupé';
    btn.setAttribute('aria-pressed', String(wanted));
    btn.setAttribute('aria-label', wanted ? 'Couper la musique de fond' : 'Mettre la musique de fond');
    btn.title = wanted ? 'Couper la musique de fond' : 'Mettre du jazz en fond';
  }

  // --- le petit studio : réverbération douce + compresseur ---
  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3;
    const warm = ctx.createBiquadFilter();
    warm.type = 'lowpass'; warm.frequency.value = 5200; // un son chaud, un peu « vinyle »
    bus = ctx.createGain();
    const rev = ctx.createConvolver();
    rev.buffer = impulse(2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    bus.connect(warm);
    bus.connect(rev); rev.connect(wet); wet.connect(warm);
    warm.connect(comp); comp.connect(master); master.connect(ctx.destination);
    crackle();
  }
  function impulse(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return b;
  }
  let noiseBuf = null;
  function noise() {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }
  // un léger craquement de vinyle, très bas
  function crackle() {
    const len = ctx.sampleRate * 4;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.012;
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    const g = ctx.createGain(); g.gain.value = 0.25;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // piano électrique (type Rhodes) : sinus + petite harmonique, attaque douce, longue extinction
  function keys(midi, t, dur, vel = 0.5) {
    const g = ctx.createGain();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = hz(midi);
    o2.type = 'sine'; o2.frequency.value = hz(midi) * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    const trem = ctx.createOscillator(), tg = ctx.createGain();
    trem.frequency.value = 4.2; tg.gain.value = 0.07;
    trem.connect(tg); tg.connect(g.gain);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = (midi - 64) / 40; g.connect(pan); pan.connect(bus); } else g.connect(bus);
    const peak = 0.11 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
    for (const o of [o1, o2, trem]) { o.start(t); o.stop(t + dur + 0.9); }
  }

  // contrebasse : son rond, attaque un peu « pincée »
  function bass(midi, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o.frequency.value = hz(midi);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.25);
    o.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.08, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.start(t); o.stop(t + dur + 0.1);
  }

  // balais : un souffle filtré ; ride : petit « ting » métallique
  function brush(t, dur, vol) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6;
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function ride(t, vol) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.start(t, Math.random() * 0.5); s.stop(t + 0.4);
  }

  // --- la grille : une suite d'accords jazz classique (ii-V-I), en boucle ---
  // chaque accord : fondamentale de basse + voicing du piano (notes MIDI) + gamme pour les petites mélodies
  const CHORDS = [
    { root: 50, voice: [60, 64, 65, 69], scale: [62, 64, 65, 67, 69, 72, 74] },  // Dm9
    { root: 43, voice: [59, 64, 65, 69], scale: [62, 64, 67, 69, 71, 74] },      // G13
    { root: 48, voice: [59, 62, 64, 67], scale: [60, 62, 64, 67, 69, 71, 72] },  // Cmaj9
    { root: 45, voice: [58, 61, 64, 67], scale: [61, 64, 67, 69, 70, 73] },      // A7(b9)
    { root: 41, voice: [57, 60, 64, 67], scale: [60, 62, 64, 65, 67, 69, 72] },  // Fmaj9
    { root: 40, voice: [57, 59, 62, 67], scale: [59, 62, 64, 67, 69, 71] },      // Em7
    { root: 50, voice: [60, 64, 65, 69], scale: [62, 64, 65, 67, 69, 72, 74] },  // Dm9
    { root: 43, voice: [58, 63, 65, 69], scale: [62, 63, 65, 67, 70, 74] },      // G7(b13)
  ];
  const BPM = 74;
  const beat = 60 / BPM;
  const swing = beat * 0.62; // croche « swing » : la 1re plus longue que la 2e
  let bar = 0, nextBar = 0;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function scheduleBar(t) {
    const c = CHORDS[bar % CHORDS.length];
    const next = CHORDS[(bar + 1) % CHORDS.length];
    // piano : l'accord sur le 1, parfois rejoué en contretemps (« comping »)
    const v = 0.55 + Math.random() * 0.2;
    c.voice.forEach((m, i) => keys(m, t + i * 0.012, beat * 2.2, v));
    if (Math.random() < 0.6) {
      const at = t + beat * 2 + swing;
      c.voice.forEach((m, i) => keys(m, at + i * 0.01, beat * 1.2, v * 0.6));
    }
    // contrebasse qui « marche » : 4 noires, la dernière mène vers l'accord suivant
    const notes = [c.root, c.root + pick([3, 4, 7]), c.root + 7, next.root + pick([-1, 1, 2])];
    notes.forEach((m, i) => bass(m, t + i * beat, beat * 0.92));
    // batterie aux balais
    for (let i = 0; i < 4; i++) {
      brush(t + i * beat, beat * 0.9, i % 2 ? 0.05 : 0.025);
      ride(t + i * beat, i % 2 ? 0.035 : 0.025);
      if (i % 2) ride(t + i * beat + swing, 0.02);
    }
    // de temps en temps, une petite phrase mélodique tout en douceur
    if (bar % 2 === 1 && Math.random() < 0.7) {
      let at = t + beat * (Math.random() < 0.5 ? 1 : 0.62);
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n && at < t + beat * 3.6; i++) {
        keys(pick(c.scale) + 12, at, beat * 0.8, 0.45);
        at += pick([swing, beat - swing, beat, beat]);
      }
    }
    bar++;
  }

  // on prépare la musique un peu à l'avance, mesure par mesure
  function loop() {
    while (nextBar < ctx.currentTime + 1.5) {
      scheduleBar(nextBar);
      nextBar += beat * 4;
    }
  }

  function fade(to, sec) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(to, now + sec);
  }

  async function start() {
    if (playing || !wanted || ducked.size || document.visibilityState !== 'visible') return;
    try {
      if (!ctx) setup();
      await ctx.resume();
    } catch { return; }
    if (ctx.state !== 'running') return; // pas encore de clic : on réessaiera au premier geste
    playing = true;
    nextBar = Math.max(nextBar, ctx.currentTime + 0.1);
    loop();
    clearInterval(timer);
    timer = setInterval(loop, 250);
    fade(VOLUME, 2.5);
    draw();
  }

  function stop(sec = 0.8) {
    if (!playing) return;
    playing = false;
    clearInterval(timer); timer = null;
    fade(0, sec);
    const c = ctx;
    setTimeout(() => { if (!playing && c.state === 'running') c.suspend(); }, sec * 1000 + 1700);
    draw();
  }

  btn.addEventListener('click', () => {
    wanted = !wanted;
    try { localStorage.setItem(KEY, wanted ? '1' : '0'); } catch {}
    if (wanted) start(); else stop(0.5);
    draw();
  });

  // premier geste sur la page : la musique peut démarrer
  const firstGesture = () => { if (wanted) start(); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, firstGesture, { capture: true, passive: true });

  // onglet caché : on coupe ; revenu : on reprend
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') start(); else stop(0.3);
  });

  // un extrait ou une vidéo se lance sur la page : le jazz se tait, puis revient après
  const duck = (id, on) => {
    if (on) { ducked.add(id); stop(0.4); } else { ducked.delete(id); if (!ducked.size) setTimeout(start, 600); }
  };
  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    const el = this;
    if (!el.__jazzWatch) {
      el.__jazzWatch = true;
      const off = () => duck(el, false);
      el.addEventListener('pause', off);
      el.addEventListener('ended', off);
      el.addEventListener('emptied', off);
    }
    duck(el, true);
    const p = realPlay.apply(el, args);
    if (p && p.catch) p.catch(() => duck(el, false));
    return p;
  };
  window.addEventListener('site-music', (e) => duck('ext:' + (e.detail.id || ''), Boolean(e.detail.playing)));

  draw();
})();
