-- =========================================================
-- VETFARM
-- PLANOS MENSAL E ANUAL DA CADERNETA DIGITAL
-- =========================================================


-- =========================================================
-- 1. PLANO ATUAL DA CADERNETA
-- =========================================================

ALTER TABLE public.digital_booklets
ADD COLUMN IF NOT EXISTS plano_pagamento text;


-- Cadernetas antigas passam a ser anuais por padrão
UPDATE public.digital_booklets
SET plano_pagamento = 'anual'
WHERE plano_pagamento IS NULL;


ALTER TABLE public.digital_booklets
ALTER COLUMN plano_pagamento
SET DEFAULT 'anual';


ALTER TABLE public.digital_booklets
ALTER COLUMN plano_pagamento
SET NOT NULL;


-- =========================================================
-- 2. VALIDADE
-- =========================================================

ALTER TABLE public.digital_booklets
ADD COLUMN IF NOT EXISTS validade_ate date;


-- =========================================================
-- 3. GARANTIR APENAS MENSAL OU ANUAL
-- =========================================================

ALTER TABLE public.digital_booklets
DROP CONSTRAINT IF EXISTS digital_booklets_plano_pagamento_check;


ALTER TABLE public.digital_booklets
ADD CONSTRAINT digital_booklets_plano_pagamento_check
CHECK (
  plano_pagamento IN (
    'mensal',
    'anual'
  )
);


-- =========================================================
-- 4. REGISTRAR O PLANO EM CADA PAGAMENTO
--
-- Isso é importante para o histórico.
-- Ex:
-- Janeiro = mensal
-- Fevereiro = mensal
-- Depois cliente muda para anual
-- =========================================================

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS plano_pagamento text;


ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_plano_pagamento_check;


ALTER TABLE public.payments
ADD CONSTRAINT payments_plano_pagamento_check
CHECK (
  plano_pagamento IS NULL
  OR plano_pagamento IN (
    'mensal',
    'anual'
  )
);


-- Pagamentos antigos serão considerados anuais
UPDATE public.payments
SET plano_pagamento = 'anual'
WHERE plano_pagamento IS NULL;


-- =========================================================
-- 5. PREÇOS NAS CONFIGURAÇÕES
-- =========================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS booklet_price_monthly numeric(10,2);


ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS booklet_price_annual numeric(10,2);


-- Usa o preço antigo como preço anual,
-- para não perder sua configuração atual.
UPDATE public.settings
SET booklet_price_annual = booklet_price
WHERE booklet_price_annual IS NULL;


-- =========================================================
-- 6. ÍNDICES
-- =========================================================

CREATE INDEX IF NOT EXISTS
idx_digital_booklets_validade_ate
ON public.digital_booklets(validade_ate);


CREATE INDEX IF NOT EXISTS
idx_digital_booklets_plano_pagamento
ON public.digital_booklets(plano_pagamento);