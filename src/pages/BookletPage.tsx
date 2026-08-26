import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Download,
  QrCode,
  Lock,
  CheckCircle2,
  Clock,
  PawPrint,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
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

export function BookletPage() {
  const { toast } = useToast();
  const [pets, setPets] = useState<Pet[]>([]);
  const [booklets, setBooklets] = useState<DigitalBooklet[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState('');
  const [payBooklet, setPayBooklet] = useState<DigitalBooklet | null>(null);
  const [viewBooklet, setViewBooklet] = useState<DigitalBooklet | null>(null);
  const [applications, setApplications] = useState<VaccineApplication[]>([]);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    const [
      { data: petsData },
      { data: bookletsData },
      { data: settingsData },
    ] = await Promise.all([
      supabase.from('pets').select('*, tutor:tutors(*)').order('nome'),
      supabase
        .from('digital_booklets')
        .select('*, pet:pets(*, tutor:tutors(*)), payments(*)')
        .order('created_at', { ascending: false }),
      supabase.from('settings').select('*').limit(1),
    ]);

    setPets((petsData as Pet[]) || []);
    setBooklets((bookletsData as DigitalBooklet[]) || []);
    setSettings((settingsData as Settings[])?.[0] || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setSelectedPet(pets[0]?.id || '');
    setCreateModal(true);
  };

  const handleCreate = async () => {
    if (!selectedPet) {
      toast('Selecione um pet', 'error');
      return;
    }

    setSaving(true);

    const existing = booklets.find((b) => b.pet_id === selectedPet);

    if (existing) {
      toast('Este pet já possui uma caderneta', 'warning');
      setCreateModal(false);
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('digital_booklets')
      .insert({
        pet_id: selectedPet,
        status_pagamento: 'nao_paga',
        codigo_validacao: generateValidationCode(),
      })
      .select('*, pet:pets(*, tutor:tutors(*))')
      .single();

    if (error) {
      toast('Erro ao criar caderneta', 'error');
    } else {
      toast('Caderneta criada com sucesso!');
      setCreateModal(false);
      load();
    }

    setSaving(false);
  };

  const openPay = (booklet: DigitalBooklet) => {
    setPayBooklet(booklet);
    setPayModal(true);
  };

  const handlePay = async () => {
    if (!payBooklet) return;

    setPaying(true);

    // Simulação do fluxo de pagamento Pix
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const { error: payError } = await supabase.from('payments').insert({
      booklet_id: payBooklet.id,
      valor: settings?.booklet_price || 19.9,
      metodo: 'pix',
      status: 'aprovado',
      transaction_id: `PIX_${Date.now()}`,
    });

    if (payError) {
      toast('Erro ao processar pagamento', 'error');
      setPaying(false);
      return;
    }

    const { error: bookError } = await supabase
      .from('digital_booklets')
      .update({ status_pagamento: 'paga' })
      .eq('id', payBooklet.id);

    if (bookError) {
      toast('Erro ao atualizar caderneta', 'error');
    } else {
      toast('Pagamento confirmado! Caderneta liberada!');
      setPayModal(false);
      load();
    }

    setPaying(false);
  };

  const openView = async (booklet: DigitalBooklet) => {
    setViewBooklet(booklet);

    const { data: apps } = await supabase
      .from('vaccine_applications')
      .select('*, vaccine:vaccines(*)')
      .eq('pet_id', booklet.pet_id)
      .order('data_aplicacao', { ascending: false });

    setApplications((apps as VaccineApplication[]) || []);
    setViewModal(true);
  };

  const handleDownloadPDF = () => {
    if (!viewBooklet || !viewBooklet.pet) return;

    const pet = viewBooklet.pet;

    generateBookletPDF({
      pet,
      tutor: pet.tutor,
      applications,
      booklet: viewBooklet,
      settings,
    });

    toast('PDF gerado com sucesso!');
  };

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
      label: 'Não Paga',
      bg: 'bg-gray-100 dark:bg-slate-800',
      text: 'text-gray-600 dark:text-slate-300',
      dot: 'bg-gray-500 dark:bg-slate-400',
      icon: Lock,
    },
    pendente: {
      label: 'Pendente',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
      icon: Clock,
    },
    paga: {
      label: 'Paga',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      icon: CheckCircle2,
    },
    expirada: {
      label: 'Expirada',
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
      icon: Lock,
    },
  };

  return (
    <Layout
      title="Caderneta Digital"
      actions={
        <Button onClick={openCreate} disabled={pets.length === 0}>
          <Plus className="w-4 h-4" />
          Nova Caderneta
        </Button>
      }
    >
      <PageHeader
        title="Caderneta Digital"
        description="Cadernetas digitais pagas com QR Code de validação"
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : booklets.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title="Nenhuma caderneta criada"
          description="Crie uma caderneta digital para um pet e libere após o pagamento"
          action={
            pets.length > 0 && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Nova Caderneta
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {booklets.map((b, i) => {
            const cfg =
              statusConfig[b.status_pagamento] || statusConfig.nao_paga;

            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card hover>
                  <CardBody>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          <PawPrint className="w-5 h-5" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900 dark:!text-slate-100">
                            {b.pet?.nome}
                          </h3>

                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {b.pet?.tutor?.nome}
                          </p>
                        </div>
                      </div>

                      <Badge
                        className={`${cfg.bg} ${cfg.text}`}
                        dot
                        dotColor={cfg.dot}
                      >
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="mt-4 rounded-lg bg-gray-50 dark:bg-slate-950/50 p-3">
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Código de Validação
                      </p>

                      <p className="font-mono text-sm font-semibold text-gray-700 dark:text-slate-200 mt-0.5">
                        {b.codigo_validacao}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
                      <span>Criada em {formatDate(b.created_at)}</span>

                      {b.status_pagamento === 'paga' && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <QrCode className="w-3.5 h-3.5" />
                          QR Code ativo
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {b.status_pagamento !== 'paga' ? (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => openPay(b)}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          Liberar Caderneta
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openView(b)}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          Visualizar
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar caderneta */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Nova Caderneta Digital"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Criar
            </Button>
          </>
        }
      >
        <Select
          label="Selecione o Pet"
          value={selectedPet}
          onChange={(e) => setSelectedPet(e.target.value)}
          required
        >
          <option value="">Selecione...</option>

          {pets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.tutor?.nome})
            </option>
          ))}
        </Select>

        <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">
          A caderneta será criada com status "Não Paga". Após o pagamento via
          Pix, ela será liberada.
        </p>
      </Modal>

      {/* Modal: Pagamento */}
      <Modal
        open={payModal}
        onClose={() => setPayModal(false)}
        title="Liberar Caderneta Digital"
        description={`Pagamento via Pix - ${formatCurrency(
          settings?.booklet_price || 19.9
        )}`}
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center py-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-4">
              <QrCode className="w-10 h-10" />
            </div>

            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
              Simulação de pagamento Pix
            </p>

            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {formatCurrency(settings?.booklet_price || 19.9)}
            </p>

            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Pet: {payBooklet?.pet?.nome}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950/50 p-3">
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Ao confirmar, o sistema registra o pagamento e libera a caderneta
              digital para visualização e geração de PDF com QR Code de
              validação.
            </p>
          </div>

          <Button className="w-full" onClick={handlePay} loading={paying}>
            {paying ? 'Processando...' : 'Confirmar Pagamento Pix'}
          </Button>
        </div>
      </Modal>

      {/* Modal: Visualizar caderneta */}
      <Modal
        open={viewModal}
        onClose={() => setViewModal(false)}
        title="Caderneta Digital"
        size="xl"
        footer={
          <Button onClick={handleDownloadPDF}>
            <Download className="w-4 h-4" />
            Baixar PDF
          </Button>
        }>
          {viewBooklet && (
            <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {viewBooklet.pet?.foto_url ? (
                  <img
                  src={viewBooklet.pet.foto_url}
                  alt={viewBooklet.pet.nome}
                  className="h-20 w-20 rounded-2xl object-cover border border-gray-200 dark:border-slate-700"/>
                ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
            <PawPrint className="w-9 h-9" />
            </div>
          )}

  <div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
      {viewBooklet.pet?.nome}
    </h3>

    <p className="text-sm text-gray-500 dark:text-slate-400">
      Tutor: {viewBooklet.pet?.tutor?.nome}
    </p>

    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
      Código: {viewBooklet.codigo_validacao}
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

            <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
              <h4 className="font-semibold text-gray-800 dark:text-slate-100 mb-3">
                Histórico de Vacinação
              </h4>

              {applications.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                  Nenhuma aplicação registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-slate-100">
                          {app.vaccine?.nome}
                        </p>

                       <p className="text-xs text-gray-500 dark:text-slate-400">
                        {app.dose || 'Dose'} · {formatDate(app.data_aplicacao)}
                        {app.lote && ` · Lote: ${app.lote}`}
                        </p>
                        {(app.profissional || app.crmv) && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1"> Veterinário:{' '}
                          <span className="font-medium text-gray-700 dark:text-slate-300">
                            {app.profissional || '—'}
                            {app.crmv && ` · ${app.crmv}`}
                            </span>
                            </p>
                          )}
                      </div>
                      {app.assinatura_url && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Assinatura do Veterinário</p>
                          <div className="inline-flex rounded-lg bg-white border border-gray-200 p-2">
                            <img
                            src={app.assinatura_url}
                            alt={`Assinatura de ${app.profissional || 'veterinário'}`}
                            className="h-16 w-auto object-contain"
                            />
                            </div>
                            </div>
                          )}

                      {app.proxima_dose && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            Próxima
                          </p>

                          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                            {formatDate(app.proxima_dose)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}