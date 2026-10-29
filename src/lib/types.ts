export type Platform = 'PlayStation' | 'Xbox' | 'Nintendo';
export type ExchangeMode = 'sale' | 'swap' | 'loan';
export type Profile = {
  id: string;
  name: string;
  bio: string;
  area: string;
  consoles: string[];
  genres: string[];
  handle: string;
  avatar: string;
  created_at: string;
};
export type Membership = {
  id: string;
  role: 'member' | 'admin';
  status: 'active' | 'suspended';
  joined_at: string;
};
export type Post = {
  id: string;
  owner_id: string;
  title: string;
  platform: Platform;
  generation: string;
  format: string;
  kind: 'offer' | 'wanted';
  exchange_modes: ExchangeMode[];
  condition: string;
  area: string;
  description: string;
  price: number | null;
  status: 'open' | 'paused' | 'closed';
  drive_required: boolean;
  download_required: boolean;
  code_required: boolean;
  art: string;
  created_at: string;
};
export type PostImage = {
  id: string;
  post_id: string;
  owner_id: string;
  path: string;
  url?: string;
};
export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  edited_at?: string;
};
export type Connection = {
  id: string;
  from_id: string;
  to_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
};
export type Block = { id: string; from_id: string; to_id: string };
export type ShelfItem = {
  id: string;
  owner_id: string;
  title: string;
  platform: Platform;
  kind: 'owned' | 'wishlist';
};
export type Conversation = {
  id: string;
  from_id: string;
  to_id: string;
  post_id: string | null;
  status: 'pending' | 'active' | 'declined';
  created_at: string;
};
export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type ReadCursor = { id: string; user_id: string; conversation_id: string; read_at: string };
export type Notification = {
  id: string;
  user_id: string;
  text: string;
  target: string;
  read: boolean;
  created_at: string;
};
export type Report = {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'comment' | 'message' | 'profile';
  target_id: string;
  reason: string;
  evidence: string;
  subject_id: string;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string;
};
export type ModerationAction = {
  id: string;
  admin_id: string;
  report_id: string;
  action: string;
  note: string;
  created_at: string;
};
export type OutcomeResponse = {
  id: string;
  conversation_id: string;
  user_id: string;
  exchanged: boolean;
  created_at: string;
};
export type Invite = {
  id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  revoked: boolean;
};
export type OutboxEvent = {
  id: string;
  user_id: string;
  text: string;
  target: string;
  delivered_at: string | null;
  created_at: string;
};
export type State = {
  community: { name: string; city: string };
  profiles: Profile[];
  memberships: Membership[];
  posts: Post[];
  images: PostImage[];
  comments: Comment[];
  connections: Connection[];
  blocks: Block[];
  shelf: ShelfItem[];
  conversations: Conversation[];
  messages: Message[];
  cursors: ReadCursor[];
  notifications: Notification[];
  reports: Report[];
  moderation: ModerationAction[];
  outcomes: OutcomeResponse[];
  invites: Invite[];
  outbox: OutboxEvent[];
};
export type Snapshot = Omit<State, 'invites' | 'outbox'> & {
  me: string;
  demo: boolean;
  can_delete_account: boolean;
  invites: Omit<Invite, 'token_hash'>[];
};
