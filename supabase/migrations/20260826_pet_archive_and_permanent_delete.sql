-- =========================================================
-- VETFARM
-- ARQUIVAR / EXCLUIR PET PERMANENTEMENTE
-- =========================================================

ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_pets_ativo
ON public.pets (ativo);


-- =========================================================
-- EXCLUSÃO PERMANENTE CONTROLADA
-- Só permite excluir PET ARQUIVADO.
-- =========================================================

CREATE OR REPLACE FUNCTION public.delete_pet_permanently(
  p_pet_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ativo boolean;
BEGIN

  SELECT p.ativo
  INTO v_ativo
  FROM public.pets p
  WHERE p.id = p_pet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pet não encontrado.';
  END IF;

  IF v_ativo = true THEN
    RAISE EXCEPTION
      'O pet precisa estar arquivado antes da exclusão permanente.';
  END IF;


  -- =======================================================
  -- PAGAMENTOS VINCULADOS À CADERNETA
  -- Caso sua tabela possua alguma dessas colunas.
  -- =======================================================

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'booklet_id'
  ) THEN
    EXECUTE '
      DELETE FROM public.payments
      WHERE booklet_id IN (
        SELECT id
        FROM public.digital_booklets
        WHERE pet_id = $1
      )
    '
    USING p_pet_id;
  END IF;


  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'digital_booklet_id'
  ) THEN
    EXECUTE '
      DELETE FROM public.payments
      WHERE digital_booklet_id IN (
        SELECT id
        FROM public.digital_booklets
        WHERE pet_id = $1
      )
    '
    USING p_pet_id;
  END IF;


  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'pet_id'
  ) THEN
    EXECUTE '
      DELETE FROM public.payments
      WHERE pet_id = $1
    '
    USING p_pet_id;
  END IF;


  -- =======================================================
  -- LOGS
  -- =======================================================

  DELETE FROM public.message_logs
  WHERE pet_id = p_pet_id;


  -- =======================================================
  -- APLICAÇÕES
  -- =======================================================

  DELETE FROM public.vaccine_applications
  WHERE pet_id = p_pet_id;


  -- =======================================================
  -- AGENDAMENTOS
  -- =======================================================

  DELETE FROM public.appointments
  WHERE pet_id = p_pet_id;


  -- =======================================================
  -- CADERNETA DIGITAL
  -- =======================================================

  DELETE FROM public.digital_booklets
  WHERE pet_id = p_pet_id;


  -- =======================================================
  -- PET
  -- =======================================================

  DELETE FROM public.pets
  WHERE id = p_pet_id;

END;
$$;


REVOKE ALL
ON FUNCTION public.delete_pet_permanently(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.delete_pet_permanently(uuid)
TO authenticated;