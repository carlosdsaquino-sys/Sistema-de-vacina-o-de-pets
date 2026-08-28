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