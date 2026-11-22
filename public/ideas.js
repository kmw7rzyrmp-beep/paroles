// La boîte à idées : les joueurs proposent, les admins voient tout et répondent.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const CATS = { site: ['🌐', 'Le site'], blindtest: ['🎯', 'Blind test'], amis: ['👥', 'Amis & messages'], autre: ['✨', 'Autre'] };
  const STATUS = { new: ['Nouvelle', 'id-new'], seen: ['Vue', 'id-seen'], planned: ['Prévue', 'id-planned'], done: ['Faite ✓', 'id-done'], refused: ['Refusée', 'id-refused'] };
  let data = { admin: false, ideas: [] };
  let filter = 'all';
  let draft = { text: '', cat: 'site' };

  // --- le bouton dans le menu Social (sur les deux pages) + la page (accueil seulement) ---
  function setup() {
    const navs = document.querySelectorAll('.side .nav');
    const social = navs[navs.length - 1];
    if (social && !$('[data-open="ideas"]', social)) {
      const li = el('li');
      const b = el('button'); b.type = 'button'; b.dataset.open = 'ideas';
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Idées</span>';
      li.append(b);
      const admin = $('[data-open="admin"]', social);
      if (admin && admin.closest('li')) social.insertBefore(li, admin.closest('li')); else social.append(li);
    }
    const frame = $('.frame');
    if (frame && location.pathname === '/' && !$('#pageIdeas')) {
      const sec = el('section', 'page'); sec.id = 'pageIdeas'; sec.hidden = true; sec.setAttribute('aria-labelledby', 'idTitle');
      frame.append(sec);
    }
  }

  const when = (t) => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });

  async function api(body) {
    const r = await fetch('/api/ideas', body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Oups, ça n’a pas marché.');
    return j;
  }
  const toast = (msg) => { if (window.ssToast) window.ssToast(msg); else { const t = el('div', 'id-toast', msg); document.body.append(t); setTimeout(() => t.remove(), 2600); } };

  function head() {
    const h = el('div', 'page-head');
    const back = el('button', 'ghost page-back'); back.type = 'button'; back.setAttribute('data-page-close', ''); back.setAttribute('aria-label', 'Retour');
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="pb-lbl">Retour</span>';
    const tw = el('div'); const t = el('h1', '', 'Boîte à idées'); t.id = 'idTitle';
    tw.append(el('p', 'page-eyebrow', 'Ta voix compte'), t);
    h.append(back, tw);
    return h;
  }

  function form() {
    const box = el('form', 'id-form');
    box.append(el('h2', '', 'Une idée pour améliorer Star Song ?'));
    box.append(el('p', 'id-hint', 'Nouvelle fonction, bug, design… dis-nous tout. Les admins lisent chaque idée et te répondent ici.'));
    const chips = el('div', 'id-chips');
    for (const [k, [emo, label]] of Object.entries(CATS)) {
      const c = el('button', 'id-chip' + (draft.cat === k ? ' on' : ''), `${emo} ${label}`); c.type = 'button';
      c.onclick = () => { draft.cat = k; chips.querySelectorAll('.id-chip').forEach((x) => x.classList.remove('on')); c.classList.add('on'); };
      chips.append(c);
    }
    const ta = el('textarea', 'id-text'); ta.rows = 4; ta.maxLength = 600; ta.placeholder = 'Ex : j’aimerais pouvoir créer des équipes pour le blind test…'; ta.value = draft.text;
    const foot = el('div', 'id-foot');
    const count = el('span', 'id-count', `${ta.value.length} / 600`);
    const send = el('button', 'id-send', 'Envoyer mon idée'); send.type = 'submit';
    ta.oninput = () => { draft.text = ta.value; count.textContent = `${ta.value.length} / 600`; };
    foot.append(count, send);
    box.append(chips, ta, foot);
    box.onsubmit = async (e) => {
      e.preventDefault();
      send.disabled = true; send.textContent = 'Envoi…';
      try {
        const r = await api({ action: 'add', text: ta.value, cat: draft.cat });
        draft.text = '';
        data.ideas.unshift(r.idea);
        toast('💡 Idée envoyée, merci !');
        draw();
      } catch (err) { toast('⚠️ ' + err.message); send.disabled = false; send.textContent = 'Envoyer mon idée'; }
    };
    return box;
  }

  function badge(st) { const [t, c] = STATUS[st] || STATUS.new; return el('span', 'id-badge ' + c, t); }

  function card(i, admin) {
    const c = el('article', 'id-card');
    const top = el('div', 'id-top');
    const [emo, label] = CATS[i.cat] || CATS.autre;
    top.append(el('span', 'id-cat', `${emo} ${label}`), badge(i.status));
    if (admin) top.append(el('span', 'id-who', i.from));
    top.append(el('time', 'id-date', when(i.at)));
    c.append(top, el('p', 'id-body', i.text));
    if (i.reply) {
      const r = el('div', 'id-reply');
      r.append(el('b', '', '💬 Réponse de Star Song'), el('p', '', i.reply));
      if (i.replyAt) r.append(el('time', 'id-date', when(i.replyAt)));
      c.append(r);
    }
    if (admin) c.append(adminTools(i));
    return c;
  }

  function adminTools(i) {
    const box = el('div', 'id-admin');
    const row = el('div', 'id-status');
    let status = i.status;
    for (const [k, [t]] of Object.entries(STATUS)) {
      const b = el('button', 'id-st' + (status === k ? ' on' : ''), t); b.type = 'button';
      b.onclick = () => { status = k; row.querySelectorAll('.id-st').forEach((x) => x.classList.remove('on')); b.classList.add('on'); };
      row.append(b);
    }
    const ta = el('textarea', 'id-text small'); ta.rows = 2; ta.maxLength = 800; ta.placeholder = 'Ta réponse (le joueur reçoit une notification)…'; ta.value = i.reply || '';
    const act = el('div', 'id-actions');
    const save = el('button', 'id-send', 'Enregistrer'); save.type = 'button';
    const del = el('button', 'ghost id-del', 'Supprimer'); del.type = 'button';
    save.onclick = async () => {
      save.disabled = true;
      try { const r = await api({ action: 'reply', id: i.id, reply: ta.value, status }); Object.assign(i, r.idea); toast('✅ Enregistré'); draw(); }
      catch (err) { toast('⚠️ ' + err.message); save.disabled = false; }
    };
    del.onclick = async () => {
      const ok = window.ssConfirm ? await window.ssConfirm({ title: 'Supprimer cette idée ?', text: 'Elle disparaîtra aussi chez le joueur.', ok: 'Supprimer', danger: true }) : confirm('Supprimer cette idée ?');
      if (!ok) return;
      try { await api({ action: 'delete', id: i.id }); data.ideas = data.ideas.filter((x) => x.id !== i.id); draw(); } catch (err) { toast('⚠️ ' + err.message); }
    };
    act.append(save, del);
    box.append(row, ta, act);
    return box;
  }

  function list() {
    const wrap = el('section', 'id-list');
    if (data.admin) {
      const bar = el('div', 'id-panelbar');
      bar.append(el('h2', '', '🛡️ Panel admin · toutes les idées'));
      const tabs = el('div', 'id-tabs');
      const count = (k) => k === 'all' ? data.ideas.length : data.ideas.filter((i) => i.status === k).length;
      for (const k of ['all', 'new', 'seen', 'planned', 'done', 'refused']) {
        const t = el('button', 'id-tab' + (filter === k ? ' on' : ''), `${k === 'all' ? 'Toutes' : STATUS[k][0]} ${count(k)}`); t.type = 'button';
        t.onclick = () => { filter = k; draw(); };
        tabs.append(t);
      }
      bar.append(tabs);
      wrap.append(bar);
    } else wrap.append(el('h2', 'id-h', 'Mes idées'));
    const shown = data.admin && filter !== 'all' ? data.ideas.filter((i) => i.status === filter) : data.ideas;
    if (!shown.length) wrap.append(el('p', 'nf-empty', data.admin ? 'Aucune idée dans cette catégorie.' : 'Tu n’as pas encore proposé d’idée. Lance-toi ! 💡'));
    shown.forEach((i, n) => { const c = card(i, data.admin); c.style.setProperty('--i', String(Math.min(n, 10))); wrap.append(c); });
    return wrap;
  }

  function draw() {
    const page = $('#pageIdeas');
    if (!page) return;
    const keep = document.activeElement && page.contains(document.activeElement) ? document.activeElement : null;
    const scroll = window.scrollY;
    page.replaceChildren(head(), form(), list());
    window.scrollTo({ top: scroll, behavior: 'instant' in window ? 'instant' : 'auto' });
    if (keep && keep.classList.contains('id-text') && !keep.classList.contains('small')) { const t = $('.id-text', page); if (t) t.focus(); }
  }

  async function open() {
    const page = $('#pageIdeas');
    if (!page) return;
    try { data = await api(); } catch (err) { page.replaceChildren(head(), el('p', 'nf-empty', err.message)); return; }
    draw();
  }

  window.addEventListener('ideas-open', open);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
