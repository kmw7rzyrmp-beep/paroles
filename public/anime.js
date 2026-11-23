// Blind test animé : habillage (pétales de sakura, néons), écran de l'opening,
// compte à rebours en kanji, et à la réponse le clip de l'opening (vidéo AnimeThemes).
// Le jeu lui-même reste celui du blind test : ce fichier ne fait que l'affichage.
(() => {
  const root = document.documentElement;
  const isAnime = () => root.dataset.skin === 'anime';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const KANJI = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // --- textes de la page d'accueil du jeu ---
  function retitle() {
    if (!isAnime()) return;
    document.title = 'Blind test animé · Star Song';
    const hero = document.querySelector('#home .bt-hero');
    if (hero && !hero.dataset.anime) {
      hero.dataset.anime = '1';
      const eb = hero.querySelector('.eyebrow'); if (eb) eb.textContent = 'アニメ · Jeu entre potes';
      const h = hero.querySelector('h1'); if (h) h.textContent = 'Blind test animé';
      const lead = hero.querySelector('.lead');
      if (lead) lead.textContent = 'Un opening se lance, quatre animes s’affichent : trouve le bon. À la réponse, le clip de l’opening se lance en grand.';
    }
    const crumb = document.querySelector('.crumbs b'); if (crumb) crumb.textContent = 'Blind test animé';
  }

  // --- pétales de sakura en fond ---
  let petalsOn = false;
  function petals() {
    if (petalsOn || reduce) return;
    petalsOn = true;
    const cv = mk('canvas', 'an-petals'); cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const g = cv.getContext('2d');
    let W = 0, H = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const P = Array.from({ length: Math.min(38, Math.round(innerWidth / 30)) }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, s: 5 + Math.random() * 7, vx: 0.3 + Math.random() * 0.7, vy: 0.5 + Math.random() * 1, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.04, w: Math.random() * 6 }));
    (function frame() {
      if (!isAnime()) { cv.remove(); petalsOn = false; return; }
      g.clearRect(0, 0, W, H);
      for (const p of P) {
        p.w += 0.02; p.x += p.vx + Math.sin(p.w) * 0.6; p.y += p.vy; p.r += p.vr;
        if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
        if (p.x > W + 20) p.x = -20;
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, 0.55 + Math.sin(p.w * 2) * 0.35);
        g.fillStyle = 'rgba(255,183,213,.75)';
        g.beginPath(); g.moveTo(0, -p.s); g.quadraticCurveTo(p.s, -p.s * 0.2, 0, p.s); g.quadraticCurveTo(-p.s, -p.s * 0.2, 0, -p.s); g.fill();
        g.restore();
      }
      requestAnimationFrame(frame);
    })();
  }

  // --- l'écran de l'opening (au-dessus des propositions) ---
  let stage = null, video = null, cover = null, title = null, sub = null, verdict = null, soundTip = null;
  let shownKey = '', videoSrc = '', ytBox = null, ytId = '', watchdog = 0, revealSong = null;
  // ce téléphone sait-il lire les vidéos WebM ? (souvent non sur iPhone)
  const webmOk = (() => { try { const v = document.createElement('video'); return !!(v.canPlayType('video/webm; codecs="vp9"') || v.canPlayType('video/webm; codecs="vp8"')); } catch { return false; } })();
  function ytCmd(func) { try { ytBox.querySelector('iframe')?.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*'); } catch {} }
  // secours : le clip dans un lecteur YouTube (muet au départ, l'extrait continue ; on touche pour avoir le son du clip)
  function showYT(id) {
    if (!id || !stage) return false;
    clearTimeout(watchdog);
    video.pause();
    stage.classList.add('yt'); stage.classList.remove('no-video');
    if (ytId !== id) {
      ytId = id;
      ytBox.replaceChildren();
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&rel=0&modestbranding=1&showinfo=0&start=40&enablejsapi=1`;
      f.allow = 'autoplay; encrypted-media; picture-in-picture';
      f.title = 'Clip de l’opening';
      f.setAttribute('allowfullscreen', '');
      ytBox.append(f);
    }
    soundTip.hidden = false;
    soundTip.onclick = () => { ytCmd('unMute'); ytCmd('playVideo'); ytCmd('setVolume'); if (window.btAudio) window.btAudio.pause(); soundTip.hidden = true; };
    return true;
  }
  function clearYT() { ytId = ''; if (ytBox) ytBox.replaceChildren(); if (stage) stage.classList.remove('yt'); }
  function buildStage() {
    if (stage) return;
    stage = mk('div', 'an-stage'); stage.setAttribute('aria-live', 'polite');
    const screen = mk('div', 'an-screen');
    cover = mk('div', 'an-cover');
    video = document.createElement('video');
    video.className = 'an-video'; video.playsInline = true; video.setAttribute('playsinline', ''); video.preload = 'auto';
    const mystery = mk('div', 'an-mystery');
    mystery.append(mk('b', '', '？'), mk('span', '', 'Quel anime ?'));
    const eq = mk('div', 'an-eq'); for (let i = 0; i < 24; i++) { const bar = mk('i'); bar.style.animationDelay = (-Math.random()).toFixed(2) + 's'; eq.append(bar); }
    mystery.append(eq);
    const lines = mk('div', 'an-speed'); // lignes de vitesse au moment de la révélation
    const tag = mk('div', 'an-tag'); title = mk('b'); sub = mk('small'); tag.append(title, sub);
    verdict = mk('div', 'an-verdict');
    soundTip = mk('button', 'an-sound', '🔇'); soundTip.setAttribute('aria-label', 'Activer le son du clip'); soundTip.type = 'button'; soundTip.hidden = true;
    soundTip.onclick = () => { video.muted = false; video.play().catch(() => {}); soundTip.hidden = true; };
    ytBox = mk('div', 'an-yt');
    screen.append(cover, video, ytBox, mystery, lines, tag, verdict, soundTip);
    stage.append(screen);
    // la vidéo ne passe pas (format non lu par le téléphone) : secours YouTube, sinon l'image de l'anime
    video.addEventListener('error', () => { if (!(revealSong && showYT(revealSong.yt))) stage.classList.add('no-video'); });
    video.addEventListener('playing', () => { clearTimeout(watchdog); stage.classList.remove('no-video'); });
    const play = $('play'); if (play) play.prepend(stage);
  }
  const userMuted = () => { try { return localStorage.getItem('bt-muted') === '1'; } catch { return false; } };
  function playVideo(src, at) {
    if (!src) { stage.classList.add('no-video'); return; }
    if (videoSrc !== src) { videoSrc = src; video.src = src; stage.classList.remove('no-video'); }
    const go = () => {
      if (isFinite(video.duration) && video.duration > 8) { // on démarre vers le milieu de l'opening (plus de générique du début)
        const mid = video.duration * 0.45;
        video.currentTime = Math.min(at > 0.5 ? Math.max(at, mid) : mid, video.duration - 3);
      }
      video.muted = userMuted();
      video.play().then(() => { soundTip.hidden = true; }).catch(() => { video.muted = true; video.play().catch(() => {}); soundTip.hidden = userMuted(); });
    };
    if (video.readyState >= 1) go(); else video.addEventListener('loadedmetadata', go, { once: true });
  }
  function stopVideo() { clearTimeout(watchdog); if (video) { video.pause(); } clearYT(); revealSong = null; }

  // --- à chaque nouvel état de la partie ---
  function onState(s) {
    if (s && s.skin === 'anime') root.dataset.skin = 'anime';
    if (!isAnime()) return;
    retitle(); petals();
    if (!s) return;
    // compte à rebours en kanji
    const cn = $('countN');
    if (cn && s.phase === 'countdown') cn.dataset.k = KANJI[Number(cn.textContent) || 0] || '';
    if (s.phase === 'countdown') setTimeout(() => { const n = $('countN'); if (n) n.dataset.k = KANJI[Number(n.textContent) || 0] || ''; }, 0);
    if (s.phase !== 'playing' && s.phase !== 'reveal') { stopVideo(); shownKey = ''; if (stage) stage.className = 'an-stage'; return; }
    buildStage();
    const key = s.code + ':' + s.index + ':' + s.phase;
    if (key === shownKey) return;
    shownKey = key;
    const btAudio = window.btAudio;
    if (s.phase === 'playing') {
      stage.className = 'an-stage an-playing'; clearYT(); revealSong = null; clearTimeout(watchdog);
      title.textContent = ''; sub.textContent = ''; verdict.textContent = ''; verdict.className = 'an-verdict';
      cover.style.backgroundImage = '';
      if (s.video) playVideo(s.video, Math.max(0, ((s.serverNow || Date.now()) - s.roundStart) / 1000)); // pas d'extrait : le son vient du clip (caché)
      else { stopVideo(); videoSrc = ''; video.removeAttribute('src'); video.load(); }
      return;
    }
    // la révélation : le clip de l'opening
    const song = s.song || {};
    stage.className = 'an-stage an-reveal' + (reduce ? '' : ' boom');
    title.textContent = song.anime || (s.options && s.options[s.correct] && s.options[s.correct].titre) || '';
    sub.textContent = [song.titre, song.artiste].filter(Boolean).join(' · ');
    const mine = s.myChoice;
    verdict.textContent = mine == null ? '' : mine === s.correct ? '正解 ! Bien joué' : '残念… Raté';
    verdict.className = 'an-verdict ' + (mine == null ? '' : mine === s.correct ? 'ok' : 'ko');
    cover.style.backgroundImage = song.image || song.cover ? `url("${song.image || song.cover}")` : '';
    revealSong = song;
    if (song.video && webmOk) {
      if (btAudio) btAudio.pause(); // l'extrait laisse la place au clip
      playVideo(song.video, videoSrc === song.video ? video.currentTime : 0);
      // si rien ne démarre au bout de 4 s (téléphone qui ne lit pas ce format), on passe au secours YouTube
      clearTimeout(watchdog);
      watchdog = setTimeout(() => { if (video.paused || video.readyState < 2) { if (!showYT(song.yt)) stage.classList.add('no-video'); else if (btAudio && btAudio.paused && !userMuted()) btAudio.play().catch(() => {}); } }, 4000);
    } else if (!showYT(song.yt)) stage.classList.add('no-video');
  }

  // le bouton son du jeu coupe / remet aussi le clip
  document.addEventListener('click', (e) => { if (video && e.target.closest && e.target.closest('#soundBtn')) setTimeout(() => { video.muted = userMuted(); }, 0); });
  window.ssAnime = { onState };
  // la page d'accueil du jeu (avant toute partie)
  const boot = () => { if (isAnime()) { retitle(); petals(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
