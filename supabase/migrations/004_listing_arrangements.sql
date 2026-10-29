alter table public.posts add column exchange_modes text[] not null default '{}';
alter table public.posts drop constraint posts_description_check;
alter table public.posts add constraint posts_description_check check(length(trim(description)) <= 2000);
alter table public.posts add constraint posts_exchange_modes check (
  cardinality(exchange_modes) <= 3
  and exchange_modes <@ array['sale','swap','loan']::text[]
  and array_position(exchange_modes, null) is null
  and (cardinality(exchange_modes)=0 or 'sale'=any(exchange_modes) or price is null)
);
create index posts_exchange_modes on public.posts using gin(exchange_modes);

-- Preserve the guarded command implementation and keep it inaccessible as a public RPC.
alter function public.app_command(jsonb) rename to app_command_v1;
revoke all on function public.app_command_v1(jsonb) from public, anon, authenticated;

create function public.app_command(command jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  actor uuid := auth.uid();
  op text := command->>'type';
  result jsonb;
  modes text[];
  target uuid;
begin
  if not app_private.active(actor) then raise exception 'An active community membership is required.'; end if;
  if op not in ('post.create','post.update') then return public.app_command_v1(command); end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if jsonb_typeof(coalesce(command->'exchange_modes','[]'::jsonb)) <> 'array' then raise exception 'Choose a valid arrangement.'; end if;
  select coalesce(array_agg(value),'{}'::text[]) into modes from jsonb_array_elements_text(coalesce(command->'exchange_modes','[]'::jsonb));
  if cardinality(modes)>3 or not modes <@ array['sale','swap','loan']::text[] or array_position(modes,null) is not null
    or (select count(distinct value) from unnest(modes) value) <> cardinality(modes)
    then raise exception 'Choose each valid arrangement once.'; end if;
  if cardinality(modes)>0 and not 'sale'=any(modes) and command->>'price' is not null then raise exception 'Only sale listings can have an asking price.'; end if;
  if op='post.create' then
    target := coalesce((command->>'request_id')::uuid,gen_random_uuid());
    if exists(select 1 from public.posts where id=target) then
      if not exists(select 1 from public.posts where id=target and owner_id=actor) then raise exception 'Listing identifier is already in use.'; end if;
      return jsonb_build_object('id',target);
    end if;
    perform app_private.throttle('all',90);
    perform app_private.throttle(op,10);
    perform app_private.check_content((command->>'title')||' '||(command->>'description'));
    insert into public.posts(id,owner_id,title,platform,generation,format,kind,condition,area,description,price,drive_required,download_required,code_required,exchange_modes)
    values(target,actor,trim(command->>'title'),command->>'platform',trim(command->>'generation'),command->>'format',command->>'kind',command->>'condition',trim(command->>'area'),trim(command->>'description'),(command->>'price')::numeric,command->>'format'='Disc',command->>'format'='Game-key card' or (command->>'download_required')::boolean,(command->>'code_required')::boolean,modes);
    return jsonb_build_object('id',target);
  end if;
  perform app_private.throttle('all',90);
  perform app_private.throttle(op,60);
  target := (command->>'id')::uuid;
  perform 1 from public.posts where id=target and owner_id=actor for update;
  if not found then raise exception 'Post not found.'; end if;
  perform app_private.check_content((command->>'title')||' '||(command->>'description'));
  update public.posts set
    title=trim(command->>'title'), platform=command->>'platform', generation=trim(command->>'generation'),
    format=command->>'format', kind=command->>'kind', condition=command->>'condition',
    area=trim(command->>'area'), description=trim(command->>'description'), price=(command->>'price')::numeric,
    drive_required=command->>'format'='Disc',
    download_required=command->>'format'='Game-key card' or (command->>'download_required')::boolean,
    code_required=(command->>'code_required')::boolean, exchange_modes=modes
    where id=target and owner_id=actor;
  return jsonb_build_object('id',target);
end $$;
revoke all on function public.app_command(jsonb) from public, anon;
grant execute on function public.app_command(jsonb) to authenticated;

create function public.my_membership_status() returns text language sql stable security definer
set search_path=public,pg_temp as $$ select status from public.memberships where id=auth.uid() $$;
revoke all on function public.my_membership_status() from public, anon;
grant execute on function public.my_membership_status() to authenticated;

create function public.can_delete_community_account() returns boolean language sql stable security definer
set search_path=public,pg_temp as $$
 select app_private.active() and (
   not exists(select 1 from public.memberships where id=auth.uid() and role='admin')
   or (select count(*) from public.memberships where role='admin' and status='active')>1
 )
$$;
revoke all on function public.can_delete_community_account() from public, anon;
grant execute on function public.can_delete_community_account() to authenticated;
