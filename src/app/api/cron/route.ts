import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serviceDb } from '@/lib/service';
import { apiError, dbError } from '@/lib/server';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const secret = process.env.CRON_SECRET,
      auth = request.headers.get('authorization') || '';
    if (
      !secret ||
      auth.length !== `Bearer ${secret}`.length ||
      !timingSafeEqual(Buffer.from(auth), Buffer.from(`Bearer ${secret}`))
    )
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const db = serviceDb();
    const { error: flush } = await db.rpc('flush_outbox');
    dbError(flush);
    const { data, error } = await db.rpc('maintenance_batch');
    dbError(error);
    let users = 0,
      images = 0,
      failures = 0;
    for (const id of data.users as string[]) {
      const { error } = await db.auth.admin.deleteUser(id);
      if (error && error.status !== 404) {
        failures++;
        continue;
      }
      const { error: ack } = await db.rpc('maintenance_ack', { deleted_user: id });
      if (ack) failures++;
      else users++;
    }
    for (const path of data.images as string[]) {
      const { error } = await db.storage.from('post-images').remove([path]);
      if (error) {
        failures++;
        continue;
      }
      const { error: ack } = await db.rpc('maintenance_ack', { deleted_image: path });
      if (ack) failures++;
      else images++;
    }
    return NextResponse.json({ users, images, failures }, { status: failures ? 503 : 200 });
  } catch (e) {
    return apiError(e);
  }
}
