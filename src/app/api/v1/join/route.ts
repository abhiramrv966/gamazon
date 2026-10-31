import { NextResponse } from 'next/server';
import { joinSchema } from '@/lib/schema';
import { authenticated, apiError, dbError, sameOrigin, readBody } from '@/lib/server';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, user } = await authenticated();
    const c = joinSchema.parse(JSON.parse(new TextDecoder().decode(await readBody(request, 2000))));
    if (!user.email_confirmed_at)
      return NextResponse.json({ error: 'Verify your email first.' }, { status: 403 });
    const { error } = await db.rpc('join_community', {
      display_name: c.name,
      neighbourhood: c.area,
      adult: c.adult,
      rules: c.rules,
    });
    dbError(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
