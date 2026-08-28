import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import {
  CalendarDays,
  CalendarPlus,
  Check,
  X,
  Clock,
  RotateCcw,
  Syringe,
  MessageCircle,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';

import { useToast } from '@/contexts/ToastContext';

import { supabase } from '@/lib/supabase';

import {
  formatDate,
  todayISO,
  isOverdue,
} from '@/lib/utils';

import {
  buildConfirmacaoMessage,
  buildAtrasadaMessage,
  openWhatsApp,
  logMessage,
} from '@/lib/whatsapp';

import type {
  Appointment,
  AppointmentStatus,
  Settings,
} from '@/types/database';

type DateFilter =
  | 'hoje'
  | 'amanha'
  | 'semana'
  | 'todos';

const TIME_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

export function AppointmentsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [settings, setSettings] =
    useState<Settings | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [dateFilter, setDateFilter] =
    useState<DateFilter>('hoje');

  const [cancelTarget, setCancelTarget] =
    useState<Appointment | null>(null);

  const [
    rescheduleTarget,
    setRescheduleTarget,
  ] = useState<Appointment | null>(null);

  const [newDate, setNewDate] =
    useState('');

  const [newTime, setNewTime] =
    useState('');

  const [
    rescheduling,
    setRescheduling,
  ] = useState(false);

  // =========================================================
  // CARREGAR AGENDAMENTOS
  // =========================================================

  const load = useCallback(async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from('appointments')
        .select(`
          *,
          tutor:tutors!appointments_org_tutor_fkey(*),
          pet:pets!appointments_org_pet_fkey(*),
          vaccine:vaccines!appointments_org_vaccine_fkey(*)
        `)
        .order(
          'data_agendada',
          {
            ascending: true,
          }
        );

    if (error) {
      console.error(
        'Erro ao carregar agendamentos:',
        error
      );

      toast(
        'Erro ao carregar agendamentos',
        'error'
      );

      setLoading(false);

      return;
    }

    let list =
      (data as Appointment[]) || [];

    // =======================================================
    // MARCAR ATRASADOS
    // =======================================================

    const overdueIds =
      list
        .filter((a) =>
          isOverdue(
            a.data_agendada,
            a.status
          )
        )
        .map((a) => a.id);

    if (overdueIds.length > 0) {
      await supabase
        .from('appointments')
        .update({
          status: 'atrasado',
        })
        .in(
          'id',
          overdueIds
        );

      list =
        list.map((a) =>
          overdueIds.includes(a.id)
            ? {
                ...a,
                status:
                  'atrasado' as AppointmentStatus,
              }
            : a
        );
    }

    setAppointments(list);

    setLoading(false);
  }, [toast]);

  // =========================================================
  // CARREGAR CONFIGURAÇÕES
  // =========================================================

  const loadSettings =
    useCallback(async () => {
      const { data, error } =
        await supabase
          .from('settings')
          .select('*')
          .limit(1);

      if (error) {
        console.error(
          'Erro ao carregar configurações:',
          error
        );

        return;
      }

      setSettings(
        (data as Settings[])?.[0] ||
          null
      );
    }, []);

  useEffect(() => {
    load();
    loadSettings();
  }, [load, loadSettings]);

  // =========================================================
  // FILTROS
  // =========================================================

  const filtered =
    appointments.filter(
      (a) => {
        const q =
          search.toLowerCase();

        const matchSearch =
          a.pet?.nome
            ?.toLowerCase()
            .includes(q) ||
          a.tutor?.nome
            ?.toLowerCase()
            .includes(q) ||
          a.vaccine?.nome
            ?.toLowerCase()
            .includes(q);

        if (!matchSearch) {
          return false;
        }

        const today =
          todayISO();

        const aptDate =
          a.data_agendada;

        const todayDate =
          new Date(
            today +
              'T00:00:00'
          );

        const aDate =
          new Date(
            aptDate +
              'T00:00:00'
          );

        const diffDays =
          Math.round(
            (
              aDate.getTime() -
              todayDate.getTime()
            ) /
              (
                1000 *
                60 *
                60 *
                24
              )
          );

        switch (dateFilter) {
          case 'hoje':
            return (
              aptDate ===
              today
            );

          case 'amanha':
            return (
              diffDays ===
              1
            );

          case 'semana':
            return (
              diffDays >= 0 &&
              diffDays <= 7
            );

          case 'todos':
            return true;

          default:
            return true;
        }
      }
    );

  // =========================================================
  // ATUALIZAR STATUS
  // =========================================================

  const updateStatus =
    async (
      apt: Appointment,
      status: AppointmentStatus
    ) => {
      const { error } =
        await supabase
          .from('appointments')
          .update({
            status,
          })
          .eq(
            'id',
            apt.id
          );

      if (error) {
        toast(
          'Erro ao atualizar status',
          'error'
        );

        return;
      }

      toast(
        'Status atualizado com sucesso'
      );

      load();
    };

  // =========================================================
  // WHATSAPP - PEDIR CONFIRMAÇÃO
  // =========================================================

  const handleRequestConfirmation =
    (
      apt: Appointment
    ) => {
      if (
        !apt.tutor ||
        !apt.pet
      ) {
        toast(
          'Tutor ou pet não encontrado',
          'error'
        );

        return;
      }

      if (!apt.tutor.whatsapp) {
        toast(
          'O tutor não possui WhatsApp cadastrado',
          'warning'
        );

        return;
      }

      const message =
        buildConfirmacaoMessage(
          apt.tutor,
          apt.pet,
          apt,
          settings
        );

      if (!message.trim()) {
        toast(
          'O template de confirmação está vazio. Configure a mensagem em Configurações.',
          'warning'
        );

        return;
      }

      openWhatsApp(
        apt.tutor.whatsapp,
        message
      );

      void logMessage(
        apt.tutor.id,
        apt.pet.id,
        'confirmacao',
        message,
        'preparada'
      );
    };

  // =========================================================
  // WHATSAPP - VACINA ATRASADA
  // =========================================================

  const handleOverdueMessage =
    (
      apt: Appointment
    ) => {
      if (
        !apt.tutor ||
        !apt.pet ||
        !apt.vaccine
      ) {
        toast(
          'Dados do agendamento não encontrados',
          'error'
        );

        return;
      }

      if (!apt.tutor.whatsapp) {
        toast(
          'O tutor não possui WhatsApp cadastrado',
          'warning'
        );

        return;
      }

      const message =
        buildAtrasadaMessage(
          apt.tutor,
          apt.pet,
          apt.vaccine,
          settings
        );

      if (!message.trim()) {
        toast(
          'O template de vacina atrasada está vazio. Configure a mensagem em Configurações.',
          'warning'
        );

        return;
      }

      openWhatsApp(
        apt.tutor.whatsapp,
        message
      );

      void logMessage(
        apt.tutor.id,
        apt.pet.id,
        'atrasada',
        message,
        'preparada'
      );
    };

  // =========================================================
  // CANCELAR
  // =========================================================

  const handleCancel =
    async () => {
      if (!cancelTarget) {
        return;
      }

      await updateStatus(
        cancelTarget,
        'cancelado'
      );

      setCancelTarget(
        null
      );
    };

  // =========================================================
  // ABRIR REMARCAÇÃO
  // =========================================================

  const openReschedule =
    (
      apt: Appointment
    ) => {
      const today =
        todayISO();

      setRescheduleTarget(
        apt
      );

      setNewDate(
        apt.data_agendada <
          today
          ? today
          : apt.data_agendada
      );

      setNewTime(
        apt
          .horario_agendado
          ?.slice(
            0,
            5
          ) || ''
      );
    };

  // =========================================================
  // FECHAR REMARCAÇÃO
  // =========================================================

  const closeReschedule =
    () => {
      if (rescheduling) {
        return;
      }

      setRescheduleTarget(
        null
      );

      setNewDate('');

      setNewTime('');
    };

  // =========================================================
  // REMARCAR
  // =========================================================

  const handleReschedule =
    async () => {
      if (!rescheduleTarget) {
        return;
      }

      if (!newDate) {
        toast(
          'Selecione a nova data',
          'warning'
        );

        return;
      }

      if (!newTime) {
        toast(
          'Selecione o novo horário',
          'warning'
        );

        return;
      }

      setRescheduling(true);

      try {
        const { error } =
          await supabase
            .from('appointments')
            .update({
              data_agendada:
                newDate,

              horario_agendado:
                newTime,

              status:
                'agendado',
            })
            .eq(
              'id',
              rescheduleTarget.id
            );

        if (error) {
          throw error;
        }

        toast(
          'Agendamento remarcado com sucesso!'
        );

        setRescheduleTarget(
          null
        );

        setNewDate('');

        setNewTime('');

        await load();
      } catch (
        err: unknown
      ) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erro ao remarcar agendamento';

        toast(
          message,
          'error'
        );
      } finally {
        setRescheduling(
          false
        );
      }
    };

  // =========================================================
  // BOTÕES DE FILTRO
  // =========================================================

  const filterButtons: {
    key: DateFilter;
    label: string;
  }[] = [
    {
      key: 'hoje',
      label: 'Hoje',
    },
    {
      key: 'amanha',
      label: 'Amanhã',
    },
    {
      key: 'semana',
      label:
        'Esta Semana',
    },
    {
      key: 'todos',
      label: 'Todos',
    },
  ];

  // =========================================================
  // VISUAL
  // =========================================================

  return (
    <Layout
      title="Agenda"
      actions={
        <Button
          onClick={() =>
            navigate(
              '/novo-agendamento'
            )
          }
        >
          <CalendarPlus className="w-4 h-4" />

          Novo Agendamento
        </Button>
      }
    >
      <PageHeader
        title="Agenda"
        description="Gerencie todos os agendamentos de vacinação"
      />

      {/* =================================================== */}
      {/* FILTROS */}
      {/* =================================================== */}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por pet, tutor ou vacina..."
          className="flex-1"
        />

        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-900 p-1 overflow-x-auto no-scrollbar">

          {filterButtons.map(
            (btn) => (
              <button
                key={btn.key}
                onClick={() =>
                  setDateFilter(
                    btn.key
                  )
                }
                className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  dateFilter ===
                  btn.key
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                {btn.label}
              </button>
            )
          )}

        </div>

      </div>

      {/* =================================================== */}
      {/* LISTA */}
      {/* =================================================== */}

      {loading ? (
        <SkeletonList
          count={5}
        />
      ) : filtered.length ===
        0 ? (
        <EmptyState
          icon={
            <CalendarDays className="w-8 h-8" />
          }
          title="Nenhum agendamento encontrado"
          description="Crie um novo agendamento para começar"
          action={
            <Button
              onClick={() =>
                navigate(
                  '/novo-agendamento'
                )
              }
            >
              <CalendarPlus className="w-4 h-4" />

              Novo Agendamento
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">

          {filtered.map(
            (
              apt,
              index
            ) => (
              <motion.div
                key={apt.id}
                initial={{
                  opacity: 0,
                  y: 10,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    index *
                    0.03,
                }}
              >
                <Card hover>

                  <CardBody>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                      {/* =================================== */}
                      {/* INFORMAÇÕES */}
                      {/* =================================== */}

                      <div className="flex items-center gap-3 flex-1 min-w-0">

                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">

                          <span className="text-[10px] font-medium leading-none">

                            {apt
                              .horario_agendado
                              ?.slice(
                                0,
                                5
                              ) ||
                              '--'}

                          </span>

                          <Clock className="w-3 h-3 mt-0.5" />

                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex items-center gap-2">

                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">

                              {
                                apt
                                  .pet
                                  ?.nome
                              }

                            </h3>

                            <StatusBadge
                              status={
                                apt.status
                              }
                            />

                          </div>

                          <p className="text-sm text-gray-500 dark:text-slate-400 truncate">

                            {
                              apt
                                .tutor
                                ?.nome
                            }{' '}

                            ·{' '}

                            {
                              apt
                                .vaccine
                                ?.nome
                            }{' '}

                            ·{' '}

                            {
                              apt.dose
                            }

                          </p>

                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">

                            {formatDate(
                              apt.data_agendada
                            )}

                            {apt.horario_agendado &&
                              ` às ${apt.horario_agendado.slice(
                                0,
                                5
                              )}`}

                          </p>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* AÇÕES */}
                      {/* =================================== */}

                      {apt.status !==
                        'aplicado' &&
                        apt.status !==
                          'cancelado' && (
                          <div className="flex flex-wrap gap-1.5">

                            {/* ============================= */}
                            {/* PEDIR CONFIRMAÇÃO */}
                            {/* ============================= */}

                            {apt.status ===
                              'agendado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleRequestConfirmation(
                                    apt
                                  )
                                }
                              >
                                <MessageCircle className="w-3.5 h-3.5" />

                                Pedir confirmação
                              </Button>
                            )}

                            {/* ============================= */}
                            {/* CONFIRMAR */}
                            {/* ============================= */}

                            {apt.status ===
                              'agendado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStatus(
                                    apt,
                                    'confirmado'
                                  )
                                }
                              >
                                <Check className="w-3.5 h-3.5" />

                                Confirmar
                              </Button>
                            )}

                            {/* ============================= */}
                            {/* AVISAR VACINA ATRASADA */}
                            {/* ============================= */}

                            {apt.status ===
                              'atrasado' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleOverdueMessage(
                                    apt
                                  )
                                }
                              >
                                <MessageCircle className="w-3.5 h-3.5" />

                                Avisar tutor
                              </Button>
                            )}

                            {/* ============================= */}
                            {/* APLICAR */}
                            {/* ============================= */}

                            <Button
                              size="sm"
                              variant="success"
                              onClick={() =>
                                navigate(
                                  `/aplicacoes?apt=${apt.id}`
                                )
                              }
                            >
                              <Syringe className="w-3.5 h-3.5" />

                              Aplicar
                            </Button>

                            {/* ============================= */}
                            {/* REMARCAR */}
                            {/* ============================= */}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openReschedule(
                                  apt
                                )
                              }
                            >
                              <RotateCcw className="w-3.5 h-3.5" />

                              Remarcar
                            </Button>

                            {/* ============================= */}
                            {/* CANCELAR */}
                            {/* ============================= */}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setCancelTarget(
                                  apt
                                )
                              }
                            >
                              <X className="w-3.5 h-3.5" />

                              Cancelar
                            </Button>

                          </div>
                        )}

                    </div>

                  </CardBody>

                </Card>
              </motion.div>
            )
          )}

        </div>
      )}

      {/* =================================================== */}
      {/* REMARCAR AGENDAMENTO */}
      {/* =================================================== */}

      <Modal
        open={
          !!rescheduleTarget
        }
        onClose={
          closeReschedule
        }
        title="Remarcar Agendamento"
        description={
          rescheduleTarget
            ? `${
                rescheduleTarget
                  .pet
                  ?.nome ||
                'Pet'
              } · ${
                rescheduleTarget
                  .vaccine
                  ?.nome ||
                'Vacina'
              }`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={
                closeReschedule
              }
              disabled={
                rescheduling
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleReschedule
              }
              loading={
                rescheduling
              }
              disabled={
                !newDate ||
                !newTime
              }
            >
              <RotateCcw className="w-4 h-4" />

              Confirmar Remarcação
            </Button>
          </>
        }
      >
        {rescheduleTarget && (
          <div className="space-y-5">

            {/* ============================================= */}
            {/* AGENDAMENTO ATUAL */}
            {/* ============================================= */}

            <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 p-4">

              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                Agendamento atual
              </p>

              <div className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">

                <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />

                <span>

                  {formatDate(
                    rescheduleTarget.data_agendada
                  )}

                  {rescheduleTarget.horario_agendado &&
                    ` às ${rescheduleTarget.horario_agendado.slice(
                      0,
                      5
                    )}`}

                </span>

              </div>

            </div>

            {/* ============================================= */}
            {/* NOVA DATA */}
            {/* ============================================= */}

            <Input
              label="Nova data"
              type="date"
              value={newDate}
              min={todayISO()}
              onChange={(e) =>
                setNewDate(
                  e.target.value
                )
              }
              required
            />

            {/* ============================================= */}
            {/* NOVO HORÁRIO */}
            {/* ============================================= */}

            <div>

              <div className="flex items-center gap-2 mb-3">

                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />

                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Novo horário
                </label>

              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">

                {TIME_SLOTS.map(
                  (time) => (
                    <button
                      key={
                        time
                      }
                      type="button"
                      onClick={() =>
                        setNewTime(
                          time
                        )
                      }
                      className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                        newTime ===
                        time
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/10'
                          : 'border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {time}
                    </button>
                  )
                )}

              </div>

              {newTime && (
                <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">

                  Novo horário selecionado:{' '}

                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {newTime}
                  </span>

                </p>
              )}

            </div>

          </div>
        )}
      </Modal>

      {/* =================================================== */}
      {/* CANCELAR AGENDAMENTO */}
      {/* =================================================== */}

      <ConfirmDialog
        open={
          !!cancelTarget
        }
        onClose={() =>
          setCancelTarget(
            null
          )
        }
        onConfirm={
          handleCancel
        }
        title="Cancelar Agendamento"
        message={`Tem certeza que deseja cancelar o agendamento de ${cancelTarget?.pet?.nome}?`}
        confirmLabel="Sim, Cancelar"
        danger
      />

    </Layout>
  );
}