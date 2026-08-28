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