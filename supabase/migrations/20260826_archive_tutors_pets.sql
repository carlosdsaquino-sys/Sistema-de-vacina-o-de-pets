-- =========================================================
-- VETFARM
-- ARQUIVAMENTO DE TUTORES E PETS
-- =========================================================

ALTER TABLE public.tutors
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;


-- Índices para consultas das telas
CREATE INDEX IF NOT EXISTS idx_tutors_ativo
ON public.tutors (ativo);

CREATE INDEX IF NOT EXISTS idx_pets_ativo
ON public.pets (ativo);