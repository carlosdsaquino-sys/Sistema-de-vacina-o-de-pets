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
-- =========================================================
-- PATAPASS - ETAPA 2 MULTIEMPRESA
-- ISOLAMENTO DOS DADOS COM ROW LEVEL SECURITY
-- =========================================================


-- =========================================================
-- 1. TUTORES
-- =========================================================

ALTER TABLE public.tutors
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
tutors_authenticated_all
ON public.tutors;

DROP POLICY IF EXISTS
tutors_organization_all
ON public.tutors;

CREATE POLICY
tutors_organization_all
ON public.tutors
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 2. PETS
-- =========================================================

ALTER TABLE public.pets
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
pets_authenticated_all
ON public.pets;

DROP POLICY IF EXISTS
pets_organization_all
ON public.pets;

CREATE POLICY
pets_organization_all
ON public.pets
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 3. VACINAS
-- =========================================================

ALTER TABLE public.vaccines
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
vaccines_authenticated_all
ON public.vaccines;

DROP POLICY IF EXISTS
vaccines_organization_all
ON public.vaccines;

CREATE POLICY
vaccines_organization_all
ON public.vaccines
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 4. LOTES
-- =========================================================

ALTER TABLE public.vaccine_batches
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
vaccine_batches_authenticated_all
ON public.vaccine_batches;

DROP POLICY IF EXISTS
vaccine_batches_organization_all
ON public.vaccine_batches;

CREATE POLICY
vaccine_batches_organization_all
ON public.vaccine_batches
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 5. AGENDAMENTOS
-- =========================================================

ALTER TABLE public.appointments
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
appointments_authenticated_all
ON public.appointments;

DROP POLICY IF EXISTS
appointments_organization_all
ON public.appointments;

CREATE POLICY
appointments_organization_all
ON public.appointments
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 6. APLICAÇÕES
-- =========================================================

ALTER TABLE public.vaccine_applications
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
applications_authenticated_all
ON public.vaccine_applications;

DROP POLICY IF EXISTS
applications_organization_all
ON public.vaccine_applications;

CREATE POLICY
applications_organization_all
ON public.vaccine_applications
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 7. MOVIMENTAÇÕES DE ESTOQUE
-- =========================================================

ALTER TABLE public.stock_movements
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
stock_movements_authenticated_all
ON public.stock_movements;

DROP POLICY IF EXISTS
stock_movements_organization_all
ON public.stock_movements;

CREATE POLICY
stock_movements_organization_all
ON public.stock_movements
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 8. CADERNETAS DIGITAIS
-- =========================================================

ALTER TABLE public.digital_booklets
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
booklets_authenticated_all
ON public.digital_booklets;

DROP POLICY IF EXISTS
booklets_organization_all
ON public.digital_booklets;

CREATE POLICY
booklets_organization_all
ON public.digital_booklets
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 9. PAGAMENTOS
-- =========================================================

ALTER TABLE public.payments
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
payments_authenticated_all
ON public.payments;

DROP POLICY IF EXISTS
payments_organization_all
ON public.payments;

CREATE POLICY
payments_organization_all
ON public.payments
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 10. LOGS DE MENSAGENS
-- =========================================================

ALTER TABLE public.message_logs
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
message_logs_authenticated_all
ON public.message_logs;

DROP POLICY IF EXISTS
message_logs_organization_all
ON public.message_logs;

CREATE POLICY
message_logs_organization_all
ON public.message_logs
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 11. CONFIGURAÇÕES
-- =========================================================

ALTER TABLE public.settings
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
settings_authenticated_all
ON public.settings;

DROP POLICY IF EXISTS
settings_organization_all
ON public.settings;

CREATE POLICY
settings_organization_all
ON public.settings
FOR ALL
TO authenticated

USING (
  organization_id =
  public.current_organization_id()
)

WITH CHECK (
  organization_id =
  public.current_organization_id()
);


-- =========================================================
-- 12. PROFILES
--
-- Mantemos cada usuário enxergando apenas o próprio perfil.
-- =========================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
profiles_select_own
ON public.profiles;

DROP POLICY IF EXISTS
profiles_update_own
ON public.profiles;


CREATE POLICY
profiles_select_own
ON public.profiles
FOR SELECT
TO authenticated

USING (
  auth.uid() = id
);


CREATE POLICY
profiles_update_own
ON public.profiles
FOR UPDATE
TO authenticated

USING (
  auth.uid() = id
)

WITH CHECK (
  auth.uid() = id
);


-- =========================================================
-- 13. PROTEGER ROLE E ORGANIZATION_ID DO PROFILE
--
-- Impede que um funcionário abra o console e faça:
--
-- role = 'admin'
-- organization_id = empresa_de_outro_pet_shop
--
-- Nome/email continuam podendo ser atualizados.
-- =========================================================

CREATE OR REPLACE FUNCTION
public.protect_profile_security_fields()
RETURNS trigger

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''

AS $$

BEGIN

  IF auth.uid() IS NOT NULL THEN

    IF
      NEW.organization_id
      IS DISTINCT FROM
      OLD.organization_id
    THEN

      RAISE EXCEPTION
        'Não é permitido alterar a organização do usuário diretamente.';

    END IF;


    IF
      NEW.role
      IS DISTINCT FROM
      OLD.role
    THEN

      RAISE EXCEPTION
        'Não é permitido alterar o nível de acesso diretamente.';

    END IF;

  END IF;


  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS
protect_profile_security_fields_trigger
ON public.profiles;


CREATE TRIGGER
protect_profile_security_fields_trigger

BEFORE UPDATE
ON public.profiles

FOR EACH ROW

EXECUTE FUNCTION
public.protect_profile_security_fields();


-- =========================================================
-- 14. ORGANIZAÇÕES
--
-- O usuário só pode visualizar sua própria empresa.
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
  id =
  public.current_organization_id()
);
-- =========================================================
-- PATAPASS - ETAPA 3 MULTIEMPRESA
-- QR / CADERNETA PÚBLICA ISOLADA POR EMPRESA
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_public_booklet(
  p_codigo text
)
RETURNS jsonb

LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''

AS $$

DECLARE

  v_booklet public.digital_booklets%ROWTYPE;

  v_pet public.pets%ROWTYPE;

  v_tutor public.tutors%ROWTYPE;

  v_settings jsonb;

  v_applications jsonb;

  v_blocked boolean := false;

  v_block_reason text := null;

BEGIN

  -- =======================================================
  -- 1. BUSCAR A CADERNETA PELO CÓDIGO
  --
  -- codigo_validacao continua UNIQUE globalmente.
  -- A partir daqui usamos a organization_id da própria
  -- caderneta para buscar todos os demais dados.
  -- =======================================================

  SELECT *
  INTO v_booklet

  FROM public.digital_booklets

  WHERE codigo_validacao = p_codigo

  LIMIT 1;


  IF NOT FOUND THEN
    RETURN NULL;
  END IF;


  -- =======================================================
  -- 2. CONFIGURAÇÕES DA EMPRESA DONA DA CADERNETA
  -- =======================================================

  SELECT jsonb_build_object(

    'nome_farmacia',
    s.nome_farmacia,

    'logo_url',
    s.logo_url,

    'whatsapp',
    s.whatsapp,

    'instagram',
    s.instagram,

    'endereco',
    s.endereco

  )
  INTO v_settings

  FROM public.settings s

  WHERE
    s.organization_id =
    v_booklet.organization_id

  LIMIT 1;


  -- =======================================================
  -- 3. VERIFICAR PAGAMENTO
  -- =======================================================

  IF
    v_booklet.status_pagamento <> 'paga'
  THEN

    v_blocked := true;

    v_block_reason :=
      'payment_required';

  END IF;


  -- =======================================================
  -- 4. VERIFICAR VALIDADE
  -- =======================================================

  IF
    v_booklet.status_pagamento = 'paga'

    AND
    v_booklet.validade_ate IS NOT NULL

    AND
    v_booklet.validade_ate < CURRENT_DATE

  THEN

    v_blocked := true;

    v_block_reason :=
      'expired';

  END IF;


  -- =======================================================
  -- 5. BLOQUEIO MANUAL
  -- =======================================================

  IF
    v_blocked = false

    AND
    v_booklet.liberada = false

  THEN

    v_blocked := true;

    v_block_reason :=
      'manual';

  END IF;


  -- =======================================================
  -- 6. SE ESTIVER BLOQUEADA
  --
  -- NÃO RETORNA PET
  -- NÃO RETORNA TUTOR
  -- NÃO RETORNA HISTÓRICO
  -- =======================================================

  IF v_blocked THEN

    RETURN jsonb_build_object(

      'blocked',
      true,

      'block_reason',
      v_block_reason,

      'booklet',
      jsonb_build_object(

        'codigo_validacao',
        v_booklet.codigo_validacao,

        'status_pagamento',
        v_booklet.status_pagamento,

        'liberada',
        v_booklet.liberada,

        'plano_pagamento',
        v_booklet.plano_pagamento,

        'validade_ate',
        v_booklet.validade_ate,

        'created_at',
        v_booklet.created_at

      ),

      'settings',
      v_settings

    );

  END IF;


  -- =======================================================
  -- 7. BUSCAR PET
  --
  -- IMPORTANTE:
  -- confere também a empresa.
  -- =======================================================

  SELECT *
  INTO v_pet

  FROM public.pets

  WHERE
    id = v_booklet.pet_id

    AND
    organization_id =
    v_booklet.organization_id

  LIMIT 1;


  IF NOT FOUND THEN
    RETURN NULL;
  END IF;


  -- =======================================================
  -- 8. BUSCAR TUTOR
  -- =======================================================

  SELECT *
  INTO v_tutor

  FROM public.tutors

  WHERE
    id = v_pet.tutor_id

    AND
    organization_id =
    v_booklet.organization_id

  LIMIT 1;


  IF NOT FOUND THEN
    RETURN NULL;
  END IF;


  -- =======================================================
  -- 9. HISTÓRICO DE VACINAÇÃO
  -- =======================================================

  SELECT COALESCE(

    jsonb_agg(

      jsonb_build_object(

        'id',
        va.id,

        'vaccine_nome',
        v.nome,

        'dose',
        va.dose,

        'lote',
        va.lote,

        'data_aplicacao',
        va.data_aplicacao,

        'proxima_dose',
        va.proxima_dose,

        'profissional',
        va.profissional,

        'crmv',
        va.crmv,

        'assinada',
        (
          va.assinatura_url IS NOT NULL
          AND
          va.assinatura_url <> ''
        )

      )

      ORDER BY
        va.data_aplicacao DESC

    ),

    '[]'::jsonb

  )
  INTO v_applications

  FROM public.vaccine_applications va

  LEFT JOIN public.vaccines v

    ON
      v.id = va.vaccine_id

      AND
      v.organization_id =
      v_booklet.organization_id

  WHERE

    va.pet_id =
    v_pet.id

    AND

    va.organization_id =
    v_booklet.organization_id;


  -- =======================================================
  -- 10. RETORNO DA CADERNETA LIBERADA
  -- =======================================================

  RETURN jsonb_build_object(

    'blocked',
    false,

    'block_reason',
    null,

    'booklet',
    jsonb_build_object(

      'codigo_validacao',
      v_booklet.codigo_validacao,

      'status_pagamento',
      v_booklet.status_pagamento,

      'liberada',
      v_booklet.liberada,

      'plano_pagamento',
      v_booklet.plano_pagamento,

      'validade_ate',
      v_booklet.validade_ate,

      'created_at',
      v_booklet.created_at

    ),

    'pet',
    jsonb_build_object(

      'nome',
      v_pet.nome,

      'especie',
      v_pet.especie,

      'raca',
      v_pet.raca,

      'idade',
      v_pet.idade,

      'peso',
      v_pet.peso,

      'sexo',
      v_pet.sexo,

      'foto_url',
      v_pet.foto_url

    ),

    'tutor',
    jsonb_build_object(

      'nome',
      v_tutor.nome,

      'whatsapp',
      v_tutor.whatsapp

    ),

    'settings',
    v_settings,

    'applications',
    v_applications

  );

END;
$$;


-- =========================================================
-- PERMISSÕES PÚBLICAS
-- =========================================================

REVOKE ALL
ON FUNCTION public.get_public_booklet(text)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.get_public_booklet(text)
TO anon;


GRANT EXECUTE
ON FUNCTION public.get_public_booklet(text)
TO authenticated;
-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 4
-- PROTEÇÃO DAS EXCLUSÕES PERMANENTES
-- =========================================================
--
-- Objetivo:
-- Impedir que um usuário de uma empresa consiga excluir
-- tutor/pet pertencente a outra empresa, mesmo conhecendo
-- o UUID.
--
-- As funções continuam SECURITY DEFINER, mas agora
-- validam organization_id antes de qualquer exclusão.
-- =========================================================


-- =========================================================
-- 1. EXCLUSÃO PERMANENTE DE PET
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_pet_permanently(
  p_pet_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$

DECLARE
  v_ativo boolean;
  v_organization_id uuid;

BEGIN

  -- =======================================================
  -- DESCOBRIR A EMPRESA DO USUÁRIO LOGADO
  -- =======================================================

  v_organization_id :=
    public.current_organization_id();


  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION
      'Usuário sem empresa vinculada.';
  END IF;


  -- =======================================================
  -- VERIFICAR SE O PET EXISTE E PERTENCE À EMPRESA
  -- =======================================================

  SELECT
    p.ativo
  INTO
    v_ativo
  FROM public.pets p
  WHERE
    p.id = p_pet_id
    AND p.organization_id = v_organization_id;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Pet não encontrado ou não pertence à sua empresa.';
  END IF;


  -- =======================================================
  -- SÓ PERMITE EXCLUIR PET ARQUIVADO
  -- =======================================================

  IF v_ativo = true THEN
    RAISE EXCEPTION
      'O pet precisa estar arquivado antes da exclusão permanente.';
  END IF;


  -- =======================================================
  -- PAGAMENTOS DA CADERNETA
  -- =======================================================

  DELETE FROM public.payments pay
  WHERE
    pay.organization_id = v_organization_id
    AND pay.booklet_id IN (
      SELECT db.id
      FROM public.digital_booklets db
      WHERE
        db.pet_id = p_pet_id
        AND db.organization_id = v_organization_id
    );


  -- =======================================================
  -- LOGS DE MENSAGENS
  -- =======================================================

  DELETE FROM public.message_logs ml
  WHERE
    ml.pet_id = p_pet_id
    AND ml.organization_id = v_organization_id;


  -- =======================================================
  -- APLICAÇÕES
  -- =======================================================

  DELETE FROM public.vaccine_applications va
  WHERE
    va.pet_id = p_pet_id
    AND va.organization_id = v_organization_id;


  -- =======================================================
  -- AGENDAMENTOS
  -- =======================================================

  DELETE FROM public.appointments a
  WHERE
    a.pet_id = p_pet_id
    AND a.organization_id = v_organization_id;


  -- =======================================================
  -- CADERNETA DIGITAL
  -- =======================================================

  DELETE FROM public.digital_booklets db
  WHERE
    db.pet_id = p_pet_id
    AND db.organization_id = v_organization_id;


  -- =======================================================
  -- PET
  -- =======================================================

  DELETE FROM public.pets p
  WHERE
    p.id = p_pet_id
    AND p.organization_id = v_organization_id;


END;
$function$;



-- =========================================================
-- 2. EXCLUSÃO PERMANENTE DE TUTOR
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_tutor_permanently(
  p_tutor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$

DECLARE
  v_ativo boolean;
  v_pet_id uuid;
  v_organization_id uuid;

BEGIN

  -- =======================================================
  -- DESCOBRIR A EMPRESA DO USUÁRIO LOGADO
  -- =======================================================

  v_organization_id :=
    public.current_organization_id();


  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION
      'Usuário sem empresa vinculada.';
  END IF;


  -- =======================================================
  -- VERIFICAR SE O TUTOR EXISTE E PERTENCE À EMPRESA
  -- =======================================================

  SELECT
    t.ativo
  INTO
    v_ativo
  FROM public.tutors t
  WHERE
    t.id = p_tutor_id
    AND t.organization_id = v_organization_id;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Tutor não encontrado ou não pertence à sua empresa.';
  END IF;


  -- =======================================================
  -- SÓ PERMITE EXCLUIR TUTOR ARQUIVADO
  -- =======================================================

  IF v_ativo = true THEN
    RAISE EXCEPTION
      'O tutor precisa estar arquivado antes da exclusão permanente.';
  END IF;


  -- =======================================================
  -- ARQUIVAR TODOS OS PETS DO TUTOR
  -- =======================================================

  UPDATE public.pets p
  SET ativo = false
  WHERE
    p.tutor_id = p_tutor_id
    AND p.organization_id = v_organization_id;


  -- =======================================================
  -- EXCLUIR CADA PET + HISTÓRICO
  -- =======================================================

  FOR v_pet_id IN

    SELECT p.id
    FROM public.pets p
    WHERE
      p.tutor_id = p_tutor_id
      AND p.organization_id = v_organization_id

  LOOP

    PERFORM public.delete_pet_permanently(
      v_pet_id
    );

  END LOOP;


  -- =======================================================
  -- APAGAR AGENDAMENTOS RESTANTES
  -- =======================================================

  DELETE FROM public.appointments a
  WHERE
    a.tutor_id = p_tutor_id
    AND a.organization_id = v_organization_id;


  -- =======================================================
  -- APAGAR LOGS DE MENSAGENS RESTANTES
  -- =======================================================

  DELETE FROM public.message_logs ml
  WHERE
    ml.tutor_id = p_tutor_id
    AND ml.organization_id = v_organization_id;


  -- =======================================================
  -- EXCLUIR O TUTOR
  -- =======================================================

  DELETE FROM public.tutors t
  WHERE
    t.id = p_tutor_id
    AND t.organization_id = v_organization_id;


END;
$function$;



-- =========================================================
-- 3. PERMISSÕES DAS FUNÇÕES
-- =========================================================
--
-- SECURITY DEFINER não deve ficar executável publicamente.
-- Somente usuários autenticados do sistema.
-- =========================================================

REVOKE ALL
ON FUNCTION public.delete_pet_permanently(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.delete_pet_permanently(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.delete_pet_permanently(uuid)
TO authenticated;


REVOKE ALL
ON FUNCTION public.delete_tutor_permanently(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.delete_tutor_permanently(uuid)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.delete_tutor_permanently(uuid)
TO authenticated;
-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 5
-- FILA AUTOMÁTICA DE WHATSAPP POR EMPRESA
-- =========================================================

CREATE OR REPLACE FUNCTION public.generate_whatsapp_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$

DECLARE
  v_lembretes integer := 0;
  v_atrasadas integer := 0;

BEGIN

  -- =======================================================
  -- 1. LEMBRETE DE PRÓXIMA DOSE
  -- =======================================================

  WITH inseridos AS (

    INSERT INTO public.message_logs (
      organization_id,
      tutor_id,
      pet_id,
      application_id,
      tipo,
      mensagem,
      status,
      scheduled_for,
      attempts
    )

    SELECT
      va.organization_id,
      t.id,
      p.id,
      va.id,

      'lembrete',

      replace(
        replace(
          replace(
            replace(
              replace(
                COALESCE(
                  s.message_templates ->> 'lembrete',
                  ''
                ),
                '{NOME}',
                COALESCE(t.nome, '')
              ),
              '{PET}',
              COALESCE(p.nome, '')
            ),
            '{VACINA}',
            COALESCE(v.nome, '')
          ),
          '{DATA}',
          to_char(
            va.proxima_dose,
            'DD/MM/YYYY'
          )
        ),
        '{FARMACIA}',
        COALESCE(
          s.nome_farmacia,
          o.nome,
          'Farmácia Veterinária'
        )
      ),

      'pendente',

      va.proxima_dose,

      0

    FROM public.vaccine_applications va

    -- PET DA MESMA EMPRESA
    JOIN public.pets p
      ON p.id = va.pet_id
      AND p.organization_id = va.organization_id

    -- TUTOR DA MESMA EMPRESA
    JOIN public.tutors t
      ON t.id = p.tutor_id
      AND t.organization_id = va.organization_id

    -- VACINA DA MESMA EMPRESA
    JOIN public.vaccines v
      ON v.id = va.vaccine_id
      AND v.organization_id = va.organization_id

    -- CONFIGURAÇÕES DA EMPRESA DA APLICAÇÃO
    JOIN public.settings s
      ON s.organization_id = va.organization_id

    -- NOME DA ORGANIZAÇÃO COMO FALLBACK
    JOIN public.organizations o
      ON o.id = va.organization_id

    WHERE

      s.auto_lembrete_proxima_dose = true

      AND va.proxima_dose IS NOT NULL

      -- Está dentro da janela do lembrete
      AND va.proxima_dose >= CURRENT_DATE

      AND va.proxima_dose <=
        CURRENT_DATE +
        s.auto_lembrete_dias_antes

      -- Não existe aplicação mais nova
      -- da mesma vacina para o mesmo pet
      AND NOT EXISTS (

        SELECT 1

        FROM public.vaccine_applications va2

        WHERE
          va2.organization_id = va.organization_id
          AND va2.pet_id = va.pet_id
          AND va2.vaccine_id = va.vaccine_id
          AND va2.data_aplicacao > va.data_aplicacao

      )

      -- Não cria o mesmo lembrete novamente
      AND NOT EXISTS (

        SELECT 1

        FROM public.message_logs ml

        WHERE
          ml.organization_id = va.organization_id
          AND ml.application_id = va.id
          AND ml.tipo = 'lembrete'

      )

    ON CONFLICT DO NOTHING

    RETURNING id

  )

  SELECT COUNT(*)
  INTO v_lembretes
  FROM inseridos;


  -- =======================================================
  -- 2. AVISO DE VACINA ATRASADA
  -- =======================================================

  WITH inseridos AS (

    INSERT INTO public.message_logs (
      organization_id,
      tutor_id,
      pet_id,
      application_id,
      tipo,
      mensagem,
      status,
      scheduled_for,
      attempts
    )

    SELECT
      va.organization_id,
      t.id,
      p.id,
      va.id,

      'atrasada',

      replace(
        replace(
          replace(
            replace(
              replace(
                COALESCE(
                  s.message_templates ->> 'atrasada',
                  ''
                ),
                '{NOME}',
                COALESCE(t.nome, '')
              ),
              '{PET}',
              COALESCE(p.nome, '')
            ),
            '{VACINA}',
            COALESCE(v.nome, '')
          ),
          '{DATA}',
          to_char(
            va.proxima_dose,
            'DD/MM/YYYY'
          )
        ),
        '{FARMACIA}',
        COALESCE(
          s.nome_farmacia,
          o.nome,
          'Farmácia Veterinária'
        )
      ),

      'pendente',

      va.proxima_dose,

      0

    FROM public.vaccine_applications va

    -- PET DA MESMA EMPRESA
    JOIN public.pets p
      ON p.id = va.pet_id
      AND p.organization_id = va.organization_id

    -- TUTOR DA MESMA EMPRESA
    JOIN public.tutors t
      ON t.id = p.tutor_id
      AND t.organization_id = va.organization_id

    -- VACINA DA MESMA EMPRESA
    JOIN public.vaccines v
      ON v.id = va.vaccine_id
      AND v.organization_id = va.organization_id

    -- CONFIGURAÇÕES DA EMPRESA
    JOIN public.settings s
      ON s.organization_id = va.organization_id

    JOIN public.organizations o
      ON o.id = va.organization_id

    WHERE

      s.auto_aviso_atraso = true

      AND va.proxima_dose IS NOT NULL

      -- Exemplo:
      -- próxima dose = 10/09
      -- configuração = 1 dia depois
      -- aviso entra em 11/09
      AND va.proxima_dose <=
        CURRENT_DATE -
        s.auto_atraso_dias_depois

      -- Se já houve aplicação posterior dessa vacina,
      -- não é mais considerada atrasada.
      AND NOT EXISTS (

        SELECT 1

        FROM public.vaccine_applications va2

        WHERE
          va2.organization_id = va.organization_id
          AND va2.pet_id = va.pet_id
          AND va2.vaccine_id = va.vaccine_id
          AND va2.data_aplicacao > va.data_aplicacao

      )

      -- Não cria o mesmo aviso novamente
      AND NOT EXISTS (

        SELECT 1

        FROM public.message_logs ml

        WHERE
          ml.organization_id = va.organization_id
          AND ml.application_id = va.id
          AND ml.tipo = 'atrasada'

      )

    ON CONFLICT DO NOTHING

    RETURNING id

  )

  SELECT COUNT(*)
  INTO v_atrasadas
  FROM inseridos;


  -- =======================================================
  -- RESULTADO
  -- =======================================================

  RETURN jsonb_build_object(
    'lembretes_criados',
    v_lembretes,
    'avisos_atraso_criados',
    v_atrasadas
  );

END;
$function$;
-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 6
-- PROTEÇÃO DE RELAÇÕES ENTRE EMPRESAS
-- =========================================================
--
-- Impede que um registro de uma organização referencie
-- por UUID um registro pertencente a outra organização.
--
-- As foreign keys antigas continuam existindo.
-- Estas são proteções adicionais compostas por:
--
--   organization_id + id relacionado
--
-- =========================================================


-- =========================================================
-- 1. CHAVES ÚNICAS COMPOSTAS NOS REGISTROS "PAIS"
-- =========================================================
--
-- O PostgreSQL precisa dessas chaves para permitir
-- foreign keys compostas.
-- =========================================================

ALTER TABLE public.tutors
ADD CONSTRAINT tutors_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.pets
ADD CONSTRAINT pets_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.vaccines
ADD CONSTRAINT vaccines_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.digital_booklets
ADD CONSTRAINT digital_booklets_org_id_id_unique
UNIQUE (organization_id, id);



-- =========================================================
-- 2. PET -> TUTOR
-- =========================================================

ALTER TABLE public.pets
ADD CONSTRAINT pets_org_tutor_fkey
FOREIGN KEY (
  organization_id,
  tutor_id
)
REFERENCES public.tutors (
  organization_id,
  id
)
ON DELETE CASCADE;



-- =========================================================
-- 3. AGENDAMENTO -> PET
-- =========================================================

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 4. AGENDAMENTO -> TUTOR
-- =========================================================

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_tutor_fkey
FOREIGN KEY (
  organization_id,
  tutor_id
)
REFERENCES public.tutors (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 5. AGENDAMENTO -> VACINA
-- =========================================================

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 6. CADERNETA -> PET
-- =========================================================

ALTER TABLE public.digital_booklets
ADD CONSTRAINT digital_booklets_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 7. PAGAMENTO -> CADERNETA
-- =========================================================

ALTER TABLE public.payments
ADD CONSTRAINT payments_org_booklet_fkey
FOREIGN KEY (
  organization_id,
  booklet_id
)
REFERENCES public.digital_booklets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 8. LOTE -> VACINA
-- =========================================================

ALTER TABLE public.vaccine_batches
ADD CONSTRAINT vaccine_batches_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 9. APLICAÇÃO -> PET
-- =========================================================

ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 10. APLICAÇÃO -> VACINA
-- =========================================================

ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 11. APLICAÇÃO -> AGENDAMENTO
-- =========================================================
--
-- appointment_id pode ser NULL.
-- A FK original continua responsável pelo ON DELETE SET NULL.
-- =========================================================

ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_appointment_fkey
FOREIGN KEY (
  organization_id,
  appointment_id
)
REFERENCES public.appointments (
  organization_id,
  id
);



-- =========================================================
-- 12. MOVIMENTAÇÃO DE ESTOQUE -> VACINA
-- =========================================================

ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 13. MOVIMENTAÇÃO DE ESTOQUE -> APLICAÇÃO
-- =========================================================
--
-- application_id pode ser NULL.
-- FK antiga continua cuidando do ON DELETE SET NULL.
-- =========================================================

ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_org_application_fkey
FOREIGN KEY (
  organization_id,
  application_id
)
REFERENCES public.vaccine_applications (
  organization_id,
  id
);



-- =========================================================
-- 14. MESSAGE LOG -> TUTOR
-- =========================================================
--
-- tutor_id pode ser NULL.
-- FK original continua com ON DELETE SET NULL.
-- =========================================================

ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_org_tutor_fkey
FOREIGN KEY (
  organization_id,
  tutor_id
)
REFERENCES public.tutors (
  organization_id,
  id
);



-- =========================================================
-- 15. MESSAGE LOG -> PET
-- =========================================================

ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
);



-- =========================================================
-- 16. MESSAGE LOG -> APLICAÇÃO
-- =========================================================

ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_org_application_fkey
FOREIGN KEY (
  organization_id,
  application_id
)
REFERENCES public.vaccine_applications (
  organization_id,
  id
);
-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 7
-- STORAGE: FOTOS DOS PETS
-- =========================================================

-- Remove as policies antigas, que permitiam que qualquer
-- usuário autenticado alterasse qualquer arquivo do bucket.

DROP POLICY IF EXISTS
  authenticated_upload_pet_photos
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_update_pet_photos
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_delete_pet_photos
ON storage.objects;


-- =========================================================
-- UPLOAD
-- =========================================================
--
-- O primeiro diretório do arquivo precisa ser exatamente
-- o organization_id do usuário logado.
--
-- Ex:
-- 32916685-.../PET_ID/foto.jpg
-- =========================================================

CREATE POLICY pet_photos_organization_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- ATUALIZAÇÃO
-- =========================================================

CREATE POLICY pet_photos_organization_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- EXCLUSÃO
-- =========================================================

CREATE POLICY pet_photos_organization_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'pet-photos'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);
-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 8
-- STORAGE: LOGO / ARQUIVOS DA EMPRESA
-- =========================================================

-- Remove as policies antigas, que permitiam qualquer
-- usuário autenticado mexer em qualquer arquivo do bucket.

DROP POLICY IF EXISTS
  authenticated_upload_company_assets
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_update_company_assets
ON storage.objects;

DROP POLICY IF EXISTS
  authenticated_delete_company_assets
ON storage.objects;


-- =========================================================
-- UPLOAD
-- =========================================================
--
-- Caminho esperado:
--
-- organization_id/logo/logo-arquivo.png
--
-- =========================================================

CREATE POLICY company_assets_organization_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- ATUALIZAÇÃO
-- =========================================================

CREATE POLICY company_assets_organization_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);


-- =========================================================
-- EXCLUSÃO
-- =========================================================

CREATE POLICY company_assets_organization_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-assets'
  AND split_part(name, '/', 1)
      = public.current_organization_id()::text
);
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