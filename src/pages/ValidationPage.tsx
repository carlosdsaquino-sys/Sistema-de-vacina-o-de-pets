import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useParams } from 'react-router-dom';

import { motion } from 'framer-motion';

import {
  PawPrint,
  CheckCircle2,
  ShieldCheck,
  Syringe,
  Calendar,
  CalendarDays,
  Phone,
  Instagram,
  MapPin,
  Lock,
  Clock,
  CreditCard,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';

import {
  formatDate,
  formatPhone,
} from '@/lib/utils';

import { QRCodeCanvas } from '@/components/QRCodeCanvas';

// ===========================================================
// TIPOS
// ===========================================================

type PaymentPlan =
  | 'mensal'
  | 'anual';

type BlockReason =
  | 'payment_required'
  | 'manual'
  | 'expired'
  | null;

type PublicBooklet = {
  codigo_validacao: string;

  status_pagamento:
    | 'nao_paga'
    | 'pendente'
    | 'paga'
    | 'expirada';

  liberada: boolean;

  plano_pagamento:
    | PaymentPlan
    | null;

  validade_ate:
    | string
    | null;

  created_at: string;
};

type PublicPet = {
  nome: string;
  especie: string;
  raca: string | null;
  idade: string | number | null;
  peso: number | null;
  sexo: string | null;
  foto_url: string | null;
};

type PublicTutor = {
  nome: string;
  whatsapp: string | null;
};

type PublicSettings = {
  nome_farmacia: string | null;
  logo_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  endereco: string | null;
};

type PublicApplication = {
  id: string;
  vaccine_nome: string;
  dose: string | null;
  lote: string | null;
  data_aplicacao: string;
  proxima_dose: string | null;
  profissional: string | null;
  crmv: string | null;
  assinada: boolean;
};

type PublicBookletResponse = {
  blocked: boolean;

  block_reason:
    BlockReason;

  booklet:
    PublicBooklet;

  pet?:
    | PublicPet
    | null;

  tutor?:
    | PublicTutor
    | null;

  settings:
    PublicSettings | null;

  applications?:
    PublicApplication[];
};

// ===========================================================
// CABEÇALHO DA EMPRESA
// ===========================================================

function CompanyHeader({
  settings,
}: {
  settings:
    PublicSettings | null;
}) {
  return (
    <div className="bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-6">

      <div className="max-w-2xl mx-auto">

        <div className="flex items-center gap-4">

          {/* LOGO */}

          {settings?.logo_url ? (
            <div className="h-20 w-20 shrink-0 rounded-2xl bg-white shadow-sm p-2 flex items-center justify-center overflow-hidden">

              <img
                src={
                  settings.logo_url
                }
                alt={
                  settings.nome_farmacia ||
                  'Logo da empresa'
                }
                className="h-full w-full object-contain"
              />

            </div>
          ) : (
            <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/15 flex items-center justify-center">

              <PawPrint className="w-8 h-8" />

            </div>
          )}

          <div className="min-w-0">

            <h1 className="text-2xl font-bold leading-tight">

              {settings?.nome_farmacia ||
                'VetFarm'}

            </h1>

            <p className="mt-1 text-sm text-white/80">
              Farmácia Veterinária
            </p>

            <p className="mt-1 text-xs font-medium text-white/70">
              Caderneta Digital de Vacinação
            </p>

          </div>

        </div>

        {/* CONTATO */}

        {(settings?.whatsapp ||
          settings?.instagram ||
          settings?.endereco) && (
          <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">

            {settings?.whatsapp && (
              <div className="flex items-center gap-2 text-white/90">

                <Phone className="w-4 h-4 shrink-0" />

                <span>
                  <span className="font-medium">
                    Telefone:
                  </span>{' '}

                  {formatPhone(
                    settings.whatsapp
                  )}
                </span>

              </div>
            )}

            {settings?.instagram && (
              <div className="flex items-center gap-2 text-white/90">

                <Instagram className="w-4 h-4 shrink-0" />

                <span>
                  <span className="font-medium">
                    Instagram:
                  </span>{' '}

                  {
                    settings.instagram
                  }
                </span>

              </div>
            )}

            {settings?.endereco && (
              <div className="flex items-start gap-2 text-white/90 sm:col-span-2">

                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />

                <span>
                  <span className="font-medium">
                    Endereço:
                  </span>{' '}

                  {
                    settings.endereco
                  }
                </span>

              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

// ===========================================================
// PÁGINA
// ===========================================================

export function ValidationPage() {
  const { code } =
    useParams<{
      code: string;
    }>();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    data,
    setData,
  ] =
    useState<PublicBookletResponse | null>(
      null
    );

  const [
    notFound,
    setNotFound,
  ] =
    useState(false);

  // =========================================================
  // CARREGAR
  // =========================================================

  const load =
    useCallback(
      async () => {
        if (!code) {
          setNotFound(
            true
          );

          setLoading(
            false
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setNotFound(
            false
          );

          const {
            data:
              bookletData,
            error,
          } =
            await supabase.rpc(
              'get_public_booklet',
              {
                p_codigo:
                  code,
              }
            );

          if (error) {
            console.error(
              'Erro ao validar caderneta:',
              error
            );

            setData(
              null
            );

            setNotFound(
              true
            );

            return;
          }

          if (
            !bookletData
          ) {
            setData(
              null
            );

            setNotFound(
              true
            );

            return;
          }

          setData(
            bookletData as PublicBookletResponse
          );
        } catch (
          error
        ) {
          console.error(
            'Erro ao carregar caderneta:',
            error
          );

          setData(
            null
          );

          setNotFound(
            true
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [code]
    );

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // LOADING
  // =========================================================

  if (
    loading
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

        <div className="animate-pulse">

          <PawPrint className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />

        </div>

      </div>
    );
  }

  // =========================================================
  // NÃO ENCONTRADA
  // =========================================================

  if (
    notFound ||
    !data
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="text-center max-w-md bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-xl p-8"
        >

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mx-auto mb-4">

            <ShieldCheck className="w-8 h-8" />

          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Caderneta não encontrada
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">
            O código de validação
            informado não corresponde
            a nenhuma caderneta digital
            válida.
          </p>

        </motion.div>

      </div>
    );
  }

  const {
    booklet,
    settings,
    block_reason,
  } = data;

  // =========================================================
  // CADERNETA BLOQUEADA
  // =========================================================

  if (
    data.blocked
  ) {
    const isExpired =
      block_reason ===
      'expired';

    const isManual =
      block_reason ===
      'manual';

    const isPaymentRequired =
      block_reason ===
      'payment_required';

    let title =
      'Caderneta ainda não liberada';

    let description =
      'O acesso a esta caderneta digital ainda não está disponível.';

    let detail =
      `Entre em contato com ${
        settings
          ?.nome_farmacia ||
        'VetFarm'
      } para realizar a liberação.`;

    if (
      isExpired
    ) {
      title =
        'Assinatura da caderneta vencida';

      description =
        'O período de acesso desta caderneta digital chegou ao fim.';

      detail =
        `Entre em contato com ${
          settings
            ?.nome_farmacia ||
          'VetFarm'
        } para renovar o plano mensal ou anual.`;
    }

    if (
      isManual
    ) {
      title =
        'Caderneta temporariamente bloqueada';

      description =
        'O acesso público a esta caderneta foi temporariamente suspenso.';

      detail =
        `Entre em contato com ${
          settings
            ?.nome_farmacia ||
          'VetFarm'
        } para mais informações.`;
    }

    if (
      isPaymentRequired
    ) {
      title =
        'Caderneta ainda não liberada';

      description =
        'Esta caderneta digital ainda está aguardando a liberação do acesso.';

      detail =
        `Entre em contato com ${
          settings
            ?.nome_farmacia ||
          'VetFarm'
        } para escolher o plano mensal ou anual.`;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

        <CompanyHeader
          settings={
            settings
          }
        />

        <div className="max-w-xl mx-auto px-4 py-12">

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration:
                0.35,
            }}
            className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl"
          >

            {/* ============================================= */}
            {/* BLOQUEIO */}
            {/* ============================================= */}

            <div className="px-6 pt-9 pb-7 text-center">

              <div
                className={`mx-auto flex h-20 w-20 items-center justify-center rounded-3xl ${
                  isExpired
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                    : isPaymentRequired
                      ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300'
                }`}
              >

                {isExpired ? (
                  <Clock className="w-9 h-9" />
                ) : isPaymentRequired ? (
                  <CreditCard className="w-9 h-9" />
                ) : (
                  <Lock className="w-9 h-9" />
                )}

              </div>

              <h2 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">

                {title}

              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500 dark:text-slate-400">

                {
                  description
                }

              </p>

              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-gray-500 dark:text-slate-400">

                {
                  detail
                }

              </p>

            </div>

            {/* ============================================= */}
            {/* INFORMAÇÕES DO PLANO */}
            {/* ============================================= */}

            {(booklet.plano_pagamento ||
              booklet.validade_ate) && (
              <div className="mx-6 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">

                {booklet.plano_pagamento && (
                  <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">

                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">

                      <CalendarDays className="w-4 h-4" />

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
                )}

                {booklet.validade_ate && (
                  <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 p-3">

                    <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">

                      <Calendar className="w-4 h-4" />

                      <span className="text-[10px] uppercase tracking-wide">
                        Validade
                      </span>

                    </div>

                    <p
                      className={`mt-1 text-sm font-semibold ${
                        isExpired
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-800 dark:text-slate-100'
                      }`}
                    >

                      {formatDate(
                        booklet.validade_ate
                      )}

                    </p>

                  </div>
                )}

              </div>
            )}

            {/* ============================================= */}
            {/* CONTATO */}
            {/* ============================================= */}

            {settings?.whatsapp && (
              <div className="mx-6 mb-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">

                    <Phone className="w-5 h-5" />

                  </div>

                  <div>

                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      Entre em contato
                    </p>

                    <p className="font-semibold text-gray-800 dark:text-slate-100">

                      {formatPhone(
                        settings.whatsapp
                      )}

                    </p>

                  </div>

                </div>

              </div>
            )}

            {/* ============================================= */}
            {/* CÓDIGO */}
            {/* ============================================= */}

            <div className="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/40 px-6 py-4 text-center">

              <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Código da caderneta
              </p>

              <p className="mt-1 font-mono text-sm font-semibold text-gray-600 dark:text-slate-300">

                {
                  booklet.codigo_validacao
                }

              </p>

            </div>

          </motion.div>

          <p className="mt-5 text-center text-xs text-gray-400 dark:text-slate-500">

            {settings?.nome_farmacia ||
              'VetFarm'}{' '}

            · Caderneta Digital

          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // CADERNETA LIBERADA
  // =========================================================

  const pet =
    data.pet;

  const tutor =
    data.tutor;

  const applications =
    data.applications ||
    [];

  if (
    !pet ||
    !tutor
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">

        <div className="max-w-md text-center">

          <ShieldCheck className="mx-auto h-10 w-10 text-gray-400" />

          <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            Dados indisponíveis
          </h1>

          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Não foi possível carregar
            os dados desta caderneta.
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // VISUAL DA CADERNETA
  // =========================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

      <CompanyHeader
        settings={
          settings
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden"
        >

          {/* ================================================= */}
          {/* STATUS */}
          {/* ================================================= */}

          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/30">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">

                <ShieldCheck className="w-5 h-5" />

              </div>

              <div>

                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Caderneta Validada
                </p>

                <p className="text-xs text-gray-500 dark:text-slate-400">

                  Código:{' '}

                  {
                    booklet.codigo_validacao
                  }

                </p>

              </div>

            </div>

            {/* PLANO */}

            {booklet.plano_pagamento && (
              <div className="sm:text-right">

                <p className="text-[10px] uppercase tracking-wide text-emerald-600/70 dark:text-emerald-400/70">
                  Plano
                </p>

                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">

                  {booklet.plano_pagamento ===
                  'mensal'
                    ? 'Mensal'
                    : 'Anual'}

                </p>

              </div>
            )}

          </div>

          {/* ================================================= */}
          {/* PET */}
          {/* ================================================= */}

          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800">

            <div className="flex items-center gap-3 mb-4">

              {pet.foto_url ? (
                <img
                  src={
                    pet.foto_url
                  }
                  alt={
                    pet.nome
                  }
                  className="h-16 w-16 rounded-2xl object-cover border border-gray-200 dark:border-slate-700"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">

                  <PawPrint className="w-7 h-7" />

                </div>
              )}

              <div>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white">

                  {
                    pet.nome
                  }

                </h2>

                <p className="text-sm text-gray-500 dark:text-slate-400">

                  {
                    pet.especie
                  }

                  {pet.raca
                    ? ` · ${pet.raca}`
                    : ''}

                  {pet.idade !==
                    null &&
                  pet.idade !==
                    undefined
                    ? ` · ${pet.idade}`
                    : ''}

                </p>

              </div>

            </div>

            {/* ============================================= */}
            {/* PLANO / VALIDADE */}
            {/* ============================================= */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">

              <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">

                  <CalendarDays className="w-4 h-4" />

                  <span className="text-[10px] uppercase tracking-wide">
                    Plano da Caderneta
                  </span>

                </div>

                <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100">

                  {booklet.plano_pagamento ===
                  'mensal'
                    ? 'Mensal'
                    : 'Anual'}

                </p>

              </div>

              <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">

                  <Calendar className="w-4 h-4" />

                  <span className="text-[10px] uppercase tracking-wide">
                    Válida até
                  </span>

                </div>

                <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">

                  {booklet.validade_ate
                    ? formatDate(
                        booklet.validade_ate
                      )
                    : '—'}

                </p>

              </div>

            </div>

            {/* ============================================= */}
            {/* TUTOR */}
            {/* ============================================= */}

            {tutor.nome && (
              <div className="space-y-1 text-sm text-gray-600 dark:text-slate-300">

                <div>

                  <span className="text-gray-400 dark:text-slate-500">
                    Tutor:{' '}
                  </span>

                  <span className="font-medium">

                    {
                      tutor.nome
                    }

                  </span>

                </div>

                {tutor.whatsapp && (
                  <div>

                    <span className="text-gray-400 dark:text-slate-500">
                      WhatsApp:{' '}
                    </span>

                    <span className="font-medium">

                      {formatPhone(
                        tutor.whatsapp
                      )}

                    </span>

                  </div>
                )}

              </div>
            )}

          </div>

          {/* ================================================= */}
          {/* HISTÓRICO */}
          {/* ================================================= */}

          <div className="px-6 py-5">

            <h3 className="font-semibold text-gray-800 dark:text-slate-100 mb-4 flex items-center gap-2">

              <Syringe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

              Histórico de Vacinação

            </h3>

            {applications.length ===
            0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                Nenhuma vacina aplicada registrada
              </p>
            ) : (
              <div className="space-y-3">

                {applications.map(
                  (
                    app,
                    index
                  ) => (
                    <motion.div
                      key={
                        app.id
                      }
                      initial={{
                        opacity: 0,
                        x: -10,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay:
                          index *
                          0.05,
                      }}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 p-3"
                    >

                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />

                      <div className="flex-1 min-w-0">

                        <p className="font-medium text-gray-800 dark:text-slate-100">

                          {
                            app.vaccine_nome
                          }

                        </p>

                        <p className="text-xs text-gray-500 dark:text-slate-400">

                          {app.dose ||
                            'Dose'}{' '}

                          ·{' '}

                          {formatDate(
                            app.data_aplicacao
                          )}

                          {app.lote &&
                            ` · Lote: ${app.lote}`}

                        </p>

                        {(app.profissional ||
                          app.crmv) && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">

                            Veterinário:{' '}

                            <span className="font-medium text-gray-700 dark:text-slate-300">

                              {app.profissional ||
                                '—'}

                              {app.crmv &&
                                ` · ${app.crmv}`}

                            </span>

                          </p>
                        )}

                        {app.assinada && (
                          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">

                            <CheckCircle2 className="w-3.5 h-3.5" />

                            Aplicação assinada pelo veterinário

                          </p>
                        )}

                      </div>

                      {app.proxima_dose && (
                        <div className="text-right shrink-0">

                          <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1 justify-end">

                            <Calendar className="w-3 h-3" />

                            Próxima

                          </p>

                          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">

                            {formatDate(
                              app.proxima_dose
                            )}

                          </p>

                        </div>
                      )}

                    </motion.div>
                  )
                )}

              </div>
            )}

          </div>

          {/* ================================================= */}
          {/* QR CODE */}
          {/* ================================================= */}

          <div className="px-6 py-5 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex flex-col items-center">

            <QRCodeCanvas
              value={`${window.location.origin}/validar/${booklet.codigo_validacao}`}
              size={100}
            />

            <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">
              QR Code de validação
            </p>

          </div>

        </motion.div>

        {/* ================================================= */}
        {/* RODAPÉ */}
        {/* ================================================= */}

        <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">

          {settings?.nome_farmacia ||
            'VetFarm'}{' '}

          · Caderneta Digital gerada em{' '}

          {formatDate(
            booklet.created_at
          )}

        </p>

      </div>

    </div>
  );
}