const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, mocks) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => name in mocks ? mocks[name] : require(name), mod, mod.exports);
  return mod.exports;
}
function profileActions({ column = true, saved = true } = {}) {
  const writes = [];
  const profile = { id: 'profile', auth_user_id: 'user', organization_id: 'church', ...(column ? { share_profile_with_group_leaders: false } : {}) };
  const db = { auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, from(table) {
    let mutation = false;
    const q = { select() { return q; }, eq() { return q; }, update(payload) { mutation = true; writes.push({ table, payload }); return q; },
      upsert: async payload => { writes.push({ table, payload }); return { error: null }; },
      maybeSingle: async () => ({ data: mutation ? saved ? { id: 'profile' } : null : profile, error: null }) };
    return q;
  } };
  const actions = load('app/(member)/member/actions.ts', {
    'next/cache': { revalidatePath() {} }, 'next/navigation': { redirect() {} },
    '@/lib/supabase/server': { createClient: async () => db },
    '@/lib/auth/session': { getUserPermissions: async () => new Set() },
  });
  const form = new FormData(); form.set('first_name', 'Test'); form.set('last_name', 'Member');
  return { actions, writes, form };
}
test('profile edits work against a database awaiting the privacy migration', async () => {
  const { actions, writes, form } = profileActions({ column: false });
  assert.equal((await actions.updateProfile({}, form)).status, 'success');
  assert.equal(Object.hasOwn(writes[0].payload, 'share_profile_with_group_leaders'), false);
});
test('privacy consent is saved when supported and never falsely acknowledged otherwise', async () => {
  for (const column of [true, false]) {
    const { actions, writes, form } = profileActions({ column }); form.set('share_profile_with_group_leaders', 'on');
    const result = await actions.updateProfile({}, form);
    assert.equal(result.status, column ? 'success' : 'error');
    if (column) assert.equal(writes[0].payload.share_profile_with_group_leaders, true);
    else assert.equal(writes.length, 0);
  }
});
test('members cannot change office-controlled status through profile form fields', async () => {
  const { actions, writes, form } = profileActions(); form.set('membership_status', 'member'); form.set('joined_at', '2020-01-01');
  await actions.updateProfile({}, form);
  assert.equal(Object.hasOwn(writes[0].payload, 'membership_status'), false);
  assert.equal(Object.hasOwn(writes[0].payload, 'joined_at'), false);
});
test('zero-row profile writes do not report success', async () => {
  const { actions, form } = profileActions({ saved: false });
  assert.equal((await actions.updateProfile({}, form)).status, 'error');
});
test('saving email preferences leaves push preferences unchanged', async () => {
  const { actions, writes, form } = profileActions();
  await actions.updateNotificationPreferences({}, form);
  assert.equal(Object.hasOwn(writes[0].payload, 'push_enabled'), false);
});
test('staff can open their member home without a redirect back to the staff dashboard', async () => {
  const { NextRequest, NextResponse } = require('next/server');
  const roles = load('lib/auth/roles.ts', {});
  for (const role of ['pastor', 'church_executive', 'secretary', 'member']) {
    const db = { auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, from(table) {
      const q = { select: () => q, eq: () => table === 'user_roles' ? Promise.resolve({ data: [{ roles: { code: role } }] }) : q, maybeSingle: async () => ({ data: { must_change_password: false } }) }; return q;
    } };
    const { updateSession } = load('lib/supabase/middleware.ts', { '@/lib/auth/roles': roles, '@supabase/ssr': { createServerClient: () => db }, 'next/server': { NextResponse } });
    const response = await updateSession(new NextRequest('https://bullbayntcog.org/member'));
    assert.equal(response.headers.get('location'), null, role);
    if (role === 'member') {
      const denied = await updateSession(new NextRequest('https://bullbayntcog.org/admin/people'));
      assert.equal(denied.headers.get('location'), 'https://bullbayntcog.org/member');
    }
  }
});

test('push delivery retries a database failure instead of discarding the pending notification', async () => {
  let acknowledged = false;
  const db = { from(table) {
    const q = { select: () => q, eq: () => q, is: () => q, order: () => q,
      maybeSingle: async () => ({ data: { value: { publicKey: 'public', privateKey: 'private' } } }),
      limit: async () => ({ data: [{ id: 'notice', user_id: 'user', title: 'Assignment' }] }),
      then(resolve) { return Promise.resolve({ data: null, error: { code: '08006', message: 'Connection lost' } }).then(resolve); },
      update() { acknowledged = true; return q; },
    }; return q;
  } };
  const { dispatchPush } = load('lib/push/server.ts', {
    '@/lib/supabase/server': { createServiceRoleClient: () => db },
    '@/lib/calendar/integrations': { seal: x => x, unseal: x => x },
    'web-push': { sendNotification: async () => { throw new Error('Should not send'); } },
  });
  await assert.rejects(dispatchPush(), e => e.code === '08006');
  assert.equal(acknowledged, false);
});
