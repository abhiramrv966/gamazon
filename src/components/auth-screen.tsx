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
  mode: 'signin' | 'signup' | 'recovery';
  configured: boolean;
  demo: boolean;
}) {
  const signup = mode === 'signup';
  const recovery = mode === 'recovery';
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code' | 'join' | 'password' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [suspended, setSuspended] = useState(false);
  const details = useRef({ name: '', area: '', adult: false, rules: false });
  useEffect(() => {
    setReady(true);
    if (!configured) return;
    let active = true;
    fetch('/api/v1/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok || !active) return;
        const session = await response.json();
        if (!active) return;
        if (recovery) {
          setEmail(session.email);
          return;
        }
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
  }, [configured, recovery, router]);
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
      throw new Error(result.error || 'Could not finish your profile. Please try again.');
    router.replace('/community');
  }

  async function continueAfterSignIn() {
    const response = await fetch('/api/v1/session', { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not check your account. Please try again.');
    const session = await response.json();
    if (session.membership === 'suspended') setSuspended(true);
    else if (session.membership === 'active') router.replace('/community');
    else setStep('join');
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
        if (recovery) {
          const { error } = await db.auth.resetPasswordForEmail(email.trim());
          if (error) throw error;
        } else {
          const credentials = { email: email.trim(), password: String(form.get('password') || '') };
          if (signup) {
            const { data, error } = await db.auth.signUp(credentials);
            if (error) throw error;
            if (data.session) return await continueAfterSignIn();
          } else {
            const { error } = await db.auth.signInWithPassword(credentials);
            if (!error) return await continueAfterSignIn();
            if (error.code !== 'email_not_confirmed') throw error;
            const resent = await db.auth.resend({ type: 'signup', email: email.trim() });
            if (resent.error) throw resent.error;
          }
        }
        setRetryAt(Date.now() + 60000);
        setStep('code');
      } else if (step === 'code') {
        const { error } = await db.auth.verifyOtp({
          email: email.trim(),
          token: String(form.get('code') || '').trim(),
          type: recovery ? 'recovery' : 'email',
        });
        if (error) throw error;
        if (recovery) setStep('password');
        else await continueAfterSignIn();
      } else if (step === 'password') {
        const { error } = await db.auth.updateUser({
          password: String(form.get('password') || ''),
        });
        if (error) throw error;
        const signedOut = await db.auth.signOut();
        if (signedOut.error) throw signedOut.error;
        setStep('done');
      } else {
        details.current = {
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
      const { error } = recovery
        ? await db.auth.resetPasswordForEmail(email.trim())
        : await db.auth.resend({ type: 'signup', email: email.trim() });
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
      <section
        className="auth-panel"
        aria-label={recovery ? 'Reset password' : signup ? 'Sign up' : 'Sign in'}
      >
        <Link href="/" className="auth-back">
          <ArrowLeft size={14} /> Back to Gamazon
        </Link>
        <h1>
          {suspended
            ? 'Community access paused.'
            : step === 'code'
              ? 'Check your email.'
              : step === 'join'
                ? 'Make it yours.'
                : step === 'password'
                  ? 'Choose a new password.'
                  : step === 'done'
                    ? 'Password updated.'
                    : recovery
                      ? 'Reset your password.'
                      : signup
                        ? 'Join Gamazon.'
                        : 'Sign in.'}
        </h1>
        <p>
          {suspended
            ? 'Contact the community administrator to discuss your membership.'
            : step === 'code'
              ? `Enter the verification code sent to ${email}.`
              : step === 'join'
                ? 'Your email is verified. Add your name and area to finish joining.'
                : step === 'password'
                  ? 'Use at least 12 characters.'
                  : step === 'done'
                    ? 'Sign in with your new password.'
                    : recovery
                      ? 'We’ll email you a code to set or reset your password.'
                      : signup
                        ? 'Create your account with an email and password.'
                        : 'Welcome back. Enter your email and password.'}
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
        {!suspended && step !== 'done' && (
          <form method="post" onSubmit={submit} aria-busy={busy}>
            <fieldset className="auth-fields" key={step} disabled={busy || !ready}>
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
                  {!recovery && (
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        required
                        minLength={signup ? 12 : undefined}
                        maxLength={128}
                        placeholder={signup ? 'At least 12 characters' : 'Your password'}
                        autoComplete={signup ? 'new-password' : 'current-password'}
                      />
                    </label>
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
              ) : step === 'password' ? (
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="At least 12 characters"
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
            <button type="submit" className="landing-pill" disabled={busy || !ready || !configured}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={17} /> Please wait
                </>
              ) : (
                <>
                  {step === 'email'
                    ? recovery
                      ? 'Send reset code'
                      : signup
                        ? 'Create account'
                        : 'Sign in'
                    : step === 'join'
                      ? 'Join Gamazon'
                      : step === 'password'
                        ? 'Save password'
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
        {!recovery && step === 'email' && (
          <p className="auth-switch">
            <Link href="/reset-password">Forgot your password?</Link>
          </p>
        )}
        <p className="auth-switch">
          {signup || recovery ? (
            <>
              Already a member? <Link href="/signin">Sign in</Link>
            </>
          ) : (
            <>
              New to Gamazon? <Link href="/signup">Create an account</Link>
            </>
          )}
        </p>
      </section>
    </main>
  );
}
