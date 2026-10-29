import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, afterEach, afterAll, describe, it, expect } from 'vitest';
import { ids } from '../src/lib/seed';
let db: PGlite;
const post = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  thread = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  message = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
async function as(user: string, aal = 'aal1') {
  await db.exec('reset role; set role authenticated;');
  await db.query("select set_config('request.jwt.claims',$1,true)", [
    JSON.stringify({ sub: user, aal, role: 'authenticated' }),
  ]);
}
async function cmd(command: Record<string, unknown>) {
  return (
    await db.query<{ result: Record<string, unknown> }>(
      'select public.app_command($1::jsonb) as result',
      [JSON.stringify(command)],
    )
  ).rows[0].result;
}
async function save<T>(fn: () => Promise<T>) {
  await db.exec('savepoint check_action');
  try {
    const r = await fn();
    await db.exec('release savepoint check_action');
    return r;
  } catch (e) {
    await db.exec('rollback to savepoint check_action;release savepoint check_action;');
    throw e;
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claims',true)::jsonb->>'sub','')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to authenticated,anon,service_role;grant execute on all functions in schema auth to authenticated,anon,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,created_at timestamptz default now());alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select on storage.objects to authenticated;`);
  for (const file of [
    '001_community.sql',
    '002_media_operations.sql',
    '003_api.sql',
    '004_listing_arrangements.sql',
    '005_single_admin.sql',
  ])
    await db.exec(readFileSync(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
  for (const [i, id] of Object.values(ids).entries()) {
    await db.query('insert into auth.users values($1,$2,now())', [id, `member${i}@example.com`]);
    await db.query('insert into public.memberships(id,role) values($1,$2)', [
      id,
      i === 0 ? 'admin' : 'member',
    ]);
    await db.query('insert into public.profiles(id,name,area) values($1,$2,$3)', [
      id,
      `Member ${i}`,
      'Indiranagar',
    ]);
  }
  await db.query(
    "insert into posts(id,owner_id,title,platform,generation,format,kind,condition,area,description,drive_required,download_required,code_required) values($1,$2,'Zelda','Nintendo','Switch','Cartridge','offer','Good','Indiranagar','Original copy',false,false,false)",
    [post, ids.asha],
  );
  await db.query(
    "insert into conversations(id,from_id,to_id,post_id,status) values($1,$2,$3,$4,'active')",
    [thread, ids.asha, ids.me, post],
  );
  await db.query(
    "insert into messages(id,conversation_id,sender_id,body) values($1,$2,$3,'Private hello')",
    [message, thread, ids.asha],
  );
});
beforeEach(async () => {
  await db.exec('begin;');
});
afterEach(async () => {
  await db.exec('rollback;reset role;');
});
afterAll(async () => {
  await db?.close();
});
describe('PostgreSQL migrations, RLS and command authorization', () => {
  it('stores arrangements, permits owner edits, and keeps the previous command RPC private', async () => {
    await as(ids.me);
    const listing = {
      title: 'Returnal',
      platform: 'PlayStation',
      generation: 'PS5',
      format: 'Disc',
      kind: 'offer',
      condition: 'Good',
      area: 'Local area',
      description: '',
      price: 1200,
      drive_required: true,
      download_required: false,
      code_required: false,
      exchange_modes: ['sale', 'swap'],
    };
    const request_id = randomUUID();
    const created = await cmd({ type: 'post.create', request_id, ...listing });
    expect((await cmd({ type: 'post.create', request_id, ...listing })).id).toBe(created.id);
    expect((await db.query('select id from posts where id=$1', [created.id])).rows).toHaveLength(1);
    await cmd({
      type: 'post.update',
      id: created.id,
      ...listing,
      title: 'Returnal with case',
      exchange_modes: ['loan'],
      price: null,
    });
    const saved = (
      await db.query<{ title: string; exchange_modes: string[] }>(
        'select title, exchange_modes from posts where id=$1',
        [created.id],
      )
    ).rows[0];
    expect(saved.title).toBe('Returnal with case');
    expect(saved.exchange_modes).toEqual(['loan']);
    await expect(
      save(() =>
        cmd({ type: 'post.update', id: created.id, ...listing, exchange_modes: ['loan'] }),
      ),
    ).rejects.toThrow('asking price');
    await expect(
      save(() => cmd({ type: 'post.create', ...listing, exchange_modes: ['sale', 'sale'] })),
    ).rejects.toThrow('once');
    await expect(
      save(() =>
        db.query('select public.app_command_v1($1::jsonb)', [
          JSON.stringify({ type: 'post.delete', id: created.id }),
        ]),
      ),
    ).rejects.toThrow('permission');
    await as(ids.asha);
    await expect(
      save(() => cmd({ type: 'post.update', id: created.id, ...listing })),
    ).rejects.toThrow('not found');
  });
  it('reports only the current identity’s membership, including suspension, without granting data access', async () => {
    await db.query("update memberships set status='suspended' where id=$1", [ids.asha]);
    await as(ids.asha);
    expect(
      (await db.query<{ value: string }>('select my_membership_status() value')).rows[0].value,
    ).toBe('suspended');
    expect((await db.query('select * from posts')).rows).toHaveLength(0);
    await expect(save(() => db.query('select app_snapshot()'))).rejects.toThrow('membership');
  });
  it('allows only one administrator and protects that account from deletion', async () => {
    await as(ids.me);
    expect(
      (await db.query<{ allowed: boolean }>('select can_delete_community_account() allowed'))
        .rows[0].allowed,
    ).toBe(false);
    await db.exec('reset role');
    await expect(
      save(() => db.query("update memberships set role='admin' where id=$1", [ids.rohan])),
    ).rejects.toThrow('memberships_single_admin');
    await db.query("update memberships set status='suspended' where id=$1", [ids.me]);
    await expect(
      save(() => db.query("update memberships set role='admin' where id=$1", [ids.rohan])),
    ).rejects.toThrow('memberships_single_admin');
    await db.query("update memberships set status='active' where id=$1", [ids.me]);
    await as(ids.me, 'aal2');
    await expect(
      save(() => cmd({ type: 'account.delete', confirmation: 'DELETE' })),
    ).rejects.toThrow('last administrator');
    await as(ids.rohan);
    expect(
      (await db.query<{ allowed: boolean }>('select can_delete_community_account() allowed'))
        .rows[0].allowed,
    ).toBe(true);
    await cmd({ type: 'account.delete', confirmation: 'DELETE' });
    expect((await db.query('select * from profiles where id=$1', [ids.rohan])).rows).toHaveLength(
      0,
    );
  });
  it('denies admin data and commands to ordinary members even with MFA', async () => {
    await as(ids.me, 'aal2');
    const invitation = await cmd({ type: 'invite.create', email: 'private@example.com' });
    await cmd({ type: 'report', target_type: 'post', target_id: post, reason: 'Owner report' });
    await as(ids.rohan, 'aal2');
    await expect(save(() => db.query('select * from invites'))).rejects.toThrow('permission');
    expect(
      (await db.query<{ value: unknown[] }>('select admin_invites() value')).rows[0].value,
    ).toEqual([]);
    expect((await db.query('select * from reports')).rows).toHaveLength(0);
    expect((await db.query('select * from moderation')).rows).toHaveLength(0);
    for (const command of [
      { type: 'invite.create', email: 'intrusion@example.com' },
      { type: 'invite.revoke', id: invitation.id },
      { type: 'moderate', report_id: randomUUID(), action: 'dismiss', note: 'Intrusion' },
    ])
      await expect(save(() => cmd(command))).rejects.toThrow('MFA');
    await expect(save(() => db.query('select pilot_metrics()'))).rejects.toThrow('MFA');
    await expect(save(() => db.query('select pilot_activity()'))).rejects.toThrow('MFA');
  });
  it('returns a member snapshot with no token hashes or other memberships', async () => {
    await as(ids.me);
    const r = await db.query<{
      data: { memberships: unknown[]; messages: unknown[]; invites: unknown[] };
    }>('select app_snapshot() data');
    expect(r.rows[0].data.memberships).toHaveLength(1);
    expect(r.rows[0].data.messages).toHaveLength(1);
    expect(JSON.stringify(r.rows[0].data.invites)).not.toContain('token_hash');
  });
  it('denies anonymous reads and all direct member mutations', async () => {
    await db.exec('set role anon');
    await expect(save(() => db.query('select * from posts'))).rejects.toThrow();
    await as(ids.me);
    await expect(save(() => db.query("update memberships set role='admin'"))).rejects.toThrow();
    await expect(
      save(() => db.query("insert into posts(title) values('bypass')")),
    ).rejects.toThrow();
  });
  it('prevents a third member from reading or sending private messages', async () => {
    await as(ids.rohan);
    expect((await db.query('select * from messages')).rows).toHaveLength(0);
    expect((await db.query('select * from conversations')).rows).toHaveLength(0);
    await expect(
      save(() =>
        cmd({
          type: 'message.send',
          conversation_id: thread,
          body: 'intrusion',
          message_id: randomUUID(),
        }),
      ),
    ).rejects.toThrow('unavailable');
    await expect(
      save(() =>
        cmd({
          type: 'report',
          target_type: 'message',
          target_id: message,
          reason: 'try to expose',
        }),
      ),
    ).rejects.toThrow('not found');
  });
  it('keeps administrator inbox access restricted even at AAL2', async () => {
    await as(ids.rohan);
    await cmd({
      type: 'conversation.start',
      user_id: ids.neha,
      post_id: null,
      body: 'Private request',
      message_id: randomUUID(),
    });
    await as(ids.me, 'aal2');
    expect(
      (await db.query("select * from messages where body='Private request'")).rows,
    ).toHaveLength(0);
  });
  it('requires a recipient to accept and persists messages idempotently', async () => {
    await as(ids.me);
    const r = await cmd({
      type: 'conversation.start',
      user_id: ids.rohan,
      post_id: null,
      body: 'Hello',
      message_id: randomUUID(),
    });
    await expect(
      save(() =>
        cmd({
          type: 'message.send',
          conversation_id: r.id,
          body: 'Again',
          message_id: randomUUID(),
        }),
      ),
    ).rejects.toThrow('accepted');
    await expect(
      save(() => cmd({ type: 'conversation.respond', id: r.id, accept: true })),
    ).rejects.toThrow('recipient');
    await as(ids.rohan);
    await cmd({ type: 'conversation.respond', id: r.id, accept: true });
    await as(ids.me);
    const mid = randomUUID();
    await cmd({ type: 'message.send', conversation_id: r.id, body: 'Thanks', message_id: mid });
    await cmd({ type: 'message.send', conversation_id: r.id, body: 'Thanks', message_id: mid });
    expect((await db.query('select * from messages where id=$1', [mid])).rows).toHaveLength(1);
  });
  it('enforces blocking through reads, writes, and message RLS', async () => {
    await as(ids.me);
    await cmd({ type: 'block', user_id: ids.asha });
    expect((await db.query('select * from posts')).rows).toHaveLength(0);
    expect((await db.query('select * from messages')).rows).toHaveLength(0);
    await as(ids.asha);
    await expect(
      save(() =>
        cmd({
          type: 'message.send',
          conversation_id: thread,
          body: 'Blocked',
          message_id: randomUUID(),
        }),
      ),
    ).rejects.toThrow('unavailable');
  });
  it('suspends existing sessions immediately at the database', async () => {
    await db.query("update memberships set status='suspended' where id=$1", [ids.asha]);
    await as(ids.asha);
    expect((await db.query('select * from profiles')).rows).toHaveLength(0);
    await expect(save(() => db.query('select app_snapshot()'))).rejects.toThrow('membership');
    await expect(
      save(() => cmd({ type: 'post.status', id: post, status: 'closed' })),
    ).rejects.toThrow('membership');
  });
  it('protects ownership, comment depth, and compatibility', async () => {
    await as(ids.me);
    await expect(
      save(() => cmd({ type: 'post.status', id: post, status: 'closed' })),
    ).rejects.toThrow('not found');
    const c = await cmd({ type: 'comment.add', post_id: post, parent_id: null, body: 'Hello' });
    const reply = await cmd({ type: 'comment.add', post_id: post, parent_id: c.id, body: 'Reply' });
    await expect(
      save(() => cmd({ type: 'comment.add', post_id: post, parent_id: reply.id, body: 'Nested' })),
    ).rejects.toThrow('top-level');
    await expect(
      save(() =>
        cmd({
          type: 'post.create',
          title: 'Game',
          platform: 'PlayStation',
          generation: 'PS5',
          format: 'Cartridge',
          kind: 'offer',
          condition: 'Good',
          area: 'Local',
          description: 'Original copy',
          price: null,
          download_required: false,
          code_required: false,
        }),
      ),
    ).rejects.toThrow();
  });
  it('requires admin MFA and uses single-use email-bound invites', async () => {
    await as(ids.me);
    await expect(
      save(() => cmd({ type: 'invite.create', email: 'new@example.com' })),
    ).rejects.toThrow('MFA');
    await as(ids.me, 'aal2');
    const r = await cmd({ type: 'invite.create', email: 'new@example.com' });
    const newcomer = randomUUID();
    await db.exec('reset role');
    await db.query('insert into auth.users values($1,$2,now())', [newcomer, 'new@example.com']);
    await as(newcomer);
    await db.query('select redeem_invite($1,$2,$3,true,true)', [r.token, 'New member', 'Local']);
    expect((await db.query('select * from memberships')).rows).toHaveLength(1);
    await expect(
      save(() =>
        db.query('select redeem_invite($1,$2,$3,true,true)', [r.token, 'New member', 'Local']),
      ),
    ).rejects.toThrow('invalid');
  });
  it('rejects expired, revoked and wrong-email invitations', async () => {
    await as(ids.me, 'aal2');
    const r = await cmd({ type: 'invite.create', email: 'new@example.com' });
    await as(ids.neha);
    await expect(
      save(() => db.query('select redeem_invite($1,$2,$3,true,true)', [r.token, 'New', 'Local'])),
    ).rejects.toThrow('invalid');
    await db.exec('reset role');
    const newcomer = randomUUID();
    await db.query('insert into auth.users values($1,$2,now())', [newcomer, 'new@example.com']);
    await db.query("update invites set expires_at=now()-interval '1 second' where id=$1", [r.id]);
    await as(newcomer);
    await expect(
      save(() => db.query('select redeem_invite($1,$2,$3,true,true)', [r.token, 'New', 'Local'])),
    ).rejects.toThrow('invalid');
    await db.exec('reset role');
    await db.query(
      "update invites set expires_at=now()+interval '1 day',revoked=true where id=$1",
      [r.id],
    );
    await as(newcomer);
    await expect(
      save(() => db.query('select redeem_invite($1,$2,$3,true,true)', [r.token, 'New', 'Local'])),
    ).rejects.toThrow('invalid');
  });
  it('retries the outbox without duplicate notifications', async () => {
    await as(ids.me);
    await cmd({ type: 'comment.add', post_id: post, parent_id: null, body: 'Thanks!' });
    await db.query('select flush_outbox()');
    await db.exec('reset role');
    await db.query('update outbox set delivered_at=null');
    await as(ids.asha);
    await db.query('select flush_outbox()');
    expect((await db.query('select * from notifications')).rows).toHaveLength(1);
  });
  it('does not reveal private outcomes but computes mutual confirmations', async () => {
    await as(ids.me);
    await cmd({ type: 'outcome', conversation_id: thread, exchanged: true });
    await as(ids.asha);
    expect((await db.query('select * from outcomes')).rows).toHaveLength(0);
    await cmd({ type: 'outcome', conversation_id: thread, exchanged: true });
    await as(ids.me, 'aal2');
    const r = await db.query<{ m: { mutually_confirmed_exchanges: number } }>(
      'select pilot_metrics() m',
    );
    expect(r.rows[0].m.mutually_confirmed_exchanges).toBe(1);
  });
  it('retains reported evidence, requires MFA and records decisions', async () => {
    await as(ids.me);
    const r = await cmd({
      type: 'report',
      target_type: 'message',
      target_id: message,
      reason: 'Please review',
    });
    await expect(
      save(() => cmd({ type: 'moderate', report_id: r.id, action: 'remove', note: 'Reviewed' })),
    ).rejects.toThrow('MFA');
    await as(ids.me, 'aal2');
    await cmd({ type: 'moderate', report_id: r.id, action: 'remove', note: 'Reviewed' });
    expect((await db.query('select * from messages')).rows).toHaveLength(0);
    expect(
      (await db.query<{ evidence: string }>('select evidence from reports')).rows[0].evidence,
    ).toBe('Private hello');
    expect((await db.query('select * from moderation')).rows).toHaveLength(1);
  });
  it('serves media only to active unblocked members and prevents direct uploads', async () => {
    await db.query('insert into images values($1,$2,$3,$4)', [
      randomUUID(),
      post,
      ids.asha,
      'photo.webp',
    ]);
    await db.query(
      "insert into storage.objects(bucket_id,name) values('post-images','photo.webp')",
    );
    await as(ids.me);
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(1);
    await expect(
      save(() =>
        db.query("insert into storage.objects(bucket_id,name) values('post-images','raw.webp')"),
      ),
    ).rejects.toThrow();
    await cmd({ type: 'block', user_id: ids.asha });
    expect((await db.query('select * from storage.objects')).rows).toHaveLength(0);
    await expect(
      save(() =>
        db.query('select attach_image($1,$2,$3,$4)', [randomUUID(), post, 'forged', ids.asha]),
      ),
    ).rejects.toThrow();
  });
  it('deletes community content and queues identity and photo cleanup', async () => {
    await db.query('insert into images values($1,$2,$3,$4)', [
      randomUUID(),
      post,
      ids.asha,
      'photo.webp',
    ]);
    await as(ids.me);
    await expect(
      save(() => cmd({ type: 'account.delete', confirmation: 'DELETE' })),
    ).rejects.toThrow('last administrator');
    await as(ids.asha);
    await cmd({ type: 'account.delete', confirmation: 'DELETE' });
    await db.exec('reset role');
    expect((await db.query('select * from profiles where id=$1', [ids.asha])).rows).toHaveLength(0);
    expect((await db.query('select * from posts')).rows).toHaveLength(0);
    expect((await db.query('select * from messages')).rows).toHaveLength(0);
    expect((await db.query('select * from app_private.deletions')).rows).toHaveLength(1);
    expect((await db.query('select * from app_private.media_deletions')).rows).toHaveLength(1);
  });
});
