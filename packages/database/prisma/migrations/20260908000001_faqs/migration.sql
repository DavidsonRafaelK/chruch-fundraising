-- Admin-managed FAQ entries for the storefront.

CREATE TABLE public.faqs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL CHECK (char_length(question) <= 300),
  answer     text NOT NULL CHECK (char_length(answer) <= 5000),
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_faqs_active ON public.faqs (is_active, sort_order);

CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Same shape as banners: the storefront reads what is published, admins
-- manage everything. Prisma bypasses RLS, so these only bind the anon key.
CREATE POLICY "public reads active faqs" ON public.faqs
  FOR SELECT USING (is_active OR is_admin());
CREATE POLICY "admins manage faqs" ON public.faqs
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
