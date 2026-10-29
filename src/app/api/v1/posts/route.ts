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
const cursorSchema = z.object({ date: z.iso.datetime({ offset: true }), id: z.string().uuid() });
export async function GET(request: Request) {
  try {
    const u = new URL(request.url);
    const cursor = u.searchParams.get('cursor');
    const after = cursor
      ? cursorSchema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()))
      : null;
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .parse(u.searchParams.get('limit') || 20);
    const platform = z
      .enum(['PlayStation', 'Xbox', 'Nintendo'])
      .optional()
      .parse(u.searchParams.get('platform') || undefined);
    const kind = z
      .enum(['offer', 'wanted'])
      .optional()
      .parse(u.searchParams.get('kind') || undefined);
    const status = z
      .enum(['open', 'paused', 'closed'])
      .optional()
      .parse(u.searchParams.get('status') || undefined);
    const search = (u.searchParams.get('q') || '').slice(0, 100);
    const exchange = z
      .enum(['sale', 'swap', 'loan'])
      .optional()
      .parse(u.searchParams.get('exchange') || undefined);
    let rows;
    if (demoMode()) {
      localDemo(request);
      rows = snapshot(demoState(), await demoUser())
        .posts.filter(
          (p) =>
            (!platform || p.platform === platform) &&
            (!kind || p.kind === kind) &&
            (!exchange || (p.kind === 'offer' && p.exchange_modes?.includes(exchange))) &&
            (!status || p.status === status) &&
            p.title.toLowerCase().includes(search.toLowerCase()) &&
            (!after ||
              p.created_at < after.date ||
              (p.created_at === after.date && p.id < after.id)),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
        .slice(0, limit + 1);
    } else {
      const { db } = await authenticated();
      let q = db
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit + 1);
      if (platform) q = q.eq('platform', platform);
      if (kind) q = q.eq('kind', kind);
      if (exchange) q = q.eq('kind', 'offer').contains('exchange_modes', [exchange]);
      if (status) q = q.eq('status', status);
      if (search) q = q.ilike('title', `%${search.replace(/[%_\\]/g, '')}%`);
      if (after)
        q = q.or(`created_at.lt.${after.date},and(created_at.eq.${after.date},id.lt.${after.id})`);
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
