-- =========================================================
-- ETAPA 10
-- BLOQUEAR USUÁRIOS DESATIVADOS
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.ativo = true
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_organization_id()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.current_organization_id()
TO authenticated;   