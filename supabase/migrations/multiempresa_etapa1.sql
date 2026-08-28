-- =========================================================
-- PATAPASS - ETAPA 1 MULTIEMPRESA
-- Cria organizações e associa os dados atuais
-- =========================================================


-- =========================================================
-- 1. TABELA DE EMPRESAS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  nome text NOT NULL,

  ativo boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now()
);


-- =========================================================
-- 2. ADICIONAR organization_id AO PROFILE
--
-- Deixamos NULL permitido temporariamente porque depois
-- vamos adaptar o processo de criação de funcionários.
-- =========================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS organization_id uuid;


-- =========================================================
-- 3. ADICIONAR organization_id NAS TABELAS
-- =========================================================

ALTER TABLE public.tutors
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.vaccines
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.vaccine_batches
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.vaccine_applications
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.digital_booklets
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS organization_id uuid;


-- =========================================================
-- 4. FOREIGN KEY DO PROFILE
-- =========================================================

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_organization_id_fkey'
  ) THEN

    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE RESTRICT;

  END IF;

END;
$$;


-- =========================================================
-- 5. FOREIGN KEYS DAS TABELAS
-- =========================================================

DO $$
DECLARE
  tabela text;
  constraint_name text;
BEGIN

  FOREACH tabela IN ARRAY ARRAY[
    'tutors',
    'pets',
    'vaccines',
    'vaccine_batches',
    'appointments',
    'vaccine_applications',
    'stock_movements',
    'digital_booklets',
    'payments',
    'message_logs',
    'settings'
  ]

  LOOP

    constraint_name :=
      tabela || '_organization_id_fkey';

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = constraint_name
    ) THEN

      EXECUTE format(
        '
        ALTER TABLE public.%I
        ADD CONSTRAINT %I
        FOREIGN KEY (organization_id)
        REFERENCES public.organizations(id)
        ON DELETE RESTRICT
        ',
        tabela,
        constraint_name
      );

    END IF;

  END LOOP;

END;
$$;


-- =========================================================
-- 6. CRIAR A PRIMEIRA EMPRESA
--
-- Usa o nome atual configurado na tabela settings.
-- =========================================================

DO $$
DECLARE
  v_org_id uuid;
  v_nome_empresa text;
BEGIN

  -- Procura organização já existente
  SELECT id
  INTO v_org_id
  FROM public.organizations
  ORDER BY created_at
  LIMIT 1;


  -- Se ainda não existir, cria
  IF v_org_id IS NULL THEN

    SELECT nome_farmacia
    INTO v_nome_empresa
    FROM public.settings
    ORDER BY created_at
    LIMIT 1;


    INSERT INTO public.organizations (
      nome
    )
    VALUES (
      COALESCE(
        NULLIF(
          trim(v_nome_empresa),
          ''
        ),
        'Minha Empresa'
      )
    )
    RETURNING id
    INTO v_org_id;

  END IF;


  -- =======================================================
  -- 7. ASSOCIAR USUÁRIOS EXISTENTES
  -- =======================================================

  UPDATE public.profiles
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  -- =======================================================
  -- 8. ASSOCIAR DADOS EXISTENTES
  -- =======================================================

  UPDATE public.tutors
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.pets
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.vaccines
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.vaccine_batches
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.appointments
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.vaccine_applications
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.stock_movements
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.digital_booklets
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.payments
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.message_logs
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;


  UPDATE public.settings
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;

END;
$$;


-- =========================================================
-- 9. FUNÇÃO PARA DESCOBRIR A EMPRESA DO USUÁRIO LOGADO
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

  LIMIT 1;

$$;


REVOKE ALL
ON FUNCTION public.current_organization_id()
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.current_organization_id()
TO authenticated;


-- =========================================================
-- 10. DEFAULT AUTOMÁTICO
--
-- Com isso o React atual NÃO precisa enviar organization_id
-- manualmente em cada insert.
-- =========================================================

ALTER TABLE public.tutors
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.pets
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.vaccines
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.vaccine_batches
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.appointments
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.vaccine_applications
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.stock_movements
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.digital_booklets
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.payments
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.message_logs
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


ALTER TABLE public.settings
ALTER COLUMN organization_id
SET DEFAULT public.current_organization_id();


-- =========================================================
-- 11. AGORA PODEMOS GARANTIR QUE DADOS DE NEGÓCIO
-- SEMPRE TENHAM EMPRESA
-- =========================================================

ALTER TABLE public.tutors
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.pets
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.vaccines
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.vaccine_batches
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.appointments
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.vaccine_applications
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.stock_movements
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.digital_booklets
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.payments
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.message_logs
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.settings
ALTER COLUMN organization_id SET NOT NULL;


-- =========================================================
-- 12. SETTINGS DEIXA DE SER SINGLETON GLOBAL
--
-- Antes:
-- apenas UMA linha no banco inteiro.
--
-- Agora:
-- UMA linha por empresa.
-- =========================================================

ALTER TABLE public.settings
DROP CONSTRAINT IF EXISTS settings_singleton_key;


CREATE UNIQUE INDEX IF NOT EXISTS
settings_organization_singleton_key
ON public.settings (
  organization_id,
  singleton
);


-- =========================================================
-- 13. ÍNDICES
-- =========================================================

CREATE INDEX IF NOT EXISTS
idx_profiles_organization
ON public.profiles(organization_id);


CREATE INDEX IF NOT EXISTS
idx_tutors_organization
ON public.tutors(organization_id);


CREATE INDEX IF NOT EXISTS
idx_pets_organization
ON public.pets(organization_id);


CREATE INDEX IF NOT EXISTS
idx_vaccines_organization
ON public.vaccines(organization_id);


CREATE INDEX IF NOT EXISTS
idx_vaccine_batches_organization
ON public.vaccine_batches(organization_id);


CREATE INDEX IF NOT EXISTS
idx_appointments_organization
ON public.appointments(organization_id);


CREATE INDEX IF NOT EXISTS
idx_vaccine_applications_organization
ON public.vaccine_applications(organization_id);


CREATE INDEX IF NOT EXISTS
idx_stock_movements_organization
ON public.stock_movements(organization_id);


CREATE INDEX IF NOT EXISTS
idx_digital_booklets_organization
ON public.digital_booklets(organization_id);


CREATE INDEX IF NOT EXISTS
idx_payments_organization
ON public.payments(organization_id);


CREATE INDEX IF NOT EXISTS
idx_message_logs_organization
ON public.message_logs(organization_id);


CREATE INDEX IF NOT EXISTS
idx_settings_organization
ON public.settings(organization_id);


-- =========================================================
-- 14. PROTEGER A TABELA DE ORGANIZAÇÕES
-- =========================================================

ALTER TABLE public.organizations
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
organizations_select_own
ON public.organizations;


CREATE POLICY
organizations_select_own
ON public.organizations
FOR SELECT
TO authenticated
USING (
  id = public.current_organization_id()
);