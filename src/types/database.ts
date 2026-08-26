export type Especie = 'Cão' | 'Gato' | 'Outro';

export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'aplicado'
  | 'atrasado'
  | 'remarcado'
  | 'cancelado';

export type DoseOption =
  | '1ª dose'
  | '2ª dose'
  | '3ª dose'
  | '4ª dose'
  | 'Anual / Reforço';

export type PaymentStatus = 'nao_paga' | 'pendente' | 'paga' | 'expirada';

export type StockMovementType = 'entrada' | 'saida';

export interface Tutor {
  id: string;
  nome: string;
  whatsapp: string;
  instagram?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  tutor_id: string;
  nome: string;
  especie: Especie;
  raca?: string | null;
  idade?: string | null;
  peso?: string | null;
  sexo?: string | null;
  descricao?: string | null;
  observacoes?: string | null;
  created_at: string;
  tutor?: Tutor;
  foto_url?: string | null;
}

export interface Vaccine {
  id: string;
  nome: string;
  fabricante?: string | null;
  descricao?: string | null;
  estoque_atual: number;
  estoque_minimo: number;
  protocolo_doses: number;
  intervalo_entre_doses: number;
  possui_reforco_anual: boolean;
  intervalo_reforco_anual: number;
  ativo: boolean;
  created_at: string;
}

export interface VaccineBatch {
  id: string;
  vaccine_id: string;
  lote: string;
  quantidade: number;
  data_validade?: string | null;
  created_at: string;
  vaccine?: Vaccine;
}

export interface Appointment {
  id: string;
  tutor_id: string;
  pet_id: string;
  vaccine_id: string;
  dose: string;
  data_agendada: string;
  horario_agendado?: string | null;
  status: AppointmentStatus;
  observacoes?: string | null;
  created_at: string;
  updated_at: string;
  tutor?: Tutor;
  pet?: Pet;
  vaccine?: Vaccine;
}

export interface VaccineApplication {
  id: string;
  appointment_id?: string | null;
  pet_id: string;
  vaccine_id: string;
  dose?: string | null;
  lote?: string | null;
  data_aplicacao: string;
  proxima_dose?: string | null;
  observacoes_clinicas?: string | null;
  assinatura_url?: string | null;
  profissional?: string | null;
  created_at: string;
  vaccine?: Vaccine;
  pet?: Pet;
  crmv?: string | null;
}

export interface StockMovement {
  id: string;
  vaccine_id: string;
  tipo: StockMovementType;
  quantidade: number;
  motivo?: string | null;
  application_id?: string | null;
  created_at: string;
  vaccine?: Vaccine;
}

export interface DigitalBooklet {
  id: string;
  pet_id: string;
  status_pagamento: PaymentStatus;
  codigo_validacao: string;
  qr_code_url?: string | null;
  pdf_url?: string | null;
  created_at: string;
  pet?: Pet;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  booklet_id: string;
  valor: number;
  metodo: string;
  status: string;
  transaction_id?: string | null;
  created_at: string;
}

export interface MessageLog {
  id: string;
  tutor_id?: string | null;
  pet_id?: string | null;
  tipo: string;
  mensagem: string;
  status: string;
  sent_at?: string | null;
  created_at: string;
}

export interface Settings {
  id: string;
  nome_farmacia: string;
  logo_url?: string | null;
  whatsapp?: string | null;
  endereco?: string | null;
  horario_funcionamento?: string | null;
  pdf_info?: string | null;
  booklet_price: number;
  message_templates: MessageTemplates;
  created_at: string;
  updated_at: string;
  instagram?: string | null;
  responsavel_tecnico?: string | null;
  crmv_clinica?: string | null;
}

export interface MessageTemplates {
  agendamento: string;
  confirmacao: string;
  lembrete: string;
  atrasada: string;
}

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: string;
  created_at: string;
}

export const DOSE_OPTIONS: DoseOption[] = [
  '1ª dose',
  '2ª dose',
  '3ª dose',
  '4ª dose',
  'Anual / Reforço',
];

export const ESPECIES: Especie[] = ['Cão', 'Gato', 'Outro'];

export const APPOINTMENT_STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; text: string; dot: string }
> = {
  agendado: {
    label: 'Agendado',
    color: 'blue',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
  },

  confirmado: {
    label: 'Confirmado',
    color: 'emerald',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },

  aplicado: {
    label: 'Aplicado',
    color: 'green',
    bg: 'bg-green-100 dark:bg-green-950/40',
    text: 'text-green-800 dark:text-green-300',
    dot: 'bg-green-600',
  },

  atrasado: {
    label: 'Atrasado',
    color: 'red',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
  },

  remarcado: {
    label: 'Remarcado',
    color: 'amber',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },

  cancelado: {
    label: 'Cancelado',
    color: 'gray',
    bg: 'bg-gray-100 dark:bg-slate-800',
    text: 'text-gray-600 dark:text-slate-300',
    dot: 'bg-gray-400 dark:bg-slate-500',
  },
};

export function getStatusConfig(status: AppointmentStatus) {
  return (
    APPOINTMENT_STATUS_CONFIG[status] || {
      label: status,
      color: 'gray',
      bg: 'bg-gray-100 dark:bg-slate-800',
      text: 'text-gray-600 dark:text-slate-300',
      dot: 'bg-gray-400 dark:bg-slate-500',
    }
  );
}
