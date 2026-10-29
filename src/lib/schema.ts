import { z } from 'zod';
const id = z.string().uuid();
const text = (max: number) => z.string().trim().min(1).max(max);
const platform = z.enum(['PlayStation', 'Xbox', 'Nintendo']);
export const exchangeModes = z
  .array(z.enum(['sale', 'swap', 'loan']))
  .max(3)
  .refine((modes) => new Set(modes).size === modes.length, 'Choose each arrangement once.');
export const postFields = z.object({
  title: text(100),
  platform,
  generation: text(40),
  format: z.enum(['Disc', 'Cartridge', 'Game-key card']),
  kind: z.enum(['offer', 'wanted']),
  exchange_modes: exchangeModes.default([]),
  condition: z.enum(['Like new', 'Good', 'Fair', 'Any condition']),
  area: text(60),
  description: z.string().trim().max(2000),
  price: z.number().min(0).max(100000).nullable(),
  drive_required: z.boolean(),
  download_required: z.boolean(),
  code_required: z.boolean(),
});
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('post.create'), request_id: id.optional(), ...postFields.shape }),
  z.object({ type: z.literal('post.update'), id, ...postFields.shape }),
  z.object({ type: z.literal('post.status'), id, status: z.enum(['open', 'paused', 'closed']) }),
  z.object({ type: z.literal('post.delete'), id }),
  z.object({
    type: z.literal('comment.add'),
    post_id: id,
    parent_id: id.nullable(),
    body: text(1500),
  }),
  z.object({ type: z.literal('comment.edit'), id, body: text(1500) }),
  z.object({ type: z.literal('comment.delete'), id }),
  z.object({
    type: z.literal('profile.update'),
    name: text(60),
    bio: z.string().trim().max(500),
    area: text(60),
    consoles: z.array(text(40)).max(10),
    genres: z.array(text(30)).max(10),
    handle: z.string().trim().max(60),
    avatar: z.enum(['peach', 'mint', 'lavender', 'blue', 'gold']),
  }),
  z.object({ type: z.literal('connection.request'), user_id: id }),
  z.object({ type: z.literal('connection.respond'), id, accept: z.boolean() }),
  z.object({ type: z.literal('connection.remove'), id }),
  z.object({ type: z.literal('block'), user_id: id }),
  z.object({ type: z.literal('unblock'), user_id: id }),
  z.object({
    type: z.literal('shelf.add'),
    title: text(100),
    platform,
    kind: z.enum(['owned', 'wishlist']),
  }),
  z.object({ type: z.literal('shelf.remove'), id }),
  z.object({
    type: z.literal('conversation.start'),
    user_id: id,
    post_id: id.nullable(),
    body: text(2000),
    message_id: id,
  }),
  z.object({ type: z.literal('conversation.respond'), id, accept: z.boolean() }),
  z.object({
    type: z.literal('message.send'),
    conversation_id: id,
    body: text(2000),
    message_id: id,
  }),
  z.object({ type: z.literal('conversation.read'), id }),
  z.object({ type: z.literal('notification.read'), id }),
  z.object({
    type: z.literal('report'),
    target_type: z.enum(['post', 'comment', 'message', 'profile']),
    target_id: id,
    reason: text(1000),
  }),
  z.object({
    type: z.literal('moderate'),
    report_id: id,
    action: z.enum(['dismiss', 'remove', 'suspend']),
    note: text(1000),
  }),
  z.object({ type: z.literal('outcome'), conversation_id: id, exchanged: z.boolean() }),
  z.object({ type: z.literal('invite.create'), email: z.email() }),
  z.object({ type: z.literal('invite.revoke'), id }),
  z.object({ type: z.literal('account.delete'), confirmation: z.literal('DELETE') }),
]);
export type Command = z.infer<typeof commandSchema>;
export const joinSchema = z.object({
  token: text(200),
  name: text(60),
  area: text(60),
  adult: z.literal(true),
  rules: z.literal(true),
});
