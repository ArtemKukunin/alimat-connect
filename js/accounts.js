/* ALIMAT Connect — «Акаунти команди»: підготовлені акаунти (вхід за email без коду запрошення).
   Доступно адміністраторам компанії; змінювати — суперадміну й адміну всіх проектів. */
(function () {
  const AL = window.AL;
  const U = () => AL.ui;

  async function renderAccounts(v) {
    const { ST, t, esc, icon, header, fDate, $$ } = U();
    const list = await ST.api.preparedAccounts();
    const q = (ST.accQ || '').toLowerCase(), f = ST.accF || 'all';
    const pn = id => (ST.struct.projects.find(p => p.id === id) || {}).name || '';
    const rows = list.filter(a => f === 'all' || (f === 'waiting' ? !a.claimed : a.claimed))
      .filter(a => !q || a.full_name.toLowerCase().includes(q) || a.emails.some(e => e.includes(q)) || (a.position || '').toLowerCase().includes(q));
    const claimed = list.filter(a => a.claimed).length;
    v.innerHTML = `${header(t('menu_accounts'), t('acc_count', { a: claimed, b: list.length }), true)}
      <p class="muted small">${t('acc_lead')}</p>
      <div class="searchbar"><input id="aq" type="search" placeholder="${t('acc_search')}" value="${esc(ST.accQ || '')}" aria-label="${t('acc_search')}"></div>
      <div class="chips">${['all', 'waiting', 'claimed'].map(x => `<button class="chip ${f === x ? 'on' : ''}" data-af="${x}">${t('acc_f_' + x)}</button>`).join('')}</div>
      <button class="btn small" id="acc-new">${icon('plus')}${t('acc_new')}</button>
      <div class="list">${rows.map(a => `<button class="row" data-acc="${a.id}"><span class="av ${a.role !== 'worker' ? 'staff' : ''}">${esc(a.full_name.split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase())}</span>
        <span class="grow"><b>${esc(a.full_name)}</b><small>${esc(t('role_' + a.role))}${a.work_function ? ' · ' + esc(t('fn_' + a.work_function)) : ''} · ${esc([pn(a.project_id), ...(a.staff_projects || []).filter(x => x !== a.project_id).map(pn)].filter(Boolean).join(', ') || '—')}</small><small class="mono-sm">${esc(a.emails.join(', '))}</small></span>
        ${a.claimed ? `<span class="pill green">${icon('check', 'sm')}${esc(fDate(a.claimed_at))}</span>` : `<span class="pill">${t('acc_waiting')}</span>`}</button>`).join('') || `<div class="empty">${t('nobody')}</div>`}</div>`;
    const back = v.querySelector('#back'); if (back) back.onclick = () => { ST.tab = 'more'; U().render(); };
    const aq = v.querySelector('#aq');
    aq.oninput = () => { ST.accQ = aq.value; clearTimeout(aq.t); aq.t = setTimeout(() => U().render().then(() => { const x = document.querySelector('#aq'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }), 250); };
    $$('[data-af]', v).forEach(b => b.onclick = () => { ST.accF = b.dataset.af; U().render(); });
    v.querySelector('#acc-new').onclick = () => editAccount(null);
    $$('[data-acc]', v).forEach(b => b.onclick = () => editAccount(list.find(a => a.id === b.dataset.acc)));
  }

  function editAccount(a) {
    const { ST, t, esc, openSheet, closeSheet, guard, toast, fDate } = U();
    const me = ST.me;
    if (a && a.claimed) {
      return openSheet(`<h2>${esc(a.full_name)}</h2><p class="muted">${esc(t('acc_claimed_note', { date: fDate(a.claimed_at) }))}</p>
        <div class="actions"><button class="btn primary" id="go-people">${t('tab_people')}</button>${me.role === 'superadmin' ? `<button class="btn" id="imp">${t('imp_as')}</button>` : ''}</div>`, el => {
        const ib = el.querySelector('#imp'); if (ib) ib.onclick = () => AL.impersonate(a.emails[0], null, a.full_name);
        el.querySelector('#go-people').onclick = () => { closeSheet(); ST.peopleQ = a.full_name; ST.tab = 'people'; U().render(); };
      });
    }
    const roles = AL.ROLES.filter(r => r !== 'superadmin' || me.role === 'superadmin');
    const projs = ST.struct.projects;
    const sp = new Set((a && a.staff_projects) || []);
    openSheet(`<h2>${a ? t('acc_edit') : t('acc_new')}</h2><form id="f-acc" class="form">
      <label for="an">${t('full_name')}</label><input id="an" required maxlength="120" value="${esc(a ? a.full_name : '')}">
      <label for="ae">${t('acc_emails')}</label><input id="ae" required value="${esc(a ? a.emails.join(', ') : '')}" placeholder="imie.nazwisko@alimatgroup.com">
      <p class="muted small">${t('acc_emails_hint')}</p>
      <label for="ap">${t('phone')}</label><input id="ap" value="${esc(a ? a.phone || '' : '')}" placeholder="+48 …">
      <div class="two"><div><label for="ar">${t('role')}</label><select id="ar">${roles.map(r => `<option value="${r}" ${a && a.role === r ? 'selected' : ''}>${t('role_' + r)}</option>`).join('')}</select></div>
      <div><label for="af">${t('work_function')}</label><select id="af"><option value="">—</option>${AL.FUNCTIONS.map(x => `<option value="${x}" ${a && a.work_function === x ? 'selected' : ''}>${t('fn_' + x)}</option>`).join('')}</select></div></div>
      <label for="apos">${t('position')}</label><input id="apos" maxlength="200" value="${esc(a ? a.position || '' : '')}">
      <label for="apr">${t('acc_main_project')}</label><select id="apr"><option value="">—</option>${projs.map(p => `<option value="${p.id}" ${a && a.project_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
      <fieldset class="checks" id="asp"><legend>${t('acc_staff_projects')}</legend>${projs.map(p => `<label class="switch"><input type="checkbox" value="${p.id}" ${sp.has(p.id) ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}</fieldset>
      <button class="btn primary wide">${t('save')}</button>
      ${a && me.role === 'superadmin' ? `<button type="button" class="btn wide" id="aimp">${t('imp_as')}</button>` : ''}
      ${a ? `<button type="button" class="btn danger wide" id="adel">${t('acc_delete')}</button>` : ''}</form>`, el => {
      const role = el.querySelector('#ar'), box = el.querySelector('#asp');
      const sync = () => { box.hidden = !['coordinator', 'hr', 'admin_project'].includes(role.value); };
      role.onchange = sync; sync();
      el.querySelector('#f-acc').onsubmit = async e => {
        e.preventDefault();
        const o = { id: a && a.id, full_name: el.querySelector('#an').value, emails: el.querySelector('#ae').value.split(/[,;\s]+/).filter(Boolean),
          phone: el.querySelector('#ap').value.trim() || null, role: role.value, work_function: el.querySelector('#af').value || null,
          position: el.querySelector('#apos').value, project_id: el.querySelector('#apr').value || null,
          staff_projects: box.hidden ? [] : [...box.querySelectorAll('input:checked')].map(x => x.value) };
        const ok = await guard(async () => { await ST.api.savePrepared(o); return true; });
        if (ok) { closeSheet(); toast(t('saved'), 'good'); U().render(); }
      };
      const ai = el.querySelector('#aimp'); if (ai) ai.onclick = () => AL.impersonate(a.emails[0], null, a.full_name);
      const d = el.querySelector('#adel'); if (d) d.onclick = async () => {
        const ok = await guard(async () => { await ST.api.deletePrepared(a.id); return true; });
        if (ok) { closeSheet(); toast(t('saved'), 'good'); U().render(); }
      };
    });
  }

  AL.screens = Object.assign(AL.screens || {}, { accounts: renderAccounts });
})();
