import { NextResponse } from 'next/server';
import {
  authenticated,
  apiError,
  dbError,
  demoMode,
  demoState,
  demoUser,
  localDemo,
} from '@/lib/server';
import { deliverOutbox, snapshot } from '@/lib/domain';
import type { Snapshot } from '@/lib/types';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    if (demoMode()) {
      localDemo(request);
      const s = demoState();
      deliverOutbox(s);
      return NextResponse.json(snapshot(s, await demoUser(), true), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    const { db, user } = await authenticated();
    await db.rpc('flush_outbox');
    const [{ data, error }, deletion] = await Promise.all([
      db.rpc('app_snapshot'),
      db.rpc('can_delete_community_account'),
    ]);
    dbError(error);
    dbError(deletion.error);
    const state = {
      ...data,
      me: user.id,
      demo: false,
      can_delete_account: deletion.data === true,
    } as Snapshot;
    if (state.images?.length) {
      const { data: urls } = await db.storage.from('post-images').createSignedUrls(
        state.images.map((i) => i.path),
        60,
      );
      state.images = state.images.map((i, k) => ({ ...i, url: urls?.[k]?.signedUrl || undefined }));
    }
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}
