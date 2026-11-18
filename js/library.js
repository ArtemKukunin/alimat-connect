/* ALIMAT Connect — вкладка «Знання»: «Важливе» (пам'ятки) і «Документи» (база документів з доступами).
   Права перевіряє база (RLS + функції). Тут — лише відображення. */
(function () {
  const AL = window.AL;
  const U = () => AL.ui;
  const DOC_TYPES = ['passport', 'residence_card', 'visa', 'work_permit', 'contract', 'medical', 'sick_leave', 'certificate', 'procedure', 'template', 'other'];
  const PERSONAL_TYPES = ['passport', 'residence_card', 'visa', 'work_permit', 'contract', 'medical', 'sick_leave', 'certificate', 'other'];
  const ACCEPT = '.pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,.xls,.xlsx,.odt,.ods,.txt,.csv';

  // ---------- Markdown → HTML (заголовки, списки, чеклісти, таблиці, жирний/курсив) ----------
  function inline(s) {
    const esc = U().esc;
    let h = esc(s).replace(/\\([\\`*_{}\[\]()#+\-.!|])/g, '$1');
    h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    return h;
  }
  function splitRow(l) {
    const cells = []; let cur = '';
    const s = l.trim().replace(/^\|/, '').replace(/\|$/, '');
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
      if (s[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
      cur += s[i];
    }
    cells.push(cur.trim());
    return cells;
  }
  const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  function md(src) {
    const L = String(src || '').replace(/\r/g, '').split('\n');
    const out = [];
    let i = 0;
    const isBlockStart = l => /^#{1,4}\s/.test(l) || /^\s*\|/.test(l) || LIST_RE.test(l);
    while (i < L.length) {
      const l = L[i];
      if (!l.trim()) { i++; continue; }
      let m = l.match(/^(#{1,4})\s+(.*)$/);
      if (m) { const lv = Math.min(m[1].length + 1, 4); out.push(`<h${lv}>${inline(m[2])}</h${lv}>`); i++; continue; }
      if (/^\s*\|/.test(l)) {
        const rows = [];
        while (i < L.length && /^\s*\|/.test(L[i])) { rows.push(L[i]); i++; }
        const [head, ...rest] = rows.filter(r => !/^\s*\|[\s:|-]+\|?\s*$/.test(r)).map(splitRow);
        out.push(`<div class="md-table"><table><thead><tr>${(head || []).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      if (LIST_RE.test(l)) {
        const items = [];
        while (i < L.length) {
          if (!L[i].trim()) {
            let k = i; while (k < L.length && !L[k].trim()) k++;
            if (k < L.length && LIST_RE.test(L[k])) { i = k; continue; }
            break;
          }
          const mm = L[i].match(LIST_RE);
          if (!mm) { if (items.length && /^\s{2,}\S/.test(L[i])) { items[items.length - 1].text += ' ' + L[i].trim(); i++; continue; } break; }
          items.push({ lvl: mm[1].length >= 2 ? 1 : 0, ord: /\d/.test(mm[2]), text: mm[3] });
          i++;
        }
        const li = it => {
          const c = it.text.match(/^\[( |x|X)\]\s+(.*)$/);
          return c ? `<li class="chk"><span class="box ${c[1] !== ' ' ? 'on' : ''}" aria-hidden="true"></span><span>${inline(c[2])}</span>` : `<li>${inline(it.text)}`;
        };
        let html = '', open = null, sub = false;
        items.forEach(it => {
          if (it.lvl === 0) {
            if (sub) { html += '</ul>'; sub = false; }
            if (open !== null) html += '</li>';
            if (open === null) { html += it.ord ? '<ol>' : '<ul>'; }
            open = it.ord; html += li(it);
          } else {
            if (!sub) { html += '<ul class="sub">'; sub = true; }
            html += li(it) + '</li>';
          }
        });
        if (sub) html += '</ul>';
        if (open !== null) html += '</li>' + (open ? '</ol>' : '</ul>');
        out.push(html.includes('class="chk"') ? html.replace(/^<(ul|ol)>/, '<$1 class="checklist">') : html);
        continue;
      }
      const para = [];
      while (i < L.length && L[i].trim() && !isBlockStart(L[i])) { para.push(L[i].trim()); i++; }
      out.push(`<p>${inline(para.join(' '))}</p>`);
    }
    return out.join('\n');
  }
  AL.md = md;

  // ---------- допоміжне ----------
  const fSize = b => b == null ? '' : b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  function validPill(d) {
    if (!d) return '';
    const { t, fDate } = U();
    const days = Math.floor((new Date(d + 'T23:59:59') - Date.now()) / 864e5);
    const cls = days < 0 ? 'red' : days <= 30 ? 'amber' : '';
    const ds = new Date(d + 'T12:00:00').getFullYear() !== new Date().getFullYear() ? new Date(d + 'T12:00:00').toLocaleDateString(AL.ui.ST.lang === 'uk' ? 'uk-UA' : undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : fDate(d);
    return `<span class="pill ${cls}">${days < 0 ? t('docs_expired') : t('docs_valid_until', { date: ds })}</span>`;
  }
  function docIcon(mime, name) {
    const n = String(name || '').toLowerCase();
    if (/image/.test(mime || '') || /\.(jpe?g|png|heic|webp)$/.test(n)) return 'image';
    if (/\.(xlsx?|ods|csv)$/.test(n)) return 'sheet';
    return 'file';
  }
  function ask(text, yesLabel, onYes) {
    const { openSheet, closeSheet, esc, t } = U();
    openSheet(`<h2>${esc(text)}</h2><div class="actions"><button class="btn danger" id="yes">${esc(yesLabel)}</button><button class="btn" data-close>${t('cancel')}</button></div>`, el => {
      el.querySelector('#yes').onclick = () => { closeSheet(); onYes(); };
      el.querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet);
    });
  }
  const pendingGuides = list => list.filter(g => g.require_ack && g.published && !g.can_edit && (g.acked_version || 0) < g.version);
  AL.pendingGuides = pendingGuides;

  // ---------- головний екран вкладки ----------
  async function renderLibrary(v) {
    const { ST } = U();
    if (ST.guide) return renderGuide(v, ST.guide);
    if (!ST.libSeg) ST.libSeg = 'guides';
    if (ST.libSeg === 'docs') {
      if (ST.docPerson) return renderPersonDocs(v, ST.docPerson);
      if (ST.folder) return renderFolder(v, ST.folder);
    }
    const { t, header, $$, esc, icon } = U();
    const me = ST.me;
    let body = '';
    if (ST.libSeg === 'guides') {
      const list = await ST.api.guides(ST.lang);
      const pend = pendingGuides(list);
      body = `${pend.length ? `<div class="notice amber">${icon('flag')}<span>${esc(t('guides_pending', { n: pend.length }))}</span></div>` : ''}
        ${AL.can.createGuide(me) ? `<button class="btn small" id="g-new">${icon('plus')}${t('guide_new')}</button>` : ''}
        <div class="stack">${list.map(g => guideCard(g)).join('') || `<div class="empty">${t('guides_empty')}</div>`}</div>`;
    } else {
      const [folders, expiring] = await Promise.all([ST.api.folders(), ST.api.expiring(30)]);
      ST.folders = folders;
      const ids = new Set(folders.map(f => f.id));
      const roots = folders.filter(f => !f.parent_id || !ids.has(f.parent_id));
      body = `<button class="card row-card" id="d-mine"><span class="doc-ic mine">${icon('user')}</span><span class="grow"><b>${t('docs_mine')}</b><small>${t('docs_mine_sub')}</small></span>${icon('back', 'flip')}</button>
        ${expiring.length ? `<h2 class="sec">${t('docs_expiring')}</h2><div class="stack">${expiring.map(d => `<button class="card row-card" data-exp="${d.id}" data-owner="${d.owner_profile_id || ''}" data-folder="${d.folder_id || ''}"><span class="grow"><b>${esc(d.title)}</b><small>${esc(d.owner_name || '')}${d.owner_name ? ' · ' : ''}${t('dt_' + d.doc_type)}</small></span>${validPill(d.valid_until)}</button>`).join('')}</div>` : ''}
        <h2 class="sec">${t('lib_docs')}</h2>
        ${AL.isGlobal(me) ? `<button class="btn small" id="f-new">${icon('plus')}${t('folder_new')}</button>` : ''}
        <div class="list">${roots.map(f => folderRow(f, folders)).join('') || `<div class="empty">${t('folders_empty')}</div>`}</div>`;
    }
    v.innerHTML = `${header(t('tab_library'), t('lib_sub'))}
      <div class="seg">${['guides', 'docs'].map(s => `<button class="${ST.libSeg === s ? 'on' : ''}" data-ls="${s}">${t('lib_' + s)}</button>`).join('')}</div>${body}`;
    $$('[data-ls]', v).forEach(b => b.onclick = () => { ST.libSeg = b.dataset.ls; U().render(); });
    $$('[data-g]', v).forEach(b => b.onclick = () => { ST.guide = b.dataset.g; ST.guideOrig = false; U().render(); });
    const gn = v.querySelector('#g-new'); if (gn) gn.onclick = () => editGuide(null);
    const dm = v.querySelector('#d-mine'); if (dm) dm.onclick = () => { ST.docPerson = me.id; U().render(); };
    $$('[data-f]', v).forEach(b => b.onclick = () => { ST.folder = b.dataset.f; U().render(); });
    $$('[data-exp]', v).forEach(b => b.onclick = () => { if (b.dataset.owner) ST.docPerson = b.dataset.owner; else ST.folder = b.dataset.folder; U().render(); });
    const fnw = v.querySelector('#f-new'); if (fnw) fnw.onclick = () => newFolder(null);
  }

  function guideCard(g) {
    const { t, esc, icon } = U();
    const acked = (g.acked_version || 0) >= g.version;
    const pill = !g.published ? `<span class="pill">${t('guide_draft')}</span>`
      : !g.require_ack || (g.can_edit && !acked) ? '' : acked ? `<span class="pill green">${icon('check', 'sm')}${t('guide_acked')}</span>`
        : `<span class="pill amber">${g.acked_version ? t('guide_new_version') : t('guide_need_ack')}</span>`;
    return `<button class="card row-card" data-g="${g.id}"><span class="doc-ic guide">${icon('book')}</span><span class="grow"><b>${esc(g.title)}</b><small>${esc(g.summary || '')}</small></span>${pill}</button>`;
  }
  function folderRow(f, all) {
    const { esc, icon, t } = U();
    const subs = all.filter(x => x.parent_id === f.id).length;
    return `<button class="row" data-f="${f.id}"><span class="doc-ic folder">${icon('folder')}</span><span class="grow"><b>${esc(f.name)}</b><small>${esc(f.description || '')}${f.description ? ' · ' : ''}${t('folder_count', { d: f.docs, f: subs })}</small></span>${f.can_edit ? `<span class="pill">${t('access_edit_pill')}</span>` : ''}</button>`;
  }

  // ---------- пам'ятка ----------
  async function renderGuide(v, id) {
    const { ST, t, esc, icon, header, fDate, guard, toast } = U();
    const g = await ST.api.guide(id, ST.lang);
    const tr = g.translation && !ST.guideOrig ? g.translation : null;
    const title = tr ? tr.title : g.title;
    const acked = (g.acked_version || 0) >= g.version;
    const trNote = ST.lang !== g.lang && !g.translation ? `<p class="muted small">${t('guide_no_tr')}</p>` : '';
    const trOld = tr && tr.version < g.version ? `<p class="notice amber small">${esc(t('guide_tr_outdated', { n: tr.version }))}</p>` : '';
    v.innerHTML = `${header(title, `${t('guide_version', { n: g.version })} · ${t('guide_updated', { date: fDate(g.updated_at) })}`, true)}
      ${g.translation ? `<button class="btn small ghost" id="g-tog">${icon('globe')}${ST.guideOrig ? t('guide_show_tr') : t('guide_show_orig')} (${esc((ST.guideOrig ? g.translation.lang : g.lang).toUpperCase())})</button>` : ''}
      ${trNote}${trOld}
      ${!g.published ? `<p class="notice">${t('guide_draft')}</p>` : ''}
      <article class="card md">${md(tr ? tr.body_md : g.body_md)}</article>
      ${g.require_ack && g.published ? (acked ? `<div class="notice good">${icon('check')}<span>${esc(t('guide_acked_on', { date: fDate(g.acked_at) }))}</span></div>`
        : `<button class="btn primary wide" id="g-ack">${icon('check')}${t('guide_ack_btn')}</button>`) : ''}
      ${g.can_edit ? `<h2 class="sec">${t('manage')}</h2><div class="actions">
        <button class="btn" id="g-edit">${icon('log')}${t('guide_edit')}</button>
        <button class="btn" id="g-tr">${icon('globe')}${t('guide_translate')}</button>
        <button class="btn" id="g-acc">${icon('lock')}${t('access')}</button>
        <button class="btn" id="g-rep">${icon('people')}${t('guide_report')}</button>
        ${AL.isGlobal(ST.me) ? `<button class="btn danger" id="g-del">${t('guide_delete')}</button>` : ''}</div>` : ''}`;
    const back = v.querySelector('#back'); if (back) back.onclick = () => { ST.guide = null; U().render(); };
    const q = s => v.querySelector(s);
    if (q('#g-tog')) q('#g-tog').onclick = () => { ST.guideOrig = !ST.guideOrig; U().render(); };
    if (q('#g-ack')) q('#g-ack').onclick = async () => { const ok = await guard(async () => { await ST.api.ackGuide(id); return true; }); if (ok) { toast(t('guide_ack_done'), 'good'); U().render(); } };
    if (q('#g-edit')) q('#g-edit').onclick = () => editGuide(g);
    if (q('#g-tr')) q('#g-tr').onclick = () => translateGuide(g);
    if (q('#g-acc')) q('#g-acc').onclick = () => manageAccess('guide', id, g.title);
    if (q('#g-rep')) q('#g-rep').onclick = () => guideReport(id, g.title);
    if (q('#g-del')) q('#g-del').onclick = () => ask(t('guide_delete_confirm'), t('guide_delete'), async () => {
      const ok = await guard(async () => { await ST.api.deleteGuide(id); return true; });
      if (ok) { ST.guide = null; toast(t('saved'), 'good'); U().render(); }
    });
  }

  function editGuide(g) {
    const { ST, t, esc, openSheet, closeSheet, guard, toast } = U();
    openSheet(`<h2>${g ? t('guide_edit') : t('guide_new')}</h2><form id="f-g" class="form">
      <label for="gt">${t('title')}</label><input id="gt" required maxlength="160" value="${esc(g ? g.title : '')}">
      <label for="gs">${t('guide_summary')}</label><input id="gs" maxlength="240" value="${esc(g ? g.summary || '' : '')}">
      <label for="gb">${t('guide_body')}</label><textarea id="gb" rows="14" class="mono-area">${esc(g ? g.body_md : '## \n\n- [ ] ')}</textarea>
      <p class="muted small">${t('guide_body_hint')}</p>
      <label class="switch"><input type="checkbox" id="gra" ${!g || g.require_ack ? 'checked' : ''}><span>${t('guide_require_ack')}</span></label>
      <label class="switch"><input type="checkbox" id="gpu" ${g ? (g.published ? 'checked' : '') : ''}><span>${t('guide_published')}</span></label>
      ${g ? `<label class="switch"><input type="checkbox" id="gnv"><span>${t('guide_bump')}</span></label>` : `<p class="muted small">${t('guide_new_hint')}</p>`}
      <button class="btn primary wide">${t('save')}</button></form>`, el => {
      el.querySelector('#f-g').onsubmit = async e => {
        e.preventDefault();
        const id = await guard(() => ST.api.saveGuide({ id: g && g.id, title: el.querySelector('#gt').value, summary: el.querySelector('#gs').value, body_md: el.querySelector('#gb').value, require_ack: el.querySelector('#gra').checked, published: el.querySelector('#gpu').checked, new_version: !!(el.querySelector('#gnv') && el.querySelector('#gnv').checked), sort: g ? g.sort : 100 }));
        if (id) { closeSheet(); toast(t('saved'), 'good'); ST.guide = id; U().render(); }
      };
    });
  }

  async function translateGuide(g) {
    const { ST, t, esc, openSheet, closeSheet, guard, toast } = U();
    const langs = AL.LANGS.filter(([c]) => c !== g.lang);
    const first = langs.find(([c]) => c === ST.lang) ? ST.lang : langs[0][0];
    openSheet(`<h2>${t('guide_translate')}</h2><form id="f-tr" class="form">
      <label for="tl">${t('guide_tr_lang')}</label><select id="tl">${langs.map(([c, n]) => `<option value="${c}" ${c === first ? 'selected' : ''}>${esc(n)}${(g.translations || []).includes(c) ? ' ✓' : ''}</option>`).join('')}</select>
      <label for="tt">${t('title')}</label><input id="tt" maxlength="160">
      <label for="ts">${t('guide_summary')}</label><input id="ts" maxlength="240">
      <label for="tb">${t('guide_body')}</label><textarea id="tb" rows="14" class="mono-area"></textarea>
      <p class="muted small">${t('guide_tr_hint')}</p>
      <button class="btn primary wide">${t('save')}</button></form>`, el => {
      const sel = el.querySelector('#tl');
      const load = async () => {
        const x = await guard(() => ST.api.guide(g.id, sel.value));
        const tr = x && x.translation;
        el.querySelector('#tt').value = tr ? tr.title : g.title;
        el.querySelector('#ts').value = tr ? tr.summary || '' : g.summary || '';
        el.querySelector('#tb').value = tr ? tr.body_md : '';
        el.querySelector('#tb').placeholder = g.body_md.slice(0, 400);
      };
      sel.onchange = load; load();
      el.querySelector('#f-tr').onsubmit = async e => {
        e.preventDefault();
        const ok = await guard(async () => { await ST.api.saveGuideTranslation(g.id, sel.value, { title: el.querySelector('#tt').value, summary: el.querySelector('#ts').value, body_md: el.querySelector('#tb').value }); return true; });
        if (ok) { closeSheet(); toast(t('saved'), 'good'); U().render(); }
      };
    });
  }

  async function guideReport(id, title) {
    const { ST, t, esc, openSheet, fDate, guard } = U();
    const r = await guard(() => ST.api.guideReport(id));
    if (!r) return;
    const yes = r.people.filter(p => p.acked).length;
    openSheet(`<h2>${t('guide_report')}</h2><p class="muted">${esc(title)} · ${t('guide_version', { n: r.version })}</p>
      <p><b>${esc(t('report_count', { a: yes, b: r.people.length }))}</b></p>
      <div class="list">${r.people.map(p => `<div class="row"><span class="grow"><b>${esc(p.name)}</b><small>${esc(t('role_' + p.role))}</small></span>${p.acked ? `<span class="pill green">${esc(fDate(p.acked_at))}</span>` : `<span class="pill amber">${t('report_pending')}</span>`}</div>`).join('') || `<div class="empty">—</div>`}</div>
      <p class="muted small">${t('report_note')}</p>`);
  }

  // ---------- доступи ----------
  async function manageAccess(type, id, name) {
    const { ST, t, esc, openSheet, guard, toast, icon } = U();
    const grants = await guard(() => ST.api.grants(type, id));
    if (!grants) return;
    const label = g => g.subject_type === 'all' ? t('subj_all') : g.subject_type === 'role' ? t('role_' + g.subject)
      : g.subject_type === 'function' ? t('fn_' + g.subject) : (g.label || g.subject);
    openSheet(`<h2>${esc(t('access_title', { name }))}</h2>
      <p class="muted small">${t(type === 'folder' ? 'access_inherit' : 'access_admins')}</p>
      <div class="list" id="gl">${grants.map(g => `<div class="row"><span class="grow"><small>${t('subj_' + g.subject_type)}</small><b>${esc(label(g))}</b>${g.subject_type === 'user' ? `<small class="mono">${esc(g.subject)}</small>` : ''}</span>
        <span class="pill ${g.can_edit ? 'amber' : ''}">${g.can_edit ? t('access_edit_pill') : t('access_read_pill')}</span>
        <button class="iconbtn" data-rv="${g.id}" aria-label="${t('access_remove')}">×</button></div>`).join('') || `<div class="empty">${t('access_empty')}</div>`}</div>
      <form id="f-gr" class="form card calm"><h3>${t('access_add')}</h3>
        <label for="gst">${t('access_who')}</label>
        <select id="gst">${['all', 'role', 'function', 'project', 'user'].map(s => `<option value="${s}">${t('subj_' + s)}</option>`).join('')}</select>
        <div id="gsv"></div>
        <label class="switch"><input type="checkbox" id="gce"><span>${t(type === 'guide' ? 'access_can_edit_guide' : 'access_can_edit')}</span></label>
        <button class="btn primary">${icon('plus')}${t('access_add')}</button></form>`, el => {
      const st = el.querySelector('#gst'), box = el.querySelector('#gsv');
      const fill = () => {
        const s = st.value;
        box.innerHTML = s === 'all' ? '' : s === 'role' ? `<select id="gsx">${AL.ROLES.map(r => `<option value="${r}">${t('role_' + r)}</option>`).join('')}</select>`
          : s === 'function' ? `<select id="gsx">${AL.FUNCTIONS.map(f => `<option value="${f}">${t('fn_' + f)}</option>`).join('')}</select>`
            : s === 'project' ? `<select id="gsx">${ST.struct.projects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>`
              : `<input id="gsx" type="search" placeholder="${t('user_pick_ph')}" autocomplete="off"><div class="list pick" id="gpk"></div><p class="muted small">${t('user_pick_hint')}</p>`;
        picked = null;
        const x = box.querySelector('#gsx'), pk = box.querySelector('#gpk');
        if (s === 'user') x.oninput = () => {
          picked = null; clearTimeout(x.t);
          x.t = setTimeout(async () => {
            const v = x.value.trim();
            if (/^[0-9a-f-]{36}$/i.test(v)) { picked = v.toLowerCase(); pk.innerHTML = ''; return; }
            const res = v.length < 2 ? [] : await ST.api.findPeople(type, id, v).catch(() => []);
            pk.innerHTML = res.map(u => `<button type="button" class="row" data-pick="${u.id}"><span class="grow"><b>${esc(u.full_name)}</b><small>${esc(t('role_' + u.role))}${u.work_function ? ' · ' + esc(t('fn_' + u.work_function)) : ''}${u.project ? ' · ' + esc(u.project) : ''}</small></span></button>`).join('')
              || (v.length >= 2 ? `<div class="muted small">${t('err_not_found')}</div>` : '');
            pk.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { picked = b.dataset.pick; x.value = b.querySelector('b').textContent; pk.innerHTML = ''; });
          }, 250);
        };
      };
      let picked = null;
      st.onchange = fill; fill();
      el.querySelectorAll('[data-rv]').forEach(b => b.onclick = async () => {
        const ok = await guard(async () => { await ST.api.revoke(b.dataset.rv); return true; });
        if (ok) { toast(t('access_removed'), 'good'); manageAccess(type, id, name); }
      });
      el.querySelector('#f-gr').onsubmit = async e => {
        e.preventDefault();
        const x = el.querySelector('#gsx');
        let val = x ? x.value.trim() : '';
        if (st.value === 'user') {
          if (/^[0-9a-f-]{36}$/i.test(val)) picked = val.toLowerCase();
          if (!picked) return toast(t('user_pick_many'), 'bad');
          val = picked;
        }
        const ok = await guard(async () => { await ST.api.grant(type, id, st.value, val, el.querySelector('#gce').checked); return true; });
        if (ok) { toast(t('access_added'), 'good'); manageAccess(type, id, name); }
      };
    });
  }
  AL.manageAccess = manageAccess;

  // ---------- папка ----------
  async function renderFolder(v, id) {
    const { ST, t, esc, icon, header, $$ } = U();
    const folders = await ST.api.folders();
    ST.folders = folders;
    const f = folders.find(x => x.id === id);
    if (!f) { ST.folder = null; return renderLibrary(v); }
    const docs = await ST.api.documents(id, null);
    const subs = folders.filter(x => x.parent_id === id);
    const crumbs = []; let p = folders.find(x => x.id === f.parent_id);
    while (p) { crumbs.unshift(p); p = folders.find(x => x.id === p.parent_id); }
    v.innerHTML = `${header(f.name, f.description || '', true)}
      ${crumbs.length ? `<div class="crumbs">${crumbs.map(c => `<button class="link" data-f="${c.id}">${esc(c.name)}</button>`).join(' › ')} › <b>${esc(f.name)}</b></div>` : ''}
      ${f.can_edit ? `<div class="actions"><button class="btn primary" id="up">${icon('upload')}${t('doc_upload')}</button><button class="btn" id="nf">${icon('folder')}${t('folder_new')}</button><button class="btn" id="acc">${icon('lock')}${t('access')}</button>${AL.isGlobal(ST.me) && !subs.length && !docs.length ? `<button class="btn danger" id="df">${t('folder_delete')}</button>` : ''}</div>` : ''}
      ${subs.length ? `<div class="list">${subs.map(s => folderRow(s, folders)).join('')}</div>` : ''}
      <div class="stack">${docs.map(docRow).join('') || `<div class="empty">${t('docs_empty')}</div>`}</div>`;
    const back = v.querySelector('#back');
    if (back) back.onclick = () => { ST.folder = f.parent_id && folders.some(x => x.id === f.parent_id) ? f.parent_id : null; U().render(); };
    $$('[data-f]', v).forEach(b => b.onclick = () => { ST.folder = b.dataset.f; U().render(); });
    bindDocs(v, docs, { folder_id: id });
    const q = s => v.querySelector(s);
    if (q('#up')) q('#up').onclick = () => uploadSheet({ folder_id: id }, DOC_TYPES);
    if (q('#nf')) q('#nf').onclick = () => newFolder(id);
    if (q('#acc')) q('#acc').onclick = () => manageAccess('folder', id, f.name);
    if (q('#df')) q('#df').onclick = () => ask(t('folder_delete') + '?', t('folder_delete'), async () => {
      const ok = await U().guard(async () => { await ST.api.deleteFolder(id); return true; });
      if (ok) { ST.folder = f.parent_id || null; U().render(); }
    });
  }

  // ---------- особові документи ----------
  async function renderPersonDocs(v, pid) {
    const { ST, t, header, icon, esc } = U();
    const me = ST.me;
    const own = pid === me.id;
    let person = own ? me : null;
    if (!own) { const us = await ST.api.users(); person = us.find(u => u.id === pid) || { id: pid, full_name: '—' }; }
    const docs = await ST.api.documents(null, pid);
    const canUp = AL.canPersonalDocs(me, person, true);
    v.innerHTML = `${header(own ? t('docs_mine') : t('docs_of', { name: person.full_name }), own ? t('docs_mine_sub') : '', true)}
      ${canUp ? `<div class="actions"><button class="btn primary" id="up">${icon('upload')}${t('doc_upload')}</button></div>` : ''}
      <div class="stack">${docs.map(docRow).join('') || `<div class="empty">${t('docs_empty')}</div>`}</div>
      ${own ? `<p class="muted small">${esc(t('docs_privacy'))}</p>` : ''}`;
    const back = v.querySelector('#back');
    if (back) back.onclick = () => { ST.docPerson = null; if (!own && ST.docBackTab) { ST.tab = ST.docBackTab; ST.docBackTab = null; } U().render(); };
    bindDocs(v, docs, { owner_id: pid });
    const up = v.querySelector('#up'); if (up) up.onclick = () => uploadSheet({ owner_id: pid }, PERSONAL_TYPES);
  }

  function docRow(d) {
    const { t, esc, icon, fDate } = U();
    return `<div class="card row-card doc"><button class="doc-open" data-open="${d.id}"><span class="doc-ic">${icon(docIcon(d.mime, d.file_name))}</span>
      <span class="grow"><b>${esc(d.title)}</b><small>${t('dt_' + d.doc_type)} · ${esc(fSize(d.size_bytes))} · ${esc(fDate(d.created_at))}${d.uploaded_by_name ? ' · ' + esc(d.uploaded_by_name) : ''}</small>${d.note ? `<small>${esc(d.note)}</small>` : ''}</span>
      ${validPill(d.valid_until)}</button>
      <button class="iconbtn" data-more="${d.id}" aria-label="${t('tab_more')}">${icon('more')}</button></div>`;
  }

  function bindDocs(v, docs) {
    const { ST, t, esc, guard, toast, openSheet, closeSheet, icon, fDate, fTime } = U();
    v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openDoc(b.dataset.open));
    v.querySelectorAll('[data-more]').forEach(b => b.onclick = () => {
      const d = docs.find(x => x.id === b.dataset.more);
      openSheet(`<h2>${esc(d.title)}</h2><dl class="kv"><dt>${t('doc_type')}</dt><dd>${t('dt_' + d.doc_type)}</dd><dt>${t('doc_file')}</dt><dd>${esc(d.file_name || '')} · ${esc(fSize(d.size_bytes))}</dd>
        ${d.valid_until ? `<dt>${t('doc_valid')}</dt><dd>${esc(fDate(d.valid_until))}</dd>` : ''}${d.note ? `<dt>${t('doc_note')}</dt><dd>${esc(d.note)}</dd>` : ''}
        <dt>${t('doc_by')}</dt><dd>${esc(d.uploaded_by_name || '—')} · ${esc(fDate(d.created_at))}</dd></dl>
        <div class="actions"><button class="btn primary" id="o">${icon('eye')}${t('doc_open')}</button>
        ${d.can_edit ? `<button class="btn" id="a">${icon('lock')}${t('access')}</button><button class="btn danger" id="x">${t('doc_delete')}</button>` : ''}
        ${AL.isGlobal(ST.me) ? `<button class="btn" id="l">${icon('log')}${t('doc_log')}</button>` : ''}</div><div id="lg"></div>`, el => {
        el.querySelector('#o').onclick = () => openDoc(d.id);
        const a = el.querySelector('#a'); if (a) a.onclick = () => manageAccess('document', d.id, d.title);
        const x = el.querySelector('#x'); if (x) x.onclick = () => ask(t('doc_delete_confirm', { name: d.title }), t('doc_delete'), async () => {
          const ok = await guard(async () => { await ST.api.deleteDocument(d.id); return true; });
          if (ok) { toast(t('doc_deleted'), 'good'); U().render(); }
        });
        const l = el.querySelector('#l'); if (l) l.onclick = async () => {
          const log = await guard(() => ST.api.documentLog(d.id));
          if (log) el.querySelector('#lg').innerHTML = `<h3>${t('doc_log')}</h3><div class="list">${log.map(x => `<div class="row"><span class="grow"><b>${esc(x.name || '—')}</b><small>${t('log_' + x.action)} · ${esc(fDate(x.at))} ${esc(fTime(x.at))}</small></span></div>`).join('') || '<div class="empty">—</div>'}</div>`;
        };
      });
    });
  }

  async function openDoc(id) {
    const { ST, t, toast, guard, openSheet, esc } = U();
    if (ST.api.mode === 'demo') {
      const r = await guard(() => ST.api.openDocument(id, true));
      if (!r) return;
      return openSheet(`<h2>${esc(r.title)}</h2>${r.image ? `<img class="doc-preview" src="${r.url}" alt="">` : `<p class="muted">${esc(r.file_name || '')}</p><p>${t('demo_doc_note')}</p>${r.url ? `<a class="btn" href="${r.url}" target="_blank" rel="noopener">${t('doc_open')}</a>` : ''}`}`);
    }
    const w = window.open('', '_blank');
    const url = await guard(() => ST.api.openDocument(id));
    if (!url) { if (w) w.close(); return; }
    if (w) w.location.href = url; else { toast(t('doc_popup')); location.href = url; }
  }

  function uploadSheet(target, types) {
    const { ST, t, openSheet, closeSheet, guard, toast, icon } = U();
    openSheet(`<h2>${t('doc_upload')}</h2><form id="f-up" class="form">
      <label for="uf">${t('doc_file')}</label><input id="uf" type="file" required accept="${ACCEPT}">
      <p class="muted small">${t('doc_limits')}</p>
      <label for="ut">${t('doc_title')}</label><input id="ut" required maxlength="160">
      <label for="uy">${t('doc_type')}</label><select id="uy">${types.map(x => `<option value="${x}">${t('dt_' + x)}</option>`).join('')}</select>
      <label for="uv">${t('doc_valid')}</label><input id="uv" type="date">
      <label for="un">${t('doc_note')}</label><input id="un" maxlength="300">
      <button class="btn primary wide" id="ub">${icon('upload')}${t('doc_upload')}</button></form>`, el => {
      const f = el.querySelector('#uf'), ti = el.querySelector('#ut');
      if (target.owner_id) el.querySelector('#uy').value = 'passport';
      f.onchange = () => { if (f.files[0] && !ti.value) ti.value = f.files[0].name.replace(/\.[^.]+$/, ''); };
      el.querySelector('#f-up').onsubmit = async e => {
        e.preventDefault();
        const file = f.files[0]; if (!file) return;
        if (file.size > 25 * 1048576) return toast(t('err_too_big'), 'bad');
        const btn = el.querySelector('#ub'); btn.disabled = true; btn.textContent = t('doc_uploading');
        const ok = await guard(async () => { await ST.api.uploadDocument({ ...target, title: ti.value, doc_type: el.querySelector('#uy').value, valid_until: el.querySelector('#uv').value || null, note: el.querySelector('#un').value }, file); return true; });
        if (ok) { closeSheet(); toast(t('doc_uploaded'), 'good'); U().render(); } else { btn.disabled = false; btn.textContent = t('doc_upload'); }
      };
    });
  }

  function newFolder(parent) {
    const { ST, t, openSheet, closeSheet, guard, toast } = U();
    openSheet(`<h2>${t('folder_new')}</h2><form id="f-nf" class="form">
      <label for="fn">${t('folder_name')}</label><input id="fn" required maxlength="120">
      <label for="fd">${t('folder_desc')}</label><input id="fd" maxlength="240">
      <p class="muted small">${t(parent ? 'folder_inherit' : 'folder_root_hint')}</p>
      <button class="btn primary wide">${t('save')}</button></form>`, el => {
      el.querySelector('#f-nf').onsubmit = async e => {
        e.preventDefault();
        const id = await guard(() => ST.api.createFolder(parent, el.querySelector('#fn').value, el.querySelector('#fd').value));
        if (id) { closeSheet(); toast(t('folder_created'), 'good'); ST.libSeg = 'docs'; ST.folder = id; U().render(); }
      };
    });
  }

  AL.screens = Object.assign(AL.screens || {}, { library: renderLibrary });
})();
