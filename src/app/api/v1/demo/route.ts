import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiError, localDemo, sameOrigin } from '@/lib/server';
import { ids } from '@/lib/seed';
export async function POST(request: Request) {
  try {
    localDemo(request);
    sameOrigin(request);
    const { user_id } = await request.json();
    if (!Object.values(ids).includes(user_id))
      return NextResponse.json({ error: 'Unknown demo member' }, { status: 400 });
    (await cookies()).set('gamazon-demo-user', user_id, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: false,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
