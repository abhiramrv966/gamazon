import type { ExchangeMode, Post } from './types';

export const arrangements: { id: ExchangeMode; offer: string; wanted: string }[] = [
  { id: 'sale', offer: 'Sell', wanted: 'Buy' },
  { id: 'swap', offer: 'Swap', wanted: 'Swap' },
  { id: 'loan', offer: 'Lend', wanted: 'Borrow' },
];
export function arrangementLabels(post: Pick<Post, 'kind' | 'exchange_modes'>) {
  return arrangements
    .filter((mode) => post.exchange_modes?.includes(mode.id))
    .map((mode) => (post.kind === 'offer' ? mode.offer : mode.wanted));
}
export function contactLabel(post: Pick<Post, 'kind' | 'exchange_modes'>) {
  if (post.kind === 'wanted') return 'I have this game';
  if (post.exchange_modes?.length !== 1) return 'I’m interested';
  return post.exchange_modes[0] === 'sale'
    ? 'Ask to buy'
    : post.exchange_modes[0] === 'swap'
      ? 'Suggest a swap'
      : 'Ask to borrow';
}
export function interestMessage(post: Post, mode?: ExchangeMode) {
  if (post.kind === 'wanted') return `Hi! I have ${post.title}. Are you still looking for it?`;
  const intent = mode || (post.exchange_modes?.length === 1 ? post.exchange_modes[0] : undefined);
  const action =
    intent === 'sale'
      ? 'buying'
      : intent === 'swap'
        ? 'swapping for'
        : intent === 'loan'
          ? 'borrowing'
          : 'playing';
  return `Hi! I’m interested in ${action} ${post.title}. Is your copy still available?`;
}
