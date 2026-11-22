// Musique de fond de la version DZ : une petite boucle « orientale » fabriquée en direct par le navigateur
// (rythme de darbouka, mélodie dans la gamme hijaz, bourdon grave). Rien n'est téléchargé, aucun droit d'auteur.
(function () {
  if (location.pathname !== '/') return; // pas pendant le blind test : on entendrait les sons par-dessus
  const VOL = 0.34, KEY = 'dz-music';
  const BPM = 98, STEP = 60 / BPM / 2; // un pas = une croche
  const BASE = 293.66; // ré
  const SEMI = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16]; // gamme hijaz : ré, mi♭, fa♯, sol, la, si♭, do, ré, mi♭, fa♯
  const hz = (i) => BASE * Math.pow(2, SEMI[i] / 12);
  const PH = {
    A: [4, -1, 5, 4, 3, 2, 1, -1], B: [7, 6, 5, -1, 4, 5, 4, -1], C: [2, 3, 4, -1, 5, 4, 3, 2],
    D: [9, 8, 7, -1, 6, 5, 4, -1], E: [1, 2, 1, 0, 1, -1, 0, -1],
  };
  const SONGS = [['A', 'B', 'C', 'E'], ['D', 'B', 'C', 'E'], ['A', 'C', 'B', 'E']];
  const MAQSUM = { 0: 'dum', 1: 'tek', 3: 'tek', 4: 'dum', 6: 'tek', 2: 'ka', 7: 'ka' };

  let ctx = null, master = null, bus = null, noise = null, timer = null, nextT = 0, step = 0, song = SONGS[0], bar = 0;
  let wanted = false, started = false, btn = null;
  const ducking = new Set();
  const enabled = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 1;
    const delay = ctx.createDelay(1); delay.delayTime.value = STEP * 1.5;
    const fb = ctx.createGain(); fb.gain.value = 0.3; const wet = ctx.createGain(); wet.gain.value = 0.35;
    bus.connect(master); bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    const len = Math.floor(ctx.sampleRate * 0.2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
    // bourdon : ré grave + la
    for (const [f, g] of [[BASE / 4, 0.07], [BASE / 4 * 1.5, 0.035]]) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), gn = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 420; gn.gain.value = g;
      o.connect(lp); lp.connect(gn); gn.connect(master); o.start();
    }
    return true;
  }

  function hit(kind, t) {
    if (kind === 'dum') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(62, t + 0.13);
      g.gain.setValueAtTime(0.75, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.3);
    } else {
      const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; hp.type = 'bandpass'; hp.frequency.value = kind === 'tek' ? 3400 : 2400; hp.Q.value = 1.2;
      g.gain.setValueAtTime(kind === 'tek' ? 0.32 : 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'tek' ? 0.07 : 0.05));
      s.connect(hp); hp.connect(g); g.connect(bus); s.start(t); s.stop(t + 0.1);
    }
  }

  function pluck(f, t, len) {
    for (const [type, det, gain] of [['sawtooth', 0, 0.11], ['triangle', 7, 0.14]]) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      lfo.frequency.value = 5.5; lg.gain.value = 5; lfo.connect(lg); lg.connect(o.detune); // petit vibrato
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(700, t + len);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(lp); lp.connect(g); g.connect(bus); o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
    }
  }

  function schedule(s, t) {
    const pos = s % 8;
    if (pos === 0) { bar++; if (bar % 4 === 1) song = SONGS[Math.floor(Math.random() * SONGS.length)]; }
    if (MAQSUM[pos]) hit(MAQSUM[pos], t);
    const idx = PH[song[(bar - 1) % 4 < 0 ? 0 : (bar - 1) % 4]][pos];
    if (idx >= 0) {
      if (Math.random() < 0.3 && idx + 1 < SEMI.length) pluck(hz(idx + 1), t - 0.07, 0.09); // petite note d'ornement
      pluck(hz(idx), t, STEP * (pos % 2 ? 1.6 : 2.2));
    }
  }

  function tick() {
    while (nextT < ctx.currentTime + 0.45) { schedule(step, nextT); nextT += STEP; step++; }
  }

  function level() { return ducking.size ? 0.04 : VOL; }
  function setLevel(ramp = 0.6) { if (master) master.gain.setTargetAtTime(wanted && enabled() ? level() : 0, ctx.currentTime, ramp / 3); }

  function start() {
    if (started || !enabled()) return;
    if (!ctx && !build()) return;
    started = true;
    ctx.resume();
    nextT = ctx.currentTime + 0.1; step = 0; bar = 0;
    timer = setInterval(tick, 120);
    setLevel(1.5);
  }
  function stop() {
    wanted = false;
    if (!ctx) return;
    setLevel(0.5);
    const c = ctx; clearInterval(timer); started = false;
    setTimeout(() => { if (!started && c === ctx) { c.close().catch(() => {}); ctx = null; } }, 900);
  }

  // un son (extrait, vidéo…) démarre : la musique baisse, puis revient quand il s'arrête
  const nativePlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const el = this;
    if (!ducking.has(el)) {
      ducking.add(el);
      const off = () => { ducking.delete(el); el.removeEventListener('pause', off); el.removeEventListener('ended', off); setLevel(0.8); };
      el.addEventListener('pause', off); el.addEventListener('ended', off);
      setLevel(0.3);
    }
    return nativePlay.apply(this, arguments);
  };

  document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) ctx.suspend(); else if (wanted && enabled()) ctx.resume(); });

  function drawBtn() {
    if (!wanted) { if (btn) { btn.remove(); btn = null; } return; }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'dz-music-btn'; btn.setAttribute('data-notranslate', '');
      btn.onclick = () => {
        let on = enabled();
        try { localStorage.setItem(KEY, on ? 'off' : 'on'); } catch { /* pas grave */ }
        on = !on;
        if (on) { start(); setLevel(0.8); } else { setLevel(0.4); }
        drawBtn();
      };
      document.body.append(btn);
    }
    const on = enabled();
    btn.textContent = on ? '🎶' : '🔇';
    btn.title = btn.ariaLabel = on ? 'Couper la musique DZ' : 'Remettre la musique DZ';
    btn.classList.toggle('off', !on);
  }

  // on ne peut jouer un son qu'après un clic ou un toucher : on attend le premier
  function arm() {
    const go = () => { document.removeEventListener('pointerdown', go, true); document.removeEventListener('keydown', go, true); if (wanted) start(); };
    document.addEventListener('pointerdown', go, true); document.addEventListener('keydown', go, true);
  }

  function apply(lang) {
    if (lang === 'dz') {
      wanted = true; drawBtn();
      if (ctx && ctx.state !== 'closed' && started) setLevel(); else if (navigator.userActivation && navigator.userActivation.hasBeenActive) start(); else arm();
    } else { stop(); drawBtn(); }
  }
  window.addEventListener('ss-lang', (e) => apply(e.detail.lang));
  const init = () => apply(window.siteLang && window.siteLang());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.__dzMusic = () => ({ state: ctx && ctx.state, started, wanted, gain: master && master.gain.value });
})();
