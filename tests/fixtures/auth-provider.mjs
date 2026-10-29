// Test-only, loopback Supabase Auth contract fixture. It never sends email or runs in the app.
import { createServer } from 'node:http';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { seedState } from '../../src/lib/seed.ts';

const users = new Map();
const refreshTokens = new Map();
const revoked = new Set();
const key = 'gamazon-local-auth-contract-fixture';
const appOrigin = 'http://127.0.0.1:3001';
function token(user) {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      aal: 'aal1',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  const payload = `${head}.${body}`;
  return `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}`;
}
function identity(member) {
  return {
    id: member.id,
    email: member.email,
    aud: 'authenticated',
    role: 'authenticated',
    email_confirmed_at: member.verified ? new Date().toISOString() : undefined,
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
  };
}
function session(member) {
  const refresh = randomUUID();
  refreshTokens.set(refresh, member);
  return {
    access_token: token(member),
    refresh_token: refresh,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: identity(member),
  };
}
function authenticated(request) {
  const access = (request.headers.authorization || '').replace(/^Bearer /, '');
  if (revoked.has(access)) return null;
  const [head, body, signature] = access.split('.');
  if (!head || !body || !signature) return null;
  const expected = createHmac('sha256', key).update(`${head}.${body}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (claims.exp <= Date.now() / 1000) return null;
    return [...users.values()].find((user) => user.id === claims.sub) || null;
  } catch {
    return null;
  }
}
const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', appOrigin);
  response.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  );
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Cache-Control', 'no-store');
  const send = (status, data) => {
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(data));
  };
  if (request.method === 'OPTIONS') return send(200, {});
  try {
    const url = new URL(request.url, 'http://127.0.0.1:54329');
    let raw = '';
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 12000) return send(413, { message: 'Request too large' });
    }
    const data = raw ? JSON.parse(raw) : {};
    if (url.pathname === '/__test__/health') return send(200, { ok: true });
    if (url.pathname === '/__test__/member' && request.method === 'POST') {
      if (!data.email?.endsWith('.test'))
        return send(400, { error: 'Use a fictional .test email.' });
      const member = {
        id: randomUUID(),
        email: data.email.toLowerCase(),
        status: data.status || 'none',
        role: data.role === 'admin' ? 'admin' : 'member',
        verified: false,
        invite: data.invite || randomUUID(),
        codes: 0,
        name: 'Test member',
        area: 'Test area',
      };
      users.set(member.email, member);
      return send(200, { email: member.email, invite: member.invite });
    }
    if (url.pathname === '/auth/v1/otp') {
      const member = users.get(data.email?.toLowerCase());
      if (!member || (!data.create_user && member.status === 'none'))
        return send(400, {
          msg: 'No account found. Use your invitation to sign up.',
          code: 'user_not_found',
        });
      member.codes++;
      return send(200, {});
    }
    if (url.pathname === '/auth/v1/verify') {
      const member = users.get(data.email?.toLowerCase());
      if (!member || !member.codes || data.token !== '654321')
        return send(403, { msg: 'That code is invalid or has expired.', code: 'otp_expired' });
      member.verified = true;
      return send(200, session(member));
    }
    if (url.pathname === '/auth/v1/token') {
      const member = refreshTokens.get(data.refresh_token);
      return member ? send(200, session(member)) : send(400, { msg: 'Session expired.' });
    }
    const member = authenticated(request);
    if (!member) return send(401, { message: 'Sign in required.', code: 'session_not_found' });
    if (url.pathname === '/auth/v1/user') return send(200, identity(member));
    if (url.pathname === '/auth/v1/logout') {
      revoked.add(request.headers.authorization.replace(/^Bearer /, ''));
      for (const [refresh, owner] of refreshTokens)
        if (owner === member) refreshTokens.delete(refresh);
      return send(200, {});
    }
    if (url.pathname === '/rest/v1/rpc/my_membership_status')
      return send(200, member.status === 'none' ? null : member.status);
    if (url.pathname === '/rest/v1/memberships') {
      const rows = member.status === 'active' ? [{ role: member.role, status: member.status }] : [];
      return send(
        200,
        request.headers.accept?.includes('vnd.pgrst.object') ? rows[0] || null : rows,
      );
    }
    if (url.pathname === '/rest/v1/rpc/redeem_invite') {
      if (
        member.status !== 'none' ||
        member.invite !== data.token ||
        !data.adult ||
        !data.rules ||
        !data.display_name?.trim() ||
        !data.neighbourhood?.trim()
      )
        return send(400, {
          code: 'P0001',
          message: 'This invitation is invalid, expired, or already used.',
        });
      member.status = 'active';
      member.name = data.display_name;
      member.area = data.neighbourhood;
      return send(200, null);
    }
    if (url.pathname === '/rest/v1/rpc/flush_outbox') return send(200, null);
    if (url.pathname === '/rest/v1/rpc/can_delete_community_account')
      return send(200, member.status === 'active' && member.role !== 'admin');
    if (url.pathname === '/rest/v1/rpc/app_snapshot') {
      if (member.status !== 'active')
        return send(403, { code: 'P0001', message: 'An active community membership is required.' });
      const state = seedState();
      state.profiles.push({
        ...state.profiles[0],
        id: member.id,
        name: member.name,
        area: member.area,
      });
      return send(200, {
        ...state,
        me: member.id,
        demo: false,
        memberships: [
          {
            id: member.id,
            status: 'active',
            role: member.role,
            joined_at: new Date().toISOString(),
          },
        ],
        conversations: [],
        messages: [],
        notifications: [],
        cursors: [],
        blocks: [],
        reports: [],
        moderation: [],
        invites: [],
        outcomes: [],
      });
    }
    return send(404, { message: 'Unsupported test-provider endpoint.' });
  } catch {
    return send(500, { message: 'Auth fixture request failed.' });
  }
});
server.listen(54329, '127.0.0.1', () => console.log('Local auth contract fixture ready.'));
