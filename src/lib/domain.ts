import { randomUUID, createHash, randomBytes } from 'node:crypto';
import type { Command } from './schema';
import type { State, Snapshot, Profile } from './types';

export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function fail(message: string, status = 400): never {
  throw new DomainError(message, status);
}
export const blocked = (s: State, a: string, b: string) =>
  s.blocks.some((x) => (x.from_id === a && x.to_id === b) || (x.from_id === b && x.to_id === a));
export const active = (s: State, id: string) =>
  s.memberships.some((x) => x.id === id && x.status === 'active');
export const friends = (s: State, a: string, b: string) =>
  s.connections.some(
    (x) =>
      x.status === 'accepted' &&
      ((x.from_id === a && x.to_id === b) || (x.from_id === b && x.to_id === a)),
  );
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const policy = (body: string) => {
  if (
    /(sell|share|rent|buy|selling|sharing|renting).{0,25}(account|credentials)|\b(password|paid rental|rent per day|daily rental)\b/i.test(
      body,
    )
  )
    fail('Account access and paid rental solicitation are not allowed. Physical games only.');
};
export function deliverOutbox(s: State) {
  for (const e of s.outbox.filter((e) => !e.delivered_at)) {
    if (!s.notifications.some((n) => n.id === e.id))
      s.notifications.push({
        id: e.id,
        user_id: e.user_id,
        text: e.text,
        target: e.target,
        read: false,
        created_at: e.created_at,
      });
    e.delivered_at = new Date().toISOString();
  }
}
export function snapshot(s: State, me: string, demo = false): Snapshot {
  if (!active(s, me)) fail('An active community membership is required.', 403);
  const admin = s.memberships.some((m) => m.id === me && m.role === 'admin');
  const visible = (id: string) => !blocked(s, me, id);
  const posts = s.posts.filter((p) => visible(p.owner_id));
  const conversations = s.conversations.filter(
    (c) => (c.from_id === me || c.to_id === me) && !blocked(s, c.from_id, c.to_id),
  );
  return structuredClone({
    ...s,
    me,
    demo,
    can_delete_account:
      !admin || s.memberships.filter((m) => m.status === 'active' && m.role === 'admin').length > 1,
    profiles: s.profiles.filter((p) => visible(p.id)),
    memberships: s.memberships.filter((m) => m.id === me),
    posts,
    images: s.images.filter((i) => posts.some((p) => p.id === i.post_id)),
    comments: s.comments.filter(
      (c) => visible(c.author_id) && posts.some((p) => p.id === c.post_id),
    ),
    connections: s.connections.filter(
      (c) =>
        visible(c.from_id) &&
        visible(c.to_id) &&
        (c.status === 'accepted' || c.from_id === me || c.to_id === me),
    ),
    blocks: s.blocks.filter((b) => b.from_id === me),
    shelf: s.shelf.filter((i) => visible(i.owner_id)),
    conversations,
    messages: s.messages.filter((m) => conversations.some((c) => c.id === m.conversation_id)),
    cursors: s.cursors.filter((c) => c.user_id === me),
    notifications: s.notifications.filter((n) => n.user_id === me),
    reports: s.reports.filter((r) => admin || r.reporter_id === me),
    moderation: admin ? s.moderation : [],
    outcomes: s.outcomes.filter((o) => o.user_id === me),
    invites: admin ? s.invites.map(({ token_hash, ...i }) => i) : [],
    outbox: undefined,
  }) as Snapshot;
}
export function join(
  s: State,
  id: string,
  email: string,
  token: string,
  name: string,
  area: string,
) {
  const invite = s.invites.find(
    (i) =>
      i.token_hash === tokenHash(token) &&
      i.email.toLowerCase() === email.toLowerCase() &&
      !i.used_at &&
      !i.revoked &&
      Date.parse(i.expires_at) > Date.now(),
  );
  if (!invite) fail('This invitation is invalid, expired, or belongs to another email.', 403);
  if (s.memberships.some((m) => m.id === id)) fail('Membership already exists.', 409);
  const now = new Date().toISOString();
  invite.used_at = now;
  s.memberships.push({ id, role: 'member', status: 'active', joined_at: now });
  s.profiles.push({
    id,
    name,
    area,
    bio: '',
    consoles: [],
    genres: [],
    handle: '',
    avatar: 'mint',
    created_at: now,
  });
}
export function execute(
  s: State,
  me: string,
  c: Command,
  options: { mfa?: boolean } = {},
): Record<string, unknown> {
  if (!active(s, me)) fail('An active community membership is required.', 403);
  const now = new Date().toISOString(),
    id = randomUUID();
  const member = (other: string) => {
    if (other === me || !active(s, other) || blocked(s, me, other))
      fail('This member is unavailable.', 403);
  };
  const admin = () => {
    if (!s.memberships.some((m) => m.id === me && m.role === 'admin') || !options.mfa)
      fail('Administrator MFA is required.', 403);
  };
  const ownedPost = (pid: string) => {
    const p = s.posts.find((p) => p.id === pid && p.owner_id === me);
    if (!p) fail('Post not found.', 404);
    return p;
  };
  const conversation = (cid: string) => {
    const x = s.conversations.find((x) => x.id === cid && (x.from_id === me || x.to_id === me));
    if (!x || blocked(s, x.from_id, x.to_id)) fail('Conversation unavailable.', 404);
    member(x.from_id === me ? x.to_id : x.from_id);
    return x;
  };
  const notify = (uid: string, text: string, target: string) => {
    if (uid !== me)
      s.outbox.push({
        id: randomUUID(),
        user_id: uid,
        text,
        target,
        delivered_at: null,
        created_at: now,
      });
  };
  const name = s.profiles.find((p) => p.id === me)?.name || 'A member';
  switch (c.type) {
    case 'post.create':
    case 'post.update': {
      policy(c.title + ' ' + c.description);
      if (c.platform !== 'Nintendo' && c.format !== 'Disc')
        fail('PlayStation and Xbox listings must be discs.');
      if (c.platform === 'Nintendo' && c.format === 'Disc')
        fail('Use a cartridge or game-key card for Nintendo.');
      if (c.exchange_modes.length && !c.exchange_modes.includes('sale') && c.price !== null)
        fail('Only sale listings can have an asking price.');
      const { type, ...p } = c;
      if (c.type === 'post.update') {
        const existing = ownedPost(c.id);
        Object.assign(existing, p, {
          drive_required: c.format === 'Disc',
          download_required: c.format === 'Game-key card' || c.download_required,
        });
        return { id: existing.id };
      }
      const postId = c.request_id || id;
      const previous = s.posts.find((post) => post.id === postId);
      if (previous) {
        if (previous.owner_id !== me) fail('Listing identifier is already in use.', 409);
        return { id: previous.id };
      }
      const { request_id, type: createType, ...fields } = c;
      s.posts.unshift({
        ...fields,
        id: postId,
        owner_id: me,
        status: 'open',
        art: c.platform === 'Nintendo' ? 'forest' : c.platform === 'Xbox' ? 'racing' : 'ice',
        drive_required: c.format === 'Disc',
        download_required: c.format === 'Game-key card' || c.download_required,
        created_at: now,
      });
      return { id: postId };
    }
    case 'post.status':
      ownedPost(c.id).status = c.status;
      break;
    case 'post.delete':
      ownedPost(c.id);
      s.posts = s.posts.filter((p) => p.id !== c.id);
      s.comments = s.comments.filter((x) => x.post_id !== c.id);
      s.images = s.images.filter((x) => x.post_id !== c.id);
      s.conversations.forEach((x) => {
        if (x.post_id === c.id) x.post_id = null;
      });
      break;
    case 'comment.add': {
      policy(c.body);
      const p = s.posts.find((x) => x.id === c.post_id);
      if (!p || blocked(s, me, p.owner_id)) fail('Post not found.', 404);
      if (p.status !== 'open') fail('This post is not open for comments.');
      if (
        c.parent_id &&
        !s.comments.some(
          (x) =>
            x.id === c.parent_id &&
            x.post_id === c.post_id &&
            !x.parent_id &&
            !blocked(s, me, x.author_id),
        )
      )
        fail('Reply to a top-level comment on this post.');
      s.comments.push({
        id,
        post_id: c.post_id,
        parent_id: c.parent_id,
        author_id: me,
        body: c.body,
        created_at: now,
      });
      notify(p.owner_id, `${name} commented on ${p.title}`, `post:${p.id}`);
      const parent = s.comments.find((x) => x.id === c.parent_id);
      if (parent && parent.author_id !== p.owner_id)
        notify(parent.author_id, `${name} replied to your comment`, `post:${p.id}`);
      break;
    }
    case 'comment.edit': {
      policy(c.body);
      const x = s.comments.find((x) => x.id === c.id && x.author_id === me);
      if (!x) fail('Comment not found.', 404);
      x.body = c.body;
      x.edited_at = now;
      break;
    }
    case 'comment.delete': {
      if (!s.comments.some((x) => x.id === c.id && x.author_id === me))
        fail('Comment not found.', 404);
      s.comments = s.comments.filter((x) => x.id !== c.id && x.parent_id !== c.id);
      break;
    }
    case 'profile.update': {
      const p = s.profiles.find((x) => x.id === me)!;
      const { type, ...data } = c;
      Object.assign(p, data);
      break;
    }
    case 'connection.request': {
      member(c.user_id);
      if (
        s.connections.some(
          (x) =>
            (x.from_id === me && x.to_id === c.user_id) ||
            (x.to_id === me && x.from_id === c.user_id),
        )
      )
        fail('A connection or request already exists.', 409);
      s.connections.push({ id, from_id: me, to_id: c.user_id, status: 'pending', created_at: now });
      notify(c.user_id, `${name} sent you a connection request`, 'people');
      break;
    }
    case 'connection.respond': {
      const x = s.connections.find(
        (x) => x.id === c.id && x.to_id === me && x.status === 'pending',
      );
      if (!x) fail('Request not found.', 404);
      member(x.from_id);
      if (c.accept) {
        x.status = 'accepted';
        notify(x.from_id, `${name} accepted your connection`, 'people');
      } else s.connections = s.connections.filter((x) => x.id !== c.id);
      break;
    }
    case 'connection.remove':
      s.connections = s.connections.filter(
        (x) => !(x.id === c.id && (x.from_id === me || x.to_id === me)),
      );
      break;
    case 'block':
      member(c.user_id);
      s.blocks.push({ id, from_id: me, to_id: c.user_id });
      s.connections = s.connections.filter(
        (x) =>
          !(
            (x.from_id === me && x.to_id === c.user_id) ||
            (x.to_id === me && x.from_id === c.user_id)
          ),
      );
      break;
    case 'unblock':
      s.blocks = s.blocks.filter((x) => !(x.from_id === me && x.to_id === c.user_id));
      break;
    case 'shelf.add':
      s.shelf.push({ id, owner_id: me, title: c.title, platform: c.platform, kind: c.kind });
      break;
    case 'shelf.remove':
      s.shelf = s.shelf.filter((x) => !(x.id === c.id && x.owner_id === me));
      break;
    case 'conversation.start': {
      member(c.user_id);
      policy(c.body);
      if (
        c.post_id &&
        !s.posts.some((p) => p.id === c.post_id && p.owner_id === c.user_id && p.status === 'open')
      )
        fail('This listing is unavailable.');
      const existing = s.conversations.find(
        (x) =>
          (x.from_id === me && x.to_id === c.user_id) ||
          (x.to_id === me && x.from_id === c.user_id),
      );
      if (existing) return { id: existing.id };
      const x = {
        id,
        from_id: me,
        to_id: c.user_id,
        post_id: c.post_id,
        status: friends(s, me, c.user_id) ? ('active' as const) : ('pending' as const),
        created_at: now,
      };
      s.conversations.push(x);
      s.messages.push({
        id: c.message_id,
        conversation_id: id,
        sender_id: me,
        body: c.body,
        created_at: now,
      });
      notify(c.user_id, `${name} sent you a message`, `chat:${id}`);
      return { id };
    }
    case 'conversation.respond': {
      const x = conversation(c.id);
      if (x.to_id !== me || x.status !== 'pending')
        fail('Only the recipient can answer this request.', 403);
      x.status = c.accept ? 'active' : 'declined';
      break;
    }
    case 'message.send': {
      const x = conversation(c.conversation_id);
      if (x.status !== 'active') fail('Wait for this message request to be accepted.', 403);
      policy(c.body);
      const prev = s.messages.find((m) => m.id === c.message_id);
      if (prev) {
        if (prev.sender_id !== me || prev.conversation_id !== x.id)
          fail('Message identifier is already in use.', 409);
        return { id: prev.id };
      }
      s.messages.push({
        id: c.message_id,
        conversation_id: x.id,
        sender_id: me,
        body: c.body,
        created_at: now,
      });
      notify(x.from_id === me ? x.to_id : x.from_id, `${name} sent you a message`, `chat:${x.id}`);
      return { id: c.message_id };
    }
    case 'conversation.read':
      conversation(c.id);
      {
        const x = s.cursors.find((x) => x.user_id === me && x.conversation_id === c.id);
        if (x) x.read_at = now;
        else s.cursors.push({ id, user_id: me, conversation_id: c.id, read_at: now });
      }
      break;
    case 'notification.read': {
      const x = s.notifications.find((x) => x.id === c.id && x.user_id === me);
      if (x) x.read = true;
      break;
    }
    case 'report': {
      let evidence = '',
        subject = '';
      if (c.target_type === 'post') {
        const x = s.posts.find((x) => x.id === c.target_id);
        if (x) {
          evidence = x.title + '\n' + x.description;
          subject = x.owner_id;
        }
      }
      if (c.target_type === 'comment') {
        const x = s.comments.find((x) => x.id === c.target_id);
        if (x) {
          evidence = x.body;
          subject = x.author_id;
        }
      }
      if (c.target_type === 'profile') {
        const x = s.profiles.find((x) => x.id === c.target_id);
        if (x) {
          evidence = x.name + '\n' + x.bio;
          subject = x.id;
        }
      }
      if (c.target_type === 'message') {
        const x = s.messages.find((x) => x.id === c.target_id);
        if (x) {
          conversation(x.conversation_id);
          evidence = x.body;
          subject = x.sender_id;
        }
      }
      if (!subject) fail('Content not found.', 404);
      s.reports.push({
        id,
        reporter_id: me,
        target_type: c.target_type,
        target_id: c.target_id,
        reason: c.reason,
        evidence,
        subject_id: subject,
        status: 'open',
        created_at: now,
      });
      break;
    }
    case 'moderate': {
      admin();
      const r = s.reports.find((r) => r.id === c.report_id && r.status === 'open');
      if (!r) fail('Open report not found.', 404);
      if (c.action === 'suspend') {
        if (r.subject_id === me) fail('Cannot suspend yourself.');
        const m = s.memberships.find((m) => m.id === r.subject_id);
        if (m) m.status = 'suspended';
      }
      if (c.action === 'remove') {
        if (r.target_type === 'post') {
          s.posts = s.posts.filter((p) => p.id !== r.target_id);
          s.comments = s.comments.filter((p) => p.post_id !== r.target_id);
          s.images = s.images.filter((p) => p.post_id !== r.target_id);
        }
        if (r.target_type === 'comment')
          s.comments = s.comments.filter(
            (p) => p.id !== r.target_id && p.parent_id !== r.target_id,
          );
        if (r.target_type === 'message')
          s.messages = s.messages.filter((p) => p.id !== r.target_id);
        if (r.target_type === 'profile') {
          const p = s.profiles.find((p) => p.id === r.subject_id);
          if (p) {
            p.bio = '';
            p.handle = '';
            p.name = 'Community member';
          }
        }
      }
      r.status = 'resolved';
      r.resolved_at = now;
      s.moderation.push({
        id,
        admin_id: me,
        report_id: r.id,
        action: c.action,
        note: c.note,
        created_at: now,
      });
      break;
    }
    case 'outcome': {
      const x = conversation(c.conversation_id);
      if (x.status !== 'active' || !x.post_id)
        fail('Outcomes require an accepted listing conversation.');
      const prev = s.outcomes.find(
        (o) => o.conversation_id === c.conversation_id && o.user_id === me,
      );
      if (prev) {
        prev.exchanged = c.exchanged;
        prev.created_at = now;
      } else
        s.outcomes.push({
          id,
          conversation_id: c.conversation_id,
          user_id: me,
          exchanged: c.exchanged,
          created_at: now,
        });
      break;
    }
    case 'invite.create': {
      admin();
      const token = randomBytes(24).toString('hex');
      s.invites.push({
        id,
        email: c.email.toLowerCase(),
        token_hash: tokenHash(token),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        used_at: null,
        revoked: false,
      });
      return { id, token };
    }
    case 'invite.revoke':
      admin();
      {
        const x = s.invites.find((x) => x.id === c.id);
        if (x) x.revoked = true;
      }
      break;
    case 'account.delete': {
      if (
        s.memberships.some((m) => m.id === me && m.role === 'admin') &&
        s.memberships.filter((m) => m.role === 'admin' && m.status === 'active').length === 1
      )
        fail('Transfer administration before deleting the last administrator.');
      s.posts
        .filter((p) => p.owner_id === me)
        .forEach((p) => {
          s.comments = s.comments.filter((c) => c.post_id !== p.id);
        });
      s.posts = s.posts.filter((p) => p.owner_id !== me);
      s.images = s.images.filter((p) => p.owner_id !== me);
      s.comments = s.comments.filter((p) => p.author_id !== me);
      s.shelf = s.shelf.filter((p) => p.owner_id !== me);
      s.connections = s.connections.filter((p) => p.from_id !== me && p.to_id !== me);
      s.messages = s.messages.filter((p) => p.sender_id !== me);
      s.notifications = s.notifications.filter((p) => p.user_id !== me);
      s.memberships = s.memberships.filter((p) => p.id !== me);
      s.profiles = s.profiles.filter((p) => p.id !== me);
      break;
    }
  }
  return { id };
}
