import { describe, expect, it } from 'vitest';
import { postFields, commandSchema } from '../src/lib/schema';
import { execute } from '../src/lib/domain';
import { seedState, ids } from '../src/lib/seed';
import { arrangementLabels, contactLabel, interestMessage } from '../src/lib/listing';

describe('listing arrangements and owner editing', () => {
  it('preserves legacy payloads, rejects duplicates and provides honest contact wording', () => {
    const { exchange_modes, ...legacy } = seedState().posts[1];
    expect(postFields.parse(legacy).exchange_modes).toEqual([]);
    expect(postFields.safeParse({ ...legacy, exchange_modes: ['sale', 'sale'] }).success).toBe(
      false,
    );
    expect(contactLabel({ kind: 'offer', exchange_modes: ['sale'] })).toBe('Ask to buy');
    expect(contactLabel({ kind: 'wanted', exchange_modes: ['loan'] })).toBe('I have this game');
    expect(arrangementLabels({ kind: 'wanted', exchange_modes: ['sale', 'loan'] })).toEqual([
      'Buy',
      'Borrow',
    ]);
  });
  it('updates one owned post, preserves photos/comments and prevents paid-loan pricing', () => {
    const state = seedState();
    const post = state.posts[0];
    const before = state.comments.length;
    const update = commandSchema.parse({
      type: 'post.update',
      ...post,
      exchange_modes: ['loan'],
      title: 'Zelda with case',
      price: null,
    });
    if (update.type !== 'post.update') throw new Error('Expected a listing update');
    execute(state, ids.asha, update);
    expect(state.posts).toHaveLength(6);
    expect(state.comments).toHaveLength(before);
    expect(post.title).toBe('Zelda with case');
    expect(interestMessage(post)).toContain('borrowing Zelda with case');
    expect(() => execute(state, ids.me, update)).toThrow('not found');
    expect(() => execute(state, ids.asha, { ...update, price: 100 })).toThrow('asking price');
  });
  it('retries a lost creation response without producing another listing', () => {
    const state = seedState();
    const request_id = '77777777-7777-4777-8777-777777777777';
    const create = commandSchema.parse({ type: 'post.create', request_id, ...state.posts[1] });
    const first = execute(state, ids.me, create);
    expect(execute(state, ids.me, create).id).toBe(first.id);
    expect(state.posts.filter((post) => post.id === request_id)).toHaveLength(1);
  });
});
