/* ALIMAT Connect — спільні правила доступу (дзеркало правил у базі даних).
   У робочій версії остаточне рішення приймає база (RLS + RPC), тут — лише для інтерфейсу і демо. */
(function () {
  const GLOBAL = ['admin_global', 'superadmin'];
  const ROLES = ['worker', 'partner', 'leader', 'manager', 'coordinator', 'hr', 'admin_project', 'admin_global', 'superadmin'];
  const CATEGORIES = ['day_off', 'sick', 'vacation', 'housing', 'salary', 'complaint', 'newcomer_question'];
  const LEAVE = ['day_off', 'sick', 'vacation'];
  const NO_LIMIT = ['sick', 'newcomer_question'];
  const LIMIT_MS = 2 * 60 * 60 * 1000;
  const FUNCTIONS = ['recruitment', 'legal', 'hr', 'coordination', 'marketing', 'office', 'production'];
  const NOT_STAFF = ['worker', 'partner'];

  function blockOf(p) {
    if (!p || !p.block_level || p.block_level === 'none') return 'none';
    if (p.blocked_until && new Date(p.blocked_until) <= new Date()) return 'none';
    return p.block_level;
  }
  const isGlobal = me => !!me && GLOBAL.includes(me.role) && blockOf(me) !== 'full';
  function myProjects(me) {
    if (!me) return [];
    const s = new Set(me.staff_projects || []);
    if (me.project_id) s.add(me.project_id);
    return [...s];
  }
  const inProjects = (me, pid) => !!pid && myProjects(me).includes(pid);

  function canViewUser(me, t) {
    if (!me || blockOf(me) === 'full') return false;
    if (t.id === me.id || GLOBAL.includes(me.role)) return true;
    if (['admin_project', 'coordinator', 'hr'].includes(me.role)) return inProjects(me, t.project_id);
    if (me.role === 'manager') return t.project_id === me.project_id;
    if (me.role === 'leader') return !!me.group_id && t.group_id === me.group_id;
    return false;
  }

  function inAudience(me, a) {
    if (!me || blockOf(me) === 'full') return false;
    if (a.author_id === me.id || a.scope === 'all' || GLOBAL.includes(me.role)) return true;
    if (['admin_project', 'coordinator', 'hr'].includes(me.role) && inProjects(me, a.project_id)) return true;
    if (me.role === 'manager' && a.project_id === me.project_id) return true;
    return (a.scope === 'project' && a.project_id === me.project_id) ||
      (a.scope === 'department' && a.department_id === me.department_id) ||
      (a.scope === 'group' && a.group_id === me.group_id);
  }

  function canTarget(me, scope, pid, did, gid) {
    if (!me || blockOf(me) !== 'none') return false;
    if (GLOBAL.includes(me.role)) return true;
    if (scope === 'all') return false;
    if (['coordinator', 'admin_project'].includes(me.role)) return inProjects(me, pid);
    if (me.role === 'manager') return pid === me.project_id;
    if (me.role === 'leader') return scope === 'group' && gid === me.group_id;
    return false;
  }

  // Матриця видимості заявок
  function canSeeRequest(me, r, isOwner) {
    if (!me || blockOf(me) === 'full') return false;
    if (isOwner || GLOBAL.includes(me.role)) return true;
    const inp = inProjects(me, r.project_id);
    if (me.role === 'admin_project' && inp) return true;
    if (LEAVE.includes(r.category)) {
      return (me.role === 'leader' && me.group_id === r.group_id) ||
        (me.role === 'manager' && me.project_id === r.project_id) ||
        (['coordinator', 'hr'].includes(me.role) && inp);
    }
    if (r.category === 'housing') return me.role === 'coordinator' && inp;
    if (r.category === 'salary' || r.category === 'newcomer_question') return ['coordinator', 'hr'].includes(me.role) && inp;
    if (r.category === 'complaint') {
      if (['manager', 'coordinator'].includes(r.complaint_target)) return false;
      return me.role === 'coordinator' && inp;
    }
    return false;
  }

  // Хто побачить заявку (підказка працівнику перед відправкою)
  function audienceRoles(category, target) {
    if (LEAVE.includes(category)) return ['leader', 'manager', 'coordinator', 'hr'];
    if (category === 'housing') return ['coordinator'];
    if (category === 'salary' || category === 'newcomer_question') return ['coordinator', 'hr'];
    if (category === 'complaint') return ['manager', 'coordinator'].includes(target) ? [] : ['coordinator'];
    return [];
  }

  function canAdminUser(me, t) {
    if (!me || blockOf(me) !== 'none' || t.id === me.id) return false;
    if (me.role === 'superadmin') return true;
    if (me.role === 'admin_global') return !GLOBAL.includes(t.role);
    if (me.role === 'admin_project') return inProjects(me, t.project_id) && !['admin_project', ...GLOBAL].includes(t.role);
    return false;
  }
  function canDismiss(me, t) {
    if (!me || blockOf(me) !== 'none' || t.id === me.id) return false;
    if (['hr', 'admin_project'].includes(me.role)) return inProjects(me, t.project_id) && ['worker', 'leader', 'manager'].includes(t.role);
    if (me.role === 'admin_global') return !GLOBAL.includes(t.role);
    return me.role === 'superadmin';
  }
  function canMarkActive(me, t) {
    if (t.status !== 'newcomer' || blockOf(me) !== 'none') return false;
    return (['coordinator', 'hr'].includes(me.role) && inProjects(me, t.project_id)) || canAdminUser(me, t);
  }
  function assignableRoles(me) {
    if (me.role === 'superadmin') return ROLES;
    if (me.role === 'admin_global') return ROLES.filter(r => r !== 'superadmin');
    if (me.role === 'admin_project') return ['worker', 'leader', 'manager', 'coordinator', 'hr'];
    return [];
  }
  // Особові документи людини t (дзеркало app_personal_access у базі)
  function canPersonalDocs(me, t, edit) {
    if (!me || !t || blockOf(me) === 'full') return false;
    if (edit && blockOf(me) !== 'none') return false;
    if (t.id === me.id || GLOBAL.includes(me.role)) return true;
    if (['hr', 'admin_project', 'coordinator'].includes(me.role) && inProjects(me, t.project_id)) return true;
    return ['legal', 'hr'].includes(me.work_function) && me.role !== 'partner';
  }
  function inviteRoles(me) {
    if (me.role === 'superadmin') return ROLES;
    if (me.role === 'admin_global') return ROLES.filter(r => r !== 'superadmin');
    if (me.role === 'admin_project') return ['worker', 'leader', 'manager', 'coordinator', 'hr'];
    if (['coordinator', 'hr'].includes(me.role)) return ['worker', 'leader'];
    return [];
  }

  const can = {
    post: me => ['leader', 'manager', 'coordinator', 'admin_project', ...GLOBAL].includes(me.role) && blockOf(me) === 'none',
    task: me => ['leader', 'manager', 'coordinator', 'hr', 'admin_project', ...GLOBAL].includes(me.role) && blockOf(me) === 'none',
    inbox: me => !NOT_STAFF.includes(me.role),
    people: me => !NOT_STAFF.includes(me.role),
    requests: me => me.role !== 'partner',
    createGuide: me => blockOf(me) === 'none' && (GLOBAL.includes(me.role) || (me.work_function === 'hr' && me.role !== 'partner')),
    analytics: me => ['manager', 'coordinator', 'hr', 'admin_project', ...GLOBAL].includes(me.role),
    onboarding: me => ['coordinator', 'hr', 'admin_project', ...GLOBAL].includes(me.role),
    invites: me => ['coordinator', 'hr', 'admin_project', ...GLOBAL].includes(me.role),
    structure: me => ['admin_project', ...GLOBAL].includes(me.role),
    audit: me => GLOBAL.includes(me.role),
    pollResults: (me, p) => p.author_id === me.id || GLOBAL.includes(me.role) ||
      (['admin_project', 'coordinator', 'manager'].includes(me.role) && inProjects(me, p.project_id)),
  };

  function nextAllowedAt(myRequests) {
    const last = myRequests.filter(r => !NO_LIMIT.includes(r.category))
      .map(r => new Date(r.created_at).getTime()).sort((a, b) => b - a)[0];
    return last ? new Date(last + LIMIT_MS) : null;
  }

  window.AL = window.AL || {};
  Object.assign(window.AL, {
    ROLES, CATEGORIES, LEAVE, NO_LIMIT, LIMIT_MS, GLOBAL, FUNCTIONS, canPersonalDocs,
    blockOf, isGlobal, myProjects, inProjects, canViewUser, inAudience, canTarget, canSeeRequest,
    audienceRoles, canAdminUser, canDismiss, canMarkActive, assignableRoles, inviteRoles, can, nextAllowedAt,
  });
})();
