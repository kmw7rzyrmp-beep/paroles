// La page « Admin » (seulement pour les admins) : la liste des pouvoirs, des raccourcis,
// une notification à tout le monde, et une console pour taper des commandes.
(() => {
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const css = `
  .ad-hero { position: relative; overflow: hidden; padding: 1.8rem 2rem; margin: 0 0 1.4rem; border-radius: 26px; background: radial-gradient(120% 140% at 100% 0%, #3a1d10 0%, #1a1214 45%, #101012 100%); border: 1px solid #2c2226; }
  .ad-hero::after { content: "🛡️"; position: absolute; right: 1.4rem; top: .6rem; font-size: 6.5rem; opacity: .14; }
  .ad-hero h1 { margin: 0; font: 800 clamp(2rem, 4vw, 2.8rem)/1 var(--texte); letter-spacing: -.035em; }
  .ad-hero p { margin: .55rem 0 0; color: var(--gris); max-width: 36rem; }
  .ad-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 1.4rem; align-items: start; }
  @media (max-width: 1180px) { .ad-grid { grid-template-columns: 1fr; } }
  .ad-card { padding: 1.2rem 1.3rem; border-radius: 22px; background: var(--coque); }
  .ad-card h2 { margin: 0 0 .9rem; font: 700 1.1rem var(--texte); }
  .ad-quick { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); gap: .55rem; margin-bottom: 1.4rem; }
  .ad-quick button { display: grid; justify-items: start; gap: .2rem; min-height: 4.6rem; padding: .7rem .85rem; border-radius: 16px; background: #1d1d21; color: var(--blanc); text-align: left; font: 600 .88rem var(--texte); transition: transform .2s, background .2s; }
  .ad-quick button:hover { background: #26262b; transform: translateY(-2px); }
  .ad-quick button span { font-size: 1.4rem; }
  .ad-all textarea { width: 100%; min-height: 5.5rem; padding: .8rem 1rem; border-radius: 14px; border: 1px solid var(--ligne); background: #0b0b0c; color: var(--blanc); font: 400 16px/1.4 var(--texte); resize: vertical; box-sizing: border-box; }
  .ad-all textarea:focus { outline: none; border-color: var(--orange); }
  .ad-all .row { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-top: .6rem; }
  .ad-all .row button { min-height: 2.8rem; padding: 0 1.2rem; border-radius: 999px; background: var(--orange); color: #fff; font-weight: 700; }
  .ad-all .row span { color: var(--gris); font-size: .85rem; }
  .ad-powers { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; }
  .ad-powers li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .2rem .8rem; align-items: center; padding: .65rem .8rem; border-radius: 14px; background: #1a1a1d; animation: nfIn .4s ease both; animation-delay: calc(var(--i) * 25ms); }
  .ad-powers code { font: 600 .85rem ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--orange); overflow-wrap: anywhere; }
  .ad-powers p { grid-column: 1; margin: 0; color: var(--gris); font-size: .84rem; }
  .ad-powers button { grid-row: 1 / span 2; grid-column: 2; min-height: 2.3rem; padding: 0 .85rem; border-radius: 999px; background: #26262b; color: var(--blanc); font-size: .8rem; }
  .ad-console { border-radius: 22px; overflow: hidden; background: #070708; border: 1px solid #222226; position: sticky; top: 1rem; }
  @media (max-width: 1180px) { .ad-console { position: static; } }
  .ad-console .bar { display: flex; align-items: center; gap: .4rem; padding: .7rem 1rem; background: #121214; border-bottom: 1px solid #222226; font: 600 .82rem var(--texte); color: var(--gris); }
  .ad-console .bar i { width: .7rem; height: .7rem; border-radius: 50%; background: #e5484d; }
  .ad-console .bar i:nth-child(2) { background: #f5c43a; } .ad-console .bar i:nth-child(3) { background: #3fbf6a; margin-right: .5rem; }
  .ad-out { height: min(26rem, 50vh); overflow-y: auto; padding: .9rem 1rem; font: 500 .84rem/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
  .ad-out .in { color: #f4f4f5; } .ad-out .in::before { content: "star-song $ "; color: var(--orange); }
  .ad-out .ok { color: #9fe3b4; } .ad-out .err { color: #ff8f8f; } .ad-out .sys { color: #7a7a82; }
  .ad-out div { animation: lineIn .2s ease; }
  @keyframes lineIn { from { opacity: 0; transform: translateY(4px); } }
  .ad-form { display: flex; align-items: center; gap: .5rem; padding: .6rem .8rem; border-top: 1px solid #222226; background: #0d0d0f; }
  .ad-form label { color: var(--orange); font: 700 .85rem ui-monospace, monospace; white-space: nowrap; }
  .ad-form input { flex: 1; min-width: 0; min-height: 2.6rem; border: 0; background: transparent; color: #f4f4f5; font: 500 16px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ad-form input:focus { outline: none; }
  .ad-form button { min-height: 2.4rem; padding: 0 1rem; border-radius: 999px; background: var(--orange); color: #fff; font-weight: 700; }
  .ad-hint { padding: 0 1rem .7rem; background: #0d0d0f; color: #7a7a82; font: 500 .78rem ui-monospace, monospace; min-height: 1rem; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);

  let built = false, commands = [];
  const hist = []; let hi = 0;
  let out, input, hint;

  function print(text, cls) {
    const d = el('div', cls, text);
    out.append(d);
    while (out.childElementCount > 300) out.firstElementChild.remove();
    out.scrollTop = out.scrollHeight;
  }
  async function run(line) {
    line = String(line || '').trim();
    if (!line) return;
    print(line, 'in');
    hist.push(line); hi = hist.length;
    if (line === 'effacer' || line === 'clear') { out.replaceChildren(); return; }
    try {
      const r = await fetch('/api/admin/cmd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) print(d.error || 'Erreur.', 'err'); else { print(d.out || 'OK.', 'ok'); window.dispatchEvent(new Event('live-poll')); }
    } catch { print('Le serveur ne répond pas.', 'err'); }
  }
  function fill(cmd) {
    input.value = cmd.use.replace(/\s.*$/, '') + ' ';
    input.focus();
    hint.textContent = cmd.use + ' : ' + cmd.help;
    document.querySelector('.ad-console')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function build(page) {
    page.replaceChildren();
    const head = el('div', 'page-head');
    const back = el('button', 'ghost page-back'); back.type = 'button'; back.setAttribute('data-page-close', ''); back.setAttribute('aria-label', 'Retour');
    back.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="pb-lbl">Retour</span>';
    head.append(back);
    head.style.margin = '0 0 .8rem';
    const hero = el('div', 'ad-hero');
    const h = el('h1', '', 'Admin'); h.id = 'admTitle2';
    hero.append(el('p', 'page-eyebrow', 'Tes super-pouvoirs'), h, el('p', '', 'Tout ce que tu peux faire en tant qu’admin. Clique sur un pouvoir pour le préparer dans la console, ou tape directement une commande.'));

    const quick = el('div', 'ad-quick');
    const qa = [
      ['📊', 'Stats du site', () => window.openAdminStats && window.openAdminStats()],
      ['🎉', 'Confettis pour tous', () => run('confettis')],
      ['📳', 'Secouer l’écran', () => run('secousse')],
      ['🟢', 'Qui est en ligne ?', () => run('en-ligne')],
      ['🎮', 'Salons en cours', () => run('salons')],
      ['📜', 'Journal', () => run('journal')],
    ];
    for (const [e, label, fn] of qa) { const b = el('button'); b.type = 'button'; b.append(el('span', '', e), document.createTextNode(label)); b.onclick = fn; quick.append(b); }

    const left = el('div');
    const all = el('section', 'ad-card ad-all');
    all.append(el('h2', '', '📣 Notifier tout le monde'));
    const ta = el('textarea'); ta.maxLength = 300; ta.placeholder = 'Ex. Nouveau mode de jeu dispo ce soir, venez tester 🔥'; ta.setAttribute('aria-label', 'Message pour tous les utilisateurs');
    const row = el('div', 'row');
    const send = el('button', '', 'Envoyer à tous'); send.type = 'button';
    const info = el('span', '', 'Arrive sur les téléphones et dans l’historique des notifications de chacun.');
    send.onclick = async () => {
      const text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      const ok = await window.ssConfirm({ icon: '📣', title: 'Envoyer à tous les utilisateurs ?', text: `« ${text} »`, ok: 'Envoyer' });
      if (!ok) return;
      await run('notif-tous ' + text);
      ta.value = '';
    };
    row.append(send, info);
    all.append(ta, row);
    const pw = el('section', 'ad-card');
    pw.style.marginTop = '1.4rem';
    pw.append(el('h2', '', '⚡ Tous les pouvoirs'));
    const list = el('ul', 'ad-powers');
    pw.append(list);
    left.append(quick, all, pw);

    const cons = el('section', 'ad-console');
    cons.setAttribute('aria-label', 'Console admin');
    const bar = el('div', 'bar'); bar.append(el('i'), el('i'), el('i'), document.createTextNode('Console Star Song'));
    out = el('div', 'ad-out'); out.setAttribute('role', 'log'); out.setAttribute('aria-live', 'polite');
    const form = el('form', 'ad-form');
    const lab = el('label', '', '$'); lab.htmlFor = 'adIn';
    input = el('input'); input.id = 'adIn'; input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('autocapitalize', 'none'); input.placeholder = 'aide';
    const go = el('button', '', 'Exécuter'); go.type = 'submit';
    form.append(lab, input, go);
    hint = el('div', 'ad-hint');
    form.onsubmit = (e) => { e.preventDefault(); const v = input.value; input.value = ''; hint.textContent = ''; run(v); };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi] || ''; }
      else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
      else if (e.key === 'Tab') { // complète le nom de la commande
        const w = input.value.trim().toLowerCase();
        const m = commands.filter((c) => c.name.startsWith(w));
        if (w && m.length) { e.preventDefault(); input.value = m[0].name + ' '; hint.textContent = m.map((c) => c.use).join('   '); }
      }
    });
    input.addEventListener('input', () => {
      const w = input.value.trim().split(/\s+/)[0].toLowerCase();
      const c = commands.find((x) => x.name === w) || (w ? commands.find((x) => x.name.startsWith(w)) : null);
      hint.textContent = c ? `${c.use} : ${c.help}` : '';
    });
    cons.append(bar, out, form, hint);

    const grid = el('div', 'ad-grid');
    grid.append(left, cons);
    page.append(head, hero, grid);
    print('Bienvenue dans la console. Tape « aide » pour la liste des commandes, ↑ pour l’historique, Tab pour compléter.', 'sys');

    fetch('/api/admin/commands', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      commands = d.commands || [];
      list.replaceChildren(...commands.filter((c) => c.name !== 'aide').map((c, i) => {
        const li = el('li'); li.style.setProperty('--i', String(i));
        const b = el('button', '', 'Utiliser'); b.type = 'button'; b.onclick = () => fill(c);
        li.append(el('code', '', c.use), b, el('p', '', c.help));
        return li;
      }));
    }).catch(() => list.replaceChildren(el('li', '', 'Impossible de charger les pouvoirs.')));
  }

  window.addEventListener('admin-open', () => {
    const page = document.getElementById('pageAdmin');
    if (!page) return;
    if (!built) { build(page); built = true; }
  });
})();
