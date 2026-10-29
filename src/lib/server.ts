import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { seedState, ids } from './seed';
import { DomainError } from './domain';
import type { State } from './types';
export function demoMode() {
  return (
    process.env.GAMAZON_DEMO === 'true' ||
    (process.env.NODE_ENV === 'development' &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.GAMAZON_DEMO !== 'false')
  );
}
const g = globalThis as unknown as {
  gamazonState?: State;
  gamazonLimits?: Map<string, { count: number; until: number }>;
};
export function demoState() {
  return (g.gamazonState ??= seedState());
}
export async function demoUser() {
  return (await cookies()).get('gamazon-demo-user')?.value || ids.me;
}
export async function supabase(readOnlyCookies = false) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new DomainError(
      'Live mode is not configured. Follow README.md to connect Supabase.',
      503,
    );
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        if (readOnlyCookies) return;
        for (const c of items) jar.set(c.name, c.value, c.options);
      },
    },
  });
}
export async function authenticated(readOnlyCookies = false) {
  const db = await supabase(readOnlyCookies);
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new DomainError('Sign in to your community.', 401);
  return { db, user };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin'),
    url = new URL(request.url);
  const allowed = new Set([
    process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
      : url.origin,
  ]);
  if (demoMode()) {
    localDemo(request);
    allowed.add(`http://127.0.0.1:${url.port || '3000'}`);
    allowed.add(`http://localhost:${url.port || '3000'}`);
  }
  if (!origin || !allowed.has(origin)) throw new DomainError('Invalid request origin.', 403);
}
export function localDemo(request: Request) {
  if (!demoMode()) throw new DomainError('Not found.', 404);
  const h = new URL(request.url).hostname;
  const forwarded = (request.headers.get('x-forwarded-for') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(h) ||
    forwarded.some((ip) => !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip))
  )
    throw new DomainError('The demo is local only.', 403);
}
export function rateLimit(key: string, limit = 60) {
  const m = (g.gamazonLimits ??= new Map());
  const now = Date.now();
  if (m.size > 5000) for (const [k, v] of m) if (v.until < now) m.delete(k);
  let b = m.get(key);
  if (!b || b.until < now) {
    b = { count: 0, until: now + 60000 };
    m.set(key, b);
  }
  if (++b.count > limit) throw new DomainError('Please slow down and try again in a minute.', 429);
}
export function apiError(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  if (error instanceof DomainError)
    return NextResponse.json({ error: error.message }, { status: error.status });
  if (error && typeof error === 'object' && 'issues' in error)
    return NextResponse.json({ error: 'Check the form fields and try again.' }, { status: 400 });
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export async function readBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length') || 0) > maxBytes)
    throw new DomainError('Request too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new DomainError('Request too large.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
export function dbError(error: { message: string; code?: string } | null) {
  if (error)
    throw new DomainError(
      error.code === 'P0001'
        ? error.message
        : 'This action is unavailable. Check your membership and permissions.',
      error.code === 'P0001' ? 400 : 403,
    );
}
