import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Phone, MapPin, Instagram, Edit2, Trash2, Dog } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatDate, formatPhone, getInitials, normalizePhone } from '@/lib/utils';
import type { Tutor, Pet } from '@/types/database';

export function TutorsPage() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [petsMap, setPetsMap] = useState<Record<string, Pet[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tutor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tutor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    instagram: '',
    endereco: '',
    observacoes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('tutors').select('*').order('created_at', { ascending: false });
    const tutorList = data || [];
    setTutors(tutorList);

    if (tutorList.length > 0) {
      const { data: petsData } = await supabase
        .from('pets')
        .select('*')
        .in('tutor_id', tutorList.map((t) => t.id));
      const map: Record<string, Pet[]> = {};
      for (const p of petsData || []) {
        if (!map[p.tutor_id]) map[p.tutor_id] = [];
        map[p.tutor_id].push(p);
      }
      setPetsMap(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = tutors.filter((t) => {
    const q = search.toLowerCase();
    const petMatch = (petsMap[t.id] || []).some((p) => p.nome.toLowerCase().includes(q));
    return (
      t.nome.toLowerCase().includes(q) ||
      t.whatsapp.includes(q) ||
      petMatch
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ nome: '', whatsapp: '', instagram: '', endereco: '', observacoes: '' });
    setModalOpen(true);
  };

  const openEdit = (tutor: Tutor) => {
    setEditing(tutor);
    setForm({
      nome: tutor.nome,
      whatsapp: tutor.whatsapp,
      instagram: tutor.instagram || '',
      endereco: tutor.endereco || '',
      observacoes: tutor.observacoes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.whatsapp.trim()) {
      toast('Nome e WhatsApp são obrigatórios', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      nome: form.nome.trim(),
      whatsapp: normalizePhone(form.whatsapp),
      instagram: form.instagram.trim() || null,
      endereco: form.endereco.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from('tutors').update(payload).eq('id', editing.id);
      if (error) {
        toast(error.message.includes('duplicate') ? 'WhatsApp já cadastrado' : 'Erro ao atualizar', 'error');
      } else {
        toast('Tutor atualizado com sucesso');
        setModalOpen(false);
        load();
      }
    } else {
      const { error } = await supabase.from('tutors').insert(payload);
      if (error) {
        toast(error.message.includes('duplicate') ? 'WhatsApp já cadastrado' : 'Erro ao cadastrar', 'error');
      } else {
        toast('Tutor cadastrado com sucesso');
        setModalOpen(false);
        load();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('tutors').delete().eq('id', deleteTarget.id);
    if (error) {
      toast('Erro ao excluir tutor', 'error');
    } else {
      toast('Tutor excluído com sucesso');
      setDeleteTarget(null);
      load();
    }
  };

  return (
    <Layout title="Tutores" actions={
      <Button onClick={openCreate}>
        <UserPlus className="w-4 h-4" />
        Novo Tutor
      </Button>
    }>
      <PageHeader title="Tutores" description="Gerencie os tutores cadastrados no sistema" />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, WhatsApp ou pet..."
          className="max-w-md"
        />
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={search ? 'Nenhum tutor encontrado' : 'Nenhum tutor cadastrado'}
          description={search ? 'Tente outra busca' : 'Comece cadastrando o primeiro tutor'}
          action={!search && <Button onClick={openCreate}><UserPlus className="w-4 h-4" />Novo Tutor</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tutor, i) => (
            <motion.div
              key={tutor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card hover>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                      {getInitials(tutor.nome)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{tutor.nome}</h3>
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Cadastrado em {formatDate(tutor.created_at)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(tutor)}
                        className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tutor)}
                        className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition" 
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600" dark:text-slate-300>
                      <Phone className="w-4 h-4 text-gray-400" dark:text-slate-500 />
                      <span>{formatPhone(tutor.whatsapp)}</span>
                    </div>
                    {tutor.instagram && (
                      <div className="flex items-center gap-2 text-gray-600" dark:text-slate-300>
                        <Instagram className="w-4 h-4 text-gray-400" dark:text-slate-500 />
                        <span className="truncate">{tutor.instagram}</span>
                      </div>
                    )}
                    {tutor.endereco && (
                      <div className="flex items-start gap-2 text-gray-600" dark:text-slate-300>
                        <MapPin className="w-4 h-4 text-gray-400" dark:text-slate-500 />
                        <span className="line-clamp-2">{tutor.endereco}</span>
                      </div>
                    )}
                  </div>

                  {(petsMap[tutor.id] || []).length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Dog className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                          {(petsMap[tutor.id] || []).length} pet(s)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(petsMap[tutor.id] || []).map((pet) => (
                          <span key={pet.id} className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            {pet.nome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Tutor' : 'Novo Tutor'}
        description="Preencha os dados do tutor"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome Completo"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do tutor"
            required
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            placeholder="(11) 99999-9999"
            icon={<Phone className="w-4 h-4" />}
            required
          />
          <Input
            label="Instagram (opcional)"
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@usuario"
            icon={<Instagram className="w-4 h-4" />}
          />
          <Textarea
            label="Endereço"
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            placeholder="Endereço completo"
            rows={2}
          />
          <Textarea
            label="Observações"
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            placeholder="Observações sobre o tutor"
            rows={2}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Tutor"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Esta ação também removerá os pets e agendamentos vinculados.`}
        confirmLabel="Excluir"
        danger
      />
    </Layout>
  );
}
