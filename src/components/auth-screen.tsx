'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { browserDb } from '@/lib/browser';
import { LandingBrand } from './landing-page';
import './landing.css';

export default function AuthScreen({
  mode,
  configured,
  demo,
}: {
  mode: 'signin' | 'signup';
  configured: boolean;
  demo: boolean;
}) {
  const signup = mode === 'signup';
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code' | 'join'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [suspended, setSuspended] = useState(false);
  const details = useRef({ token: '', name: '', area: '', adult: false, rules: false });
  useEffect(() => {
    if (!configured) return;
    let active = true;
    fetch('/api/v1/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok || !active) return;
        const session = await response.json();
        if (!active) return;
        if (session.membership === 'active') router.replace('/community');
        else if (session.membership === 'suspended') setSuspended(true);
        else if (session.verified) {
          setEmail(session.email);
          setStep('join');
        }
      })
      .catch(() => {
        /* The email form remains available if the session check cannot connect. */
      });
    return () => {
      active = false;
    };
  }, [configured, router]);
  useEffect(() => {
    const update = () => setSeconds(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    update();
    if (!retryAt) return;
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  async function join() {
    const response = await fetch('/api/v1/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details.current),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || 'Could not accept the invitation. Please try again.');
    router.replace('/community');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const db = browserDb();
      if (!db) throw new Error('Sign-in is not available in this preview.');
      if (step === 'email') {
        if (signup) details.current.token = String(form.get('invite') || '').trim();
        const { error } = await db.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: signup },
        });
        if (error) throw error;
        setRetryAt(Date.now() + 60000);
        setStep('code');
      } else if (step === 'code') {
        const { error } = await db.auth.verifyOtp({
          email: email.trim(),
          token: String(form.get('code') || '').trim(),
          type: 'email',
        });
        if (error) throw error;
        if (signup) {
          setStep('join');
        } else router.replace('/community');
      } else {
        details.current = {
          token: String(form.get('invite') || '').trim(),
          name: String(form.get('name') || '').trim(),
          area: String(form.get('area') || '').trim(),
          adult: form.get('adult') === 'on',
          rules: form.get('rules') === 'on',
        };
        await join();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not connect. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy) return;
    if (Date.now() < retryAt) {
      setError('Please wait one minute before requesting another code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const db = browserDb();
      if (!db) throw new Error('Sign-in is not available in this preview.');
      const { error } = await db.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: signup },
      });
      if (error) throw error;
      setRetryAt(Date.now() + 60000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not send the code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="landing-auth">
      <aside className="auth-art">
        <img src="/images/games/witcher-1.webp" alt="" />
        <LandingBrand />
        <div>
          <span className="landing-kicker">Physical console games</span>
          <h2>
            Find games.
            <br />
            Share yours.
          </h2>
          <p>
            Buy, swap, or borrow physical games.
            <br />
            Connect with the people who own them.
          </p>
        </div>
      </aside>
      <section className="auth-panel" aria-label={signup ? 'Sign up' : 'Sign in'}>
        <Link href="/" className="auth-back">
          <ArrowLeft size={14} /> Back to Gamazon
        </Link>
        <h1>
          {suspended
            ? 'Community access paused.'
            : step === 'code'
              ? 'Check your email.'
              : step === 'join'
                ? 'Accept your invitation.'
                : signup
                  ? 'Join Gamazon.'
                  : 'Sign in.'}
        </h1>
        <p>
          {suspended
            ? 'Contact the organiser who invited you to discuss your membership.'
            : step === 'code'
              ? `Enter the sign-in code sent to ${email}.`
              : step === 'join'
                ? 'Your email is verified. Add your name and area to finish joining.'
                : signup
                  ? 'You’ll need an invitation from your community organiser.'
                  : 'Use your email to receive a sign-in code. No password needed.'}
        </p>
        {!configured && (
          <div className="auth-demo-notice">
            {demo
              ? 'This is a preview. Email sign-in and account creation are not connected yet.'
              : 'Email sign-in is temporarily unavailable. Please try again later.'}
            {demo && (
              <>
                <br />
                <Link href="/community">
                  Explore the demo <ArrowUpRight size={14} />
                </Link>
              </>
            )}
          </div>
        )}
        {!suspended && (
          <form onSubmit={submit} aria-busy={busy}>
            <fieldset className="auth-fields" key={step} disabled={busy}>
              {step === 'email' ? (
                <>
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={254}
                    />
                  </label>
                  {signup && (
                    <>
                      <label>
                        Invitation code
                        <input
                          name="invite"
                          defaultValue={details.current.token}
                          required
                          maxLength={200}
                          placeholder="Code from your organiser"
                          autoComplete="off"
                        />
                      </label>
                    </>
                  )}
                </>
              ) : step === 'code' ? (
                <label>
                  Email verification code
                  <input
                    key="code"
                    name="code"
                    required
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6,10}"
                    minLength={6}
                    maxLength={10}
                    placeholder="Enter your code"
                    autoFocus
                  />
                </label>
              ) : (
                <>
                  <label>
                    Display name
                    <input
                      name="name"
                      required
                      maxLength={60}
                      autoComplete="nickname"
                      defaultValue={details.current.name}
                      placeholder="Your name"
                    />
                  </label>
                  <label>
                    Neighbourhood
                    <input
                      name="area"
                      required
                      maxLength={60}
                      defaultValue={details.current.area}
                      placeholder="Your area, not your address"
                    />
                  </label>
                  <label>
                    Invitation code
                    <input
                      name="invite"
                      required
                      maxLength={200}
                      defaultValue={details.current.token}
                      autoFocus
                    />
                  </label>
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      name="adult"
                      required
                      defaultChecked={details.current.adult}
                    />
                    <span>I am 18 or older.</span>
                  </label>
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      name="rules"
                      required
                      defaultChecked={details.current.rules}
                    />
                    <span>
                      I agree to the{' '}
                      <Link href="/guidelines" target="_blank">
                        community guidelines and privacy policy
                      </Link>
                      .
                    </span>
                  </label>
                </>
              )}
            </fieldset>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="landing-pill" disabled={busy || !configured}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={17} /> Please wait
                </>
              ) : (
                <>
                  {step === 'email'
                    ? 'Send sign-in code'
                    : step === 'join'
                      ? 'Join community'
                      : 'Verify email'}{' '}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
            {step === 'code' && (
              <>
                <button
                  type="button"
                  className="auth-resend"
                  onClick={resend}
                  disabled={busy || seconds > 0}
                >
                  {seconds > 0 ? `Send another code in ${seconds}s` : 'Send another code'}
                </button>
                <button
                  type="button"
                  className="auth-resend"
                  onClick={() => {
                    setStep('email');
                    setError('');
                  }}
                  disabled={busy}
                >
                  Use another email
                </button>
              </>
            )}
          </form>
        )}
        {suspended && error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {(suspended || step === 'join') && (
          <button
            type="button"
            className="auth-resend"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const result = await browserDb()?.auth.signOut();
              setBusy(false);
              if (result?.error) setError(result.error.message);
              else {
                setSuspended(false);
                setStep('email');
                setError('');
              }
            }}
          >
            Use another email
          </button>
        )}
        <p className="auth-switch">
          {signup ? (
            <>
              Already a member? <Link href="/signin">Sign in</Link>
            </>
          ) : (
            <>
              Have an invitation? <Link href="/signup">Sign up</Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
