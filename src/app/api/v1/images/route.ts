import { NextResponse } from 'next/server';
import { sanitiseImage } from '@/lib/images';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { active } from '@/lib/domain';
import { serviceDb } from '@/lib/service';
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
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const live = demoMode() ? null : await authenticated();
    const demoActor = demoMode() ? await demoUser() : null;
    if (demoActor) {
      if (!active(demoState(), demoActor))
        return NextResponse.json({ error: 'Active membership required.' }, { status: 403 });
      rateLimit(demoActor + 'upload', 10);
    } else {
      const { error } = await live!.db.rpc('upload_allowance');
      dbError(error);
    }
    if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024)
      return NextResponse.json({ error: 'Image must be under 5 MB.' }, { status: 413 });
    const raw = await readBody(request, 6 * 1024 * 1024);
    const form = await new Response(Buffer.from(raw), {
        headers: { 'content-type': request.headers.get('content-type') || '' },
      }).formData(),
      file = form.get('file'),
      post_id = z.string().uuid().parse(form.get('post_id'));
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    )
      return NextResponse.json(
        { error: 'Choose a JPG, PNG, or WebP image under 5 MB.' },
        { status: 400 },
      );
    const buffer = await sanitiseImage(Buffer.from(await file.arrayBuffer()));
    const id = randomUUID();
    if (demoMode()) {
      localDemo(request);
      const me = await demoUser(),
        s = demoState();
      if (
        !active(s, me) ||
        !s.posts.some((p) => p.id === post_id && p.owner_id === me) ||
        s.images.filter((i) => i.post_id === post_id).length >= 4
      )
        return NextResponse.json({ error: 'Upload unavailable.' }, { status: 403 });
      s.images.push({
        id,
        post_id,
        owner_id: me,
        path: id,
        url: `data:image/webp;base64,${buffer.toString('base64')}`,
      });
      return NextResponse.json({ id });
    }
    const { db, user } = live!;
    const path = `${user.id}/${post_id}/${id}.webp`;
    const { data: post } = await db
      .from('posts')
      .select('id')
      .eq('id', post_id)
      .eq('owner_id', user.id)
      .maybeSingle();
    if (!post) return NextResponse.json({ error: 'Post unavailable.' }, { status: 403 });
    const service = serviceDb();
    const { error: upload } = await service.storage
      .from('post-images')
      .upload(path, buffer, { contentType: 'image/webp', upsert: false });
    dbError(upload);
    const { error } = await service.rpc('attach_image', {
      image_id: id,
      post: post_id,
      image_path: path,
      actor: user.id,
    });
    if (error) {
      await service.storage.from('post-images').remove([path]);
      dbError(error);
    }
    return NextResponse.json({ id });
  } catch (e) {
    return apiError(e);
  }
}
