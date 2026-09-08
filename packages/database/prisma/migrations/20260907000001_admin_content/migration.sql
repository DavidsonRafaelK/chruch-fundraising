-- Admin-managed content, coupons and role hierarchy.
-- Additive only: no existing table is dropped and no row is deleted.

-- ---------------------------------------------------------------------------
-- 1. Role hierarchy: root sits above admin.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('root', 'admin'));

-- is_admin() stays "has a profile at all", so root passes every admin check.
CREATE OR REPLACE FUNCTION public.is_root()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'root'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Hero banners
-- ---------------------------------------------------------------------------
CREATE TABLE public.banners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL CHECK (char_length(title) <= 200),
  subtitle    text CHECK (subtitle IS NULL OR char_length(subtitle) <= 500),
  image_url   text NOT NULL CHECK (char_length(image_url) <= 2000),
  link_url    text CHECK (link_url IS NULL OR char_length(link_url) <= 2000),
  link_label  text CHECK (link_label IS NULL OR char_length(link_label) <= 100),
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT banners_date_range CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
  )
);

CREATE INDEX idx_banners_active ON public.banners (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 3. Coupons (order-total scope)
-- ---------------------------------------------------------------------------
CREATE TABLE public.coupons (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE
                        CHECK (char_length(code) BETWEEN 3 AND 50 AND code = upper(code)),
  description         text CHECK (description IS NULL OR char_length(description) <= 300),
  discount_type       text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value      numeric(12, 2) NOT NULL CHECK (discount_value > 0),
  max_discount_amount numeric(12, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount >= 0),
  min_order_amount    numeric(12, 2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
  usage_limit         integer CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count          integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  starts_at           timestamptz,
  ends_at             timestamptz,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_percent_range CHECK (
    discount_type <> 'percent' OR discount_value <= 100
  ),
  CONSTRAINT coupons_date_range CHECK (
    starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
  )
);

CREATE INDEX idx_coupons_active ON public.coupons (is_active, ends_at);

-- ---------------------------------------------------------------------------
-- 4. Order totals now carry the discount breakdown
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN subtotal_amount numeric(12, 2),
  ADD COLUMN discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN coupon_code     text;

UPDATE public.orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN subtotal_amount SET NOT NULL,
  ADD CONSTRAINT orders_subtotal_amount_check CHECK (subtotal_amount >= 0),
  ADD CONSTRAINT orders_discount_amount_check CHECK (discount_amount >= 0),
  ADD CONSTRAINT orders_total_math CHECK (total_amount = subtotal_amount - discount_amount);

-- New money columns are as immutable as the ones already frozen after creation.
CREATE OR REPLACE FUNCTION public.enforce_order_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
begin
  if new.order_number    is distinct from old.order_number
  or new.customer_name   is distinct from old.customer_name
  or new.customer_phone  is distinct from old.customer_phone
  or new.total_amount    is distinct from old.total_amount
  or new.subtotal_amount is distinct from old.subtotal_amount
  or new.discount_amount is distinct from old.discount_amount
  or new.coupon_code     is distinct from old.coupon_code
  or new.created_at      is distinct from old.created_at then
    raise exception 'This field cannot be modified after order creation';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending'   and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('ready', 'cancelled'))     or
      (old.status = 'ready'     and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'Invalid status transition from % to %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Free-form site content (hero copy, contact details, opening hours)
-- ---------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  key        text PRIMARY KEY CHECK (char_length(key) <= 100),
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- 6. Audit trail (root-only surface)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_label text,
  action      text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity      text NOT NULL CHECK (char_length(entity) <= 50),
  entity_id   text CHECK (entity_id IS NULL OR char_length(entity_id) <= 100),
  summary     text CHECK (summary IS NULL OR char_length(summary) <= 500),
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs (entity, entity_id);

-- ---------------------------------------------------------------------------
-- 7. updated_at triggers for the new tables
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_banners_updated_at BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. RLS, matching the existing tables' style
-- ---------------------------------------------------------------------------
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Storefront reads banners that are live right now.
CREATE POLICY "public reads active banners" ON public.banners
  FOR SELECT USING (
    is_admin() OR (
      is_active
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at   IS NULL OR ends_at   >  now())
    )
  );
CREATE POLICY "admins manage banners" ON public.banners
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Coupon codes are never public: redemption goes through the backend only.
CREATE POLICY "admins manage coupons" ON public.coupons
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "public reads site settings" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "admins manage site settings" ON public.site_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Only root inspects the audit trail.
CREATE POLICY "root reads audit logs" ON public.audit_logs
  FOR SELECT USING (is_root());
