-- =========================================================
-- VETFARM
-- GERAR FILA AUTOMÁTICA DE LEMBRETES E VACINAS ATRASADAS
-- =========================================================

CREATE OR REPLACE FUNCTION public.generate_whatsapp_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lembretes integer := 0;
  v_atrasadas integer := 0;
BEGIN

  -- =======================================================
  -- 1. LEMBRETE DE PRÓXIMA DOSE
  -- =======================================================

  WITH config AS (
    SELECT
      s.nome_farmacia,
      s.message_templates,
      s.auto_lembrete_proxima_dose,
      s.auto_lembrete_dias_antes
    FROM public.settings s
    LIMIT 1
  ),
  inseridos AS (
    INSERT INTO public.message_logs (
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
                  c.message_templates ->> 'lembrete',
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
          c.nome_farmacia,
          'VetFarm'
        )
      ),

      'pendente',

      va.proxima_dose,

      0

    FROM public.vaccine_applications va

    JOIN public.pets p
      ON p.id = va.pet_id

    JOIN public.tutors t
      ON t.id = p.tutor_id

    JOIN public.vaccines v
      ON v.id = va.vaccine_id

    CROSS JOIN config c

    WHERE
      c.auto_lembrete_proxima_dose = true

      AND va.proxima_dose IS NOT NULL

      -- Está dentro da janela de lembrete
      AND va.proxima_dose >= CURRENT_DATE

      AND va.proxima_dose <=
        CURRENT_DATE +
        c.auto_lembrete_dias_antes

      -- Não existe uma aplicação mais nova
      -- dessa mesma vacina para o mesmo pet
      AND NOT EXISTS (
        SELECT 1
        FROM public.vaccine_applications va2
        WHERE
          va2.pet_id = va.pet_id
          AND va2.vaccine_id = va.vaccine_id
          AND va2.data_aplicacao > va.data_aplicacao
      )

      -- Já existe proteção pelo índice UNIQUE,
      -- mas deixamos a verificação explícita também.
      AND NOT EXISTS (
        SELECT 1
        FROM public.message_logs ml
        WHERE
          ml.application_id = va.id
          AND ml.tipo = 'lembrete'
      )

    ON CONFLICT DO NOTHING

    RETURNING id
  )

  SELECT COUNT(*)
  INTO v_lembretes
  FROM inseridos;


  -- =======================================================
  -- 2. VACINA ATRASADA
  -- =======================================================

  WITH config AS (
    SELECT
      s.nome_farmacia,
      s.message_templates,
      s.auto_aviso_atraso,
      s.auto_atraso_dias_depois
    FROM public.settings s
    LIMIT 1
  ),
  inseridos AS (
    INSERT INTO public.message_logs (
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
                  c.message_templates ->> 'atrasada',
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
          c.nome_farmacia,
          'VetFarm'
        )
      ),

      'pendente',

      va.proxima_dose,

      0

    FROM public.vaccine_applications va

    JOIN public.pets p
      ON p.id = va.pet_id

    JOIN public.tutors t
      ON t.id = p.tutor_id

    JOIN public.vaccines v
      ON v.id = va.vaccine_id

    CROSS JOIN config c

    WHERE
      c.auto_aviso_atraso = true

      AND va.proxima_dose IS NOT NULL

      -- Exemplo:
      -- próxima dose 10/09
      -- configuração = 1 dia depois
      -- entra como atrasada em 11/09
      AND va.proxima_dose <=
        CURRENT_DATE -
        c.auto_atraso_dias_depois

      -- Se já houve outra aplicação da mesma vacina,
      -- não é mais considerada atrasada.
      AND NOT EXISTS (
        SELECT 1
        FROM public.vaccine_applications va2
        WHERE
          va2.pet_id = va.pet_id
          AND va2.vaccine_id = va.vaccine_id
          AND va2.data_aplicacao > va.data_aplicacao
      )

      AND NOT EXISTS (
        SELECT 1
        FROM public.message_logs ml
        WHERE
          ml.application_id = va.id
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
$$;


-- =========================================================
-- PERMISSÃO
-- =========================================================

REVOKE ALL
ON FUNCTION public.generate_whatsapp_queue()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.generate_whatsapp_queue()
TO authenticated;