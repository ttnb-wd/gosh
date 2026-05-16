-- Run this in Supabase SQL Editor to restore stock only once for full-size items
-- when an admin changes an order status to Cancelled.

alter table public.orders
add column if not exists stock_restored boolean not null default false;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_order public.orders;
  updated_order public.orders;
  actor_email text;
  uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if public.is_admin() is not true then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_status not in ('Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled') then
    raise exception 'Invalid order status.' using errcode = '22000';
  end if;

  select *
  into previous_order
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.' using errcode = '22000';
  end if;

  if previous_order.status is distinct from p_status then
    if p_status = 'Cancelled'
      and previous_order.status <> 'Cancelled'
      and coalesce(previous_order.stock_restored, false) = false then
      update public.products as product
      set
        stock = product.stock + restored.quantity,
        updated_at = now()
      from (
        select
          order_items.product_id::uuid as product_id,
          sum(order_items.quantity)::integer as quantity
        from public.order_items
        where order_items.order_id = previous_order.id
          and order_items.product_id ~* uuid_pattern
          and (
            nullif(trim(coalesce(order_items.selected_size, '')), '') is null
            or lower(trim(order_items.selected_size)) in ('full size', 'full_size')
          )
        group by order_items.product_id
      ) as restored
      where product.id = restored.product_id;
    end if;
  end if;

  update public.orders
  set
    status = p_status,
    stock_restored = case
      when p_status = 'Cancelled'
        and previous_order.status <> 'Cancelled'
        and coalesce(previous_order.stock_restored, false) = false
      then true
      else orders.stock_restored
    end,
    updated_at = now()
  where orders.id = p_order_id
  returning * into updated_order;

  if previous_order.status is distinct from updated_order.status then
    actor_email := lower(nullif(trim(coalesce(auth.jwt() ->> 'email', '')), ''));

    insert into public.admin_audit_logs (
      actor_id,
      actor_email,
      action,
      entity_type,
      entity_id,
      entity_label,
      before_data,
      after_data,
      metadata
    )
    values (
      auth.uid(),
      actor_email,
      'order_status_changed',
      'order',
      updated_order.id::text,
      updated_order.order_number,
      jsonb_build_object('status', previous_order.status),
      jsonb_build_object('status', updated_order.status),
      jsonb_build_object(
        'customer_name', updated_order.customer_name,
        'customer_email', updated_order.customer_email,
        'total', updated_order.total
      )
    );
  end if;

  return updated_order;
end;
$$;

grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
