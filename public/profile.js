// Page profil : une grande page qui s'ouvre par-dessus le site.
// Pour l'ouvrir depuis n'importe où : openProfile('pseudo')  (sans pseudo = mon profil).
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const api = async (url, body) => {
    const res = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Une erreur est survenue.');
    return data;
  };
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const fmt = (n) => Number(n || 0).toLocaleString(window.siteLang && window.siteLang() === 'en' ? 'en-US' : 'fr-FR');

  // --- la fenêtre ---
  const dlg = el('dialog', 'profile-page');
  dlg.setAttribute('aria-label', 'Profil');
  dlg.innerHTML = `
    <div class="pp-scroll">
      <div class="pp-banner"><button type="button" class="pp-back" aria-label="Fermer le profil">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Retour</span></button></div>
      <div class="pp-body"></div>
    </div>`;
  document.addEventListener('DOMContentLoaded', () => document.body.append(dlg));
  if (document.body) document.body.append(dlg);
  $('.pp-back', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  let current = null; // profil affiché

  function avatarNode(p, size) {
    const a = el('div', 'pp-avatar' + (size ? ' ' + size : ''));
    if (p.avatarUrl) {
      const img = el('img'); img.src = p.avatarUrl; img.alt = ''; a.append(img);
    } else {
      a.textContent = (p.username || '?').replace(/^@/, '').slice(0, 1).toUpperCase();
      a.classList.add('letter');
    }
    return a;
  }
  function paintBanner(p) {
    const b = $('.pp-banner', dlg);
    b.className = 'pp-banner preset-' + (p.banner === 'image' ? 'image' : p.banner);
    b.style.backgroundImage = p.banner === 'image' && p.bannerUrl ? `url("${p.bannerUrl}")` : '';
  }

  // --- affichage ---
  function render(p) {
    current = p;
    paintBanner(p);
    const body = $('.pp-body', dlg);
    body.replaceChildren();
    body.classList.remove('editing');

    const head = el('div', 'pp-head');
    head.append(avatarNode(p));
    const who = el('div', 'pp-who');
    const name = el('h2', 'pp-name'); name.setAttribute('data-notranslate', ''); name.textContent = p.username;
    who.append(name);
    const meta = el('p', 'pp-meta');
    if (p.online !== undefined) {
      const st = el('span', 'presence' + (p.inBlindtest ? ' ingame' : p.online ? ' online' : ''), p.inBlindtest ? 'En blind test' : p.online ? 'En ligne' : 'Hors ligne');
      meta.append(st);
    }
    if (p.streak) {
      const n = p.streak.count;
      const fl = el('span', 'pp-flame' + (n ? '' : ' out'), `🔥 ${n} jour${n > 1 ? 's' : ''}`);
      fl.title = `Série en cours : ${n} jour${n > 1 ? 's' : ''} · record : ${p.streak.best}`;
      meta.append(fl);
    }
    if (typeof p.timeOnSite === 'number') {
      const ts = el('span', 'pp-time');
      if (p.relation === 'me' || p.online) window.ssLiveTime(ts, p.timeOnSite, '⏱️ {t} sur le site', String(p.username).replace(/^@/, '').toLowerCase()); // avance chaque seconde
      else ts.textContent = `⏱️ ${window.ssDur(p.timeOnSite)} sur le site`;
      ts.title = 'Temps passé sur Star Song';
      meta.append(ts);
    }
    if (p.since) {
      const d = new Date(p.since);
      if (!isNaN(d)) meta.append(el('span', 'pp-since', `Membre depuis ${MONTHS[d.getMonth()]} ${d.getFullYear()}`));
    }
    who.append(meta);
    head.append(who);
    body.append(head);

    // boutons selon le lien avec la personne
    const actions = el('div', 'pp-actions');
    const btn = (label, fn, cls) => { const b = el('button', cls || '', label); b.type = 'button'; b.addEventListener('click', fn); actions.append(b); return b; };
    if (p.relation === 'me') btn('Modifier le profil', () => edit(p), 'pp-main');
    else if (p.relation === 'friend') {
      if (window.openChat) btn('Envoyer un message', () => window.openChat(p.username), 'pp-main');
      const a = el('a', 'pp-link', 'Inviter au blind test'); a.href = '/blindtest'; actions.append(a);
      actions.append(el('span', 'pp-tag', 'Vous êtes amis'));
    } else if (p.relation === 'incoming') btn('Accepter sa demande d’ami', () => friend('accept', p), 'pp-main');
    else if (p.relation === 'outgoing') actions.append(el('span', 'pp-tag', 'Demande d’ami envoyée'));
    else if (p.relation === 'none') btn('Ajouter en ami', () => friend('request', p), 'pp-main');
    if (actions.children.length) body.append(actions);
    const msg = el('p', 'pp-msg'); msg.setAttribute('role', 'status'); body.append(msg);

    // bio
    if (p.bio) { const bio = el('p', 'pp-bio'); bio.setAttribute('data-notranslate', ''); bio.textContent = p.bio; body.append(bio); }
    else if (p.relation === 'me') body.append(el('p', 'pp-empty', 'Ta bio est vide. Clique sur « Modifier le profil » pour te présenter.'));

    // stats du blind test
    if (p.blindtest) {
      const sec = el('section', 'pp-section');
      sec.append(el('h3', '', 'Blind test'));
      const grid = el('div', 'pp-stats');
      const stat = (v, l) => { const s = el('div', 'pp-stat'); s.append(el('strong', '', v), el('span', '', l)); grid.append(s); };
      stat('#' + p.blindtest.rank, 'Classement mondial');
      stat(fmt(p.blindtest.points), 'Points');
      stat(fmt(p.blindtest.wins), p.blindtest.wins > 1 ? 'Victoires' : 'Victoire');
      stat(fmt(p.blindtest.best), 'Record');
      sec.append(grid);
      body.append(sec);
    }

    // flammes et badges
    if (p.streak || (p.badges && p.badges.length) || p.relation === 'me') {
      const fs = el('section', 'pp-section');
      fs.append(el('h3', '', 'Flammes et badges'));
      if (p.streak) {
        const grid = el('div', 'pp-stats pp-stats-2');
        const stat = (v, l) => { const s2 = el('div', 'pp-stat'); s2.append(el('strong', '', v), el('span', '', l)); grid.append(s2); };
        stat('🔥 ' + p.streak.count, 'Série en cours');
        stat(String(p.streak.best), 'Meilleure série');
        fs.append(grid);
      }
      if (p.badges && p.badges.length) {
        const list = el('ul', 'pp-badges');
        for (const b of p.badges) {
          const li = el('li', 'pp-badge tier-' + b.tier);
          const medal = el('span', 'pp-medal'); medal.setAttribute('aria-hidden', 'true');
          const txt = el('div', 'pp-badge-txt');
          const name = el('strong', '', b.artist); name.setAttribute('data-notranslate', '');
          const lvl = el('span', 'pp-badge-lvl', `${b.tierName} · ${fmt(b.count)} écoute${b.count > 1 ? 's' : ''}`);
          txt.append(name, lvl);
          if (b.next) {
            const bar = el('span', 'pp-badge-bar');
            const fill = el('i');
            fill.style.width = Math.round(((b.count - b.from) / (b.next.at - b.from)) * 100) + '%';
            bar.append(fill);
            bar.title = `${b.next.at - b.count} écoute${b.next.at - b.count > 1 ? 's' : ''} avant ${b.next.tierName}`;
            txt.append(bar);
          }
          li.append(medal, txt);
          li.title = b.next ? `${b.tierName} : encore ${b.next.at - b.count} écoute${b.next.at - b.count > 1 ? 's' : ''} pour passer ${b.next.tierName}` : `${b.tierName} : niveau maximum`;
          list.append(li);
        }
        fs.append(list);
      } else {
        fs.append(el('p', 'pp-empty', p.relation === 'me'
          ? 'Pas encore de badge. Écoute un artiste au blind test (ou ouvre ses paroles) 5 fois pour gagner son badge Bronze.'
          : 'Pas encore de badge.'));
      }
      body.append(fs);
    }

    // trophées
    if (p.trophies && p.trophies.length) {
      const ts2 = el('section', 'pp-section');
      const won = p.trophies.filter((t) => t.at).length;
      ts2.append(el('h3', '', `🏆 Trophées (${won}/${p.trophies.length})`));
      const grid = el('div', 'pp-trophies');
      [...p.trophies].sort((x, y) => (y.at ? 1 : 0) - (x.at ? 1 : 0)).forEach((t) => {
        const c = el('div', 'pp-trophy' + (t.at ? ' got' : ''));
        c.title = t.desc;
        const ic = el('span', 'pt-ic', t.at ? t.icon : '🔒'); ic.setAttribute('aria-hidden', 'true');
        const tx = el('div', 'pt-tx');
        tx.append(el('b', '', t.name), el('small', '', t.at ? t.desc : (p.relation === 'me' ? t.desc : 'À débloquer')));
        c.append(ic, tx);
        if (!t.at && p.relation === 'me') {
          const bar = el('i', 'pt-bar'); const f = el('u'); f.style.width = Math.round(100 * t.have / t.need) + '%'; bar.append(f);
          tx.append(bar, el('em', '', `${t.have} / ${t.need}`));
        }
        grid.append(c);
      });
      ts2.append(grid);
      body.append(ts2);
    }

    // sons préférés
    const sec = el('section', 'pp-section');
    sec.append(el('h3', '', 'Sons préférés'));
    if (p.top.length) {
      const list = el('ol', 'pp-songs');
      p.top.forEach((s) => {
        const li = el('li', 'pp-song');
        const cover = el(s.image ? 'img' : 'span', 'pp-cover');
        if (s.image) { cover.src = s.image; cover.alt = ''; cover.loading = 'lazy'; cover.referrerPolicy = 'no-referrer'; }
        const txt = el('div', 'pp-song-txt'); txt.setAttribute('data-notranslate', '');
        txt.append(el('strong', '', s.title), el('span', '', s.artist));
        const links = el('div', 'pp-song-links');
        for (const [id, label] of [['spotify', 'Spotify'], ['deezer', 'Deezer']]) {
          const a = el('a', 'stream ' + id, label);
          a.href = `/api/go/${id}?` + new URLSearchParams({ title: s.title, artist: s.artist || '' });
          a.target = '_blank'; a.rel = 'noopener';
          links.append(a);
        }
        li.append(cover, txt, links);
        list.append(li);
      });
      sec.append(list);
    } else {
      sec.append(el('p', 'pp-empty', p.relation === 'me' ? 'Choisis jusqu’à 6 sons parmi tes favoris en modifiant ton profil.' : 'Pas encore de sons préférés.'));
    }
    body.append(sec);
    // chez un ami : ses favoris et ses dernières recherches (avant, c'était le bouton « Voir » de la page Amis)
    if (p.relation === 'friend') {
      const holder = el('div');
      body.append(holder);
      api('/api/friends/data?username=' + encodeURIComponent(p.username)).then((d) => {
        if (current !== p) return;
        const fav = el('section', 'pp-section');
        fav.append(el('h3', '', 'Ses favoris'));
        if (d.favorites && d.favorites.length) {
          const list = el('ul', 'pp-favs');
          for (const f of d.favorites.slice(0, 30)) {
            const li = el('li');
            const b = el('button', 'pp-fav'); b.type = 'button';
            const cover = el(f.image ? 'img' : 'span', 'pp-cover');
            if (f.image) { cover.src = f.image; cover.alt = ''; cover.loading = 'lazy'; cover.referrerPolicy = 'no-referrer'; }
            const txt = el('span', 'pp-song-txt'); txt.setAttribute('data-notranslate', '');
            txt.append(el('strong', '', f.title), el('span', '', f.artist || ''));
            b.append(cover, txt);
            b.addEventListener('click', () => {
              dlg.close();
              if (window.ssShowFav) window.ssShowFav(f, p.username); else location.href = '/?q=' + encodeURIComponent(f.title + ' ' + (f.artist || ''));
            });
            li.append(b); list.append(li);
          }
          fav.append(list);
        } else fav.append(el('p', 'pp-empty', 'Pas encore de favori.'));
        const hist = el('section', 'pp-section');
        hist.append(el('h3', '', 'Ses dernières recherches'));
        if (d.history && d.history.length) {
          const list = el('ul', 'pp-hist');
          for (const x of d.history.slice(0, 15)) {
            const li = el('li');
            const b = el('button', 'pp-histi'); b.type = 'button';
            const t = el('strong', '', x.title); t.setAttribute('data-notranslate', '');
            const m = el('span', '', (x.artist ? x.artist + ' · ' : '') + '« ' + x.q + ' »'); m.setAttribute('data-notranslate', '');
            b.append(t, m);
            b.addEventListener('click', () => {
              dlg.close();
              if (window.ssSearch) window.ssSearch(x.q); else location.href = '/?q=' + encodeURIComponent(x.q);
            });
            li.append(b); list.append(li);
          }
          hist.append(list);
        } else hist.append(el('p', 'pp-empty', 'Aucune recherche pour l’instant.'));
        holder.replaceWith(fav, hist);
      }).catch(() => holder.remove());
    }
    dlg.scrollTop = 0;
    $('.pp-scroll', dlg).scrollTop = 0;
  }

  async function friend(action, p) {
    const msg = $('.pp-msg', dlg);
    try {
      await api('/api/friends/' + action, { username: p.username });
      window.dispatchEvent(new CustomEvent('friends-changed'));
      await load(p.username);
      $('.pp-msg', dlg).textContent = action === 'accept' ? 'Vous êtes maintenant amis !' : 'Demande d’ami envoyée';
    } catch (err) { msg.textContent = err.message; }
  }

  // --- redimensionne une photo avant l'envoi (carré pour la photo, 3:1 pour la bannière) ---
  function resize(file, w, h, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const r = Math.max(w / img.width, h / img.height);
        const sw = w / r, sh = h / r;
        c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Image illisible. Essaie une autre photo.'));
      img.src = URL.createObjectURL(file);
    });
  }

  // --- modification de mon profil ---
  async function edit(p) {
    const body = $('.pp-body', dlg);
    body.replaceChildren();
    body.classList.add('editing');
    let banner = p.banner, top = [...p.top];
    const msg = el('p', 'pp-msg'); msg.setAttribute('role', 'status');

    // photo
    const head = el('div', 'pp-head');
    let av = avatarNode(p);
    head.append(av);
    const photoBox = el('div', 'pp-edit-photo');
    const pick = (label, kind, w, h, q) => {
      const lab = el('label', 'pp-file');
      const input = el('input'); input.type = 'file'; input.accept = 'image/*';
      lab.append(el('span', '', label), input);
      input.addEventListener('change', async () => {
        const f = input.files[0]; input.value = '';
        if (!f) return;
        msg.textContent = 'Envoi de l’image…';
        try {
          const image = await resize(f, w, h, q);
          const d = await api('/api/profile/image', { kind, image });
          Object.assign(p, { avatarUrl: d.profile.avatarUrl, bannerUrl: d.profile.bannerUrl, banner: d.profile.banner });
          if (kind === 'banner') { banner = 'image'; paintBanner(p); drawSwatches(); }
          else { const nv = avatarNode(p); av.replaceWith(nv); av = nv; }
          msg.textContent = 'Image enregistrée.';
        } catch (err) { msg.textContent = err.message; }
      });
      return lab;
    };
    photoBox.append(pick('Changer la photo', 'avatar', 320, 320, 0.86));
    if (p.avatarUrl) {
      const rm = el('button', 'pp-small', 'Retirer la photo'); rm.type = 'button';
      rm.addEventListener('click', async () => {
        try { await api('/api/profile/image', { kind: 'avatar', image: null }); p.avatarUrl = ''; const nv = avatarNode(p); av.replaceWith(nv); av = nv; rm.remove(); }
        catch (err) { msg.textContent = err.message; }
      });
      photoBox.append(rm);
    }
    head.append(photoBox);
    body.append(head);

    // bannière
    const bSec = el('section', 'pp-section');
    bSec.append(el('h3', '', 'Bannière'));
    const sw = el('div', 'pp-swatches');
    const drawSwatches = () => {
      sw.replaceChildren();
      for (const id of p.banners) {
        const b = el('button', 'pp-swatch preset-' + id); b.type = 'button';
        b.setAttribute('aria-label', 'Bannière ' + id);
        b.setAttribute('aria-pressed', String(banner === id));
        b.addEventListener('click', () => { banner = id; p.banner = id; paintBanner(p); drawSwatches(); });
        sw.append(b);
      }
      sw.append(pick('Importer une image', 'banner', 1200, 400, 0.82));
    };
    drawSwatches();
    bSec.append(sw);
    body.append(bSec);

    // bio
    const bioSec = el('section', 'pp-section');
    bioSec.append(el('h3', '', 'Bio'));
    const ta = el('textarea', 'pp-bio-input'); ta.maxLength = 300; ta.rows = 4; ta.value = p.bio;
    ta.placeholder = 'Présente-toi : tes artistes, ta ville, ton son du moment…';
    const count = el('p', 'pp-count');
    const upd = () => { count.textContent = `${ta.value.length} / 300`; };
    ta.addEventListener('input', upd); upd();
    bioSec.append(ta, count);
    body.append(bioSec);

    // sons préférés, choisis parmi les favoris
    const sSec = el('section', 'pp-section');
    sSec.append(el('h3', '', 'Sons préférés'), el('p', 'pp-hint', 'Choisis jusqu’à 6 sons parmi tes favoris (★).'));
    const favBox = el('div', 'pp-favs');
    sSec.append(favBox);
    body.append(sSec);
    let favs = [];
    try { favs = ((await api('/api/data')).data || {}).favorites || []; } catch { /* rien */ }
    const key = (s) => (s.title + '|' + s.artist).toLowerCase();
    const drawFavs = () => {
      favBox.replaceChildren();
      const all = [...top, ...favs.filter((f) => !top.some((t) => key(t) === key(f)))];
      if (!all.length) { favBox.append(el('p', 'pp-empty', 'Tu n’as pas encore de favori. Ajoute des sons avec l’étoile ☆ sur la page de recherche.')); return; }
      for (const f of all) {
        const on = top.some((t) => key(t) === key(f));
        const b = el('button', 'pp-fav'); b.type = 'button'; b.setAttribute('aria-pressed', String(on));
        const cover = el(f.image ? 'img' : 'span', 'pp-cover');
        if (f.image) { cover.src = f.image; cover.alt = ''; cover.loading = 'lazy'; cover.referrerPolicy = 'no-referrer'; }
        const txt = el('span', 'pp-song-txt'); txt.setAttribute('data-notranslate', '');
        txt.append(el('strong', '', f.title), el('span', '', f.artist));
        b.append(cover, txt);
        b.addEventListener('click', () => {
          if (on) top = top.filter((t) => key(t) !== key(f));
          else if (top.length >= 6) { msg.textContent = 'Maximum 6 sons préférés.'; return; }
          else top.push({ title: f.title, artist: f.artist, image: f.image });
          msg.textContent = '';
          drawFavs();
        });
        favBox.append(b);
      }
    };
    drawFavs();

    // enregistrer / annuler
    const actions = el('div', 'pp-actions pp-save');
    const save = el('button', 'pp-main', 'Enregistrer'); save.type = 'button';
    const cancel = el('button', '', 'Annuler'); cancel.type = 'button';
    save.addEventListener('click', async () => {
      save.disabled = true;
      try {
        const d = await api('/api/profile', { bio: ta.value, banner: banner === 'image' ? undefined : banner, top });
        render(d.profile);
        $('.pp-msg', dlg).textContent = 'Profil enregistré.';
        window.dispatchEvent(new CustomEvent('profile-changed', { detail: d.profile }));
      } catch (err) { msg.textContent = err.message; save.disabled = false; }
    });
    cancel.addEventListener('click', () => load(p.username));
    actions.append(save, cancel);
    body.append(msg, actions);
  }

  async function load(username) {
    const url = '/api/profile' + (username ? '?username=' + encodeURIComponent(username) : '');
    const d = await api(url);
    render(d.profile);
    return d.profile;
  }

  window.openProfile = async (username) => {
    if (!dlg.isConnected) document.body.append(dlg);
    const body = $('.pp-body', dlg);
    body.replaceChildren(el('p', 'pp-loading', 'Chargement…'));
    $('.pp-banner', dlg).className = 'pp-banner preset-bitume';
    $('.pp-banner', dlg).style.backgroundImage = '';
    if (!dlg.open) dlg.showModal();
    try { await load(username); } catch (err) { body.replaceChildren(el('p', 'pp-empty', err.message)); }
  };

  // --- style ---
  const css = el('style');
  css.textContent = `
  dialog.profile-page { width: min(46rem, calc(100vw - 1.5rem)); height: min(52rem, calc(100dvh - 2rem)); max-width: none; max-height: none; padding: 0; border: 0; border-radius: 14px; overflow: hidden;
    background: #1a191e; color: var(--blanc, #f4f2ee); box-shadow: 0 30px 80px rgba(0,0,0,.7); }
  dialog.profile-page[open] { display: flex; animation: ppIn .4s cubic-bezier(.2, .9, .3, 1.1); }
  dialog.profile-page::backdrop { background: rgba(10,10,12,.82); backdrop-filter: blur(3px); }
  @keyframes ppIn { from { opacity: 0; transform: translateY(30px) scale(.97); } to { opacity: 1; transform: none; } }
  .pp-scroll { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
  .pp-banner { position: relative; height: 11rem; background-size: cover; background-position: center; }
  .pp-banner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.25), transparent 40%, rgba(26,25,30,.55)); }
  .preset-cassette { background: linear-gradient(180deg, #e2412b 0 33.3%, #f28c1c 33.3% 66.6%, #f5c43a 66.6%); }
  .preset-nuit { background: radial-gradient(circle at 75% 30%, rgba(120, 90, 255, .55), transparent 45%), radial-gradient(rgba(255,255,255,.35) 1px, transparent 1.5px) 0 0 / 22px 22px, linear-gradient(160deg, #10112a, #2a1648); }
  .preset-neon { background: linear-gradient(120deg, #ff2d95, #7a2cff 50%, #00d4ff); }
  .preset-or { background: radial-gradient(circle at 20% 20%, rgba(255,255,255,.5), transparent 40%), linear-gradient(135deg, #8a5a12, #f5c43a 45%, #b07a1c 70%, #f7da7a); }
  .preset-bitume { background: radial-gradient(rgba(255,255,255,.09) 1px, transparent 1.6px) 0 0 / 7px 7px, linear-gradient(180deg, #2b2a30, #18171b); }
  .pp-back { position: absolute; z-index: 2; left: max(.8rem, env(safe-area-inset-left)); top: calc(.8rem + env(safe-area-inset-top, 0px)); display: inline-flex; align-items: center; gap: .3rem; min-height: 2.75rem; padding: .3rem .9rem .3rem .6rem; border-radius: 999px;
    background: rgba(15,14,18,.7); color: #fff; border: 1px solid rgba(255,255,255,.2); box-shadow: none; font: 800 .98rem var(--texte, sans-serif); backdrop-filter: blur(6px); cursor: pointer; }
  .pp-back svg { width: 1.2rem; height: 1.2rem; }
  .pp-back:active { transform: scale(.95); background: rgba(15,14,18,.85); border-bottom-width: 1px; }
  .pp-body { position: relative; padding: 0 1.5rem 2rem; }
  .pp-head { display: flex; align-items: flex-end; gap: 1rem; margin-top: -3.2rem; }
  .pp-avatar { position: relative; z-index: 1; flex: none; width: 7rem; height: 7rem; border-radius: 50%; overflow: hidden; border: 4px solid #1a191e; background: #2a2930; box-shadow: 0 8px 20px rgba(0,0,0,.5); }
  .pp-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pp-avatar.letter { display: grid; place-items: center; font: 900 3.2rem/1 var(--texte, sans-serif); font-stretch: 62%; color: #1b1b22; background: linear-gradient(135deg, #f5c43a, #f28c1c 55%, #e2412b); }
  .pp-who { min-width: 0; padding-bottom: .4rem; }
  .pp-name { margin: 0; font: 900 2.4rem/1 var(--texte, sans-serif); font-stretch: 62%; overflow-wrap: anywhere; }
  .pp-favs, .pp-hist { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
  .pp-favs { grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); }
  .pp-fav, .pp-histi { width: 100%; display: flex; align-items: center; gap: .7rem; min-height: 3.2rem; padding: .45rem .6rem; border: 0; border-radius: 12px; background: rgba(255,255,255,.05); color: inherit; text-align: left; cursor: pointer; font: inherit; box-shadow: none; transition: background .2s, transform .2s; }
  .pp-fav:hover, .pp-histi:hover { background: rgba(255,255,255,.1); transform: translateY(-1px); }
  .pp-fav .pp-cover { flex: none; width: 2.6rem; height: 2.6rem; }
  .pp-histi { flex-direction: column; align-items: flex-start; gap: .1rem; }
  .pp-histi span { color: var(--gris, #a6a3ad); font-size: .82rem; }
  .pp-meta { display: flex; flex-wrap: wrap; align-items: center; gap: .3rem 1rem; margin: .4rem 0 0; color: var(--gris, #a6a3ad); font-size: .92rem; }
  .pp-meta .presence { margin: 0; display: inline-flex; align-items: center; gap: .4rem; }
  .pp-meta .presence::before { content: ""; width: .55rem; height: .55rem; border-radius: 50%; background: #5d5b63; }
  .pp-meta .presence.online { color: #6fdc8c; }
  .pp-meta .presence.online::before { background: #3fbf6a; }
  .pp-meta .presence.ingame { color: #ffb15c; }
  .pp-meta .presence.ingame::before { background: #f28c1c; }
  .pp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin: 1.2rem 0 0; }
  .pp-actions button, .pp-link { min-height: 2.7rem; }
  .pp-main { background: linear-gradient(180deg, #ffd27a, #f28c1c) !important; border-color: #a65a0a !important; }
  .pp-link { display: inline-flex; align-items: center; padding: .55rem 1.2rem; border-radius: 4px; border: 1px solid #a65a0a; border-bottom: 4px solid #a65a0a; color: #1b1b22; text-decoration: none; font: 800 1rem var(--texte, sans-serif); font-stretch: 78%; }
  .pp-link:not(.pp-main) { background: var(--chrome, linear-gradient(180deg, #f3f3f5, #c9c9cf)); border-color: #6d6c72; }
  .pp-tag { color: var(--gris, #a6a3ad); font-weight: 600; }
  .pp-msg { min-height: 1.3rem; margin: .7rem 0 0; color: var(--jaune, #f5c43a); font-weight: 600; }
  .pp-msg:empty { min-height: 0; margin: 0; }
  .pp-bio { margin: 1.3rem 0 0; white-space: pre-wrap; font-size: 1.05rem; line-height: 1.55; max-width: 36rem; }
  .pp-empty, .pp-hint, .pp-loading { color: var(--gris, #a6a3ad); margin: .8rem 0 0; }
  .pp-loading { padding-top: 2rem; }
  .pp-section { margin-top: 2rem; }
  .pp-section h3 { margin: 0 0 .7rem; font: 900 1.35rem/1 var(--texte, sans-serif); font-stretch: 62%; text-transform: uppercase; color: var(--gris, #a6a3ad); letter-spacing: .02em; }
  .pp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: .6rem; }
  .pp-stats-2 { grid-template-columns: repeat(2, 1fr); margin-bottom: .8rem; }
  .pp-flame { color: #ffb15c; font-weight: 800; }
  .pp-flame.out { color: var(--gris, #a6a3ad); }
  .pp-badges { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); gap: .5rem; }
  .pp-badge { display: flex; align-items: center; gap: .65rem; padding: .55rem .7rem; border-radius: 8px; background: #26252c; }
  .pp-medal { flex: none; width: 2.2rem; height: 2.2rem; border-radius: 50%; position: relative;
    background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.65), transparent 40%), var(--m1); box-shadow: inset 0 0 0 3px var(--m2), 0 2px 6px rgba(0,0,0,.4); }
  .pp-medal::after { content: "★"; position: absolute; inset: 0; display: grid; place-items: center; color: var(--m2); font-size: 1rem; }
  .tier-bronze { --m1: #b8743a; --m2: #7a4720; }
  .tier-argent { --m1: #c9ccd3; --m2: #7d818b; }
  .tier-or { --m1: #f1c23a; --m2: #a3780d; }
  .tier-platine { --m1: #9fe3e0; --m2: #3c8f8b; }
  .tier-diamant { --m1: #b9a7ff; --m2: #5b3fd1; }
  .pp-badge-txt { min-width: 0; flex: 1; }
  .pp-badge-txt strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pp-badge-lvl { display: block; color: var(--gris, #a6a3ad); font-size: .78rem; }
  .pp-badge-bar { display: block; height: 4px; margin-top: .3rem; border-radius: 2px; background: #3a3940; overflow: hidden; }
  .pp-badge-bar i { display: block; height: 100%; background: var(--m1); }
  .pp-stat { padding: .8rem .7rem; border-radius: 8px; background: #26252c; text-align: center; }
  .pp-stat strong { display: block; font: 900 1.7rem/1 var(--texte, sans-serif); font-stretch: 62%; color: var(--orange, #f28c1c); }
  .pp-stat span { display: block; margin-top: .3rem; color: var(--gris, #a6a3ad); font-size: .8rem; }
  .pp-songs { list-style: none; margin: 0; padding: 0; counter-reset: pp; display: grid; gap: .5rem; }
  .pp-song { counter-increment: pp; display: grid; grid-template-columns: 1.6rem 3.2rem 1fr auto; align-items: center; gap: .8rem; padding: .5rem .7rem .5rem .5rem; border-radius: 8px; background: #26252c; }
  .pp-song::before { content: counter(pp); font: 900 1.3rem var(--texte, sans-serif); font-stretch: 62%; color: var(--orange, #f28c1c); text-align: center; }
  .pp-cover { width: 3.2rem; height: 3.2rem; border-radius: 4px; object-fit: cover; background: radial-gradient(circle, #f28c1c 0 .35rem, #111 .37rem .45rem, transparent .47rem), repeating-radial-gradient(circle, #1a1a1d 0 2px, #26252b 2px 3px); }
  span.pp-cover { border-radius: 50%; }
  .pp-song-txt { min-width: 0; display: flex; flex-direction: column; }
  .pp-song-txt strong { font: 800 1.05rem/1.2 var(--texte, sans-serif); font-stretch: 75%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pp-song-txt span { color: var(--gris, #a6a3ad); font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pp-song-links { display: flex; gap: .4rem; }
  .pp-song-links .stream { min-height: 2.1rem; padding: .25rem .7rem; font-size: .82rem; }
  /* mode modification */
  .pp-edit-photo { display: flex; flex-wrap: wrap; gap: .5rem; padding-bottom: .5rem; }
  .pp-file { position: relative; display: inline-flex; align-items: center; min-height: 2.6rem; padding: .4rem 1rem; border-radius: 4px; border: 1px solid #6f6f78; border-bottom: 4px solid #5b5b63;
    background: linear-gradient(180deg, #f3f3f5 0%, #c9c9cf 48%, #a9a9b1 52%, #d6d6dc 100%); color: #1b1b22; font: 800 .95rem var(--texte, sans-serif); font-stretch: 78%; cursor: pointer; }
  .pp-file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .pp-file:focus-within { outline: 3px solid var(--jaune, #f5c43a); outline-offset: 2px; }
  .pp-small { min-height: 2.6rem; background: transparent !important; color: var(--blanc, #f4f2ee) !important; border: 1px solid #3a3940 !important; box-shadow: none !important; }
  .pp-swatches { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }
  .pp-swatch { width: 4.4rem; height: 2.6rem; min-height: 0; padding: 0; border-radius: 6px; border: 2px solid transparent !important; box-shadow: none !important; }
  .pp-swatch[aria-pressed="true"] { border-color: #fff !important; box-shadow: 0 0 0 3px var(--orange, #f28c1c) !important; transform: none; }
  .pp-bio-input { width: 100%; padding: .8rem 1rem; border-radius: 8px; border: 1px solid #3a3940; background: #121115; color: var(--blanc, #f4f2ee); font: 400 1rem/1.5 var(--texte, sans-serif); resize: vertical; }
  .pp-bio-input:focus { outline: none; border-color: var(--orange, #f28c1c); }
  .pp-count { margin: .3rem 0 0; text-align: right; color: var(--gris, #a6a3ad); font-size: .82rem; }
  .pp-favs { display: grid; gap: .45rem; max-height: 22rem; overflow-y: auto; margin-top: .7rem; }
  .pp-fav { display: grid !important; grid-template-columns: 3.2rem 1fr; align-items: center; gap: .8rem; width: 100%; min-height: 0; padding: .45rem .7rem .45rem .45rem; text-align: left; border-radius: 8px;
    background: #26252c !important; color: var(--blanc, #f4f2ee) !important; border: 2px solid transparent !important; box-shadow: none !important; }
  .pp-fav[aria-pressed="true"] { border-color: var(--orange, #f28c1c) !important; background: rgba(242, 140, 28, .14) !important; transform: none; }
  .pp-save { position: sticky; bottom: 0; margin: 1.5rem -1.5rem -2rem; padding: 1rem 1.5rem calc(1rem + env(safe-area-inset-bottom, 0px)); background: linear-gradient(180deg, transparent, #1a191e 30%); }
  @media (max-width: 560px) {
    dialog.profile-page { width: 100vw; height: 100dvh; border-radius: 0; }
    @keyframes ppIn { from { transform: translateY(100%); } to { transform: none; } }
    .pp-banner { height: calc(9rem + env(safe-area-inset-top, 0px)); }
    .pp-body { padding: 0 1rem 2rem; }
    .pp-avatar { width: 6rem; height: 6rem; }
    .pp-name { font-size: 2rem; }
    .pp-stats { grid-template-columns: repeat(2, 1fr); }
    .pp-song { grid-template-columns: 1.3rem 2.8rem 1fr; }
    .pp-song-links { grid-column: 2 / -1; }
    .pp-save { margin: 1.5rem -1rem -2rem; padding-inline: 1rem; }
  }
  @media (prefers-reduced-motion: reduce) { dialog.profile-page[open] { animation: none; } }
  `;
  document.head.append(css);
})();
