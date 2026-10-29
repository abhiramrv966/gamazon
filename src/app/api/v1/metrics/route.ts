import { NextResponse } from 'next/server';
import {
  apiError,
  authenticated,
  dbError,
  demoMode,
  demoState,
  demoUser,
  localDemo,
} from '@/lib/server';
export async function GET(request: Request) {
  try {
    if (demoMode()) {
      localDemo(request);
      const s = demoState(),
        me = await demoUser();
      if (!s.memberships.some((m) => m.id === me && m.role === 'admin' && m.status === 'active'))
        return NextResponse.json({ error: 'Administrator required.' }, { status: 403 });
      const counts = s.conversations.map(
        (c) => s.outcomes.filter((o) => o.conversation_id === c.id && o.exchanged).length,
      );
      return NextResponse.json({
        demo: true,
        members: s.memberships.length,
        posts: s.posts.length,
        mutually_confirmed_exchanges: counts.filter((x) => x === 2).length,
        one_sided_confirmations: counts.filter((x) => x === 1).length,
        open_reports: s.reports.filter((x) => x.status === 'open').length,
      });
    }
    const { db } = await authenticated();
    const { data, error } = await db.rpc('pilot_metrics');
    dbError(error);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return apiError(e);
  }
}
