// Explosion du drapeau algérien (version DZ), en 5 temps :
// 1. charge : l'énergie est aspirée vers le drapeau, l'écran s'assombrit
// 2. détonation : flash, ondes de choc, rayons tournants, gerbe d'étincelles, écran qui tremble, gros BOUM
// 3. un drapeau géant apparaît et flotte au centre, avec « One, two, three, viva l'Algérie ! »
// 4. feux d'artifice tout autour
// 5. le drapeau éclate en morceaux, puis pluie de confettis
// Le son suit le bouton de musique DZ (coupé si la musique est coupée).
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAL = ['#00c060', '#ffffff', '#ff2a4d', '#ffd54a'];
  const GLYPHS = ['⭐', '🌙', '🇩🇿', '✨', '🔥', '🎉'];
  let busy = false;
  let flagCache = null;

  // --- le drapeau, dessiné une fois sur un canvas caché ---
  function star(g, cx, cy, R, r, start) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = start + (i * Math.PI) / 5, d = i % 2 ? r : R;
      g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    }
    g.closePath(); g.fill();
  }
  function flagImage() {
    if (flagCache) return flagCache;
    const c = document.createElement('canvas'); c.width = 600; c.height = 400;
    const g = c.getContext('2d');
    g.fillStyle = '#006233'; g.fillRect(0, 0, 300, 400);
    g.fillStyle = '#ffffff'; g.fillRect(300, 0, 300, 400);
    const m = document.createElement('canvas'); m.width = 600; m.height = 400;
    const k = m.getContext('2d');
    k.fillStyle = '#d21034';
    k.beginPath(); k.arc(300, 200, 112, 0, 7); k.fill();
    k.globalCompositeOperation = 'destination-out';
    k.beginPath(); k.arc(330, 200, 90, 0, 7); k.fill();
    k.globalCompositeOperation = 'source-over';
    star(k, 348, 200, 50, 20, Math.PI);
    g.drawImage(m, 0, 0);
    return (flagCache = c);
  }

  // --- le son : charge, BOUM, crépitements ---
  let ac = null;
  function soundOn() { try { return localStorage.getItem('dz-music') !== 'off'; } catch { return true; } }
  function audio() {
    if (!soundOn()) return null;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = ac || new AC();
      if (ac.resume) ac.resume();
      return ac;
    } catch { return null; }
  }
  function noiseBuf(a, sec, pow) {
    const len = Math.floor(a.sampleRate * sec), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, pow);
    return b;
  }
  function soundCharge(a) {
    const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(1100, t + 0.45);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.47);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.5);
  }
  function soundBoom(a, vol = 1) {
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7 * vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 1.7);
    const n = a.createBufferSource(); n.buffer = noiseBuf(a, 2.2, 2.5);
    const f = a.createBiquadFilter(); f.type = 'lowpass';
    f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(180, t + 2);
    const ng = a.createGain(); ng.gain.value = 0.4 * vol;
    n.connect(f).connect(ng).connect(a.destination); n.start(t);
  }
  function soundCrackle(a) {
    const t = a.currentTime;
    const n = a.createBufferSource(); n.buffer = noiseBuf(a, 0.5, 4);
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500 + Math.random() * 2000;
    const g = a.createGain(); g.gain.value = 0.18;
    n.connect(f).connect(g).connect(a.destination); n.start(t);
    const o = a.createOscillator(), og = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.4);
    og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(og).connect(a.destination); o.start(t); o.stop(t + 0.5);
  }

  // --- l'animation ---
  window.ssDzBoom = function (btn) {
    if (busy) return;
    busy = true;
    if (btn) { btn.classList.remove('dz-exploded'); void btn.offsetWidth; btn.classList.add('dz-exploded'); setTimeout(() => btn.classList.remove('dz-exploded'), 5500); }
    const r = btn ? btn.getBoundingClientRect() : { left: innerWidth - 60, top: 20, width: 40, height: 30 };
    const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    const W = innerWidth, H = innerHeight, cx = W / 2, cy = H * 0.44;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;pointer-events:none';
    cv.width = W * dpr; cv.height = H * dpr;
    document.documentElement.append(cv);
    const g = cv.getContext('2d');
    g.scale(dpr, dpr);
    const flag = flagImage();
    const FW = Math.min(W * 0.78, 560), FH = (FW * 2) / 3;
    const big = reduce ? 0.35 : 1; // moins de particules si l'appareil demande moins d'animations
    const snd = audio();
    if (snd) soundCharge(snd);

    const sparks = [], confetti = [], glyphs = [], rings = [], rockets = [], tiles = [], inward = [];
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = (l) => l[(Math.random() * l.length) | 0];

    function burst(x, y, n, colors, speed = 14) {
      for (let i = 0; i < n * big; i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(speed * 0.25, speed);
        sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: pick(colors), life: 1, decay: rnd(0.008, 0.02), w: rnd(1.5, 3.5) });
      }
    }
    function addConfetti(n, fromTop) {
      for (let i = 0; i < n * big; i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(4, 18);
        confetti.push(fromTop
          ? { x: rnd(0, W), y: rnd(-H * 0.6, -10), vx: rnd(-1, 1), vy: rnd(1.5, 4), rot: rnd(0, 6), vr: rnd(-0.2, 0.2), w: rnd(7, 13), h: rnd(4, 7), c: pick(PAL), sway: rnd(0, 6) }
          : { x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, rot: rnd(0, 6), vr: rnd(-0.4, 0.4), w: rnd(7, 13), h: rnd(4, 7), c: pick(PAL), sway: rnd(0, 6) });
      }
    }
    function addGlyphs(n, x, y) {
      for (let i = 0; i < n * big; i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(5, 15);
        glyphs.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5, rot: 0, vr: rnd(-0.12, 0.12), size: rnd(22, 46), t: pick(GLYPHS), life: 1 });
      }
    }
    // l'énergie aspirée pendant la charge
    for (let i = 0; i < 70 * big; i++) {
      const a = Math.random() * Math.PI * 2, d = rnd(120, 320);
      inward.push({ a, d, c: pick(PAL), sp: rnd(0.85, 1.15) });
    }
    // les feux d'artifice, programmés
    const spots = [[0.18, 0.22], [0.82, 0.2], [0.3, 0.12], [0.7, 0.32], [0.12, 0.45], [0.88, 0.48], [0.5, 0.1], [0.4, 0.3]];
    if (!reduce) spots.forEach(([fx, fy], i) => rockets.push({ t0: 950 + i * 230, dur: 420, x0: W * fx + rnd(-40, 40), y0: H + 10, tx: W * fx, ty: H * fy, c: pick(PAL), done: false }));

    const T_DET = 450, T_FLAG = 600, T_SHATTER = 3000, T_END = 5600;
    let detonated = false, shattered = false, shake = 0;
    const body = document.body, oldTransform = body.style.transform;
    const t0 = performance.now();
    const easeOutBack = (k) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };

    function detonate() {
      detonated = true;
      shake = reduce ? 0 : 26;
      if (snd) soundBoom(snd);
      ['#ffffff', '#00c060', '#ff2a4d', '#ffd54a'].forEach((c, i) => rings.push({ t0: T_DET + i * 90, c, max: Math.hypot(W, H), w: 22 - i * 4 }));
      burst(ox, oy, 380, PAL, 22);
      addConfetti(160, false);
      addGlyphs(26, ox, oy);
    }
    function shatter() {
      shattered = true;
      shake = reduce ? 0 : 18;
      if (snd) soundBoom(snd, 0.6);
      rings.push({ t0: T_SHATTER, c: '#ffffff', max: Math.hypot(W, H) * 0.8, w: 14 });
      const cols = 10, rows = 7, s = FW / 600, x0 = cx - FW / 2, y0 = cy - FH / 2;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const sw = 600 / cols, sh = 400 / rows;
        const x = x0 + (i + 0.5) * sw * s, y = y0 + (j + 0.5) * sh * s;
        const a = Math.atan2(y - cy, x - cx), sp = rnd(6, 18);
        tiles.push({ sx: i * sw, sy: j * sh, sw, sh, w: sw * s, h: sh * s, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, rot: 0, vr: rnd(-0.3, 0.3) });
      }
      burst(cx, cy, 260, PAL, 20);
      addGlyphs(18, cx, cy);
      addConfetti(220, true);
    }

    function drawFlag(t) {
      if (t < T_FLAG || shattered) return;
      const k = Math.min(1, (t - T_FLAG) / 650);
      const sc = easeOutBack(k);
      const w = FW * sc, h = FH * sc;
      if (w <= 1) return;
      const x0 = cx - w / 2, y0 = cy - h / 2;
      // halo
      g.save();
      g.globalCompositeOperation = 'lighter';
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, w * 0.9);
      halo.addColorStop(0, 'rgba(255,213,74,.45)'); halo.addColorStop(0.5, 'rgba(0,192,96,.18)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = halo; g.fillRect(cx - w, cy - w, w * 2, w * 2);
      g.restore();
      // le drapeau qui flotte, tranche par tranche
      const step = 5, amp = 14 * sc;
      for (let x = 0; x < 600; x += step) {
        const ph = x * 0.016 - t * 0.006;
        const off = Math.sin(ph) * amp * (0.25 + (x / 600) * 0.75);
        const dx = x0 + (x / 600) * w;
        g.drawImage(flag, x, 0, step, 400, dx, y0 + off, (step / 600) * w + 1, h);
        const shade = Math.cos(ph);
        g.fillStyle = shade > 0 ? `rgba(255,255,255,${shade * 0.12})` : `rgba(0,0,0,${-shade * 0.18})`;
        g.fillRect(dx, y0 + off, (step / 600) * w + 1, h);
      }
      // la phrase
      if (t > T_FLAG + 250) {
        const kk = Math.min(1, (t - T_FLAG - 250) / 450);
        const fs = Math.min(W * 0.075, 64) * easeOutBack(kk);
        if (fs > 2) {
          const ty = cy + FH / 2 + fs * 1.1;
          g.save();
          g.font = `900 ${fs}px system-ui, -apple-system, "Segoe UI", sans-serif`;
          g.textAlign = 'center'; g.textBaseline = 'middle';
          const txt = 'One, two, three… viva l’Algérie !';
          const tw = g.measureText(txt).width;
          const grad = g.createLinearGradient(cx - tw / 2, 0, cx + tw / 2, 0);
          grad.addColorStop(0, '#00c060'); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, '#ff2a4d');
          g.lineWidth = Math.max(3, fs / 9); g.strokeStyle = 'rgba(0,0,0,.75)';
          g.shadowColor = '#ffd54a'; g.shadowBlur = 24;
          g.strokeText(txt, cx, ty);
          g.shadowBlur = 0; g.fillStyle = grad;
          g.fillText(txt, cx, ty);
          g.restore();
        }
      }
    }

    function frame(now) {
      const t = now - t0;
      g.clearRect(0, 0, W, H);

      // fond assombri (charge, puis spectacle)
      const dark = t < T_DET ? (t / T_DET) * 0.45 : t < T_SHATTER + 600 ? 0.45 : Math.max(0, 0.45 * (1 - (t - T_SHATTER - 600) / 1500));
      g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, W, H);

      // 1. charge
      if (t < T_DET) {
        const k = t / T_DET;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (const p of inward) {
          const d = p.d * (1 - Math.min(1, k * p.sp));
          g.fillStyle = p.c; g.globalAlpha = 0.9;
          g.beginPath(); g.arc(ox + Math.cos(p.a + k * 2) * d, oy + Math.sin(p.a + k * 2) * d, 2.5, 0, 7); g.fill();
        }
        const glow = g.createRadialGradient(ox, oy, 0, ox, oy, 30 + k * 90);
        glow.addColorStop(0, 'rgba(255,255,255,.95)'); glow.addColorStop(0.4, 'rgba(255,213,74,.6)'); glow.addColorStop(1, 'rgba(255,213,74,0)');
        g.globalAlpha = k; g.fillStyle = glow; g.fillRect(ox - 130, oy - 130, 260, 260);
        g.restore();
      } else if (!detonated) detonate();

      // 2. rayons tournants
      if (detonated && t < T_DET + 2200 && !reduce) {
        const k = (t - T_DET) / 2200;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * (1 - k);
        g.translate(cx, cy); g.rotate(t * 0.0008);
        const R = Math.hypot(W, H);
        for (let i = 0; i < 24; i++) {
          g.fillStyle = ['#00c060', '#ffffff', '#ff2a4d'][i % 3];
          g.beginPath(); g.moveTo(0, 0);
          g.arc(0, 0, R, (i * Math.PI) / 12, (i * Math.PI) / 12 + Math.PI / 30); g.closePath(); g.fill();
        }
        g.restore();
      }

      // ondes de choc
      for (const ring of rings) {
        const k = (t - ring.t0) / 1000;
        if (k < 0 || k > 1) continue;
        const rx = ring.t0 >= T_SHATTER ? cx : ox, ry = ring.t0 >= T_SHATTER ? cy : oy;
        g.save(); g.globalAlpha = 1 - k; g.strokeStyle = ring.c; g.lineWidth = ring.w * (1 - k) + 1;
        g.shadowColor = ring.c; g.shadowBlur = 20;
        g.beginPath(); g.arc(rx, ry, (1 - Math.pow(1 - k, 3)) * ring.max, 0, 7); g.stroke();
        g.restore();
      }

      // 3. le drapeau géant
      drawFlag(t);

      // 4. feux d'artifice
      for (const rk of rockets) {
        if (rk.done || t < rk.t0) continue;
        const k = (t - rk.t0) / rk.dur;
        if (k >= 1) {
          rk.done = true;
          burst(rk.tx, rk.ty, 110, [rk.c, '#ffffff', '#ffd54a'], 11);
          if (snd) soundCrackle(snd);
          continue;
        }
        const e = 1 - Math.pow(1 - k, 2);
        const x = rk.x0 + (rk.tx - rk.x0) * e, y = rk.y0 + (rk.ty - rk.y0) * e;
        g.save(); g.globalCompositeOperation = 'lighter';
        g.strokeStyle = rk.c; g.lineWidth = 3; g.globalAlpha = 0.8;
        g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x, y); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill();
        g.restore();
      }

      // 5. le drapeau éclate
      if (!shattered && t >= T_SHATTER) shatter();
      for (const p of tiles) {
        p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.drawImage(flag, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w + 1, p.h + 1);
        g.restore();
      }

      // étincelles (avec traînée lumineuse)
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.vx *= 0.975; p.vy = p.vy * 0.975 + 0.09; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        g.globalAlpha = p.life; g.strokeStyle = p.c; g.lineWidth = p.w;
        g.beginPath(); g.moveTo(p.x - p.vx * 3, p.y - p.vy * 3); g.lineTo(p.x, p.y); g.stroke();
      }
      g.restore();

      // confettis qui tournent sur eux-mêmes
      for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];
        p.vx *= 0.985; p.vy = Math.min(p.vy + 0.18, 5.5); p.sway += 0.08;
        p.x += p.vx + Math.sin(p.sway) * 0.8; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 30) { confetti.splice(i, 1); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.sway * 1.6));
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      }

      // étoiles, croissants, mini-drapeaux
      for (let i = glyphs.length - 1; i >= 0; i--) {
        const p = glyphs[i];
        p.vx *= 0.985; p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > H + 60) { glyphs.splice(i, 1); continue; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.font = p.size + 'px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(p.t, 0, 0);
        g.restore();
      }

      // flash blanc (détonation, puis éclatement)
      for (const [ft, fa] of [[T_DET, 0.95], [T_SHATTER, 0.6]]) {
        const k = (t - ft) / 350;
        if (k >= 0 && k < 1) { g.fillStyle = `rgba(255,255,255,${fa * (1 - k)})`; g.fillRect(0, 0, W, H); }
      }

      // tremblement de l'écran
      if (shake > 0.3) {
        body.style.transform = `translate(${rnd(-shake, shake)}px, ${rnd(-shake, shake)}px) rotate(${rnd(-shake, shake) * 0.03}deg)`;
        shake *= 0.9;
      } else if (body.style.transform !== oldTransform) body.style.transform = oldTransform;

      if (t < T_END) requestAnimationFrame(frame);
      else { cv.remove(); body.style.transform = oldTransform; busy = false; }
    }
    requestAnimationFrame(frame);
  };
})();
