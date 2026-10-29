import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  apiError,
  authenticated,
  dbError,
  demoMode,
  demoState,
  demoUser,
  localDemo,
} from '@/lib/server';
import { snapshot } from '@/lib/domain';
export async function GET(request: Request) {
  try {
    const u = new URL(request.url),
      cid = z.string().uuid().parse(u.searchParams.get('conversation_id')),
      limit = z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .parse(u.searchParams.get('limit') || 50),
      raw = u.searchParams.get('cursor');
    const cursor = raw
      ? z
          .object({ date: z.iso.datetime({ offset: true }), id: z.string().uuid() })
          .parse(JSON.parse(Buffer.from(raw, 'base64url').toString()))
      : null;
    let rows;
    if (demoMode()) {
      localDemo(request);
      const state = snapshot(demoState(), await demoUser());
      rows = state.messages
        .filter(
          (m) =>
            m.conversation_id === cid &&
            (!cursor ||
              m.created_at < cursor.date ||
              (m.created_at === cursor.date && m.id < cursor.id)),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
        .slice(0, limit + 1);
    } else {
      const { db } = await authenticated();
      let q = db
        .from('messages')
        .select('*')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1);
      if (cursor)
        q = q.or(
          `created_at.lt.${cursor.date},and(created_at.eq.${cursor.date},id.lt.${cursor.id})`,
        );
      const { data, error } = await q;
      dbError(error);
      rows = data || [];
    }
    const hasMore = rows.length > limit,
      items = rows.slice(0, limit),
      last = items.at(-1);
    return NextResponse.json(
      {
        items,
        next_cursor:
          hasMore && last
            ? Buffer.from(JSON.stringify({ date: last.created_at, id: last.id })).toString(
                'base64url',
              )
            : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
