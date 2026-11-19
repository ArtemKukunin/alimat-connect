/* Робочий сервер: Supabase (PostgreSQL + вхід через email-код).
   Права перевіряє база даних (RLS + функції в supabase/schema.sql). */
(function () {
  const AL = window.AL;
  let sb, uidCache = null, meCache = null;

  function err(e) {
    const msg = (e && (e.message || e.error_description)) || String(e);
    if (msg.startsWith('RATE_LIMIT|')) return new AL.ApiError('RATE_LIMIT', msg.split('|')[1]);
    const code = ['FORBIDDEN', 'BLOCKED', 'INVALID', 'INVITE_INVALID', 'ALREADY_VOTED', 'CLOSED', 'ALREADY_REGISTERED', 'NOT_FOUND', 'TOO_BIG', 'BAD_TYPE', 'NOT_EMPTY', 'DUPLICATE', 'CLAIMED']
      .find(c => msg.includes(c));
    return new AL.ApiError(code || 'ERROR', msg);
  }
  async function q(promise) { const { data, error } = await promise; if (error) throw err(error); return data; }
  const rpc = (fn, args) => q(sb.rpc(fn, args || {}));

  const api = {
    mode: 'live',
    async init(cfg) {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true } });
      // Одноразовий вхід з QR-коду (?login=…): відкрито на телефоні після сканування
      let tk = null;
      try { const u = new URL(location.href); tk = u.searchParams.get('login'); if (tk) { u.searchParams.delete('login'); history.replaceState(null, '', u); } } catch (e) { /* */ }
      if (tk) {
        await sb.auth.signOut({ scope: 'local' }).catch(() => { });
        const v = await sb.auth.verifyOtp({ token_hash: tk, type: 'magiclink' });
        if (v.error) AL.loginLinkError = true;
      }
      const { data } = await sb.auth.getSession();
      uidCache = data.session ? data.session.user.id : null;
      sb.auth.onAuthStateChange((_e, s) => { uidCache = s ? s.user.id : null; meCache = null; });
    },
    async currentUserId() { return uidCache; },
    async sendCode(email) { const back = location.href.split('#')[0]; await q(sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: back } })); },
    async verifyCode(email, token) {
      const d = await q(sb.auth.verifyOtp({ email, token, type: 'email' }));
      uidCache = d.user ? d.user.id : null;
    },
    async signInPassword(email, password) { const { data: d, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new AL.ApiError(/invalid/i.test(error.message) ? 'BAD_LOGIN' : 'ERROR'); uidCache = d.user ? d.user.id : null; },
    // ----- «Увійти як» (лише суперадмін; перевіряє серверна функція impersonate) -----
    async impersonate(email) {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new AL.ApiError('AUTH');
      const r = await sb.functions.invoke('impersonate', { body: { email } });
      if (r.error) { let c = 'ERROR'; try { c = (await r.error.context.json()).error || c; } catch (e) { /* */ } throw new AL.ApiError(c); }
      try { localStorage.setItem('alimat-admin-session', JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token, name: (meCache && meCache.full_name) || session.user.email })); } catch (e) { /* */ }
      const v = await sb.auth.verifyOtp({ token_hash: r.data.token_hash, type: 'magiclink' });
      if (v.error) { localStorage.removeItem('alimat-admin-session'); throw err(v.error); }
      uidCache = v.data.user ? v.data.user.id : null; meCache = null;
      if (uidCache) { const c = await sb.rpc('claim_prepared_account', { p_lang: 'pl' }); if (c.error) console.warn(c.error); }
    },
    async deviceLoginLink() {
      const r = await sb.functions.invoke('impersonate', { body: { self: true } });
      if (r.error) { let c = 'ERROR'; try { c = (await r.error.context.json()).error || c; } catch (e) { /* */ } throw new AL.ApiError(c); }
      return location.origin + location.pathname + '?login=' + encodeURIComponent(r.data.token_hash);
    },
    impersonating() { try { const s = localStorage.getItem('alimat-admin-session'); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
    async stopImpersonation() {
      const s = this.impersonating(); if (!s) return;
      await sb.auth.signOut({ scope: 'local' });
      localStorage.removeItem('alimat-admin-session');
      const r = await sb.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token });
      uidCache = r.data && r.data.user ? r.data.user.id : null; meCache = null;
      if (r.error) throw err(r.error);
    },
    async signOut() { await sb.auth.signOut(); uidCache = null; meCache = null; },

    async inviteInfo(code) { return rpc('get_invite_info', { p_code: String(code || '').toUpperCase().trim() }); },
    async register({ code, full_name, phone, lang }) {
      return rpc('register_with_invite', { p_code: String(code).toUpperCase().trim(), p_full_name: full_name, p_phone: phone, p_lang: lang });
    },

    async me() {
      if (!uidCache) return null;
      const rows = await q(sb.from('profiles').select('*').eq('id', uidCache));
      if (!rows.length) return null;
      const sp = await q(sb.from('staff_projects').select('project_id').eq('user_id', uidCache));
      meCache = { ...rows[0], staff_projects: sp.map(x => x.project_id) };
      return meCache;
    },
    async structure() {
      const [projects, departments, groups] = await Promise.all([
        q(sb.from('projects').select('*').order('name')),
        q(sb.from('departments').select('*').order('name')),
        q(sb.from('groups').select('*').order('name'))]);
      return { projects, departments, groups };
    },
    async setLang(lang) { await rpc('set_my_lang', { p_lang: lang }); },

    async announcements() {
      const [list, reads] = await Promise.all([
        q(sb.from('announcements').select('*').order('created_at', { ascending: false }).limit(200)),
        q(sb.from('announcement_reads').select('announcement_id').eq('user_id', uidCache))]);
      const r = new Set(reads.map(x => x.announcement_id));
      return list.map(a => ({ ...a, read: r.has(a.id) }));
    },
    async markRead(id) { await rpc('mark_read', { p_id: id }); },
    async announcementStats() {
      const rows = await rpc('announcement_stats');
      const out = {}; (rows || []).forEach(x => { out[x.announcement_id] = { reads: Number(x.reads), audience: Number(x.audience) }; });
      return out;
    },
    async createAnnouncement(o) {
      await rpc('create_announcement', { p_scope: o.scope, p_project: o.project_id || null, p_department: o.department_id || null, p_group: o.group_id || null, p_title: o.title, p_body: o.body });
    },

    async polls() {
      const [list, voted] = await Promise.all([
        q(sb.from('polls').select('*').order('created_at', { ascending: false }).limit(100)),
        q(sb.from('poll_voters').select('poll_id').eq('user_id', uidCache))]);
      const v = new Set(voted.map(x => x.poll_id));
      return list.map(p => ({ ...p, voted: v.has(p.id) }));
    },
    async vote(id, idx) { await rpc('vote', { p_poll: id, p_option: idx }); },
    async pollResults(id) { return rpc('poll_results', { p_poll: id }); },
    async createPoll(o) {
      await rpc('create_poll', { p_scope: o.scope, p_project: o.project_id || null, p_department: o.department_id || null, p_group: o.group_id || null, p_question: o.question, p_options: o.options, p_anonymous: !!o.anonymous });
    },

    async tasks() { return q(sb.from('tasks').select('*').order('created_at', { ascending: false }).limit(200)); },
    async createTask(o) { await rpc('create_task', { p_assignee: o.assignee_id, p_title: o.title, p_body: o.body || '', p_due: o.due_date || null }); },
    async completeTask(id) { await rpc('complete_task', { p_task: id }); },

    async requests() {
      const [list, owned] = await Promise.all([
        q(sb.from('requests').select('*').order('created_at', { ascending: false }).limit(500)),
        q(sb.from('request_owners').select('request_id').eq('user_id', uidCache))]);
      const own = new Set(owned.map(x => x.request_id));
      const all = list.map(r => ({ ...r, is_owner: own.has(r.id) }));
      return { mine: all.filter(r => r.is_owner), visible: all.filter(r => !r.is_owner) };
    },
    async nextAllowedAt() { const d = await rpc('next_request_allowed_at'); return d ? new Date(d) : null; },
    async createRequest(o) {
      return rpc('create_request', { p_category: o.category, p_target: o.complaint_target || null, p_anonymous: !!o.anonymous, p_from: o.date_from || null, p_to: o.date_to || null, p_body: o.body });
    },
    async requestDetail(id) {
      const [rows, messages, owned] = await Promise.all([
        q(sb.from('requests').select('*').eq('id', id)),
        q(sb.from('request_messages').select('*').eq('request_id', id).order('created_at')),
        q(sb.from('request_owners').select('request_id').eq('request_id', id))]);
      if (!rows.length) throw new AL.ApiError('FORBIDDEN');
      return { request: { ...rows[0], is_owner: owned.length > 0 }, messages };
    },
    async addMessage(id, body) { await rpc('add_request_message', { p_request: id, p_body: body }); },
    async setStatus(id, status) { await rpc('set_request_status', { p_request: id, p_status: status }); },

    async onboarding() { return q(sb.from('onboarding').select('*')); },
    async saveOnboarding(o) {
      await rpc('save_onboarding', { p_project: o.project_id, p_department: o.department_id || null, p_first_day: o.first_day || null, p_start_time: o.start_time, p_place: o.place, p_instructions: o.instructions, p_contact: o.contact });
    },

    async users() {
      const [list, sp] = await Promise.all([
        q(sb.from('profiles').select('*').order('full_name')),
        AL.isGlobal(meCache) ? q(sb.from('staff_projects').select('*')) : Promise.resolve([])]);
      return list.map(u => ({ ...u, staff_projects: sp.filter(x => x.user_id === u.id).map(x => x.project_id) }));
    },
    async updateUser(id, o) {
      await rpc('update_user', { p_user: id, p_role: o.role, p_project: o.project_id || null, p_department: o.department_id || null, p_group: o.group_id || null, p_position: o.position || null, p_status: o.status });
    },
    async blockUser(id, level, until, reason) { await rpc('block_user', { p_user: id, p_level: level, p_until: until, p_reason: reason }); },
    async dismissUser(id, reason) { await rpc('dismiss_user', { p_user: id, p_reason: reason }); },

    async invites() { return q(sb.from('invites').select('*').order('created_at', { ascending: false })); },
    async createInvite(o) {
      return rpc('create_invite', { p_project: o.project_id, p_department: o.department_id || null, p_group: o.group_id || null, p_role: o.role, p_position: o.position || null, p_newcomer: !!o.newcomer, p_max_uses: o.max_uses || 500, p_days: o.days || null, p_function: o.work_function || null });
    },
    async createProject(name) { return rpc('create_project', { p_name: name }); },
    async createDepartment(pid, name) { return rpc('create_department', { p_project: pid, p_name: name }); },
    async createGroup(did, name) { return rpc('create_group', { p_department: did, p_name: name }); },

    async analytics(pid) { return rpc('analytics', { p_project: pid || null }); },
    async setUserFunction(id, fn) { await rpc('set_user_function', { p_user: id, p_function: fn || null }); },

    // ----- «Важливе»: пам'ятки -----
    async guides(lang) { return rpc('list_guides', { p_lang: lang }); },
    async guide(id, lang) { return rpc('get_guide', { p_id: id, p_lang: lang }); },
    async ackGuide(id) { await rpc('ack_guide', { p_id: id }); },
    async saveGuide(o) {
      return rpc('save_guide', { p_id: o.id || null, p_title: o.title, p_summary: o.summary || null, p_body: o.body_md || '', p_require_ack: !!o.require_ack, p_published: !!o.published, p_new_version: !!o.new_version, p_sort: o.sort || 100 });
    },
    async saveGuideTranslation(id, lang, o) { await rpc('save_guide_translation', { p_guide: id, p_lang: lang, p_title: o.title, p_summary: o.summary || null, p_body: o.body_md || '' }); },
    async deleteGuide(id) { await rpc('delete_guide', { p_id: id }); },
    async guideReport(id) { return rpc('guide_ack_report', { p_id: id }); },

    // ----- доступи -----
    async grants(type, id) { return rpc('object_grants', { p_type: type, p_id: id }); },
    async grant(type, id, subjectType, subject, canEdit) { return rpc('grant_access', { p_type: type, p_id: id, p_subject_type: subjectType, p_subject: subject || '', p_can_edit: !!canEdit }); },
    async findPeople(type, id, q) { return rpc('find_people', { p_type: type, p_id: id, p_query: q }); },
    async revoke(grantId) { await rpc('revoke_access', { p_grant: grantId }); },

    // ----- «Документи» -----
    async folders() { return rpc('list_folders'); },
    async createFolder(parent, name, description) { return rpc('create_folder', { p_parent: parent || null, p_name: name, p_description: description || null }); },
    async deleteFolder(id) { await rpc('delete_folder', { p_id: id }); },
    async documents(folder, owner) { return rpc('list_documents', { p_folder: folder || null, p_owner: owner || null }); },
    async expiring(days) { return rpc('expiring_documents', { p_days: days }); },
    async uploadDocument(o, file) {
      const r = await rpc('begin_upload', { p_folder: o.folder_id || null, p_owner: o.owner_id || null, p_title: o.title, p_doc_type: o.doc_type, p_file_name: file.name, p_mime: file.type || null, p_size: file.size, p_valid_until: o.valid_until || null, p_note: o.note || null });
      const up = await sb.storage.from('documents').upload(r.path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (up.error) throw err(up.error);
      await rpc('finish_upload', { p_id: r.id });
    },
    async openDocument(id) {
      const path = await rpc('open_document', { p_id: id });
      const { data, error } = await sb.storage.from('documents').createSignedUrl(path, 60);
      if (error) throw err(error);
      return data.signedUrl;
    },
    async deleteDocument(id) {
      const path = await rpc('delete_document', { p_id: id });
      await sb.storage.from('documents').remove([path]);
    },
    async documentLog(id) { return rpc('document_log', { p_id: id }); },

    async claimAccount(lang) { return rpc('claim_prepared_account', { p_lang: lang }); },
    async preparedAccounts() { return rpc('list_prepared_accounts'); },
    async savePrepared(o) { return rpc('save_prepared_account', { p_id: o.id || null, p_full_name: o.full_name, p_phone: o.phone, p_emails: o.emails, p_role: o.role, p_function: o.work_function, p_position: o.position || null, p_project: o.project_id, p_projects: o.staff_projects || [] }); },
    async deletePrepared(id) { await rpc('delete_prepared_account', { p_id: id }); },
    async setStaffProjects(id, ids) { await rpc('set_staff_projects', { p_user: id, p_projects: ids }); },
    async myCoordinators() { return rpc('my_coordinators'); },
    async audit() { return q(sb.from('audit_log').select('*').order('id', { ascending: false }).limit(300)); },
  };
  AL.liveApi = api;
})();
