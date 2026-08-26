import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===========================================================
// DATAS
// ===========================================================

/**
 * Converte uma data YYYY-MM-DD para Date em horário LOCAL.
 *
 * Evita o problema:
 * new Date('2027-08-29')
 * ser interpretado como UTC e virar 28/08 no Brasil.
 */
function parseLocalDate(date: string | Date): Date {
  if (date instanceof Date) {
    return new Date(date);
  }

  // Data simples vinda do PostgreSQL:
  // 2027-08-29
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date
      .split('-')
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  // Timestamp completo:
  // 2027-08-29T13:30:00...
  return new Date(date);
}

/**
 * Transforma Date em YYYY-MM-DD usando horário LOCAL.
 *
 * Não usa toISOString(), pois toISOString trabalha em UTC.
 */
function toLocalISODate(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// ===========================================================
// FORMATAR DATA
// ===========================================================

export function formatDate(
  date: string | Date
): string {
  const d = parseLocalDate(date);

  return d.toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );
}

// ===========================================================
// FORMATAR DATA + HORA
// ===========================================================

export function formatDateTime(
  date: string | Date
): string {
  const d = parseLocalDate(date);

  return d.toLocaleString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

// ===========================================================
// FORMATAR HORA
// ===========================================================

export function formatTime(
  date: string | Date
): string {
  const d = parseLocalDate(date);

  return d.toLocaleTimeString(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

// ===========================================================
// MOEDA
// ===========================================================

export function formatCurrency(
  value: number
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
    }
  ).format(value);
}

// ===========================================================
// CÓDIGO DA CADERNETA
// ===========================================================

export function generateValidationCode(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const segments = [
    '',
    '',
    '',
    '',
  ];

  return segments
    .map(() =>
      Array.from(
        { length: 4 },
        () =>
          chars[
            Math.floor(
              Math.random() *
                chars.length
            )
          ]
      ).join('')
    )
    .join('-');
}

// ===========================================================
// INICIAIS
// ===========================================================

export function getInitials(
  name: string
): string {
  const parts =
    name.trim().split(' ');

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}

// ===========================================================
// DIFERENÇA ENTRE DATAS
// ===========================================================

export function daysBetween(
  date1: string | Date,
  date2: string | Date
): number {
  const d1 =
    parseLocalDate(date1);

  const d2 =
    parseLocalDate(date2);

  // Normaliza horário
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);

  const diff =
    d2.getTime() -
    d1.getTime();

  return Math.round(
    diff /
      (1000 *
        60 *
        60 *
        24)
  );
}

// ===========================================================
// ADICIONAR DIAS
// ===========================================================

export function addDays(
  date: string | Date,
  days: number
): string {
  const d =
    parseLocalDate(date);

  d.setDate(
    d.getDate() + days
  );

  return toLocalISODate(d);
}

// ===========================================================
// DATA DE HOJE
// ===========================================================

export function todayISO(): string {
  return toLocalISODate(
    new Date()
  );
}

// ===========================================================
// TELEFONE
// ===========================================================

export function normalizePhone(
  phone: string
): string {
  return phone.replace(
    /\D/g,
    ''
  );
}

export function formatPhone(
  phone: string
): string {
  const digits =
    normalizePhone(phone);

  if (
    digits.length === 11
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      7
    )}-${digits.slice(7)}`;
  }

  if (
    digits.length === 10
  ) {
    return `(${digits.slice(
      0,
      2
    )}) ${digits.slice(
      2,
      6
    )}-${digits.slice(6)}`;
  }

  return phone;
}

// ===========================================================
// VERIFICAR ATRASO
// ===========================================================

export function isOverdue(
  dataAgendada: string,
  status: string
): boolean {
  if (
    [
      'aplicado',
      'cancelado',
    ].includes(status)
  ) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const agendada =
    parseLocalDate(
      dataAgendada
    );

  agendada.setHours(
    0,
    0,
    0,
    0
  );

  return (
    agendada < today
  );
}