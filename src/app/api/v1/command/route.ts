import { NextResponse } from 'next/server';
import { commandSchema } from '@/lib/schema';
import { execute, deliverOutbox } from '@/lib/domain';
import {
  authenticated,
  apiError,
  dbError,
  demoMode,
  demoState,
  demoUser,
  localDemo,
  sameOrigin,
  rateLimit,
  readBody,
} from '@/lib/server';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const live = demoMode() ? null : await authenticated();
    const body = new TextDecoder().decode(await readBody(request, 12000));
    const command = commandSchema.parse(JSON.parse(body));
    if (demoMode()) {
      localDemo(request);
      const me = await demoUser();
      rateLimit(me + command.type, command.type === 'conversation.start' ? 10 : 60);
      const s = demoState();
      const result = execute(s, me, command, { mfa: true });
      deliverOutbox(s);
      return NextResponse.json(result);
    }
    const { db } = live!;
    const { data, error } = await db.rpc('app_command', { command });
    dbError(error);
    await db.rpc('flush_outbox');
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}
