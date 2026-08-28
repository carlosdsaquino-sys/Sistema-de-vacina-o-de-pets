-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 9B
-- BLOQUEIO REAL DE USUÁRIO DESATIVADO
-- =========================================================

-- Se o usuário estiver desativado, esta função retorna NULL.
-- Como as RLS das tabelas usam current_organization_id(),
-- ele perde acesso aos dados da empresa automaticamente.

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


-- =========================================================
-- ROLE SOMENTE PARA USUÁRIO ATIVO
-- =========================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
    AND p.ativo = true
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_user_role()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.current_user_role()
TO authenticated;