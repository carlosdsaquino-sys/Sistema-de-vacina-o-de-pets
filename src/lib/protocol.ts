import type { Vaccine, VaccineApplication } from '@/types/database';
import { addDays, todayISO } from '@/lib/utils';

export interface ProtocolResult {
  nextDoseLabel: string | null;
  nextDoseDate: string | null;
  isComplete: boolean;
}

export function getNextDoseInfo(
  appliedDose: string,
  vaccine: Vaccine,
  applicationDate: string
): ProtocolResult {
  const doseMap: Record<string, number> = {
    '1ª dose': 1,
    '2ª dose': 2,
    '3ª dose': 3,
    '4ª dose': 4,
    'Anual / Reforço': 99,
  };

  const currentDoseNum = doseMap[appliedDose] ?? 0;

  if (currentDoseNum === 99) {
    if (vaccine.possui_reforco_anual) {
      return {
        nextDoseLabel: 'Anual / Reforço',
        nextDoseDate: addDays(applicationDate, vaccine.intervalo_reforco_anual),
        isComplete: false,
      };
    }
    return { nextDoseLabel: null, nextDoseDate: null, isComplete: true };
  }

  if (currentDoseNum >= vaccine.protocolo_doses) {
    if (vaccine.possui_reforco_anual) {
      return {
        nextDoseLabel: 'Anual / Reforço',
        nextDoseDate: addDays(applicationDate, vaccine.intervalo_reforco_anual),
        isComplete: false,
      };
    }
    return { nextDoseLabel: null, nextDoseDate: null, isComplete: true };
  }

  const nextDoseNum = currentDoseNum + 1;
  const nextDoseLabel = `${nextDoseNum}ª dose`;
  const nextDoseDate = addDays(applicationDate, vaccine.intervalo_entre_doses);

  return {
    nextDoseLabel,
    nextDoseDate,
    isComplete: false,
  };
}

export interface PetVaccineStatus {
  vaccine: Vaccine;
  status: 'em_dia' | 'pendente' | 'atrasada' | 'incompleto' | 'nao_iniciado';
  lastApplication?: VaccineApplication;
  nextDoseDate?: string | null;
  nextDoseLabel?: string | null;
  totalDoses: number;
  appliedDoses: number;
}

export function analyzePetVaccinationStatus(
  petApplications: VaccineApplication[],
  allVaccines: Vaccine[]
): PetVaccineStatus[] {
  const results: PetVaccineStatus[] = [];

  for (const vaccine of allVaccines) {
    const apps = petApplications
      .filter((a) => a.vaccine_id === vaccine.id)
      .sort((a, b) => new Date(b.data_aplicacao).getTime() - new Date(a.data_aplicacao).getTime());

    if (apps.length === 0) {
      results.push({
        vaccine,
        status: 'nao_iniciado',
        totalDoses: vaccine.protocolo_doses,
        appliedDoses: 0,
        nextDoseLabel: '1ª dose',
        nextDoseDate: null,
      });
      continue;
    }

    const lastApp = apps[0];
    const appliedDoses = apps.filter((a) => a.dose !== 'Anual / Reforço').length;

    if (lastApp.proxima_dose) {
      const today = todayISO();
      const isOverdue = lastApp.proxima_dose < today;

      results.push({
        vaccine,
        status: isOverdue ? 'atrasada' : 'pendente',
        lastApplication: lastApp,
        nextDoseDate: lastApp.proxima_dose,
        nextDoseLabel: getNextDoseLabel(lastApp, vaccine),
        totalDoses: vaccine.protocolo_doses,
        appliedDoses,
      });
    } else {
      results.push({
        vaccine,
        status: 'em_dia',
        lastApplication: lastApp,
        totalDoses: vaccine.protocolo_doses,
        appliedDoses,
        nextDoseDate: null,
        nextDoseLabel: null,
      });
    }
  }

  return results;
}

function getNextDoseLabel(lastApp: VaccineApplication, vaccine: Vaccine): string | null {
  const doseMap: Record<string, number> = {
    '1ª dose': 1,
    '2ª dose': 2,
    '3ª dose': 3,
    '4ª dose': 4,
    'Anual / Reforço': 99,
  };

  const lastDoseNum = doseMap[lastApp.dose || ''] ?? 0;

  if (lastDoseNum === 99 || lastDoseNum >= vaccine.protocolo_doses) {
    return vaccine.possui_reforco_anual ? 'Anual / Reforço' : null;
  }

  return `${lastDoseNum + 1}ª dose`;
}
