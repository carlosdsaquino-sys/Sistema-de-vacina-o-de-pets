import { motion } from 'framer-motion';
import { Clock, MapPin } from 'lucide-react';
import type { Appointment } from '@/types/database';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: () => void;
  index?: number;
}

export function AppointmentCard({ appointment, onClick, index = 0 }: AppointmentCardProps) {
  const petName = appointment.pet?.nome || 'Pet';
  const tutorName = appointment.tutor?.nome || 'Tutor';
  const vaccineName = appointment.vaccine?.nome || 'Vacina';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all',
        onClick && 'cursor-pointer hover:shadow-md hover:border-emerald-200'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{petName}</p>
            <p className="text-sm text-gray-500 truncate">{tutorName}</p>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="font-medium text-gray-700">{vaccineName}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-600">{appointment.dose}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <MapPin className="w-3.5 h-3.5" />
        <span>{formatDate(appointment.data_agendada)}</span>
        {appointment.horario_agendado && (
          <>
            <span className="text-gray-300">·</span>
            <span>{appointment.horario_agendado}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
