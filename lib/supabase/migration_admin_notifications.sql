-- Create admin notifications table (order events only)
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  type text not null check (type in ('new_order', 'order_cancelled')),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create indexes for better performance
create index if not exists idx_admin_notifications_created_at
  on public.admin_notifications(created_at desc);

create index if not exists idx_admin_notifications_is_read
  on public.admin_notifications(is_read);

-- Enable RLS
alter table public.admin_notifications enable row level security;

-- Grant permissions
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.admin_notifications to authenticated;

-- Create is_admin function if it doesn't exist
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- RLS Policies
drop policy if exists "admins_can_read_notifications" on public.admin_notifications;
create policy "admins_can_read_notifications"
  on public.admin_notifications
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "admins_can_insert_notifications" on public.admin_notifications;
create policy "admins_can_insert_notifications"
  on public.admin_notifications
  for insert
  to authenticated
  with check (true);

drop policy if exists "admins_can_update_notifications" on public.admin_notifications;
create policy "admins_can_update_notifications"
  on public.admin_notifications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admins_can_delete_notifications" on public.admin_notifications;
create policy "admins_can_delete_notifications"
  on public.admin_notifications
  for delete
  to authenticated
  using (public.is_admin());
