/* ALIMAT Connect — інтерфейс */
(function () {
  const AL = window.AL;
  const LANGS = [['pl', 'Polski'], ['uk', 'Українська'], ['en', 'English'], ['ru', 'Русский'], ['es', 'Español'], ['ro', 'Română'], ['ne', 'नेपाली']];
  const LOCALE = { pl: 'pl-PL', uk: 'uk-UA', en: 'en-GB', ru: 'ru-RU', es: 'es-ES', ro: 'ro-RO', ne: 'ne-NP' };
  const ST = { api: null, me: null, struct: { projects: [], departments: [], groups: [] }, lang: 'uk', tab: 'home', detail: null, pendingInvite: null, timer: null, prefill: null };
  AL.st = ST;

  // ---------- утиліти ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function t(key, vars) {
    const D = AL.I18N || {};
    let s = (D[ST.lang] && D[ST.lang][key]) || (D.en && D.en[key]) || (D.uk && D.uk[key]) || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }
  AL.t = t;
  const loc = () => LOCALE[ST.lang] || 'pl-PL';
  const fDate = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(loc(), { day: 'numeric', month: 'short' }) : '';
  const fDateLong = d => d ? new Date(d + 'T12:00:00').toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  const fTime = d => new Date(d).toLocaleTimeString(loc(), { hour: '2-digit', minute: '2-digit' });
  function fAgo(d) {
    const m = Math.round((Date.now() - new Date(d)) / 60000);
    const rtf = new Intl.RelativeTimeFormat(loc(), { numeric: 'auto', style: 'short' });
    if (m < 60) return rtf.format(-Math.max(m, 0), 'minute');
    if (m < 60 * 24) return rtf.format(-Math.round(m / 60), 'hour');
    if (m < 60 * 24 * 7) return rtf.format(-Math.round(m / 1440), 'day');
    return fDate(d);
  }
  const range = (a, b) => !a ? '' : (!b || a === b ? fDate(a) : fDate(a) + ' – ' + fDate(b));
  const pName = id => (ST.struct.projects.find(x => x.id === id) || {}).name || '';
  const dName = id => (ST.struct.departments.find(x => x.id === id) || {}).name || '';
  const gName = id => (ST.struct.groups.find(x => x.id === id) || {}).name || '';
  const place = o => [pName(o.project_id), dName(o.department_id), gName(o.group_id)].filter(Boolean).join(' · ');
  const initials = n => String(n || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
  function toast(msg, kind) {
    const el = $('#toast'); el.textContent = msg; el.className = 'toast show ' + (kind || '');
    clearTimeout(toast.t); toast.t = setTimeout(() => { el.className = 'toast'; }, 2600);
  }
  function errMsg(e) {
    const c = e && e.code;
    if (c === 'RATE_LIMIT') return t('err_rate', { time: fTime(e.extra) });
    const k = 'err_' + String(c || 'error').toLowerCase(), m = t(k);
    return m === k ? t('err_error') : m;
  }
  async function guard(fn) { try { return await fn(); } catch (e) { console.error(e); toast(errMsg(e), 'bad'); return undefined; } }

  // ---------- іконки ----------
  const I = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    inbox: '<path d="M4 4h16v16H4z"/><path d="M4 14h4l2 3h4l2-3h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.5.2 4.3 1.9 5 5"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.2-7 8-7s7 2.5 8 7"/>',
    flag: '<path d="M5 21V4h11l-1.5 4L16 12H5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3"/>',
    tree: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
    log: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    day_off: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    sick: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M12 9.5v7M8.5 13h7M9 6V4h6v2"/>',
    vacation: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    housing: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>',
    salary: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    complaint: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    newcomer_question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1 1-1.1 1.8v.5M12 17v.3"/>',
    poll: '<path d="M5 20V12M12 20V5M19 20v-9"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/>',
    megaphone: '<path d="M3 10v4h3l7 4V6L6 10z"/><path d="M17 9a4 4 0 0 1 0 6M6 14l1.5 5h3"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7M8 11h5"/>',
    folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
    file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  };
  const icon = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ''}</svg>`;

  // ---------- оболонка ----------
  function tabsFor(me) {
    if (!me) return [];
    const tabs = [{ id: 'home', icon: 'home', label: t('tab_home') }];
    if (AL.can.requests(me)) tabs.push({ id: 'requests', icon: 'inbox', label: t('tab_requests') });
    tabs.push({ id: 'library', icon: 'book', label: t('tab_library') });
    if (me.status === 'newcomer') tabs.push({ id: 'firstday', icon: 'flag', label: t('tab_firstday') });
    if (AL.can.post(me) || AL.can.task(me)) tabs.push({ id: 'create', icon: 'plus', label: t('tab_create') });
    if (AL.can.people(me)) tabs.push({ id: 'people', icon: 'people', label: t('tab_people') });
    if (['worker', 'partner'].includes(me.role)) tabs.push({ id: 'profile', icon: 'user', label: t('tab_profile') });
    else tabs.push({ id: 'more', icon: 'more', label: t('tab_more') });
    return tabs;
  }

  function shell() {
    document.documentElement.lang = ST.lang;
    const me = ST.me;
    $('#demobar').hidden = !(ST.api.mode === 'demo' && me);
    $('.top').hidden = !me;
    const imp = me && ST.api.impersonating && ST.api.impersonating();
    let ib = $('#impbar');
    if (!ib) { ib = document.createElement('div'); ib.id = 'impbar'; $('.top').after(ib); }
    ib.hidden = !imp;
    if (imp) {
      ib.innerHTML = `<span>${icon('eye')}${esc(t('imp_banner', { name: me.full_name }))}</span><button class="btn small" id="imp-back">${t('imp_back', { name: imp.name || '' })}</button>`;
      $('#imp-back').onclick = async () => { const ok = await guard(async () => { await ST.api.stopImpersonation(); return true; }); if (ok) { await boot(); ST.tab = 'people'; render(); } };
    }
    let hb = $('#top-guides');
    if (!hb) { hb = document.createElement('button'); hb.id = 'top-guides'; hb.className = 'top-btn'; $('.top').appendChild(hb); }
    hb.innerHTML = `${icon('book')}<span>${t('lib_guides')}</span>`; hb.setAttribute('aria-label', t('lib_guides'));
    hb.onclick = () => { ST.tab = 'library'; ST.libSeg = 'guides'; ST.guide = null; ST.folder = null; ST.docPerson = null; ST.detail = null; render(); };
    if (ST.api.mode === 'demo' && me) {
      $('#demobar').innerHTML = `<span class="demo-tag">${t('demo')}</span><span class="demo-who">${esc(me.full_name)} · ${esc(t('role_' + me.role))}</span><button class="link" id="demo-switch">${t('demo_switch')}</button>`;
      $('#demo-switch').onclick = () => openUserSwitcher();
    }
    const tabs = tabsFor(me);
    $('#tabsnav').hidden = !me || AL.blockOf(me) === 'full';
    $('#tabs').innerHTML = tabs.map(x => `<button class="tab ${ST.tab === x.id ? 'on' : ''}" data-tab="${x.id}" aria-label="${esc(x.label)}">${icon(x.icon)}<span>${esc(x.label)}</span><b class="badge" data-badge="${x.id}" hidden></b></button>`).join('');
    $$('#tabs .tab').forEach(b => b.onclick = () => { ST.tab = b.dataset.tab; ST.detail = null; ST.guide = null; ST.folder = null; ST.docPerson = null; render(); });
  }

  // Рендери виконуються по черзі, щоб швидкі натискання не перемішували екрани
  function render() { ST.rq = (ST.rq || Promise.resolve()).then(doRender, doRender); return ST.rq; }
  async function doRender() {
    shell();
    const v = $('#view');
    window.scrollTo(0, 0);
    if (!ST.me) return renderAuth(v);
    if (AL.blockOf(ST.me) === 'full') return renderBlocked(v);
    if (ST.detail) return renderRequestDetail(v, ST.detail);
    const map = { home: renderHome, requests: renderRequests, firstday: renderFirstDay, create: renderCreate, people: renderPeople, more: renderMore, profile: renderProfile, analytics: renderAnalytics, onboarding: renderOnboardingAdmin, invites: renderInvites, structure: renderStructure, audit: renderAudit, ...(AL.screens || {}) };
    v.innerHTML = '<div class="loading"></div>';
    await guard(() => (map[ST.tab] || renderHome)(v));
    updateBadges();
  }
  AL.render = render;

  function header(title, sub, back) {
    return `<div class="vh">${back ? `<button class="iconbtn" id="back" aria-label="${t('back')}">${icon('back')}</button>` : ''}<div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div></div>`;
  }
  function bindBack(v, to) { const b = $('#back', v); if (b) b.onclick = () => { ST.detail = null; if (to) ST.tab = to; render(); }; }

  async function updateBadges() {
    if (!ST.me || AL.blockOf(ST.me) === 'full') return;
    try {
      const [anns, polls, tasks, reqs, guides] = await Promise.all([ST.api.announcements(), ST.api.polls(), ST.api.tasks(), ST.api.requests(), ST.api.guides(ST.lang).catch(() => [])]);
      const home = anns.filter(a => !a.read && a.author_id !== ST.me.id).length + polls.filter(p => !p.voted && p.author_id !== ST.me.id).length + tasks.filter(x => x.assignee_id === ST.me.id && x.status === 'open').length;
      const inbox = reqs.visible.filter(r => r.status === 'new').length;
      setBadge('home', home); setBadge('requests', inbox); setBadge('library', AL.pendingGuides ? AL.pendingGuides(guides).length : 0);
    } catch (e) { /* тихо */ }
  }
  function setBadge(id, n) { const b = $(`[data-badge="${id}"]`); if (b) { b.hidden = !n; b.textContent = n > 99 ? '99+' : n; } }

  // ---------- нижня панель (sheet) ----------
  function openSheet(html, onMount) {
    const s = $('#sheet');
    s.innerHTML = `<div class="sheet-back" data-close></div><div class="sheet-card" role="dialog" aria-modal="true"><button class="sheet-x iconbtn" data-close aria-label="${t('close')}">×</button>${html}</div>`;
    s.hidden = false; document.body.classList.add('noscroll');
    $$('[data-close]', s).forEach(x => x.onclick = closeSheet);
    if (onMount) onMount($('.sheet-card', s));
  }
  function closeSheet() { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; document.body.classList.remove('noscroll'); }

  // ---------- вхід ----------
  function langChips(id) {
    return `<div class="langs" id="${id}">${LANGS.map(([c, n]) => `<button class="chip ${ST.lang === c ? 'on' : ''}" data-lang="${c}">${n}</button>`).join('')}</div>`;
  }
  function bindLang(el, after) {
    $$('[data-lang]', el).forEach(b => b.onclick = async () => {
      ST.lang = b.dataset.lang; try { localStorage.setItem('alimat-lang', ST.lang); } catch (e) { /* */ }
      if (ST.me) { ST.me.lang = ST.lang; await guard(() => ST.api.setLang(ST.lang)); }
      after ? after() : render();
    });
  }

  async function renderAuth(v) {
    if (ST.pendingInvite && (ST.api.mode === 'demo' || await ST.api.currentUserId())) return renderRegister(v, ST.pendingInvite);
    if (ST.api.mode !== 'demo' && await ST.api.currentUserId()) {
      if (!ST.claimTried) { ST.claimTried = true; const c = await ST.api.claimAccount(ST.lang).catch(() => null); if (c && c.ok) return boot(); }
      return renderNeedInvite(v);
    }
    if (!ST.cabinet) return renderCabinetPick(v);
    if (ST.api.mode === 'demo') return renderDemoLogin(v);
    v.innerHTML = `<div class="auth">
      ${BRAND()}
      ${cabinetChosen()}
      <p class="lead">${t('login_lead')}</p>
      <div class="seg"><button class="${ST.loginPw ? '' : 'on'}" data-lm="mail">${t('login_by_mail')}</button><button class="${ST.loginPw ? 'on' : ''}" data-lm="pw">${t('login_by_pw')}</button></div>
      <form id="f-pw" class="card form" ${ST.loginPw ? '' : 'hidden'}>
        <label for="pw-email">${t('email')}</label><input id="pw-email" type="email" autocomplete="username" required placeholder="name@alimatgroup.com">
        <label for="pw">${t('password')}</label><input id="pw" type="password" autocomplete="current-password" required minlength="6">
        <button class="btn primary">${t('login')}</button>
        <p class="muted small">${t('login_pw_hint')}</p>
      </form>
      <form id="f-email" class="card form" ${ST.loginPw ? 'hidden' : ''}>
        <label for="email">${t('email')}</label>
        <input id="email" type="email" autocomplete="email" required placeholder="name@example.com">
        <button class="btn primary">${t('send_code')}</button>
      </form>
      <form id="f-code" class="card form" hidden>
        <p class="muted" id="code-sent"></p>
        <label for="code">${t('code')}</label>
        <input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required placeholder="123456">
        <button class="btn primary">${t('login')}</button>
      </form>${companyCard()}</div>`;
    bindCabinetChange(v);
    $$('[data-lm]', v).forEach(b => b.onclick = () => { ST.loginPw = b.dataset.lm === 'pw'; render(); });
    $('#f-pw').onsubmit = async e => {
      e.preventDefault();
      const ok = await guard(async () => { await ST.api.signInPassword($('#pw-email').value.trim(), $('#pw').value); return true; });
      if (ok) { ST.claimTried = false; await boot(); }
    };
    $('#f-email').onsubmit = async e => {
      e.preventDefault(); const email = $('#email').value.trim();
      const ok = await guard(async () => { await ST.api.sendCode(email); return true; });
      if (ok) { $('#f-email').hidden = true; $('#f-code').hidden = false; $('#code-sent').textContent = t('code_sent', { email }); $('#code').focus(); }
    };
    $('#f-code').onsubmit = async e => {
      e.preventDefault();
      const ok = await guard(async () => { await ST.api.verifyCode($('#email').value.trim(), $('#code').value.trim()); return true; });
      if (ok) await boot();
    };
  }
  // ---------- вибір кабінету ----------
  const CABINETS = [['worker', 'user'], ['staff', 'people'], ['partner', 'key'], ['admin', 'lock']];
  const BRAND = () => `<div class="brand-big"><img class="logo-big" src="logo.webp" alt="Alimat Group"><small>Connect</small></div>`;
  function cabinetOf(u) {
    if (!u) return null;
    if (u.role === 'partner') return 'partner';
    if (['admin_project', 'admin_global', 'superadmin'].includes(u.role)) return 'admin';
    if (u.role === 'worker' && (!u.work_function || u.work_function === 'production')) return 'worker';
    return 'staff';
  }
  function renderCabinetPick(v) {
    v.innerHTML = `<div class="auth">
      ${BRAND()}
      <h1 class="auth-title">${t('cab_title')}</h1>
      ${langChips('lc')}
      <p class="lead">${t('cab_choose')}</p>
      <div class="cabinets">${CABINETS.map(([c, ic]) => `<button class="card cab" data-cab="${c}"><span class="cab-ic">${icon(ic)}</span><span class="grow"><b>${t('cab_' + c)}</b><small>${t('cab_' + c + '_sub')}</small></span>${icon('back', 'flip')}</button>`).join('')}</div>
      ${companyCard()}</div>`;
    bindLang(v);
    $$('[data-cab]', v).forEach(b => b.onclick = () => { ST.cabinet = b.dataset.cab; try { localStorage.setItem('alimat-cabinet', ST.cabinet); } catch (e) { /* */ } render(); });
  }
  function cabinetChosen() {
    const ic = (CABINETS.find(x => x[0] === ST.cabinet) || [])[1] || 'user';
    return `<div class="cab-chosen"><span class="cab-ic">${icon(ic)}</span><span class="grow"><small>${t('cab_title')}</small><b>${t('cab_' + ST.cabinet)}</b></span><button class="link" id="cab-change">${t('cab_change')}</button></div>`;
  }
  function bindCabinetChange(v) { const b = $('#cab-change', v); if (b) b.onclick = () => { ST.cabinet = null; try { localStorage.removeItem('alimat-cabinet'); } catch (e) { /* */ } render(); }; }

  // ---------- контакти ----------
  const telHref = p => 'tel:' + String(p || '').replace(/[^+\d]/g, '');
  const waHref = p => 'https://wa.me/' + String(p || '').replace(/\D/g, '');
  function companyCard(compact) {
    const C = AL.COMPANY;
    return `<div class="card contacts ${compact ? 'compact' : ''}"><h3>${t('company_contacts')}</h3>
      <dl class="kv"><dt>${t('phone_workers')}</dt><dd><a href="${telHref(C.phone)}">${esc(C.phone)}</a> · <a href="${waHref(C.whatsapp || C.phone)}" target="_blank" rel="noopener">WhatsApp</a></dd>
      ${C.phone_companies ? `<dt>${t('phone_companies')}</dt><dd><a href="${telHref(C.phone_companies)}">${esc(C.phone_companies)}</a></dd>` : ''}
      <dt>${t('email')}</dt><dd><a href="mailto:${esc(C.email)}">${esc(C.email)}</a></dd>
      <dt>${t('site')}</dt><dd><a href="${esc(C.site)}" target="_blank" rel="noopener">${esc(C.site.replace(/^https?:\/\//, ''))}</a></dd></dl></div>`;
  }
  function coordCard(list) {
    const C = AL.COMPANY;
    if (!list.length) return `<div class="card coord none"><h3>${t('coord_title')}</h3><p>${t('coord_none')}</p>
      <div class="actions"><a class="btn primary" href="${telHref(C.phone)}">${icon('phone')}${esc(C.phone)}</a><a class="btn" href="${waHref(C.whatsapp || C.phone)}" target="_blank" rel="noopener">WhatsApp</a></div></div>`;
    return `<div class="card coord"><h3>${t(list.length > 1 ? 'coord_title_many' : 'coord_title')}</h3>
      ${list.map(c => `<div class="coord-row"><span class="av staff">${esc(initials(c.full_name))}</span><span class="grow"><b>${esc(c.full_name)}</b><small>${esc(c.project || '')}</small>${c.phone ? `<span class="coord-phone">${esc(c.phone)}</span>` : `<small>${t('coord_no_phone')}</small>`}</span></div>
        ${c.phone ? `<div class="actions"><a class="btn primary" href="${telHref(c.phone)}">${icon('phone')}${t('call')}</a><a class="btn" href="${waHref(c.phone)}" target="_blank" rel="noopener">WhatsApp</a></div>` : ''}`).join('')}
      <p class="muted small">${t('coord_hint')}</p>
      <p class="muted small">${esc(t('central_fallback', { phone: C.phone }))}</p></div>`;
  }

  function renderNeedInvite(v) {
    v.innerHTML = `<div class="auth">${header(t('reg_title'))}<form id="f-inv" class="card form">
      <p>${t('need_invite')}</p><label for="inv">${t('invite_code')}</label><input id="inv" required placeholder="ANIMEX01">
      <button class="btn primary">${t('next')}</button></form>
      <button class="btn ghost" id="lo">${t('logout')}</button></div>`;
    $('#f-inv').onsubmit = e => { e.preventDefault(); ST.pendingInvite = $('#inv').value.trim(); render(); };
    $('#lo').onclick = async () => { await ST.api.signOut(); ST.me = null; render(); };
  }

  function renderDemoLogin(v) {
    const users = ST.api.demoUsers().filter(u => cabinetOf(u) === ST.cabinet);
    const grpAll = [
      [t('demo_g_workers'), users.filter(u => u.role === 'worker' && u.status === 'active' && (!u.work_function || u.work_function === 'production'))],
      [t('demo_g_office'), users.filter(u => (u.role === 'worker' && u.work_function && u.work_function !== 'production') || u.role === 'partner')],
      [t('demo_g_newcomers'), users.filter(u => u.role === 'worker' && u.status === 'newcomer')],
      [t('demo_g_line'), users.filter(u => ['leader', 'manager', 'coordinator', 'hr'].includes(u.role))],
      [t('demo_g_admins'), users.filter(u => ['admin_project', 'admin_global', 'superadmin'].includes(u.role))],
    ];
    const grp = grpAll.filter(([, list]) => list.length);
    v.innerHTML = `<div class="auth">
      ${BRAND()}
      ${cabinetChosen()}
      <p class="lead">${t('cab_demo_pick')}</p>
      ${grp.map(([title, list]) => `<h2 class="sec">${esc(title)}</h2><div class="list">${list.map(u => `
        <button class="row" data-u="${u.id}"><span class="av">${esc(initials(u.full_name))}</span>
        <span class="grow"><b>${esc(u.full_name)}</b><small>${esc(u.work_function && u.role === 'worker' ? t('fn_' + u.work_function) : t('role_' + u.role))}${u.project_id ? ' · ' + esc(pName(u.project_id)) : ''}</small></span>
        ${u.status === 'newcomer' ? `<span class="pill amber">${t('newcomer')}</span>` : ''}</button>`).join('')}</div>`).join('')}
      ${ST.cabinet === 'worker' ? `<h2 class="sec">${t('demo_register')}</h2>
      <form id="f-inv" class="card form"><p class="muted">${t('demo_register_hint')}</p>
        <label for="inv">${t('invite_code')}</label><input id="inv" value="ANIMEX01" required>
        <button class="btn">${t('reg_title')}</button></form>` : ''}
      ${companyCard()}
      <button class="btn ghost small" id="reset">${t('demo_reset')}</button></div>`;
    bindCabinetChange(v);
    $$('[data-u]', v).forEach(b => b.onclick = async () => { await ST.api.demoLogin(b.dataset.u); await boot(); });
    const fi = $('#f-inv', v); if (fi) fi.onsubmit = e => { e.preventDefault(); ST.pendingInvite = $('#inv').value.trim(); render(); };
    $('#reset').onclick = async () => { await ST.api.demoReset(); toast(t('demo_reset_done')); render(); };
  }

  function openUserSwitcher() {
    const users = ST.api.demoUsers();
    openSheet(`<h2>${t('demo_switch')}</h2><div class="list">${users.map(u => `<button class="row" data-u="${u.id}"><span class="av">${esc(initials(u.full_name))}</span><span class="grow"><b>${esc(u.full_name)}</b><small>${esc(t('role_' + u.role))}${u.status === 'newcomer' ? ' · ' + t('newcomer') : ''}</small></span>${u.id === ST.me.id ? icon('check') : ''}</button>`).join('')}</div>`, el => {
      $$('[data-u]', el).forEach(b => b.onclick = async () => { closeSheet(); await ST.api.demoLogin(b.dataset.u); await boot(); });
    });
  }

  async function renderRegister(v, code) {
    const info = await ST.api.inviteInfo(code);
    if (!info) {
      v.innerHTML = `<div class="auth">${header(t('reg_title'))}<div class="card warn">${t('invite_invalid')}</div><button class="btn" id="bk">${t('back')}</button></div>`;
      $('#bk').onclick = () => { ST.pendingInvite = null; render(); }; return;
    }
    v.innerHTML = `<div class="auth">${header(t('reg_title'), t('reg_sub'))}
      <div class="card placement"><small>${t('your_place')}</small>
        <b>${esc(info.project)}</b><span>${esc([info.department, info.group].filter(Boolean).join(' · '))}</span>
        <span>${esc(info.position || t('role_' + info.role))}</span></div>
      ${langChips('lc')}
      <form id="f-reg" class="card form">
        <label for="fn">${t('full_name')}</label><input id="fn" required autocomplete="name" placeholder="${t('full_name_ph')}">
        <label for="ph">${t('phone')}</label><input id="ph" type="tel" autocomplete="tel" placeholder="+48 …" required>
        ${ST.api.mode === 'demo' ? `<label for="em">${t('email')}</label><input id="em" type="email" required placeholder="name@example.com">` : ''}
        <p class="muted small">${t('reg_privacy')}</p>
        <button class="btn primary">${t('reg_submit')}</button></form>
      <button class="btn ghost" id="bk">${t('cancel')}</button></div>`;
    bindLang(v);
    $('#bk').onclick = () => { ST.pendingInvite = null; render(); };
    $('#f-reg').onsubmit = async e => {
      e.preventDefault();
      const ok = await guard(async () => { await ST.api.register({ code, full_name: $('#fn').value, phone: $('#ph').value, email: $('#em') && $('#em').value, lang: ST.lang }); return true; });
      if (ok) { ST.pendingInvite = null; clearInviteFromUrl(); toast(t('reg_done'), 'good'); await boot(); }
    };
  }
  function clearInviteFromUrl() { try { const u = new URL(location.href); if (u.searchParams.has('invite')) { u.searchParams.delete('invite'); history.replaceState(null, '', u); } } catch (e) { /* */ } }

  function renderBlocked(v) {
    const me = ST.me;
    v.innerHTML = `<div class="auth"><div class="card warn big">${icon('lock', 'lg')}<h2>${t('blocked_title')}</h2>
      <p>${me.blocked_until ? t('blocked_until', { date: fDate(me.blocked_until) + ' ' + fTime(me.blocked_until) }) : t('blocked_forever')}</p>
      ${me.block_reason ? `<p class="muted">${t('reason')}: ${esc(me.block_reason)}</p>` : ''}<p>${t('blocked_contact')}</p></div>
      <button class="btn" id="lo">${t('logout')}</button></div>`;
    $('#lo').onclick = logout;
  }
  function blockBanner() {
    const b = AL.blockOf(ST.me);
    if (b === 'readonly') return `<div class="banner warn">${icon('lock')}<span>${t('blocked_readonly')}${ST.me.blocked_until ? ' ' + t('until_date', { date: fDate(ST.me.blocked_until) }) : ''}</span></div>`;
    if (b === 'complaints') return `<div class="banner warn">${icon('lock')}<span>${t('blocked_complaints')}${ST.me.blocked_until ? ' ' + t('until_date', { date: fDate(ST.me.blocked_until) }) : ''}</span></div>`;
    return '';
  }

  // ---------- головна ----------
  function scopeLabel(a) {
    if (a.scope === 'all') return t('scope_all');
    if (a.scope === 'project') return pName(a.project_id);
    if (a.scope === 'department') return pName(a.project_id) + ' · ' + dName(a.department_id);
    return dName(a.department_id) + ' · ' + gName(a.group_id);
  }
  async function renderHome(v) {
    const me = ST.me;
    const showCoord = cabinetOf(me) === 'worker' || me.role === 'leader';
    const [anns, polls, tasks, stats, onb, coords, guides] = await Promise.all([ST.api.announcements(), ST.api.polls(), ST.api.tasks(), ST.api.announcementStats(), me.status === 'newcomer' ? ST.api.onboarding() : Promise.resolve([]), showCoord ? ST.api.myCoordinators().catch(() => []) : Promise.resolve([]), ST.api.guides(ST.lang).catch(() => [])]);
    const myGuides = guides.filter(g => g.published && !g.can_edit).slice(0, 4);
    const myTasks = tasks.filter(x => x.assignee_id === me.id && x.status === 'open');
    const openPolls = polls.filter(p => !p.voted && p.author_id !== me.id);
    const donePolls = polls.filter(p => p.voted || p.author_id === me.id);
    const ob = pickOnboarding(onb);
    const hello = t('hello', { name: me.full_name.split(' ')[0] });
    v.innerHTML = `${header(hello, [me.position || t('role_' + me.role), place(me)].filter(Boolean).join(' · '))}
      ${blockBanner()}
      ${showCoord ? coordCard(coords) : ''}
      ${myGuides.length ? `<div class="card guides-home"><h3>${icon('book')}${t('home_guides')}</h3><p class="muted small">${t('home_guides_sub')}</p>
        <div class="list">${myGuides.map(g => { const due = g.require_ack && (g.acked_version || 0) < g.version; return `<button class="row" data-hg="${g.id}"><span class="grow"><b>${esc(g.title)}</b><small>${esc(g.summary || '')}</small></span>${due ? `<span class="pill amber">${t('guide_need_ack')}</span>` : `<span class="pill green">${icon('check', 'sm')}</span>`}</button>`; }).join('')}</div>
        <button class="btn small" id="all-guides">${t('home_guides_all')}</button></div>` : ''}
      ${me.status === 'newcomer' && ob ? `<button class="card firstday-mini" id="go-fd"><small>${t('first_day')}</small><b>${esc(fDateLong(ob.first_day))}, ${esc(ob.start_time || '')}</b><span>${esc(ob.place || '')}</span><em>${t('open_details')} →</em></button>` : ''}
      ${myTasks.length ? `<h2 class="sec">${t('my_tasks')} <span class="count">${myTasks.length}</span></h2><div class="stack">${myTasks.map(taskCard).join('')}</div>` : ''}
      ${openPolls.length ? `<h2 class="sec">${t('polls')} <span class="count">${openPolls.length}</span></h2><div class="stack">${openPolls.map(pollCard).join('')}</div>` : ''}
      <h2 class="sec">${t('announcements')}</h2>
      <div class="stack">${anns.length ? anns.map(a => annCard(a, stats[a.id])).join('') : `<div class="empty">${t('no_announcements')}</div>`}</div>
      ${donePolls.length ? `<h2 class="sec">${t('polls_done')}</h2><div class="stack">${donePolls.map(pollCard).join('')}</div>` : ''}`;
    $$('[data-hg]', v).forEach(b => b.onclick = () => { ST.tab = 'library'; ST.libSeg = 'guides'; ST.guide = b.dataset.hg; ST.guideOrig = false; render(); });
    const ag = $('#all-guides', v); if (ag) ag.onclick = () => { ST.tab = 'library'; ST.libSeg = 'guides'; ST.guide = null; render(); };
    const fd = $('#go-fd', v); if (fd) fd.onclick = () => { ST.tab = 'firstday'; render(); };
    $$('[data-ann]', v).forEach(c => c.onclick = async () => {
      c.classList.toggle('open');
      if (c.classList.contains('unread')) { c.classList.remove('unread'); await guard(() => ST.api.markRead(c.dataset.ann)); updateBadges(); }
    });
    $$('[data-done]', v).forEach(b => b.onclick = async () => { await guard(() => ST.api.completeTask(b.dataset.done)); toast(t('task_done_toast'), 'good'); render(); });
    $$('[data-vote]', v).forEach(f => f.onsubmit = async e => {
      e.preventDefault(); const sel = $('input:checked', f); if (!sel) return toast(t('choose_option'));
      const ok = await guard(async () => { await ST.api.vote(f.dataset.vote, Number(sel.value)); return true; });
      if (ok) { toast(t('vote_thanks'), 'good'); render(); }
    });
    $$('[data-results]', v).forEach(b => b.onclick = () => showResults(b.dataset.results, polls.find(p => p.id === b.dataset.results)));
  }
  function annCard(a, st) {
    const unread = !a.read && a.author_id !== ST.me.id;
    return `<article class="card ann ${unread ? 'unread' : ''}" data-ann="${a.id}" tabindex="0">
      <div class="meta"><span class="scope">${icon('megaphone')}${esc(scopeLabel(a))}</span><time>${esc(fAgo(a.created_at))}</time></div>
      <h3>${esc(a.title)}</h3><p class="body">${esc(a.body)}</p>
      <div class="foot"><span>${esc(a.author_name || '')}</span>${st ? `<span class="reads">${t('reads', { n: st.reads, total: st.audience })}</span>` : ''}</div></article>`;
  }
  function taskCard(x) {
    const late = x.due_date && x.due_date < new Date().toISOString().slice(0, 10);
    return `<article class="card task"><div class="meta"><span class="scope">${icon('task')}${t('task')}</span>${x.due_date ? `<span class="pill ${late ? 'red' : ''}">${t('due')} ${esc(fDate(x.due_date))}</span>` : ''}</div>
      <h3>${esc(x.title)}</h3>${x.body ? `<p class="body open">${esc(x.body)}</p>` : ''}
      <div class="foot"><span>${esc(x.author_name || '')}</span><button class="btn small primary" data-done="${x.id}">${icon('check')}${t('mark_done')}</button></div></article>`;
  }
  function pollCard(p) {
    const canRes = AL.can.pollResults(ST.me, p);
    const voting = !p.voted && p.author_id !== ST.me.id;
    return `<article class="card poll"><div class="meta"><span class="scope">${icon('poll')}${p.anonymous ? t('poll_anon') : t('poll_named')}</span><time>${esc(fAgo(p.created_at))}</time></div>
      <h3>${esc(p.question)}</h3>
      ${voting ? `<form data-vote="${p.id}" class="opts">${p.options.map((o, i) => `<label class="opt"><input type="radio" name="o-${p.id}" value="${i}"><span>${esc(o)}</span></label>`).join('')}
        <button class="btn primary small">${t('vote')}</button>${p.anonymous ? `<p class="muted small">${t('poll_anon_hint')}</p>` : ''}</form>`
        : `<p class="muted">${p.author_id === ST.me.id ? t('poll_yours') : t('poll_voted')}</p>`}
      ${canRes ? `<div class="foot"><span>${esc(p.author_name || '')}</span><button class="btn small" data-results="${p.id}">${icon('chart')}${t('results')}</button></div>` : ''}</article>`;
  }
  async function showResults(id, p) {
    const r = await guard(() => ST.api.pollResults(id)); if (!r) return;
    const max = r.counts ? Math.max(1, ...r.counts) : 1;
    openSheet(`<h2>${esc(p.question)}</h2><p class="muted">${t('votes_total', { n: r.total })}${p.anonymous ? ' · ' + t('poll_anon') : ''}</p>
      ${r.hidden ? `<div class="card warn">${t('results_hidden')}</div>` : `<div class="bars">${p.options.map((o, i) => `<div class="bar-row"><span class="bl">${esc(o)}</span><span class="bt"><i style="width:${(r.counts[i] / max) * 100}%"></i></span><b>${r.counts[i]}</b></div>`).join('')}</div>`}`);
  }
  function pickOnboarding(list) {
    const me = ST.me;
    return list.find(o => o.project_id === me.project_id && o.department_id === me.department_id) ||
      list.find(o => o.project_id === me.project_id && !o.department_id) || null;
  }

  // ---------- перший день ----------
  async function renderFirstDay(v) {
    const ob = pickOnboarding(await ST.api.onboarding());
    v.innerHTML = `${header(t('first_day'), place(ST.me))}
      ${ob ? `<div class="card firstday">
        <div class="fd-date"><small>${t('date')}</small><b>${esc(fDateLong(ob.first_day))}</b></div>
        <div class="fd-time"><small>${t('start_time')}</small><b>${esc(ob.start_time || '—')}</b></div>
        <div class="fd-row"><small>${t('place')}</small><p>${esc(ob.place || '—')}</p></div>
        <div class="fd-row"><small>${t('instructions')}</small><p class="pre">${esc(ob.instructions || '—')}</p></div>
        <div class="fd-row"><small>${t('contact')}</small><p class="selectable">${esc(ob.contact || '—')}</p></div></div>`
        : `<div class="empty">${t('first_day_empty')}</div>`}
      <div class="card calm"><h3>${t('newcomer_q_title')}</h3><p>${t('newcomer_q_text')}</p>
      <button class="btn primary" id="ask">${icon('newcomer_question')}${t('ask_question')}</button></div>`;
    $('#ask', v).onclick = () => openNewRequest('newcomer_question');
  }

  // ---------- заявки ----------
  const statusPill = s => `<span class="pill st-${s}">${esc(t('status_' + s))}</span>`;
  function reqCard(r, staffView) {
    const who = r.anonymous ? t('anonymous') : (r.author_name || t('former_employee'));
    return `<button class="card req" data-req="${r.id}">
      <span class="cat cat-${r.category}">${icon(r.category)}</span>
      <span class="grow"><span class="meta"><b>${esc(t('cat_' + r.category))}${r.complaint_target ? ' · ' + esc(t('target_' + r.complaint_target)) : ''}</b>${statusPill(r.status)}</span>
      ${staffView ? `<small class="who">${esc(who)} · ${esc(place(r))}</small>` : ''}
      ${r.date_from ? `<small class="dates">${esc(range(r.date_from, r.date_to))}</small>` : ''}
      <span class="excerpt">${esc(r.body)}</span><small class="when">${esc(fAgo(r.created_at))}</small></span></button>`;
  }

  async function renderRequests(v) {
    const me = ST.me;
    const [reqs, next] = await Promise.all([ST.api.requests(), ST.api.nextAllowedAt()]);
    const staff = AL.can.inbox(me);
    ST.reqSeg = ST.reqSeg || (staff ? 'inbox' : 'mine');
    if (!staff) ST.reqSeg = 'mine';
    const limited = next && next > new Date();
    const f = ST.reqFilter || 'new';
    const cat = ST.reqCat || '';
    let list = ST.reqSeg === 'mine' ? reqs.mine : reqs.visible;
    const counts = { new: 0, in_progress: 0, need_info: 0, closed: 0 };
    reqs.visible.forEach(r => counts[r.status]++);
    if (ST.reqSeg === 'inbox') list = list.filter(r => (f === 'all' || r.status === f) && (!cat || r.category === cat));
    v.innerHTML = `${header(t('tab_requests'), staff ? t('requests_sub_staff') : t('requests_sub'))}
      ${blockBanner()}
      ${staff ? `<div class="seg"><button class="${ST.reqSeg === 'inbox' ? 'on' : ''}" data-seg="inbox">${t('inbox')} ${counts.new ? `<b class="badge in">${counts.new}</b>` : ''}</button><button class="${ST.reqSeg === 'mine' ? 'on' : ''}" data-seg="mine">${t('my_requests')}</button></div>` : ''}
      ${ST.reqSeg === 'mine' ? `
        ${limited ? `<div class="banner info">${icon('lock')}<span>${t('limit_banner', { time: fTime(next) })}</span></div>` : ''}
        ${AL.blockOf(me) !== 'readonly' ? `<button class="btn primary wide" id="new-req">${icon('plus')}${t('new_request')}</button>` : ''}
        <div class="stack">${list.length ? list.map(r => reqCard(r, false)).join('') : `<div class="empty">${t('no_requests')}</div>`}</div>`
      : `<div class="chips">${['new', 'in_progress', 'need_info', 'closed', 'all'].map(s => `<button class="chip ${f === s ? 'on' : ''}" data-f="${s}">${t(s === 'all' ? 'all' : 'status_' + s)}${s !== 'all' && counts[s] ? ` <b>${counts[s]}</b>` : ''}</button>`).join('')}</div>
        <select id="catf" aria-label="${t('category')}"><option value="">${t('all_categories')}</option>${AL.CATEGORIES.map(c => `<option value="${c}" ${cat === c ? 'selected' : ''}>${t('cat_' + c)}</option>`).join('')}</select>
        <div class="stack">${list.length ? list.map(r => reqCard(r, true)).join('') : `<div class="empty">${t('inbox_empty')}</div>`}</div>`}`;
    $$('[data-seg]', v).forEach(b => b.onclick = () => { ST.reqSeg = b.dataset.seg; render(); });
    $$('[data-f]', v).forEach(b => b.onclick = () => { ST.reqFilter = b.dataset.f; render(); });
    const cf = $('#catf', v); if (cf) cf.onchange = () => { ST.reqCat = cf.value; render(); };
    const nb = $('#new-req', v); if (nb) nb.onclick = () => openNewRequest();
    $$('[data-req]', v).forEach(b => b.onclick = () => { ST.detail = b.dataset.req; render(); });
  }

  async function openNewRequest(preset) {
    const me = ST.me;
    const next = await guard(() => ST.api.nextAllowedAt());
    const limited = next && next > new Date();
    const cats = AL.CATEGORIES.filter(c => c !== 'newcomer_question' || me.status === 'newcomer');
    const st = { category: preset || null, target: null, anonymous: false };
    const disabled = c => (limited && !AL.NO_LIMIT.includes(c)) || (c === 'complaint' && AL.blockOf(me) === 'complaints');

    function step1() {
      return `<h2>${t('new_request')}</h2>
        <div class="notice">${icon('flag')}<div><b>${t('limit_title')}</b><p>${t('limit_text')}</p>${limited ? `<p class="strong">${t('limit_banner', { time: fTime(next) })}</p>` : ''}</div></div>
        <p class="muted">${t('choose_topic')}</p>
        <div class="cats">${cats.map(c => `<button class="catbtn" data-cat="${c}" ${disabled(c) ? 'disabled' : ''}><span class="cat cat-${c}">${icon(c)}</span><span>${t('cat_' + c)}</span>${disabled(c) ? icon('lock', 'sm') : ''}</button>`).join('')}</div>`;
    }
    function whoSees() {
      const roles = AL.audienceRoles(st.category, st.target);
      return roles.length ? t('who_sees', { roles: roles.map(r => t('role_' + r)).concat(t('admins')).join(', ') }) : t('who_sees_admin_only');
    }
    function step2() {
      const c = st.category, leave = AL.LEAVE.includes(c);
      return `<button class="link back-link" id="b1">${icon('back')}${t('change_topic')}</button>
        <h2><span class="cat cat-${c} inline">${icon(c)}</span>${t('cat_' + c)}</h2>
        <form id="f-req" class="form">
          ${leave ? `<div class="two"><div><label for="df">${c === 'day_off' ? t('date') : t('date_from')}</label><input id="df" type="date" required></div>
            ${c !== 'day_off' ? `<div><label for="dt">${t('date_to')}</label><input id="dt" type="date" required></div>` : ''}</div>` : ''}
          ${c === 'sick' ? `<p class="muted small">${t('sick_hint')}</p>` : ''}
          ${c === 'complaint' ? `<label>${t('complaint_about')}</label><div class="chips" id="tg">${['leader', 'manager', 'coordinator', 'housing', 'other'].map(x => `<button type="button" class="chip ${st.target === x ? 'on' : ''}" data-tg="${x}">${t('target_' + x)}</button>`).join('')}</div>
            <label class="switch"><input type="checkbox" id="anon" ${st.anonymous ? 'checked' : ''}><span>${t('anonymous_send')}</span></label>
            <p class="muted small" id="anon-hint" ${st.anonymous ? '' : 'hidden'}>${t('anonymous_hint')}</p>` : ''}
          <label for="body">${t('describe')}</label>
          <textarea id="body" rows="5" required maxlength="1500" placeholder="${t('describe_ph_' + c)}"></textarea>
          <p class="muted small" id="who">${c === 'complaint' && !st.target ? '' : esc(whoSees())}</p>
          <button class="btn primary wide">${t('next')}</button></form>`;
    }
    function step3(data) {
      return `<h2>${t('confirm_title')}</h2>
        <div class="card calm"><b>${t('cat_' + st.category)}${st.target ? ' · ' + t('target_' + st.target) : ''}</b>
        ${data.date_from ? `<p>${esc(range(data.date_from, data.date_to))}</p>` : ''}<p class="pre">${esc(data.body)}</p>
        ${data.anonymous ? `<p class="muted">${t('anonymous')}</p>` : ''}</div>
        ${!AL.NO_LIMIT.includes(st.category) && me.status !== 'newcomer' ? `<div class="notice">${icon('lock')}<p>${t('confirm_limit')}</p></div>` : ''}
        <div class="two"><button class="btn" id="edit">${t('edit')}</button><button class="btn primary" id="send">${t('send')}</button></div>`;
    }
    openSheet('<div id="nr"></div>', el => {
      const box = $('#nr', el); let draft = null;
      const show1 = () => { box.innerHTML = step1(); $$('[data-cat]', box).forEach(b => b.onclick = () => { st.category = b.dataset.cat; st.target = null; show2(); }); };
      const show2 = () => {
        box.innerHTML = step2();
        $('#b1', box).onclick = show1;
        if (draft) { $('#body', box).value = draft.body; if ($('#df', box)) $('#df', box).value = draft.date_from || ''; if ($('#dt', box)) $('#dt', box).value = draft.date_to || ''; }
        $$('[data-tg]', box).forEach(b => b.onclick = () => { st.target = b.dataset.tg; $$('[data-tg]', box).forEach(x => x.classList.toggle('on', x === b)); $('#who', box).textContent = whoSees(); });
        const an = $('#anon', box); if (an) an.onchange = () => { st.anonymous = an.checked; $('#anon-hint', box).hidden = !an.checked; };
        $('#f-req', box).onsubmit = e => {
          e.preventDefault();
          if (st.category === 'complaint' && !st.target) return toast(t('choose_target'));
          const df = $('#df', box) && $('#df', box).value, dt = $('#dt', box) ? $('#dt', box).value : df;
          if (df && dt && dt < df) return toast(t('err_dates'));
          draft = { category: st.category, complaint_target: st.target, anonymous: st.category === 'complaint' && st.anonymous, date_from: df || null, date_to: dt || null, body: $('#body', box).value.trim() };
          show3();
        };
      };
      const show3 = () => {
        box.innerHTML = step3(draft);
        $('#edit', box).onclick = show2;
        $('#send', box).onclick = async () => {
          $('#send', box).disabled = true;
          const ok = await guard(async () => { await ST.api.createRequest(draft); return true; });
          if (ok) { closeSheet(); toast(t('request_sent'), 'good'); ST.tab = 'requests'; ST.reqSeg = 'mine'; render(); } else $('#send', box).disabled = false;
        };
      };
      st.category ? show2() : show1();
    });
  }

  async function renderRequestDetail(v, id) {
    const d = await ST.api.requestDetail(id);
    const r = d.request, me = ST.me, owner = r.is_owner;
    const who = r.anonymous ? t('anonymous') : (r.author_name || t('former_employee'));
    const canReply = owner ? (r.status !== 'closed' && !['full', 'readonly'].includes(AL.blockOf(me))) : true;
    v.innerHTML = `${header(t('cat_' + r.category) + (r.complaint_target ? ' · ' + t('target_' + r.complaint_target) : ''), fDate(r.created_at) + ' ' + fTime(r.created_at), true)}
      <div class="card detail">
        <div class="meta">${statusPill(r.status)}${r.anonymous ? `<span class="pill">${t('anonymous')}</span>` : ''}</div>
        ${!owner ? `<p class="who"><b>${esc(who)}</b><br><small>${esc(place(r))}</small></p>` : ''}
        ${r.date_from ? `<p class="dates">${icon('day_off')}${esc(range(r.date_from, r.date_to))}</p>` : ''}
        <p class="pre">${esc(r.body)}</p></div>
      <h2 class="sec">${t('conversation')}</h2>
      <div class="thread">${d.messages.length ? d.messages.map(m => `<div class="msg ${m.from_owner ? 'from-owner' : 'from-staff'} ${(m.author_id && m.author_id === me.id) || (owner && m.from_owner) ? 'mine' : ''}">
        <small>${esc(m.from_owner ? (r.anonymous ? t('anonymous') : (m.author_name || t('former_employee'))) : (m.author_name || ''))} · ${esc(fAgo(m.created_at))}</small><p class="pre">${esc(m.body)}</p></div>`).join('') : `<p class="muted">${owner ? t('no_reply_yet') : t('no_messages')}</p>`}</div>
      ${canReply ? `<form id="f-msg" class="reply"><label for="msg" class="vh-only">${t('reply')}</label><textarea id="msg" rows="2" maxlength="1500" placeholder="${owner ? t('reply_owner_ph') : t('reply_staff_ph')}" required></textarea><button class="btn primary">${t('send')}</button></form>
        ${owner ? `<p class="muted small">${t('reply_no_limit')}</p>` : ''}` : (owner && r.status === 'closed' ? `<p class="muted">${t('closed_note')}</p>` : '')}
      ${!owner ? `<h2 class="sec">${t('change_status')}</h2><div class="chips">${['in_progress', 'need_info', 'closed'].map(s => `<button class="chip ${r.status === s ? 'on' : ''}" data-st="${s}">${t('status_' + s)}</button>`).join('')}</div>` : ''}`;
    bindBack(v);
    const f = $('#f-msg', v);
    if (f) f.onsubmit = async e => { e.preventDefault(); const ok = await guard(async () => { await ST.api.addMessage(id, $('#msg', v).value); return true; }); if (ok) render(); };
    $$('[data-st]', v).forEach(b => b.onclick = async () => { const ok = await guard(async () => { await ST.api.setStatus(id, b.dataset.st); return true; }); if (ok) { toast(t('status_changed'), 'good'); render(); } });
  }

  // ---------- створення: оголошення / опитування / завдання ----------
  function scopeOptions(me) {
    if (me.role === 'leader') return ['group'];
    const s = ['project', 'department', 'group'];
    if (AL.isGlobal(me)) s.unshift('all');
    return s;
  }
  function targetProjects(me) { return AL.isGlobal(me) ? ST.struct.projects : ST.struct.projects.filter(p => AL.myProjects(me).includes(p.id)); }
  function audienceFields(prefix) {
    const me = ST.me;
    if (me.role === 'leader') return `<div class="card calm small">${t('audience')}: <b>${esc(dName(me.department_id))} · ${esc(gName(me.group_id))}</b></div>`;
    const projs = targetProjects(me);
    return `<label for="${prefix}-scope">${t('audience')}</label>
      <select id="${prefix}-scope">${scopeOptions(me).map(s => `<option value="${s}">${t('scope_' + s)}</option>`).join('')}</select>
      <div class="two" id="${prefix}-where">
        <div data-w="p"><label for="${prefix}-p">${t('project')}</label><select id="${prefix}-p">${projs.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
        <div data-w="d"><label for="${prefix}-d">${t('department')}</label><select id="${prefix}-d"></select></div>
        <div data-w="g"><label for="${prefix}-g">${t('group')}</label><select id="${prefix}-g"></select></div></div>`;
  }
  function bindAudience(el, prefix) {
    const me = ST.me;
    if (me.role === 'leader') return () => ({ scope: 'group', group_id: me.group_id });
    const sc = $(`#${prefix}-scope`, el), p = $(`#${prefix}-p`, el), d = $(`#${prefix}-d`, el), g = $(`#${prefix}-g`, el);
    function fill() {
      const deps = ST.struct.departments.filter(x => x.project_id === p.value);
      if (!deps.some(x => x.id === d.value)) d.innerHTML = deps.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
      const gs = ST.struct.groups.filter(x => x.department_id === d.value);
      if (!gs.some(x => x.id === g.value)) g.innerHTML = gs.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
      const s = sc.value;
      $(`[data-w="p"]`, el).hidden = s === 'all';
      $(`[data-w="d"]`, el).hidden = !['department', 'group'].includes(s);
      $(`[data-w="g"]`, el).hidden = s !== 'group';
    }
    [sc, p].forEach(x => x.onchange = () => { d.innerHTML = ''; g.innerHTML = ''; fill(); });
    d.onchange = () => { g.innerHTML = ''; fill(); };
    fill();
    return () => ({ scope: sc.value, project_id: sc.value === 'all' ? null : p.value, department_id: ['department', 'group'].includes(sc.value) ? d.value : null, group_id: sc.value === 'group' ? g.value : null });
  }

  async function renderCreate(v) {
    const me = ST.me;
    const segs = [];
    if (AL.can.post(me)) segs.push('announcement', 'poll');
    if (AL.can.task(me)) segs.push('task');
    if (!segs.includes(ST.createSeg)) ST.createSeg = segs[0];
    const seg = ST.createSeg;
    let users = [], tasks = [];
    if (seg === 'task') { [users, tasks] = await Promise.all([ST.api.users(), ST.api.tasks()]); }
    v.innerHTML = `${header(t('tab_create'))}
      <div class="seg">${segs.map(s => `<button class="${seg === s ? 'on' : ''}" data-cs="${s}">${t('create_' + s)}</button>`).join('')}</div>
      ${seg === 'announcement' ? `<form id="f-ann" class="card form">${audienceFields('a')}
        <label for="a-title">${t('title')}</label><input id="a-title" required maxlength="120" placeholder="${t('ann_title_ph')}">
        <label for="a-body">${t('text')}</label><textarea id="a-body" rows="5" required maxlength="3000" placeholder="${t('ann_body_ph')}"></textarea>
        <button class="btn primary wide">${icon('megaphone')}${t('publish')}</button></form>` : ''}
      ${seg === 'poll' ? `<form id="f-poll" class="card form">${audienceFields('p')}
        <label for="p-q">${t('question')}</label><input id="p-q" required maxlength="200" placeholder="${t('poll_q_ph')}">
        <label>${t('options')}</label><div id="p-opts">${[0, 1, 2].map(i => `<input class="opt-in" maxlength="80" placeholder="${t('option')} ${i + 1}" aria-label="${t('option')} ${i + 1}">`).join('')}</div>
        <button type="button" class="btn small ghost" id="p-add">${icon('plus')}${t('add_option')}</button>
        <label class="switch"><input type="checkbox" id="p-anon" checked><span>${t('poll_anon')}</span></label>
        <p class="muted small">${t('poll_anon_rule')}</p>
        <button class="btn primary wide">${icon('poll')}${t('publish')}</button></form>` : ''}
      ${seg === 'task' ? `<form id="f-task" class="card form">
        <label for="t-who">${t('assignee')}</label><select id="t-who" required>${users.filter(u => u.id !== me.id).sort((a, b) => a.full_name.localeCompare(b.full_name)).map(u => `<option value="${u.id}" ${ST.prefill === u.id ? 'selected' : ''}>${esc(u.full_name)} — ${esc(gName(u.group_id) || pName(u.project_id))}</option>`).join('')}</select>
        <label for="t-title">${t('title')}</label><input id="t-title" required maxlength="120" placeholder="${t('task_title_ph')}">
        <label for="t-body">${t('text')}</label><textarea id="t-body" rows="3" maxlength="1500"></textarea>
        <label for="t-due">${t('due')}</label><input id="t-due" type="date">
        <button class="btn primary wide">${icon('task')}${t('assign')}</button></form>
        <h2 class="sec">${t('assigned_by_me')}</h2><div class="stack">${tasks.filter(x => x.author_id === me.id).map(x => `<div class="card row-card"><span class="grow"><b>${esc(x.title)}</b><small>${esc(x.assignee_name || t('former_employee'))}${x.due_date ? ' · ' + t('due') + ' ' + esc(fDate(x.due_date)) : ''}</small></span><span class="pill ${x.status === 'done' ? 'green' : ''}">${t('task_' + x.status)}</span></div>`).join('') || `<div class="empty">${t('no_tasks')}</div>`}</div>` : ''}`;
    ST.prefill = null;
    $$('[data-cs]', v).forEach(b => b.onclick = () => { ST.createSeg = b.dataset.cs; render(); });
    if (seg === 'announcement') {
      const aud = bindAudience(v, 'a');
      $('#f-ann', v).onsubmit = async e => {
        e.preventDefault();
        const ok = await guard(async () => { await ST.api.createAnnouncement({ ...aud(), title: $('#a-title', v).value, body: $('#a-body', v).value }); return true; });
        if (ok) { toast(t('published'), 'good'); ST.tab = 'home'; render(); }
      };
    }
    if (seg === 'poll') {
      const aud = bindAudience(v, 'p');
      $('#p-add', v).onclick = () => { const n = $$('.opt-in', v).length; if (n >= 6) return; $('#p-opts', v).insertAdjacentHTML('beforeend', `<input class="opt-in" maxlength="80" placeholder="${t('option')} ${n + 1}" aria-label="${t('option')} ${n + 1}">`); };
      $('#f-poll', v).onsubmit = async e => {
        e.preventDefault();
        const options = $$('.opt-in', v).map(x => x.value.trim()).filter(Boolean);
        if (options.length < 2) return toast(t('min_two_options'));
        const ok = await guard(async () => { await ST.api.createPoll({ ...aud(), question: $('#p-q', v).value, options, anonymous: $('#p-anon', v).checked }); return true; });
        if (ok) { toast(t('published'), 'good'); ST.tab = 'home'; render(); }
      };
    }
    if (seg === 'task') {
      $('#f-task', v).onsubmit = async e => {
        e.preventDefault();
        const ok = await guard(async () => { await ST.api.createTask({ assignee_id: $('#t-who', v).value, title: $('#t-title', v).value, body: $('#t-body', v).value, due_date: $('#t-due', v).value || null }); return true; });
        if (ok) { toast(t('task_assigned'), 'good'); render(); }
      };
    }
  }

  // ---------- люди ----------
  async function renderPeople(v) {
    const me = ST.me;
    const users = await ST.api.users();
    const q = (ST.peopleQ || '').toLowerCase(), f = ST.peopleF || 'all', pf = ST.peopleP || '';
    const projs = targetProjects(me);
    const list = users.filter(u => u.id !== me.id)
      .filter(u => !q || u.full_name.toLowerCase().includes(q) || (u.phone || '').includes(q) || (u.email || '').toLowerCase().includes(q))
      .filter(u => f === 'all' || (f === 'newcomer' && u.status === 'newcomer') || (f === 'blocked' && AL.blockOf(u) !== 'none') || (f === 'staff' && u.role !== 'worker'))
      .filter(u => !pf || u.project_id === pf)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    v.innerHTML = `${header(t('tab_people'), t('people_count', { n: list.length }))}
      <div class="searchbar"><input id="pq" type="search" placeholder="${t('search_people')}" value="${esc(ST.peopleQ || '')}" aria-label="${t('search_people')}">
      ${projs.length > 1 ? `<select id="pp" aria-label="${t('project')}"><option value="">${t('all_projects')}</option>${projs.map(p => `<option value="${p.id}" ${pf === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}</div>
      <div class="chips">${['all', 'newcomer', 'blocked', 'staff'].map(x => `<button class="chip ${f === x ? 'on' : ''}" data-pf="${x}">${t('pf_' + x)}</button>`).join('')}</div>
      <div class="list">${list.map(u => `<button class="row" data-p="${u.id}"><span class="av ${u.role !== 'worker' ? 'staff' : ''}">${esc(initials(u.full_name))}</span>
        <span class="grow"><b>${esc(u.full_name)}</b><small>${esc(t('role_' + u.role))} · ${esc(place(u) || '—')}</small></span>
        ${u.status === 'newcomer' ? `<span class="pill amber">${t('newcomer')}</span>` : ''}${AL.blockOf(u) !== 'none' ? `<span class="pill red">${icon('lock', 'sm')}</span>` : ''}</button>`).join('') || `<div class="empty">${t('nobody')}</div>`}</div>`;
    const pq = $('#pq', v); pq.oninput = () => { ST.peopleQ = pq.value; clearTimeout(pq.t); pq.t = setTimeout(() => { render().then(() => { const x = $('#pq'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); }, 250); };
    const pp = $('#pp', v); if (pp) pp.onchange = () => { ST.peopleP = pp.value; render(); };
    $$('[data-pf]', v).forEach(b => b.onclick = () => { ST.peopleF = b.dataset.pf; render(); });
    $$('[data-p]', v).forEach(b => b.onclick = () => openPerson(users.find(u => u.id === b.dataset.p)));
  }

  function openPerson(u) {
    const me = ST.me, blk = AL.blockOf(u);
    const admin = AL.canAdminUser(me, u), dismiss = AL.canDismiss(me, u), activate = AL.canMarkActive(me, u), task = AL.can.task(me) && AL.canViewUser(me, u);
    openSheet(`<div class="person"><span class="av lg ${u.role !== 'worker' ? 'staff' : ''}">${esc(initials(u.full_name))}</span><div><h2>${esc(u.full_name)}</h2><p class="muted">${esc(t('role_' + u.role))}${u.position ? ' · ' + esc(u.position) : ''}</p></div></div>
      <dl class="kv"><dt>${t('phone')}</dt><dd class="selectable">${esc(u.phone || '—')}</dd><dt>${t('email')}</dt><dd class="selectable">${esc(u.email || '—')}</dd>
      <dt>${t('workplace')}</dt><dd>${esc(place(u) || '—')}</dd><dt>${t('work_function')}</dt><dd>${u.work_function ? esc(t('fn_' + u.work_function)) : '—'}</dd><dt>${t('status')}</dt><dd>${u.status === 'newcomer' ? t('newcomer') : t('working')}</dd>
      ${blk !== 'none' ? `<dt>${t('block')}</dt><dd class="bad">${t('block_' + blk)}${u.blocked_until ? ' · ' + t('until_date', { date: fDate(u.blocked_until) }) : ''}<br><small>${esc(u.block_reason || '')}</small></dd>` : ''}</dl>
      <div class="actions">
        ${activate ? `<button class="btn" id="act">${icon('check')}${t('mark_started')}</button>` : ''}
        ${task ? `<button class="btn" id="tsk">${icon('task')}${t('give_task')}</button>` : ''}
        ${me.role === 'superadmin' && u.id !== me.id ? `<button class="btn" id="imp">${icon('eye')}${t('imp_as')}</button>` : ''}
        ${AL.canPersonalDocs(me, u, false) ? `<button class="btn" id="docs">${icon('folder')}${t('docs_person_btn')}</button>` : ''}
        ${admin ? `<button class="btn" id="edit">${icon('tree')}${t('edit_role')}</button>` : ''}
        ${admin ? (blk !== 'none' ? `<button class="btn" id="unb">${icon('lock')}${t('unblock')}</button>` : `<button class="btn" id="blk">${icon('lock')}${t('block_user')}</button>`) : ''}
        ${dismiss ? `<button class="btn danger" id="dis">${t('dismiss')}</button>` : ''}
      </div><div id="pform"></div>`, el => {
      const pf = $('#pform', el);
      const b = id => $('#' + id, el);
      if (b('act')) b('act').onclick = async () => { const ok = await guard(async () => { await ST.api.updateUser(u.id, { role: u.role, project_id: u.project_id, department_id: u.department_id, group_id: u.group_id, position: u.position, status: 'active' }); return true; }); if (ok) { closeSheet(); toast(t('saved'), 'good'); render(); } };
      if (b('tsk')) b('tsk').onclick = () => { closeSheet(); ST.prefill = u.id; ST.createSeg = 'task'; ST.tab = 'create'; render(); };
      if (b('imp')) b('imp').onclick = () => AL.impersonate(u.email, u.id, u.full_name);
      if (b('docs')) b('docs').onclick = () => { closeSheet(); ST.docBackTab = ST.tab; ST.tab = 'library'; ST.libSeg = 'docs'; ST.folder = null; ST.guide = null; ST.docPerson = u.id; render(); };
      if (b('unb')) b('unb').onclick = async () => { const ok = await guard(async () => { await ST.api.blockUser(u.id, 'none', null, t('unblocked_reason')); return true; }); if (ok) { closeSheet(); toast(t('unblocked'), 'good'); render(); } };
      if (b('blk')) b('blk').onclick = () => {
        pf.innerHTML = `<form id="f-blk" class="form card calm"><h3>${t('block_user')}</h3>
          <label for="bl">${t('block_level')}</label><select id="bl">${['readonly', 'complaints', 'full'].map(x => `<option value="${x}">${t('block_' + x)}</option>`).join('')}</select>
          <p class="muted small" id="bl-h">${t('block_h_readonly')}</p>
          <label for="bd">${t('duration')}</label><select id="bd"><option value="1">${t('d_24h')}</option><option value="7">${t('d_7d')}</option><option value="30">${t('d_30d')}</option><option value="0">${t('d_forever')}</option></select>
          <label for="br">${t('reason')}</label><input id="br" required maxlength="200" placeholder="${t('reason_ph')}">
          <button class="btn primary">${t('block_user')}</button></form>`;
        $('#bl', pf).onchange = () => { $('#bl-h', pf).textContent = t('block_h_' + $('#bl', pf).value); };
        $('#f-blk', pf).onsubmit = async e => {
          e.preventDefault(); const days = Number($('#bd', pf).value);
          const ok = await guard(async () => { await ST.api.blockUser(u.id, $('#bl', pf).value, days ? new Date(Date.now() + days * 864e5).toISOString() : null, $('#br', pf).value); return true; });
          if (ok) { closeSheet(); toast(t('blocked_toast'), 'good'); render(); }
        };
        pf.scrollIntoView({ behavior: 'smooth' });
      };
      if (b('edit')) b('edit').onclick = () => {
        const projs = targetProjects(me);
        pf.innerHTML = `<form id="f-ed" class="form card calm"><h3>${t('edit_role')}</h3>
          <label for="er">${t('role')}</label><select id="er">${AL.assignableRoles(me).map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select>
          <label for="ep">${t('project')}</label><select id="ep"><option value="">—</option>${projs.map(p => `<option value="${p.id}" ${u.project_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
          ${AL.isGlobal(me) ? `<fieldset class="checks" id="esp"><legend>${t('acc_staff_projects')}</legend>${ST.struct.projects.map(p => `<label class="switch"><input type="checkbox" value="${p.id}" ${(u.staff_projects || []).includes(p.id) ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}</fieldset>` : ''}
          <label for="ed">${t('department')}</label><select id="ed"></select>
          <label for="eg">${t('group')}</label><select id="eg"></select>
          <label for="efn">${t('work_function')}</label><select id="efn"><option value="">—</option>${AL.FUNCTIONS.map(f => `<option value="${f}" ${u.work_function === f ? 'selected' : ''}>${t('fn_' + f)}</option>`).join('')}</select>
          <label for="epos">${t('position')}</label><input id="epos" value="${esc(u.position || '')}">
          <label for="es">${t('status')}</label><select id="es"><option value="newcomer" ${u.status === 'newcomer' ? 'selected' : ''}>${t('newcomer')}</option><option value="active" ${u.status === 'active' ? 'selected' : ''}>${t('working')}</option></select>
          <button class="btn primary">${t('save')}</button></form>`;
        const ep = $('#ep', pf), ed = $('#ed', pf), eg = $('#eg', pf);
        const fillD = () => { ed.innerHTML = `<option value="">—</option>` + ST.struct.departments.filter(d => d.project_id === ep.value).map(d => `<option value="${d.id}" ${u.department_id === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join(''); fillG(); };
        const fillG = () => { eg.innerHTML = `<option value="">—</option>` + ST.struct.groups.filter(g => g.department_id === ed.value).map(g => `<option value="${g.id}" ${u.group_id === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join(''); };
        ep.onchange = fillD; ed.onchange = fillG; fillD();
        const esp = $('#esp', pf), er = $('#er', pf);
        const syncSp = () => { if (esp) esp.hidden = !['coordinator', 'hr', 'admin_project'].includes(er.value); };
        er.addEventListener('change', syncSp); syncSp();
        $('#f-ed', pf).onsubmit = async e => {
          e.preventDefault();
          const ok = await guard(async () => { await ST.api.updateUser(u.id, { role: $('#er', pf).value, project_id: ep.value || null, department_id: ed.value || null, group_id: eg.value || null, position: $('#epos', pf).value, status: $('#es', pf).value }); if (($('#efn', pf).value || null) !== (u.work_function || null)) await ST.api.setUserFunction(u.id, $('#efn', pf).value || null);
            if (esp && !esp.hidden) { const ids = [...esp.querySelectorAll('input:checked')].map(x => x.value); if (ep.value && !ids.includes(ep.value)) ids.push(ep.value); await ST.api.setStaffProjects(u.id, ids); }
            return true; });
          if (ok) { closeSheet(); toast(t('saved'), 'good'); render(); }
        };
        pf.scrollIntoView({ behavior: 'smooth' });
      };
      if (b('dis')) b('dis').onclick = () => {
        pf.innerHTML = `<form id="f-dis" class="form card danger-zone"><h3>${t('dismiss')}: ${esc(u.full_name)}</h3>
          <p>${t('dismiss_warn')}</p>
          <label for="dr">${t('reason')}</label><input id="dr" required maxlength="200" placeholder="${t('dismiss_reason_ph')}">
          <label class="switch"><input type="checkbox" id="dc" required><span>${t('dismiss_confirm')}</span></label>
          <button class="btn danger wide">${t('dismiss_do')}</button></form>`;
        $('#f-dis', pf).onsubmit = async e => {
          e.preventDefault();
          const ok = await guard(async () => { await ST.api.dismissUser(u.id, $('#dr', pf).value); return true; });
          if (ok) { closeSheet(); toast(t('dismissed_toast', { name: u.full_name }), 'good'); render(); }
        };
        pf.scrollIntoView({ behavior: 'smooth' });
      };
    });
  }

  // ---------- меню «Ще» ----------
  function renderMore(v) {
    const me = ST.me;
    const items = [
      AL.can.analytics(me) && ['analytics', 'chart'],
      AL.can.onboarding(me) && ['onboarding', 'flag'],
      AL.can.invites(me) && ['invites', 'key'],
      AL.can.structure(me) && ['structure', 'tree'],
      AL.isGlobal(me) && ['accounts', 'people'],
      AL.can.audit(me) && ['audit', 'log'],
      ['profile', 'user'],
    ].filter(Boolean);
    v.innerHTML = `${header(t('tab_more'))}<div class="list menu">${items.map(([id, ic]) => `<button class="row" data-go="${id}">${icon(ic)}<span class="grow"><b>${t('menu_' + id)}</b><small>${t('menu_' + id + '_sub')}</small></span></button>`).join('')}</div>`;
    $$('[data-go]', v).forEach(b => b.onclick = () => { ST.tab = b.dataset.go; render(); });
  }

  // ---------- профіль ----------
  function renderProfile(v) {
    const me = ST.me;
    v.innerHTML = `${header(t('menu_profile'), null, !['worker', 'partner'].includes(me.role))}
      <div class="person"><span class="av lg">${esc(initials(me.full_name))}</span><div><h2>${esc(me.full_name)}</h2><p class="muted">${esc(t('role_' + me.role))}${me.position ? ' · ' + esc(me.position) : ''}</p></div></div>
      <dl class="kv"><dt>${t('phone')}</dt><dd>${esc(me.phone || '—')}</dd><dt>${t('email')}</dt><dd>${esc(me.email || '—')}</dd><dt>${t('workplace')}</dt><dd>${esc(place(me) || '—')}</dd>${me.work_function ? `<dt>${t('work_function')}</dt><dd>${esc(t('fn_' + me.work_function))}</dd>` : ''}</dl>
      <button class="card row-card" id="my-docs">${icon('folder')}<span class="grow"><b>${t('docs_mine')}</b><small>${t('docs_mine_sub')}</small></span></button>
      <div id="prof-coord"></div>
      ${companyCard(true)}
      <h2 class="sec">${t('account_id')}</h2><div class="copyrow"><input id="myid" readonly class="mono" value="${esc(me.id)}" aria-label="${t('account_id')}"><button class="btn" id="cpid">${icon('copy')}${t('copy')}</button></div>
      <p class="muted small">${t('account_id_hint')}</p>
      <h2 class="sec">${t('language')}</h2>${langChips('lc')}
      <h2 class="sec">${t('privacy')}</h2><p class="muted">${t('privacy_text')}</p>
      <button class="btn wide" id="lo">${t('logout')}</button>`;
    bindLang(v); bindBack(v, 'more');
    $('#lo', v).onclick = logout;
    if (cabinetOf(me) === 'worker' || me.role === 'leader') ST.api.myCoordinators().then(l => { const el = $('#prof-coord', v); if (el) el.innerHTML = coordCard(l); }).catch(() => { });
    $('#my-docs', v).onclick = () => { ST.tab = 'library'; ST.libSeg = 'docs'; ST.docPerson = me.id; render(); };
    $('#cpid', v).onclick = () => { const i = $('#myid', v); if (navigator.clipboard) navigator.clipboard.writeText(me.id).then(() => toast(t('copied'), 'good')).catch(() => { i.select(); toast(t('copy_manual')); }); else { i.select(); toast(t('copy_manual')); } };
  }
  async function logout() { await ST.api.signOut(); ST.me = null; ST.tab = 'home'; ST.detail = null; ST.cabinet = null; try { localStorage.removeItem('alimat-cabinet'); } catch (e) { /* */ } render(); }

  // ---------- аналітика ----------
  async function renderAnalytics(v) {
    const me = ST.me;
    const projs = targetProjects(me);
    if (ST.anP === undefined) ST.anP = AL.isGlobal(me) ? '' : (projs[0] && projs[0].id);
    const a = await ST.api.analytics(ST.anP || null);
    const cats = AL.CATEGORIES.map(c => [c, a.requests.by_category[c] || 0]);
    const max = Math.max(1, ...cats.map(x => x[1]));
    const stt = ['new', 'in_progress', 'need_info', 'closed'].map(s => [s, a.requests.by_status[s] || 0]);
    const tot = Math.max(1, a.requests.total);
    v.innerHTML = `${header(t('menu_analytics'), null, true)}
      <select id="anp" aria-label="${t('project')}">${AL.isGlobal(me) ? `<option value="">${t('all_projects')}</option>` : ''}${projs.map(p => `<option value="${p.id}" ${ST.anP === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <div class="kpis">
        <div class="kpi"><small>${t('k_people')}</small><b>${a.users.total}</b><span>${t('k_newcomers', { n: a.users.newcomers })}</span></div>
        <div class="kpi"><small>${t('k_open')}</small><b>${a.requests.open}</b><span>${t('k_week', { n: a.requests.last7 })}</span></div>
        <div class="kpi"><small>${t('k_response')}</small><b>${a.requests.avg_response_h == null ? '—' : a.requests.avg_response_h + ' ' + t('h')}</b><span>${t('k_response_sub')}</span></div>
        <div class="kpi"><small>${t('k_blocked')}</small><b>${a.users.blocked}</b><span>${t('k_ann', { n: a.announcements.total })}</span></div>
      </div>
      <h2 class="sec">${t('by_category')}</h2>
      <div class="card bars">${cats.map(([c, n]) => `<div class="bar-row"><span class="bl"><span class="cat cat-${c} sm">${icon(c)}</span>${t('cat_' + c)}</span><span class="bt"><i class="cat-fill-${c}" style="width:${n / max * 100}%"></i></span><b>${n}</b></div>`).join('')}</div>
      <h2 class="sec">${t('by_status')}</h2>
      <div class="card"><div class="stackbar">${stt.map(([s, n]) => n ? `<i class="st-${s}" style="flex:${n}" title="${t('status_' + s)}: ${n}"></i>` : '').join('')}</div>
      <div class="legend">${stt.map(([s, n]) => `<span><i class="dot st-${s}"></i>${t('status_' + s)} <b>${n}</b> <small>${Math.round(n / tot * 100)}%</small></span>`).join('')}</div></div>
      <p class="muted small">${t('analytics_note')}</p>`;
    bindBack(v, 'more');
    $('#anp', v).onchange = e => { ST.anP = e.target.value; render(); };
  }

  // ---------- налаштування першого дня ----------
  async function renderOnboardingAdmin(v) {
    const me = ST.me, projs = targetProjects(me);
    const list = await ST.api.onboarding();
    v.innerHTML = `${header(t('menu_onboarding'), t('menu_onboarding_sub'), true)}
      <form id="f-ob" class="card form">
        <div class="two"><div><label for="op">${t('project')}</label><select id="op">${projs.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
        <div><label for="od">${t('department')}</label><select id="od"></select></div></div>
        <div class="two"><div><label for="ofd">${t('date')}</label><input id="ofd" type="date" required></div><div><label for="ot">${t('start_time')}</label><input id="ot" type="time" required></div></div>
        <label for="opl">${t('place')}</label><input id="opl" required maxlength="200">
        <label for="oin">${t('instructions')}</label><textarea id="oin" rows="5" maxlength="3000"></textarea>
        <label for="oc">${t('contact')}</label><input id="oc" maxlength="200">
        <button class="btn primary wide">${t('save')}</button></form>
      <h2 class="sec">${t('saved_entries')}</h2>
      <div class="stack">${list.map(o => `<button class="card row-card" data-ob="${o.id}"><span class="grow"><b>${esc(pName(o.project_id))}${o.department_id ? ' · ' + esc(dName(o.department_id)) : ' · ' + t('whole_project')}</b><small>${esc(fDateLong(o.first_day))}, ${esc(o.start_time || '')}</small></span>${icon('back', 'flip')}</button>`).join('') || `<div class="empty">—</div>`}</div>`;
    bindBack(v, 'more');
    const op = $('#op', v), od = $('#od', v);
    const fillD = sel => { od.innerHTML = `<option value="">${t('whole_project')}</option>` + ST.struct.departments.filter(d => d.project_id === op.value).map(d => `<option value="${d.id}" ${sel === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join(''); };
    const load = o => { op.value = o.project_id; fillD(o.department_id); $('#ofd', v).value = o.first_day || ''; $('#ot', v).value = o.start_time || ''; $('#opl', v).value = o.place || ''; $('#oin', v).value = o.instructions || ''; $('#oc', v).value = o.contact || ''; };
    op.onchange = () => fillD(); fillD();
    $$('[data-ob]', v).forEach(b => b.onclick = () => { load(list.find(o => o.id === b.dataset.ob)); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#f-ob', v).onsubmit = async e => {
      e.preventDefault();
      const ok = await guard(async () => { await ST.api.saveOnboarding({ project_id: op.value, department_id: od.value || null, first_day: $('#ofd', v).value, start_time: $('#ot', v).value, place: $('#opl', v).value, instructions: $('#oin', v).value, contact: $('#oc', v).value }); return true; });
      if (ok) { toast(t('saved'), 'good'); render(); }
    };
  }

  // ---------- запрошення ----------
  function inviteLink(code) {
    if (ST.api.mode === 'demo') return 'https://app.alimatgroup.com/?invite=' + code;
    return location.origin + location.pathname + '?invite=' + code;
  }
  async function renderInvites(v) {
    const me = ST.me, projs = targetProjects(me);
    const list = await ST.api.invites();
    v.innerHTML = `${header(t('menu_invites'), t('menu_invites_sub'), true)}
      <form id="f-iv" class="card form">
        <div class="two"><div><label for="ip">${t('project')}</label><select id="ip">${projs.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
        <div><label for="id">${t('department')}</label><select id="id"></select></div></div>
        <div class="two"><div><label for="ig">${t('group')}</label><select id="ig"></select></div>
        <div><label for="ir">${t('role')}</label><select id="ir">${AL.inviteRoles(me).map(r => `<option value="${r}">${t('role_' + r)}</option>`).join('')}</select></div></div>
        <label for="ifn">${t('work_function')}</label><select id="ifn"><option value="">${t('fn_auto')}</option>${AL.FUNCTIONS.map(f => `<option value="${f}">${t('fn_' + f)}</option>`).join('')}</select>
        <label for="ipos">${t('position')}</label><input id="ipos" placeholder="Pracownik produkcji">
        <div class="two"><div><label for="imax">${t('max_uses')}</label><input id="imax" type="number" min="1" value="100"></div>
        <div><label for="idays">${t('valid_days')}</label><input id="idays" type="number" min="1" value="30"></div></div>
        <label class="switch"><input type="checkbox" id="inew" checked><span>${t('invite_newcomer')}</span></label>
        <button class="btn primary wide">${icon('key')}${t('create_invite')}</button></form>
      <div id="iv-out"></div>
      <h2 class="sec">${t('active_invites')}</h2>
      <div class="stack">${list.map(i => `<div class="card row-card"><span class="grow"><b class="mono">${esc(i.code)}</b><small>${esc(place(i))} · ${esc(t('role_' + i.role))}${i.work_function ? ' · ' + esc(t('fn_' + i.work_function)) : ''}</small><small>${t('used_of', { n: i.uses, max: i.max_uses })}${i.expires_at ? ' · ' + t('until_date', { date: fDate(i.expires_at) }) : ''}</small></span><button class="btn small" data-show="${esc(i.code)}">${t('show')}</button></div>`).join('') || `<div class="empty">—</div>`}</div>`;
    bindBack(v, 'more');
    const ip = $('#ip', v), idd = $('#id', v), ig = $('#ig', v);
    const fillD = () => { idd.innerHTML = `<option value="">—</option>` + ST.struct.departments.filter(d => d.project_id === ip.value).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join(''); fillG(); };
    const fillG = () => { ig.innerHTML = `<option value="">—</option>` + ST.struct.groups.filter(g => g.department_id === idd.value).map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join(''); };
    ip.onchange = fillD; idd.onchange = fillG; fillD();
    $$('[data-show]', v).forEach(b => b.onclick = () => showInvite(b.dataset.show));
    $('#f-iv', v).onsubmit = async e => {
      e.preventDefault();
      const code = await guard(() => ST.api.createInvite({ project_id: ip.value, department_id: idd.value || null, group_id: ig.value || null, role: $('#ir', v).value, work_function: $('#ifn', v).value || null, position: $('#ipos', v).value, newcomer: $('#inew', v).checked, max_uses: Number($('#imax', v).value) || 100, days: Number($('#idays', v).value) || null }));
      if (code) { toast(t('invite_created'), 'good'); showInvite(code); }
    };
  }
  function showInvite(code) {
    const link = inviteLink(code);
    openSheet(`<h2>${t('invite_link')}</h2><p class="muted">${t('invite_share')}</p>
      <div class="qr" id="qr"></div><p class="code-big mono">${esc(code)}</p>
      <div class="copyrow"><input id="lnk" readonly value="${esc(link)}" aria-label="${t('invite_link')}"><button class="btn" id="cp">${icon('copy')}${t('copy')}</button></div>
      ${ST.api.mode === 'demo' ? `<p class="muted small">${t('invite_demo_note')}</p>` : ''}`, el => {
      try { if (window.QRCode) new window.QRCode($('#qr', el), { text: link, width: 200, height: 200, colorDark: '#10283b', colorLight: '#ffffff' }); else $('#qr', el).hidden = true; } catch (e) { $('#qr', el).hidden = true; }
      $('#cp', el).onclick = () => {
        const inp = $('#lnk', el);
        if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => toast(t('copied'), 'good')).catch(() => { inp.select(); toast(t('copy_manual')); });
        else { inp.select(); toast(t('copy_manual')); }
      };
    });
  }

  // ---------- структура ----------
  async function renderStructure(v) {
    const me = ST.me;
    ST.struct = await ST.api.structure();
    const projs = targetProjects(me);
    v.innerHTML = `${header(t('menu_structure'), t('menu_structure_sub'), true)}
      ${AL.isGlobal(me) ? `<form id="f-np" class="inline-form"><input id="np" required placeholder="${t('new_project')}" aria-label="${t('new_project')}"><button class="btn">${icon('plus')}</button></form>` : ''}
      ${projs.map(p => `<div class="card tree"><h3>${esc(p.name)}</h3>
        ${ST.struct.departments.filter(d => d.project_id === p.id).map(d => `<div class="dep"><b>${esc(d.name)}</b>
          <div class="grps">${ST.struct.groups.filter(g => g.department_id === d.id).map(g => `<span class="chip static">${esc(g.name)}</span>`).join('')}
          <form class="inline-form small" data-ng="${d.id}"><input required placeholder="${t('new_group')}" aria-label="${t('new_group')}"><button class="btn small">${icon('plus')}</button></form></div></div>`).join('')}
        <form class="inline-form" data-nd="${p.id}"><input required placeholder="${t('new_department')}" aria-label="${t('new_department')}"><button class="btn small">${icon('plus')}</button></form></div>`).join('')}`;
    bindBack(v, 'more');
    const np = $('#f-np', v); if (np) np.onsubmit = async e => { e.preventDefault(); await guard(() => ST.api.createProject($('#np', v).value.trim())); render(); };
    $$('[data-nd]', v).forEach(f => f.onsubmit = async e => { e.preventDefault(); await guard(() => ST.api.createDepartment(f.dataset.nd, $('input', f).value.trim())); render(); });
    $$('[data-ng]', v).forEach(f => f.onsubmit = async e => { e.preventDefault(); await guard(() => ST.api.createGroup(f.dataset.ng, $('input', f).value.trim())); render(); });
  }

  // ---------- журнал ----------
  async function renderAudit(v) {
    const list = await ST.api.audit();
    v.innerHTML = `${header(t('menu_audit'), t('menu_audit_sub'), true)}
      <div class="stack">${list.map(a => `<div class="card row-card audit"><span class="grow"><b>${t('act_' + a.action)}</b>
        <small>${esc(a.actor_name || '—')} · ${esc(fDate(a.created_at))} ${esc(fTime(a.created_at))}</small>
        ${a.details ? `<small>${esc([a.details.name, a.details.level && t('block_' + a.details.level), a.details.role && t('role_' + a.details.role), a.details.code, a.details.reason].filter(Boolean).join(' · '))}</small>` : ''}</span></div>`).join('') || `<div class="empty">—</div>`}</div>`;
    bindBack(v, 'more');
  }

  // ---------- помічники для інших модулів ----------
  AL.LANGS = LANGS;
  AL.impersonate = async (email, id, name) => {
    if (!email && ST.api.mode !== 'demo') return toast(t('err_not_found'), 'bad');
    const ok = await guard(async () => { await ST.api.impersonate(email, id); return true; });
    if (ok) { closeSheet(); ST.tab = 'home'; await boot(); toast(t('imp_done', { name: name || email }), 'good'); }
  };
  AL.ui = { ST, $, $$, esc, t, header, bindBack, openSheet, closeSheet, guard, toast, icon, fDate, fTime, fAgo, render };

  // ---------- старт ----------
  async function boot() {
    ST.me = await ST.api.me();
    ['reqSeg', 'reqFilter', 'reqCat', 'createSeg', 'peopleQ', 'peopleF', 'peopleP', 'anP', 'libSeg', 'guide', 'folder', 'docPerson', 'docBackTab', 'guideOrig'].forEach(k => { delete ST[k]; });
    if (ST.me) {
      const real = cabinetOf(ST.me);
      if (ST.cabinet && real !== ST.cabinet && ST.api.mode !== 'demo') setTimeout(() => toast(t('cab_mismatch', { cab: t('cab_' + real) })), 600);
      ST.cabinet = real; try { localStorage.setItem('alimat-cabinet', real); } catch (e) { /* */ }
      ST.lang = ST.me.lang || ST.lang;
      ST.struct = await ST.api.structure();
      ST.tab = 'home'; ST.detail = null;
    } else {
      ST.struct = ST.api.mode === 'demo' ? await ST.api.structure() : ST.struct;
    }
    await render();
  }

  async function start() {
    try { const l = localStorage.getItem('alimat-lang'); if (l) ST.lang = l; else { const n = (navigator.language || 'pl').slice(0, 2); if (LANGS.some(x => x[0] === n)) ST.lang = n; } } catch (e) { /* */ }
    try { const inv = new URL(location.href).searchParams.get('invite'); if (inv) ST.pendingInvite = inv; } catch (e) { /* */ }
    try { ST.cabinet = localStorage.getItem('alimat-cabinet') || null; } catch (e) { /* */ }
    const cfg = window.ALIMAT_CONFIG || {};
    AL.COMPANY = Object.assign({ name: 'Alimat Group', site: 'https://alimatgroup.com', phone: '+48 517 654 267', whatsapp: '48517654267', phone_companies: '+48 453 194 629', email: 'kontakt@alimatgroup.com' }, cfg.COMPANY || {});
    const live = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase && !cfg.FORCE_DEMO;
    ST.api = live ? AL.liveApi : AL.demoApi;
    await ST.api.init(cfg);
    await boot();
    if (live) setInterval(() => { if (ST.me && !document.hidden) updateBadges(); }, 30000);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
    if ('serviceWorker' in navigator && live) navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  document.addEventListener('DOMContentLoaded', start);
})();
