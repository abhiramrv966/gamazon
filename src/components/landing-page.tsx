'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Disc3,
  Expand,
  Gamepad2,
  X,
} from 'lucide-react';
import './landing.css';

const games = [
  {
    id: 'witcher',
    title: 'The Witcher 3',
    subtitle: 'Wild Hunt',
    studio: 'CD PROJEKT RED',
    accent: '#c6a375',
    source: 'https://store.steampowered.com/app/292030/',
  },
  {
    id: 'rdr2',
    title: 'Red Dead Redemption 2',
    subtitle: 'The American frontier',
    studio: 'Rockstar Games',
    accent: '#c78262',
    source: 'https://store.steampowered.com/app/1174180/',
  },
  {
    id: 'last-of-us',
    title: 'The Last of Us',
    subtitle: 'Part I',
    studio: 'Naughty Dog',
    accent: '#9dac88',
    source: 'https://store.steampowered.com/app/1888930/',
  },
  {
    id: 'gta5',
    title: 'Grand Theft Auto V',
    subtitle: 'Los Santos',
    studio: 'Rockstar Games',
    accent: '#a4bcb3',
    source: 'https://store.steampowered.com/app/271590/',
  },
  {
    id: 'gta6',
    title: 'Grand Theft Auto VI',
    subtitle: 'Vice City',
    studio: 'Rockstar Games',
    accent: '#d8a6b5',
    source: 'https://www.rockstargames.com/VI/media/screenshots',
  },
  {
    id: 'days-gone',
    title: 'Days Gone',
    subtitle: 'The Pacific Northwest',
    studio: 'Bend Studio',
    accent: '#8eabc0',
    source: 'https://store.steampowered.com/app/1259420/',
  },
];

export function LandingBrand() {
  return (
    <Link href="/" className="landing-brand" aria-label="Gamazon home">
      <Gamepad2 size={23} strokeWidth={1.3} />
      <span>
        gamazon<span className="brand-period">.</span>
      </span>
    </Link>
  );
}

export default function LandingPage({ demo }: { demo: boolean }) {
  const [active, setActive] = useState(0);
  const [shot, setShot] = useState(1);
  const [zoom, setZoom] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const expand = useRef<HTMLButtonElement>(null);
  const current = useRef(0);
  const game = games[active];

  useEffect(() => {
    if (zoom) return;
    const timer = window.setInterval(() => {
      const bounds = stage.current?.getBoundingClientRect();
      if (
        document.hidden ||
        !bounds ||
        bounds.top > window.innerHeight ||
        bounds.bottom < window.innerHeight * 0.6
      )
        return;
      const next = (current.current + 1) % games.length;
      current.current = next;
      setActive(next);
      setShot(1);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [active, zoom]);

  useEffect(() => {
    const strip = root.current?.querySelector<HTMLElement>('.game-filmstrip');
    const selected = strip?.children[active] as HTMLElement | undefined;
    if (!strip || !selected || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollTo({
      left: selected.offsetLeft - strip.offsetLeft - (strip.clientWidth - selected.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [active]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const el = stage.current;
        if (!el) return;
        const bounds = el.getBoundingClientRect();
        const distance = el.offsetHeight - window.innerHeight;
        const progress = Math.max(0, Math.min(1, -bounds.top / Math.max(1, distance)));
        const next = Math.min(games.length - 1, Math.floor(progress * games.length));
        if (next !== current.current) {
          current.current = next;
          setActive(next);
          setShot(1);
        }
        root.current?.style.setProperty('--scroll-progress', String(progress));
      });
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (zoom) {
      viewer.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else if (viewer.current?.open) {
      viewer.current.close();
      expand.current?.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [zoom]);

  function selectGame(index: number) {
    const next = (index + games.length) % games.length;
    current.current = next;
    setActive(next);
    setShot(1);
    const el = stage.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const distance = Math.max(0, el.offsetHeight - window.innerHeight);
      window.scrollTo({ top: top + (next / games.length + 0.015) * distance, behavior: 'instant' });
    }
  }

  return (
    <div ref={root} className="landing" style={{ '--scene-accent': game.accent } as CSSProperties}>
      <a href="#landing-content" className="landing-skip">
        Skip to content
      </a>
      <header className="landing-header">
        <LandingBrand />
        <nav aria-label="Main navigation">
          <a href="#collection">The collection</a>
        </nav>
        <div className="landing-header-actions">
          <Link href="/signin" className="landing-signin">
            Sign in
          </Link>
          <Link href="/signup" className="landing-pill">
            Sign up <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>

      <main id="landing-content">
        <section
          ref={stage}
          id="collection"
          className="landing-scroll-stage"
          aria-label="Featured game gallery"
        >
          <div
            className="landing-scene"
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse') return;
              const bounds = e.currentTarget.getBoundingClientRect();
              root.current?.style.setProperty(
                '--pan-x',
                `${(e.clientX / bounds.width - 0.5) * 18}px`,
              );
              root.current?.style.setProperty(
                '--pan-y',
                `${((e.clientY - bounds.top) / bounds.height - 0.5) * 12}px`,
              );
            }}
            onPointerLeave={() => {
              root.current?.style.setProperty('--pan-x', '0px');
              root.current?.style.setProperty('--pan-y', '0px');
            }}
          >
            <div className="scene-images" aria-hidden="true">
              {games.map((g, i) => (
                <div key={g.id} className={`scene-image ${active === i ? 'is-active' : ''}`}>
                  <img
                    src={`/images/games/${g.id}-${active === i ? shot : 1}.webp`}
                    alt=""
                    fetchPriority={i === 0 ? 'high' : 'low'}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>
            <div className="scene-shade" />
            <div className="scene-glow" />
            <div className="scene-dust" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <i
                  key={i}
                  style={
                    {
                      left: `${(i * 31 + 9) % 100}%`,
                      '--delay': `${i * -1.7}s`,
                      '--duration': `${12 + (i % 6)}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>

            <div className="landing-hero-copy">
              <div className="landing-kicker">
                <span />
                Physical console games
              </div>
              <h1>
                <span>Find games.</span>
                <span>Share yours.</span>
              </h1>
              <p>
                Buy, swap, or borrow physical games.
                <br />
                Connect with the people who own them.
              </p>
              <div className="hero-cta-row">
                <Link href="/signup" className="landing-pill hero-cta">
                  Join Gamazon <ArrowUpRight size={18} />
                </Link>
                <Link href="/community" className="landing-text-link">
                  {demo ? 'Explore the demo' : 'Browse the community'} <ArrowRight size={15} />
                </Link>
              </div>
              <div className="hero-platforms">
                <Disc3 size={14} />
                <span>PlayStation</span>
                <i />
                <span>Xbox</span>
                <i />
                <span>Nintendo</span>
              </div>
            </div>

            <div className="scene-number" aria-hidden="true">
              0{active + 1}
              <span> / 06</span>
            </div>
            <div className="scene-caption" key={game.id}>
              <span className="scene-studio">{game.studio}</span>
              <h2>{game.title}</h2>
              <p>{game.subtitle}</p>
            </div>
            <div className="scene-tools">
              <button
                ref={expand}
                onClick={() => setZoom(true)}
                aria-label={`View ${game.title} screenshot`}
              >
                <Expand size={16} />
                <span>View scene</span>
              </button>
            </div>

            <div className="scene-pagination" aria-label="Select a featured game">
              {games.map((g, i) => (
                <button
                  key={g.id}
                  aria-label={`Show ${g.title}`}
                  aria-pressed={active === i}
                  onClick={() => selectGame(i)}
                >
                  <span />
                </button>
              ))}
            </div>

            <div className="landing-gallery-bottom">
              <div className="gallery-topline">
                <span>
                  <span className="tiny-cross">+</span> In the frame
                </span>
                <div>
                  <button onClick={() => selectGame(active - 1)} aria-label="Previous game">
                    <ArrowLeft size={16} />
                  </button>
                  <button onClick={() => selectGame(active + 1)} aria-label="Next game">
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div
                className="game-filmstrip"
                role="group"
                aria-label="Choose a game"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const next =
                      (active + (e.key === 'ArrowRight' ? 1 : -1) + games.length) % games.length;
                    selectGame(next);
                    e.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
                  }
                }}
              >
                {games.map((g, i) => (
                  <button
                    key={g.id}
                    aria-label={g.title}
                    aria-pressed={active === i}
                    className={`filmstrip-item ${active === i ? 'selected' : ''}`}
                    onClick={() => selectGame(i)}
                  >
                    <span className="filmstrip-image">
                      <img src={`/images/games/${g.id}-thumb.webp`} alt="" />
                      <span>0{i + 1}</span>
                    </span>
                    <span className="filmstrip-title">{g.title}</span>
                    <span className="filmstrip-track" />
                  </button>
                ))}
              </div>
              <div className="scene-bottomline">
                <a href="#join">
                  <ArrowDown size={13} /> Scroll to explore
                </a>
                <span className="scene-edition">GAMAZON / COLLECTION 01</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-join" id="join">
          <span className="landing-kicker">Your collection starts here</span>
          <h2>What’s on your shelf?</h2>
          <Link href="/signup" className="landing-pill">
            Sign up <ArrowUpRight size={18} />
          </Link>
          <p>
            Already a member? <Link href="/signin">Sign in</Link>
          </p>
        </section>
      </main>
      <footer className="landing-footer">
        <LandingBrand />
        <div>
          <Link href="/guidelines">Guidelines & privacy</Link>
          <a href="#image-credits">Image credits</a>
        </div>
        <span>© {new Date().getFullYear()} Gamazon</span>
      </footer>
      <details id="image-credits" className="landing-credits">
        <summary>Game imagery credits</summary>
        <p>
          Official promotional screenshots. Games and images belong to their respective owners.
          Featured imagery does not indicate listing availability or publisher affiliation.
          Storefront images may show PC editions.
        </p>
        <div>
          {games.map((g) => (
            <a key={g.id} href={g.source} target="_blank" rel="noreferrer">
              {g.title} · {g.studio} <ArrowUpRight size={12} />
            </a>
          ))}
        </div>
      </details>

      <dialog
        ref={viewer}
        className="scene-viewer"
        aria-label={`${game.title} screenshot viewer`}
        onCancel={(e) => {
          e.preventDefault();
          setZoom(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setZoom(false);
        }}
      >
        <div className="viewer-top">
          <span>
            {game.title} <small>/ Screenshot {shot} of 2</small>
          </span>
          <button aria-label="Close screenshot" onClick={() => setZoom(false)}>
            <X size={22} />
          </button>
        </div>
        {zoom && (
          <img
            src={`/images/games/${game.id}-${shot}.webp`}
            alt={`Official ${game.title} screenshot ${shot}`}
          />
        )}
        <div className="viewer-bottom">
          <a href={game.source} target="_blank" rel="noreferrer">
            Image source <ArrowUpRight size={13} />
          </a>
          <button onClick={() => setShot(shot === 1 ? 2 : 1)}>
            Next screenshot <ArrowRight size={17} />
          </button>
        </div>
      </dialog>
    </div>
  );
}
