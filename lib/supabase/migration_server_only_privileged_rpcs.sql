create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

do $$
declare
  r record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for r in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname in ('public', 'storage')
      and (
        qual like '%public.is_admin()%'
        or with_check like '%public.is_admin()%'
        or (
          qual like '%is_admin()%'
          and qual not like '%private.is_admin()%'
        )
        or (
          with_check like '%is_admin()%'
          and with_check not like '%private.is_admin()%'
        )
      )
  loop
    new_qual := replace(replace(r.qual, 'public.is_admin()', 'private.is_admin()'), '(is_admin())', '(private.is_admin())');
    new_check := replace(replace(r.with_check, 'public.is_admin()', 'private.is_admin()'), '(is_admin())', '(private.is_admin())');

    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);

    if r.cmd in ('SELECT', 'DELETE') then
      stmt := stmt || format(' using (%s)', new_qual);
    elsif r.cmd = 'INSERT' then
      stmt := stmt || format(' with check (%s)', new_check);
    elsif r.cmd = 'UPDATE' then
      stmt := stmt || format(' using (%s)', new_qual);
      if new_check is not null then
        stmt := stmt || format(' with check (%s)', new_check);
      end if;
    else
      if new_qual is not null then
        stmt := stmt || format(' using (%s)', new_qual);
      end if;
      if new_check is not null then
        stmt := stmt || format(' with check (%s)', new_check);
      end if;
    end if;

    execute stmt;
  end loop;
end $$;

create or replace function public.server_admin_save_product(
  p_actor_id uuid,
  p_actor_email text,
  p_product_id uuid,
  p_product jsonb
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return public.admin_save_product(p_product_id, p_product);
end;
$$;

create or replace function public.server_admin_set_product_active(
  p_actor_id uuid,
  p_actor_email text,
  p_product_id uuid,
  p_is_active boolean
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return public.admin_set_product_active(p_product_id, p_is_active);
end;
$$;

create or replace function public.server_admin_delete_product(
  p_actor_id uuid,
  p_actor_email text,
  p_product_id uuid
)
returns public.products
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return public.admin_delete_product(p_product_id);
end;
$$;

create or replace function public.server_admin_update_order_status(
  p_actor_id uuid,
  p_actor_email text,
  p_order_id uuid,
  p_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return public.admin_update_order_status(p_order_id, p_status);
end;
$$;

create or replace function public.server_admin_update_payment_status(
  p_actor_id uuid,
  p_actor_email text,
  p_order_id uuid,
  p_payment_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return public.admin_update_payment_status(p_order_id, p_payment_status);
end;
$$;

create or replace function public.server_get_customer_summaries(
  p_actor_id uuid,
  p_actor_email text,
  p_page integer default 1,
  p_page_size integer default 20,
  p_search text default '',
  p_filter text default 'all',
  p_sort text default 'newest'
)
returns table(
  id uuid,
  email text,
  full_name text,
  phone text,
  role text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  total_orders bigint,
  total_spent numeric,
  last_order_date timestamp with time zone,
  latest_status text,
  latest_customer_name text,
  latest_phone text,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return query
  select * from public.get_customer_summaries(p_page, p_page_size, p_search, p_filter, p_sort);
end;
$$;

create or replace function public.server_place_order(
  p_actor_id uuid,
  p_actor_email text,
  p_customer_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_payment_method text,
  p_payment_account_name text,
  p_payment_phone text,
  p_payment_account_number text,
  p_payment_screenshot_url text,
  p_items jsonb
)
returns table(
  id uuid,
  order_number text,
  customer_name text,
  phone text,
  total numeric,
  payment_method text,
  payment_status text,
  status text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_actor_id::text,
      'email', coalesce(p_actor_email, ''),
      'role', 'authenticated'
    )::text,
    true
  );

  return query
  select * from public.place_order(
    p_customer_name,
    p_phone,
    p_address,
    p_city,
    p_payment_method,
    p_payment_account_name,
    p_payment_phone,
    p_payment_account_number,
    p_payment_screenshot_url,
    p_items
  );
end;
$$;

revoke all on function public.server_admin_save_product(uuid, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.server_admin_set_product_active(uuid, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.server_admin_delete_product(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.server_admin_update_order_status(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.server_admin_update_payment_status(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.server_get_customer_summaries(uuid, text, integer, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.server_place_order(uuid, text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.server_admin_save_product(uuid, text, uuid, jsonb) to service_role;
grant execute on function public.server_admin_set_product_active(uuid, text, uuid, boolean) to service_role;
grant execute on function public.server_admin_delete_product(uuid, text, uuid) to service_role;
grant execute on function public.server_admin_update_order_status(uuid, text, uuid, text) to service_role;
grant execute on function public.server_admin_update_payment_status(uuid, text, uuid, text) to service_role;
grant execute on function public.server_get_customer_summaries(uuid, text, integer, integer, text, text, text) to service_role;
grant execute on function public.server_place_order(uuid, text, text, text, text, text, text, text, text, text, text, jsonb) to service_role;

revoke execute on function public.admin_delete_product(uuid) from authenticated;
revoke execute on function public.admin_save_product(uuid, jsonb) from authenticated;
revoke execute on function public.admin_set_product_active(uuid, boolean) from authenticated;
revoke execute on function public.admin_update_order_status(uuid, text) from authenticated;
revoke execute on function public.admin_update_payment_status(uuid, text) from authenticated;
revoke execute on function public.get_customer_summaries(integer, integer, text, text, text) from authenticated;
revoke execute on function public.place_order(text, text, text, text, text, text, text, text, text, jsonb) from authenticated;
revoke execute on function public.is_admin() from authenticated;
