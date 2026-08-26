import type {
  Tutor,
  Pet,
  Vaccine,
  Appointment,
  Settings,
} from '@/types/database';

import { formatDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ===========================================================
// PREENCHER TEMPLATE
// ===========================================================

export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(vars)) {
    result = result
      .split(`{${key}}`)
      .join(value);
  }

  return result;
}

// ===========================================================
// MENSAGEM DE AGENDAMENTO
// ===========================================================

export function buildAgendamentoMessage(
  tutor: Tutor,
  pet: Pet,
  vaccine: Vaccine,
  appointment: Appointment,
  settings: Settings | null
): string {
  const template =
    settings?.message_templates?.agendamento || '';

  return fillTemplate(template, {
    NOME: tutor.nome,
    PET: pet.nome,
    DATA: formatDate(appointment.data_agendada),
    HORA: appointment.horario_agendado || '',
    FARMACIA: settings?.nome_farmacia || 'VetFarm',
    VACINA: vaccine.nome,
    DOSE: appointment.dose || '',
  });
}

// ===========================================================
// MENSAGEM DE CONFIRMAÇÃO
// ===========================================================

export function buildConfirmacaoMessage(
  tutor: Tutor,
  pet: Pet,
  appointment: Appointment,
  settings: Settings | null
): string {
  const template =
    settings?.message_templates?.confirmacao || '';

  return fillTemplate(template, {
    NOME: tutor.nome,
    PET: pet.nome,
    DATA: formatDate(appointment.data_agendada),
    HORA: appointment.horario_agendado || '',
    FARMACIA: settings?.nome_farmacia || 'VetFarm',
  });
}

// ===========================================================
// LEMBRETE DE PRÓXIMA DOSE
// ===========================================================

export function buildLembreteMessage(
  tutor: Tutor,
  pet: Pet,
  vaccine: Vaccine,
  data: string,
  settings: Settings | null
): string {
  const template =
    settings?.message_templates?.lembrete || '';

  return fillTemplate(template, {
    NOME: tutor.nome,
    PET: pet.nome,
    VACINA: vaccine.nome,
    DATA: formatDate(data),
    FARMACIA: settings?.nome_farmacia || 'VetFarm',
  });
}

// ===========================================================
// VACINA ATRASADA
// ===========================================================

export function buildAtrasadaMessage(
  tutor: Tutor,
  pet: Pet,
  vaccine: Vaccine,
  settings: Settings | null
): string {
  const template =
    settings?.message_templates?.atrasada || '';

  return fillTemplate(template, {
    NOME: tutor.nome,
    PET: pet.nome,
    VACINA: vaccine.nome,
    FARMACIA: settings?.nome_farmacia || 'VetFarm',
  });
}

// ===========================================================
// PREPARAR NÚMERO
// ===========================================================

function prepareWhatsAppNumber(
  whatsapp: string
): string {
  let phone = whatsapp.replace(/\D/g, '');

  if (!phone.startsWith('55')) {
    phone = `55${phone}`;
  }

  return phone;
}

// ===========================================================
// NORMALIZAR TEXTO
// ===========================================================

function normalizeWhatsAppMessage(
  message: string
): string {
  return message.normalize('NFC');
}

// ===========================================================
// GERAR LINK DO WHATSAPP
// ===========================================================

export function buildWhatsAppLink(
  whatsapp: string,
  message: string
): string {
  const phone =
    prepareWhatsAppNumber(whatsapp);

  const normalizedMessage =
    normalizeWhatsAppMessage(message);

  const params =
    new URLSearchParams();

  params.set(
    'phone',
    phone
  );

  params.set(
    'text',
    normalizedMessage
  );

  return `https://api.whatsapp.com/send?${params.toString()}`;
}

// ===========================================================
// ABRIR WHATSAPP
// ===========================================================

export function openWhatsApp(
  whatsapp: string,
  message: string
): void {
  const link =
    buildWhatsAppLink(
      whatsapp,
      message
    );

  window.open(
    link,
    '_blank'
  );
}

// ===========================================================
// REGISTRAR MENSAGEM
// ===========================================================

export async function logMessage(
  tutorId: string,
  petId: string | null,
  tipo: string,
  mensagem: string,
  status: string = 'enviada'
): Promise<void> {
  const { error } =
    await supabase
      .from('message_logs')
      .insert({
        tutor_id: tutorId,
        pet_id: petId,
        tipo,
        mensagem,
        status,

        sent_at:
          status === 'enviada'
            ? new Date().toISOString()
            : null,
      });

  if (error) {
    console.error(
      'Erro ao registrar mensagem:',
      error
    );
  }
}