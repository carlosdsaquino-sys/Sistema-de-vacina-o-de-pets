/*
VetFarm Database v2
Supabase / PostgreSQL
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'funcionario'
    CHECK (role IN ('admin', 'funcionario')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TUTORS
CREATE TABLE IF NOT EXISTS public.tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  whatsapp text NOT NULL UNIQUE,
  instagram text,
  endereco text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutors_authenticated_all" ON public.tutors;
CREATE POLICY "tutors_authenticated_all"
ON public.tutors FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tutors_nome ON public.tutors(nome);
CREATE INDEX IF NOT EXISTS idx_tutors_whatsapp ON public.tutors(whatsapp);

DROP TRIGGER IF EXISTS trg_tutors_updated_at ON public.tutors;
CREATE TRIGGER trg_tutors_updated_at
BEFORE UPDATE ON public.tutors
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PETS
CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  nome text NOT NULL,
  especie text NOT NULL CHECK (especie IN ('Cão', 'Gato', 'Outro')),
  raca text,
  idade text,
  peso text,
  sexo text CHECK (sexo IS NULL OR sexo IN ('Macho', 'Fêmea')),
  descricao text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pets_authenticated_all" ON public.pets;
CREATE POLICY "pets_authenticated_all"
ON public.pets FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pets_tutor_id ON public.pets(tutor_id);
CREATE INDEX IF NOT EXISTS idx_pets_nome ON public.pets(nome);

DROP TRIGGER IF EXISTS trg_pets_updated_at ON public.pets;
CREATE TRIGGER trg_pets_updated_at
BEFORE UPDATE ON public.pets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VACCINES
CREATE TABLE IF NOT EXISTS public.vaccines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  fabricante text,
  descricao text,
  estoque_atual integer NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  estoque_minimo integer NOT NULL DEFAULT 5 CHECK (estoque_minimo >= 0),
  protocolo_doses integer NOT NULL DEFAULT 3 CHECK (protocolo_doses >= 1),
  intervalo_entre_doses integer NOT NULL DEFAULT 21 CHECK (intervalo_entre_doses >= 0),
  possui_reforco_anual boolean NOT NULL DEFAULT true,
  intervalo_reforco_anual integer NOT NULL DEFAULT 365 CHECK (intervalo_reforco_anual >= 0),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccines_authenticated_all" ON public.vaccines;
CREATE POLICY "vaccines_authenticated_all"
ON public.vaccines FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vaccines_nome_lower
ON public.vaccines(lower(nome));

DROP TRIGGER IF EXISTS trg_vaccines_updated_at ON public.vaccines;
CREATE TRIGGER trg_vaccines_updated_at
BEFORE UPDATE ON public.vaccines
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VACCINE BATCHES
CREATE TABLE IF NOT EXISTS public.vaccine_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_id uuid NOT NULL REFERENCES public.vaccines(id) ON DELETE RESTRICT,
  lote text NOT NULL,
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  data_validade date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vaccine_id, lote)
);

ALTER TABLE public.vaccine_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vaccine_batches_authenticated_all" ON public.vaccine_batches;
CREATE POLICY "vaccine_batches_authenticated_all"
ON public.vaccine_batches FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vaccine_batches_vaccine_id
ON public.vaccine_batches(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_batches_validade
ON public.vaccine_batches(data_validade);

DROP TRIGGER IF EXISTS trg_vaccine_batches_updated_at ON public.vaccine_batches;
CREATE TRIGGER trg_vaccine_batches_updated_at
BEFORE UPDATE ON public.vaccine_batches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE RESTRICT,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
  vaccine_id uuid NOT NULL REFERENCES public.vaccines(id) ON DELETE RESTRICT,
  dose text NOT NULL,
  data_agendada date NOT NULL,
  horario_agendado text,
  status text NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('agendado','confirmado','atrasado','aplicado','cancelado','remarcado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_authenticated_all" ON public.appointments;
CREATE POLICY "appointments_authenticated_all"
ON public.appointments FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_appointments_data ON public.appointments(data_agendada);
CREATE INDEX IF NOT EXISTS idx_appointments_data_horario
ON public.appointments(data_agendada, horario_agendado);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON public.appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tutor_id ON public.appointments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vaccine_id ON public.appointments(vaccine_id);

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VACCINE APPLICATIONS
CREATE TABLE IF NOT EXISTS public.vaccine_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE RESTRICT,
  vaccine_id uuid NOT NULL REFERENCES public.vaccines(id) ON DELETE RESTRICT,
  dose text NOT NULL,
  lote text,
  data_aplicacao date NOT NULL DEFAULT CURRENT_DATE,
  proxima_dose date,
  observacoes_clinicas text,
  assinatura_url text,
  profissional text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vaccine_applications
ADD COLUMN IF NOT EXISTS dose text;

ALTER TABLE public.vaccine_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_authenticated_all" ON public.vaccine_applications;
CREATE POLICY "applications_authenticated_all"
ON public.vaccine_applications FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_applications_pet_id
ON public.vaccine_applications(pet_id);
CREATE INDEX IF NOT EXISTS idx_applications_vaccine_id
ON public.vaccine_applications(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_applications_appointment_id
ON public.vaccine_applications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_applications_data
ON public.vaccine_applications(data_aplicacao);

DROP TRIGGER IF EXISTS trg_vaccine_applications_updated_at
ON public.vaccine_applications;
CREATE TRIGGER trg_vaccine_applications_updated_at
BEFORE UPDATE ON public.vaccine_applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_id uuid NOT NULL REFERENCES public.vaccines(id) ON DELETE RESTRICT,
  tipo text NOT NULL DEFAULT 'saida'
    CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  motivo text,
  application_id uuid REFERENCES public.vaccine_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_authenticated_all"
ON public.stock_movements;
CREATE POLICY "stock_movements_authenticated_all"
ON public.stock_movements FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stock_vaccine_id
ON public.stock_movements(vaccine_id);
CREATE INDEX IF NOT EXISTS idx_stock_application_id
ON public.stock_movements(application_id);
CREATE INDEX IF NOT EXISTS idx_stock_created_at
ON public.stock_movements(created_at);

-- DIGITAL BOOKLETS
CREATE TABLE IF NOT EXISTS public.digital_booklets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL UNIQUE REFERENCES public.pets(id) ON DELETE RESTRICT,
  status_pagamento text NOT NULL DEFAULT 'nao_paga'
    CHECK (status_pagamento IN ('nao_paga','pendente','paga','expirada')),
  codigo_validacao text NOT NULL UNIQUE,
  qr_code_url text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.digital_booklets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booklets_authenticated_all"
ON public.digital_booklets;
CREATE POLICY "booklets_authenticated_all"
ON public.digital_booklets FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_booklets_pet_id
ON public.digital_booklets(pet_id);
CREATE INDEX IF NOT EXISTS idx_booklets_codigo
ON public.digital_booklets(codigo_validacao);

DROP TRIGGER IF EXISTS trg_digital_booklets_updated_at
ON public.digital_booklets;
CREATE TRIGGER trg_digital_booklets_updated_at
BEFORE UPDATE ON public.digital_booklets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booklet_id uuid NOT NULL REFERENCES public.digital_booklets(id) ON DELETE RESTRICT,
  valor numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  metodo text NOT NULL DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','aprovado','recusado','cancelado')),
  transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_authenticated_all"
ON public.payments;
CREATE POLICY "payments_authenticated_all"
ON public.payments FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_payments_booklet_id
ON public.payments(booklet_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id
ON public.payments(transaction_id);

-- MESSAGE LOGS
CREATE TABLE IF NOT EXISTS public.message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid REFERENCES public.tutors(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'preparada',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_logs_authenticated_all"
ON public.message_logs;
CREATE POLICY "message_logs_authenticated_all"
ON public.message_logs FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_messages_tutor_id
ON public.message_logs(tutor_id);
CREATE INDEX IF NOT EXISTS idx_messages_pet_id
ON public.message_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at
ON public.message_logs(created_at);

-- SETTINGS
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE CHECK (singleton = true),
  nome_farmacia text NOT NULL DEFAULT 'VetFarm',
  logo_url text,
  whatsapp text,
  endereco text,
  horario_funcionamento text,
  pdf_info text,
  booklet_price numeric(10,2) NOT NULL DEFAULT 19.90 CHECK (booklet_price >= 0),
  message_templates jsonb NOT NULL DEFAULT
  '{
    "agendamento": "Olá, {NOME}! 🐾\nO agendamento da vacina do pet {PET} ficou marcado para o dia {DATA}, às {HORA}, na {FARMACIA}.\n\n💉 Vacina: {VACINA}\n💉 Dose: {DOSE}\n\nEsperamos vocês! 💚🐾",
    "confirmacao": "Olá, {NOME}! 🐾 Passando para lembrar que o {PET} tem vacinação marcada para {DATA} às {HORA}. Podemos confirmar sua presença? 💚",
    "lembrete": "Olá, {NOME}! 🐾 A próxima dose da vacina {VACINA} do pet {PET} está chegando. A data recomendada é {DATA}. 💉💚",
    "atrasada": "Olá, {NOME}! 🐾 Identificamos que a vacina {VACINA} do {PET} está atrasada. Entre em contato para agendarmos uma nova data. 💚"
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_authenticated_all"
ON public.settings;
CREATE POLICY "settings_authenticated_all"
ON public.settings FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_settings_updated_at
ON public.settings;
CREATE TRIGGER trg_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTO PROFILE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      split_part(COALESCE(NEW.email, ''), '@', 1),
      'Usuário'
    ),
    COALESCE(NEW.email, ''),
    'funcionario'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- VALIDAÇÃO PÚBLICA SEGURA
CREATE OR REPLACE FUNCTION public.get_public_booklet(p_codigo text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'booklet',
    jsonb_build_object(
      'codigo_validacao', b.codigo_validacao,
      'status_pagamento', b.status_pagamento,
      'created_at', b.created_at
    ),
    'pet',
    jsonb_build_object(
      'nome', p.nome,
      'especie', p.especie,
      'raca', p.raca,
      'idade', p.idade,
      'peso', p.peso,
      'sexo', p.sexo
    ),
    'tutor',
    jsonb_build_object(
      'nome', t.nome
    ),
    'settings',
    jsonb_build_object(
      'nome_farmacia', s.nome_farmacia
    ),
    'applications',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', va.id,
            'vaccine_nome', v.nome,
            'dose', va.dose,
            'lote', va.lote,
            'data_aplicacao', va.data_aplicacao,
            'proxima_dose', va.proxima_dose
          )
          ORDER BY va.data_aplicacao DESC, va.created_at DESC
        )
        FROM public.vaccine_applications va
        JOIN public.vaccines v ON v.id = va.vaccine_id
        WHERE va.pet_id = p.id
      ),
      '[]'::jsonb
    )
  )
  FROM public.digital_booklets b
  JOIN public.pets p ON p.id = b.pet_id
  JOIN public.tutors t ON t.id = p.tutor_id
  LEFT JOIN public.settings s ON s.singleton = true
  WHERE b.codigo_validacao = p_codigo
  LIMIT 1;
$$;

REVOKE ALL
ON FUNCTION public.get_public_booklet(text)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_public_booklet(text)
TO anon, authenticated;

-- SETTINGS DEFAULT
INSERT INTO public.settings (
  singleton,
  nome_farmacia,
  whatsapp,
  endereco,
  horario_funcionamento
)
VALUES (
  true,
  'VetFarm',
  '',
  '',
  'Seg-Sex 8h-18h, Sáb 8h-12h'
)
ON CONFLICT (singleton) DO NOTHING;

-- VACINAS INICIAIS
INSERT INTO public.vaccines (
  nome,
  fabricante,
  descricao,
  estoque_atual,
  estoque_minimo,
  protocolo_doses,
  intervalo_entre_doses,
  possui_reforco_anual,
  intervalo_reforco_anual,
  ativo
)
VALUES
('V8', NULL, 'Vacina polivalente para cães', 15, 5, 3, 21, true, 365, true),
('V10', NULL, 'Vacina polivalente para cães', 12, 5, 3, 21, true, 365, true),
('Antirrábica', NULL, 'Vacina contra raiva', 20, 10, 1, 0, true, 365, true),
('Gripe Canina', NULL, 'Vacina cadastrada para configuração do protocolo pelo estabelecimento', 8, 3, 1, 0, true, 365, true),
('Giárdia', NULL, 'Vacina cadastrada para configuração do protocolo pelo estabelecimento', 6, 3, 2, 21, false, 0, true),
('Leishmaniose', NULL, 'Vacina cadastrada para configuração do protocolo pelo estabelecimento', 10, 5, 3, 21, true, 365, true),
('Quádrupla Felina', NULL, 'Vacina polivalente para gatos', 7, 3, 3, 21, true, 365, true),
('Quíntupla Felina', NULL, 'Vacina polivalente para gatos', 5, 3, 3, 21, true, 365, true)
ON CONFLICT DO NOTHING;