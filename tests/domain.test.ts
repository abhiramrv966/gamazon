import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execute, snapshot, deliverOutbox, join, tokenHash } from '../src/lib/domain';
import { seedState, ids } from '../src/lib/seed';
describe('community rules in the local demo', () => {
  it('requires membership and denies suspended members', () => {
    const s = seedState();
    expect(() => snapshot(s, randomUUID())).toThrow('membership');
    s.memberships[0].status = 'suspended';
    expect(() =>
      execute(s, ids.me, { type: 'post.status', id: s.posts[3].id, status: 'closed' }),
    ).toThrow('membership');
  });
  it('restricts private conversations to their participants', () => {
    const s = seedState();
    expect(snapshot(s, ids.rohan).messages).toHaveLength(0);
    expect(() =>
      execute(s, ids.rohan, {
        type: 'message.send',
        conversation_id: s.conversations[0].id,
        body: 'intrusion',
        message_id: randomUUID(),
      }),
    ).toThrow('unavailable');
  });
  it('allows only one request until the recipient accepts', () => {
    const s = seedState();
    const r = execute(s, ids.me, {
      type: 'conversation.start',
      user_id: ids.rohan,
      post_id: s.posts[2].id,
      body: 'Hello',
      message_id: randomUUID(),
    });
    const cid = r.id as string;
    expect(() =>
      execute(s, ids.me, {
        type: 'message.send',
        conversation_id: cid,
        body: 'Again',
        message_id: randomUUID(),
      }),
    ).toThrow('accepted');
    expect(() =>
      execute(s, ids.me, { type: 'conversation.respond', id: cid, accept: true }),
    ).toThrow('recipient');
    execute(s, ids.rohan, { type: 'conversation.respond', id: cid, accept: true });
    const mid = randomUUID();
    execute(s, ids.me, {
      type: 'message.send',
      conversation_id: cid,
      body: 'Thanks!',
      message_id: mid,
    });
    execute(s, ids.me, {
      type: 'message.send',
      conversation_id: cid,
      body: 'Thanks!',
      message_id: mid,
    });
    expect(s.messages.filter((m) => m.id === mid)).toHaveLength(1);
  });
  it('blocks contact and filters community content', () => {
    const s = seedState();
    execute(s, ids.me, { type: 'block', user_id: ids.asha });
    expect(snapshot(s, ids.me).posts.some((p) => p.owner_id === ids.asha)).toBe(false);
    expect(snapshot(s, ids.asha).messages).toHaveLength(0);
    expect(() =>
      execute(s, ids.asha, {
        type: 'conversation.start',
        user_id: ids.me,
        post_id: null,
        body: 'Hey',
        message_id: randomUUID(),
      }),
    ).toThrow('unavailable');
  });
  it('rejects replies across posts and deeper than one level', () => {
    const s = seedState();
    expect(() =>
      execute(s, ids.asha, {
        type: 'comment.add',
        post_id: s.posts[1].id,
        parent_id: s.comments[0].id,
        body: 'Wrong post',
      }),
    ).toThrow('top-level');
    execute(s, ids.asha, {
      type: 'comment.add',
      post_id: s.posts[0].id,
      parent_id: s.comments[0].id,
      body: 'Yes!',
    });
    expect(() =>
      execute(s, ids.me, {
        type: 'comment.add',
        post_id: s.posts[0].id,
        parent_id: s.comments[1].id,
        body: 'Too deep',
      }),
    ).toThrow('top-level');
  });
  it('requires MFA for admin decisions and retains reported evidence', () => {
    const s = seedState();
    execute(s, ids.me, {
      type: 'report',
      target_type: 'message',
      target_id: s.messages[0].id,
      reason: 'Please review',
    });
    expect(() =>
      execute(s, ids.me, {
        type: 'moderate',
        report_id: s.reports[0].id,
        action: 'remove',
        note: 'Reviewed',
      }),
    ).toThrow('MFA');
    execute(
      s,
      ids.me,
      { type: 'moderate', report_id: s.reports[0].id, action: 'remove', note: 'Reviewed' },
      { mfa: true },
    );
    expect(s.messages).toHaveLength(0);
    expect(s.reports[0].evidence).toContain('Zelda');
  });
  it('delivers notifications once, including after a worker retry', () => {
    const s = seedState();
    execute(s, ids.me, {
      type: 'comment.add',
      post_id: s.posts[0].id,
      parent_id: null,
      body: 'Great game!',
    });
    expect(s.outbox).toHaveLength(1);
    deliverOutbox(s);
    s.outbox[0].delivered_at = null;
    deliverOutbox(s);
    expect(s.notifications.filter((n) => n.id === s.outbox[0].id)).toHaveLength(1);
  });
  it('redeems an email-bound invitation exactly once', () => {
    const s = seedState();
    s.invites.push({
      id: randomUUID(),
      email: 'new@example.com',
      token_hash: tokenHash('secret'),
      expires_at: new Date(Date.now() + 10000).toISOString(),
      used_at: null,
      revoked: false,
    });
    expect(() => join(s, randomUUID(), 'wrong@example.com', 'secret', 'New', 'Local')).toThrow(
      'invalid',
    );
    const uid = randomUUID();
    join(s, uid, 'new@example.com', 'secret', 'New', 'Local');
    expect(snapshot(s, uid).profiles.some((p) => p.id === uid)).toBe(true);
    expect(() => join(s, randomUUID(), 'new@example.com', 'secret', 'New', 'Local')).toThrow(
      'invalid',
    );
  });
  it('rejects expired or revoked invitations', () => {
    const s = seedState();
    s.invites.push({
      id: randomUUID(),
      email: 'new@example.com',
      token_hash: tokenHash('secret'),
      expires_at: new Date(0).toISOString(),
      used_at: null,
      revoked: false,
    });
    expect(() => join(s, randomUUID(), 'new@example.com', 'secret', 'New', 'Local')).toThrow(
      'invalid',
    );
  });
  it('separates private outcomes and protects the last admin', () => {
    const s = seedState();
    execute(s, ids.me, {
      type: 'outcome',
      conversation_id: s.conversations[0].id,
      exchanged: true,
    });
    expect(snapshot(s, ids.asha).outcomes).toHaveLength(0);
    expect(() => execute(s, ids.me, { type: 'account.delete', confirmation: 'DELETE' })).toThrow(
      'last administrator',
    );
  });
});
