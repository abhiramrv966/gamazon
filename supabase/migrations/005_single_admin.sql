-- Administration is assigned by the database operator, never by a member-facing command.
create unique index memberships_single_admin on public.memberships(role) where role='admin';
