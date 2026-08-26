-- =========================================================
-- VETFARM
-- CRON AUTOMÁTICO DA CENTRAL DE MENSAGENS
-- =========================================================

-- Executa todos os dias às 12:00 UTC
-- Equivale a 09:00 no horário de Brasília (-03:00)

SELECT cron.schedule(
  'vetfarm-generate-whatsapp-queue',
  '0 12 * * *',
  $$
    SELECT public.generate_whatsapp_queue();
  $$
);