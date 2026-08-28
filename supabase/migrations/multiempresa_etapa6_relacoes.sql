-- =========================================================
-- PATAPASS - MULTIEMPRESA ETAPA 6
-- PROTEÇÃO DE RELAÇÕES ENTRE EMPRESAS
-- =========================================================
--
-- Impede que um registro de uma organização referencie
-- por UUID um registro pertencente a outra organização.
--
-- As foreign keys antigas continuam existindo.
-- Estas são proteções adicionais compostas por:
--
--   organization_id + id relacionado
--
-- =========================================================


-- =========================================================
-- 1. CHAVES ÚNICAS COMPOSTAS NOS REGISTROS "PAIS"
-- =========================================================
--
-- O PostgreSQL precisa dessas chaves para permitir
-- foreign keys compostas.
-- =========================================================

ALTER TABLE public.tutors
ADD CONSTRAINT tutors_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.pets
ADD CONSTRAINT pets_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.vaccines
ADD CONSTRAINT vaccines_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_id_id_unique
UNIQUE (organization_id, id);


ALTER TABLE public.digital_booklets
ADD CONSTRAINT digital_booklets_org_id_id_unique
UNIQUE (organization_id, id);



-- =========================================================
-- 2. PET -> TUTOR
-- =========================================================

ALTER TABLE public.pets
ADD CONSTRAINT pets_org_tutor_fkey
FOREIGN KEY (
  organization_id,
  tutor_id
)
REFERENCES public.tutors (
  organization_id,
  id
)
ON DELETE CASCADE;



-- =========================================================
-- 3. AGENDAMENTO -> PET
-- =========================================================

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 4. AGENDAMENTO -> TUTOR
-- =========================================================

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_tutor_fkey
FOREIGN KEY (
  organization_id,
  tutor_id
)
REFERENCES public.tutors (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 5. AGENDAMENTO -> VACINA
-- =========================================================

ALTER TABLE public.appointments
ADD CONSTRAINT appointments_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 6. CADERNETA -> PET
-- =========================================================

ALTER TABLE public.digital_booklets
ADD CONSTRAINT digital_booklets_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 7. PAGAMENTO -> CADERNETA
-- =========================================================

ALTER TABLE public.payments
ADD CONSTRAINT payments_org_booklet_fkey
FOREIGN KEY (
  organization_id,
  booklet_id
)
REFERENCES public.digital_booklets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 8. LOTE -> VACINA
-- =========================================================

ALTER TABLE public.vaccine_batches
ADD CONSTRAINT vaccine_batches_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 9. APLICAÇÃO -> PET
-- =========================================================

ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 10. APLICAÇÃO -> VACINA
-- =========================================================

ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 11. APLICAÇÃO -> AGENDAMENTO
-- =========================================================
--
-- appointment_id pode ser NULL.
-- A FK original continua responsável pelo ON DELETE SET NULL.
-- =========================================================

ALTER TABLE public.vaccine_applications
ADD CONSTRAINT vaccine_applications_org_appointment_fkey
FOREIGN KEY (
  organization_id,
  appointment_id
)
REFERENCES public.appointments (
  organization_id,
  id
);



-- =========================================================
-- 12. MOVIMENTAÇÃO DE ESTOQUE -> VACINA
-- =========================================================

ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_org_vaccine_fkey
FOREIGN KEY (
  organization_id,
  vaccine_id
)
REFERENCES public.vaccines (
  organization_id,
  id
)
ON DELETE RESTRICT;



-- =========================================================
-- 13. MOVIMENTAÇÃO DE ESTOQUE -> APLICAÇÃO
-- =========================================================
--
-- application_id pode ser NULL.
-- FK antiga continua cuidando do ON DELETE SET NULL.
-- =========================================================

ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_org_application_fkey
FOREIGN KEY (
  organization_id,
  application_id
)
REFERENCES public.vaccine_applications (
  organization_id,
  id
);



-- =========================================================
-- 14. MESSAGE LOG -> TUTOR
-- =========================================================
--
-- tutor_id pode ser NULL.
-- FK original continua com ON DELETE SET NULL.
-- =========================================================

ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_org_tutor_fkey
FOREIGN KEY (
  organization_id,
  tutor_id
)
REFERENCES public.tutors (
  organization_id,
  id
);



-- =========================================================
-- 15. MESSAGE LOG -> PET
-- =========================================================

ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_org_pet_fkey
FOREIGN KEY (
  organization_id,
  pet_id
)
REFERENCES public.pets (
  organization_id,
  id
);



-- =========================================================
-- 16. MESSAGE LOG -> APLICAÇÃO
-- =========================================================

ALTER TABLE public.message_logs
ADD CONSTRAINT message_logs_org_application_fkey
FOREIGN KEY (
  organization_id,
  application_id
)
REFERENCES public.vaccine_applications (
  organization_id,
  id
);