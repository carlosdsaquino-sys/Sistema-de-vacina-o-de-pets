import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  MessageCircle,
  PawPrint,
  RefreshCw,
  Syringe,
  User,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';

import { useToast } from '@/contexts/ToastContext';

import { supabase } from '@/lib/supabase';

import {
  formatDate,
  formatPhone,
} from '@/lib/utils';

import {
  openWhatsApp,
} from '@/lib/whatsapp';

// =========================================================
// TIPOS
// =========================================================

interface QueueTutor {
  id: string;
  nome: string;
  whatsapp: string | null;
}

interface QueuePet {
  id: string;
  nome: string;
}

interface QueueVaccine {
  nome: string;
}

interface QueueApplication {
  id: string;
  vaccine: QueueVaccine | null;
}

interface MessageQueueItem {
  id: string;

  tutor_id: string;
  pet_id: string | null;
  application_id: string | null;

  tipo: string;
  mensagem: string;
  status: string;

  scheduled_for: string | null;

  created_at: string;
  sent_at: string | null;

  tutor: QueueTutor | null;
  pet: QueuePet | null;

  application:
    | QueueApplication
    | null;
}

// =========================================================
// PÁGINA
// =========================================================

export function MessagesPage() {
  const { toast } = useToast();

  const [messages, setMessages] =
    useState<MessageQueueItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [markingId, setMarkingId] =
    useState<string | null>(null);

  // =======================================================
  // CARREGAR FILA
  // =======================================================

  const loadMessages =
    useCallback(async () => {
      const { data, error } =
        await supabase
          .from('message_logs')
          .select(`
            id,
            tutor_id,
            pet_id,
            application_id,
            tipo,
            mensagem,
            status,
            scheduled_for,
            created_at,
            sent_at,

            tutor:tutors!message_logs_org_tutor_fkey (
              id,
              nome,
              whatsapp
            ),

            pet:pets!message_logs_org_pet_fkey (
              id,
              nome
            ),

            application:vaccine_applications!message_logs_org_application_fkey (
              id,

              vaccine:vaccines!vaccine_applications_org_vaccine_fkey (
                nome
              )
            )
          `)
          .in(
            'tipo',
            [
              'lembrete',
              'atrasada',
            ]
          )
          .eq(
            'status',
            'pendente'
          )
          .order(
            'scheduled_for',
            {
              ascending: true,
              nullsFirst: false,
            }
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

      if (error) {
        console.error(
          'Erro ao carregar mensagens:',
          error
        );

        toast(
          'Erro ao carregar a Central de Mensagens',
          'error'
        );

        // Propaga o erro para impedir que refreshQueue
        // mostre uma mensagem falsa de sucesso.
        throw error;
      }

      setMessages(
        (data || []) as unknown as MessageQueueItem[]
      );
    }, [toast]);

  // =======================================================
  // GERAR NOVOS LEMBRETES AUTOMATICAMENTE
  // =======================================================

  const generateQueue =
    useCallback(async () => {
      const {
        data,
        error,
      } =
        await supabase.rpc(
          'generate_whatsapp_queue'
        );

      if (error) {
        console.error(
          'Erro ao gerar fila:',
          error
        );

        throw error;
      }

      return data;
    }, []);

  // =======================================================
  // ATUALIZAR CENTRAL
  // =======================================================

  const refreshQueue =
    useCallback(
      async (
        showToast = false
      ) => {
        setRefreshing(true);

        try {
          await generateQueue();

          await loadMessages();

          if (showToast) {
            toast(
              'Central de mensagens atualizada!'
            );
          }
        } catch (
          err: unknown
        ) {
          console.error(err);

          toast(
            'Erro ao atualizar as mensagens',
            'error'
          );
        } finally {
          setRefreshing(false);
        }
      },
      [
        generateQueue,
        loadMessages,
        toast,
      ]
    );

  // =======================================================
  // PRIMEIRO CARREGAMENTO
  // =======================================================

  useEffect(() => {
    const init =
      async () => {
        setLoading(true);

        try {
          await generateQueue();

          await loadMessages();
        } catch (
          err
        ) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

    init();
  }, [
    generateQueue,
    loadMessages,
  ]);

  // =======================================================
  // ABRIR WHATSAPP
  // =======================================================

  const handleOpenWhatsApp = (
    item: MessageQueueItem
  ) => {
    if (!item.tutor) {
      toast(
        'Tutor não encontrado',
        'error'
      );

      return;
    }

    if (
      !item.tutor.whatsapp
    ) {
      toast(
        'O tutor não possui WhatsApp cadastrado',
        'warning'
      );

      return;
    }

    if (
      !item.mensagem?.trim()
    ) {
      toast(
        'A mensagem está vazia',
        'warning'
      );

      return;
    }

    openWhatsApp(
      item.tutor.whatsapp,
      item.mensagem
    );
  };

  // =======================================================
  // MARCAR COMO ENVIADA
  // =======================================================

  const handleMarkAsSent =
    async (
      item: MessageQueueItem
    ) => {
      setMarkingId(
        item.id
      );

      try {
        const { error } =
          await supabase
            .from(
              'message_logs'
            )
            .update({
              status:
                'enviada',

              sent_at:
                new Date()
                  .toISOString(),
            })
            .eq(
              'id',
              item.id
            );

        if (error) {
          throw error;
        }

        setMessages(
          (current) =>
            current.filter(
              (message) =>
                message.id !==
                item.id
            )
        );

        toast(
          'Mensagem marcada como enviada!'
        );
      } catch (
        err: unknown
      ) {
        console.error(
          err
        );

        toast(
          'Erro ao atualizar a mensagem',
          'error'
        );
      } finally {
        setMarkingId(
          null
        );
      }
    };

  // =======================================================
  // CONTADORES
  // =======================================================

  const reminderCount =
    useMemo(
      () =>
        messages.filter(
          (item) =>
            item.tipo ===
            'lembrete'
        ).length,
      [messages]
    );

  const overdueCount =
    useMemo(
      () =>
        messages.filter(
          (item) =>
            item.tipo ===
            'atrasada'
        ).length,
      [messages]
    );

  // =======================================================
  // VISUAL
  // =======================================================

  return (
    <Layout
      title="Central de Mensagens"
      actions={
        <Button
          variant="outline"
          onClick={() =>
            refreshQueue(
              true
            )
          }
          disabled={
            refreshing
          }
        >
          <RefreshCw
            className={`w-4 h-4 ${
              refreshing
                ? 'animate-spin'
                : ''
            }`}
          />

          Atualizar
        </Button>
      }
    >
      <PageHeader
        title="Central de Mensagens"
        description="Lembretes automáticos de próxima dose e vacinas atrasadas"
      />

      {/* ================================================= */}
      {/* RESUMO */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">

        {/* TOTAL */}

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">

                <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Pendentes
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {messages.length}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

        {/* PRÓXIMA DOSE */}

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">

                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />

              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Próxima dose
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {reminderCount}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

        {/* ATRASADAS */}

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/30">

                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />

              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Vacinas atrasadas
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {overdueCount}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

      </div>

      {/* ================================================= */}
      {/* LISTA */}
      {/* ================================================= */}

      {loading ? (
        <SkeletonList
          count={4}
        />
      ) : messages.length ===
        0 ? (
        <EmptyState
          icon={
            <CheckCircle2 className="w-8 h-8" />
          }
          title="Nenhuma mensagem pendente"
          description="Todos os lembretes e avisos estão em dia."
        />
      ) : (
        <div className="space-y-4">

          {messages.map(
            (
              item,
              index
            ) => {
              const isReminder =
                item.tipo ===
                'lembrete';

              const vaccineName =
                item.application
                  ?.vaccine
                  ?.nome ||
                'Vacina';

              return (
                <motion.div
                  key={
                    item.id
                  }
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
                      0.04,
                  }}
                >
                  <Card hover>
                    <CardBody>

                      <div className="flex flex-col xl:flex-row xl:items-start gap-5">

                        {/* ================================= */}
                        {/* ÍCONE */}
                        {/* ================================= */}

                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                            isReminder
                              ? 'bg-amber-50 dark:bg-amber-950/30'
                              : 'bg-red-50 dark:bg-red-950/30'
                          }`}
                        >
                          {isReminder ? (
                            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>

                        {/* ================================= */}
                        {/* CONTEÚDO */}
                        {/* ================================= */}

                        <div className="flex-1 min-w-0">

                          <div className="flex flex-wrap items-center gap-2 mb-3">

                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                isReminder
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                              }`}
                            >
                              {isReminder
                                ? 'Lembrete de Próxima Dose'
                                : 'Vacina Atrasada'}
                            </span>

                            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-300">
                              Pendente
                            </span>

                          </div>

                          {/* PET / TUTOR / VACINA */}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

                            <div className="flex items-center gap-2">

                              <PawPrint className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                  Pet
                                </p>

                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {item.pet
                                    ?.nome ||
                                    '—'}
                                </p>
                              </div>

                            </div>

                            <div className="flex items-center gap-2">

                              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                  Tutor
                                </p>

                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {item.tutor
                                    ?.nome ||
                                    '—'}
                                </p>

                                {item.tutor
                                  ?.whatsapp && (
                                  <p className="text-xs text-gray-500 dark:text-slate-400">
                                    {formatPhone(
                                      item
                                        .tutor
                                        .whatsapp
                                    )}
                                  </p>
                                )}
                              </div>

                            </div>

                            <div className="flex items-center gap-2">

                              <Syringe className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                  Vacina
                                </p>

                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {vaccineName}
                                </p>
                              </div>

                            </div>

                            <div className="flex items-center gap-2">

                              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />

                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                                  {isReminder
                                    ? 'Próxima dose'
                                    : 'Data prevista'}
                                </p>

                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {item.scheduled_for
                                    ? formatDate(
                                        item.scheduled_for
                                      )
                                    : '—'}
                                </p>
                              </div>

                            </div>

                          </div>

                          {/* MENSAGEM */}

                          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 p-4">

                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">
                              Mensagem preparada
                            </p>

                            <p className="text-sm leading-6 text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                              {item.mensagem}
                            </p>

                          </div>

                        </div>

                        {/* ================================= */}
                        {/* AÇÕES */}
                        {/* ================================= */}

                        <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0">

                          <Button
                            variant="success"
                            onClick={() =>
                              handleOpenWhatsApp(
                                item
                              )
                            }
                          >
                            <MessageCircle className="w-4 h-4" />

                            Abrir WhatsApp
                          </Button>

                          <Button
                            variant="outline"
                            loading={
                              markingId ===
                              item.id
                            }
                            disabled={
                              markingId !==
                              null
                            }
                            onClick={() =>
                              handleMarkAsSent(
                                item
                              )
                            }
                          >
                            <CheckCircle2 className="w-4 h-4" />

                            Marcar como enviado
                          </Button>

                        </div>

                      </div>

                    </CardBody>
                  </Card>
                </motion.div>
              );
            }
          )}

        </div>
      )}

    </Layout>
  );
}
