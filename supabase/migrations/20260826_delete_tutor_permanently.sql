-- =========================================================
-- VETFARM
-- EXCLUSÃO PERMANENTE DE TUTOR
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_tutor_permanently(
  p_tutor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ativo boolean;
  v_pet_id uuid;
BEGIN

  -- =======================================================
  -- VERIFICAR SE O TUTOR EXISTE
  -- =======================================================

  SELECT t.ativo
  INTO v_ativo
  FROM public.tutors t
  WHERE t.id = p_tutor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tutor não encontrado.';
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
  -- PARA PERMITIR USAR delete_pet_permanently
  -- =======================================================

  UPDATE public.pets
  SET ativo = false
  WHERE tutor_id = p_tutor_id;


  -- =======================================================
  -- EXCLUIR CADA PET + HISTÓRICO
  -- =======================================================

  FOR v_pet_id IN
    SELECT p.id
    FROM public.pets p
    WHERE p.tutor_id = p_tutor_id
  LOOP

    PERFORM public.delete_pet_permanently(
      v_pet_id
    );

  END LOOP;


  -- =======================================================
  -- APAGAR AGENDAMENTOS QUE EVENTUALMENTE RESTARAM
  -- =======================================================

  DELETE FROM public.appointments
  WHERE tutor_id = p_tutor_id;


  -- =======================================================
  -- APAGAR LOGS DE MENSAGENS
  -- =======================================================

  DELETE FROM public.message_logs
  WHERE tutor_id = p_tutor_id;


  -- =======================================================
  -- EXCLUIR O TUTOR
  -- =======================================================

  DELETE FROM public.tutors
  WHERE id = p_tutor_id;

END;
$$;


-- =========================================================
-- PERMISSÕES
-- =========================================================

REVOKE ALL
ON FUNCTION public.delete_tutor_permanently(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.delete_tutor_permanently(uuid)
TO authenticated;