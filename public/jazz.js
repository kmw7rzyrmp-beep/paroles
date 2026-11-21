// Musique de fond, jouée en direct par le navigateur (Web Audio) : rien à télécharger, aucun droit d'auteur.
// Plusieurs ambiances au choix (jazz, lo-fi, bossa nova, piano calme), un volume, et un bouton pour couper.
// Les navigateurs interdisent le son avant un premier clic : la musique démarre au premier geste.
(() => {
  const store = {
    get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  let wanted = store.get('jazz-on', '1') !== '0';
  let styleId = store.get('bg-style', 'jazz');
  let volume = Math.min(1, Math.max(0, Number(store.get('bg-vol', '0.6'))));
  if (!Number.isFinite(volume)) volume = 0.6;

  const css = `
  .bgm { position: fixed; left: 1rem; bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); z-index: 20; }
  .jazz-btn {
    display: inline-flex; align-items: center; gap: .45rem; min-height: 2.5rem; padding: .3rem .85rem .3rem .6rem;
    border-radius: 999px; font-size: .88rem; box-shadow: 0 6px 18px rgba(0,0,0,.5);
    background: #1d1c21; border: 1px solid #3a3940; color: var(--blanc);
  }
  .jazz-btn .jz-bars { display: inline-flex; align-items: flex-end; gap: 2px; width: 1rem; height: .95rem; }
  .jazz-btn .jz-bars i { width: 3px; height: 30%; background: currentColor; border-radius: 1px; }
  .jazz-btn.playing { border-color: var(--orange); }
  .jazz-btn.playing .jz-bars i { animation: jz 1.1s ease-in-out infinite; }
  .jazz-btn.playing .jz-bars i:nth-child(2) { animation-delay: -.35s; }
  .jazz-btn.playing .jz-bars i:nth-child(3) { animation-delay: -.7s; }
  .jazz-btn:not(.playing) { color: var(--gris); }
  .jazz-btn:not(.playing) .jz-bars i { height: 2px; }
  .jazz-btn .jz-caret { width: .4rem; height: .4rem; border-right: 2px solid currentColor; border-top: 2px solid currentColor; transform: rotate(-45deg) translateY(2px); margin-left: .15rem; opacity: .7; }
  @keyframes jz { 0%, 100% { height: 25%; } 50% { height: 100%; } }
  .bgm-menu {
    position: absolute; left: 0; bottom: calc(100% + .5rem); width: min(17.5rem, calc(100vw - 2rem));
    padding: .8rem; background: #1d1c21; border: 1px solid #3a3940; border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,.65);
  }
  .bgm-menu[hidden] { display: none; }
  .bgm-menu:not([hidden]) { animation: bgmIn .18s ease-out; }
  @keyframes bgmIn { from { opacity: 0; transform: translateY(6px) scale(.98); } }
  .bgm-menu h2 { margin: 0 0 .5rem; font: 800 .8rem var(--texte); color: var(--gris); }
  .bgm-list { display: grid; gap: .3rem; margin: 0 0 .8rem; }
  .bgm-opt {
    display: grid; grid-template-columns: 1.6rem 1fr; align-items: center; column-gap: .5rem; width: 100%; min-height: 2.9rem; padding: .35rem .55rem;
    text-align: left; background: #26252c; color: var(--blanc); border: 1px solid transparent; border-radius: 8px; box-shadow: none; font: inherit;
  }
  .bgm-opt:hover { background: #2e2d35; }
  .bgm-opt:active { transform: none; box-shadow: none; }
  .bgm-opt[aria-checked="true"] { border-color: var(--orange); background: rgba(242, 140, 28, .12); }
  .bgm-opt .ic { grid-row: span 2; font-size: 1.15rem; text-align: center; }
  .bgm-opt b { font-size: .95rem; }
  .bgm-opt small { color: var(--gris); font-size: .76rem; }
  .bgm-row { display: flex; align-items: center; gap: .6rem; }
  .bgm-row label { font-size: .82rem; color: var(--gris); flex: none; }
  .bgm-row input[type="range"] { flex: 1; accent-color: var(--orange); min-height: 2rem; }
  .bgm-actions { display: flex; gap: .5rem; margin-top: .6rem; }
  .bgm-actions button { flex: 1; min-height: 2.4rem; font-size: .88rem; }
  @media (prefers-reduced-motion: reduce) { .jazz-btn.playing .jz-bars i { animation: none; height: 70%; } .bgm-menu:not([hidden]) { animation: none; } }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.append(styleEl);

  // ============ le petit studio ============
  let ctx = null, master = null, bus = null, warm = null, crackleGain = null;
  let playing = false, timer = null, bar = 0, nextBar = 0;
  const ducked = new Set(); // ce qui joue sur la page (extrait, vidéo, vocal) : la musique se tait
  const MAX_GAIN = 0.26;

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200;
    bus = ctx.createGain();
    const rev = ctx.createConvolver(); rev.buffer = impulse(2.6);
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    bus.connect(warm); bus.connect(rev); rev.connect(wet); wet.connect(warm);
    warm.connect(comp); comp.connect(master); master.connect(ctx.destination);
    crackle();
  }
  function impulse(sec) {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
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
  function crackle() { // craquement de vinyle
    const len = ctx.sampleRate * 4;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.6 : (Math.random() * 2 - 1) * 0.012;
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    crackleGain = ctx.createGain(); crackleGain.gain.value = 0.25;
    src.connect(f); f.connect(crackleGain); crackleGain.connect(master);
    src.start();
  }
  const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const out = (node, panValue) => {
    if (ctx.createStereoPanner && panValue) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, panValue)); node.connect(p); p.connect(bus); } else node.connect(bus);
  };

  // ============ les instruments ============
  // piano électrique (type Rhodes)
  function keys(midi, t, dur, vel = 0.5) {
    const g = ctx.createGain();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = hz(midi);
    o2.type = 'sine'; o2.frequency.value = hz(midi) * 2.001;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    const trem = ctx.createOscillator(), tg = ctx.createGain();
    trem.frequency.value = 4.2; tg.gain.value = 0.07; trem.connect(tg); tg.connect(g.gain);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    out(g, (midi - 64) / 40);
    const peak = 0.11 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
    for (const o of [o1, o2, trem]) { o.start(t); o.stop(t + dur + 0.9); }
  }
  // piano acoustique doux
  function piano(midi, t, dur, vel = 0.5) {
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.min(12000, hz(midi) * 6), t); f.frequency.exponentialRampToValueAtTime(hz(midi) * 1.5, t + 1.2);
    const parts = [[1, 1], [2, 0.35], [3, 0.12]].map(([m, a]) => {
      const o = ctx.createOscillator(); o.type = m === 1 ? 'triangle' : 'sine'; o.frequency.value = hz(midi) * m * (m === 1 ? 1 : 1.0015);
      const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(f); return o;
    });
    f.connect(g); out(g, (midi - 64) / 50);
    const peak = 0.12 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(peak * 0.25, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    for (const o of parts) { o.start(t); o.stop(t + dur + 1.3); }
  }
  // guitare (accords pincés, pour la bossa)
  function pluck(midi, t, vel = 0.5) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = hz(midi);
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.35);
    o.connect(f); f.connect(g); out(g, (midi - 60) / 30);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * vel, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.start(t); o.stop(t + 1);
  }
  // nappe douce (piano calme)
  function pad(midis, t, dur) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    f.connect(g); out(g, 0);
    const os = midis.map((m, i) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = i % 2 ? 6 : -6; o.connect(f); return o; });
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + dur * 0.4); g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    for (const o of os) { o.start(t); o.stop(t + dur + 0.7); }
  }
  // basse : contrebasse ronde, ou basse douce et longue (soft)
  function bass(midi, t, dur, soft) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = soft ? 'sine' : 'triangle'; o.frequency.value = hz(midi);
    f.type = 'lowpass'; f.frequency.setValueAtTime(soft ? 500 : 900, t); f.frequency.exponentialRampToValueAtTime(soft ? 220 : 260, t + 0.25);
    o.connect(f); f.connect(g); g.connect(bus);
    const peak = soft ? 0.38 : 0.32;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.25, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    o.start(t); o.stop(t + dur + 0.1);
  }
  // batterie
  function hiss(t, dur, vol, type, freq, q = 0.7) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function brush(t, dur, vol) {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6;
    const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  function thump(t, freq, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.45, t + dur);
    o.connect(g); g.connect(bus);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const ride = (t, vol) => hiss(t, 0.35, vol, 'highpass', 7000);
  const hat = (t, vol) => hiss(t, 0.06, vol, 'highpass', 8000);
  const shaker = (t, vol) => hiss(t, 0.08, vol, 'bandpass', 6000, 1.2);
  const snare = (t, vol) => { hiss(t, 0.18, vol, 'bandpass', 1800, 0.8); thump(t, 190, 0.08, vol * 0.8); };
  const rim = (t, vol) => { hiss(t, 0.03, vol, 'bandpass', 2500, 4); thump(t, 900, 0.03, vol * 0.6); };
  const kick = (t, vol) => thump(t, 110, 0.32, vol);

  // ============ les ambiances ============
  // chaque accord : note de basse, voicing (notes MIDI), gamme pour les petites mélodies
  const C = (root, voice, scale) => ({ root, voice, scale });
  const STYLES = [
    {
      id: 'jazz', icon: '🎷', name: 'Jazz doux', desc: 'Piano électrique, contrebasse, balais',
      en: ['Smooth jazz', 'Electric piano, upright bass, brushes'],
      bpm: 74, swing: 0.62, tone: 5200, crackle: 0.25,
      chords: [
        C(50, [60, 64, 65, 69], [62, 64, 65, 67, 69, 72, 74]), C(43, [59, 64, 65, 69], [62, 64, 67, 69, 71, 74]),
        C(48, [59, 62, 64, 67], [60, 62, 64, 67, 69, 71, 72]), C(45, [58, 61, 64, 67], [61, 64, 67, 69, 70, 73]),
        C(41, [57, 60, 64, 67], [60, 62, 64, 65, 67, 69, 72]), C(40, [57, 59, 62, 67], [59, 62, 64, 67, 69, 71]),
        C(50, [60, 64, 65, 69], [62, 64, 65, 67, 69, 72, 74]), C(43, [58, 63, 65, 69], [62, 63, 65, 67, 70, 74]),
      ],
      bar(t, c, next, s) {
        const { beat, sw } = s;
        const v = 0.55 + Math.random() * 0.2;
        c.voice.forEach((m, i) => keys(m, t + i * 0.012, beat * 2.2, v));
        if (Math.random() < 0.6) c.voice.forEach((m, i) => keys(m, t + beat * 2 + sw + i * 0.01, beat * 1.2, v * 0.6));
        [c.root, c.root + pick([3, 4, 7]), c.root + 7, next.root + pick([-1, 1, 2])].forEach((m, i) => bass(m, t + i * beat, beat * 0.92));
        for (let i = 0; i < 4; i++) {
          brush(t + i * beat, beat * 0.9, i % 2 ? 0.05 : 0.025);
          ride(t + i * beat, i % 2 ? 0.035 : 0.025);
          if (i % 2) ride(t + i * beat + sw, 0.02);
        }
        if (s.n % 2 === 1 && Math.random() < 0.7) melody(t, c, s, keys, 0.45);
      },
    },
    {
      id: 'lofi', icon: '🎧', name: 'Lo-fi chill', desc: 'Beat tranquille, ambiance chambre la nuit',
      en: ['Lo-fi chill', 'Laid-back beat, late-night room vibe'],
      bpm: 80, swing: 0.58, tone: 2600, crackle: 0.55,
      chords: [
        C(41, [60, 64, 67, 69], [60, 62, 64, 67, 69, 72]), C(40, [59, 62, 64, 67], [59, 62, 64, 67, 69, 71]),
        C(38, [57, 60, 62, 65], [57, 60, 62, 64, 65, 69]), C(43, [59, 62, 65, 69], [59, 62, 65, 67, 69, 71]),
      ],
      bar(t, c, next, s) {
        const { beat, sw } = s;
        c.voice.forEach((m, i) => keys(m, t + i * 0.03, beat * 3.6, 0.6));
        if (Math.random() < 0.5) c.voice.slice(1).forEach((m, i) => keys(m + 12, t + beat * 2.5 + i * 0.02, beat, 0.3));
        bass(c.root, t, beat * 1.8, true);
        bass(c.root + pick([0, 7, 12]), t + beat * 2.5, beat * 1.2, true);
        kick(t, 0.5); kick(t + beat + sw, 0.32); kick(t + beat * 2.5, 0.45);
        snare(t + beat, 0.12); snare(t + beat * 3, 0.12);
        for (let i = 0; i < 8; i++) hat(t + Math.floor(i / 2) * beat + (i % 2 ? sw : 0), i % 2 ? 0.02 : 0.035);
        if (s.n % 4 === 3 && Math.random() < 0.6) melody(t, c, s, keys, 0.35);
      },
    },
    {
      id: 'bossa', icon: '🌴', name: 'Bossa nova', desc: 'Guitare, ambiance terrasse au soleil',
      en: ['Bossa nova', 'Guitar, sunny terrace vibe'],
      bpm: 132, swing: 0.5, tone: 6000, crackle: 0.12,
      chords: [
        C(48, [52, 55, 59, 62], [60, 62, 64, 67, 69, 71]), C(48, [52, 55, 59, 62], [60, 62, 64, 67, 69, 71]),
        C(45, [52, 55, 58, 61], [61, 64, 67, 69, 70]), C(45, [52, 55, 58, 61], [61, 64, 67, 69, 70]),
        C(50, [53, 57, 60, 64], [62, 64, 65, 67, 69, 72]), C(43, [53, 57, 59, 64], [62, 64, 65, 67, 71]),
        C(48, [52, 55, 59, 62], [60, 62, 64, 67, 69, 71]), C(43, [53, 56, 59, 63], [62, 63, 65, 67, 71]),
      ],
      bar(t, c, next, s) {
        const { beat } = s;
        const s16 = beat / 4; // une double croche
        // basse : fondamentale puis quinte, avec le petit rebond typique
        bass(c.root, t, beat * 1.4); bass(c.root + 7, t + beat * 1.5, beat * 0.45);
        bass(c.root + 7, t + beat * 2, beat * 1.4); bass(c.root, t + beat * 3.5, beat * 0.45);
        // guitare : accords sur le rythme décalé de la bossa
        for (const at of [0, 3, 6, 10, 12]) c.voice.forEach((m, i) => pluck(m, t + at * s16 + i * 0.008, at === 0 ? 1 : 0.75));
        for (let i = 0; i < 8; i++) shaker(t + i * beat / 2, i % 2 ? 0.018 : 0.03);
        for (const at of [0, 3, 6, 10, 12]) rim(t + at * s16, 0.04);
        if (s.n % 2 === 1 && Math.random() < 0.6) melody(t, c, s, keys, 0.4);
      },
    },
    {
      id: 'piano', icon: '🌙', name: 'Piano calme', desc: 'Juste un piano et une nappe, très doux',
      en: ['Calm piano', 'Just a piano and a soft pad'],
      bpm: 64, swing: 0.5, tone: 4200, crackle: 0.08,
      chords: [
        C(45, [57, 60, 64, 71], [69, 71, 72, 76, 79]), C(41, [57, 60, 64, 67], [69, 72, 74, 76, 79]),
        C(48, [55, 59, 64, 67], [67, 71, 72, 74, 76]), C(43, [55, 59, 62, 64], [67, 69, 71, 74, 76]),
      ],
      bar(t, c, next, s) {
        const { beat } = s;
        piano(c.root, t, beat * 4, 0.55);
        pad(c.voice, t, beat * 4);
        // arpège lent qui monte puis redescend
        const arp = [...c.voice, c.voice[2] + 12, c.voice[1] + 12, c.voice[3], c.voice[2]];
        arp.forEach((m, i) => piano(m, t + i * beat / 2 + Math.random() * 0.015, beat, i === 0 ? 0.42 : 0.32));
        if (Math.random() < 0.5) piano(pick(c.scale) + 12, t + beat * pick([2, 2.5, 3]), beat * 2, 0.28);
      },
    },
  ];
  const styleOf = (id) => STYLES.find((x) => x.id === id) || STYLES[0];
  if (!STYLES.some((x) => x.id === styleId)) styleId = 'jazz';

  // petite phrase mélodique sur la gamme de l'accord
  function melody(t, c, s, inst, vel) {
    let at = t + s.beat * (Math.random() < 0.5 ? 1 : 0.62);
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n && at < t + s.beat * 3.6; i++) {
      inst(pick(c.scale) + 12, at, s.beat * 0.8, vel);
      at += pick([s.sw, s.beat - s.sw, s.beat, s.beat]);
    }
  }

  function scheduleBar(t) {
    const st = styleOf(styleId);
    const beat = 60 / st.bpm;
    st.bar(t, st.chords[bar % st.chords.length], st.chords[(bar + 1) % st.chords.length], { beat, sw: beat * st.swing, n: bar });
    bar++;
    return beat * 4;
  }
  function loop() { while (nextBar < ctx.currentTime + 1.5) nextBar += scheduleBar(nextBar); }

  function applyTone() {
    if (!ctx) return;
    const st = styleOf(styleId);
    warm.frequency.setTargetAtTime(st.tone, ctx.currentTime, 0.3);
    crackleGain.gain.setTargetAtTime(st.crackle, ctx.currentTime, 0.3);
  }
  function fade(to, sec) {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(to, now + sec);
  }
  const level = () => MAX_GAIN * volume;

  async function start() {
    if (playing || !wanted || ducked.size || document.visibilityState !== 'visible') return;
    try { if (!ctx) setup(); await ctx.resume(); } catch { return; }
    if (ctx.state !== 'running' || playing) return; // pas encore de clic : on réessaiera au premier geste
    playing = true;
    applyTone();
    nextBar = Math.max(nextBar, ctx.currentTime + 0.1);
    loop();
    clearInterval(timer); timer = setInterval(loop, 250);
    fade(level(), 2.5);
    draw();
  }
  function stop(sec = 0.8) {
    if (!playing) return;
    playing = false;
    clearInterval(timer); timer = null;
    clearTimeout(switching);
    fade(0, sec);
    const c = ctx;
    setTimeout(() => { if (!playing && c.state === 'running') c.suspend(); }, sec * 1000 + 1700);
    draw();
  }
  // changer d'ambiance : petit fondu, on laisse s'éteindre les notes prévues, puis la nouvelle grille démarre
  let switching = null;
  function changeStyle(id) {
    const changed = id !== styleId;
    styleId = id; store.set('bg-style', id);
    if (!wanted) { wanted = true; store.set('jazz-on', '1'); }
    draw();
    if (!playing) { bar = 0; start(); return; }
    if (!changed) return;
    clearTimeout(switching);
    fade(0, 0.5);
    clearInterval(timer); timer = null;
    switching = setTimeout(() => {
      if (!playing) return;
      bar = 0;
      nextBar = ctx.currentTime + 0.05;
      applyTone();
      loop();
      timer = setInterval(loop, 250);
      fade(level(), 1.2);
    }, 1600);
  }

  // ============ le bouton et le menu ============
  const box = document.createElement('div');
  box.className = 'bgm';
  box.setAttribute('data-notranslate', '');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ghost jazz-btn';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="jz-bars" aria-hidden="true"><i></i><i></i><i></i></span><span class="jz-lbl"></span><span class="jz-caret" aria-hidden="true"></span>';
  const menu = document.createElement('div');
  menu.className = 'bgm-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'dialog');
  box.append(menu, btn);
  document.body.append(box);

  const EN = () => document.documentElement.lang === 'en';
  const T = (fr, en) => (EN() ? en : fr);
  const nameOf = (st) => (EN() ? st.en : [st.name, st.desc]);

  function buildMenu() {
    menu.setAttribute('aria-label', T('Musique de fond', 'Background music'));
    const h = document.createElement('h2'); h.textContent = T('Musique de fond', 'Background music');
    const list = document.createElement('div'); list.className = 'bgm-list'; list.setAttribute('role', 'radiogroup');
    for (const st of STYLES) {
      const o = document.createElement('button');
      o.type = 'button'; o.className = 'bgm-opt';
      o.setAttribute('role', 'radio');
      o.setAttribute('aria-checked', String(st.id === styleId && wanted));
      const [name, desc] = nameOf(st);
      const ic = document.createElement('span'); ic.className = 'ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = st.icon;
      const b = document.createElement('b'); b.textContent = name;
      const sm = document.createElement('small'); sm.textContent = desc;
      o.append(ic, b, sm);
      o.onclick = () => { changeStyle(st.id); buildMenu(); };
      list.append(o);
    }
    const row = document.createElement('div'); row.className = 'bgm-row';
    const lab = document.createElement('label'); lab.textContent = 'Volume'; lab.htmlFor = 'bgmVol';
    const range = document.createElement('input');
    range.type = 'range'; range.id = 'bgmVol'; range.min = '0'; range.max = '100'; range.value = String(Math.round(volume * 100));
    range.oninput = () => {
      volume = Number(range.value) / 100; store.set('bg-vol', String(volume));
      if (playing) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(level(), ctx.currentTime, 0.05); }
    };
    row.append(lab, range);
    const actions = document.createElement('div'); actions.className = 'bgm-actions';
    const toggle = document.createElement('button'); toggle.type = 'button';
    if (wanted) toggle.className = 'ghost';
    toggle.textContent = wanted ? T('Couper la musique', 'Turn music off') : T('Remettre la musique', 'Turn music on');
    toggle.onclick = () => {
      wanted = !wanted; store.set('jazz-on', wanted ? '1' : '0');
      if (wanted) start(); else stop(0.5);
      draw(); buildMenu();
    };
    actions.append(toggle);
    menu.replaceChildren(h, list, row, actions);
  }

  function draw() {
    const st = styleOf(styleId);
    btn.classList.toggle('playing', playing);
    const name = nameOf(st)[0];
    btn.querySelector('.jz-lbl').textContent = wanted ? name : T('Musique coupée', 'Music off');
    btn.setAttribute('aria-label', T('Musique de fond : ', 'Background music: ') + (wanted ? name : T('coupée', 'off')));
    btn.title = T('Choisir la musique de fond', 'Choose the background music');
  }

  function openMenu(on) {
    menu.hidden = !on;
    btn.setAttribute('aria-expanded', String(on));
    if (on) { buildMenu(); (menu.querySelector('[aria-checked="true"]') || menu.querySelector('.bgm-opt')).focus({ preventScroll: true }); }
  }
  btn.addEventListener('click', () => openMenu(menu.hidden));
  document.addEventListener('pointerdown', (e) => { if (!menu.hidden && !box.contains(e.target)) openMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { openMenu(false); btn.focus(); } });
  new MutationObserver(() => { draw(); if (!menu.hidden) buildMenu(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // premier geste sur la page : la musique peut démarrer
  const firstGesture = () => { if (wanted) start(); };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) document.addEventListener(ev, firstGesture, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') start(); else stop(0.3); });

  // un extrait, une vidéo ou un vocal se lance : la musique se tait, puis revient
  const duck = (id, on) => {
    if (on) { ducked.add(id); stop(0.4); } else { ducked.delete(id); if (!ducked.size) setTimeout(start, 600); }
  };
  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    const el = this;
    if (!el.__jazzWatch) {
      el.__jazzWatch = true;
      const off = () => duck(el, false);
      el.addEventListener('pause', off); el.addEventListener('ended', off); el.addEventListener('emptied', off);
    }
    duck(el, true);
    const p = realPlay.apply(el, args);
    if (p && p.catch) p.catch(() => duck(el, false));
    return p;
  };
  window.addEventListener('site-music', (e) => duck('ext:' + (e.detail.id || ''), Boolean(e.detail.playing)));

  draw();
})();
