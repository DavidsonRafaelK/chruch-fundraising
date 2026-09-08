-- Admin identity lives in Clerk, not in Supabase Auth.
--
-- profiles.id references auth.users, which Clerk never populates, so an audit
-- actor can never be a profiles row. Point the actor at the Clerk user id
-- instead. Both tables are still empty, so no data is rewritten.

ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_actor_id_fkey;
ALTER TABLE public.audit_logs
  ALTER COLUMN actor_id TYPE text USING actor_id::text;
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_actor_id_check
  CHECK (actor_id IS NULL OR char_length(actor_id) <= 100);

ALTER TABLE public.site_settings DROP CONSTRAINT site_settings_updated_by_fkey;
ALTER TABLE public.site_settings
  ALTER COLUMN updated_by TYPE text USING updated_by::text;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_updated_by_check
  CHECK (updated_by IS NULL OR char_length(updated_by) <= 100);
