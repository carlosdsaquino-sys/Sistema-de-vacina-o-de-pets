-- =========================================================
-- VETFARM - AUTOMAÇÕES GRATUITAS DE WHATSAPP
-- =========================================================

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_lembrete_proxima_dose boolean NOT NULL DEFAULT true;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_lembrete_dias_antes integer NOT NULL DEFAULT 3;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_aviso_atraso boolean NOT NULL DEFAULT true;

ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS auto_atraso_dias_depois integer NOT NULL DEFAULT 1;


-- =========================================================
-- MESSAGE LOGS - FILA DE MENSAGENS
-- =========================================================

ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS application_id uuid
REFERENCES public.vaccine_applications(id)
ON DELETE CASCADE;

ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS scheduled_for date;

ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.message_logs
ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;


-- =========================================================
-- EVITAR DUPLICIDADE
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
uq_message_logs_automation
ON public.message_logs (
  application_id,
  tipo
)
WHERE
  application_id IS NOT NULL
  AND tipo IN (
    'lembrete',
    'atrasada'
  );