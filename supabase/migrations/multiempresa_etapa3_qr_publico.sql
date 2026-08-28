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