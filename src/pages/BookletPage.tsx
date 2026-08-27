import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  BookOpen,
  Plus,
  Download,
  QrCode,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  PawPrint,
  CalendarDays,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';

import {
  Card,
  CardBody,
} from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { QRCodeCanvas } from '@/components/QRCodeCanvas';

import { useToast } from '@/contexts/ToastContext';

import { supabase } from '@/lib/supabase';

import {
  formatDate,
  formatCurrency,
  generateValidationCode,
} from '@/lib/utils';

import { generateBookletPDF } from '@/lib/pdf';

import type {
  Pet,
  DigitalBooklet,
  Settings,
  VaccineApplication,
  PaymentStatus,
} from '@/types/database';

// ===========================================================
// TIPOS
// ===========================================================

type PaymentPlan =
  | 'mensal'
  | 'anual';

type BookletWithPlan =
  DigitalBooklet & {
    liberada: boolean;
    plano_pagamento: PaymentPlan;
    validade_ate: string | null;
  };

type SettingsWithPlans =
  Settings & {
    booklet_price_monthly:
      number | null;

    booklet_price_annual:
      number | null;
  };

// ===========================================================
// HELPERS DE DATA
// ===========================================================

function parseDateOnly(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function toDateOnly(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function getTodayDateOnly() {
  return toDateOnly(
    new Date()
  );
}

// ===========================================================
// SOMAR MESES SEM PROBLEMA COM DIA 29/30/31
// ===========================================================

function addMonths(
  date: Date,
  months: number
) {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  const day =
    date.getDate();

  const targetMonth =
    month + months;

  const firstDay =
    new Date(
      year,
      targetMonth,
      1
    );

  const lastDay =
    new Date(
      firstDay.getFullYear(),
      firstDay.getMonth() + 1,
      0
    ).getDate();

  return new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    Math.min(
      day,
      lastDay
    )
  );
}

// ===========================================================
// SOMAR ANO
// ===========================================================

function addYears(
  date: Date,
  years: number
) {
  const year =
    date.getFullYear() +
    years;

  const month =
    date.getMonth();

  const day =
    date.getDate();

  const lastDay =
    new Date(
      year,
      month + 1,
      0
    ).getDate();

  return new Date(
    year,
    month,
    Math.min(
      day,
      lastDay
    )
  );
}

// ===========================================================
// PÁGINA
// ===========================================================

export function BookletPage() {
  const { toast } =
    useToast();

  const [
    pets,
    setPets,
  ] =
    useState<Pet[]>([]);

  const [
    booklets,
    setBooklets,
  ] =
    useState<
      BookletWithPlan[]
    >([]);

  const [
    settings,
    setSettings,
  ] =
    useState<SettingsWithPlans | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  // =========================================================
  // MODAIS
  // =========================================================

  const [
    createModal,
    setCreateModal,
  ] =
    useState(false);

  const [
    payModal,
    setPayModal,
  ] =
    useState(false);

  const [
    viewModal,
    setViewModal,
  ] =
    useState(false);

  // =========================================================
  // SELEÇÕES
  // =========================================================

  const [
    selectedPet,
    setSelectedPet,
  ] =
    useState('');

  const [
    payBooklet,
    setPayBooklet,
  ] =
    useState<BookletWithPlan | null>(
      null
    );

  const [
    viewBooklet,
    setViewBooklet,
  ] =
    useState<BookletWithPlan | null>(
      null
    );

  const [
    paymentPlan,
    setPaymentPlan,
  ] =
    useState<PaymentPlan>(
      'anual'
    );

  const [
    applications,
    setApplications,
  ] =
    useState<
      VaccineApplication[]
    >([]);

  // =========================================================
  // BLOQUEAR / LIBERAR
  // =========================================================

  const [
    accessTarget,
    setAccessTarget,
  ] =
    useState<BookletWithPlan | null>(
      null
    );

  const [
    accessAction,
    setAccessAction,
  ] =
    useState<
      'block' |
      'release' |
      null
    >(null);

  const [
    changingAccess,
    setChangingAccess,
  ] =
    useState(false);

  // =========================================================
  // LOADINGS
  // =========================================================

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    paying,
    setPaying,
  ] =
    useState(false);

  // =========================================================
  // PREÇOS
  // =========================================================

  const monthlyPrice =
    settings
      ?.booklet_price_monthly ??
    settings?.booklet_price ??
    19.9;

  const annualPrice =
    settings
      ?.booklet_price_annual ??
    settings?.booklet_price ??
    19.9;

  const selectedPrice =
    paymentPlan ===
    'mensal'
      ? monthlyPrice
      : annualPrice;

  // =========================================================
  // VERIFICAR VENCIMENTO
  // =========================================================

  const isExpired = (
    booklet: BookletWithPlan
  ) => {
    if (
      !booklet.validade_ate
    ) {
      return false;
    }

    return (
      booklet.validade_ate <
      getTodayDateOnly()
    );
  };

  // =========================================================
  // ACESSO EFETIVO
  // =========================================================

  const hasAccess = (
    booklet: BookletWithPlan
  ) => {
    return (
      booklet.status_pagamento ===
        'paga' &&
      booklet.liberada ===
        true &&
      !isExpired(booklet)
    );
  };

  // =========================================================
  // CARREGAR
  // =========================================================

  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        try {
          const [
            petsResult,
            bookletsResult,
            settingsResult,
          ] =
            await Promise.all([
              supabase
                .from('pets')
                .select(
                  '*, tutor:tutors(*)'
                )
                .eq(
                  'ativo',
                  true
                )
                .order(
                  'nome'
                ),

              supabase
                .from(
                  'digital_booklets'
                )
                .select(
                  '*, pet:pets(*, tutor:tutors(*)), payments(*)'
                )
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                ),

              supabase
                .from(
                  'settings'
                )
                .select('*')
                .limit(1),
            ]);

          if (
            petsResult.error
          ) {
            throw petsResult.error;
          }

          if (
            bookletsResult.error
          ) {
            throw bookletsResult.error;
          }

          if (
            settingsResult.error
          ) {
            throw settingsResult.error;
          }

          setPets(
            (petsResult.data as Pet[]) ||
              []
          );

          setBooklets(
            (bookletsResult.data as BookletWithPlan[]) ||
              []
          );

          setSettings(
            (
              settingsResult.data as
                SettingsWithPlans[]
            )?.[0] ||
              null
          );
        } catch (
          error
        ) {
          console.error(
            'Erro ao carregar cadernetas:',
            error
          );

          toast(
            'Erro ao carregar cadernetas',
            'error'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [toast]
    );

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // NOVA CADERNETA
  // =========================================================

  const openCreate =
    () => {
      setSelectedPet(
        pets[0]?.id ||
          ''
      );

      setCreateModal(
        true
      );
    };

  const handleCreate =
    async () => {
      if (
        !selectedPet
      ) {
        toast(
          'Selecione um pet',
          'error'
        );

        return;
      }

      setSaving(
        true
      );

      try {
        const existing =
          booklets.find(
            (booklet) =>
              booklet.pet_id ===
              selectedPet
          );

        if (
          existing
        ) {
          toast(
            'Este pet já possui uma caderneta',
            'warning'
          );

          setCreateModal(
            false
          );

          return;
        }

        const {
          error,
        } =
          await supabase
            .from(
              'digital_booklets'
            )
            .insert({
              pet_id:
                selectedPet,

              status_pagamento:
                'nao_paga',

              liberada:
                false,

              plano_pagamento:
                'anual',

              validade_ate:
                null,

              codigo_validacao:
                generateValidationCode(),
            });

        if (error) {
          throw error;
        }

        toast(
          'Caderneta criada com sucesso!'
        );

        setCreateModal(
          false
        );

        await load();
      } catch (
        error
      ) {
        console.error(
          'Erro ao criar caderneta:',
          error
        );

        toast(
          'Erro ao criar caderneta',
          'error'
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  // =========================================================
  // ABRIR PAGAMENTO / RENOVAÇÃO
  // =========================================================

  const openPay = (
    booklet: BookletWithPlan
  ) => {
    setPayBooklet(
      booklet
    );

    setPaymentPlan(
      booklet.plano_pagamento ||
        'anual'
    );

    setPayModal(
      true
    );
  };

  // =========================================================
  // CALCULAR NOVA VALIDADE
  // =========================================================

  const calculateNewValidity =
    (
      booklet: BookletWithPlan,
      plan: PaymentPlan
    ) => {
      const today =
        parseDateOnly(
          getTodayDateOnly()
        );

      let baseDate =
        today;

      // Se ainda estiver válida,
      // acrescenta o novo período
      // depois da validade atual.
      if (
        booklet.validade_ate &&
        !isExpired(
          booklet
        )
      ) {
        baseDate =
          parseDateOnly(
            booklet.validade_ate
          );
      }

      const newDate =
        plan ===
        'mensal'
          ? addMonths(
              baseDate,
              1
            )
          : addYears(
              baseDate,
              1
            );

      return toDateOnly(
        newDate
      );
    };

  // =========================================================
  // PAGAR / RENOVAR
  // =========================================================

  const handlePay =
    async () => {
      if (
        !payBooklet
      ) {
        return;
      }

      setPaying(
        true
      );

      try {
        // Simulação Pix
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              1200
            )
        );

        const newValidity =
          calculateNewValidity(
            payBooklet,
            paymentPlan
          );

        // ===================================================
        // REGISTRAR PAGAMENTO
        // ===================================================

        const {
          error:
            paymentError,
        } =
          await supabase
            .from(
              'payments'
            )
            .insert({
              booklet_id:
                payBooklet.id,

              valor:
                selectedPrice,

              metodo:
                'pix',

              status:
                'aprovado',

              plano_pagamento:
                paymentPlan,

              transaction_id:
                `PIX_${Date.now()}`,
            });

        if (
          paymentError
        ) {
          throw paymentError;
        }

        // ===================================================
        // ATUALIZAR CADERNETA
        // ===================================================

        const {
          error:
            bookletError,
        } =
          await supabase
            .from(
              'digital_booklets'
            )
            .update({
              status_pagamento:
                'paga',

              plano_pagamento:
                paymentPlan,

              validade_ate:
                newValidity,

              // Se a caderneta já estava paga e ainda válida,
              // preserva o bloqueio/liberação manual atual.
              // Em primeira ativação ou renovação vencida, libera o acesso.
              liberada:
                payBooklet.status_pagamento === 'paga' &&
                !isExpired(payBooklet)
                  ? payBooklet.liberada
                  : true,
            })
            .eq(
              'id',
              payBooklet.id
            );

        if (
          bookletError
        ) {
          throw bookletError;
        }

        toast(
          paymentPlan ===
            'mensal'
            ? 'Plano mensal ativado com sucesso!'
            : 'Plano anual ativado com sucesso!'
        );

        setPayModal(
          false
        );

        setPayBooklet(
          null
        );

        await load();
      } catch (
        error
      ) {
        console.error(
          'Erro no pagamento:',
          error
        );

        toast(
          'Erro ao processar pagamento',
          'error'
        );
      } finally {
        setPaying(
          false
        );
      }
    };

  // =========================================================
  // BLOQUEAR
  // =========================================================

  const requestBlock = (
    booklet: BookletWithPlan
  ) => {
    setAccessTarget(
      booklet
    );

    setAccessAction(
      'block'
    );
  };

  // =========================================================
  // LIBERAR MANUALMENTE
  // =========================================================

  const requestRelease = (
    booklet: BookletWithPlan
  ) => {
    // Se está vencida,
    // precisa pagar novamente.
    if (
      isExpired(
        booklet
      ) ||
      booklet.status_pagamento !==
        'paga'
    ) {
      openPay(
        booklet
      );

      return;
    }

    setAccessTarget(
      booklet
    );

    setAccessAction(
      'release'
    );
  };

  // =========================================================
  // ALTERAR ACESSO
  // =========================================================

  const handleAccessChange =
    async () => {
      if (
        !accessTarget ||
        !accessAction
      ) {
        return;
      }

      setChangingAccess(
        true
      );

      try {
        const release =
          accessAction ===
          'release';

        const {
          error,
        } =
          await supabase
            .from(
              'digital_booklets'
            )
            .update({
              liberada:
                release,
            })
            .eq(
              'id',
              accessTarget.id
            );

        if (
          error
        ) {
          throw error;
        }

        toast(
          release
            ? 'Caderneta liberada novamente!'
            : 'Caderneta bloqueada com sucesso!'
        );

        setAccessTarget(
          null
        );

        setAccessAction(
          null
        );

        await load();
      } catch (
        error
      ) {
        console.error(
          'Erro ao alterar acesso:',
          error
        );

        toast(
          'Erro ao alterar acesso da caderneta',
          'error'
        );
      } finally {
        setChangingAccess(
          false
        );
      }
    };

  // =========================================================
  // VISUALIZAR
  // =========================================================

  const openView =
    async (
      booklet:
        BookletWithPlan
    ) => {
      setViewBooklet(
        booklet
      );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'vaccine_applications'
          )
          .select(
            '*, vaccine:vaccines(*)'
          )
          .eq(
            'pet_id',
            booklet.pet_id
          )
          .order(
            'data_aplicacao',
            {
              ascending:
                false,
            }
          );

      if (
        error
      ) {
        console.error(
          'Erro ao carregar aplicações:',
          error
        );

        toast(
          'Erro ao carregar histórico',
          'error'
        );

        return;
      }

      setApplications(
        (data as VaccineApplication[]) ||
          []
      );

      setViewModal(
        true
      );
    };

  // =========================================================
  // PDF
  // =========================================================

  const handleDownloadPDF =
    () => {
      if (
        !viewBooklet ||
        !viewBooklet.pet
      ) {
        return;
      }

      generateBookletPDF({
        pet:
          viewBooklet.pet,

        tutor:
          viewBooklet.pet
            .tutor,

        applications,

        booklet:
          viewBooklet,

        settings,
      });

      toast(
        'PDF gerado com sucesso!'
      );
    };

  // =========================================================
  // STATUS PAGAMENTO
  // =========================================================

  const statusConfig: Record<
    PaymentStatus,
    {
      label: string;
      bg: string;
      text: string;
      dot: string;
      icon: typeof Lock;
    }
  > = {
    nao_paga: {
      label:
        'Não Paga',

      bg:
        'bg-gray-100 dark:bg-slate-800',

      text:
        'text-gray-600 dark:text-slate-300',

      dot:
        'bg-gray-500 dark:bg-slate-400',

      icon:
        Lock,
    },

    pendente: {
      label:
        'Pendente',

      bg:
        'bg-amber-50 dark:bg-amber-950/40',

      text:
        'text-amber-700 dark:text-amber-300',

      dot:
        'bg-amber-500',

      icon:
        Clock,
    },

    paga: {
      label:
        'Paga',

      bg:
        'bg-emerald-50 dark:bg-emerald-950/40',

      text:
        'text-emerald-700 dark:text-emerald-300',

      dot:
        'bg-emerald-500',

      icon:
        CheckCircle2,
    },

    expirada: {
      label:
        'Expirada',

      bg:
        'bg-red-50 dark:bg-red-950/40',

      text:
        'text-red-700 dark:text-red-300',

      dot:
        'bg-red-500',

      icon:
        Lock,
    },
  };

  // =========================================================
  // TELA
  // =========================================================

  return (
    <Layout
      title="Caderneta Digital"
      actions={
        <Button
          onClick={
            openCreate
          }
          disabled={
            pets.length ===
            0
          }
        >
          <Plus className="w-4 h-4" />

          Nova Caderneta
        </Button>
      }
    >
      <PageHeader
        title="Caderneta Digital"
        description="Gerencie planos, pagamentos e acesso às cadernetas digitais"
      />

      {loading ? (
        <SkeletonList
          count={4}
        />
      ) : booklets.length ===
        0 ? (
        <EmptyState
          icon={
            <BookOpen className="w-8 h-8" />
          }
          title="Nenhuma caderneta criada"
          description="Crie uma caderneta digital e escolha um plano mensal ou anual"
          action={
            pets.length >
            0 ? (
              <Button
                onClick={
                  openCreate
                }
              >
                <Plus className="w-4 h-4" />

                Nova Caderneta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

          {booklets.map(
            (
              booklet,
              index
            ) => {
              const expired =
                isExpired(
                  booklet
                );

              const effectiveAccess =
                hasAccess(
                  booklet
                );

              const isPaid =
                booklet.status_pagamento ===
                'paga';

              const cfg =
                statusConfig[
                  booklet
                    .status_pagamento
                ] ||
                statusConfig.nao_paga;

              return (
                <motion.div
                  key={
                    booklet.id
                  }
                  initial={{
                    opacity:
                      0,
                    y:
                      10,
                  }}
                  animate={{
                    opacity:
                      1,
                    y:
                      0,
                  }}
                  transition={{
                    delay:
                      index *
                      0.04,
                  }}
                >
                  <Card hover>

                    <CardBody>

                      {/* =================================== */}
                      {/* PET + PAGAMENTO */}
                      {/* =================================== */}

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex items-center gap-3 min-w-0">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">

                            <PawPrint className="w-5 h-5" />

                          </div>

                          <div className="min-w-0">

                            <h3 className="font-semibold text-gray-900 dark:text-slate-100 truncate">

                              {
                                booklet
                                  .pet
                                  ?.nome
                              }

                            </h3>

                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">

                              {
                                booklet
                                  .pet
                                  ?.tutor
                                  ?.nome
                              }

                            </p>

                          </div>

                        </div>

                        {expired ? (
                          <Badge
                            className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
                            dot
                            dotColor="bg-red-500"
                          >
                            Vencida
                          </Badge>
                        ) : (
                          <Badge
                            className={`${cfg.bg} ${cfg.text}`}
                            dot
                            dotColor={
                              cfg.dot
                            }
                          >
                            {
                              cfg.label
                            }
                          </Badge>
                        )}

                      </div>

                      {/* =================================== */}
                      {/* PLANO */}
                      {/* =================================== */}

                      <div className="mt-4 grid grid-cols-2 gap-2">

                        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">

                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500">

                            <CreditCard className="w-3.5 h-3.5" />

                            <span className="text-[10px] uppercase tracking-wide">
                              Plano
                            </span>

                          </div>

                          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">

                            {booklet.plano_pagamento ===
                            'mensal'
                              ? 'Mensal'
                              : 'Anual'}

                          </p>

                        </div>

                        <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">

                          <div className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500">

                            <CalendarDays className="w-3.5 h-3.5" />

                            <span className="text-[10px] uppercase tracking-wide">
                              Validade
                            </span>

                          </div>

                          <p
                            className={`mt-1 text-sm font-semibold ${
                              expired
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-800 dark:text-slate-100'
                            }`}
                          >

                            {booklet.validade_ate
                              ? formatDate(
                                  booklet.validade_ate
                                )
                              : '—'}

                          </p>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* ACESSO */}
                      {/* =================================== */}

                      <div
                        className={`mt-3 flex items-center gap-3 rounded-xl border px-3 py-3 ${
                          expired
                            ? 'border-red-100 dark:border-red-900/50 bg-red-50/60 dark:bg-red-950/20'
                            : effectiveAccess
                              ? 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20'
                              : 'border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40'
                        }`}
                      >

                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            expired
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                              : effectiveAccess
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
                          }`}
                        >

                          {expired ? (
                            <Clock className="w-4 h-4" />
                          ) : effectiveAccess ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}

                        </div>

                        <div>

                          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">
                            Acesso público
                          </p>

                          <p
                            className={`text-sm font-semibold ${
                              expired
                                ? 'text-red-700 dark:text-red-400'
                                : effectiveAccess
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-gray-700 dark:text-slate-300'
                            }`}
                          >

                            {expired
                              ? 'Assinatura Vencida'
                              : effectiveAccess
                                ? 'Caderneta Liberada'
                                : 'Caderneta Bloqueada'}

                          </p>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* CÓDIGO */}
                      {/* =================================== */}

                      <div className="mt-3 rounded-lg bg-gray-50 dark:bg-slate-950/50 p-3">

                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          Código de Validação
                        </p>

                        <p className="font-mono text-sm font-semibold text-gray-700 dark:text-slate-200 mt-0.5">

                          {
                            booklet.codigo_validacao
                          }

                        </p>

                      </div>

                      {/* =================================== */}
                      {/* QR */}
                      {/* =================================== */}

                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">

                        <span>
                          Criada em{' '}
                          {formatDate(
                            booklet.created_at
                          )}
                        </span>

                        {effectiveAccess ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">

                            <QrCode className="w-3.5 h-3.5" />

                            QR Code ativo

                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400 font-medium">

                            <Lock className="w-3.5 h-3.5" />

                            QR bloqueado

                          </span>
                        )}

                      </div>

                      {/* =================================== */}
                      {/* BOTÕES */}
                      {/* =================================== */}

                      <div className="mt-4 space-y-2">

                        {/* NUNCA PAGOU */}

                        {!isPaid && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              openPay(
                                booklet
                              )
                            }
                          >

                            <CreditCard className="w-4 h-4" />

                            Escolher Plano e Liberar

                          </Button>
                        )}

                        {/* VENCIDA */}

                        {isPaid &&
                          expired && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                  openView(
                                    booklet
                                  )
                                }
                              >

                                <BookOpen className="w-4 h-4" />

                                Visualizar

                              </Button>

                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() =>
                                  openPay(
                                    booklet
                                  )
                                }
                              >

                                <RefreshCw className="w-4 h-4" />

                                Renovar Caderneta

                              </Button>
                            </>
                          )}

                        {/* PAGA E NÃO VENCIDA */}

                        {isPaid &&
                          !expired && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                  openView(
                                    booklet
                                  )
                                }
                              >

                                <BookOpen className="w-4 h-4" />

                                Visualizar Caderneta

                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                  openPay(
                                    booklet
                                  )
                                }
                              >

                                <RefreshCw className="w-4 h-4" />

                                Alterar / Renovar Plano

                              </Button>

                              {effectiveAccess ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestBlock(
                                      booklet
                                    )
                                  }
                                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30"
                                >

                                  <Lock className="w-4 h-4" />

                                  Bloquear Caderneta

                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestRelease(
                                      booklet
                                    )
                                  }
                                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                >

                                  <Unlock className="w-4 h-4" />

                                  Liberar Acesso

                                </button>
                              )}

                            </>
                          )}

                      </div>

                    </CardBody>

                  </Card>

                </motion.div>
              );
            }
          )}

        </div>
      )}

      {/* =================================================== */}
      {/* NOVA CADERNETA */}
      {/* =================================================== */}

      <Modal
        open={
          createModal
        }
        onClose={() =>
          setCreateModal(
            false
          )
        }
        title="Nova Caderneta Digital"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                setCreateModal(
                  false
                )
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleCreate
              }
              loading={
                saving
              }
            >
              Criar
            </Button>
          </>
        }
      >

        <Select
          label="Selecione o Pet"
          value={
            selectedPet
          }
          onChange={(e) =>
            setSelectedPet(
              e.target.value
            )
          }
          required
        >

          <option value="">
            Selecione...
          </option>

          {pets.map(
            (pet) => (
              <option
                key={
                  pet.id
                }
                value={
                  pet.id
                }
              >
                {pet.nome}{' '}
                (
                {pet.tutor?.nome}
                )
              </option>
            )
          )}

        </Select>

        <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
          A caderneta será criada
          bloqueada. O plano mensal
          ou anual será escolhido na
          hora da liberação.
        </p>

      </Modal>

      {/* =================================================== */}
      {/* PAGAMENTO / RENOVAÇÃO */}
      {/* =================================================== */}

      <Modal
        open={
          payModal
        }
        onClose={() => {
          if (
            paying
          ) {
            return;
          }

          setPayModal(
            false
          );

          setPayBooklet(
            null
          );
        }}
        title={
          !payBooklet
            ? 'Plano da Caderneta'
            : isExpired(
                payBooklet
              )
              ? 'Renovar Caderneta'
              : payBooklet.status_pagamento === 'paga'
                ? 'Alterar / Renovar Plano'
                : 'Liberar Caderneta'
        }
        description="Escolha o plano de acesso à caderneta digital"
      >

        <div className="space-y-5">

          {/* =============================================== */}
          {/* PET */}
          {/* =============================================== */}

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">

              <PawPrint className="w-5 h-5" />

            </div>

            <div>

              <p className="text-xs text-gray-400 dark:text-slate-500">
                Caderneta
              </p>

              <p className="font-semibold text-gray-900 dark:text-white">
                {
                  payBooklet
                    ?.pet
                    ?.nome
                }
              </p>

            </div>

          </div>

          {/* =============================================== */}
          {/* ESCOLHER PLANO */}
          {/* =============================================== */}

          <div>

            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              Escolha o plano
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* MENSAL */}

              <button
                type="button"
                onClick={() =>
                  setPaymentPlan(
                    'mensal'
                  )
                }
                className={`relative rounded-2xl border-2 p-4 text-left transition ${
                  paymentPlan ===
                  'mensal'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-gray-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-900'
                }`}
              >

                {paymentPlan ===
                  'mensal' && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">

                    <CheckCircle2 className="w-3.5 h-3.5" />

                  </div>
                )}

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">

                  <CalendarDays className="w-4 h-4" />

                </div>

                <p className="mt-3 font-bold text-gray-900 dark:text-white">
                  Mensal
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Acesso por 1 mês
                </p>

                <p className="mt-3 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(
                    monthlyPrice
                  )}
                </p>

              </button>

              {/* ANUAL */}

              <button
                type="button"
                onClick={() =>
                  setPaymentPlan(
                    'anual'
                  )
                }
                className={`relative rounded-2xl border-2 p-4 text-left transition ${
                  paymentPlan ===
                  'anual'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-gray-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-900'
                }`}
              >

                {paymentPlan ===
                  'anual' && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">

                    <CheckCircle2 className="w-3.5 h-3.5" />

                  </div>
                )}

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">

                  <CalendarDays className="w-4 h-4" />

                </div>

                <p className="mt-3 font-bold text-gray-900 dark:text-white">
                  Anual
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  Acesso por 1 ano
                </p>

                <p className="mt-3 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(
                    annualPrice
                  )}
                </p>

              </button>

            </div>

          </div>

          {/* =============================================== */}
          {/* RESUMO */}
          {/* =============================================== */}

          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 p-4">

            <div className="flex items-center justify-between gap-3">

              <span className="text-sm text-gray-500 dark:text-slate-400">
                Plano
              </span>

              <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                {paymentPlan ===
                'mensal'
                  ? 'Mensal'
                  : 'Anual'}
              </span>

            </div>

            <div className="mt-2 flex items-center justify-between gap-3">

              <span className="text-sm text-gray-500 dark:text-slate-400">
                Período
              </span>

              <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                {paymentPlan ===
                'mensal'
                  ? '1 mês'
                  : '1 ano'}
              </span>

            </div>

            <div className="mt-3 border-t border-gray-200 dark:border-slate-800 pt-3 flex items-center justify-between gap-3">

              <span className="font-semibold text-gray-700 dark:text-slate-200">
                Total
              </span>

              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(
                  selectedPrice
                )}
              </span>

            </div>

          </div>

          {/* =============================================== */}
          {/* PAGAR */}
          {/* =============================================== */}

          <Button
            className="w-full"
            onClick={
              handlePay
            }
            loading={
              paying
            }
          >

            <QrCode className="w-4 h-4" />

            {paying
              ? 'Processando...'
              : `Confirmar Pagamento - ${formatCurrency(
                  selectedPrice
                )}`}

          </Button>

        </div>

      </Modal>

      {/* =================================================== */}
      {/* VISUALIZAR */}
      {/* =================================================== */}

      <Modal
        open={
          viewModal
        }
        onClose={() =>
          setViewModal(
            false
          )
        }
        title="Caderneta Digital"
        size="xl"
        footer={
          <Button
            onClick={
              handleDownloadPDF
            }
          >
            <Download className="w-4 h-4" />

            Baixar PDF
          </Button>
        }
      >

        {viewBooklet && (
          <div className="space-y-4">

            <div className="flex items-start justify-between gap-4">

              <div className="flex items-center gap-4">

                {viewBooklet.pet
                  ?.foto_url ? (
                  <img
                    src={
                      viewBooklet
                        .pet
                        .foto_url
                    }
                    alt={
                      viewBooklet
                        .pet.nome
                    }
                    className="h-20 w-20 rounded-2xl object-cover border border-gray-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">

                    <PawPrint className="w-9 h-9" />

                  </div>
                )}

                <div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">

                    {
                      viewBooklet
                        .pet
                        ?.nome
                    }

                  </h3>

                  <p className="text-sm text-gray-500 dark:text-slate-400">

                    Tutor:{' '}

                    {
                      viewBooklet
                        .pet
                        ?.tutor
                        ?.nome
                    }

                  </p>

                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">

                    Plano:{' '}

                    <span className="font-medium">
                      {viewBooklet.plano_pagamento ===
                      'mensal'
                        ? 'Mensal'
                        : 'Anual'}
                    </span>

                  </p>

                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">

                    Validade:{' '}

                    <span className="font-medium">
                      {viewBooklet.validade_ate
                        ? formatDate(
                            viewBooklet.validade_ate
                          )
                        : '—'}
                    </span>

                  </p>

                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">

                    Código:{' '}

                    {
                      viewBooklet.codigo_validacao
                    }

                  </p>

                </div>

              </div>

              <div className="flex flex-col items-center rounded-lg bg-white p-2">

                <QRCodeCanvas
                  value={`${window.location.origin}/validar/${viewBooklet.codigo_validacao}`}
                  size={120}
                />

                <p className="text-xs text-gray-500 mt-1">
                  QR de validação
                </p>

              </div>

            </div>

            {/* HISTÓRICO */}

            <div className="border-t border-gray-100 dark:border-slate-800 pt-4">

              <h4 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">
                Histórico de Vacinação
              </h4>

              {applications.length ===
              0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                  Nenhuma aplicação registrada
                </p>
              ) : (
                <div className="space-y-2">

                  {applications.map(
                    (
                      application
                    ) => (
                      <div
                        key={
                          application.id
                        }
                        className="rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                      >

                        <div className="flex items-start gap-3">

                          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />

                          <div className="flex-1 min-w-0">

                            <p className="font-medium text-gray-800 dark:text-slate-100">

                              {
                                application
                                  .vaccine
                                  ?.nome
                              }

                            </p>

                            <p className="text-xs text-gray-500 dark:text-slate-400">

                              {application.dose ||
                                'Dose'}{' '}

                              ·{' '}

                              {formatDate(
                                application.data_aplicacao
                              )}

                              {application.lote &&
                                ` · Lote: ${application.lote}`}

                            </p>

                            {(application.profissional ||
                              application.crmv) && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">

                                Veterinário:{' '}

                                <span className="font-medium text-gray-700 dark:text-slate-300">

                                  {application.profissional ||
                                    '—'}

                                  {application.crmv &&
                                    ` · ${application.crmv}`}

                                </span>

                              </p>
                            )}

                          </div>

                          {application.proxima_dose && (
                            <div className="text-right shrink-0">

                              <p className="text-xs text-gray-400 dark:text-slate-500">
                                Próxima
                              </p>

                              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">

                                {formatDate(
                                  application.proxima_dose
                                )}

                              </p>

                            </div>
                          )}

                        </div>

                        {application.assinatura_url && (
                          <div className="mt-3 ml-8">

                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                              Assinatura do Veterinário
                            </p>

                            <div className="inline-flex rounded-lg bg-white border border-gray-200 p-2">

                              <img
                                src={
                                  application.assinatura_url
                                }
                                alt={`Assinatura de ${
                                  application.profissional ||
                                  'veterinário'
                                }`}
                                className="h-16 w-auto object-contain"
                              />

                            </div>

                          </div>
                        )}

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

          </div>
        )}

      </Modal>

      {/* =================================================== */}
      {/* CONFIRMAR BLOQUEIO */}
      {/* =================================================== */}

      <ConfirmDialog
        open={
          !!accessTarget
        }
        onClose={() => {
          if (
            changingAccess
          ) {
            return;
          }

          setAccessTarget(
            null
          );

          setAccessAction(
            null
          );
        }}
        onConfirm={
          handleAccessChange
        }
        title={
          accessAction ===
          'block'
            ? 'Bloquear Caderneta'
            : 'Liberar Caderneta'
        }
        message={
          accessAction ===
          'block'
            ? `Deseja bloquear o acesso público à caderneta de "${accessTarget?.pet?.nome}"? A assinatura continuará válida e poderá ser liberada novamente.`
            : `Deseja liberar novamente o acesso público à caderneta de "${accessTarget?.pet?.nome}"?`
        }
        confirmLabel={
          accessAction ===
          'block'
            ? 'Bloquear'
            : 'Liberar'
        }
        danger={
          accessAction ===
          'block'
        }
      />

    </Layout>
  );
}