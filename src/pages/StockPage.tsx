import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Boxes, ArrowDownCircle, ArrowUpCircle, Plus, History } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import type { Vaccine, StockMovement } from '@/types/database';

export function StockPage() {
  const { toast } = useToast();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementModal, setMovementModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyVaccine, setHistoryVaccine] = useState<Vaccine | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vaccine_id: '',
    tipo: 'entrada' as 'entrada' | 'saida',
    quantidade: 1,
    motivo: '',
  });

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [
        vaccinesResult,
        movementsResult,
      ] = await Promise.all([
        supabase
          .from('vaccines')
          .select('*')
          .order('nome'),

        /*
         * Não usamos embed vaccine:vaccines(*) aqui.
         * Depois das FKs multiempresa, o PostgREST pode encontrar
         * mais de uma relação possível. A vacina é associada abaixo.
         */
        supabase
          .from('stock_movements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const firstError =
        vaccinesResult.error ||
        movementsResult.error;

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

      const movementList =
        ((movementsResult.data as StockMovement[]) || []).map(
          (movement) => ({
            ...movement,
            vaccine: vaccineById.get(movement.vaccine_id),
          })
        );

      setVaccines(vaccineList);
      setMovements(movementList);
    } catch (error) {
      console.error(
        'Erro ao carregar estoque:',
        error
      );

      toast(
        'Erro ao carregar o estoque',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openMovement = () => {
    setForm({
      vaccine_id: vaccines[0]?.id || '',
      tipo: 'entrada',
      quantidade: 1,
      motivo: '',
    });
    setMovementModal(true);
  };

  const handleSave = async () => {
    if (!form.vaccine_id || form.quantidade <= 0) {
      toast('Selecione a vacina e a quantidade', 'error');
      return;
    }

    setSaving(true);
    const vaccine = vaccines.find((v) => v.id === form.vaccine_id);
    if (!vaccine) {
      setSaving(false);
      return;
    }

    if (
      form.tipo === 'saida' &&
      form.quantidade > vaccine.estoque_atual
    ) {
      toast(
        `Estoque insuficiente. Disponível: ${vaccine.estoque_atual}.`,
        'warning'
      );

      setSaving(false);
      return;
    }

    const { error: movError } = await supabase.from('stock_movements').insert({
      vaccine_id: form.vaccine_id,
      tipo: form.tipo,
      quantidade: form.quantidade,
      motivo: form.motivo.trim() || null,
    });

    if (movError) {
      toast('Erro ao registrar movimentação', 'error');
      setSaving(false);
      return;
    }

    const newStock =
      form.tipo === 'entrada'
        ? vaccine.estoque_atual + form.quantidade
        : Math.max(0, vaccine.estoque_atual - form.quantidade);

    const { error: vacError } = await supabase
      .from('vaccines')
      .update({ estoque_atual: newStock })
      .eq('id', form.vaccine_id);

    if (vacError) {
      toast('Erro ao atualizar estoque', 'error');
    } else {
      toast('Movimentação registrada com sucesso');
      setMovementModal(false);
      load();
    }
    setSaving(false);
  };

  const openHistory = (v: Vaccine) => {
    setHistoryVaccine(v);
    setHistoryModal(true);
  };

  const vaccineMovements = historyVaccine
    ? movements.filter((m) => m.vaccine_id === historyVaccine.id)
    : [];

  return (
    <Layout
      title="Estoque"
      actions={
        <Button onClick={openMovement} disabled={vaccines.length === 0}>
          <Plus className="w-4 h-4" />
          Nova Movimentação
        </Button>
      }
    >
      <PageHeader title="Estoque" description="Controle de estoque de vacinas e movimentações" />

      {loading ? (
        <SkeletonList count={4} />
      ) : vaccines.length === 0 ? (
        <EmptyState
          icon={<Boxes className="w-8 h-8" />}
          title="Nenhuma vacina cadastrada"
          description="Cadastre vacinas para gerenciar o estoque"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {vaccines.map((v, i) => {
              const noStock = v.estoque_atual === 0;
              const lowStock = v.estoque_atual > 0 && v.estoque_atual <= v.estoque_minimo;

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card hover>
                    <CardBody>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              noStock
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                                : lowStock
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            <Boxes className="w-5 h-5" />
                          </div>

                          <div>
                            <h3 className="font-semibold text-gray-900 dark:!text-slate-100">
                              {v.nome}
                              </h3>
                            {v.fabricante && (
                              <p className="text-xs text-gray-500 dark:text-slate-400">{v.fabricante}</p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => openHistory(v)}
                          className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">{v.estoque_atual}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">unidades em estoque</p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {noStock ? (
                            <Badge className="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" dot dotColor="bg-red-500">
                              Sem estoque
                            </Badge>
                          ) : lowStock ? (
                            <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" dot dotColor="bg-amber-500">
                              Estoque baixo
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" dot dotColor="bg-emerald-500">
                              Em estoque
                            </Badge>
                          )}
                          <p className="text-xs text-gray-400 dark:text-slate-500">Mínimo: {v.estoque_minimo}</p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movimentações Recentes</CardTitle>
            </CardHeader>
            <CardBody>
              {movements.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-3">
                  {movements.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          m.tipo === 'entrada'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        }`}
                      >
                        {m.tipo === 'entrada' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-slate-100">{m.vaccine?.nome || 'Vacina'}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {m.tipo === 'entrada' ? 'Entrada' : 'Saída'} de {m.quantidade} un.
                          {m.motivo && ` · ${m.motivo}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500">{formatDateTime(m.created_at)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <Modal
        open={movementModal}
        onClose={() => setMovementModal(false)}
        title="Nova Movimentação de Estoque"
        footer={
          <>
            <Button variant="outline" onClick={() => setMovementModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>Registrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Vacina"
            value={form.vaccine_id}
            onChange={(e) => setForm({ ...form, vaccine_id: e.target.value })}
            required
          >
            {vaccines.map((v) => (
              <option key={v.id} value={v.id}>{v.nome} (atual: {v.estoque_atual})</option>
            ))}
          </Select>
          <Select
            label="Tipo de Movimentação"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as 'entrada' | 'saida' })}
          >
            <option value="entrada">Entrada (adicionar ao estoque)</option>
            <option value="saida">Saída (remover do estoque)</option>
          </Select>
          <Input
            label="Quantidade"
            type="number"
            min={1}
            value={form.quantidade}
            onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
            required
          />
          <Textarea
            label="Motivo (opcional)"
            value={form.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
            placeholder="Ex: Compra de lote novo, perda, vencimento..."
            rows={2}
          />
        </div>
      </Modal>

      <Modal
        open={historyModal}
        onClose={() => setHistoryModal(false)}
        title={`Histórico - ${historyVaccine?.nome || ''}`}
        size="lg"
      >
        {vaccineMovements.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Nenhuma movimentação para esta vacina</p>
        ) : (
          <div className="space-y-3">
            {vaccineMovements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    m.tipo === 'entrada'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                  }`}
                >
                  {m.tipo === 'entrada' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                    {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} unidades
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {m.motivo || (m.tipo === 'entrada' ? 'Entrada manual' : 'Saída')}
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-slate-500">{formatDateTime(m.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Layout>
  );
}