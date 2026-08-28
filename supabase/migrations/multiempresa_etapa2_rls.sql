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