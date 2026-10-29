import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import CommunityApp from '@/components/community-app';
import { authenticated, demoMode, demoState, demoUser, localDemo } from '@/lib/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gamazon — Administration' };

export default async function AdminPage() {
  let allowed = false;
  try {
    if (demoMode()) {
      const requestHeaders = await headers();
      const host = requestHeaders.get('host');
      localDemo(new Request(`http://${host}/admin`, { headers: requestHeaders }));
      const me = await demoUser();
      allowed = demoState().memberships.some(
        (member) => member.id === me && member.role === 'admin' && member.status === 'active',
      );
    } else {
      const { db, user } = await authenticated(true);
      const { data, error } = await db
        .from('memberships')
        .select('role,status')
        .eq('id', user.id)
        .maybeSingle();
      allowed = !error && data?.role === 'admin' && data.status === 'active';
    }
  } catch {
    // Failed authentication or unavailable membership checks must never render admin controls.
  }
  if (!allowed) redirect('/community');
  return <CommunityApp initialPage="admin" />;
}
