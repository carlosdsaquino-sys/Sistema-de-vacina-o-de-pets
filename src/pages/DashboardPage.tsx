  import { useEffect, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { motion } from 'framer-motion';
  import {
    CalendarCheck,
    Syringe,
    AlertTriangle,
    Users,
    Dog,
    Boxes,
    Clock,
    ChevronRight,
    TrendingUp,
  } from 'lucide-react';
  import { Layout } from '@/components/layout/Layout';
  import { PageHeader } from '@/components/layout/PageHeader';
  import { StatCard } from '@/components/StatCard';
  import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
  import { SkeletonCard } from '@/components/ui/Skeleton';
  import { StatusBadge } from '@/components/StatusBadge';
  import { Button } from '@/components/ui/Button';
  import { supabase } from '@/lib/supabase';
  import { todayISO, formatDate } from '@/lib/utils';
  import type { Appointment, Vaccine } from '@/types/database';

  interface DashboardData {
    todayAppointments: Appointment[];
    todayApplicationsCount: number;
    overdueCount: number;
    upcomingAppointments: Appointment[];
    petsCount: number;
    tutorsCount: number;
    lowStockVaccines: Vaccine[];
    vaccineStats: { nome: string; count: number }[];
  }

  export function DashboardPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      loadDashboard();
    }, []);

    async function loadDashboard() {
      const today = todayISO();

      const [todayAppts, todayApps, overdue, upcoming, pets, tutors, vaccines] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, tutor:tutors(*), pet:pets(*), vaccine:vaccines(*)')
          .eq('data_agendada', today)
          .order('horario_agendado'),
        supabase.from('vaccine_applications').select('id').eq('data_aplicacao', today),
        supabase
          .from('appointments')
          .select('id')
          .lt('data_agendada', today)
          .in('status', ['agendado', 'confirmado']),
        supabase
          .from('appointments')
          .select('*, tutor:tutors(*), pet:pets(*), vaccine:vaccines(*)')
          .gt('data_agendada', today)
          .in('status', ['agendado', 'confirmado'])
          .order('data_agendada')
          .limit(5),
        supabase.from('pets').select('id', { count: 'exact', head: true }),
        supabase.from('tutors').select('id', { count: 'exact', head: true }),
        supabase.from('vaccines').select('*').eq('ativo', true),
      ]);

      const lowStock = (vaccines.data || []).filter(
        (v) => v.estoque_atual <= v.estoque_minimo
      );

      const { data: appStats } = await supabase
        .from('vaccine_applications')
        .select('vaccine_id')
        .order('created_at', { ascending: false })
        .limit(100);

      const vaccineCountMap = new Map<string, number>();
      for (const app of appStats || []) {
        vaccineCountMap.set(app.vaccine_id, (vaccineCountMap.get(app.vaccine_id) || 0) + 1);
      }

      const vaccineStats = Array.from(vaccineCountMap.entries())
        .map(([vid, count]) => ({
          nome: vaccines.data?.find((v) => v.id === vid)?.nome || 'Desconhecida',
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setData({
        todayAppointments: todayAppts.data || [],
        todayApplicationsCount: todayApps.data?.length || 0,
        overdueCount: overdue.data?.length || 0,
        upcomingAppointments: upcoming.data || [],
        petsCount: pets.count || 0,
        tutorsCount: tutors.count || 0,
        lowStockVaccines: lowStock,
        vaccineStats,
      });
      setLoading(false);
    }

    if (loading || !data) {
      return (
        <Layout title="Dashboard">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </Layout>
      );
    }

    const maxVaccineCount = Math.max(...data.vaccineStats.map((v) => v.count), 1);

    return (
      <Layout title="Dashboard" actions={
        <Button onClick={() => navigate('/novo-agendamento')}>
          Novo Agendamento
        </Button>
      }>
        <PageHeader
          title="Dashboard"
          description={`Visão geral do sistema - ${formatDate(new Date())}`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Agendamentos Hoje"
            value={data.todayAppointments.length}
            icon={CalendarCheck}
            color="emerald"
            delay={0}
          />
          <StatCard
            label="Vacinas Aplicadas Hoje"
            value={data.todayApplicationsCount}
            icon={Syringe}
            color="blue"
            delay={0.05}
          />
          <StatCard
            label="Agendamentos Atrasados"
            value={data.overdueCount}
            icon={AlertTriangle}
            color="red"
            delay={0.1}
          />
          <StatCard
            label="Estoque Baixo"
            value={data.lowStockVaccines.length}
            icon={Boxes}
            color="amber"
            delay={0.15}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Pets Cadastrados" value={data.petsCount} icon={Dog} color="emerald" delay={0.2} />
          <StatCard label="Tutores Cadastrados" value={data.tutorsCount} icon={Users} color="blue" delay={0.25} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Agenda de Hoje</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/agenda')}>
                  Ver todos <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {data.todayAppointments.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-gray-400 dark:text-slate-500">
                  <Clock className="w-10 h-10 mb-2" />
                  <p className="text-sm">Nenhum agendamento para hoje</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.todayAppointments.slice(0, 5).map((apt, i) => (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                      onClick={() => navigate('/agenda')}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        {apt.horario_agendado || '--:--'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{apt.pet?.nome}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {apt.tutor?.nome} · {apt.vaccine?.nome} · {apt.dose}
                        </p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Vaccine stats chart */}
        <Card>
    <CardHeader>
      <CardTitle>Vacinas Mais Aplicadas</CardTitle>
    </CardHeader>

    <CardBody>
      {data.vaccineStats.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-gray-400 dark:text-slate-500">
          <TrendingUp className="w-10 h-10 mb-2" />
          <p className="text-sm">Sem dados ainda</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.vaccineStats.map((stat, i) => (
            <motion.div
              key={stat.nome}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {stat.nome}
                </span>

                <span className="text-sm text-gray-500 dark:text-slate-400">
                  {stat.count}
                </span>
              </div>

              <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(stat.count / maxVaccineCount) * 100}%`,
                  }}
                  transition={{
                    delay: i * 0.08 + 0.2,
                    duration: 0.5,
                    ease: 'easeOut',
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
  </div>

        {/* Low stock alert */}
        {data.lowStockVaccines.length > 0 && (
          <Card className="mt-6 border-amber-200 dark:border-amber-900/50">
            <CardHeader className="bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-amber-800 dark:text-amber-300">Alerta de Estoque Baixo</CardTitle>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {data.lowStockVaccines.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 p-3">
                    <span className="font-medium text-gray-800 dark:text-slate-200">{v.nome}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${v.estoque_atual === 0 ? 'text-red-600' : 'text-amber-700'}`}>
                        {v.estoque_atual === 0 ? 'Sem estoque' : `${v.estoque_atual} unidades`}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => navigate('/estoque')}>
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </Layout>
    );
  }
