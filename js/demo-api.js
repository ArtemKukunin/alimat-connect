/* Демо-сервер: працює в браузері на тестових даних, повторює правила бази даних. */
(function () {
  const AL = window.AL;
  const KEY = 'alimat-demo-v4';
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const now = () => new Date().toISOString();
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const day = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

  class ApiError extends Error { constructor(code, extra) { super(code); this.code = code; this.extra = extra; } }
  AL.ApiError = ApiError;

  function seed() {
    const P1 = 'p-animex', P2 = 'p-konskowola';
    const D1 = 'd-uboj', D2 = 'd-rozbior', D3 = 'd-pakowanie';
    const G1 = 'g-uboj-a', G2 = 'g-uboj-b', G3 = 'g-rozbior-a', G4 = 'g-pak-a';
    const u = (id, full_name, role, o = {}) => Object.assign({
      id, full_name, role, status: 'active', email: id.replace('u-', '') + '@example.com', phone: '+48 5' + String(Math.abs(hash(id))).slice(0, 2) + ' ' + String(Math.abs(hash(id + 'x'))).slice(0, 3) + ' ' + String(Math.abs(hash(id + 'y'))).slice(0, 3),
      position: null, project_id: null, department_id: null, group_id: null, lang: 'uk', block_level: 'none', blocked_until: null,
      block_reason: null, staff_projects: [], created_at: ago(24 * 40),
    }, o);
    const users = [
      u('u-olena', 'Олена Кравець', 'superadmin', { position: 'Офіс · директор з персоналу' }),
      u('u-marek', 'Marek Nowak', 'admin_global', { position: 'Biuro · administrator', lang: 'pl' }),
      u('u-kasia', 'Katarzyna Wiśniewska', 'admin_project', { project_id: P1, staff_projects: [P1], position: 'Administrator projektu', lang: 'pl' }),
      u('u-andrii', 'Андрій Мельник', 'coordinator', { project_id: P1, staff_projects: [P1, P2], position: 'Координатор' }),
      u('u-aga', 'Agnieszka Zając', 'hr', { project_id: P1, staff_projects: [P1, P2], position: 'Kadry', lang: 'pl' }),
      u('u-tomasz', 'Tomasz Lewandowski', 'manager', { project_id: P1, position: 'Kierownik produkcji', lang: 'pl' }),
      u('u-ivan', 'Іван Бондар', 'leader', { project_id: P1, department_id: D1, group_id: G1, position: 'Лідер зміни A' }),
      u('u-serhii', 'Сергій Ткаченко', 'worker', { project_id: P1, department_id: D1, group_id: G1, position: 'Pracownik produkcji' }),
      u('u-ram', 'Ram Bahadur Thapa', 'worker', { project_id: P1, department_id: D1, group_id: G1, position: 'Pracownik produkcji', lang: 'ne' }),
      u('u-dmytro', 'Дмитро Савчук', 'worker', { project_id: P1, department_id: D1, group_id: G1, position: 'Pracownik produkcji', lang: 'ru' }),
      u('u-maria', 'María González', 'worker', { project_id: P1, department_id: D1, group_id: G2, position: 'Pracownik produkcji', lang: 'es' }),
      u('u-ion', 'Ion Popescu', 'worker', { project_id: P1, department_id: D2, group_id: G3, position: 'Operator', lang: 'ro' }),
      u('u-sita', 'Sita Gurung', 'worker', { status: 'newcomer', project_id: P1, department_id: D1, group_id: G1, position: 'Pracownik produkcji', lang: 'ne', created_at: ago(20) }),
      u('u-carlos', 'Carlos Rivera', 'worker', { status: 'newcomer', project_id: P1, department_id: D2, group_id: G3, position: 'Pracownik produkcji', lang: 'es', created_at: ago(30) }),
      u('u-oleh', 'Олег Іваненко', 'worker', { project_id: P2, department_id: D3, group_id: G4, position: 'Pakowacz' }),
      u('u-nazar', 'Назар Гнатюк', 'worker', { project_id: P1, department_id: D1, group_id: G2, position: 'Pracownik produkcji', block_level: 'complaints', blocked_until: new Date(Date.now() + 5 * 864e5).toISOString(), block_reason: '12 однакових скарг за день' }),
      u('u-natalia', 'Natalia Kowalczyk', 'worker', { project_id: P1, position: 'Rekruter', lang: 'pl', work_function: 'recruitment' }),
      u('u-ewa', 'Ewa Mazur', 'worker', { project_id: P1, position: 'Pracownik biurowy', lang: 'pl', work_function: 'office' }),
      u('u-joanna', 'Joanna Wójcik', 'worker', { project_id: P1, position: 'Dział prawny', lang: 'pl', work_function: 'legal' }),
      u('u-viktor', 'Віктор Шевчук', 'partner', { project_id: P1, position: 'Pośrednik' }),
    ];
    const FN = { 'u-andrii': 'coordination', 'u-aga': 'hr', 'u-ivan': 'production' };
    users.forEach(x => { if (x.work_function === undefined) x.work_function = FN[x.id] || (x.role === 'worker' ? 'production' : null); });
    const req = (id, owner, category, o) => Object.assign({
      id, owner_id: owner, anonymous: false, complaint_target: null, date_from: null, date_to: null, status: 'new',
      first_response_at: null, closed_at: null, created_at: ago(5), updated_at: ago(5),
    }, o, { category });
    const requests = [
      req('r1', 'u-serhii', 'day_off', { date_from: day(3), date_to: day(3), body: 'Прошу відгул у п’ятницю — маю візит в Urząd ds. Cudzoziemców о 10:00.', created_at: ago(26), status: 'closed', first_response_at: ago(24), closed_at: ago(24) }),
      req('r2', 'u-ram', 'sick', { date_from: day(-1), date_to: day(4), body: 'Lekarz dał L4 na 6 dni. Zwolnienie jest w ZUS.', created_at: ago(20), status: 'in_progress', first_response_at: ago(19) }),
      req('r3', 'u-maria', 'housing', { body: 'En el piso de ul. Kolejowa 12 no hay agua caliente desde ayer.', created_at: ago(9), status: 'need_info', first_response_at: ago(8) }),
      req('r4', 'u-ion', 'salary', { body: 'În fluturașul pentru septembrie lipsesc 14 ore suplimentare (sâmbăta 13.09 și 20.09).', created_at: ago(30), status: 'in_progress', first_response_at: ago(6) }),
      req('r5', 'u-dmytro', 'complaint', { anonymous: true, complaint_target: 'manager', body: 'Керівник продукції кричить на людей на лінії і погрожує звільненням за перерву в туалет.', created_at: ago(14) }),
      req('r6', 'u-serhii', 'complaint', { complaint_target: 'housing', body: 'У кімнаті 5 людей замість 4, як було в договорі.', created_at: ago(3) }),
      req('r7', 'u-sita', 'newcomer_question', { body: 'Where do I get work shoes and a locker key on the first day?', created_at: ago(2) }),
      req('r8', 'u-oleh', 'vacation', { date_from: day(20), date_to: day(27), body: 'Прошу відпустку на тиждень, їду додому на весілля сестри.', created_at: ago(50), status: 'closed', first_response_at: ago(40), closed_at: ago(40) }),
      req('r9', 'u-carlos', 'newcomer_question', { body: '¿A qué hora sale el autobús al trabajo desde el hostel?', created_at: ago(1.5) }),
    ];
    const messages = [
      { id: uid(), request_id: 'r1', author_id: 'u-ivan', from_owner: false, body: 'Погоджено. Гарного дня в уряді.', created_at: ago(24) },
      { id: uid(), request_id: 'r2', author_id: 'u-aga', from_owner: false, body: 'Dziękuję, widzę L4 w PUE ZUS. Zdrowiej!', created_at: ago(19) },
      { id: uid(), request_id: 'r3', author_id: 'u-andrii', from_owner: false, body: '¿Es el piso 2 o 3? Envío al técnico hoy.', created_at: ago(8) },
      { id: uid(), request_id: 'r4', author_id: 'u-aga', from_owner: false, body: 'Sprawdzam z działem płac, odpowiem do środy.', created_at: ago(6) },
      { id: uid(), request_id: 'r8', author_id: 'u-aga', from_owner: false, body: 'Urlop zatwierdzony.', created_at: ago(40) },
    ];
    const ann = (id, author, scope, o) => Object.assign({ id, author_id: author, scope, project_id: null, department_id: null, group_id: null, created_at: ago(4) }, o);
    const announcements = [
      ann('a1', 'u-ivan', 'group', { project_id: P1, department_id: D1, group_id: G1, title: 'Завтра працюємо 6:00–14:00', body: 'Зміна A завтра починає о 6:00. Збір біля роздягальні о 5:45. Не забудьте нові бейджі.', created_at: ago(3) }),
      ann('a2', 'u-tomasz', 'project', { project_id: P1, title: 'Szkolenie BHP w sobotę', body: 'W sobotę o 9:00 obowiązkowe szkolenie BHP dla wszystkich nowych osób. Sala konferencyjna, budynek B.', created_at: ago(20) }),
      ann('a3', 'u-andrii', 'project', { project_id: P1, title: 'Виплата зарплати 10 жовтня', body: 'Зарплата за вересень надійде 10.10. Розрахункові листки — у кадровій з 9 жовтня.', created_at: ago(48) }),
      ann('a4', 'u-olena', 'all', { title: 'Новий додаток ALIMAT Connect', body: 'Усі заявки (відгул, лікарняний, відпустка, житло, зарплата, скарги) тепер подаються тут. Групи в месенджерах закриваються з 1 листопада.', created_at: ago(72) }),
      ann('a5', 'u-andrii', 'project', { project_id: P2, title: 'Zmiana grafiku w Końskowoli', body: 'Od poniedziałku zmiana II zaczyna o 14:30.', created_at: ago(10) }),
    ];
    const reads = [['a4', 'u-serhii'], ['a4', 'u-ram'], ['a4', 'u-ion'], ['a3', 'u-serhii'], ['a3', 'u-ion'], ['a3', 'u-maria'], ['a2', 'u-ion'], ['a1', 'u-dmytro']]
      .map(([a, u]) => ({ announcement_id: a, user_id: u }));
    const polls = [
      { id: 'pl1', author_id: 'u-andrii', scope: 'project', project_id: P1, department_id: null, group_id: null, question: 'Як ви оцінюєте житло, яке надає компанія?', options: ['Добре', 'Нормально', 'Погано', 'Дуже погано'], anonymous: true, created_at: ago(30) },
      { id: 'pl2', author_id: 'u-tomasz', scope: 'project', project_id: P1, department_id: null, group_id: null, question: 'Który dzień wolny wolisz w listopadzie?', options: ['Piątek 31.10', 'Poniedziałek 10.11'], anonymous: false, created_at: ago(6) },
    ];
    const poll_votes = [0, 1, 1, 2, 0, 2, 3, 1].map((o, i) => ({ id: uid(), poll_id: 'pl1', option_idx: o, user_id: null }));
    const poll_voters = ['u-serhii', 'u-ion', 'u-maria', 'u-dmytro', 'u-nazar', 'u-ivan', 'u-carlos', 'u-tomasz'].map(x => ({ poll_id: 'pl1', user_id: x }));
    const tasks = [
      { id: 't1', author_id: 'u-aga', assignee_id: 'u-serhii', title: 'Принести копію karty pobytu', body: 'До кадрової до п’ятниці, кабінет 3.', due_date: day(4), status: 'open', created_at: ago(28), done_at: null },
      { id: 't2', author_id: 'u-ivan', assignee_id: 'u-ram', title: 'Szkolenie z noża — podpis', body: 'Podpisz listę obecności u lidera.', due_date: day(1), status: 'done', created_at: ago(50), done_at: ago(30) },
      { id: 't3', author_id: 'u-andrii', assignee_id: 'u-sita', title: 'Badania lekarskie (medycyna pracy)', body: 'Wtorek 8:00, Przychodnia „Medica”, ul. Lipowa 4. Weź paszport.', due_date: day(2), status: 'open', created_at: ago(18), done_at: null },
    ];
    const onboarding = [
      { id: 'o1', project_id: P1, department_id: D1, first_day: day(3), start_time: '05:45', place: 'Animex K3, brama nr 2, ul. Przemysłowa 8 (autobus z hostelu o 05:10)', instructions: 'Візьміть паспорт і PESEL. Робочий одяг і взуття видадуть на місці. Їжу можна купити в їдальні з 9:00. Телефони на лінії заборонені — шафка в роздягальні.', contact: 'Андрій Мельник, координатор · +48 512 345 678', updated_at: ago(10) },
      { id: 'o2', project_id: P1, department_id: null, first_day: day(5), start_time: '06:00', place: 'Animex K3, recepcja, ul. Przemysłowa 8', instructions: 'Paszport, PESEL, zdjęcie do identyfikatora.', contact: 'Agnieszka Zając, kadry · +48 600 111 222', updated_at: ago(10) },
    ];
    const invites = [
      { code: 'ANIMEX01', project_id: P1, department_id: D1, group_id: G1, role: 'worker', position: 'Pracownik produkcji', newcomer: true, max_uses: 200, uses: 14, expires_at: null, created_by: 'u-andrii', created_at: ago(240) },
      { code: 'ROZB2026', project_id: P1, department_id: D2, group_id: G3, role: 'worker', position: 'Operator', newcomer: true, max_uses: 50, uses: 6, expires_at: new Date(Date.now() + 20 * 864e5).toISOString(), created_by: 'u-aga', created_at: ago(100) },
    ];
    const audit = [
      { id: 3, actor_id: 'u-kasia', action: 'block', target_id: 'u-nazar', details: { level: 'complaints', reason: '12 однакових скарг за день', name: 'Назар Гнатюк' }, created_at: ago(22) },
      { id: 2, actor_id: 'u-aga', action: 'dismiss', target_id: null, details: { role: 'worker', reason: 'Koniec umowy' }, created_at: ago(70) },
      { id: 1, actor_id: 'u-andrii', action: 'invite_create', target_id: null, details: { code: 'ANIMEX01', role: 'worker' }, created_at: ago(240) },
    ];
    return {
      v: 3, current: null, lib: seedLib(users, P1),
      projects: [{ id: P1, name: 'Animex K3' }, { id: P2, name: 'Końskowola' }, ...['Animex K2', 'Animex Suwałki', 'Karol', 'Bida Bolesław', 'Bida Opole', 'Bida Lublin', 'Biuro Kutno', 'Biuro Kraków', 'Lipce', 'Citronex'].map((name, i) => ({ id: 'p-x' + i, name }))],
      departments: [{ id: D1, project_id: P1, name: 'Ubój' }, { id: D2, project_id: P1, name: 'Rozbiór' }, { id: D3, project_id: P2, name: 'Pakowanie' }],
      groups: [{ id: G1, department_id: D1, name: 'Zmiana A' }, { id: G2, department_id: D1, name: 'Zmiana B' }, { id: G3, department_id: D2, name: 'Zmiana A' }, { id: G4, department_id: D3, name: 'Zmiana A' }],
      users, requests, messages, announcements, reads, polls, poll_votes, poll_voters, tasks, onboarding, invites, audit,
    };
  }
  // ---------- «Знання»: стартовий вміст демо ----------
  function seedLib(users, P1) {
    const SEED = AL.LIBRARY_SEED || { guides: [], folders: [] };
    const L = { guides: [], tr: [], acks: [], grants: [], folders: [], docs: [], log: [] };
    const g = (type, id, [st, sub, edit]) => L.grants.push({ id: uid(), object_type: type, object_id: id, subject_type: st, subject: sub, can_edit: !!edit });
    SEED.guides.forEach(x => {
      const id = 'g-' + x.slug;
      L.guides.push({ id, slug: x.slug, title: x.title, summary: x.summary, body_md: x.body, lang: 'pl', version: 1, require_ack: true, published: true, sort: x.sort, updated_at: ago(24 * 3) });
      Object.entries(x.tr || {}).forEach(([lang, t]) => L.tr.push({ guide_id: id, lang, title: t.title, summary: t.summary, body_md: t.body, version: 1 }));
      x.grants.forEach(gr => g('guide', id, gr));
    });
    SEED.folders.forEach(f => {
      L.folders.push({ id: 'f-' + f.key, parent_id: f.parent ? 'f-' + f.parent : null, name: f.name, description: f.description, sort: f.sort });
      f.grants.forEach(gr => g('folder', 'f-' + f.key, gr));
    });
    const doc = (o) => L.docs.push(Object.assign({ id: uid(), folder_id: null, owner_profile_id: null, doc_type: 'other', mime: 'application/pdf', size_bytes: 180000, valid_until: null, note: null, uploaded_by: 'u-aga', created_at: ago(24 * 6), deleted_at: null }, o));
    doc({ folder_id: 'f-regulaminy', title: 'Regulamin pracy Alimat Group', doc_type: 'procedure', file_name: 'regulamin.pdf' });
    doc({ folder_id: 'f-regulaminy', title: 'Instrukcja BHP — produkcja', doc_type: 'procedure', file_name: 'bhp.pdf', size_bytes: 420000 });
    doc({ folder_id: 'f-ocena', title: 'Procedura oceny pracowników produkcji', doc_type: 'procedure', file_name: 'ocena-produkcja.pdf' });
    doc({ folder_id: 'f-ocena', title: 'Arkusz oceny — produkcja', doc_type: 'template', file_name: 'arkusz.xlsx', mime: 'application/vnd.ms-excel', size_bytes: 24000 });
    doc({ folder_id: 'f-rekrutacja', title: 'Skrypty dla rekrutacji (5 języków)', doc_type: 'template', file_name: 'skrypty.docx', uploaded_by: 'u-natalia', size_bytes: 64000 });
    doc({ folder_id: 'f-partnerzy', title: 'Formularz zgłoszenia kandydata', doc_type: 'template', file_name: 'zgloszenie.pdf', uploaded_by: 'u-natalia' });
    doc({ folder_id: 'f-prawny', title: 'Wzór wniosku o zezwolenie na pobyt', doc_type: 'template', file_name: 'wniosek.docx', uploaded_by: 'u-joanna' });
    doc({ folder_id: 'f-kadry', title: 'Wzór umowy zlecenia', doc_type: 'template', file_name: 'umowa-zlecenia.docx' });
    doc({ owner_profile_id: 'u-sita', title: 'Paszport', doc_type: 'passport', file_name: 'paszport.pdf', valid_until: day(20), uploaded_by: 'u-andrii' });
    doc({ owner_profile_id: 'u-sita', title: 'Umowa zlecenia', doc_type: 'contract', file_name: 'umowa.pdf', uploaded_by: 'u-aga' });
    doc({ owner_profile_id: 'u-ram', title: 'Karta pobytu', doc_type: 'residence_card', file_name: 'karta.jpg', mime: 'image/jpeg', valid_until: day(12), uploaded_by: 'u-joanna' });
    doc({ owner_profile_id: 'u-serhii', title: 'Paszport', doc_type: 'passport', file_name: 'pass.pdf', valid_until: day(400), uploaded_by: 'u-serhii' });
    ['u-ram', 'u-ion', 'u-ivan'].forEach(x => L.acks.push({ guide_id: 'g-pracownik-produkcji', user_id: x, version: 1, acked_at: ago(30) }));
    return L;
  }
  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h * 7919; }

  let S;
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) { S = JSON.parse(raw); if (S.v === 3) return; } } catch (e) { /* немає сховища */ }
    S = seed();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ок */ } }

  const me = () => S.users.find(u => u.id === S.current) || null;
  const userName = id => (S.users.find(u => u.id === id) || {}).full_name || null;
  const need = (cond, code = 'FORBIDDEN') => { if (!cond) throw new ApiError(code); };
  const delay = (v) => new Promise(r => setTimeout(() => r(v), 60));
  function audit(action, target_id, details) { S.audit.unshift({ id: Date.now(), actor_id: S.current, action, target_id, details, created_at: now() }); }
  const viewReq = (r, m) => ({
    ...r, is_owner: r.owner_id === m.id, owner_id: undefined,
    author_name: r.anonymous ? null : userName(r.owner_id),
    author_id: r.anonymous ? null : r.owner_id,
    project_id: r.project_id, group_id: r.group_id,
  });
  function placeOf(uidv) { const u = S.users.find(x => x.id === uidv) || {}; return { project_id: u.project_id, department_id: u.department_id, group_id: u.group_id }; }
  function resolveScope(o) {
    let pid = o.project_id, did = o.department_id;
    if (o.group_id) { const g = S.groups.find(x => x.id === o.group_id); did = g.department_id; pid = S.departments.find(d => d.id === did).project_id; }
    else if (o.department_id) pid = S.departments.find(d => d.id === did).project_id;
    return {
      scope: o.scope, project_id: o.scope === 'all' ? null : pid,
      department_id: ['department', 'group'].includes(o.scope) ? did : null,
      group_id: o.scope === 'group' ? o.group_id : null,
    };
  }

  // ---------- правила «Знань» (дзеркало функцій у базі) ----------
  const LB = () => S.lib;
  const blockFull = p => AL.blockOf(p) === 'full';
  function subjectMatch(p, type, id, edit) {
    if (!p || blockFull(p) || (edit && AL.blockOf(p) !== 'none')) return false;
    return LB().grants.some(g => g.object_type === type && g.object_id === id && (!edit || g.can_edit) && (
      g.subject_type === 'all' || (g.subject_type === 'role' && g.subject === p.role) || (g.subject_type === 'function' && g.subject === p.work_function)
      || (g.subject_type === 'user' && g.subject === p.id) || (g.subject_type === 'project' && (g.subject === p.project_id || (p.staff_projects || []).includes(g.subject)))));
  }
  const globalEditor = m => !!m && AL.GLOBAL.includes(m.role) && AL.blockOf(m) === 'none';
  function folderAccess(m, fid, edit) {
    if (edit ? globalEditor(m) : AL.isGlobal(m)) return true;
    let f = LB().folders.find(x => x.id === fid), n = 0;
    while (f && n++ < 20) { if (subjectMatch(m, 'folder', f.id, edit)) return true; f = LB().folders.find(x => x.id === f.parent_id); }
    return false;
  }
  const personTarget = id => S.users.find(u => u.id === id) || { id };
  const canSeeDoc = (m, d) => !d.deleted_at && ((d.owner_profile_id ? AL.canPersonalDocs(m, personTarget(d.owner_profile_id), false) : folderAccess(m, d.folder_id, false)) || subjectMatch(m, 'document', d.id, false));
  const canEditDoc = (m, d) => !d.deleted_at && ((d.owner_profile_id ? AL.canPersonalDocs(m, personTarget(d.owner_profile_id), true) && (d.owner_profile_id !== m.id || globalEditor(m) || d.uploaded_by === m.id) : folderAccess(m, d.folder_id, true)) || subjectMatch(m, 'document', d.id, true));
  const canSeeGuide = (m, g) => AL.isGlobal(m) || subjectMatch(m, 'guide', g.id, true) || (g.published && subjectMatch(m, 'guide', g.id, false));
  const canManage = (m, type, id) => globalEditor(m) || (type === 'guide' ? subjectMatch(m, 'guide', id, true) : type === 'folder' ? folderAccess(m, id, true)
    : (() => { const d = LB().docs.find(x => x.id === id); return !!d && canEditDoc(m, d); })());
  const FILES = {};   // завантажені в демо файли живуть лише до перезавантаження сторінки
  const docView = (m, d) => ({ ...d, uploaded_by_name: userName(d.uploaded_by), can_edit: canEditDoc(m, d) });
  const guideOut = (m, g, lang) => {
    const tr = LB().tr.find(x => x.guide_id === g.id && x.lang === lang && lang !== g.lang);
    const a = LB().acks.find(x => x.guide_id === g.id && x.user_id === m.id);
    return { ...g, title: tr ? tr.title : g.title, summary: tr ? tr.summary : g.summary, tr_lang: tr && tr.lang, acked_version: a && a.version, acked_at: a && a.acked_at, can_edit: globalEditor(m) || subjectMatch(m, 'guide', g.id, true) };
  };

  const api = {
    mode: 'demo',
    impersonating() { return S.adminBack ? { name: userName(S.adminBack) } : null; },
    async impersonate(email, id) { const m = me(); need(m && m.role === 'superadmin'); const t = S.users.find(u => u.id === id || u.email === email); need(t, 'NOT_FOUND'); S.adminBack = m.id; S.current = t.id; audit('impersonate', t.id, { name: t.full_name }); save(); },
    async stopImpersonation() { if (S.adminBack) { S.current = S.adminBack; S.adminBack = null; save(); } },
    async claimAccount() { return { ok: false }; },
    async preparedAccounts() {
      need(AL.isGlobal(me()));
      if (!S.prepared) S.prepared = [
        { id: uid(), full_name: 'Jan Przykładowy', phone: '+48 500 100 200', emails: ['jan.przykladowy@alimatgroup.com'], role: 'coordinator', work_function: 'coordination', position: 'Koordynator (demo)', project_id: S.projects[0].id, staff_projects: [S.projects[0].id], claimed: false },
        { id: uid(), full_name: 'Anna Demo', phone: null, emails: ['anna.demo@alimatgroup.com', 'anna.demo@gmail.com'], role: 'worker', work_function: 'recruitment', position: 'Rekruter (demo)', project_id: S.projects[0].id, staff_projects: [], claimed: false },
        { id: uid(), full_name: 'Andrii Melnyk (demo)', phone: null, emails: ['andrii@example.com'], role: 'coordinator', work_function: 'coordination', position: 'Koordynator', project_id: S.projects[0].id, staff_projects: [S.projects[0].id], claimed: true, claimed_at: ago(48) },
      ];
      return delay(S.prepared.map(a => ({ ...a })));
    },
    async savePrepared(o) {
      need(AL.isGlobal(me()) && AL.blockOf(me()) === 'none');
      const emails = o.emails.map(e => e.trim().toLowerCase()).filter(Boolean); need(o.full_name && emails.length, 'INVALID');
      need(!S.prepared.some(a => a.id !== o.id && a.emails.some(e => emails.includes(e))), 'DUPLICATE');
      const x = o.id ? S.prepared.find(a => a.id === o.id) : null; if (x) need(!x.claimed, 'CLAIMED');
      const rec = { full_name: o.full_name.trim(), phone: o.phone, emails, role: o.role, work_function: o.work_function, position: o.position, project_id: o.project_id, staff_projects: o.staff_projects || [] };
      if (x) Object.assign(x, rec); else S.prepared.push({ id: uid(), claimed: false, ...rec });
      save();
    },
    async deletePrepared(id) { need(AL.isGlobal(me())); S.prepared = S.prepared.filter(a => a.id !== id || a.claimed); save(); },
    async setStaffProjects(id, ids) { const t = S.users.find(u => u.id === id); need(t && AL.isGlobal(me())); t.staff_projects = ids; save(); },
    async myCoordinators() {
      const m = me(); if (!m || !m.project_id) return [];
      const pn = (S.projects.find(p => p.id === m.project_id) || {}).name;
      return delay(S.users.filter(u => u.role === 'coordinator' && u.id !== m.id && AL.blockOf(u) !== 'full' && (u.project_id === m.project_id || (u.staff_projects || []).includes(m.project_id)))
        .map(u => ({ id: u.id, full_name: u.full_name, phone: u.phone, project: pn })));
    },
    async setUserFunction(id, fn) { const m = me(), t = S.users.find(u => u.id === id); need(t && AL.canAdminUser(m, t)); t.work_function = fn || null; audit('user_function', id, { name: t.full_name }); save(); },

    async guides(lang) { const m = me(); return delay(LB().guides.filter(g => canSeeGuide(m, g)).sort((a, b) => a.sort - b.sort).map(g => guideOut(m, g, lang))); },
    async guide(id, lang) {
      const m = me(), g = LB().guides.find(x => x.id === id); need(g && canSeeGuide(m, g));
      const tr = LB().tr.find(x => x.guide_id === id && x.lang === lang && lang !== g.lang);
      return delay({ ...guideOut(m, g, lang), title: g.title, summary: g.summary, translation: tr ? { ...tr } : null, translations: LB().tr.filter(x => x.guide_id === id).map(x => x.lang) });
    },
    async ackGuide(id) {
      const m = me(), g = LB().guides.find(x => x.id === id); need(g && canSeeGuide(m, g));
      LB().acks = LB().acks.filter(x => !(x.guide_id === id && x.user_id === m.id)); LB().acks.push({ guide_id: id, user_id: m.id, version: g.version, acked_at: now() }); save();
    },
    async saveGuide(o) {
      const m = me(); need(o.title && o.title.trim(), 'INVALID');
      if (!o.id) {
        need(AL.can.createGuide(m)); const id = uid();
        LB().guides.push({ id, title: o.title.trim(), summary: o.summary, body_md: o.body_md || '', lang: 'pl', version: 1, require_ack: !!o.require_ack, published: !!o.published, sort: 100, updated_at: now() });
        LB().grants.push({ id: uid(), object_type: 'guide', object_id: id, subject_type: 'user', subject: m.id, can_edit: true });
        audit('guide_create', id, { name: o.title }); save(); return id;
      }
      const g = LB().guides.find(x => x.id === o.id); need(g && canManage(m, 'guide', g.id));
      Object.assign(g, { title: o.title.trim(), summary: o.summary, body_md: o.body_md || '', require_ack: !!o.require_ack, published: !!o.published, updated_at: now() });
      if (o.new_version) g.version++;
      audit('guide_update', g.id, { name: g.title }); save(); return g.id;
    },
    async saveGuideTranslation(id, lang, o) {
      const m = me(), g = LB().guides.find(x => x.id === id); need(g && canManage(m, 'guide', id)); need(lang !== g.lang, 'INVALID');
      LB().tr = LB().tr.filter(x => !(x.guide_id === id && x.lang === lang));
      if (o.body_md && o.body_md.trim()) LB().tr.push({ guide_id: id, lang, title: o.title, summary: o.summary, body_md: o.body_md, version: g.version });
      save();
    },
    async deleteGuide(id) { need(globalEditor(me())); LB().guides = LB().guides.filter(x => x.id !== id); LB().grants = LB().grants.filter(x => x.object_id !== id); audit('guide_delete', id, {}); save(); },
    async guideReport(id) {
      const m = me(), g = LB().guides.find(x => x.id === id); need(g && canManage(m, 'guide', id));
      const people = S.users.filter(u => AL.canViewUser(m, u) && subjectMatch(u, 'guide', id, false)).map(u => {
        const a = LB().acks.find(x => x.guide_id === id && x.user_id === u.id);
        return { id: u.id, name: u.full_name, role: u.role, acked: !!a && a.version === g.version, acked_at: a && a.acked_at };
      }).sort((a, b) => (a.acked - b.acked) || a.name.localeCompare(b.name));
      return delay({ version: g.version, people });
    },

    async grants(type, id) {
      const m = me(); need(canManage(m, type, id));
      return delay(LB().grants.filter(g => g.object_type === type && g.object_id === id).map(g => ({ ...g,
        label: g.subject_type === 'user' ? (u => u ? u.full_name + (u.email ? ' · ' + u.email : '') : g.subject)(S.users.find(u => u.id === g.subject))
          : g.subject_type === 'project' ? (S.projects.find(p => p.id === g.subject) || {}).name : null })));
    },
    async grant(type, id, st, sub, edit) {
      const m = me(); need(canManage(m, type, id));
      if (st === 'all') sub = '';
      if (st === 'user') need(S.users.some(u => u.id === sub), 'NOT_FOUND');
      if (st === 'role') need(AL.ROLES.includes(sub), 'INVALID');
      if (st === 'function') need(AL.FUNCTIONS.includes(sub), 'INVALID');
      if (st === 'project') need(S.projects.some(p => p.id === sub), 'INVALID');
      const ex = LB().grants.find(g => g.object_type === type && g.object_id === id && g.subject_type === st && g.subject === sub);
      if (ex) ex.can_edit = !!edit; else LB().grants.push({ id: uid(), object_type: type, object_id: id, subject_type: st, subject: sub, can_edit: !!edit });
      audit('grant_add', id, { name: st + ':' + sub }); save();
    },
    async findPeople(type, id, q) {
      const m = me(); need(canManage(m, type, id)); q = String(q || '').trim().toLowerCase(); if (q.length < 2) return [];
      return delay(S.users.filter(u => AL.blockOf(u) !== 'full' && (u.full_name.toLowerCase().includes(q) || u.id === q)).slice(0, 10)
        .map(u => ({ id: u.id, full_name: u.full_name, role: u.role, work_function: u.work_function, project: (S.projects.find(p => p.id === u.project_id) || {}).name })));
    },
    async revoke(gid) {
      const m = me(), g = LB().grants.find(x => x.id === gid); need(g && canManage(m, g.object_type, g.object_id));
      LB().grants = LB().grants.filter(x => x.id !== gid); audit('grant_remove', g.object_id, {}); save();
    },

    async folders() {
      const m = me();
      return delay(LB().folders.filter(f => folderAccess(m, f.id, false)).sort((a, b) => a.sort - b.sort)
        .map(f => ({ ...f, can_edit: folderAccess(m, f.id, true), docs: LB().docs.filter(d => d.folder_id === f.id && !d.deleted_at).length })));
    },
    async createFolder(parent, name, description) {
      const m = me(); need(name && name.trim(), 'INVALID'); need(parent ? folderAccess(m, parent, true) : globalEditor(m));
      const id = uid(); LB().folders.push({ id, parent_id: parent || null, name: name.trim(), description, sort: 100 }); audit('folder_create', id, { name }); save(); return id;
    },
    async deleteFolder(id) {
      need(globalEditor(me())); need(!LB().folders.some(f => f.parent_id === id) && !LB().docs.some(d => d.folder_id === id && !d.deleted_at), 'NOT_EMPTY');
      LB().folders = LB().folders.filter(f => f.id !== id); save();
    },
    async documents(folder, owner) {
      const m = me();
      return delay(LB().docs.filter(d => !d.deleted_at && ((folder && d.folder_id === folder) || (owner && d.owner_profile_id === owner)) && canSeeDoc(m, d))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)).map(d => docView(m, d)));
    },
    async expiring(days) {
      const m = me(), lim = Date.now() + days * 864e5;
      return delay(LB().docs.filter(d => !d.deleted_at && d.valid_until && new Date(d.valid_until) <= lim && (d.owner_profile_id !== m.id || AL.isGlobal(m)) && canSeeDoc(m, d))
        .sort((a, b) => a.valid_until.localeCompare(b.valid_until)).map(d => ({ ...d, owner_name: userName(d.owner_profile_id) })));
    },
    async uploadDocument(o, file) {
      const m = me();
      if (o.folder_id) need(folderAccess(m, o.folder_id, true)); else need(AL.canPersonalDocs(m, personTarget(o.owner_id), true));
      need(file.size <= 25 * 1048576, 'TOO_BIG');
      need(/\.(pdf|jpe?g|png|heic|webp|docx?|xlsx?|odt|ods|txt|csv)$/i.test(file.name), 'BAD_TYPE');
      const id = uid(); FILES[id] = URL.createObjectURL(file);
      LB().docs.push({ id, folder_id: o.folder_id || null, owner_profile_id: o.owner_id || null, title: o.title, doc_type: o.doc_type, file_name: file.name, mime: file.type, size_bytes: file.size, valid_until: o.valid_until, note: o.note || null, uploaded_by: m.id, created_at: now(), deleted_at: null });
      LB().log.push({ document_id: id, user_id: m.id, action: 'upload', at: now() }); save();
    },
    async openDocument(id) {
      const m = me(), d = LB().docs.find(x => x.id === id); need(d && canSeeDoc(m, d));
      LB().log.push({ document_id: id, user_id: m.id, action: 'open', at: now() }); save();
      return delay({ title: d.title, file_name: d.file_name, url: FILES[id] || null, image: !!FILES[id] && /^image\//.test(d.mime || '') });
    },
    async deleteDocument(id) {
      const m = me(), d = LB().docs.find(x => x.id === id); need(d && canEditDoc(m, d));
      d.deleted_at = now(); LB().log.push({ document_id: id, user_id: m.id, action: 'delete', at: now() }); audit('document_delete', id, { name: d.title }); save();
    },
    async documentLog(id) { need(AL.isGlobal(me())); return delay(LB().log.filter(l => l.document_id === id).reverse().map(l => ({ ...l, name: userName(l.user_id) }))); },

    async init() { load(); S.requests.forEach(r => { if (!r.project_id) Object.assign(r, placeOf(r.owner_id)); }); save(); },
    async currentUserId() { return S.current; },
    demoUsers() { return S.users.map(u => ({ id: u.id, full_name: u.full_name, role: u.role, status: u.status, position: u.position, project_id: u.project_id, work_function: u.work_function })); },
    async demoLogin(id) { S.current = id; save(); },
    async demoReset() { S = seed(); save(); },
    async signOut() { S.current = null; save(); },
    async sendCode() { }, async verifyCode() { },

    async inviteInfo(code) {
      const i = S.invites.find(x => x.code === String(code || '').toUpperCase().trim());
      if (!i || i.uses >= i.max_uses || (i.expires_at && new Date(i.expires_at) < new Date())) return delay(null);
      const p = S.projects.find(x => x.id === i.project_id), d = S.departments.find(x => x.id === i.department_id), g = S.groups.find(x => x.id === i.group_id);
      return delay({ project: p && p.name, department: d && d.name, group: g && g.name, role: i.role, position: i.position, newcomer: i.newcomer, work_function: i.work_function || null });
    },
    async register({ code, full_name, phone, email, lang }) {
      const i = S.invites.find(x => x.code === String(code).toUpperCase().trim());
      need(i && i.uses < i.max_uses, 'INVITE_INVALID');
      need(full_name && full_name.trim(), 'INVALID');
      const u = {
        id: uid(), full_name: full_name.trim(), phone, email, role: i.role, position: i.position,
        status: i.newcomer ? 'newcomer' : 'active', project_id: i.project_id, department_id: i.department_id, group_id: i.group_id,
        lang: lang || 'pl', block_level: 'none', blocked_until: null, block_reason: null, work_function: i.work_function || null,
        staff_projects: ['coordinator', 'hr', 'admin_project'].includes(i.role) ? [i.project_id] : [], created_at: now(),
      };
      S.users.push(u); i.uses++; S.current = u.id; save(); return delay({ ok: true });
    },

    async me() { return delay(me() ? { ...me() } : null); },
    async structure() { return delay({ projects: S.projects, departments: S.departments, groups: S.groups }); },
    async setLang(lang) { const m = me(); if (m) { m.lang = lang; save(); } },

    async announcements() {
      const m = me();
      return delay(S.announcements.filter(a => AL.inAudience(m, a))
        .map(a => ({ ...a, author_name: userName(a.author_id), read: S.reads.some(r => r.announcement_id === a.id && r.user_id === m.id) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async markRead(id) {
      const m = me();
      if (!S.reads.some(r => r.announcement_id === id && r.user_id === m.id)) { S.reads.push({ announcement_id: id, user_id: m.id }); save(); }
    },
    async announcementStats() {
      const m = me(), out = {};
      S.announcements.forEach(a => {
        if (!(a.author_id === m.id || AL.isGlobal(m) || (['coordinator', 'admin_project', 'manager'].includes(m.role) && AL.inProjects(m, a.project_id)))) return;
        const aud = S.users.filter(u => a.scope === 'all' || (a.scope === 'project' ? u.project_id === a.project_id : a.scope === 'department' ? u.department_id === a.department_id : u.group_id === a.group_id));
        out[a.id] = { reads: S.reads.filter(r => r.announcement_id === a.id).length, audience: aud.length };
      });
      return delay(out);
    },
    async createAnnouncement(o) {
      const m = me(), sc = resolveScope(o);
      need(AL.canTarget(m, sc.scope, sc.project_id, sc.department_id, sc.group_id));
      need(o.title && o.body, 'INVALID');
      S.announcements.push({ id: uid(), author_id: m.id, ...sc, title: o.title.trim(), body: o.body.trim(), created_at: now() }); save();
    },

    async polls() {
      const m = me();
      return delay(S.polls.filter(p => AL.inAudience(m, p))
        .map(p => ({ ...p, author_name: userName(p.author_id), voted: S.poll_voters.some(v => v.poll_id === p.id && v.user_id === m.id) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async vote(id, idx) {
      const m = me(), p = S.polls.find(x => x.id === id);
      need(m && !['full', 'readonly'].includes(AL.blockOf(m)), 'BLOCKED');
      need(p && AL.inAudience(m, p));
      need(!S.poll_voters.some(v => v.poll_id === id && v.user_id === m.id), 'ALREADY_VOTED');
      S.poll_voters.push({ poll_id: id, user_id: m.id });
      S.poll_votes.push({ id: uid(), poll_id: id, option_idx: idx, user_id: p.anonymous ? null : m.id }); save();
    },
    async pollResults(id) {
      const m = me(), p = S.polls.find(x => x.id === id);
      need(p && AL.can.pollResults(m, p));
      const votes = S.poll_votes.filter(v => v.poll_id === id);
      if (p.anonymous && votes.length < 5) return delay({ total: votes.length, hidden: true });
      return delay({ total: votes.length, hidden: false, counts: p.options.map((_, i) => votes.filter(v => v.option_idx === i).length) });
    },
    async createPoll(o) {
      const m = me(), sc = resolveScope(o);
      need(AL.canTarget(m, sc.scope, sc.project_id, sc.department_id, sc.group_id));
      need(o.question && o.options && o.options.length >= 2, 'INVALID');
      S.polls.push({ id: uid(), author_id: m.id, ...sc, question: o.question.trim(), options: o.options, anonymous: !!o.anonymous, created_at: now() }); save();
    },

    async tasks() {
      const m = me();
      return delay(S.tasks.filter(t => t.assignee_id === m.id || t.author_id === m.id || AL.isGlobal(m))
        .map(t => ({ ...t, author_name: userName(t.author_id), assignee_name: userName(t.assignee_id) }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async createTask(o) {
      const m = me(), t = S.users.find(u => u.id === o.assignee_id);
      need(t && AL.can.task(m) && AL.canViewUser(m, t));
      need(o.title, 'INVALID');
      S.tasks.push({ id: uid(), author_id: m.id, assignee_id: t.id, title: o.title.trim(), body: o.body || '', due_date: o.due_date || null, status: 'open', created_at: now(), done_at: null }); save();
    },
    async completeTask(id) {
      const t = S.tasks.find(x => x.id === id && x.assignee_id === S.current);
      if (t) { t.status = 'done'; t.done_at = now(); save(); }
    },

    async requests() {
      const m = me();
      const vis = S.requests.filter(r => AL.canSeeRequest(m, r, r.owner_id === m.id)).map(r => viewReq(r, m))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return delay({ mine: vis.filter(r => r.is_owner), visible: vis.filter(r => !r.is_owner) });
    },
    async nextAllowedAt() {
      const m = me();
      if (m.status === 'newcomer') return null;
      return AL.nextAllowedAt(S.requests.filter(r => r.owner_id === m.id));
    },
    async createRequest(o) {
      const m = me(), b = AL.blockOf(m);
      need(!['full', 'readonly'].includes(b), 'BLOCKED');
      need(!(b === 'complaints' && o.category === 'complaint'), 'BLOCKED');
      need(o.body && o.body.trim(), 'INVALID');
      need(!(o.category === 'newcomer_question' && m.status !== 'newcomer'), 'INVALID');
      need(!(o.category === 'complaint' && !o.complaint_target), 'INVALID');
      need(!(AL.LEAVE.includes(o.category) && !o.date_from), 'INVALID');
      if (!AL.NO_LIMIT.includes(o.category) && m.status !== 'newcomer') {
        const next = AL.nextAllowedAt(S.requests.filter(r => r.owner_id === m.id));
        if (next && next > new Date()) throw new ApiError('RATE_LIMIT', next.toISOString());
      }
      const r = {
        id: uid(), owner_id: m.id, anonymous: !!o.anonymous && o.category === 'complaint', category: o.category,
        complaint_target: o.category === 'complaint' ? o.complaint_target : null,
        date_from: o.date_from || null, date_to: o.date_to || o.date_from || null, body: o.body.trim(), status: 'new',
        ...placeOf(m.id), created_at: now(), updated_at: now(), first_response_at: null, closed_at: null,
      };
      S.requests.push(r); save(); return r.id;
    },
    async requestDetail(id) {
      const m = me(), r = S.requests.find(x => x.id === id);
      need(r && AL.canSeeRequest(m, r, r.owner_id === m.id));
      const msgs = S.messages.filter(x => x.request_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map(x => ({ ...x, author_name: x.from_owner && r.anonymous ? null : userName(x.author_id), author_id: x.from_owner && r.anonymous ? null : x.author_id }));
      return delay({ request: viewReq(r, m), messages: msgs });
    },
    async addMessage(id, body) {
      const m = me(), r = S.requests.find(x => x.id === id);
      need(r && AL.canSeeRequest(m, r, r.owner_id === m.id));
      need(body && body.trim(), 'INVALID');
      const owner = r.owner_id === m.id;
      if (owner) {
        need(r.status !== 'closed', 'CLOSED');
        need(!['full', 'readonly'].includes(AL.blockOf(m)), 'BLOCKED');
        if (r.status === 'need_info') r.status = 'in_progress';
      } else {
        r.first_response_at = r.first_response_at || now();
        if (r.status === 'new') r.status = 'in_progress';
      }
      S.messages.push({ id: uid(), request_id: id, author_id: m.id, from_owner: owner, body: body.trim(), created_at: now() });
      r.updated_at = now(); save();
    },
    async setStatus(id, status) {
      const m = me(), r = S.requests.find(x => x.id === id);
      need(r && AL.canSeeRequest(m, r, false) && r.owner_id !== m.id);
      r.status = status; r.updated_at = now(); r.first_response_at = r.first_response_at || now();
      r.closed_at = status === 'closed' ? now() : null; save();
    },

    async onboarding() {
      const m = me();
      return delay(S.onboarding.filter(o => AL.isGlobal(m) || AL.inProjects(m, o.project_id)));
    },
    async saveOnboarding(o) {
      const m = me();
      need(AL.isGlobal(m) || (['coordinator', 'hr', 'admin_project'].includes(m.role) && AL.inProjects(m, o.project_id)));
      S.onboarding = S.onboarding.filter(x => !(x.project_id === o.project_id && (x.department_id || null) === (o.department_id || null)));
      S.onboarding.push({ id: uid(), ...o, department_id: o.department_id || null, updated_at: now() }); save();
    },

    async users() { const m = me(); return delay(S.users.filter(u => AL.canViewUser(m, u)).map(u => ({ ...u }))); },
    async updateUser(id, o) {
      const m = me(), t = S.users.find(u => u.id === id);
      need(t);
      const onlyStatus = o.role === t.role && o.project_id === t.project_id && o.department_id === t.department_id && o.group_id === t.group_id;
      if (onlyStatus && ['coordinator', 'hr'].includes(m.role) && AL.inProjects(m, t.project_id)) {
        t.status = o.status; audit('user_status', t.id, { status: o.status, name: t.full_name }); save(); return;
      }
      need(AL.canAdminUser(m, t) && AL.assignableRoles(m).includes(o.role));
      if (m.role === 'admin_project') need(AL.inProjects(m, o.project_id));
      Object.assign(t, { role: o.role, project_id: o.project_id || null, department_id: o.department_id || null, group_id: o.group_id || null, position: o.position, status: o.status });
      if (['coordinator', 'hr', 'admin_project'].includes(o.role) && o.project_id && !t.staff_projects.includes(o.project_id)) t.staff_projects.push(o.project_id);
      audit('user_update', t.id, { role: o.role, name: t.full_name }); save();
    },
    async blockUser(id, level, until, reason) {
      const m = me(), t = S.users.find(u => u.id === id);
      need(t && AL.canAdminUser(m, t));
      need(reason && reason.trim(), 'INVALID');
      Object.assign(t, { block_level: level, blocked_until: until, block_reason: reason });
      audit(level === 'none' ? 'unblock' : 'block', t.id, { level, until, reason, name: t.full_name }); save();
    },
    async dismissUser(id, reason) {
      const m = me(), t = S.users.find(u => u.id === id);
      need(t && AL.canDismiss(m, t));
      audit('dismiss', null, { role: t.role, project_id: t.project_id, reason });
      // Знеособлюємо заявки та видаляємо людину й усі прив'язки
      S.requests.forEach(r => { if (r.owner_id === id) { r.owner_id = null; } });
      S.messages.forEach(x => { if (x.author_id === id) x.author_id = null; });
      S.tasks = S.tasks.filter(x => x.assignee_id !== id);
      S.reads = S.reads.filter(x => x.user_id !== id);
      S.poll_voters = S.poll_voters.filter(x => x.user_id !== id);
      S.users = S.users.filter(u => u.id !== id); save();
    },

    async invites() {
      const m = me();
      return delay(S.invites.filter(i => AL.isGlobal(m) || (AL.can.invites(m) && AL.inProjects(m, i.project_id))).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    },
    async createInvite(o) {
      const m = me();
      need(AL.isGlobal(m) || (AL.can.invites(m) && AL.inProjects(m, o.project_id)));
      need(AL.inviteRoles(m).includes(o.role));
      const code = Math.random().toString(36).slice(2, 10).toUpperCase();
      const fn = o.role === 'partner' ? null : (o.work_function || ({ worker: 'production', leader: 'production', coordinator: 'coordination', hr: 'hr' })[o.role] || null);
      S.invites.push({ code, work_function: fn, project_id: o.project_id, department_id: o.department_id || null, group_id: o.group_id || null, role: o.role, position: o.position || null, newcomer: !!o.newcomer, max_uses: o.max_uses || 500, uses: 0, expires_at: o.days ? new Date(Date.now() + o.days * 864e5).toISOString() : null, created_by: m.id, created_at: now() });
      audit('invite_create', null, { code, role: o.role }); save(); return code;
    },
    async createProject(name) { need(AL.isGlobal(me())); const id = uid(); S.projects.push({ id, name }); audit('project_create', id, { name }); save(); return id; },
    async createDepartment(pid, name) { const m = me(); need(AL.isGlobal(m) || (m.role === 'admin_project' && AL.inProjects(m, pid))); S.departments.push({ id: uid(), project_id: pid, name }); save(); },
    async createGroup(did, name) { const m = me(), d = S.departments.find(x => x.id === did); need(d && (AL.isGlobal(m) || (m.role === 'admin_project' && AL.inProjects(m, d.project_id)))); S.groups.push({ id: uid(), department_id: did, name }); save(); },

    async analytics(pid) {
      const m = me();
      need(AL.isGlobal(m) || (pid && ['admin_project', 'coordinator', 'hr', 'manager'].includes(m.role) && AL.inProjects(m, pid)));
      const us = S.users.filter(u => !pid || u.project_id === pid);
      const rq = S.requests.filter(r => !pid || r.project_id === pid);
      const an = S.announcements.filter(a => !pid || a.project_id === pid);
      const count = (arr, k) => arr.reduce((o, x) => (o[x[k]] = (o[x[k]] || 0) + 1, o), {});
      const resp = rq.filter(r => r.first_response_at).map(r => (new Date(r.first_response_at) - new Date(r.created_at)) / 3600e3);
      return delay({
        users: { total: us.length, newcomers: us.filter(u => u.status === 'newcomer').length, blocked: us.filter(u => AL.blockOf(u) !== 'none').length },
        requests: {
          total: rq.length, open: rq.filter(r => r.status !== 'closed').length,
          last7: rq.filter(r => Date.now() - new Date(r.created_at) < 7 * 864e5).length,
          by_category: count(rq, 'category'), by_status: count(rq, 'status'),
          avg_response_h: resp.length ? Math.round(resp.reduce((a, b) => a + b, 0) / resp.length * 10) / 10 : null,
        },
        announcements: { total: an.length, reads: S.reads.filter(r => an.some(a => a.id === r.announcement_id)).length },
      });
    },
    async audit() { need(AL.isGlobal(me())); return delay(S.audit.map(a => ({ ...a, actor_name: userName(a.actor_id) }))); },
  };
  AL.demoApi = api;
})();
