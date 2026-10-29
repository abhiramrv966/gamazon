import { NextResponse } from 'next/server';
import { apiError, authenticated, dbError } from '@/lib/server';

export async function GET() {
  try {
    const { db, user } = await authenticated();
    const { data, error } = await db.rpc('my_membership_status');
    dbError(error);
    return NextResponse.json(
      { email: user.email, verified: !!user.email_confirmed_at, membership: data || 'none' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}
