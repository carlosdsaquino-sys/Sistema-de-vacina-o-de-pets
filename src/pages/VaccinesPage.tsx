import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Syringe, Plus, Edit2, Trash2, Boxes, Calendar } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Vaccine } from '@/types/database';

export function VaccinesPage() {
  const { toast } = useToast();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vaccine | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vaccine | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    fabricante: '',
    descricao: '',
    estoque_atual: 0,
    estoque_minimo: 5,
    protocolo_doses: 3,
    intervalo_entre_doses: 21,
    possui_reforco_anual: true,
    intervalo_reforco_anual: 365,
    ativo: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('vaccines').select('*').order('nome');
    setVaccines((data as Vaccine[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      nome: '',
      fabricante: '',
      descricao: '',
      estoque_atual: 0,
      estoque_minimo: 5,
      protocolo_doses: 3,
      intervalo_entre_doses: 21,
      possui_reforco_anual: true,
      intervalo_reforco_anual: 365,
      ativo: true,
    });
    setModalOpen(true);
  };

  const openEdit = (v: Vaccine) => {
    setEditing(v);
    setForm({
      nome: v.nome,
      fabricante: v.fabricante || '',
      descricao: v.descricao || '',
      estoque_atual: v.estoque_atual,
      estoque_minimo: v.estoque_minimo,
      protocolo_doses: v.protocolo_doses,
      intervalo_entre_doses: v.intervalo_entre_doses,
      possui_reforco_anual: v.possui_reforco_anual,
      intervalo_reforco_anual: v.intervalo_reforco_anual,
      ativo: v.ativo,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast('Nome da vacina é obrigatório', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      fabricante: form.fabricante.trim() || null,
      descricao: form.descricao.trim() || null,
      estoque_atual: Number(form.estoque_atual),
      estoque_minimo: Number(form.estoque_minimo),
      protocolo_doses: Number(form.protocolo_doses),
      intervalo_entre_doses: Number(form.intervalo_entre_doses),
      possui_reforco_anual: form.possui_reforco_anual,
      intervalo_reforco_anual: Number(form.intervalo_reforco_anual),
      ativo: form.ativo,
    };

    if (editing) {
      const { error } = await supabase.from('vaccines').update(payload).eq('id', editing.id);
      if (error) toast('Erro ao atualizar vacina', 'error');
      else {
        toast('Vacina atualizada com sucesso');
        setModalOpen(false);
        load();
      }
    } else {
      const { error } = await supabase.from('vaccines').insert(payload);
      if (error) toast('Erro ao cadastrar vacina', 'error');
      else {
        toast('Vacina cadastrada com sucesso');
        setModalOpen(false);
        load();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('vaccines').delete().eq('id', deleteTarget.id);
    if (error) toast('Erro ao excluir vacina', 'error');
    else {
      toast('Vacina excluída com sucesso');
      setDeleteTarget(null);
      load();
    }
  };

  return (
    <Layout title="Vacinas" actions={
      <Button onClick={openCreate}>
        <Plus className="w-4 h-4" />
        Nova Vacina
      </Button>
    }>
      <PageHeader title="Vacinas" description="Cadastre e configure os protocolos das vacinas" />

      {loading ? (
        <SkeletonList count={4} />
      ) : vaccines.length === 0 ? (
        <EmptyState
          icon={<Syringe className="w-8 h-8" />}
          title="Nenhuma vacina cadastrada"
          description="Comece cadastrando as vacinas do seu estabelecimento"
          action={<Button onClick={openCreate}><Plus className="w-4 h-4" />Nova Vacina</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ noStock
                        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Syringe className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{v.nome}</h3>
                          {v.fabricante && <p className="text-xs text-gray-500 dark:text-slate-400">{v.fabricante}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(v)} className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(v)} className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {v.descricao && <p className="mt-3 text-sm text-gray-600 dark:text-slate-300 line-clamp-2">{v.descricao}</p>}

                    <div className="mt-4 flex items-center gap-2">
                     <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${ noStock
                     ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' : lowStock
                     ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                     : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                     }`}>
                        <Boxes className="w-3.5 h-3.5" />
                        {noStock ? 'Sem estoque' : `${v.estoque_atual} un.`}
                      </div>
                      {lowStock && !noStock && (
                        <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"> Estoque baixo</Badge>
                      )}
                      {!v.ativo && <Badge className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-300">Inativa</Badge>}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-slate-400">
                      <div>
                        <span className="block text-gray-400 dark:text-slate-500">Protocolo</span>
                        <span className="font-medium text-gray-700 dark:text-slate-200">{v.protocolo_doses} doses</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-slate-500">Intervalo</span>
                        <span className="font-medium text-gray-700 dark:text-slate-200">{v.intervalo_entre_doses} dias</span>
                      </div>
                      {v.possui_reforco_anual && (
                        <div className="col-span-2">
                          <span className="font-medium text-gray-700 dark:text-slate-200 flex items-center gap-1">Reforço anual</span>
                          <span className="font-medium text-gray-700 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            A cada {v.intervalo_reforco_anual} dias
                          </span>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Vacina' : 'Nova Vacina'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome da Vacina"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: V10"
              required
            />
            <Input
              label="Fabricante (opcional)"
              value={form.fabricante}
              onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
              placeholder="Ex: Virbac"
            />
          </div>
          <Textarea
            label="Descrição"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descrição da vacina"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Estoque Atual"
              type="number"
              value={form.estoque_atual}
              onChange={(e) => setForm({ ...form, estoque_atual: Number(e.target.value) })}
            />
            <Input
              label="Estoque Mínimo"
              type="number"
              value={form.estoque_minimo}
              onChange={(e) => setForm({ ...form, estoque_minimo: Number(e.target.value) })}
            />
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-slate-800 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Protocolo de Vacinação</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantidade de Doses"
                type="number"
                value={form.protocolo_doses}
                onChange={(e) => setForm({ ...form, protocolo_doses: Number(e.target.value) })}
              />
              <Input
                label="Intervalo entre Doses (dias)"
                type="number"
                value={form.intervalo_entre_doses}
                onChange={(e) => setForm({ ...form, intervalo_entre_doses: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reforco"
                checked={form.possui_reforco_anual}
                onChange={(e) => setForm({ ...form, possui_reforco_anual: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 dark:bg-slate-900"
              />
              <label htmlFor="reforco" className="text-sm text-gray-700 dark:text-slate-300">Possui reforço anual</label>
            </div>
            {form.possui_reforco_anual && (
              <Input
                label="Intervalo do Reforço Anual (dias)"
                type="number"
                value={form.intervalo_reforco_anual}
                onChange={(e) => setForm({ ...form, intervalo_reforco_anual: Number(e.target.value) })}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ativo"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 dark:bg-slate-900"
            />
            <label htmlFor="ativo" className="text-sm text-gray-700 dark:text-slate-300">Vacina ativa</label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Vacina"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"?`}
        confirmLabel="Excluir"
        danger
      />
    </Layout>
  );
}
