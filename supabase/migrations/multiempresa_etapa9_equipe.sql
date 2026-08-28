-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 9
-- EQUIPE / USUÁRIOS DA EMPRESA
-- =========================================================

-- ---------------------------------------------------------
-- 1. USUÁRIO ATIVO / DESATIVADO
-- ---------------------------------------------------------

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;


-- ---------------------------------------------------------
-- 2. GARANTIR ROLES VÁLIDAS
-- ---------------------------------------------------------

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (
  role IN ('admin', 'funcionario')
);


-- ---------------------------------------------------------
-- 3. FUNÇÃO PARA DESCOBRIR O ROLE DO USUÁRIO LOGADO
-- ---------------------------------------------------------

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
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.current_user_role()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.current_user_role()
TO authenticated;


-- ---------------------------------------------------------
-- 4. REMOVER POLICIES ANTIGAS DE PROFILES
-- ---------------------------------------------------------

DROP POLICY IF EXISTS profiles_own_select
ON public.profiles;

DROP POLICY IF EXISTS profiles_own_update
ON public.profiles;

DROP POLICY IF EXISTS profiles_organization_select
ON public.profiles;


-- ---------------------------------------------------------
-- 5. QUALQUER USUÁRIO PODE VER O PRÓPRIO PERFIL
--    ADMIN TAMBÉM PODE VER A EQUIPE DA PRÓPRIA EMPRESA
-- ---------------------------------------------------------

CREATE POLICY profiles_organization_select
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()

  OR (

    public.current_user_role() = 'admin'

    AND organization_id =
      public.current_organization_id()

  )
);


-- ---------------------------------------------------------
-- 6. USUÁRIO PODE ATUALIZAR O PRÓPRIO PERFIL
-- ---------------------------------------------------------

CREATE POLICY profiles_own_update
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);


-- ---------------------------------------------------------
-- OBSERVAÇÃO
-- ---------------------------------------------------------
--
-- NÃO criamos INSERT / DELETE de profiles pelo frontend.
--
-- A criação e administração de funcionários será feita
-- por uma Supabase Edge Function usando Service Role.
--
-- organization_id e role continuarão protegidos pelo
-- trigger protect_profile_security_fields().
--
-- =========================================================