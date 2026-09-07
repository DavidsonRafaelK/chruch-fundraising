-- =========================================================
-- Pre-order App — Initial Schema Migration (v2, hardened)
-- Run via: supabase db push
-- (or paste into Supabase Dashboard > SQL Editor)
-- =========================================================

-- ---------------------------------------------------------
-- 1. PROFILES (admin identification)
-- Linked 1:1 to auth.users. Only rows that exist here are admins.
-- role kept for future extensibility, but currently only 'admin'
-- is meaningful — no tiered permissions yet.
-- ---------------------------------------------------------
create table public.profiles (
                                 id uuid primary key references auth.users(id) on delete cascade,
                                 full_name text not null,
                                 role text not null default 'admin' check (role in ('admin')),
                                 created_at timestamptz not null default now()
);

-- Bootstrap note: profiles are never self-created by users (no signup
-- flow inserts into this table). To make someone an admin:
--   1. Create their auth user via Supabase Dashboard > Authentication > Add User
--      (or supabase.auth.admin.createUser)
--   2. Run:
--        insert into public.profiles (id, full_name)
--        values ('<uuid-from-step-1>', 'Admin Name');

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
select exists (
    select 1 from public.profiles where id = auth.uid()
);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------
-- 2. CATEGORIES (admin-managed, not hardcoded)
-- has_ingredients controls whether the ingredients field shows
-- for products in that category — replaces the old food/merch check.
-- ---------------------------------------------------------
create table public.categories (
                                   id uuid primary key default gen_random_uuid(),
                                   name text not null unique check (char_length(name) <= 100),
                                   has_ingredients boolean not null default false,
                                   sort_order integer not null default 0,
                                   created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 3. PRODUCTS
-- Images are fixed slots (cover + 2 more) as plain columns —
-- simpler than a join table for a small fixed cap, and matches
-- the "Photo 1 / Photo 2 / Photo 3" admin form UX.
-- ---------------------------------------------------------
create table public.products (
                                 id uuid primary key default gen_random_uuid(),
                                 title text not null check (char_length(title) <= 200),
                                 short_description text not null check (char_length(short_description) <= 300),
                                 long_description text check (long_description is null or char_length(long_description) <= 5000),
                                 ingredients text check (ingredients is null or char_length(ingredients) <= 2000),  -- only meaningful when category.has_ingredients = true
                                 category_id uuid not null references public.categories(id),
                                 price numeric(12,2) not null check (price >= 0),
                                 is_available boolean not null default true,
                                 image_url text not null,                   -- cover image, required
                                 image_url_2 text,                          -- optional
                                 image_url_3 text,                          -- optional
                                 created_at timestamptz not null default now(),
                                 updated_at timestamptz not null default now()
);

create index idx_products_category on public.products (category_id);
create index idx_products_available on public.products (is_available);

-- ---------------------------------------------------------
-- 4. ORDERS
-- ---------------------------------------------------------
create sequence public.order_number_seq start 1;

create table public.orders (
                               id uuid primary key default gen_random_uuid(),
                               order_number text not null unique,
                               customer_name text not null check (char_length(customer_name) <= 200),
                               customer_phone text not null check (char_length(customer_phone) <= 30),
                               customer_note text check (customer_note is null or char_length(customer_note) <= 1000),
                               status text not null default 'pending'
                                   check (status in ('pending', 'confirmed', 'ready', 'completed', 'cancelled')),
                               total_amount numeric(12,2) not null check (total_amount >= 0),
                               created_at timestamptz not null default now(),
                               updated_at timestamptz not null default now()
);

create index idx_orders_status on public.orders (status);
create index idx_orders_created_at on public.orders (created_at desc);

-- ---------------------------------------------------------
-- 5. ORDER ITEMS
-- ---------------------------------------------------------
create table public.order_items (
                                    id uuid primary key default gen_random_uuid(),
                                    order_id uuid not null references public.orders(id) on delete cascade,
                                    product_id uuid references public.products(id) on delete set null,
                                    product_name_snapshot text not null,
                                    unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
                                    quantity integer not null check (quantity > 0),
                                    subtotal numeric(12,2) not null check (subtotal >= 0)
);

create index idx_order_items_order on public.order_items (order_id);

-- ---------------------------------------------------------
-- 6. updated_at AUTO-TOUCH TRIGGER
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
return new;
end;
$$;

create trigger trg_products_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 7. ORDER UPDATE GUARD
-- Admins can change status/customer_note, but not financial or
-- identity fields — and status can only move through valid
-- transitions. This closes the "admin could set total_amount = 1"
-- gap, without needing a separate RPC for status updates.
-- ---------------------------------------------------------
create or replace function public.enforce_order_update_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_number is distinct from old.order_number
     or new.customer_name is distinct from old.customer_name
     or new.customer_phone is distinct from old.customer_phone
     or new.total_amount is distinct from old.total_amount
     or new.created_at is distinct from old.created_at then
    raise exception 'This field cannot be modified after order creation';
end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending'   and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('ready', 'cancelled')) or
      (old.status = 'ready'     and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Invalid status transition from % to %', old.status, new.status;
end if;
end if;

return new;
end;
$$;

create trigger trg_orders_enforce_update
    before update on public.orders
    for each row execute function public.enforce_order_update_rules();

-- ---------------------------------------------------------
-- 8. create_order() — atomic order + items insert
-- Hardened: locked search_path, aggregates duplicate product_ids,
-- validates input, caps quantity, catches malformed JSON cleanly.
-- ---------------------------------------------------------
create or replace function public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_note text,
  p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
v_order public.orders;
  v_order_number text;
  v_total numeric(12,2) := 0;
  v_row record;
  v_product public.products;
  v_subtotal numeric(12,2);
begin
  if trim(coalesce(p_customer_name, '')) = '' then
    raise exception 'Customer name is required';
end if;

  if char_length(p_customer_name) > 200 then
    raise exception 'Customer name is too long (max 200 characters)';
end if;

  if trim(coalesce(p_customer_phone, '')) = '' then
    raise exception 'Customer phone is required';
end if;

  if char_length(p_customer_phone) > 30 then
    raise exception 'Customer phone is too long (max 30 characters)';
end if;

  if p_customer_note is not null and char_length(p_customer_note) > 1000 then
    raise exception 'Note is too long (max 1000 characters)';
end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Items must be a JSON array';
end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
end if;

  -- Cheap DB-level abuse guard: blocks accidental double-submits and naive
  -- spam scripts. Not a substitute for IP rate limiting + CAPTCHA at the
  -- application layer (see notes below) — this only catches same-phone bursts.
  if exists (
    select 1 from public.orders
    where customer_phone = trim(p_customer_phone)
      and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'Please wait a moment before placing another order';
end if;

  v_order_number := 'ORD-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

insert into public.orders (order_number, customer_name, customer_phone, customer_note, total_amount)
values (v_order_number, trim(p_customer_name), trim(p_customer_phone), p_customer_note, 0)
    returning * into v_order;

begin
for v_row in (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'quantity')::integer) as quantity
      from jsonb_array_elements(p_items) as item
      group by (item->>'product_id')::uuid
    )
    loop
      if v_row.quantity <= 0 then
        raise exception 'Quantity must be greater than zero';
end if;

      if v_row.quantity > 100 then
        raise exception 'Quantity exceeds maximum allowed per item (100)';
end if;

select * into v_product
from public.products
where id = v_row.product_id
  and is_available = true;

if not found then
        raise exception 'Product % is not available', v_row.product_id;
end if;

      v_subtotal := v_product.price * v_row.quantity;
      v_total := v_total + v_subtotal;

insert into public.order_items (
    order_id, product_id, product_name_snapshot, unit_price_snapshot, quantity, subtotal
) values (
             v_order.id, v_product.id, v_product.title, v_product.price, v_row.quantity, v_subtotal
         );
end loop;
exception
    when invalid_text_representation then
      raise exception 'Invalid item data: product_id or quantity is malformed';
end;

update public.orders set total_amount = v_total where id = v_order.id
    returning * into v_order;

return v_order;
end;
$$;

revoke all on function public.create_order(text, text, text, jsonb) from public;
grant execute on function public.create_order(text, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "users can read own profile"
  on public.profiles for select
                                    using (id = auth.uid());

create policy "public reads categories"
  on public.categories for select
                                      to anon, authenticated
                                      using (true);

create policy "admins manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public reads available products"
  on public.products for select
                                           to anon, authenticated
                                           using (is_available = true or public.is_admin());

create policy "admins manage products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- No insert/select policy for anon/authenticated on orders or
-- order_items — the only way in is create_order() (security
-- definer, bypasses RLS internally). Admins get select, and
-- update is handled by the enforce_order_update_rules trigger
-- above rather than column-level RLS (Postgres RLS can't do
-- column-level restrictions on its own).
create policy "admins read orders"
  on public.orders for select
                                         using (public.is_admin());

create policy "admins update orders"
  on public.orders for update
                                  using (public.is_admin())
                       with check (public.is_admin());

create policy "admins read order items"
  on public.order_items for select
                                       using (public.is_admin());

-- ---------------------------------------------------------
-- 10. STORAGE BUCKET + POLICIES (product images)
-- Table RLS above does NOT protect the actual image files —
-- Storage authorization is a separate system, governed by RLS
-- on storage.objects. Public bucket: anyone can read (needed for
-- the storefront to display images), only admins can write.
-- ---------------------------------------------------------
-- 5 MB / image-only. Upload is admin-only, so this is hardening rather than
-- a hole being closed: it stops a public, unbounded bucket from being usable
-- as arbitrary file hosting, and stops non-image files from being served
-- straight back to browsers from a public URL.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'product-images',
    'product-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
    on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads product images"
  on storage.objects for select
                                    to public
                                    using (bucket_id = 'product-images');

create policy "admins upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admins update product images"
  on storage.objects for update
                                           to authenticated
                                           using (bucket_id = 'product-images' and public.is_admin())
                         with check (bucket_id = 'product-images' and public.is_admin());

create policy "admins delete product images"
  on storage.objects for delete
to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------
-- 11. is_new COMPUTED COLUMN (PostgREST)
-- Exposes is_new = (created_at within 14 days) on `products` selects
-- (`select=*,is_new:products_is_new()`) so the catalog read layer never
-- has to compare Date.now() in JS against created_at — avoids clock-skew
-- and timezone drift between the app server and the database.
-- ---------------------------------------------------------
create or replace function public.products_is_new(p public.products)
returns boolean
language sql
stable
as $$
  select p.created_at > now() - interval '14 days'
$$;