-- Verified adults can join as members; ownership remains an operator-only assignment.
create function public.join_community(display_name text, neighbourhood text, adult boolean, rules boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid := auth.uid(); existing_status text;
begin
  if actor is null or adult is distinct from true or rules is distinct from true then
    raise exception 'Verified sign-in and acceptance are required.';
  end if;
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then
    raise exception 'Verify your email first.';
  end if;
  if display_name is null or length(trim(display_name)) not between 1 and 60
    or neighbourhood is null or length(trim(neighbourhood)) not between 1 and 60 then
    raise exception 'Enter your name and neighbourhood.';
  end if;
  perform app_private.throttle('join',10);
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  if exists(select 1 from app_private.deletions where user_id=actor) then
    raise exception 'This account is being deleted.';
  end if;
  select status into existing_status from public.memberships where id=actor;
  if existing_status='suspended' then raise exception 'Community access is paused.'; end if;
  if existing_status='active' then return; end if;
  insert into public.memberships(id,role) values(actor,'member');
  insert into public.profiles(id,name,area) values(actor,trim(display_name),trim(neighbourhood));
end $$;
revoke all on function public.join_community(text,text,boolean,boolean) from public,anon;
grant execute on function public.join_community(text,text,boolean,boolean) to authenticated;
