CREATE TABLE IF NOT EXISTS public.admin_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.admin_access(user_id)
SELECT DISTINCT owner_id FROM public.store_settings
ON CONFLICT (user_id) DO NOTHING;
ALTER TABLE public.admin_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_access_self_select ON public.admin_access;
CREATE POLICY admin_access_self_select ON public.admin_access
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND enabled = true);
REVOKE ALL ON public.admin_access FROM anon, authenticated;
GRANT SELECT ON public.admin_access TO authenticated;
