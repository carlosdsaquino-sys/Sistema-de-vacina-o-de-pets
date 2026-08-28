import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Stethoscope, Syringe, Calendar, User, Check, Clock } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { SignaturePad } from '@/components/SignaturePad';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatDate, todayISO } from '@/lib/utils';
import { getNextDoseInfo } from '@/lib/protocol';
import type { Appointment, Vaccine, VaccineApplication, VaccineBatch } from '@/types/database';

export function ApplicationsPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preselectedAptId = searchParams.get('apt');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [applications, setApplications] = useState<VaccineApplication[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [batches, setBatches] = useState<VaccineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyModal, setApplyModal] = useState(false);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [signature, setSignature] = useState<string | null>(null);
  const [form, setForm] = useState({
    lote: '',
    data_aplicacao: todayISO(),
    horario: '',
    proxima_dose: '',
    observacoes_clinicas: '',
    profissional: '',
     crmv: '',
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        { data: appts, error: apptsError },
        { data: apps, error: appsError },
        { data: vax, error: vaxError },
        { data: bat, error: batError },
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select(`
            *,
            tutor:tutors!appointments_org_tutor_fkey(*),
            pet:pets!appointments_org_pet_fkey(*),
            vaccine:vaccines!appointments_org_vaccine_fkey(*)
          `)
          .in('status', ['agendado', 'confirmado', 'atrasado'])
          .order('data_agendada'),

        supabase
          .from('vaccine_applications')
          .select(`
            *,
            vaccine:vaccines!vaccine_applications_org_vaccine_fkey(*),
            pet:pets!vaccine_applications_org_pet_fkey(*)
          `)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('vaccines')
          .select('*')
          .eq('ativo', true),

        supabase
          .from('vaccine_batches')
          .select(`
            *,
            vaccine:vaccines!vaccine_batches_org_vaccine_fkey(*)
          `),
      ]);

      if (apptsError) throw apptsError;
      if (appsError) throw appsError;
      if (vaxError) throw vaxError;
      if (batError) throw batError;

      setAppointments((appts as Appointment[]) || []);
      setApplications((apps as VaccineApplication[]) || []);
      setVaccines((vax as Vaccine[]) || []);
      setBatches((bat as VaccineBatch[]) || []);
    } catch (error) {
      console.error('Erro ao carregar aplicações:', error);
      toast('Erro ao carregar aplicações', 'error');

      setAppointments([]);
      setApplications([]);
      setVaccines([]);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (preselectedAptId && appointments.length > 0) {
      const apt = appointments.find((a) => a.id === preselectedAptId);
      if (apt) openApplyModal(apt);
    }
  }, [preselectedAptId, appointments]);

  const openApplyModal = (apt: Appointment) => {
    setSelectedApt(apt);
    setSignature(null);
    const vaccine = apt.vaccine;
    const nextDose = vaccine ? getNextDoseInfo(apt.dose, vaccine, todayISO()) : null;
    setForm({
      lote: '',
      data_aplicacao: todayISO(),
      horario: '',
      proxima_dose: nextDose?.nextDoseDate || '',
      observacoes_clinicas: '',
      profissional: '',
      crmv: '',
    });
    setApplyModal(true);
  };

  const handleApply = async () => {
    if (!selectedApt) return;
    const vaccine = selectedApt.vaccine;
    if (!vaccine) {
      toast('Vacina não encontrada', 'error');
      return;
    }
    if (vaccine.estoque_atual <= 0) {
      toast('Esta vacina está indisponível no momento devido à falta de estoque.', 'error');
      return;
    }
    setSaving(true);

    try {
      const nextDoseInfo = getNextDoseInfo(selectedApt.dose, vaccine, form.data_aplicacao);

      // 1. Create application record
      const { data: appRecord, error: appError } = await supabase
        .from('vaccine_applications')
        .insert({
          appointment_id: selectedApt.id,
          pet_id: selectedApt.pet_id,
          vaccine_id: selectedApt.vaccine_id,
          dose: selectedApt.dose,
          lote: form.lote.trim() || null,
          data_aplicacao: form.data_aplicacao,
          proxima_dose: form.proxima_dose || null,
          observacoes_clinicas: form.observacoes_clinicas.trim() || null,
          assinatura_url: signature,
          profissional: form.profissional.trim() || null,
          crmv: form.crmv.trim() || null,
        })
        .select()
        .single();

      if (appError) throw appError;

      // 2. Update appointment status
      const { error: aptError } = await supabase
        .from('appointments')
        .update({ status: 'aplicado' })
        .eq('id', selectedApt.id);
      if (aptError) throw aptError;

      // 3. Deduct stock
      const newStock = Math.max(0, vaccine.estoque_atual - 1);
      const { error: vacError } = await supabase
        .from('vaccines')
        .update({ estoque_atual: newStock })
        .eq('id', vaccine.id);
      if (vacError) throw vacError;

      // 4. Log stock movement
      await supabase.from('stock_movements').insert({
        vaccine_id: vaccine.id,
        tipo: 'saida',
        quantidade: 1,
        motivo: `Aplicação - ${selectedApt.pet?.nome || ''}`,
        application_id: (appRecord as VaccineApplication).id,
      });

      // 5. Create next appointment if there's a next dose
      if (nextDoseInfo.nextDoseDate && nextDoseInfo.nextDoseLabel) {
        await supabase.from('appointments').insert({
          tutor_id: selectedApt.tutor_id,
          pet_id: selectedApt.pet_id,
          vaccine_id: selectedApt.vaccine_id,
          dose: nextDoseInfo.nextDoseLabel,
          data_agendada: nextDoseInfo.nextDoseDate,
          status: 'agendado',
        });
      }

      toast('Vacina aplicada com sucesso!');
      setApplyModal(false);
      load();
    } catch (err: any) {
      toast(err.message || 'Erro ao registrar aplicação', 'error');
    }
    setSaving(false);
  };

  const pendingAppointments = appointments.filter((a) =>
    ['agendado', 'confirmado', 'atrasado'].includes(a.status)
  );

  return (
    <Layout title="Aplicações">
      <PageHeader title="Aplicações" description="Marque vacinas como aplicadas e registre o histórico" />

      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-900 p-1 mb-4 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'pending'
  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
        >
          Pendentes ({pendingAppointments.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'history' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
        >
          Histórico
        </button>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : tab === 'pending' ? (
        pendingAppointments.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="w-8 h-8" />}
            title="Nenhuma aplicação pendente"
            description="Todos os agendamentos já foram aplicados ou cancelados"
          />
        ) : (
          <div className="space-y-3">
            {pendingAppointments.map((apt, i) => (
              <motion.div
                key={apt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card hover>
                  <CardBody>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                          <Syringe className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{apt.pet?.nome}</h3>
                            <StatusBadge status={apt.status} />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                            {apt.tutor?.nome} · {apt.vaccine?.nome} · {apt.dose}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{formatDate(apt.data_agendada)}{apt.horario_agendado && ` às ${apt.horario_agendado}`}</p>
                        </div>
                      </div>
                      <Button
                        variant="success"
                        onClick={() => openApplyModal(apt)}
                        disabled={apt.vaccine?.estoque_atual === 0}
                      >
                        <Check className="w-4 h-4" />
                        Marcar como Aplicado
                      </Button>
                    </div>
                    {apt.vaccine?.estoque_atual === 0 && (
                      <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                        Esta vacina está indisponível no momento devido à falta de estoque.
                      </p>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        )
      ) : applications.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="w-8 h-8" />}
          title="Nenhuma aplicação registrada"
          description="As aplicações aparecerão aqui assim que forem registradas"
        />
      ) : (
        <Card>
          <CardBody>
            <div className="space-y-3">
              {applications.map((app, i) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 dark:text-slate-100">{app.pet?.nome} · {app.vaccine?.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {app.dose || 'Dose'} · {formatDate(app.data_aplicacao)}
                      {app.lote && ` · Lote: ${app.lote}`}
                      {app.profissional && ` · ${app.profissional}`}
                      {app.crmv && ` · ${app.crmv}`}
                    </p>
                  </div>
                  {app.proxima_dose && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400 dark:text-slate-500">Próxima dose</p>
                      <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{formatDate(app.proxima_dose)}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        open={applyModal}
        onClose={() => setApplyModal(false)}
        title="Marcar Vacina como Aplicada"
        description={`${selectedApt?.pet?.nome} · ${selectedApt?.vaccine?.nome} · ${selectedApt?.dose}`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setApplyModal(false)}>Cancelar</Button>
            <Button variant="success" onClick={handleApply} loading={saving} disabled={
              !signature ||
              !form.profissional.trim() ||
              !form.crmv.trim()
              }>
                <Check className="w-4 h-4" />Confirmar Aplicação
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Lote da Vacina"
              value={form.lote}
              onChange={(e) => setForm({ ...form, lote: e.target.value })}
              placeholder="Ex: L12345"
            />
         <Input 
           label="Veterinário Responsável"
           value={form.profissional}
           onChange={(e) => setForm({ ...form, profissional: e.target.value })}
           placeholder="Ex: Dr. João Silva"
           required
           />

<Input
  label="CRMV"
  value={form.crmv}
  onChange={(e) => setForm({ ...form, crmv: e.target.value })}
  placeholder="Ex: CRMV-CE 12345"
  required
/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data da Aplicação"
              type="date"
              value={form.data_aplicacao}
              onChange={(e) => setForm({ ...form, data_aplicacao: e.target.value })}
              required
            />
            <Input
              label="Horário da Aplicação"
              type="time"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
            />
          </div>
          <Input
            label="Data da Próxima Dose (sugerida pelo protocolo)"
            type="date"
            value={form.proxima_dose}
            onChange={(e) => setForm({ ...form, proxima_dose: e.target.value })}
          />
          <Textarea
            label="Observações Clínicas"
            value={form.observacoes_clinicas}
            onChange={(e) => setForm({ ...form, observacoes_clinicas: e.target.value })}
            rows={2}
            placeholder="Observações clínicas da aplicação"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Assinatura do Veterinário</label>
            <SignaturePad onSave={(dataUrl) => { setSignature(dataUrl); toast('Assinatura capturada'); }} />
            {signature && (
              <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Assinatura capturada
              </p>
            )}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
