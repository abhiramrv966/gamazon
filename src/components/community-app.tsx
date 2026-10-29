'use client';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Disc3,
  Flag,
  Gamepad2,
  Home,
  LoaderCircle,
  LayoutList,
  List,
  LockKeyhole,
  MapPin,
  Menu,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Moon,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  X,
} from 'lucide-react';
import type { Snapshot, Post, Profile, Platform, ExchangeMode } from '@/lib/types';
import type { Command } from '@/lib/schema';
import { postFields } from '@/lib/schema';
import { browserDb } from '@/lib/browser';
import { gameArtwork, platformBanners } from '@/lib/game-artwork';
import { arrangements, arrangementLabels, contactLabel, interestMessage } from '@/lib/listing';
import './landing.css';

type ModalState = {
  kind: string;
  id?: string;
  target?: 'post' | 'comment' | 'message' | 'profile';
  user?: string;
  command?: Command;
  title?: string;
  explanation?: string;
  body?: string;
};
const platforms: Platform[] = ['PlayStation', 'Xbox', 'Nintendo'];
function initials(name: string) {
  return name
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('');
}
function ago(date: string) {
  const m = Math.max(1, Math.floor((Date.now() - Date.parse(date)) / 60000));
  return m < 60
    ? `${m}m ago`
    : m < 1440
      ? `${Math.floor(m / 60)}h ago`
      : `${Math.floor(m / 1440)}d ago`;
}
function Avatar({ profile, small = false }: { profile?: Profile; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`avatar ${profile?.avatar || 'mint'} ${small ? 'small' : ''}`}
    >
      {initials(profile?.name || 'Deleted member')}
    </span>
  );
}
function Brand({ home }: { home?: () => void }) {
  return (
    <Link
      href={home ? '/community' : '/'}
      onClick={
        home
          ? (event) => {
              event.preventDefault();
              home();
            }
          : undefined
      }
      className="brand"
      aria-label="Gamazon home"
    >
      <span className="brand-icon">
        <Gamepad2 size={24} />
      </span>
      gamazon<span className="brand-dot">.</span>
    </Link>
  );
}
function GameArt({ post, large = false }: { post: Post; large?: boolean }) {
  const art = gameArtwork(post.title, post.description);
  return (
    <div className={`gz-no-photo ${large ? 'large' : ''}`}>
      {art ? (
        <img src={art} alt={`${post.title} promotional artwork`} width={156} height={88} />
      ) : post.format === 'Disc' ? (
        <Disc3 size={30} />
      ) : (
        <Gamepad2 size={30} />
      )}
      <div>
        <span>No photo of this copy</span>
        {art && <small>Game artwork</small>}
      </div>
    </div>
  );
}
function GameThumbnail({
  title,
  description,
  platform,
  fallback = false,
}: {
  title: string;
  description?: string;
  platform: string;
  fallback?: boolean;
}) {
  const art = gameArtwork(title, description);
  return art ? (
    <span className="gz-game-thumbnail" title="Game artwork">
      <img
        src={art}
        alt={`${title} promotional artwork`}
        width={72}
        height={44}
        loading="lazy"
        decoding="async"
      />
    </span>
  ) : fallback ? (
    <PlatformMark platform={platform} />
  ) : null;
}
function PlatformMark({ platform }: { platform: string }) {
  const logo =
    platform === 'PlayStation'
      ? 'playstation.svg'
      : platform === 'Xbox'
        ? 'xbox.png'
        : platform === 'Nintendo'
          ? 'nintendo.svg'
          : null;
  return (
    <span aria-hidden="true" className={`gz-platform-mark ${platform.toLowerCase()}`}>
      {logo ? <img src={`/images/platforms/${logo}`} alt="" width={24} height={24} /> : 'g.'}
    </span>
  );
}
function Availability({ status }: { status: string }) {
  return (
    <span className={`gz-availability ${status}`}>
      {status === 'open' ? <Check size={14} /> : <LockKeyhole size={14} />}{' '}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
function asking(price: number | null) {
  return price === null
    ? 'Price to discuss'
    : price === 0
      ? 'Free'
      : `₹${price.toLocaleString('en-IN')}`;
}
function ChoiceMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <details className="gz-choice-menu" ref={ref}>
      <summary>
        {label} <strong>{options.find((o) => o[0] === value)?.[1]}</strong>
        <ChevronDown size={16} />
      </summary>
      <div className="gz-menu-options" role="group" aria-label={label}>
        <button
          type="button"
          className="gz-mobile"
          onClick={() => {
            ref.current?.removeAttribute('open');
            ref.current?.querySelector<HTMLElement>('summary')?.focus();
          }}
        >
          Close menu <X size={16} />
        </button>
        {options.map(([id, text]) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => {
              onChange(id);
              ref.current?.removeAttribute('open');
            }}
          >
            {text}
            {value === id && <Check size={16} />}
          </button>
        ))}
      </div>
    </details>
  );
}
function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <Gamepad2 size={38} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
function ContextPanel({
  title,
  children,
  close,
  anchor,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  anchor: HTMLElement | null;
}) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const isMobile = matchMedia('(max-width: 760px)').matches;
    const parent = isMobile
      ? document.body
      : anchor?.closest('[data-context]') || document.querySelector('.gz-workspace');
    const container = document.createElement('div');
    container.className = `gz-context-host ${isMobile ? 'community-ui gz-mobile-host' : ''}`;
    parent?.append(container);
    setHost(container);
    setMobile(isMobile);
    const previousOverflow = document.body.style.overflow;
    const background: [HTMLElement, boolean][] = [];
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      let branch: HTMLElement = container;
      while (branch.parentElement) {
        for (const sibling of branch.parentElement.children) {
          if (sibling !== branch && sibling instanceof HTMLElement) {
            background.push([sibling, sibling.inert]);
            sibling.inert = true;
          }
        }
        branch = branch.parentElement;
        if (branch === document.body) break;
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
      }
      if (event.key === 'Tab' && isMobile) {
        const controls = [
          ...container.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
          ),
        ].filter((el) => el.getClientRects().length);
        const first = controls[0],
          last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (isMobile) document.body.style.overflow = previousOverflow;
      for (const [element, inert] of background) element.inert = inert;
      container.remove();
      if (anchor?.isConnected) anchor.focus();
    };
  }, [anchor]);
  useEffect(() => {
    if (host)
      (
        ref.current?.querySelector<HTMLElement>('input,textarea,select') ||
        ref.current?.querySelector<HTMLElement>('button')
      )?.focus();
  }, [host, title]);
  return host
    ? createPortal(
        <>
          <div className="gz-sheet-scrim" onClick={close} />
          <section
            ref={ref}
            className="gz-context-panel"
            role="dialog"
            aria-modal={mobile || undefined}
            aria-label={title}
          >
            <div className="gz-panel-heading">
              <h2>{title}</h2>
              <button type="button" className="gz-icon" aria-label="Close panel" onClick={close}>
                <X size={20} />
              </button>
            </div>
            {children}
          </section>
        </>,
        host,
      )
    : null;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<{ 'aria-label'?: string }>, {
            'aria-label': (children.props as { 'aria-label'?: string })['aria-label'] || label,
          })
        : children}
    </label>
  );
}
function Login({ message, reload }: { message: string; reload: () => void }) {
  const membership = /membership/i.test(message);
  return (
    <main className="landing-auth">
      <aside className="auth-art">
        <img src="/images/games/witcher-1.webp" alt="" />
        <Link href="/" className="landing-brand">
          gamazon.
        </Link>
        <div>
          <h2>
            Find games.
            <br />
            Share yours.
          </h2>
          <p>Discs and cartridges. People who play them.</p>
        </div>
      </aside>
      <section className="auth-panel">
        <h1>{membership ? 'Check your membership.' : 'Back to your games.'}</h1>
        <p role="alert">{message}</p>
        <Link className="landing-pill" href="/signin">
          {membership ? 'Check access' : 'Sign in'} <ArrowRight size={16} />
        </Link>
        <Link className="auth-resend" href="/signup">
          Accept an invitation
        </Link>
        <button type="button" className="auth-resend" onClick={reload}>
          Try again
        </button>
        <Link className="auth-resend" href="/">
          Back to Gamazon
        </Link>
      </section>
    </main>
  );
}

export default function CommunityApp({ initialPage = 'feed' }: { initialPage?: 'feed' | 'admin' }) {
  const [loadedData, setData] = useState<Snapshot | null>(null),
    [loadError, setLoadError] = useState(''),
    [page, setPage] = useState<string>(initialPage),
    [modal, setModal] = useState<ModalState | null>(null),
    [query, setQuery] = useState(''),
    [platform, setPlatform] = useState('All games'),
    [kind, setKind] = useState('all'),
    [area, setArea] = useState('all'),
    [status, setStatus] = useState('open'),
    [friendsOnly, setFriendsOnly] = useState(false),
    [toast, setToast] = useState(''),
    [busy, setBusy] = useState(false),
    [chat, setChat] = useState<string | null>(null),
    [profileId, setProfileId] = useState<string | null>(null),
    [mobileNav, setMobileNav] = useState(false),
    [limit, setLimit] = useState(8),
    [inviteToken, setInviteToken] = useState(''),
    [reply, setReply] = useState<string | null>(null),
    [mfa, setMfa] = useState<{ id: string; qr: string } | null>(null),
    [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [exchange, setExchange] = useState('all');
  const [layout, setLayout] = useState('card');
  const [profileTab, setProfileTab] = useState('owned');
  const [notificationTab, setNotificationTab] = useState('all');
  const [settingsTab, setSettingsTab] = useState('account');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  useEffect(() => {
    try {
      if (localStorage.getItem('gamazon-theme') === 'light') setTheme('light');
    } catch {
      // Storage may be disabled; the theme still works for this visit.
    }
    return () => {
      delete document.documentElement.dataset.communityTheme;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.communityTheme = theme;
  }, [theme]);
  function changeTheme(next: 'light' | 'dark') {
    setTheme(next);
    try {
      localStorage.setItem('gamazon-theme', next);
    } catch {
      // Storage may be disabled; the theme still works for this visit.
    }
  }
  const [adminTab, setAdminTab] = useState('reports');
  const [reportFilter, setReportFilter] = useState('open');
  const [reportId, setReportId] = useState<string | null>(null);
  const [requestTab, setRequestTab] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const swipeStart = useRef<number | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [offline, setOffline] = useState(false);
  const anchor = useRef<HTMLElement | null>(null);
  function showPanel(next: ModalState) {
    if (!modal) anchor.current = document.activeElement as HTMLElement | null;
    setModal(next);
  }
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const mounted = useRef(true);
  const pendingSend = useRef<{ conversation: string; body: string; id: string } | null>(null);
  const messageEnd = useRef<HTMLDivElement>(null);
  const readMessage = useRef<string | null>(null);
  useEffect(() => {
    messageEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [chat, loadedData?.messages.length]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName) &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[aria-label="Search games"]')?.focus();
      }
      if (event.key === 'Escape') {
        const menu = document.querySelector<HTMLDetailsElement>(
          'details.gz-choice-menu[open],details.gz-account[open]',
        );
        menu?.removeAttribute('open');
        menu?.querySelector<HTMLElement>('summary')?.focus();
        setMobileNav(false);
      }
    };
    const closeMenus = (event: MouseEvent) => {
      document
        .querySelectorAll<HTMLDetailsElement>(
          'details.gz-choice-menu[open],details.gz-account[open]',
        )
        .forEach((menu) => {
          if (!menu.contains(event.target as Node)) menu.removeAttribute('open');
        });
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', closeMenus);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', closeMenus);
    };
  }, []);
  const reload = useCallback(async () => {
    try {
      const r = await fetch('/api/v1/state', { cache: 'no-store' }),
        d = await r.json();
      if (!r.ok) {
        setLoadError(d.error);
        setData(null);
        return;
      }
      if (mounted.current) {
        setData(d);
        setLoadError('');
      }
    } catch {
      setLoadError('Could not connect. Check your connection and retry.');
    }
  }, []);
  useEffect(() => {
    if (page !== 'messages' || !chat || !loadedData || document.visibilityState !== 'visible')
      return;
    const latest = loadedData.messages
      .filter((m) => m.conversation_id === chat && m.sender_id !== loadedData.me)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!latest || readMessage.current === latest.id) return;
    readMessage.current = latest.id;
    void fetch('/api/v1/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'conversation.read', id: chat }),
    }).then((r) => {
      if (r.ok) return reload();
    });
  }, [page, chat, loadedData, reload]);
  useEffect(() => {
    if (page !== 'admin') {
      setMetrics(null);
      return;
    }
    void fetch('/api/v1/metrics')
      .then(async (r) => {
        if (r.ok) setMetrics(await r.json());
      })
      .catch(() => {});
  }, [page, loadedData?.outcomes.length, loadedData?.reports.length]);
  useEffect(() => {
    mounted.current = true;
    void reload();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void reload();
    }, 8000);
    const db = browserDb();
    const channel = db
      ?.channel('community-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => void reload(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => void reload(),
      )
      .subscribe();
    return () => {
      mounted.current = false;
      clearInterval(timer);
      if (channel) void db?.removeChannel(channel);
    };
  }, [reload]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    setLimit(8);
  }, [query, platform, kind, area, status, friendsOnly]);
  async function act(command: Command) {
    setBusy(true);
    try {
      const r = await fetch('/api/v1/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      await reload();
      return result as { id: string; token?: string };
    } catch (e) {
      setToast((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    const result = await browserDb()?.auth.signOut();
    if (result?.error) {
      setToast('Couldn’t sign out. Please retry.');
      return;
    }
    window.location.assign('/signin');
  }
  function navigate(p: string) {
    if (p === 'admin' && initialPage !== 'admin') {
      window.location.assign('/admin');
      return;
    }
    document
      .querySelectorAll<HTMLDetailsElement>('.gz-account[open],.gz-choice-menu[open]')
      .forEach((menu) => {
        menu.open = false;
      });
    setPage(p);
    setMobileNav(false);
    setProfileId(null);
    setModal(null);
    setReply(null);
    setInviteToken('');
    if (p !== 'messages') window.scrollTo({ top: 0 });
  }
  async function openChat(id: string) {
    setChat(id);
    navigate('messages');
    await act({ type: 'conversation.read', id });
  }
  function report(target: ModalState['target'], id: string) {
    showPanel({ kind: 'report', target, id });
  }
  if (!loadedData) {
    if (loadError) return <Login message={loadError} reload={() => void reload()} />;
    return (
      <div className="loading">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Loading…</p>
      </div>
    );
  }
  const data = loadedData;
  const me = data.profiles.find((p) => p.id === data.me)!;
  const person = (id: string) => data.profiles.find((p) => p.id === id);
  const isAdmin = data.memberships.some((m) => m.id === data.me && m.role === 'admin');
  const myFriends = data.connections
    .filter((c) => c.status === 'accepted' && (c.from_id === data.me || c.to_id === data.me))
    .map((c) => (c.from_id === data.me ? c.to_id : c.from_id));
  const unread = data.notifications.filter((n) => !n.read).length;
  const unreadChats = data.conversations.filter((c) =>
    data.messages.some(
      (m) =>
        m.conversation_id === c.id &&
        m.sender_id !== data.me &&
        m.created_at > (data.cursors.find((r) => r.conversation_id === c.id)?.read_at || ''),
    ),
  ).length;
  const posts = data.posts
    .filter(
      (p) =>
        (platform === 'All games' || p.platform === platform) &&
        (kind === 'all' || p.kind === kind) &&
        (exchange === 'all' ||
          (p.kind === 'offer' && p.exchange_modes?.includes(exchange as ExchangeMode))) &&
        (area === 'all' || p.area === area) &&
        (status === 'all' || p.status === status) &&
        (!friendsOnly || myFriends.includes(p.owner_id)) &&
        p.title.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const nav = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'people', label: 'Members', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessagesSquare, count: unreadChats },
    { id: 'shelf', label: 'My games', icon: BookOpen },
  ];
  const selectedPost = data.posts.find((p) => p.id === postId);
  function profileView(id: string) {
    navigate('profile');
    setProfileId(id);
    setProfileTab('owned');
  }
  function openPost(id: string) {
    setPostId(id);
    setPhotoIndex(0);
    navigate('thread');
  }
  function confirm(command: Command, title: string, explanation: string) {
    showPanel({ kind: 'confirm', command, title, explanation });
  }
  function resetFilters() {
    setPlatform('All games');
    setKind('all');
    setExchange('all');
    setArea('all');
    setStatus('open');
    setQuery('');
    setFriendsOnly(false);
  }
  function messageMember(user: string, id?: string) {
    const existing = data.conversations.find(
      (c) =>
        (c.from_id === data.me && c.to_id === user) || (c.to_id === data.me && c.from_id === user),
    );
    if (existing && (!id || existing.status !== 'active')) void openChat(existing.id);
    else
      showPanel({
        kind: 'message',
        user,
        id,
        body: id ? interestMessage(data.posts.find((p) => p.id === id)!) : '',
      });
  }
  function relationship(p: Profile) {
    const connection = data.connections.find(
      (c) =>
        (c.from_id === p.id && c.to_id === data.me) || (c.to_id === p.id && c.from_id === data.me),
    );
    return (
      <div className="gz-relationship" data-context>
        {connection?.status === 'accepted' ? (
          <>
            <span className="gz-success">
              <Check size={15} />
              You're connected
            </span>
            <button
              className="gz-link"
              onClick={() =>
                confirm(
                  { type: 'connection.remove', id: connection.id },
                  'Remove connection',
                  `Remove ${p.name} as a connection? You can still see each other’s posts.`,
                )
              }
            >
              Remove connection
            </button>
          </>
        ) : connection ? (
          connection.to_id === data.me ? (
            <>
              <p>{p.name.split(' ')[0]} wants to connect.</p>
              <div className="gz-actions">
                <button
                  className="gz-button primary"
                  disabled={busy}
                  onClick={() =>
                    void act({ type: 'connection.respond', id: connection.id, accept: true })
                  }
                >
                  Accept
                </button>
                <button
                  className="gz-button"
                  disabled={busy}
                  onClick={() =>
                    void act({ type: 'connection.respond', id: connection.id, accept: false })
                  }
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <span>Request sent</span>
              <button
                className="gz-link"
                onClick={() => void act({ type: 'connection.remove', id: connection.id })}
              >
                Cancel request
              </button>
            </>
          )
        ) : (
          <button
            className="gz-button"
            disabled={busy}
            onClick={() => void act({ type: 'connection.request', user_id: p.id })}
          >
            Connect
          </button>
        )}
      </div>
    );
  }
  function postCard(p: Post) {
    const owner = person(p.owner_id);
    const photos = data.images.filter((i) => i.post_id === p.id && i.url);
    const comments = data.comments
      .filter((c) => c.post_id === p.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = comments[0];
    return (
      <article
        className={`gz-post ${layout === 'compact' ? 'compact' : ''}`}
        key={p.id}
        data-context
      >
        {layout === 'compact' && (
          <button
            className="gz-thumb"
            aria-label={`Open ${p.title}`}
            onClick={() => openPost(p.id)}
          >
            {photos[0]?.url ? (
              <img src={photos[0].url} alt={`${p.title} physical copy`} />
            ) : (
              <GameThumbnail
                title={p.title}
                description={p.description}
                platform={p.platform}
                fallback
              />
            )}
          </button>
        )}
        <div className="gz-post-content">
          <div className="gz-post-byline">
            <PlatformMark platform={p.platform} />
            <strong>{p.platform}</strong>
            <span>·</span>
            <button onClick={() => profileView(p.owner_id)}>
              {owner?.name || 'Former member'}
            </button>
            <span>·</span>
            <span>{p.area}</span>
            <span>·</span>
            <span>{ago(p.created_at)}</span>
          </div>
          <div className="gz-post-title">
            {layout === 'card' && (
              <GameThumbnail title={p.title} description={p.description} platform={p.platform} />
            )}
            <h2>
              <button onClick={() => openPost(p.id)}>{p.title}</button>
            </h2>
          </div>
          <div className="gz-post-meta">
            <span className={`gz-kind ${p.kind}`}>{p.kind === 'offer' ? 'Offer' : 'Wanted'}</span>
            {arrangementLabels(p).map((label) => (
              <span key={label} className="gz-arrangement">
                {label}
              </span>
            ))}
            <span>
              {p.generation} · {p.format} · {p.condition}
            </span>
            {p.kind === 'offer' &&
              (!p.exchange_modes?.length || p.exchange_modes.includes('sale')) && (
                <strong className={p.price === null ? 'gz-muted' : ''}>{asking(p.price)}</strong>
              )}
            <Availability status={p.status} />
          </div>
          {layout === 'card' && (
            <>
              <p className="gz-post-excerpt">{p.description}</p>
              {!!photos.length && (
                <button
                  className="gz-post-media"
                  aria-label={`View photos of ${p.title}`}
                  onClick={() => openPost(p.id)}
                >
                  <img src={photos[0].url} alt={`${p.title} physical copy`} />
                  <span>
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </button>
              )}
              {(p.download_required || p.code_required) && (
                <p className="gz-compat-note">
                  {p.download_required && 'Download required. '}
                  {p.code_required && 'Some content requires a redemption code.'}
                </p>
              )}
              {latest && (
                <button className="gz-latest-comment" onClick={() => openPost(p.id)}>
                  <strong>{person(latest.author_id)?.name || 'Former member'}</strong>
                  <span>{latest.body}</span>
                  <small>{ago(latest.created_at)}</small>
                </button>
              )}
            </>
          )}
          <div className="gz-actions">
            <button className="gz-button subtle" onClick={() => openPost(p.id)}>
              <MessageCircle size={17} />
              {comments.length
                ? `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`
                : 'Comment'}
            </button>
            {p.owner_id !== data.me && p.status === 'open' && (
              <button className="gz-button subtle" onClick={() => messageMember(p.owner_id, p.id)}>
                <Send size={16} />
                {contactLabel(p)}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }
  function commentItem(c: Snapshot['comments'][number], parent?: string) {
    const author = person(c.author_id);
    return (
      <div key={c.id} className={`gz-comment ${parent ? 'is-reply' : ''}`}>
        <button
          className="gz-avatar-link"
          onClick={() => profileView(c.author_id)}
          aria-label={`View ${author?.name || 'former member'}`}
        >
          <Avatar profile={author} small />
        </button>
        <div className="gz-comment-body" data-context>
          <div className="gz-comment-heading">
            <button onClick={() => profileView(c.author_id)}>
              {author?.name || 'Former member'}
            </button>
            {c.author_id === selectedPost?.owner_id && (
              <span className="gz-owner-label">Owner</span>
            )}
            {c.author_id === data.me && <span>You</span>}
            <span>
              · {ago(c.created_at)}
              {c.edited_at ? ' · edited' : ''}
            </span>
          </div>
          <p>{c.body}</p>
          <div className="gz-comment-actions">
            {selectedPost?.status === 'open' && (
              <button
                onClick={() => {
                  setReply(parent || c.id);
                  showPanel({ kind: 'comment', id: selectedPost.id });
                }}
              >
                Reply
              </button>
            )}
            {c.author_id === data.me ? (
              <>
                <button onClick={() => showPanel({ kind: 'edit-comment', id: c.id })}>Edit</button>
                <button
                  onClick={() =>
                    confirm(
                      { type: 'comment.delete', id: c.id },
                      'Delete comment',
                      'Delete your comment? This cannot be undone.',
                    )
                  }
                >
                  Delete
                </button>
              </>
            ) : (
              <button onClick={() => report('comment', c.id)}>Report</button>
            )}
          </div>
        </div>
      </div>
    );
  }
  const currentConversation = data.conversations.find((c) => c.id === chat);
  const conversationPost = data.posts.find((p) => p.id === currentConversation?.post_id);
  const chatPerson = currentConversation
    ? person(
        currentConversation.from_id === data.me
          ? currentConversation.to_id
          : currentConversation.from_id,
      )
    : undefined;
  const viewedProfile = person(profileId || data.me) || me;
  const ownProfile = viewedProfile.id === data.me;
  const profilePosts = data.posts
    .filter((p) => p.owner_id === viewedProfile.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const profileShelf = data.shelf.filter(
    (s) => s.owner_id === viewedProfile.id && s.kind === profileTab,
  );
  const requests = data.connections.filter((c) => c.to_id === data.me && c.status === 'pending');
  const reportQueue = data.reports.filter((r) => r.status === reportFilter);
  const selectedReport = reportQueue.find((r) => r.id === reportId) || reportQueue[0];
  const boardName = platform === 'All games' ? 'All platforms' : platform;
  const basePosts = data.posts.filter(
    (p) =>
      (platform === 'All games' || p.platform === platform) &&
      (kind === 'all' || p.kind === kind) &&
      (area === 'all' || p.area === area) &&
      (!friendsOnly || myFriends.includes(p.owner_id)) &&
      p.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const hiddenPosts = status === 'open' ? basePosts.filter((p) => p.status !== 'open').length : 0;
  const typeOptions: [string, string][] = [
    ['all', 'All'],
    ['offer', 'Offers'],
    ['wanted', 'Wanted'],
  ];
  const statusOptions: [string, string][] = [
    ['open', 'Open'],
    ['paused', 'Paused'],
    ['closed', 'Closed'],
    ['all', 'Any status'],
  ];
  const areaOptions: [string, string][] = [
    ['all', 'Any area'],
    ...[...new Set(data.posts.map((p) => p.area))].sort().map((a) => [a, a] as [string, string]),
  ];
  const closePanel = () => {
    setModal(null);
    setReply(null);
  };
  const createPost = () => {
    setEditPostId(null);
    navigate('submit');
  };
  return (
    <div
      className={`app-shell community-ui ${page === 'messages' ? 'is-messaging' : ''} ${page === 'admin' ? 'is-admin' : ''} ${page === 'settings' ? 'is-settings' : ''} ${page === 'thread' ? 'is-thread' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="gz-header" data-context>
        {page === 'thread' && selectedPost && (
          <div className="gz-phone-thread-heading gz-mobile">
            <button className="gz-icon" aria-label="Back to feed" onClick={() => navigate('feed')}>
              <ArrowLeft size={22} />
            </button>
            <PlatformMark platform={selectedPost.platform} />
            <strong>{selectedPost.platform}</strong>
            {selectedPost.owner_id !== data.me && (
              <button className="gz-button subtle" onClick={() => report('post', selectedPost.id)}>
                Report
              </button>
            )}
          </div>
        )}
        <button
          className="gz-icon gz-mobile"
          aria-label="Open navigation"
          onClick={() => setMobileNav(true)}
        >
          <Menu size={22} />
        </button>
        <Brand home={() => navigate('feed')} />
        {page === 'admin' && (
          <span className="gz-admin-badge gz-desktop">
            <ShieldCheck size={14} />
            Admin
          </span>
        )}
        <label className="gz-search">
          <Search size={18} />
          <input
            type="search"
            aria-label="Search games"
            placeholder="Search game titles"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              navigate('feed');
            }}
          />
          <kbd>/</kbd>
        </label>
        <div className="gz-header-actions" data-context>
          <button
            className="gz-icon gz-theme-toggle"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          {page === 'admin' && (
            <button className="gz-button gz-admin-back gz-desktop" onClick={() => navigate('feed')}>
              <ArrowLeft size={16} />
              Back to community
            </button>
          )}
          <button
            className="gz-icon gz-mobile"
            aria-label="Search game titles"
            onClick={() => showPanel({ kind: 'filters' })}
          >
            <Search size={20} />
          </button>
          <button className="gz-button gz-desktop" onClick={createPost}>
            <Plus size={20} />
            Create
          </button>
          <button
            className="gz-icon gz-desktop"
            aria-label={`Messages, ${unreadChats} unread`}
            onClick={() => navigate('messages')}
          >
            <MessageCircle size={20} />
            {unreadChats > 0 && <b>{unreadChats}</b>}
          </button>
          <button
            className="gz-icon"
            aria-label={`Notifications, ${unread} unread`}
            onClick={() => navigate('notifications')}
          >
            <Bell size={20} />
            {unread > 0 && <b>{unread}</b>}
          </button>
          <details className="gz-account gz-desktop">
            <summary aria-label="Account menu">
              <Avatar profile={me} small />
              <ChevronDown size={15} />
            </summary>
            <div className="gz-menu-options">
              <button onClick={() => profileView(data.me)}>Your profile</button>
              <button onClick={() => navigate('settings')}>Settings</button>
              <button onClick={() => navigate('guidelines')}>Guidelines</button>
              {isAdmin && <button onClick={() => navigate('admin')}>Admin</button>}
              {!data.demo && <button onClick={() => void signOut()}>Sign out</button>}
            </div>
          </details>
        </div>
      </header>
      {mobileNav && (
        <button
          className="gz-nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <nav className={`gz-nav ${mobileNav ? 'open' : ''}`} aria-label="Primary">
        <div className="gz-drawer-profile gz-mobile">
          <Avatar profile={me} />
          <div>
            <strong>{me.name}</strong>
            <button
              onClick={() => {
                profileView(data.me);
                setMobileNav(false);
              }}
            >
              View profile
            </button>
          </div>
          <button
            className="gz-icon"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          >
            <X size={20} />
          </button>
        </div>
        {nav.map((n) => (
          <button
            key={n.id}
            aria-label={n.label}
            className={`gz-nav-item ${page === n.id || (n.id === 'feed' && ['thread', 'submit'].includes(page)) ? 'active' : ''}`}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={20} />
            <span>{n.label}</span>
            {!!n.count && <b>{n.count} new</b>}
          </button>
        ))}
        <h2>Platforms</h2>
        {['All games', ...platforms].map((p) => (
          <button
            key={p}
            className={`gz-nav-item ${platform === p ? 'active' : ''}`}
            onClick={() => {
              setPlatform(p);
              navigate('feed');
            }}
          >
            <PlatformMark platform={p} />
            {p === 'All games' ? 'All platforms' : p}
          </button>
        ))}
        <h2>Community</h2>
        <button
          className={`gz-nav-item ${page === 'guidelines' ? 'active' : ''}`}
          onClick={() => navigate('guidelines')}
        >
          <BookOpen size={20} />
          Guidelines
        </button>
        <button
          className={`gz-nav-item ${page === 'settings' ? 'active' : ''}`}
          onClick={() => navigate('settings')}
        >
          <Settings size={20} />
          Settings
        </button>
        {isAdmin && (
          <button
            aria-label="Admin"
            className={`gz-nav-item ${page === 'admin' ? 'active' : ''}`}
            onClick={() => navigate('admin')}
          >
            <ShieldCheck size={20} />
            <span>Admin</span>
            {data.reports.some((r) => r.status === 'open') && (
              <small>{data.reports.filter((r) => r.status === 'open').length} reports</small>
            )}
          </button>
        )}
        {data.demo && <p className="gz-demo-note">Preview · fictional members</p>}
      </nav>
      <main id="main-content" tabIndex={-1} className={`gz-workspace gz-page-${page}`}>
        {['feed', 'discover'].includes(page) && (
          <>
            <section className="gz-board gz-desktop">
              {platform !== 'All games' && (
                <div className="gz-board-banner">
                  <img src={platformBanners[platform] || '/images/games/rdr2-1.webp'} alt="" />
                </div>
              )}
              <div
                className={`gz-board-heading ${platform === 'All games' ? 'gz-board-simple' : ''}`}
              >
                <PlatformMark platform={platform} />
                <div>
                  <h1>{boardName}</h1>
                </div>
                <button className="gz-button primary" onClick={createPost}>
                  <Plus size={18} />
                  Create post
                </button>
              </div>
            </section>
            <h1 className="gz-sr-only gz-mobile">{boardName}</h1>
            <div className="gz-mobile-platforms gz-mobile">
              {['All games', ...platforms].map((p) => (
                <button
                  key={p}
                  aria-pressed={platform === p}
                  aria-label={p === 'All games' ? 'All platforms' : p}
                  className={platform === p ? 'selected' : ''}
                  onClick={() => setPlatform(p)}
                >
                  <PlatformMark platform={p} />
                  {p === 'All games' ? 'All' : p === 'Nintendo' ? null : p}
                </button>
              ))}
            </div>
            <div className="gz-columns">
              <section className="gz-feed-column" aria-label="Posts">
                <div className="gz-discovery-tabs" role="group" aria-label="Find a game">
                  {[
                    ['all', 'All posts'],
                    ['sale', 'Buy'],
                    ['swap', 'Swap'],
                    ['loan', 'Borrow'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={exchange === value}
                      className={exchange === value ? 'selected' : ''}
                      onClick={() => {
                        setExchange(value);
                        setLimit(8);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="gz-feed-toolbar" data-context>
                  <div className="gz-tabs" role="group" aria-label="Whose posts">
                    <button
                      className={!friendsOnly ? 'selected' : ''}
                      aria-pressed={!friendsOnly}
                      onClick={() => setFriendsOnly(false)}
                    >
                      Everyone
                    </button>
                    <button
                      className={friendsOnly ? 'selected' : ''}
                      aria-pressed={friendsOnly}
                      onClick={() => setFriendsOnly(true)}
                    >
                      Connections
                    </button>
                  </div>
                  <div className="gz-feed-options gz-desktop">
                    <ChoiceMenu
                      label="Type"
                      value={kind}
                      options={typeOptions}
                      onChange={setKind}
                    />
                    <ChoiceMenu
                      label="Status"
                      value={status}
                      options={statusOptions}
                      onChange={setStatus}
                    />
                    <ChoiceMenu
                      label="Area"
                      value={area}
                      options={areaOptions}
                      onChange={setArea}
                    />
                    <button
                      className={`gz-icon ${layout === 'card' ? 'selected' : ''}`}
                      aria-label="Card layout"
                      aria-pressed={layout === 'card'}
                      onClick={() => setLayout('card')}
                    >
                      <LayoutList size={18} />
                    </button>
                    <button
                      className={`gz-icon ${layout === 'compact' ? 'selected' : ''}`}
                      aria-label="Compact layout"
                      aria-pressed={layout === 'compact'}
                      onClick={() => setLayout('compact')}
                    >
                      <List size={18} />
                    </button>
                  </div>
                  <button
                    className="gz-button gz-mobile"
                    onClick={() => showPanel({ kind: 'filters' })}
                  >
                    <SlidersHorizontal size={16} />
                    Filters
                  </button>
                </div>
                <div className="gz-filter-summary" aria-live="polite">
                  <span>
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'} · newest first
                  </span>
                  {status !== 'all' && (
                    <button onClick={() => setStatus('all')}>
                      {status.charAt(0).toUpperCase() + status.slice(1)} only
                      <X size={13} />
                    </button>
                  )}
                  {kind !== 'all' && (
                    <button onClick={() => setKind('all')}>
                      {kind === 'offer' ? 'Offers' : 'Wanted'}
                      <X size={13} />
                    </button>
                  )}
                  {area !== 'all' && (
                    <button onClick={() => setArea('all')}>
                      {area}
                      <X size={13} />
                    </button>
                  )}
                  {query && (
                    <button onClick={() => setQuery('')}>
                      “{query}”<X size={13} />
                    </button>
                  )}
                  {(kind !== 'all' ||
                    area !== 'all' ||
                    platform !== 'All games' ||
                    friendsOnly ||
                    query ||
                    status !== 'open') && (
                    <button className="gz-link" onClick={resetFilters}>
                      Reset filters
                    </button>
                  )}
                </div>
                {posts.slice(0, limit).map(postCard)}
                {!posts.length && (
                  <Empty
                    title="Nothing matches these filters"
                    body="Try another area or status — or post a wanted ad so owners can find you."
                    action={
                      <div className="gz-actions">
                        <button className="gz-button" onClick={resetFilters}>
                          Reset filters
                        </button>
                        <button className="gz-button primary" onClick={createPost}>
                          Ask for a game
                        </button>
                      </div>
                    }
                  />
                )}
                {!!hiddenPosts && (
                  <div className="gz-hidden-posts">
                    {hiddenPosts} paused or closed {hiddenPosts === 1 ? 'post is' : 'posts are'}{' '}
                    hidden.
                    <button className="gz-link" onClick={() => setStatus('all')}>
                      Show them
                    </button>
                  </div>
                )}
                {posts.length > limit ? (
                  <button className="gz-button gz-load-more" onClick={() => setLimit(limit + 8)}>
                    Load more posts
                    <ChevronDown size={16} />
                  </button>
                ) : (
                  posts.length > 0 && <p className="gz-end-note">You're up to date.</p>
                )}
              </section>
              <aside className="gz-rail" aria-label="Community">
                <section className="gz-surface">
                  <h2>Connection requests</h2>
                  {requests.length ? (
                    requests.map((c) => {
                      const p = person(c.from_id);
                      return (
                        <div key={c.id} className="gz-request">
                          <Avatar profile={p} small />
                          <div>
                            <button className="gz-link" onClick={() => profileView(c.from_id)}>
                              {p?.name || 'Member'}
                            </button>
                            <p className="gz-small gz-muted">
                              {p?.area} · {p?.consoles.join(', ')}
                            </p>
                            <div className="gz-actions">
                              <button
                                className="gz-button primary"
                                disabled={busy}
                                onClick={() =>
                                  void act({ type: 'connection.respond', id: c.id, accept: true })
                                }
                              >
                                Accept
                              </button>
                              <button
                                className="gz-button"
                                disabled={busy}
                                onClick={() =>
                                  void act({ type: 'connection.respond', id: c.id, accept: false })
                                }
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="gz-small gz-muted">No pending requests.</p>
                  )}
                  <button className="gz-link" onClick={() => navigate('people')}>
                    Browse members
                  </button>
                </section>
                <footer className="gz-rail-footer">
                  <button onClick={() => navigate('guidelines')}>Guidelines</button> ·{' '}
                  <button onClick={() => navigate('settings')}>Privacy</button> ·{' '}
                  <button onClick={() => navigate('settings')}>Settings</button>
                  <p>Gamazon © {new Date().getFullYear()}</p>
                </footer>
              </aside>
            </div>
          </>
        )}
        {page === 'thread' &&
          (selectedPost ? (
            <div className="gz-columns">
              <article className="gz-thread" data-context>
                <div className="gz-post-byline">
                  <button
                    className="gz-icon gz-back"
                    aria-label="Back to feed"
                    onClick={() => navigate('feed')}
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <PlatformMark platform={selectedPost.platform} />
                  <strong>{selectedPost.platform}</strong>
                  <span className="gz-desktop">·</span>
                  <button onClick={() => profileView(selectedPost.owner_id)}>
                    {person(selectedPost.owner_id)?.name || 'Former member'}
                  </button>
                  <span>·</span>
                  <span>{selectedPost.area}</span>
                  <span>·</span>
                  <span>{ago(selectedPost.created_at)}</span>
                </div>
                <h1>{selectedPost.title}</h1>
                <div className="gz-post-meta">
                  <span className={`gz-kind ${selectedPost.kind}`}>
                    {selectedPost.kind === 'offer' ? 'Offer' : 'Wanted'}
                  </span>
                  {arrangementLabels(selectedPost).map((label) => (
                    <span key={label} className="gz-arrangement">
                      {label}
                    </span>
                  ))}
                  {selectedPost.price !== null && <strong>{asking(selectedPost.price)}</strong>}
                  <Availability status={selectedPost.status} />
                </div>
                {selectedPost.status !== 'open' && (
                  <p className="gz-surface">
                    {selectedPost.status === 'paused'
                      ? 'This post is paused — the game isn’t available right now. You can still read the discussion.'
                      : 'Closed — this copy is no longer available. The discussion stays up for reference.'}
                  </p>
                )}
                {data.images.some((i) => i.post_id === selectedPost.id && i.url) ? (
                  <div
                    className="gz-thread-media"
                    onTouchStart={(event) => {
                      swipeStart.current = event.touches[0]?.clientX ?? null;
                    }}
                    onTouchCancel={() => {
                      swipeStart.current = null;
                    }}
                    onTouchEnd={(event) => {
                      const start = swipeStart.current;
                      swipeStart.current = null;
                      const end = event.changedTouches[0]?.clientX;
                      const count = data.images.filter(
                        (image) => image.post_id === selectedPost.id && image.url,
                      ).length;
                      if (start !== null && end !== undefined && Math.abs(start - end) > 40)
                        setPhotoIndex((index) => (index + (start > end ? 1 : count - 1)) % count);
                    }}
                  >
                    {(() => {
                      const images = data.images.filter(
                        (i) => i.post_id === selectedPost.id && i.url,
                      );
                      const index = photoIndex % images.length;
                      return (
                        <>
                          <img
                            src={images[index].url}
                            alt={`${selectedPost.title} physical copy, photo ${index + 1}`}
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                className="gz-icon prev"
                                aria-label="Previous photo"
                                onClick={() =>
                                  setPhotoIndex((index + images.length - 1) % images.length)
                                }
                              >
                                <ChevronLeft />
                              </button>
                              <button
                                className="gz-icon next"
                                aria-label="Next photo"
                                onClick={() => setPhotoIndex((index + 1) % images.length)}
                              >
                                <ChevronRight />
                              </button>
                            </>
                          )}
                          <span className="gz-photo-label">Owner's photo</span>
                          <span className="gz-photo-count" aria-live="polite">
                            {index + 1} of {images.length}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  selectedPost.kind === 'offer' && <GameArt post={selectedPost} large />
                )}
                <dl className="gz-specs">
                  {[
                    ['Platform', selectedPost.platform],
                    ['Console', selectedPost.generation],
                    ['Format', selectedPost.format],
                    ['Condition', selectedPost.condition],
                    ['Asking price', asking(selectedPost.price)],
                    ['Area', selectedPost.area],
                  ].map(([title, value]) => (
                    <div key={title}>
                      <dt>{title}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {(selectedPost.drive_required ||
                  selectedPost.download_required ||
                  selectedPost.code_required) && (
                  <section className="gz-compatibility">
                    <h2>Requirements</h2>
                    {selectedPost.drive_required && (
                      <p>
                        <Disc3 size={20} />
                        Disc drive required.
                      </p>
                    )}
                    {selectedPost.download_required && (
                      <p>
                        <ArrowDownWideNarrow size={20} />
                        Download required.
                      </p>
                    )}
                    {selectedPost.code_required && (
                      <p>
                        <BookOpen size={20} />
                        Some content requires a redemption code.
                      </p>
                    )}
                  </section>
                )}
                <p className="gz-thread-description">{selectedPost.description}</p>
                <div className="gz-thread-actions" data-context>
                  <button
                    className="gz-button subtle"
                    onClick={() =>
                      document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    <MessageCircle size={17} />
                    {data.comments.filter((c) => c.post_id === selectedPost.id).length}{' '}
                    {data.comments.filter((c) => c.post_id === selectedPost.id).length === 1
                      ? 'comment'
                      : 'comments'}
                  </button>
                  {selectedPost.owner_id === data.me ? (
                    <>
                      <button
                        className="gz-button"
                        onClick={() => {
                          setEditPostId(selectedPost.id);
                          navigate('submit');
                        }}
                      >
                        Edit listing
                      </button>
                      <ChoiceMenu
                        label="Status"
                        value={selectedPost.status}
                        options={statusOptions.filter((o) => o[0] !== 'all')}
                        onChange={(value) =>
                          void act({
                            type: 'post.status',
                            id: selectedPost.id,
                            status: value as Post['status'],
                          })
                        }
                      />
                      <label className="gz-button subtle gz-upload-button">
                        Add photos
                        <input
                          type="file"
                          aria-label="Add photos"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              await uploadPhoto(file, selectedPost.id);
                              await reload();
                              setToast('Photo added.');
                            } catch (error) {
                              setToast((error as Error).message);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        className="gz-button danger"
                        onClick={() =>
                          confirm(
                            { type: 'post.delete', id: selectedPost.id },
                            'Delete post',
                            'Delete this post and its discussion? This cannot be undone.',
                          )
                        }
                      >
                        Delete post
                      </button>
                    </>
                  ) : (
                    <>
                      {selectedPost.status === 'open' && (
                        <button
                          className="gz-button primary"
                          onClick={() => messageMember(selectedPost.owner_id, selectedPost.id)}
                        >
                          <Send size={17} />
                          {contactLabel(selectedPost)}
                        </button>
                      )}
                      <button
                        className="gz-button subtle"
                        onClick={() => report('post', selectedPost.id)}
                      >
                        <Flag size={16} />
                        Report
                      </button>
                    </>
                  )}
                </div>
                <section
                  id="discussion"
                  className="gz-discussion"
                  aria-label="Discussion"
                  data-context
                >
                  {selectedPost.status === 'open' ? (
                    <button
                      className="gz-comment-prompt"
                      onClick={() => {
                        setReply(null);
                        showPanel({ kind: 'comment', id: selectedPost.id });
                      }}
                    >
                      Add a comment
                    </button>
                  ) : (
                    <p className="gz-locked">
                      <LockKeyhole size={16} />
                      Comments are{' '}
                      {selectedPost.status === 'paused'
                        ? 'paused with the post.'
                        : 'locked because this post is closed.'}
                    </p>
                  )}
                  <div className="gz-section-heading">
                    <h2>
                      {data.comments.filter((c) => c.post_id === selectedPost.id).length}{' '}
                      {data.comments.filter((c) => c.post_id === selectedPost.id).length === 1
                        ? 'comment'
                        : 'comments'}
                    </h2>
                    <span>Oldest first</span>
                  </div>
                  {data.comments
                    .filter((c) => c.post_id === selectedPost.id && !c.parent_id)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((c) => {
                      const replies = data.comments.filter((r) => r.parent_id === c.id);
                      const isCollapsed = collapsed.includes(c.id);
                      return (
                        <div key={c.id} className="gz-comment-thread">
                          {commentItem(c)}
                          {!!replies.length && (
                            <>
                              <button
                                className="gz-collapse"
                                onClick={() =>
                                  setCollapsed(
                                    isCollapsed
                                      ? collapsed.filter((id) => id !== c.id)
                                      : [...collapsed, c.id],
                                  )
                                }
                                aria-expanded={!isCollapsed}
                              >
                                {isCollapsed
                                  ? `+ ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
                                  : 'Collapse replies'}
                              </button>
                              {!isCollapsed && (
                                <div className="gz-replies">
                                  {replies.map((r) => commentItem(r, c.id))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  {!data.comments.some((c) => c.post_id === selectedPost.id) && (
                    <p className="gz-muted">
                      No comments yet. Ask about the copy, or suggest a swap.
                    </p>
                  )}
                </section>
                <div className="gz-thread-mobile-actions gz-mobile" data-context>
                  <button
                    className="gz-button"
                    disabled={selectedPost.status !== 'open'}
                    onClick={() => {
                      setReply(null);
                      showPanel({ kind: 'comment', id: selectedPost.id });
                    }}
                  >
                    Add a comment
                  </button>
                  {selectedPost.owner_id !== data.me && selectedPost.status === 'open' && (
                    <button
                      className="gz-button primary"
                      onClick={() => messageMember(selectedPost.owner_id, selectedPost.id)}
                    >
                      <Send size={17} />
                      {contactLabel(selectedPost)}
                    </button>
                  )}
                </div>
              </article>
              <aside className="gz-rail">
                <section className="gz-surface" data-context>
                  <button
                    className="gz-person-row"
                    onClick={() => profileView(selectedPost.owner_id)}
                  >
                    <Avatar profile={person(selectedPost.owner_id)} small />
                    <span>
                      <strong>{person(selectedPost.owner_id)?.name || 'Former member'}</strong>
                      <small>
                        {selectedPost.area} · {person(selectedPost.owner_id)?.consoles.join(', ')}
                      </small>
                    </span>
                  </button>
                  <p>{person(selectedPost.owner_id)?.bio}</p>
                  {selectedPost.owner_id === data.me ? (
                    <>
                      <h2>Your post</h2>
                      <p className="gz-small gz-muted">
                        Pause it while you're talking to someone. Close it once the game has changed
                        hands — the discussion stays readable.
                      </p>
                      <p className="gz-small gz-muted">
                        Edit listing updates the same post. Its photos and conversation stay
                        together.
                      </p>
                    </>
                  ) : (
                    <div className="gz-actions">
                      <button
                        className="gz-button primary"
                        disabled={selectedPost.status !== 'open'}
                        onClick={() => messageMember(selectedPost.owner_id, selectedPost.id)}
                      >
                        {selectedPost.status === 'open'
                          ? contactLabel(selectedPost)
                          : selectedPost.status === 'paused'
                            ? 'Listing paused'
                            : 'Listing closed'}
                      </button>
                      <button
                        className="gz-button"
                        onClick={() => profileView(selectedPost.owner_id)}
                      >
                        Profile
                      </button>
                    </div>
                  )}
                </section>
                <section className="gz-surface">
                  <h2>
                    More from {person(selectedPost.owner_id)?.name.split(' ')[0] || 'this member'}
                  </h2>
                  {data.posts
                    .filter((p) => p.owner_id === selectedPost.owner_id && p.id !== selectedPost.id)
                    .slice(0, 3)
                    .map((p) => (
                      <button key={p.id} className="gz-related" onClick={() => openPost(p.id)}>
                        <strong>{p.title}</strong>
                        <span>
                          {p.generation} · {p.format} · {asking(p.price)}
                        </span>
                        <Availability status={p.status} />
                      </button>
                    ))}
                </section>
              </aside>
            </div>
          ) : (
            <Empty
              title="This post isn't available"
              body="It was deleted by its owner or removed by a moderator."
              action={
                <button className="gz-button primary" onClick={() => navigate('feed')}>
                  Back to the feed
                </button>
              }
            />
          ))}
        {page === 'submit' && (
          <PostForm
            key={editPostId || 'new'}
            initial={data.posts.find((p) => p.id === editPostId)}
            me={me}
            create={act}
            reload={reload}
            close={() => navigate('feed')}
            view={openPost}
          />
        )}
        {page === 'people' && (
          <div className="gz-members-page">
            <div className="gz-page-heading">
              <h1>Members</h1>
              <p className="gz-muted">View profiles, connect, or send a message.</p>
            </div>
            <div className="gz-member-grid">
              {data.profiles
                .filter((p) => p.id !== data.me)
                .map((p) => (
                  <section className="gz-surface gz-member" key={p.id} data-context>
                    <button className="gz-person-row" onClick={() => profileView(p.id)}>
                      <Avatar profile={p} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.area} · {p.consoles.join(', ')}
                        </small>
                      </span>
                    </button>
                    <p>{p.bio}</p>
                    <div className="gz-actions">
                      <button className="gz-button" onClick={() => profileView(p.id)}>
                        View profile
                        <ArrowRight size={15} />
                      </button>
                      <button className="gz-button" onClick={() => messageMember(p.id)}>
                        Message
                      </button>
                    </div>
                    {relationship(p)}
                  </section>
                ))}
            </div>
          </div>
        )}
        {['profile', 'shelf'].includes(page) && (
          <div className="gz-columns gz-profile-columns">
            <section className="gz-profile-main">
              <div className="gz-profile-heading">
                <Avatar profile={viewedProfile} />
                <div>
                  <h1>{viewedProfile.name}</h1>
                  <p>
                    {viewedProfile.area}
                    {ownProfile
                      ? ' · Your profile'
                      : viewedProfile.handle
                        ? ` · ${viewedProfile.handle}`
                        : ''}
                  </p>
                </div>
              </div>
              <div className="gz-tabs" role="group" aria-label="Profile sections">
                {[
                  ['posts', 'Posts', profilePosts.length],
                  [
                    'owned',
                    'Shelf',
                    data.shelf.filter((s) => s.owner_id === viewedProfile.id && s.kind === 'owned')
                      .length,
                  ],
                  [
                    'wishlist',
                    'Wishlist',
                    data.shelf.filter(
                      (s) => s.owner_id === viewedProfile.id && s.kind === 'wishlist',
                    ).length,
                  ],
                ].map(([id, label, count]) => (
                  <button
                    key={id}
                    aria-pressed={profileTab === id}
                    className={profileTab === id ? 'selected' : ''}
                    onClick={() => setProfileTab(String(id))}
                  >
                    {label} <span>{count}</span>
                  </button>
                ))}
              </div>
              <p className="gz-small gz-muted">
                {profileTab === 'posts'
                  ? `${ownProfile ? 'Your' : viewedProfile.name.split(' ')[0] + '’s'} offers and wanted posts. Only open offers are available.`
                  : profileTab === 'owned'
                    ? ownProfile
                      ? 'Games you own. Adding one here doesn’t offer it to anyone.'
                      : 'Games they own. Owning isn’t the same as offering — look for an open post.'
                    : 'Games you’re hoping to find. Members can see this list.'}
              </p>
              {ownProfile && profileTab !== 'posts' && (
                <form
                  className="gz-shelf-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget),
                      form = e.currentTarget;
                    const r = await act({
                      type: 'shelf.add',
                      title: String(f.get('title')),
                      platform: f.get('platform') as Platform,
                      kind: f.get('kind') as 'owned' | 'wishlist',
                    });
                    if (r) {
                      form.reset();
                      setProfileTab(String(f.get('kind')));
                      setToast(
                        f.get('kind') === 'owned'
                          ? 'Added to your shelf. Create a post to offer it.'
                          : 'Added to your wishlist.',
                      );
                    }
                  }}
                >
                  <Field label="Game title">
                    <input name="title" required maxLength={100} placeholder="e.g. Hollow Knight" />
                  </Field>
                  <Field label="Platform">
                    <select name="platform">
                      {platforms.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Add to">
                    <select name="kind" defaultValue={profileTab} key={profileTab}>
                      <option value="owned">My shelf (I own it)</option>
                      <option value="wishlist">Wishlist (I want it)</option>
                    </select>
                  </Field>
                  <button className="gz-button primary" disabled={busy}>
                    Add
                  </button>
                </form>
              )}
              {profileTab === 'posts' ? (
                <>
                  <div className="gz-profile-posts">
                    {profilePosts.map((p) => (
                      <div key={p.id} className="gz-profile-post">
                        <GameThumbnail
                          title={p.title}
                          description={p.description}
                          platform={p.platform}
                          fallback
                        />
                        <button onClick={() => openPost(p.id)}>
                          <strong>{p.title}</strong>
                          <span>
                            <span className={`gz-kind ${p.kind}`}>
                              {p.kind === 'offer' ? 'Offer' : 'Wanted'}
                            </span>{' '}
                            {p.generation} · {p.format} · {asking(p.price)}
                          </span>
                          <small>
                            {data.comments.filter((c) => c.post_id === p.id).length} comments ·{' '}
                            {ago(p.created_at)}
                          </small>
                        </button>
                        <Availability status={p.status} />
                      </div>
                    ))}
                  </div>
                  {!profilePosts.length && (
                    <Empty
                      title={ownProfile ? 'You haven’t posted yet' : 'No posts yet'}
                      body="Offer a game from your shelf, or ask for one you’re after."
                      action={
                        ownProfile ? (
                          <button className="gz-button primary" onClick={createPost}>
                            Create a post
                          </button>
                        ) : undefined
                      }
                    />
                  )}
                </>
              ) : (
                <div className="gz-shelf-list">
                  {profileShelf.map((s) => {
                    const offer = profilePosts.find(
                      (p) =>
                        p.kind === 'offer' &&
                        p.title.toLowerCase() === s.title.toLowerCase() &&
                        p.platform === s.platform &&
                        p.status !== 'closed',
                    );
                    return (
                      <div key={s.id} className="gz-shelf-row" data-context>
                        <GameThumbnail
                          title={s.title}
                          description={
                            data.posts.find((p) => p.title === s.title && p.platform === s.platform)
                              ?.description
                          }
                          platform={s.platform}
                          fallback
                        />
                        <div>
                          <h3>{s.title}</h3>
                          <span>{s.platform}</span>
                          {offer && (
                            <button className="gz-link" onClick={() => openPost(offer.id)}>
                              Offered · {offer.status}
                            </button>
                          )}
                        </div>
                        {ownProfile && (
                          <button
                            className="gz-button"
                            onClick={() =>
                              confirm(
                                { type: 'shelf.remove', id: s.id },
                                'Remove game',
                                `Remove ${s.title} from your ${profileTab === 'owned' ? 'shelf' : 'wishlist'}? Your posts are unaffected.`,
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {!profileShelf.length && (
                    <Empty
                      title={
                        profileTab === 'owned' ? 'Your shelf is empty' : 'Nothing on the wishlist'
                      }
                      body={
                        ownProfile
                          ? 'Add games using the form above.'
                          : 'Check back later, or look at their posts.'
                      }
                    />
                  )}
                </div>
              )}
            </section>
            <aside className="gz-rail">
              <section className="gz-surface" data-context>
                <p>{viewedProfile.bio || 'No bio yet.'}</p>
                <h2>Consoles</h2>
                <div className="gz-tags">
                  {viewedProfile.consoles.map((c) => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
                <h2>Likes</h2>
                <p>{viewedProfile.genres.join(', ') || 'Not added yet'}</p>
                {viewedProfile.handle && (
                  <>
                    <h2>Gaming handle</h2>
                    <p>{viewedProfile.handle}</p>
                  </>
                )}
                {ownProfile ? (
                  <div className="gz-actions">
                    <button
                      className="gz-button"
                      onClick={() => showPanel({ kind: 'edit-profile' })}
                    >
                      Edit profile
                    </button>
                    <button className="gz-button" onClick={() => navigate('settings')}>
                      Settings
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className="gz-button primary full"
                      onClick={() => messageMember(viewedProfile.id)}
                    >
                      Message
                    </button>
                    {relationship(viewedProfile)}
                  </>
                )}
              </section>
              {!ownProfile && (
                <section className="gz-surface" data-context>
                  <button className="gz-button" onClick={() => report('profile', viewedProfile.id)}>
                    <Flag size={16} />
                    Report {viewedProfile.name.split(' ')[0]}
                  </button>
                  <button
                    className="gz-button danger"
                    onClick={() =>
                      confirm(
                        { type: 'block', user_id: viewedProfile.id },
                        'Block member',
                        `Block ${viewedProfile.name}? They can’t message you and their posts are hidden from you. Past messages aren’t deleted.`,
                      )
                    }
                  >
                    <ShieldCheck size={16} />
                    Block {viewedProfile.name.split(' ')[0]}
                  </button>
                </section>
              )}
            </aside>
          </div>
        )}
        {page === 'messages' && (
          <div className={`gz-messenger ${chat ? 'has-chat' : ''}`}>
            <aside className="gz-conversations" aria-label="Conversations">
              <div className="gz-conversation-title">
                <h1>Messages</h1>
                <div className="gz-tabs">
                  <button
                    className={!requestTab ? 'selected' : ''}
                    onClick={() => setRequestTab(false)}
                  >
                    All
                  </button>
                  <button
                    className={requestTab ? 'selected' : ''}
                    onClick={() => setRequestTab(true)}
                  >
                    Requests ·{' '}
                    {
                      data.conversations.filter(
                        (c) => c.status === 'pending' && c.to_id === data.me,
                      ).length
                    }
                  </button>
                </div>
              </div>
              {data.conversations
                .filter((c) => !requestTab || (c.status === 'pending' && c.to_id === data.me))
                .map((c) => {
                  const p = person(c.from_id === data.me ? c.to_id : c.from_id);
                  const last = data.messages
                    .filter((m) => m.conversation_id === c.id)
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .at(-1);
                  const unreadCount = data.messages.filter(
                    (m) =>
                      m.conversation_id === c.id &&
                      m.sender_id !== data.me &&
                      m.created_at >
                        (data.cursors.find((r) => r.conversation_id === c.id)?.read_at || ''),
                  ).length;
                  return (
                    <button
                      key={c.id}
                      className={`gz-conversation-preview ${chat === c.id ? 'selected' : ''}`}
                      onClick={() => void openChat(c.id)}
                    >
                      <Avatar profile={p} />
                      <span>
                        <strong>
                          {p?.name || 'Member unavailable'}
                          <small>{ago(last?.created_at || c.created_at)}</small>
                        </strong>
                        <span>
                          {last?.sender_id === data.me ? 'You: ' : ''}
                          {last?.body || 'No messages yet'}
                        </span>
                        {c.status !== 'active' && (
                          <em>
                            {c.status === 'declined'
                              ? 'Declined'
                              : c.to_id === data.me
                                ? 'Message request'
                                : 'Waiting for reply'}
                          </em>
                        )}
                      </span>
                      {!!unreadCount && <b>{unreadCount}</b>}
                    </button>
                  );
                })}
              {!data.conversations.filter(
                (c) => !requestTab || (c.status === 'pending' && c.to_id === data.me),
              ).length && (
                <p className="gz-empty-note">
                  {requestTab
                    ? 'No message requests right now.'
                    : 'No conversations yet. Find a game and message its owner.'}
                </p>
              )}
            </aside>
            <section
              className="gz-chat"
              aria-label={chatPerson ? `Conversation with ${chatPerson.name}` : 'Conversation'}
            >
              {currentConversation ? (
                <>
                  <header className="gz-chat-header" data-context>
                    <button
                      className="gz-icon gz-mobile"
                      aria-label="Back to conversations"
                      onClick={() => setChat(null)}
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <Avatar profile={chatPerson} small />
                    <div>
                      <strong>{chatPerson?.name || 'Member unavailable'}</strong>
                      <small>
                        {chatPerson?.area}
                        {chatPerson
                          ? myFriends.includes(chatPerson.id)
                            ? ' · Connected'
                            : ' · Not connected'
                          : 'This account is no longer active'}
                      </small>
                    </div>
                    {chatPerson && (
                      <>
                        <button
                          className="gz-button gz-desktop"
                          onClick={() => profileView(chatPerson.id)}
                        >
                          View profile
                        </button>
                        <button
                          className="gz-button"
                          onClick={() => showPanel({ kind: 'safety', user: chatPerson.id })}
                        >
                          Safety
                          <ChevronDown size={15} />
                        </button>
                      </>
                    )}
                  </header>
                  {offline && (
                    <p className="gz-offline" role="status">
                      Reconnecting… new messages will appear when you're back online.
                    </p>
                  )}
                  {currentConversation.post_id && (
                    <button
                      className="gz-chat-listing"
                      onClick={() => openPost(currentConversation.post_id!)}
                    >
                      {conversationPost ? (
                        <GameThumbnail
                          title={conversationPost.title}
                          description={conversationPost.description}
                          platform={conversationPost.platform}
                          fallback
                        />
                      ) : (
                        <Disc3 size={22} />
                      )}
                      <span>
                        <small>Started from</small>
                        <strong>{conversationPost?.title || 'Post removed'}</strong>
                      </span>
                      {conversationPost && <Availability status={conversationPost.status} />}
                    </button>
                  )}
                  <div className="gz-message-history">
                    {data.messages
                      .filter((m) => m.conversation_id === chat)
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((m, i, all) => {
                        const sender = person(m.sender_id),
                          prev = all[i - 1],
                          same = prev?.sender_id === m.sender_id;
                        const day = new Date(m.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                        });
                        return (
                          <div key={m.id}>
                            {(!prev ||
                              new Date(prev.created_at).toDateString() !==
                                new Date(m.created_at).toDateString()) && (
                              <p className="gz-message-day">{day}</p>
                            )}
                            <div className={`gz-message-row ${same ? 'grouped' : ''}`} data-context>
                              {!same ? (
                                <Avatar profile={sender} small />
                              ) : (
                                <span className="gz-avatar-spacer" />
                              )}
                              <div className="gz-message-text">
                                {!same && (
                                  <div>
                                    <strong>{sender?.name || 'Former member'}</strong>
                                    <small>
                                      {new Date(m.created_at).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </small>
                                  </div>
                                )}
                                <p>{m.body}</p>
                                {m.sender_id !== data.me && (
                                  <button
                                    className="gz-message-report"
                                    onClick={() => report('message', m.id)}
                                  >
                                    Report
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    <div ref={messageEnd} />
                  </div>
                  {currentConversation.status === 'active' && currentConversation.post_id && (
                    <div className="gz-outcome">
                      <span>
                        {data.outcomes.find(
                          (o) =>
                            o.conversation_id === currentConversation.id && o.user_id === data.me,
                        )?.exchanged
                          ? 'You noted that you exchanged this game.'
                          : 'Did you exchange this game?'}
                      </span>
                      <small>
                        Private — your answer isn’t posted or shown to the other member.
                      </small>
                      <div className="gz-actions">
                        <button
                          className="gz-button"
                          onClick={() =>
                            void act({
                              type: 'outcome',
                              conversation_id: currentConversation.id,
                              exchanged: true,
                            })
                          }
                        >
                          Yes
                        </button>
                        <button
                          className="gz-button"
                          onClick={() =>
                            void act({
                              type: 'outcome',
                              conversation_id: currentConversation.id,
                              exchanged: false,
                            })
                          }
                        >
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}
                  {currentConversation.status === 'pending' ? (
                    <div className="gz-message-request" data-context>
                      <h2>
                        {currentConversation.to_id === data.me
                          ? `${chatPerson?.name.split(' ')[0] || 'A member'} wants to message you`
                          : 'Message request sent'}
                      </h2>
                      <p>
                        {currentConversation.to_id === data.me
                          ? 'You’re not connected. Accept to reply — you can block or report at any time.'
                          : 'You can send more once they accept.'}
                      </p>
                      {currentConversation.to_id === data.me && (
                        <div className="gz-actions">
                          <button
                            className="gz-button primary"
                            disabled={busy}
                            onClick={() =>
                              void act({
                                type: 'conversation.respond',
                                id: currentConversation.id,
                                accept: true,
                              })
                            }
                          >
                            Accept
                          </button>
                          <button
                            className="gz-button"
                            disabled={busy}
                            onClick={() =>
                              confirm(
                                {
                                  type: 'conversation.respond',
                                  id: currentConversation.id,
                                  accept: false,
                                },
                                'Decline request',
                                'Decline this message request? Further replies will be unavailable.',
                              )
                            }
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  ) : currentConversation.status === 'declined' || !chatPerson ? (
                    <p className="gz-locked">
                      <LockKeyhole size={18} />
                      {chatPerson
                        ? 'This message request was declined.'
                        : 'You can’t reply — this member is no longer available.'}
                    </p>
                  ) : (
                    <form
                      key={currentConversation.id}
                      className="gz-compose"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (busy || offline) return;
                        const form = e.currentTarget,
                          body = String(new FormData(form).get('body')).trim();
                        if (!body) return;
                        if (
                          !pendingSend.current ||
                          pendingSend.current.conversation !== currentConversation.id ||
                          pendingSend.current.body !== body
                        )
                          pendingSend.current = {
                            conversation: currentConversation.id,
                            body,
                            id: crypto.randomUUID(),
                          };
                        const r = await act({
                          type: 'message.send',
                          conversation_id: currentConversation.id,
                          body,
                          message_id: pendingSend.current.id,
                        });
                        if (r) {
                          form.reset();
                          pendingSend.current = null;
                        } else
                          setToast('Not sent. Your message is still here — press Send to retry.');
                      }}
                    >
                      <textarea
                        name="body"
                        aria-label="Message"
                        placeholder={`Message ${chatPerson.name.split(' ')[0]}`}
                        rows={2}
                        required
                        maxLength={2000}
                        disabled={offline}
                      />
                      <button
                        className="gz-icon"
                        disabled={busy || offline}
                        aria-label="Send message"
                      >
                        {busy ? <LoaderCircle className="spin" size={20} /> : <Send size={20} />}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <Empty
                  title="No conversation selected"
                  body="Choose a conversation, or find a game and message its owner."
                />
              )}
            </section>
          </div>
        )}
        {page === 'notifications' && (
          <section className="gz-notifications">
            <div className="gz-page-heading gz-horizontal">
              <h1>Notifications</h1>
              <button
                className="gz-button"
                disabled={busy || !unread}
                onClick={async () => {
                  for (const n of data.notifications.filter((n) => !n.read))
                    await act({ type: 'notification.read', id: n.id });
                }}
              >
                Mark all as read
              </button>
            </div>
            <div className="gz-tabs">
              <button
                className={notificationTab === 'all' ? 'selected' : ''}
                onClick={() => setNotificationTab('all')}
              >
                All
              </button>
              <button
                className={notificationTab === 'unread' ? 'selected' : ''}
                onClick={() => setNotificationTab('unread')}
              >
                Unread · {unread}
              </button>
            </div>
            {['Today', 'Yesterday', 'Earlier'].map((group) => {
              const notifications = data.notifications
                .filter((n) => notificationTab === 'all' || !n.read)
                .filter((n) => {
                  const day = new Date(n.created_at).toDateString(),
                    now = new Date(),
                    yesterday = new Date(Date.now() - 86400000);
                  return (
                    (day === now.toDateString()
                      ? 'Today'
                      : day === yesterday.toDateString()
                        ? 'Yesterday'
                        : 'Earlier') === group
                  );
                })
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
              return notifications.length ? (
                <section key={group} className="gz-notification-group">
                  <h2>{group}</h2>
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`gz-notification ${n.read ? '' : 'unread'}`}
                      onClick={async () => {
                        if (!(await act({ type: 'notification.read', id: n.id }))) return;
                        if (n.target.startsWith('post:')) openPost(n.target.slice(5));
                        else if (n.target.startsWith('chat:')) await openChat(n.target.slice(5));
                        else navigate(n.target === 'people' ? 'people' : n.target);
                      }}
                    >
                      <span className="gz-notification-icon">
                        {n.target.startsWith('chat:') ? (
                          <MessageCircle size={21} />
                        ) : n.target.startsWith('post:') ? (
                          <MessageCircle size={21} />
                        ) : (
                          <Users size={21} />
                        )}
                      </span>
                      <span>
                        <strong>{n.text}</strong>
                        <small>
                          {n.target.startsWith('chat:')
                            ? 'Message'
                            : n.target.startsWith('post:')
                              ? 'Reply'
                              : 'Connection'}{' '}
                          · {ago(n.created_at)}
                        </small>
                      </span>
                      {!n.read && <i aria-label="Unread" />}
                    </button>
                  ))}
                </section>
              ) : null;
            })}
            {!data.notifications.filter((n) => notificationTab === 'all' || !n.read).length && (
              <Empty
                title={
                  notificationTab === 'unread' && data.notifications.length
                    ? 'Nothing unread'
                    : 'You’re all caught up'
                }
                body="You’ll hear about replies to your comments, accepted connections and new messages here."
                action={
                  <button className="gz-button" onClick={() => navigate('feed')}>
                    Back to the feed
                  </button>
                }
              />
            )}
          </section>
        )}
        {page === 'settings' && (
          <section className="gz-settings">
            <h1>Settings</h1>
            <div className="gz-tabs gz-line-tabs">
              {[
                ['account', 'Account'],
                ['privacy', 'Privacy and safety'],
                ...(isAdmin ? [['auth', 'Authenticator']] : []),
                ['delete', 'Delete account'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={settingsTab === id ? 'selected' : ''}
                  onClick={() => setSettingsTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {settingsTab === 'account' && (
              <>
                <div className="gz-settings-row">
                  <div>
                    <h2>Appearance</h2>
                    <p>Choose light or dark mode.</p>
                  </div>
                  <div className="gz-theme-options" role="group" aria-label="Colour theme">
                    <button
                      className="gz-button"
                      aria-pressed={theme === 'light'}
                      onClick={() => changeTheme('light')}
                    >
                      <Sun size={16} /> Light
                    </button>
                    <button
                      className="gz-button"
                      aria-pressed={theme === 'dark'}
                      onClick={() => changeTheme('dark')}
                    >
                      <Moon size={16} /> Dark
                    </button>
                  </div>
                </div>
                <div className="gz-settings-row">
                  <div>
                    <h2>Email</h2>
                    <p>Sign-in codes are sent to your verified email. There’s no password.</p>
                  </div>
                </div>
                <div className="gz-settings-row" data-context>
                  <div>
                    <h2>Profile</h2>
                    <p>Name, area, bio, consoles and profile colour.</p>
                  </div>
                  <button className="gz-button" onClick={() => showPanel({ kind: 'edit-profile' })}>
                    Edit profile
                  </button>
                </div>
                <div className="gz-settings-row">
                  <div>
                    <h2>Community guidelines</h2>
                    <p>What’s allowed, meeting safely, and how reports work.</p>
                  </div>
                  <button className="gz-button" onClick={() => navigate('guidelines')}>
                    Read
                  </button>
                </div>
                <div className="gz-settings-row">
                  <div>
                    <h2>Sign out</h2>
                    <p>Signs you out on this device.</p>
                  </div>
                  {data.demo ? (
                    <span className="gz-muted">Preview session</span>
                  ) : (
                    <button className="gz-button" onClick={() => void signOut()}>
                      Sign out
                    </button>
                  )}
                </div>
                {data.demo && (
                  <div className="gz-settings-row">
                    <div>
                      <h2>Preview member</h2>
                      <p>Switch fictional members to test requests and replies.</p>
                    </div>
                    <select
                      aria-label="Demo member"
                      value={data.me}
                      onChange={async (e) => {
                        await fetch('/api/v1/demo', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: e.target.value }),
                        });
                        await reload();
                        navigate('feed');
                      }}
                    >
                      {data.profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            {settingsTab === 'privacy' && (
              <>
                <section className="gz-surface">
                  <h2>Who sees what</h2>
                  <p>
                    Only active members can see your profile, posts, photos and comments. Your
                    neighbourhood is shown; keep your address and exact meeting location private.
                  </p>
                  <p>
                    Messages are private to the people in them. Moderators only see a message if
                    someone reports it.
                  </p>
                  <a href="/guidelines" target="_blank">
                    Privacy and guidelines
                  </a>
                </section>
                <h2>Blocked members</h2>
                <p className="gz-muted">
                  Blocked members can’t message you, and their posts are hidden from you. Past
                  messages aren’t deleted.
                </p>
                {data.blocks.length ? (
                  data.blocks.map((b) => (
                    <div className="gz-settings-row" key={b.id}>
                      <span>Blocked member · {b.to_id.slice(0, 8)}</span>
                      <button
                        className="gz-button"
                        disabled={busy}
                        onClick={() => void act({ type: 'unblock', user_id: b.to_id })}
                      >
                        Unblock
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="gz-muted">
                    You haven’t blocked anyone. You can block someone from their profile or a
                    conversation.
                  </p>
                )}
              </>
            )}
            {settingsTab === 'auth' && isAdmin && (
              <>
                <p>Admins confirm sensitive actions with a code from an authenticator app.</p>
                {data.demo ? (
                  <p className="gz-surface">
                    Authenticator setup is available when live email authentication is connected.
                    This preview uses fictional members.
                  </p>
                ) : (
                  <>
                    <button
                      className="gz-button"
                      onClick={async () => {
                        const db = browserDb();
                        if (!db) return;
                        const { data: factor, error } = await db.auth.mfa.enroll({
                          factorType: 'totp',
                          friendlyName: `Gamazon ${Date.now()}`,
                        });
                        if (error) setToast(error.message);
                        else setMfa({ id: factor.id, qr: factor.totp.qr_code });
                      }}
                    >
                      Set up authenticator
                    </button>
                    {mfa && (
                      <form
                        className="gz-surface gz-mfa-form"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const { error } = await browserDb()!.auth.mfa.challengeAndVerify({
                            factorId: mfa.id,
                            code: String(new FormData(e.currentTarget).get('code')),
                          });
                          if (error) setToast(error.message);
                          else {
                            setMfa(null);
                            setToast('Authenticator verified.');
                            navigate('admin');
                          }
                        }}
                      >
                        <div>
                          <h2>1. Scan this with your authenticator app</h2>
                          <img src={mfa.qr} alt="Scan this authenticator QR code" />
                        </div>
                        <div>
                          <Field label="2. Enter the 6-digit code it shows">
                            <input
                              name="code"
                              required
                              inputMode="numeric"
                              pattern="[0-9]{6}"
                              autoComplete="one-time-code"
                            />
                          </Field>
                          <div className="gz-actions">
                            <button className="gz-button primary">Verify and turn on</button>
                            <button
                              className="gz-button"
                              type="button"
                              onClick={async () => {
                                await browserDb()?.auth.mfa.unenroll({ factorId: mfa.id });
                                setMfa(null);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                    <form
                      className="gz-surface"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await verifyAdmin(String(new FormData(e.currentTarget).get('code')));
                      }}
                    >
                      <Field label="Verify existing authenticator">
                        <input
                          name="code"
                          required
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          autoComplete="one-time-code"
                        />
                      </Field>
                      <button className="gz-button primary">Verify admin session</button>
                    </form>
                  </>
                )}
              </>
            )}
            {settingsTab === 'delete' && (
              <section className="gz-delete-account">
                <h2>Delete your account</h2>
                <p>
                  Your profile, posts and the messages you wrote are removed. Reports that involve
                  you may be kept for up to 90 days so moderators can finish reviewing them.
                </p>
                {!data.can_delete_account && isAdmin && (
                  <p className="gz-error">
                    Your owner account is protected from deletion. Account recovery is handled
                    outside the app.
                  </p>
                )}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await act({ type: 'account.delete', confirmation: 'DELETE' })) {
                      await browserDb()?.auth.signOut();
                      window.location.assign('/');
                    }
                  }}
                >
                  <Field label="Type DELETE to confirm">
                    <input name="confirmation" required pattern="DELETE" autoComplete="off" />
                  </Field>
                  <button
                    className="gz-button destructive"
                    disabled={busy || !data.can_delete_account}
                  >
                    Delete my account
                  </button>
                </form>
              </section>
            )}
          </section>
        )}
        {page === 'admin' && isAdmin && (
          <div className="gz-admin">
            <nav className="gz-admin-nav" aria-label="Admin sections">
              {[
                ['reports', 'Reports'],
                ['invites', 'Invitations'],
                ['history', 'Moderation history'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={adminTab === id ? 'selected' : ''}
                  onClick={() => setAdminTab(id)}
                >
                  {label}
                  {id === 'reports' && (
                    <small>{data.reports.filter((r) => r.status === 'open').length} open</small>
                  )}
                </button>
              ))}
            </nav>
            <section className="gz-admin-main">
              <h1>
                {adminTab === 'reports'
                  ? 'Reports'
                  : adminTab === 'invites'
                    ? 'Invitations'
                    : 'Moderation history'}
              </h1>
              {metrics ? (
                <>
                  <p className="gz-small gz-muted">
                    {metrics.members || 0} members · {metrics.posts || 0} posts ·{' '}
                    {metrics.mutually_confirmed_exchanges || 0} exchanges confirmed by both people ·{' '}
                    {metrics.one_sided_confirmations || 0} confirmed by one person
                  </p>
                  <p className="gz-small gz-muted">
                    Exchanges are private self-reports. They don’t verify the game, its condition or
                    any payment.
                  </p>
                </>
              ) : (
                !data.demo && (
                  <form
                    className="gz-surface"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await verifyAdmin(String(new FormData(e.currentTarget).get('code')));
                    }}
                  >
                    <h2>Confirm it’s you</h2>
                    <p>Enter the 6-digit code from your authenticator app to open admin tools.</p>
                    <Field label="Authenticator code">
                      <input name="code" required inputMode="numeric" pattern="[0-9]{6}" />
                    </Field>
                    <button className="gz-button primary">Verify</button>
                  </form>
                )
              )}
              {adminTab === 'reports' && (data.demo || metrics) && (
                <>
                  <div className="gz-tabs">
                    <button
                      className={reportFilter === 'open' ? 'selected' : ''}
                      onClick={() => {
                        setReportFilter('open');
                        setReportId(null);
                      }}
                    >
                      Open · {data.reports.filter((r) => r.status === 'open').length}
                    </button>
                    <button
                      className={reportFilter === 'resolved' ? 'selected' : ''}
                      onClick={() => {
                        setReportFilter('resolved');
                        setReportId(null);
                      }}
                    >
                      Resolved · {data.reports.filter((r) => r.status === 'resolved').length}
                    </button>
                  </div>
                  <div className="gz-report-workspace">
                    <div className="gz-report-queue">
                      {reportQueue.map((r) => (
                        <button
                          key={r.id}
                          className={selectedReport?.id === r.id ? 'selected' : ''}
                          onClick={() => setReportId(r.id)}
                        >
                          <small>
                            {r.target_type} · {ago(r.created_at)}
                          </small>
                          <strong>{r.reason}</strong>
                          <span>
                            About {person(r.subject_id)?.name || 'Member'} · reported by{' '}
                            {person(r.reporter_id)?.name || 'Member'}
                          </span>
                        </button>
                      ))}
                      {!reportQueue.length && (
                        <Empty
                          title={
                            reportFilter === 'open' ? 'No open reports' : 'Nothing resolved yet'
                          }
                          body="New reports from members show up here."
                        />
                      )}
                    </div>
                    {selectedReport && (
                      <section className="gz-report-detail gz-surface" data-context>
                        <h2>{selectedReport.reason}</h2>
                        <p className="gz-small gz-muted">
                          Reported {selectedReport.target_type} · by{' '}
                          {person(selectedReport.subject_id)?.name || 'Member'} ·{' '}
                          {ago(selectedReport.created_at)}
                        </p>
                        <blockquote>{selectedReport.evidence}</blockquote>
                        {selectedReport.target_type === 'message' ? (
                          <p className="gz-small gz-muted">
                            Only this message was shared with moderators — not the rest of the
                            conversation.
                          </p>
                        ) : (
                          selectedReport.target_type === 'post' && (
                            <button
                              className="gz-link"
                              onClick={() => openPost(selectedReport.target_id)}
                            >
                              Open in context
                            </button>
                          )
                        )}
                        <h3>
                          What {person(selectedReport.reporter_id)?.name || 'the reporter'} told us
                        </h3>
                        <p>{selectedReport.reason}</p>
                        {selectedReport.status === 'open' ? (
                          <form
                            key={selectedReport.id}
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              const action = f.get('action') as 'dismiss' | 'remove' | 'suspend';
                              const command: Command = {
                                type: 'moderate',
                                report_id: selectedReport.id,
                                action,
                                note: String(f.get('note')),
                              };
                              if (action === 'dismiss') void act(command);
                              else
                                confirm(
                                  command,
                                  action === 'suspend' ? 'Suspend member' : 'Remove content',
                                  action === 'suspend'
                                    ? 'This member loses access straight away and their posts are hidden.'
                                    : 'Remove the reported content? Members will no longer see it.',
                                );
                            }}
                          >
                            <fieldset>
                              <legend>Decision</legend>
                              {[
                                ['dismiss', 'Dismiss report', 'No action. The content stays up.'],
                                [
                                  'remove',
                                  'Remove content',
                                  'Removes the reported item. The member keeps their account.',
                                ],
                                [
                                  'suspend',
                                  'Suspend member',
                                  'The member loses access straight away and their posts are hidden.',
                                ],
                              ].map(([id, label, help]) => (
                                <label className="gz-decision" key={id}>
                                  <input
                                    type="radio"
                                    name="action"
                                    value={id}
                                    defaultChecked={id === 'dismiss'}
                                  />
                                  <span>
                                    <strong>{label}</strong>
                                    <small>{help}</small>
                                  </span>
                                </label>
                              ))}
                            </fieldset>
                            <Field label="Decision note">
                              <textarea name="note" required maxLength={1000} rows={3} />
                            </Field>
                            <small>Required · kept in moderation history</small>
                            <button className="gz-button primary" disabled={busy}>
                              Apply decision
                            </button>
                          </form>
                        ) : (
                          <>
                            {data.moderation
                              .filter((m) => m.report_id === selectedReport.id)
                              .map((m) => (
                                <div key={m.id}>
                                  <h3>
                                    {m.action} · {person(m.admin_id)?.name || 'Moderator'}
                                  </h3>
                                  <p>{m.note}</p>
                                </div>
                              ))}
                          </>
                        )}
                      </section>
                    )}
                  </div>
                </>
              )}
              {adminTab === 'invites' && (data.demo || metrics) && (
                <>
                  <form
                    className="gz-invite-form gz-surface"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const r = await act({
                        type: 'invite.create',
                        email: String(new FormData(e.currentTarget).get('email')),
                      });
                      if (r?.token) setInviteToken(r.token);
                    }}
                  >
                    <Field label="Invite someone by email">
                      <input type="email" name="email" required placeholder="name@example.com" />
                    </Field>
                    <button className="gz-button primary" disabled={busy}>
                      Create invitation
                    </button>
                    <p className="gz-small gz-muted">
                      Creates a single-use code tied to this email. It expires after 7 days.
                    </p>
                  </form>
                  {inviteToken && (
                    <section className="gz-invite-code gz-surface">
                      <h2>Invitation code</h2>
                      <code>{inviteToken}</code>
                      <div className="gz-actions">
                        <button
                          className="gz-button primary"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(inviteToken);
                              setToast('Invitation code copied.');
                            } catch {
                              setToast('Could not copy. Select and copy the code manually.');
                            }
                          }}
                        >
                          Copy code
                        </button>
                        <button className="gz-button" onClick={() => setInviteToken('')}>
                          Done
                        </button>
                      </div>
                      <p>
                        This is the only time the code is shown. Send it to them yourself — it works
                        once, only for the specified email.
                      </p>
                    </section>
                  )}
                  <div className="gz-invites-table">
                    <div className="gz-table-heading">
                      <span>Email</span>
                      <span>Status</span>
                      <span>Expires</span>
                      <span>Actions</span>
                    </div>
                    {data.invites.map((i) => (
                      <div className="gz-invite-row" key={i.id} data-context>
                        <strong>{i.email}</strong>
                        <span>
                          {i.used_at
                            ? 'Redeemed'
                            : i.revoked
                              ? 'Revoked'
                              : Date.parse(i.expires_at) < Date.now()
                                ? 'Expired'
                                : 'Waiting'}
                        </span>
                        <span>
                          {new Date(i.expires_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {!i.used_at && !i.revoked && Date.parse(i.expires_at) > Date.now() ? (
                          <button
                            className="gz-button"
                            onClick={() =>
                              confirm(
                                { type: 'invite.revoke', id: i.id },
                                'Revoke invitation',
                                'Revoke this code? It can no longer be used to join.',
                              )
                            }
                          >
                            Revoke
                          </button>
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {!data.invites.length && <p className="gz-muted">No invitations yet.</p>}
                </>
              )}
              {adminTab === 'history' && (data.demo || metrics) && (
                <div className="gz-audit-history">
                  {data.moderation.map((m) => (
                    <article key={m.id}>
                      <time>
                        {new Date(m.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </time>
                      <div>
                        <h2>{m.action}</h2>
                        <p>{m.note}</p>
                        <small>{person(m.admin_id)?.name || 'Moderator'}</small>
                      </div>
                    </article>
                  ))}
                  {!data.moderation.length && (
                    <Empty
                      title="No moderation history yet"
                      body="Recorded decisions will appear here."
                    />
                  )}
                </div>
              )}
            </section>
          </div>
        )}
        {page === 'guidelines' && (
          <section className="gz-guidelines-page">
            <h1>Community guidelines</h1>
            <Guidelines />
          </section>
        )}
      </main>
      <nav className="gz-mobile-bottom gz-mobile" aria-label="Mobile navigation">
        <button className={page === 'feed' ? 'selected' : ''} onClick={() => navigate('feed')}>
          <Home size={20} />
          Feed
        </button>
        <button className={page === 'people' ? 'selected' : ''} onClick={() => navigate('people')}>
          <Users size={20} />
          Members
        </button>
        <button className="gz-create" aria-label="Create a post" onClick={createPost}>
          <Plus size={24} />
        </button>
        <button
          className={page === 'messages' ? 'selected' : ''}
          onClick={() => navigate('messages')}
        >
          <MessageCircle size={20} />
          Messages{unreadChats > 0 && <b>{unreadChats}</b>}
        </button>
        <button className={page === 'shelf' ? 'selected' : ''} onClick={() => navigate('shelf')}>
          <Avatar profile={me} small />
          My games
        </button>
      </nav>
      {toast && (
        <div className="gz-toast" role="status">
          {toast}
          <button
            className="gz-icon"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <ContextPanel
          anchor={anchor.current}
          title={
            modal.title ||
            {
              report: 'Report',
              message: 'New message',
              'edit-profile': 'Edit profile',
              comment: reply ? 'Reply' : 'Add a comment',
              'edit-comment': 'Edit comment',
              filters: 'Filter posts',
              safety: 'Safety',
              confirm: 'Confirm',
            }[modal.kind] ||
            'Gamazon'
          }
          close={closePanel}
        >
          {modal.kind === 'confirm' && (
            <>
              <p>{modal.explanation}</p>
              <div className="gz-actions">
                <button className="gz-button" onClick={closePanel}>
                  Cancel
                </button>
                <button
                  className="gz-button destructive"
                  disabled={busy}
                  onClick={async () => {
                    if (modal.command && (await act(modal.command))) {
                      closePanel();
                      if (modal.command.type === 'block') navigate('feed');
                      if (modal.command.type === 'post.delete') navigate('feed');
                    }
                  }}
                >
                  {busy ? 'Applying…' : modal.title || 'Confirm'}
                </button>
              </div>
            </>
          )}
          {modal.kind === 'report' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act({
                    type: 'report',
                    target_type: modal.target!,
                    target_id: modal.id!,
                    reason: String(new FormData(e.currentTarget).get('reason')),
                  })
                ) {
                  closePanel();
                  setToast('Report sent. A moderator will review this item.');
                }
              }}
            >
              <p className="gz-report-context">
                {modal.target === 'post'
                  ? data.posts.find((p) => p.id === modal.id)?.title
                  : modal.target === 'comment'
                    ? data.comments.find((c) => c.id === modal.id)?.body
                    : modal.target === 'message'
                      ? data.messages.find((m) => m.id === modal.id)?.body
                      : data.profiles.find((p) => p.id === modal.id)?.name}
              </p>
              <Field label="What happened?">
                <textarea name="reason" required rows={3} maxLength={1000} />
              </Field>
              <p className="gz-small gz-muted">
                Moderators see this item and your note — not the rest of your conversation.
              </p>
              <div className="gz-actions">
                <button type="button" className="gz-button" onClick={closePanel}>
                  Cancel
                </button>
                <button className="gz-button primary" disabled={busy}>
                  Send report
                </button>
              </div>
            </form>
          )}
          {modal.kind === 'comment' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act({
                    type: 'comment.add',
                    post_id: modal.id!,
                    parent_id: reply,
                    body: String(new FormData(e.currentTarget).get('body')),
                  })
                )
                  closePanel();
              }}
            >
              {reply && <blockquote>{data.comments.find((c) => c.id === reply)?.body}</blockquote>}
              <Field label={reply ? 'Write a reply' : 'Add a comment'}>
                <textarea
                  name="body"
                  required
                  rows={3}
                  maxLength={1500}
                  placeholder="Ask about the copy, or suggest a swap"
                />
              </Field>
              <div className="gz-actions">
                <button type="button" className="gz-button" onClick={closePanel}>
                  Cancel
                </button>
                <button className="gz-button primary" disabled={busy}>
                  {reply ? 'Reply' : 'Comment'}
                </button>
              </div>
            </form>
          )}
          {modal.kind === 'edit-comment' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await act({
                    type: 'comment.edit',
                    id: modal.id!,
                    body: String(new FormData(e.currentTarget).get('body')),
                  })
                )
                  closePanel();
              }}
            >
              <Field label="Edit comment">
                <textarea
                  name="body"
                  required
                  rows={3}
                  maxLength={1500}
                  defaultValue={data.comments.find((c) => c.id === modal.id)?.body}
                />
              </Field>
              <button className="gz-button primary" disabled={busy}>
                Save changes
              </button>
            </form>
          )}
          {modal.kind === 'message' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const body = String(new FormData(e.currentTarget).get('body')).trim();
                if (
                  !pendingSend.current ||
                  pendingSend.current.conversation !== modal.user ||
                  pendingSend.current.body !== body
                )
                  pendingSend.current = {
                    conversation: modal.user!,
                    body,
                    id: crypto.randomUUID(),
                  };
                const existing = data.conversations.find(
                  (c) =>
                    c.status === 'active' &&
                    ((c.from_id === data.me && c.to_id === modal.user) ||
                      (c.to_id === data.me && c.from_id === modal.user)),
                );
                const r = await act(
                  existing
                    ? {
                        type: 'message.send',
                        conversation_id: existing.id,
                        body,
                        message_id: pendingSend.current.id,
                      }
                    : {
                        type: 'conversation.start',
                        user_id: modal.user!,
                        post_id: modal.id || null,
                        body,
                        message_id: pendingSend.current.id,
                      },
                );
                if (r) {
                  pendingSend.current = null;
                  closePanel();
                  await openChat(existing?.id || r.id);
                }
              }}
            >
              <div className="gz-person-row">
                <Avatar profile={person(modal.user!)} small />
                <strong>{person(modal.user!)?.name}</strong>
              </div>
              <p>
                {myFriends.includes(modal.user!)
                  ? 'Send a message to your connection.'
                  : 'You can send one message request. More once they accept.'}
              </p>
              <Field label="Your message">
                <textarea
                  name="body"
                  required
                  rows={4}
                  maxLength={2000}
                  value={modal.body || ''}
                  onChange={(e) =>
                    setModal((prev) => (prev ? { ...prev, body: e.target.value } : prev))
                  }
                />
              </Field>
              <button className="gz-button primary" disabled={busy}>
                Send message
                <Send size={16} />
              </button>
            </form>
          )}
          {modal.kind === 'edit-profile' && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await act({
                    type: 'profile.update',
                    name: String(f.get('name')),
                    bio: String(f.get('bio')),
                    area: String(f.get('area')),
                    handle: String(f.get('handle')),
                    consoles: String(f.get('consoles'))
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    genres: String(f.get('genres'))
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    avatar: f.get('avatar') as 'peach' | 'mint' | 'lavender' | 'blue' | 'gold',
                  })
                )
                  closePanel();
              }}
            >
              <Field label="Display name">
                <input name="name" required maxLength={60} defaultValue={me.name} />
              </Field>
              <Field label="Bio">
                <textarea name="bio" maxLength={500} defaultValue={me.bio} />
              </Field>
              <Field label="Neighbourhood">
                <input name="area" required maxLength={60} defaultValue={me.area} />
              </Field>
              <Field label="Gaming handle (optional)">
                <input name="handle" maxLength={60} defaultValue={me.handle} />
              </Field>
              <Field label="Consoles (comma separated)">
                <input name="consoles" defaultValue={me.consoles.join(', ')} />
              </Field>
              <Field label="Genres (comma separated)">
                <input name="genres" defaultValue={me.genres.join(', ')} />
              </Field>
              <Field label="Profile colour">
                <select name="avatar" defaultValue={me.avatar}>
                  {['peach', 'mint', 'lavender', 'blue', 'gold'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <button className="gz-button primary" disabled={busy}>
                Save profile
              </button>
            </form>
          )}
          {modal.kind === 'filters' && (
            <>
              <fieldset>
                <legend>Type</legend>
                <div className="gz-options">
                  {typeOptions.map(([id, label]) => (
                    <button
                      key={id}
                      className={kind === id ? 'selected' : ''}
                      aria-pressed={kind === id}
                      onClick={() => setKind(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend>Status</legend>
                <div className="gz-options">
                  {statusOptions.map(([id, label]) => (
                    <button
                      key={id}
                      className={status === id ? 'selected' : ''}
                      aria-pressed={status === id}
                      onClick={() => setStatus(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Field label="Area">
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  {areaOptions.map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Search game titles">
                <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
              </Field>
              <div className="gz-actions">
                <button className="gz-button" onClick={resetFilters}>
                  Reset
                </button>
                <button className="gz-button primary" onClick={closePanel}>
                  Show {posts.length} posts
                </button>
              </div>
            </>
          )}
          {modal.kind === 'safety' && (
            <>
              <button
                className="gz-button danger"
                onClick={() =>
                  confirm(
                    { type: 'block', user_id: modal.user! },
                    'Block member',
                    `Block ${person(modal.user!)?.name}? They can’t message you and their posts are hidden from you. Past messages aren’t deleted.`,
                  )
                }
              >
                Block {person(modal.user!)?.name.split(' ')[0]}
              </button>
              <p className="gz-small gz-muted">
                To report a message, choose Report next to that message. Moderators see only the
                item you submit.
              </p>
            </>
          )}
        </ContextPanel>
      )}
    </div>
  );
  async function verifyAdmin(code: string) {
    const db = browserDb();
    if (!db) return;
    const { data: factors } = await db.auth.mfa.listFactors();
    const factor = factors?.totp.find(
      (f: { status: string; id: string }) => f.status === 'verified',
    );
    if (!factor) {
      setToast('Set up an authenticator in Settings first.');
      return;
    }
    const { error } = await db.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) setToast(error.message);
    else {
      setToast('Admin session verified.');
      const r = await fetch('/api/v1/metrics');
      if (r.ok) setMetrics(await r.json());
    }
  }
}

async function uploadPhoto(file: File, id: string) {
  const upload = new FormData();
  upload.set('file', file);
  upload.set('post_id', id);
  const response = await fetch('/api/v1/images', { method: 'POST', body: upload });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'The photo couldn’t upload. Check your connection and retry.');
  }
}

function PostForm({
  me,
  initial,
  create,
  reload,
  close,
  view,
}: {
  me: Profile;
  initial?: Post;
  create: (command: Command) => Promise<{ id: string } | null>;
  reload: () => Promise<void>;
  close: () => void;
  view: (id: string) => void;
}) {
  const preferredConsole =
    me.consoles.find((console) => /PS\d|PlayStation|Xbox|Switch|Nintendo/i.test(console)) || '';
  const preferredPlatform: Platform = /Xbox/i.test(preferredConsole)
    ? 'Xbox'
    : /Switch|Nintendo/i.test(preferredConsole)
      ? 'Nintendo'
      : 'PlayStation';
  const [draft, setDraft] = useState({
    platform: initial?.platform || preferredPlatform,
    kind: initial?.kind || 'offer',
    exchange_modes: initial?.exchange_modes || ([] as ExchangeMode[]),
    title: initial?.title || '',
    generation: initial?.generation || preferredConsole,
    area: initial?.area || me.area,
    format: initial?.format || (preferredPlatform === 'Nintendo' ? 'Cartridge' : 'Disc'),
    condition: initial?.condition || 'Good',
    price: initial?.price == null ? '' : String(initial.price),
    description: initial?.description || '',
    download: initial?.download_required || false,
    code: initial?.code_required || false,
  });
  const [file, setFile] = useState<File | null>(null),
    [phase, setPhase] = useState('editing'),
    [createdId, setCreatedId] = useState(''),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [error, setError] = useState(''),
    [discard, setDiscard] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const originalDraft = useRef(JSON.stringify(draft));
  const postRequestId = useRef(crypto.randomUUID());
  const cancelAnchor = useRef<HTMLElement | null>(null);
  const submitting = phase === 'submitting',
    offer = draft.kind === 'offer';
  function cancel() {
    cancelAnchor.current = document.activeElement as HTMLElement | null;
    if (JSON.stringify(draft) !== originalDraft.current || file) setDiscard(true);
    else close();
  }
  function field(key: keyof typeof draft, value: string | boolean) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }
  async function finishPhoto(id: string) {
    if (file) await uploadPhoto(file, id);
    await reload();
    setPhase('published');
  }
  const formats = draft.platform === 'Nintendo' ? ['Cartridge', 'Game-key card'] : ['Disc'];
  const models =
    draft.platform === 'PlayStation'
      ? ['PS4', 'PS4 Pro', 'PS5', 'PS5 Digital Edition']
      : draft.platform === 'Xbox'
        ? ['Xbox One', 'Xbox One X', 'Xbox Series X', 'Xbox Series S']
        : ['Nintendo Switch', 'Nintendo Switch OLED', 'Nintendo Switch Lite', 'Nintendo Switch 2'];
  const preview = {
    id: 'preview',
    owner_id: me.id,
    title: draft.title || 'Your game title',
    platform: draft.platform,
    generation: draft.generation || models[0],
    format: draft.format,
    kind: draft.kind as Post['kind'],
    condition: draft.condition,
    area: draft.area,
    description: draft.description,
    price:
      offer && draft.exchange_modes.includes('sale') && draft.price !== ''
        ? Number(draft.price)
        : null,
    exchange_modes: draft.exchange_modes,
    status: 'open' as const,
    drive_required: draft.format === 'Disc',
    download_required: draft.download,
    code_required: draft.code,
    art: '',
    created_at: new Date().toISOString(),
  };
  return (
    <div className="gz-columns gz-submit-columns">
      {phase === 'published' ? (
        <section className="gz-published">
          <Check size={30} />
          <h1>{initial ? 'Changes saved' : 'Your post is live'}</h1>
          <p>Members can find it in the feed, comment, and message you.</p>
          <div className="gz-actions">
            <button className="gz-button primary" onClick={() => view(createdId)}>
              View your post
            </button>
            <button className="gz-button" onClick={close}>
              Back to the feed
            </button>
          </div>
        </section>
      ) : (
        <form
          ref={formRef}
          className="gz-post-form"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting || phase === 'photo-failed') return;
            const result = postFields.safeParse({
              ...draft,
              price:
                offer && draft.exchange_modes.includes('sale') && draft.price !== ''
                  ? Number(draft.price)
                  : null,
              drive_required: draft.format === 'Disc',
              download_required: draft.download || draft.format === 'Game-key card',
              code_required: draft.code,
            });
            if (!result.success || !draft.exchange_modes.length) {
              const next: Record<string, string> = {};
              if (!result.success)
                for (const issue of result.error.issues)
                  next[String(issue.path[0])] = issue.message;
              if (!draft.exchange_modes.length) next.exchange_modes = 'Choose sell, swap or lend.';
              setErrors(next);
              formRef.current
                ?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
                ?.focus();
              return;
            }
            setErrors({});
            setError('');
            setPhase('submitting');
            const r = await create(
              initial
                ? { type: 'post.update', id: initial.id, ...result.data }
                : { type: 'post.create', request_id: postRequestId.current, ...result.data },
            );
            if (!r) {
              setPhase('editing');
              setError('Couldn’t confirm publication. Retry to check your post.');
              return;
            }
            setCreatedId(r.id);
            try {
              await finishPhoto(r.id);
            } catch (err) {
              setError((err as Error).message);
              setPhase('photo-failed');
            }
          }}
        >
          <div className="gz-page-heading gz-horizontal">
            <button type="button" className="gz-icon" aria-label="Back to feed" onClick={cancel}>
              <ArrowLeft size={20} />
            </button>
            <h1>{initial ? 'Edit listing' : 'Create a post'}</h1>
          </div>
          {phase === 'photo-failed' && (
            <div className="gz-upload-failure" role="alert">
              <h2>Your post is live, but the photo didn’t upload.</h2>
              <p>
                “{draft.title}” was published without a photo. Retrying adds the photo to the same
                post — it won’t create a second one.
              </p>
              <p>{error}</p>
              <div className="gz-actions">
                <button
                  className="gz-button primary"
                  type="button"
                  onClick={async () => {
                    setPhase('submitting');
                    try {
                      await finishPhoto(createdId);
                    } catch (err) {
                      setError((err as Error).message);
                      setPhase('photo-failed');
                    }
                  }}
                >
                  Retry upload
                </button>
                <button className="gz-button" type="button" onClick={() => view(createdId)}>
                  View post without photo
                </button>
              </div>
            </div>
          )}
          <fieldset disabled={submitting || !!createdId} className="gz-form-fields">
            <div className="gz-tabs gz-line-tabs">
              <button
                type="button"
                className={offer ? 'selected' : ''}
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    kind: 'offer',
                    condition: prev.condition === 'Any condition' ? 'Good' : prev.condition,
                  }))
                }
              >
                A game to offer
              </button>
              <button
                type="button"
                className={!offer ? 'selected' : ''}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, kind: 'wanted', condition: 'Any condition' }))
                }
              >
                A game I’m looking for
              </button>
            </div>

            <fieldset>
              <legend>Platform</legend>
              <div className="gz-platform-choices">
                {platforms.map((p) => (
                  <label key={p} className={draft.platform === p ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="platform"
                      value={p}
                      checked={draft.platform === p}
                      onChange={() =>
                        setDraft((prev) => ({
                          ...prev,
                          platform: p,
                          generation: '',
                          format: p === 'Nintendo' ? 'Cartridge' : 'Disc',
                        }))
                      }
                    />
                    <PlatformMark platform={p} />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="gz-arrangement-choices">
              <legend>{offer ? 'What are you offering?' : 'How would you like to get it?'}</legend>
              <div className="gz-radio-choices">
                {arrangements.map((mode) => (
                  <label
                    key={mode.id}
                    className={draft.exchange_modes.includes(mode.id) ? 'selected' : ''}
                  >
                    <input
                      type="checkbox"
                      name="exchange_modes"
                      value={mode.id}
                      checked={draft.exchange_modes.includes(mode.id)}
                      onChange={() => {
                        setDraft((prev) => ({
                          ...prev,
                          exchange_modes: prev.exchange_modes.includes(mode.id)
                            ? prev.exchange_modes.filter((id) => id !== mode.id)
                            : [...prev.exchange_modes, mode.id],
                        }));
                        setErrors((prev) => ({ ...prev, exchange_modes: '' }));
                      }}
                    />
                    {draft.exchange_modes.includes(mode.id) && <Check size={14} />}
                    {offer ? mode.offer : mode.wanted}
                  </label>
                ))}
              </div>
              {errors.exchange_modes && (
                <p className="gz-error" role="alert">
                  {offer ? 'Choose sell, swap or lend.' : 'Choose buy, swap or borrow.'}
                </p>
              )}
            </fieldset>
            <Field label="Game title">
              <input
                name="title"
                required
                maxLength={100}
                value={draft.title}
                aria-invalid={!!errors.title}
                aria-describedby="title-feedback"
                placeholder="e.g. Ghost of Tsushima"
                onChange={(e) => field('title', e.target.value)}
              />
            </Field>
            <div id="title-feedback" className="gz-field-feedback">
              <span className="gz-error">{errors.title ? 'Add the game’s title.' : ''}</span>
              <span>{draft.title.length}/100</span>
            </div>
            <div className="gz-form-grid">
              <div>
                <Field label="Console model">
                  <input
                    name="generation"
                    required
                    maxLength={40}
                    list="console-models"
                    value={draft.generation}
                    aria-invalid={!!errors.generation}
                    aria-describedby="model-feedback"
                    placeholder={models[0]}
                    onChange={(e) => field('generation', e.target.value)}
                  />
                </Field>
                <datalist id="console-models">
                  {models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {errors.generation && (
                  <p id="model-feedback" className="gz-error">
                    Add the console model, for example {models[0]}.
                  </p>
                )}
              </div>
              <div>
                <Field label="Neighbourhood">
                  <input
                    name="area"
                    required
                    maxLength={60}
                    value={draft.area}
                    aria-invalid={!!errors.area}
                    aria-describedby="area-feedback"
                    onChange={(e) => field('area', e.target.value)}
                  />
                </Field>
                <p id="area-feedback" className={errors.area ? 'gz-error' : 'gz-small gz-muted'}>
                  {errors.area
                    ? 'Add your neighbourhood.'
                    : 'Shown on the post. Keep it approximate.'}
                </p>
              </div>
            </div>
            <fieldset>
              <legend>Format</legend>
              <div className="gz-radio-choices">
                {formats.map((f) => (
                  <label
                    key={f}
                    className={`${draft.format === f ? 'selected' : ''} ${!formats.includes(f) ? 'disabled' : ''}`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={f}
                      disabled={!formats.includes(f)}
                      checked={draft.format === f}
                      onChange={() => field('format', f)}
                    />
                    {f}
                  </label>
                ))}
              </div>
              <p className="gz-small gz-muted">
                {draft.format === 'Disc'
                  ? 'Shown as: needs a compatible console with a disc drive.'
                  : draft.format === 'Game-key card'
                    ? 'Shown as: the card holds a key — the game downloads, so internet is required.'
                    : 'Shown as: check the cartridge against the exact console model.'}
              </p>
            </fieldset>
            <fieldset>
              <legend>Condition</legend>
              <div className="gz-radio-choices">
                {[...(!offer ? ['Any condition'] : []), 'Like new', 'Good', 'Fair'].map((c) => (
                  <label key={c} className={draft.condition === c ? 'selected' : ''}>
                    <input
                      type="radio"
                      name="condition"
                      value={c}
                      checked={draft.condition === c}
                      onChange={() => field('condition', c)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
            {offer && (
              <>
                {draft.exchange_modes.includes('sale') && (
                  <div className="gz-price-field">
                    <Field label="Asking price (optional)">
                      <input
                        name="price"
                        type="number"
                        min={0}
                        max={100000}
                        value={draft.price}
                        aria-invalid={!!errors.price}
                        aria-describedby="price-feedback"
                        placeholder="Leave blank to discuss"
                        onChange={(e) => field('price', e.target.value)}
                      />
                    </Field>
                    <p
                      id="price-feedback"
                      className={errors.price ? 'gz-error' : 'gz-small gz-muted'}
                    >
                      {errors.price
                        ? 'Enter an amount between ₹0 and ₹1,00,000.'
                        : 'Leave blank if you’d rather discuss. ₹0 means free.'}
                    </p>
                  </div>
                )}
                <div className="gz-file-field">
                  <span>
                    Photo of your copy <small>optional</small>
                  </span>
                  {file ? (
                    <div className="gz-file-selected">
                      <Disc3 size={24} />
                      <span>
                        <strong>{file.name}</strong>
                        <small>Ready to upload with the post</small>
                      </span>
                      <button type="button" className="gz-button" onClick={() => setFile(null)}>
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="gz-photo-picker">
                      <Plus size={24} />
                      <span>
                        <strong>Take or choose a photo</strong>
                        <small>JPEG, PNG or WebP. Show the actual disc and case.</small>
                      </span>
                      <input
                        aria-label="Photo of your copy"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>
              </>
            )}
            <details className="gz-extra-details">
              <summary>Edition, downloads and codes</summary>
              <Field label="Description">
                <textarea
                  name="description"
                  rows={3}
                  maxLength={2000}
                  value={draft.description}
                  aria-invalid={!!errors.description}
                  aria-describedby="description-feedback"
                  placeholder={
                    offer
                      ? 'Condition of the disc and case, what’s included, when you can meet.'
                      : 'Which edition you’re after, and whether you’d buy, swap or borrow.'
                  }
                  onChange={(e) => field('description', e.target.value)}
                />
              </Field>
              <div id="description-feedback" className="gz-field-feedback">
                <span className={errors.description ? 'gz-error' : ''}>
                  {errors.description
                    ? 'Keep the description under 2,000 characters.'
                    : 'Optional: scratches, inserts, edition or pickup details.'}
                </span>
                <span>{draft.description.length}/2,000</span>
              </div>
              <label className="gz-check">
                <input
                  name="download"
                  type="checkbox"
                  checked={draft.download || draft.format === 'Game-key card'}
                  disabled={draft.format === 'Game-key card'}
                  onChange={(e) => field('download', e.target.checked)}
                />
                <span>
                  Needs a download or internet connection to play
                  <small>Common for game-key cards and day-one updates.</small>
                </span>
              </label>
              <label className="gz-check">
                <input
                  name="code"
                  type="checkbox"
                  checked={draft.code}
                  onChange={(e) => field('code', e.target.checked)}
                />
                <span>
                  Some content depends on a redemption code
                  <small>DLC or expansion codes may already be used and might not transfer.</small>
                </span>
              </label>
            </details>
          </fieldset>
          {error && phase !== 'photo-failed' && (
            <p className="gz-error" role="alert">
              {error}
            </p>
          )}
          {discard && (
            <ContextPanel
              title="Discard post"
              close={() => setDiscard(false)}
              anchor={cancelAnchor.current}
            >
              <p>Discard this post? What you’ve typed won’t be saved.</p>
              <div className="gz-actions">
                <button type="button" className="gz-button" onClick={() => setDiscard(false)}>
                  Keep editing
                </button>
                <button type="button" className="gz-button destructive" onClick={close}>
                  Discard
                </button>
              </div>
            </ContextPanel>
          )}
          {!createdId && (
            <div className="gz-post-form-footer" data-context>
              {Object.values(errors).some(Boolean) && (
                <span className="gz-error" role="status">
                  Fix the highlighted fields to post.
                </span>
              )}
              <button type="button" className="gz-button" disabled={submitting} onClick={cancel}>
                Cancel
              </button>
              <button className="gz-button primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <LoaderCircle className="spin" size={17} />
                    Posting…
                  </>
                ) : initial ? (
                  'Save changes'
                ) : (
                  'Post'
                )}
              </button>
            </div>
          )}
        </form>
      )}
      <aside className="gz-rail">
        <section className="gz-surface gz-post-preview">
          <h2>How it appears in the feed</h2>
          <div className="gz-post-byline">
            <PlatformMark platform={draft.platform} />
            <strong>{draft.platform}</strong> · {me.name} · {draft.area || 'Your area'} · now
          </div>
          <div className="gz-post-title">
            <GameThumbnail
              title={draft.title}
              description={draft.description}
              platform={draft.platform}
            />
            <h3>{draft.title || 'Your game title'}</h3>
          </div>
          <div className="gz-post-meta">
            <span className={`gz-kind ${draft.kind}`}>{offer ? 'Offer' : 'Wanted'}</span>
            <span>
              {preview.generation} · {draft.format} · {draft.condition}
            </span>
            {preview.price !== null && Number.isFinite(preview.price) && (
              <strong>{asking(preview.price)}</strong>
            )}
          </div>
        </section>
        <section className="gz-surface">
          <h2>Posting on Gamazon</h2>
          <ol>
            <li>Physical copies only — discs, cartridges, game-key cards.</li>
            <li>Photograph the copy you actually have.</li>
            <li>Price is optional. No rental or per-day pricing.</li>
            <li>Keep phone numbers and addresses out of posts — use messages.</li>
          </ol>
        </section>
      </aside>
    </div>
  );
}

function Guidelines() {
  return (
    <div className="guidelines">
      <p className="form-intro">Rules for posts, comments, and messages.</p>
      {[
        [
          'Allowed listings',
          'Original discs and cartridges only. No account access, passwords, digital licences, counterfeit media, or paid rentals.',
        ],
        [
          'Accurate listings',
          'Describe the actual copy and its condition. Mention downloads, console compatibility, and any missing or redeemed codes. Disagree respectfully.',
        ],
        [
          'Meeting and return details',
          'Discuss the arrangement, meeting place, condition, and any return expectations. Meet in a public place. Don’t publish home addresses or contact details in comments.',
        ],
        [
          'Payments and account security',
          'You arrange exchanges and any permitted payments independently. Gamazon does not hold money, guarantee items, or provide financial protection. Never share a password or authentication code.',
        ],
        [
          'Reporting and blocking',
          'Use report and block when needed. Moderators review reported items and can remove content or suspend access. Invitations are not background checks.',
        ],
      ].map(([title, body], i) => (
        <section key={title}>
          <span>0{i + 1}</span>
          <div>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
        </section>
      ))}
      <a href="/guidelines" target="_blank">
        Full guidelines, privacy, and retention policy <ArrowRight size={14} />
      </a>
    </div>
  );
}
