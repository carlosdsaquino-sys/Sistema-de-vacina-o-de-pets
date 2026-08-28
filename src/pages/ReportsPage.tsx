import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Syringe,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Boxes,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { StatCard } from '@/components/StatCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { todayISO, addDays } from '@/lib/utils';
import type {
  VaccineApplication,
  Appointment,
  StockMovement,
  Vaccine,
} from '@/types/database';

type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'mes' | 'custom';

export function ReportsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodFilter>('30dias');
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [loading, setLoading] = useState(true);

  const [applications, setApplications] = useState<VaccineApplication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const getDateRange = useCallback((): {
    start: string;
    end: string;
  } => {
    const today = todayISO();

    switch (period) {
      case 'hoje':
        return {
          start: today,
          end: today,
        };

      case '7dias':
        return {
          start: addDays(today, -7),
          end: today,
        };

      case '30dias':
        return {
          start: addDays(today, -30),
          end: today,
        };

      case 'mes': {
        const d = new Date();

        return {
          start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
            2,
            '0'
          )}-01`,
          end: today,
        };
      }

      case 'custom':
        return {
          start: customStart,
          end: customEnd,
        };

      default:
        return {
          start: today,
          end: today,
        };
    }
  }, [period, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { start, end } = getDateRange();

      /*
       * As relações multiempresa criaram uma FK simples e outra
       * composta para algumas tabelas. Em vez de pedir ao PostgREST
       * para adivinhar qual FK usar, carregamos as vacinas separadamente
       * e montamos a relação no frontend.
       */
      const [
        appsResult,
        apptsResult,
        movsResult,
        vaccinesResult,
      ] = await Promise.all([
        supabase
          .from('vaccine_applications')
          .select('*')
          .gte('data_aplicacao', start)
          .lte('data_aplicacao', end)
          .order('data_aplicacao', { ascending: false }),

        supabase
          .from('appointments')
          .select('*')
          .gte('data_agendada', start)
          .lte('data_agendada', end),

        supabase
          .from('stock_movements')
          .select('*')
          .gte('created_at', start + 'T00:00:00')
          .lte('created_at', end + 'T23:59:59'),

        supabase
          .from('vaccines')
          .select('*'),
      ]);

      const firstError =
        appsResult.error ||
        apptsResult.error ||
        movsResult.error ||
        vaccinesResult.error;

      if (firstError) {
        throw firstError;
      }

      const vaccineList =
        (vaccinesResult.data as Vaccine[]) || [];

      const vaccineById = new Map(
        vaccineList.map((vaccine) => [
          vaccine.id,
          vaccine,
        ])
      );

      const appList =
        ((appsResult.data as VaccineApplication[]) || []).map(
          (application) => ({
            ...application,
            vaccine: vaccineById.get(application.vaccine_id),
          })
        );

      const appointmentList =
        ((apptsResult.data as Appointment[]) || []).map(
          (appointment) => ({
            ...appointment,
            vaccine: vaccineById.get(appointment.vaccine_id),
          })
        );

      const movementList =
        ((movsResult.data as StockMovement[]) || []).map(
          (movement) => ({
            ...movement,
            vaccine: vaccineById.get(movement.vaccine_id),
          })
        );

      setApplications(appList);
      setAppointments(appointmentList);
      setMovements(movementList);
    } catch (error) {
      console.error(
        'Erro ao carregar relatórios:',
        error
      );

      toast(
        'Erro ao carregar os relatórios',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [getDateRange, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Estatísticas
  const totalApplications = applications.length;
  const totalAppointments = appointments.length;

  const appliedCount = appointments.filter(
    (a) => a.status === 'aplicado'
  ).length;

  const cancelledCount = appointments.filter(
    (a) => a.status === 'cancelado'
  ).length;

  const attendanceRate =
    totalAppointments > 0
      ? Math.round((appliedCount / totalAppointments) * 100)
      : 0;

  const overdueCount = appointments.filter(
    (a) => a.status === 'atrasado'
  ).length;

  const stockUsed = movements
    .filter((m) => m.tipo === 'saida')
    .reduce((sum, m) => sum + m.quantidade, 0);

  // Vacinas mais aplicadas
  const vaccineCountMap = new Map<
    string,
    {
      nome: string;
      count: number;
    }
  >();

  for (const app of applications) {
    const vid = app.vaccine_id;
    const nome = app.vaccine?.nome || 'Desconhecida';

    const existing = vaccineCountMap.get(vid) || {
      nome,
      count: 0,
    };

    existing.count++;

    vaccineCountMap.set(vid, existing);
  }

  const topVaccines = Array.from(vaccineCountMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const maxVaccineCount = Math.max(
    ...topVaccines.map((v) => v.count),
    1
  );

  // Distribuição dos status
  const statusCounts: Record<string, number> = {};

  for (const apt of appointments) {
    statusCounts[apt.status] =
      (statusCounts[apt.status] || 0) + 1;
  }

  const periodButtons: {
    key: PeriodFilter;
    label: string;
  }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: '7dias', label: '7 dias' },
    { key: '30dias', label: '30 dias' },
    { key: 'mes', label: 'Este mês' },
    { key: 'custom', label: 'Personalizado' },
  ];

  return (
    <Layout title="Relatórios">
      <PageHeader
        title="Relatórios"
        description="Análise de desempenho e estatísticas do período"
      />

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-900 p-1 overflow-x-auto no-scrollbar">
          {periodButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setPeriod(btn.key)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                period === btn.key
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:[color-scheme:dark]"
            />

            <span className="text-gray-400 dark:text-slate-500">
              até
            </span>

            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:[color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Estatísticas principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Vacinas Aplicadas"
              value={totalApplications}
              icon={Syringe}
              color="emerald"
              delay={0}
            />

            <StatCard
              label="Agendamentos"
              value={totalAppointments}
              icon={Calendar}
              color="blue"
              delay={0.05}
            />

            <StatCard
              label="Taxa de Comparecimento"
              value={`${attendanceRate}%`}
              icon={TrendingUp}
              color="emerald"
              delay={0.1}
            />

            <StatCard
              label="Agendamentos Atrasados"
              value={overdueCount}
              icon={AlertTriangle}
              color="red"
              delay={0.15}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Vacinas mais aplicadas */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle>Vacinas Mais Aplicadas</CardTitle>
                </div>
              </CardHeader>

              <CardBody>
                {topVaccines.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                    Sem dados no período
                  </p>
                ) : (
                  <div className="space-y-4">
                    {topVaccines.map((v, i) => (
                      <motion.div
                        key={v.nome}
                        initial={{
                          opacity: 0,
                          x: 10,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        transition={{
                          delay: i * 0.06,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                            {v.nome}
                          </span>

                          <span className="text-sm text-gray-500 dark:text-slate-400">
                            {v.count}
                          </span>
                        </div>

                        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                          <motion.div
                            initial={{
                              width: 0,
                            }}
                            animate={{
                              width: `${
                                (v.count / maxVaccineCount) * 100
                              }%`,
                            }}
                            transition={{
                              delay: i * 0.06 + 0.2,
                              duration: 0.5,
                            }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Status dos agendamentos */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Status dos Agendamentos
                </CardTitle>
              </CardHeader>

              <CardBody>
                {Object.keys(statusCounts).length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                    Sem dados no período
                  </p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(statusCounts).map(
                      ([status, count], i) => {
                        const pct =
                          totalAppointments > 0
                            ? Math.round(
                                (count / totalAppointments) *
                                  100
                              )
                            : 0;

                        const colors: Record<
                          string,
                          string
                        > = {
                          agendado: 'bg-blue-500',
                          confirmado: 'bg-emerald-500',
                          aplicado: 'bg-green-600',
                          atrasado: 'bg-red-500',
                          remarcado: 'bg-amber-500',
                          remarcar: 'bg-amber-500',
                          cancelado: 'bg-gray-400',
                        };

                        const labels: Record<
                          string,
                          string
                        > = {
                          agendado: 'Agendado',
                          confirmado: 'Confirmado',
                          aplicado: 'Aplicado',
                          atrasado: 'Atrasado',
                          remarcado: 'Remarcado',
                          remarcar: 'Remarcado',
                          cancelado: 'Cancelado',
                        };

                        return (
                          <motion.div
                            key={status}
                            initial={{
                              opacity: 0,
                              y: 8,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay: i * 0.05,
                            }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-600 dark:text-slate-300">
                                {labels[status] ||
                                  status}
                              </span>

                              <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                                {count} ({pct}%)
                              </span>
                            </div>

                            <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                              <motion.div
                                initial={{
                                  width: 0,
                                }}
                                animate={{
                                  width: `${pct}%`,
                                }}
                                transition={{
                                  delay:
                                    i * 0.05 + 0.2,
                                  duration: 0.5,
                                }}
                                className={`h-full rounded-full ${
                                  colors[status] ||
                                  'bg-gray-400'
                                }`}
                              />
                            </div>
                          </motion.div>
                        );
                      }
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Estatísticas secundárias */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Estoque Utilizado"
              value={stockUsed}
              icon={Boxes}
              color="amber"
              delay={0.2}
            />

            <StatCard
              label="Agendamentos Cancelados"
              value={cancelledCount}
              icon={Calendar}
              color="gray"
              delay={0.25}
            />

            <StatCard
              label="Pets Atendidos"
              value={
                new Set(
                  applications.map((a) => a.pet_id)
                ).size
              }
              icon={Users}
              color="blue"
              delay={0.3}
            />
          </div>
        </>
      )}
    </Layout>
  );
}