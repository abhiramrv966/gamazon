-- One community per deployment. All mutations go through guarded RPCs.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.community (id boolean primary key default true check(id), name text not null, city text not null);
insert into public.community values(true,'Your local gaming circle','Launch city');
create table public.memberships (
 id uuid primary key references auth.users on delete cascade,
 role text not null default 'member' check(role in ('member','admin')),
 status text not null default 'active' check(status in ('active','suspended')),
 joined_at timestamptz not null default now(), adult_accepted_at timestamptz not null default now(), rules_version text not null default '2026-10-v1'
);
create table public.profiles (
 id uuid primary key references public.memberships on delete cascade,
 name text not null check(length(trim(name)) between 1 and 60), bio text not null default '' check(length(bio)<=500),
 area text not null check(length(trim(area)) between 1 and 60), consoles text[] not null default '{}', genres text[] not null default '{}',
 handle text not null default '' check(length(handle)<=60), avatar text not null default 'mint' check(avatar in ('peach','mint','lavender','blue','gold')),
 created_at timestamptz not null default now(), check(cardinality(consoles)<=10), check(cardinality(genres)<=10)
);
create table public.invites (
 id uuid primary key default gen_random_uuid(), email text not null check(length(email)<=254), token_hash text not null unique,
 expires_at timestamptz not null default now()+interval '7 days', used_at timestamptz, revoked boolean not null default false
);
create table public.posts (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade,
 title text not null check(length(trim(title)) between 1 and 100), platform text not null check(platform in ('PlayStation','Xbox','Nintendo')),
 generation text not null check(length(trim(generation)) between 1 and 40), format text not null check(format in ('Disc','Cartridge','Game-key card')),
 kind text not null check(kind in ('offer','wanted')), condition text not null check(condition in ('Like new','Good','Fair','Any condition')),
 area text not null check(length(trim(area)) between 1 and 60), description text not null check(length(trim(description)) between 1 and 2000),
 price numeric check(price>=0 and price<=100000), status text not null default 'open' check(status in ('open','paused','closed')),
 drive_required boolean not null, download_required boolean not null, code_required boolean not null,
 art text not null default 'forest', created_at timestamptz not null default now(),
 check((platform='Nintendo' and format<>'Disc') or (platform<>'Nintendo' and format='Disc')),
 check(drive_required=(format='Disc')),check(format<>'Game-key card' or download_required)
);
create index posts_feed on public.posts(created_at desc,id desc);
create index posts_filters on public.posts(platform,status,area,kind);
create index posts_search on public.posts using gin(to_tsvector('simple',title||' '||description));
create table public.images (id uuid primary key, post_id uuid not null references public.posts on delete cascade, owner_id uuid not null references public.profiles on delete cascade,path text not null unique);
create table public.comments (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts on delete cascade,
 author_id uuid not null references public.profiles on delete cascade,parent_id uuid references public.comments on delete cascade,
 body text not null check(length(trim(body)) between 1 and 1500),created_at timestamptz not null default now(),edited_at timestamptz
);
create index comments_post on public.comments(post_id,created_at);
create table public.connections (id uuid primary key default gen_random_uuid(),from_id uuid not null references public.profiles on delete cascade,to_id uuid not null references public.profiles on delete cascade,status text not null default 'pending' check(status in ('pending','accepted')),created_at timestamptz not null default now(),check(from_id<>to_id));
create unique index connections_pair on public.connections(least(from_id,to_id),greatest(from_id,to_id));
create table public.blocks(id uuid primary key default gen_random_uuid(),from_id uuid not null references public.profiles on delete cascade,to_id uuid not null references public.profiles on delete cascade,unique(from_id,to_id),check(from_id<>to_id));
create table public.shelf(id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles on delete cascade,title text not null check(length(trim(title)) between 1 and 100),platform text not null check(platform in ('PlayStation','Xbox','Nintendo')),kind text not null check(kind in ('owned','wishlist')));
create table public.conversations(id uuid primary key default gen_random_uuid(),from_id uuid not null references public.profiles on delete cascade,to_id uuid not null references public.profiles on delete cascade,post_id uuid references public.posts on delete set null,status text not null check(status in ('pending','active','declined')),created_at timestamptz not null default now(),check(from_id<>to_id));
create unique index conversations_pair on public.conversations(least(from_id,to_id),greatest(from_id,to_id));
create table public.messages(id uuid primary key,conversation_id uuid not null references public.conversations on delete cascade,sender_id uuid not null references public.profiles on delete cascade,body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now());
create index messages_history on public.messages(conversation_id,created_at desc,id desc);
create table public.cursors(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,conversation_id uuid not null references public.conversations on delete cascade,read_at timestamptz not null default now(),unique(user_id,conversation_id));
create table public.notifications(id uuid primary key,user_id uuid not null references public.profiles on delete cascade,text text not null,target text not null,read boolean not null default false,created_at timestamptz not null default now());
create index notifications_user on public.notifications(user_id,created_at desc);
create table public.outbox(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,text text not null,target text not null,delivered_at timestamptz,created_at timestamptz not null default now());
create index outbox_pending on public.outbox(created_at) where delivered_at is null;
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null,target_type text not null check(target_type in ('post','comment','message','profile')),target_id uuid not null,reason text not null check(length(trim(reason)) between 1 and 1000),evidence text not null,subject_id uuid not null,status text not null default 'open' check(status in ('open','resolved')),created_at timestamptz not null default now(),resolved_at timestamptz);
create table public.moderation(id uuid primary key default gen_random_uuid(),admin_id uuid not null,report_id uuid not null references public.reports on delete cascade,action text not null,note text not null check(length(trim(note)) between 1 and 1000),created_at timestamptz not null default now());
create table public.outcomes(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations on delete cascade,user_id uuid not null references public.profiles on delete cascade,exchanged boolean not null,created_at timestamptz not null default now(),unique(conversation_id,user_id));
create table app_private.rate_limits(actor uuid not null,action text not null,window_start timestamptz not null,count integer not null,primary key(actor,action,window_start));
create table app_private.deletions(user_id uuid primary key,requested_at timestamptz not null default now(),processed_at timestamptz);

create function app_private.active(actor uuid default auth.uid()) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.memberships where id=actor and status='active') $$;
create function app_private.admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.memberships where id=auth.uid() and status='active' and role='admin') and coalesce(auth.jwt()->>'aal','')='aal2' $$;
create function app_private.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.blocks where (from_id=a and to_id=b) or (from_id=b and to_id=a)) $$;
create function app_private.visible(owner uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select app_private.active() and not app_private.blocked(auth.uid(),owner) $$;
create function app_private.participant(cid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select app_private.active() and exists(select 1 from public.conversations c where c.id=cid and auth.uid() in (c.from_id,c.to_id) and not app_private.blocked(c.from_id,c.to_id)) $$;
create function app_private.throttle(action_name text,max_count integer) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare n integer; begin
 insert into app_private.rate_limits values(auth.uid(),action_name,date_trunc('minute',now()),1) on conflict(actor,action,window_start) do update set count=rate_limits.count+1 returning count into n;
 if n>max_count then raise exception 'Please slow down and try again in a minute.'; end if;
end $$;
create function app_private.check_content(body text) returns void language plpgsql as $$ begin
 if body ~* '(sell|share|rent|buy|selling|sharing|renting).{0,25}(account|credentials)|\m(password|paid rental|rent per day|daily rental)\M' then raise exception 'Account access and paid rental solicitation are not allowed. Physical games only.'; end if;
end $$;
create function app_private.notify(recipient uuid,notification_text text,notification_target text) returns void language sql security definer set search_path=public,pg_temp as $$ insert into public.outbox(user_id,text,target) select recipient,notification_text,notification_target where recipient<>auth.uid() $$;

-- RLS is for every read, including direct API and Realtime reads. No client writes.
do $$ declare t text;begin
 foreach t in array array['community','memberships','profiles','invites','posts','images','comments','connections','blocks','shelf','conversations','messages','cursors','notifications','outbox','reports','moderation','outcomes'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 if t not in ('invites','outbox') then execute format('grant select on public.%I to authenticated',t);end if;
 end loop;
end $$;
create policy community_read on public.community for select to authenticated using(app_private.active());
create policy membership_self on public.memberships for select to authenticated using(id=auth.uid() and app_private.active());
create policy profiles_read on public.profiles for select to authenticated using(app_private.visible(id));
create policy posts_read on public.posts for select to authenticated using(app_private.visible(owner_id));
create policy images_read on public.images for select to authenticated using(app_private.visible(owner_id) and exists(select 1 from public.posts where id=post_id));
create policy comments_read on public.comments for select to authenticated using(app_private.visible(author_id) and exists(select 1 from public.posts where id=post_id));
create policy connections_read on public.connections for select to authenticated using(app_private.visible(from_id) and app_private.visible(to_id) and (status='accepted' or auth.uid() in (from_id,to_id)));
create policy blocks_self on public.blocks for select to authenticated using(from_id=auth.uid() and app_private.active());
create policy shelf_read on public.shelf for select to authenticated using(app_private.visible(owner_id));
create policy conversations_read on public.conversations for select to authenticated using(app_private.participant(id));
create policy messages_read on public.messages for select to authenticated using(app_private.participant(conversation_id));
create policy cursors_self on public.cursors for select to authenticated using(user_id=auth.uid() and app_private.active());
create policy notifications_self on public.notifications for select to authenticated using(user_id=auth.uid() and app_private.active());
create policy reports_read on public.reports for select to authenticated using(app_private.active() and (reporter_id=auth.uid() or app_private.admin()));
create policy moderation_admin on public.moderation for select to authenticated using(app_private.admin());
create policy outcomes_self on public.outcomes for select to authenticated using(user_id=auth.uid() and app_private.active());

create function public.redeem_invite(token text,display_name text,neighbourhood text,adult boolean,rules boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare invitation public.invites; actor uuid:=auth.uid(); email_address text;
begin
 if actor is null or adult is distinct from true or rules is distinct from true then raise exception 'Verified sign-in and acceptance are required.';end if;
 select email into email_address from auth.users where id=actor and email_confirmed_at is not null;
 if email_address is null then raise exception 'Verify your email first.';end if;
 perform app_private.throttle('join',10);
 select * into invitation from public.invites where token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and lower(email)=lower(email_address) and used_at is null and not revoked and expires_at>now() for update;
 if invitation.id is null then raise exception 'This invitation is invalid, expired, or belongs to another email.';end if;
 insert into public.memberships(id) values(actor);
 insert into public.profiles(id,name,area) values(actor,trim(display_name),trim(neighbourhood));
 update public.invites set used_at=now() where id=invitation.id;
end $$;

create function public.app_command(command jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); op text:=command->>'type'; new_id uuid:=gen_random_uuid(); target uuid; other uuid; actor_name text;
 p public.posts; c public.comments; con public.connections; thread public.conversations; msg public.messages; r public.reports; token text; evidence text; subject uuid;
begin
 if not app_private.active(actor) then raise exception 'An active community membership is required.';end if;
 -- Serialize commands per member; pair advisory locks below protect cross-member races.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 perform app_private.throttle('all',90);
 perform app_private.throttle(op,case when op in ('conversation.start','invite.create','report','post.create') then 10 else 60 end);
 select name into actor_name from public.profiles where id=actor;
 target=nullif(command->>'id','')::uuid; other=nullif(command->>'user_id','')::uuid;
 if op in ('connection.request','block','conversation.start') then
 if other=actor or not app_private.active(other) or app_private.blocked(actor,other) then raise exception 'This member is unavailable.';end if;
 perform pg_advisory_xact_lock(hashtextextended(least(actor,other)::text||greatest(actor,other)::text,1));
 end if;
 if op in ('invite.create','invite.revoke','moderate') and not app_private.admin() then raise exception 'Administrator MFA is required.';end if;
 if op in ('post.status','post.delete') then select * into p from public.posts where id=target and owner_id=actor for update;if p.id is null then raise exception 'Post not found.';end if;end if;
 if op in ('message.send','conversation.respond','conversation.read','outcome') then
 select * into thread from public.conversations where id=coalesce(nullif(command->>'conversation_id','')::uuid,target) for update;
 if thread.id is null or actor not in (thread.from_id,thread.to_id) or app_private.blocked(thread.from_id,thread.to_id) or not app_private.active(thread.from_id) or not app_private.active(thread.to_id) then raise exception 'Conversation unavailable.';end if;
 end if;
 case op
 when 'post.create' then
 perform app_private.check_content((command->>'title')||' '||(command->>'description'));
 insert into public.posts(id,owner_id,title,platform,generation,format,kind,condition,area,description,price,drive_required,download_required,code_required,art)
 values(new_id,actor,trim(command->>'title'),command->>'platform',command->>'generation',command->>'format',command->>'kind',command->>'condition',trim(command->>'area'),trim(command->>'description'),(command->>'price')::numeric,command->>'format'='Disc',command->>'format'='Game-key card' or (command->>'download_required')::boolean,(command->>'code_required')::boolean,case command->>'platform' when 'Nintendo' then 'forest' when 'Xbox' then 'racing' else 'ice' end);
 when 'post.status' then update public.posts set status=command->>'status' where id=target;
 when 'post.delete' then delete from public.posts where id=target;
 when 'comment.add' then
 select * into p from public.posts where id=(command->>'post_id')::uuid;
 if p.id is null or not app_private.visible(p.owner_id) or p.status<>'open' then raise exception 'This post is unavailable.';end if;
 if command->>'parent_id' is not null then select * into c from public.comments where id=(command->>'parent_id')::uuid and post_id=p.id and parent_id is null;if c.id is null or not app_private.visible(c.author_id) then raise exception 'Reply to a top-level comment on this post.';end if;end if;
 perform app_private.check_content(command->>'body');
 insert into public.comments(id,post_id,author_id,parent_id,body) values(new_id,p.id,actor,(command->>'parent_id')::uuid,trim(command->>'body'));
 perform app_private.notify(p.owner_id,actor_name||' commented on '||p.title,'post:'||p.id);
 if c.id is not null and c.author_id<>p.owner_id then perform app_private.notify(c.author_id,actor_name||' replied to your comment','post:'||p.id);end if;
 when 'comment.edit' then
 perform app_private.check_content(command->>'body');update public.comments set body=trim(command->>'body'),edited_at=now() where id=target and author_id=actor;if not found then raise exception 'Comment not found.';end if;
 when 'comment.delete' then delete from public.comments where id=target and author_id=actor;if not found then raise exception 'Comment not found.';end if;
 when 'profile.update' then update public.profiles set name=trim(command->>'name'),bio=coalesce(command->>'bio',''),area=trim(command->>'area'),consoles=array(select jsonb_array_elements_text(command->'consoles')),genres=array(select jsonb_array_elements_text(command->'genres')),handle=coalesce(command->>'handle',''),avatar=command->>'avatar' where id=actor;
 when 'connection.request' then
 insert into public.connections(id,from_id,to_id) values(new_id,actor,other);
 perform app_private.notify(other,actor_name||' sent you a connection request','people');
 when 'connection.respond' then
 select * into con from public.connections where id=target and to_id=actor and status='pending' for update;
 if con.id is null or app_private.blocked(con.from_id,con.to_id) or not app_private.active(con.from_id) then raise exception 'Request unavailable.';end if;
 if (command->>'accept')::boolean then update public.connections set status='accepted' where id=target;perform app_private.notify(con.from_id,actor_name||' accepted your connection','people');else delete from public.connections where id=target;end if;
 when 'connection.remove' then delete from public.connections where id=target and actor in(from_id,to_id);
 when 'block' then insert into public.blocks(from_id,to_id) values(actor,other) on conflict do nothing;delete from public.connections where least(from_id,to_id)=least(actor,other) and greatest(from_id,to_id)=greatest(actor,other);
 when 'unblock' then delete from public.blocks where from_id=actor and to_id=other;
 when 'shelf.add' then insert into public.shelf(id,owner_id,title,platform,kind) values(new_id,actor,trim(command->>'title'),command->>'platform',command->>'kind');
 when 'shelf.remove' then delete from public.shelf where id=target and owner_id=actor;
 when 'conversation.start' then
 select * into thread from public.conversations where least(from_id,to_id)=least(actor,other) and greatest(from_id,to_id)=greatest(actor,other);
 if thread.id is not null then return jsonb_build_object('id',thread.id);end if;
 if command->>'post_id' is not null and not exists(select 1 from public.posts where id=(command->>'post_id')::uuid and owner_id=other and status='open') then raise exception 'This listing is unavailable.';end if;
 perform app_private.check_content(command->>'body');
 insert into public.conversations(id,from_id,to_id,post_id,status) values(new_id,actor,other,(command->>'post_id')::uuid,case when exists(select 1 from public.connections where least(from_id,to_id)=least(actor,other) and greatest(from_id,to_id)=greatest(actor,other) and status='accepted') then 'active' else 'pending' end);
 insert into public.messages(id,conversation_id,sender_id,body) values((command->>'message_id')::uuid,new_id,actor,trim(command->>'body'));
 perform app_private.notify(other,actor_name||' sent you a message','chat:'||new_id);
 when 'conversation.respond' then
 if thread.to_id<>actor or thread.status<>'pending' then raise exception 'Only the recipient can answer this request.';end if;
 update public.conversations set status=case when (command->>'accept')::boolean then 'active' else 'declined' end where id=thread.id;
 when 'message.send' then
 if thread.status<>'active' then raise exception 'Wait for this message request to be accepted.';end if;
 perform app_private.check_content(command->>'body');
 select * into msg from public.messages where id=(command->>'message_id')::uuid;
 if msg.id is not null then if msg.sender_id<>actor or msg.conversation_id<>thread.id then raise exception 'Message identifier is already in use.';end if;return jsonb_build_object('id',msg.id);end if;
 insert into public.messages(id,conversation_id,sender_id,body) values((command->>'message_id')::uuid,thread.id,actor,trim(command->>'body'));
 perform app_private.notify(case when thread.from_id=actor then thread.to_id else thread.from_id end,actor_name||' sent you a message','chat:'||thread.id);
 new_id=(command->>'message_id')::uuid;
 when 'conversation.read' then insert into public.cursors(user_id,conversation_id) values(actor,thread.id) on conflict(user_id,conversation_id) do update set read_at=now();
 when 'notification.read' then update public.notifications set read=true where id=target and user_id=actor;
 when 'report' then
 subject=null;
 case command->>'target_type'
 when 'post' then select title||E'\n'||description,owner_id into evidence,subject from public.posts where id=(command->>'target_id')::uuid and app_private.visible(owner_id);
 when 'comment' then select body,author_id into evidence,subject from public.comments where id=(command->>'target_id')::uuid and app_private.visible(author_id) and exists(select 1 from public.posts where id=post_id and app_private.visible(owner_id));
 when 'profile' then select name||E'\n'||bio,id into evidence,subject from public.profiles where id=(command->>'target_id')::uuid and app_private.visible(id);
 when 'message' then select body,sender_id into evidence,subject from public.messages where id=(command->>'target_id')::uuid and app_private.participant(conversation_id);
 else raise exception 'Invalid report target.';end case;
 if subject is null then raise exception 'Content not found.';end if;
 insert into public.reports(id,reporter_id,target_type,target_id,reason,evidence,subject_id) values(new_id,actor,command->>'target_type',(command->>'target_id')::uuid,trim(command->>'reason'),evidence,subject);
 when 'moderate' then
 select * into r from public.reports where id=(command->>'report_id')::uuid and status='open' for update;if r.id is null then raise exception 'Open report not found.';end if;
 if command->>'action'='suspend' then if r.subject_id=actor then raise exception 'Cannot suspend yourself.';end if;update public.memberships set status='suspended' where id=r.subject_id;
 elsif command->>'action'='remove' then
 case r.target_type when 'post' then delete from public.posts where id=r.target_id;when 'comment' then delete from public.comments where id=r.target_id;when 'message' then delete from public.messages where id=r.target_id;when 'profile' then update public.profiles set name='Community member',bio='',handle='' where id=r.target_id;end case;
 elsif command->>'action'<>'dismiss' then raise exception 'Invalid moderation action.';end if;
 update public.reports set status='resolved',resolved_at=now() where id=r.id;
 insert into public.moderation(admin_id,report_id,action,note) values(actor,r.id,command->>'action',trim(command->>'note'));
 when 'outcome' then
 if thread.status<>'active' or thread.post_id is null then raise exception 'Outcomes require an accepted listing conversation.';end if;
 insert into public.outcomes(conversation_id,user_id,exchanged) values(thread.id,actor,(command->>'exchanged')::boolean) on conflict(conversation_id,user_id) do update set exchanged=excluded.exchanged,created_at=now();
 when 'invite.create' then
 if (command->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email address.';end if;
 token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into public.invites(id,email,token_hash) values(new_id,lower(command->>'email'),encode(sha256(convert_to(token,'UTF8')),'hex'));
 return jsonb_build_object('id',new_id,'token',token);
 when 'invite.revoke' then update public.invites set revoked=true where id=target;
 when 'account.delete' then
 if command->>'confirmation' is distinct from 'DELETE' then raise exception 'Type DELETE to confirm.';end if;
 if exists(select 1 from public.memberships where id=actor and role='admin') and (select count(*) from public.memberships where role='admin' and status='active')<=1 then raise exception 'Transfer administration before deleting the last administrator.';end if;
 insert into app_private.deletions(user_id) values(actor) on conflict do nothing;
 delete from public.memberships where id=actor;
 else raise exception 'Unknown action.';
 end case;
 return jsonb_build_object('id',new_id);
end $$;

create function public.admin_invites() returns jsonb language sql stable security definer set search_path=public,pg_temp as $$ select coalesce(jsonb_agg(to_jsonb(i)-'token_hash'),'[]') from public.invites i where app_private.admin() $$;
create function public.flush_outbox() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare e public.outbox;begin
 if not app_private.active() and current_user<>'service_role' and coalesce(auth.jwt()->>'role','')<>'service_role' then return;end if;
 for e in select * from public.outbox where delivered_at is null order by created_at limit 500 for update skip locked loop
 insert into public.notifications(id,user_id,text,target,created_at) values(e.id,e.user_id,e.text,e.target,e.created_at) on conflict(id) do nothing;
 update public.outbox set delivered_at=now() where id=e.id;
 end loop;
end $$;
create function public.app_snapshot() returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare result jsonb; t text; part jsonb;begin
 if not app_private.active() then raise exception 'An active community membership is required.';end if;
 select jsonb_build_object('community',jsonb_build_object('name',name,'city',city),'invites',public.admin_invites()) into result from public.community;
 foreach t in array array['profiles','memberships','posts','images','comments','connections','blocks','shelf','conversations','messages','cursors','notifications','reports','moderation','outcomes'] loop
 execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from public.%I x',t) into part;
 result=result||jsonb_build_object(t,part);
 end loop;
 return result;
end $$;

-- Only expose the explicitly supported RPC surface.
revoke all on all functions in schema app_private from public,anon,authenticated;
grant execute on function app_private.active(uuid),app_private.admin(),app_private.visible(uuid),app_private.participant(uuid),app_private.blocked(uuid,uuid) to authenticated;
revoke all on function public.redeem_invite(text,text,text,boolean,boolean),public.app_command(jsonb),public.admin_invites(),public.flush_outbox(),public.app_snapshot() from public,anon;
grant execute on function public.redeem_invite(text,text,text,boolean,boolean),public.app_command(jsonb),public.admin_invites(),public.flush_outbox(),public.app_snapshot() to authenticated;
