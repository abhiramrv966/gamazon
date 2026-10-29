create table app_private.media_deletions(path text primary key,requested_at timestamptz not null default now());
create function app_private.queue_image_deletion() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin insert into app_private.media_deletions(path) values(old.path) on conflict do nothing;return old;end $$;
create trigger image_cleanup before delete on public.images for each row execute function app_private.queue_image_deletion();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('post-images','post-images',false,5242880,array['image/webp']) on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/webp'];
-- Client uploads are deliberately forbidden: the server re-encodes every image first.
create policy game_photo_read on storage.objects for select to authenticated using(bucket_id='post-images' and exists(select 1 from public.images i join public.posts p on p.id=i.post_id where i.path=name and app_private.visible(p.owner_id)));

create function public.attach_image(image_id uuid,post uuid,image_path text,actor uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not app_private.active(actor) then raise exception 'Active membership required.';end if;
 perform 1 from public.posts where id=post and owner_id=actor for update;
 if not found or (select count(*) from public.images where post_id=post)>=4 then raise exception 'Upload unavailable. A post can have up to four photos.';end if;
 if image_path<>actor::text||'/'||post::text||'/'||image_id::text||'.webp' then raise exception 'Invalid photo path.';end if;
 if not exists(select 1 from storage.objects where bucket_id='post-images' and name=image_path) then raise exception 'Uploaded photo not found.';end if;
 insert into public.images(id,post_id,owner_id,path) values(image_id,post,actor,image_path);
end $$;

create function public.maintenance_batch() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$ begin
 delete from public.reports where status='resolved' and resolved_at<now()-interval '90 days';
 delete from public.notifications where read and created_at<now()-interval '30 days';
 delete from public.outbox where delivered_at<now()-interval '30 days';
 delete from public.invites where expires_at<now()-interval '30 days';
 delete from app_private.rate_limits where window_start<now()-interval '1 day';
 delete from app_private.deletions where processed_at is not null and requested_at<now()-interval '31 days';
 -- Includes uploaded objects that never attached because a request crashed.
 insert into app_private.media_deletions(path) select o.name from storage.objects o where o.bucket_id='post-images' and o.created_at<now()-interval '1 day' and not exists(select 1 from public.images i where i.path=o.name) on conflict do nothing;
 return jsonb_build_object('users',coalesce((select jsonb_agg(user_id) from(select user_id from app_private.deletions where processed_at is null limit 100)s),'[]'), 'images',coalesce((select jsonb_agg(path) from(select path from app_private.media_deletions limit 100)s),'[]'));
end $$;
create function public.maintenance_ack(deleted_user uuid default null,deleted_image text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if deleted_user is not null then update app_private.deletions set processed_at=now() where user_id=deleted_user;end if;
 if deleted_image is not null then delete from app_private.media_deletions where path=deleted_image;end if;
end $$;

create function public.pilot_metrics() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$ begin
 if not app_private.admin() then raise exception 'Administrator MFA is required.';end if;
 return jsonb_build_object('members',(select count(*) from public.memberships where status='active'),'posts',(select count(*) from public.posts),
 'mutually_confirmed_exchanges',(select count(*) from(select o.conversation_id from public.outcomes o join public.conversations c on c.id=o.conversation_id where o.exchanged and o.user_id in(c.from_id,c.to_id) group by o.conversation_id having count(distinct o.user_id)=2)q),
 'one_sided_confirmations',(select count(*) from(select conversation_id from public.outcomes where exchanged group by conversation_id having count(*)=1)q),
 'open_reports',(select count(*) from public.reports where status='open'),
 'reports_over_24h',(select count(*) from public.reports where status='open' and created_at<now()-interval '24 hours'));
end $$;
revoke all on function app_private.queue_image_deletion() from public,anon,authenticated;
revoke all on function public.attach_image(uuid,uuid,text,uuid),public.maintenance_batch(),public.maintenance_ack(uuid,text) from public,anon,authenticated;
grant execute on function public.attach_image(uuid,uuid,text,uuid),public.maintenance_batch(),public.maintenance_ack(uuid,text),public.flush_outbox() to service_role;
revoke all on function public.pilot_metrics() from public,anon;
grant execute on function public.pilot_metrics() to authenticated;

-- Supabase Realtime uses SELECT policies on these tables for each subscriber.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.messages,public.notifications;
 end if;
end $$;
