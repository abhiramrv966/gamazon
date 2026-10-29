create function public.upload_allowance() returns void language plpgsql security definer set search_path=public,pg_temp as $$ begin if not app_private.active() then raise exception 'Active membership required.';end if;perform app_private.throttle('upload',10);end $$;
revoke all on function public.upload_allowance() from public,anon;
grant execute on function public.upload_allowance() to authenticated;

-- Content-free activity supports cohort activation and retention analysis.
create table app_private.activity(id bigint generated always as identity primary key,user_id uuid not null references public.profiles on delete cascade,event text not null,created_at timestamptz not null default now());
create index activity_cohort on app_private.activity(user_id,created_at);
create function app_private.record_activity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid;event_name text;begin
 case tg_table_name when 'posts' then actor=new.owner_id;event_name='post_created';when 'comments' then actor=new.author_id;event_name='comment_created';when 'messages' then actor=new.sender_id;event_name='message_sent';end case;
 insert into app_private.activity(user_id,event) values(actor,event_name);return new;
end $$;
create trigger post_activity after insert on public.posts for each row execute function app_private.record_activity();
create trigger comment_activity after insert on public.comments for each row execute function app_private.record_activity();
create trigger message_activity after insert on public.messages for each row execute function app_private.record_activity();
create function public.pilot_activity() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$ begin
 if not app_private.admin() then raise exception 'Administrator MFA is required.';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('member',m.id,'joined_at',m.joined_at,'event',a.event,'occurred_at',a.created_at)) from public.memberships m left join app_private.activity a on a.user_id=m.id),'[]');
end $$;
revoke all on function app_private.record_activity() from public,anon,authenticated;
revoke all on function public.pilot_activity() from public,anon;
grant execute on function public.pilot_activity() to authenticated;
