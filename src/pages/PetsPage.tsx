import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dog,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Syringe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  PawPrint,
  Weight,
  User,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';

import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import {
  analyzePetVaccinationStatus,
  type PetVaccineStatus,
} from '@/lib/protocol';

import type {
  Pet,
  Tutor,
  Vaccine,
  VaccineApplication,
  Especie,
} from '@/types/database';

import { ESPECIES } from '@/types/database';

export function PetsPage() {
  const { toast } = useToast();

  const [pets, setPets] = useState<Pet[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pet | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pet | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const [saving, setSaving] = useState(false);

  // Foto
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: '',
    especie: 'Cão' as Especie,
    raca: '',
    idade: '',
    peso: '',
    sexo: '',
    descricao: '',
    observacoes: '',
    tutor_id: '',
  });

  // =========================================================
  // CARREGAR PETS E TUTORES
  // =========================================================

  const load = useCallback(async () => {
    setLoading(true);

    const [
      { data: petsData, error: petsError },
      { data: tutorsData, error: tutorsError },
    ] = await Promise.all([
      supabase
        .from('pets')
        .select('*, tutor:tutors(*)')
        .order('created_at', { ascending: false }),

      supabase
        .from('tutors')
        .select('*')
        .order('nome'),
    ]);

    if (petsError) {
      console.error('Erro ao carregar pets:', petsError);
    }

    if (tutorsError) {
      console.error('Erro ao carregar tutores:', tutorsError);
    }

    setPets((petsData as Pet[]) || []);
    setTutors((tutorsData as Tutor[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // FILTRO
  // =========================================================

  const filtered = pets.filter((pet) => {
    const query = search.toLowerCase();

    return (
      pet.nome.toLowerCase().includes(query) ||
      pet.tutor?.nome?.toLowerCase().includes(query) ||
      pet.raca?.toLowerCase().includes(query)
    );
  });

  // =========================================================
  // NOVO PET
  // =========================================================

  const openCreate = () => {
    setEditing(null);

    setForm({
      nome: '',
      especie: 'Cão',
      raca: '',
      idade: '',
      peso: '',
      sexo: '',
      descricao: '',
      observacoes: '',
      tutor_id: tutors[0]?.id || '',
    });

    setPhotoFile(null);
    setPhotoPreview(null);

    setModalOpen(true);
  };

  // =========================================================
  // EDITAR PET
  // =========================================================

  const openEdit = (pet: Pet) => {
    setEditing(pet);

    setForm({
      nome: pet.nome,
      especie: pet.especie,
      raca: pet.raca || '',
      idade: pet.idade || '',
      peso: pet.peso || '',
      sexo: pet.sexo || '',
      descricao: pet.descricao || '',
      observacoes: pet.observacoes || '',
      tutor_id: pet.tutor_id,
    });

    setPhotoFile(null);
    setPhotoPreview(pet.foto_url || null);

    setModalOpen(true);
  };

  // =========================================================
  // UPLOAD DA FOTO
  // =========================================================

  const uploadPetPhoto = async (petId: string) => {
    if (!photoFile) {
      return null;
    }

    const extension =
      photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';

    const filePath = `${petId}/foto-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('pet-photos')
      .upload(filePath, photoFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('pet-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // =========================================================
  // SALVAR PET
  // =========================================================

  const handleSave = async () => {
    if (!form.nome.trim() || !form.tutor_id) {
      toast('Nome e tutor são obrigatórios', 'error');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nome: form.nome.trim(),
        especie: form.especie,
        raca: form.raca.trim() || null,
        idade: form.idade.trim() || null,
        peso: form.peso.trim() || null,
        sexo: form.sexo.trim() || null,
        descricao: form.descricao.trim() || null,
        observacoes: form.observacoes.trim() || null,
        tutor_id: form.tutor_id,
      };

      // =====================================================
      // EDITAR PET EXISTENTE
      // =====================================================

      if (editing) {
        let fotoUrl = editing.foto_url || null;

        if (photoFile) {
          fotoUrl = await uploadPetPhoto(editing.id);
        }

        const { error } = await supabase
          .from('pets')
          .update({
            ...payload,
            foto_url: fotoUrl,
          })
          .eq('id', editing.id);

        if (error) {
          throw error;
        }

        toast('Pet atualizado com sucesso');
      }

      // =====================================================
      // NOVO PET
      // =====================================================

      else {
        const { data: newPet, error } = await supabase
          .from('pets')
          .insert(payload)
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (photoFile && newPet) {
          const fotoUrl = await uploadPetPhoto(newPet.id);

          const { error: photoError } = await supabase
            .from('pets')
            .update({
              foto_url: fotoUrl,
            })
            .eq('id', newPet.id);

          if (photoError) {
            throw photoError;
          }
        }

        toast('Pet cadastrado com sucesso');
      }

      setModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview(null);

      await load();
    } catch (error: unknown) {
      console.error('Erro ao salvar pet:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao salvar pet';

      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // EXCLUIR PET
  // =========================================================

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      console.error('Erro ao excluir pet:', error);

      toast(
        'Não foi possível excluir o pet. Verifique se existem registros vinculados.',
        'error'
      );

      return;
    }

    toast('Pet excluído com sucesso');

    setDeleteTarget(null);

    await load();
  };

  // =========================================================
  // PERFIL DO PET
  // =========================================================

  if (selectedPet) {
    return (
      <PetProfile
        pet={selectedPet}
        onBack={() => setSelectedPet(null)}
      />
    );
  }

  return (
    <Layout
      title="Pets"
      actions={
        <Button
          onClick={openCreate}
          disabled={tutors.length === 0}
        >
          <Plus className="w-4 h-4" />
          Novo Pet
        </Button>
      }
    >
      <PageHeader
        title="Pets"
        description="Gerencie os pets cadastrados no sistema"
      />

      {tutors.length === 0 && (
        <Card className="mb-4 border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardBody>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Cadastre um tutor antes de adicionar pets.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome do pet, tutor ou raça..."
          className="max-w-md"
        />
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Dog className="w-8 h-8" />}
          title={
            search
              ? 'Nenhum pet encontrado'
              : 'Nenhum pet cadastrado'
          }
          description={
            search
              ? 'Tente outra busca'
              : 'Comece cadastrando o primeiro pet'
          }
          action={
            !search &&
            tutors.length > 0 && (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Novo Pet
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pet, i) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                hover
                className="cursor-pointer"
              >
                <CardBody
                  onClick={() => setSelectedPet(pet)}
                >
                  <div className="flex items-start gap-3">
                    {/* FOTO / ÍCONE */}
                    {pet.foto_url ? (
                      <img
                        src={pet.foto_url}
                        alt={pet.nome}
                        className="h-11 w-11 shrink-0 rounded-xl object-cover border border-gray-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                        {pet.especie === 'Gato' ? (
                          <PawPrint className="w-5 h-5" />
                        ) : (
                          <Dog className="w-5 h-5" />
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {pet.nome}
                      </h3>

                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {pet.tutor?.nome || 'Sem tutor'}
                      </p>
                    </div>

                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => openEdit(pet)}
                        className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteTarget(pet)}
                        className="rounded-lg p-1.5 text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 text-xs">
                        Espécie
                      </span>

                      <p className="text-gray-700 dark:text-slate-200 font-medium">
                        {pet.especie}
                      </p>
                    </div>

                    {pet.raca && (
                      <div>
                        <span className="text-gray-400 dark:text-slate-500 text-xs">
                          Raça
                        </span>

                        <p className="text-gray-700 dark:text-slate-200 font-medium truncate">
                          {pet.raca}
                        </p>
                      </div>
                    )}

                    {pet.idade && (
                      <div>
                        <span className="text-gray-400 dark:text-slate-500 text-xs">
                          Idade
                        </span>

                        <p className="text-gray-700 dark:text-slate-200 font-medium">
                          {pet.idade}
                        </p>
                      </div>
                    )}

                    {pet.peso && (
                      <div>
                        <span className="text-gray-400 dark:text-slate-500 text-xs">
                          Peso
                        </span>

                        <p className="text-gray-700 dark:text-slate-200 font-medium">
                          {pet.peso}
                        </p>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* =====================================================
          MODAL PET
      ===================================================== */}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Pet' : 'Novo Pet'}
        description="Preencha os dados do pet"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSave}
              loading={saving}
            >
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* FOTO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Foto do Pet
            </label>

            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Prévia do pet"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <PawPrint className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                )}
              </div>

              <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition">
                Selecionar foto

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file =
                      e.target.files?.[0];

                    if (!file) {
                      return;
                    }

                    // Até 5 MB
                    if (file.size > 5 * 1024 * 1024) {
                      toast(
                        'A foto deve ter no máximo 5 MB',
                        'error'
                      );

                      return;
                    }

                    setPhotoFile(file);

                    const previewUrl =
                      URL.createObjectURL(file);

                    setPhotoPreview(previewUrl);
                  }}
                />
              </label>
            </div>
          </div>

          {/* TUTOR */}
          <Select
            label="Tutor"
            value={form.tutor_id}
            onChange={(e) =>
              setForm({
                ...form,
                tutor_id: e.target.value,
              })
            }
            required
          >
            <option value="">
              Selecione um tutor
            </option>

            {tutors.map((tutor) => (
              <option
                key={tutor.id}
                value={tutor.id}
              >
                {tutor.nome}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome do Pet"
              value={form.nome}
              onChange={(e) =>
                setForm({
                  ...form,
                  nome: e.target.value,
                })
              }
              placeholder="Nome"
              required
            />

            <Select
              label="Espécie"
              value={form.especie}
              onChange={(e) =>
                setForm({
                  ...form,
                  especie:
                    e.target.value as Especie,
                })
              }
            >
              {ESPECIES.map((especie) => (
                <option
                  key={especie}
                  value={especie}
                >
                  {especie}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Raça"
              value={form.raca}
              onChange={(e) =>
                setForm({
                  ...form,
                  raca: e.target.value,
                })
              }
              placeholder="Raça"
            />

            <Input
              label="Idade"
              value={form.idade}
              onChange={(e) =>
                setForm({
                  ...form,
                  idade: e.target.value,
                })
              }
              placeholder="Ex: 2 anos"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Peso"
              value={form.peso}
              onChange={(e) =>
                setForm({
                  ...form,
                  peso: e.target.value,
                })
              }
              placeholder="Ex: 5kg"
            />

            <Select
              label="Sexo (opcional)"
              value={form.sexo}
              onChange={(e) =>
                setForm({
                  ...form,
                  sexo: e.target.value,
                })
              }
            >
              <option value="">
                Não informar
              </option>

              <option value="Macho">
                Macho
              </option>

              <option value="Fêmea">
                Fêmea
              </option>
            </Select>
          </div>

          <Textarea
            label="Descrição"
            value={form.descricao}
            onChange={(e) =>
              setForm({
                ...form,
                descricao: e.target.value,
              })
            }
            placeholder="Descrição do pet"
            rows={2}
          />

          <Textarea
            label="Observações"
            value={form.observacoes}
            onChange={(e) =>
              setForm({
                ...form,
                observacoes: e.target.value,
              })
            }
            placeholder="Observações clínicas"
            rows={2}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Pet"
        message={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Pets com histórico ou agendamentos vinculados podem não ser excluídos.`}
        confirmLabel="Excluir"
        danger
      />
    </Layout>
  );
}

// ===========================================================
// PERFIL DO PET
// ===========================================================

function PetProfile({
  pet,
  onBack,
}: {
  pet: Pet;
  onBack: () => void;
}) {
  const [applications, setApplications] =
    useState<VaccineApplication[]>([]);

  const [vaccineStatus, setVaccineStatus] =
    useState<PetVaccineStatus[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    const [
      { data: apps },
      { data: vax },
    ] = await Promise.all([
      supabase
        .from('vaccine_applications')
        .select('*, vaccine:vaccines(*)')
        .eq('pet_id', pet.id)
        .order('data_aplicacao', {
          ascending: false,
        }),

      supabase
        .from('vaccines')
        .select('*')
        .eq('ativo', true),
    ]);

    const appList =
      (apps as VaccineApplication[]) || [];

    const vaxList =
      (vax as Vaccine[]) || [];

    setApplications(appList);

    setVaccineStatus(
      analyzePetVaccinationStatus(
        appList,
        vaxList
      )
    );

    setLoading(false);
  }, [pet.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const statusConfig: Record<
    string,
    {
      label: string;
      bg: string;
      text: string;
      icon: typeof CheckCircle2;
    }
  > = {
    em_dia: {
      label: 'Em Dia',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle2,
    },

    pendente: {
      label: 'Pendente',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      icon: Clock,
    },

    atrasada: {
      label: 'Atrasada',
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      icon: AlertTriangle,
    },

    incompleto: {
      label: 'Incompleto',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      icon: AlertTriangle,
    },

    nao_iniciado: {
      label: 'Não Iniciado',
      bg: 'bg-gray-100 dark:bg-slate-800',
      text: 'text-gray-600 dark:text-slate-300',
      icon: Clock,
    },
  };

  return (
    <Layout title={`Pet: ${pet.nome}`}>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para lista
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DADOS DO PET */}
        <div className="lg:col-span-1">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center">
                {pet.foto_url ? (
                  <img
                    src={pet.foto_url}
                    alt={pet.nome}
                    className="h-24 w-24 rounded-2xl object-cover border border-gray-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                    {pet.especie === 'Gato' ? (
                      <PawPrint className="w-10 h-10" />
                    ) : (
                      <Dog className="w-10 h-10" />
                    )}
                  </div>
                )}

                <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                  {pet.nome}
                </h2>

                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {pet.especie}
                  {pet.raca
                    ? ` · ${pet.raca}`
                    : ''}
                </p>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400 dark:text-slate-500" />

                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Tutor
                    </p>

                    <p className="font-medium text-gray-700 dark:text-slate-200">
                      {pet.tutor?.nome || 'N/A'}
                    </p>
                  </div>
                </div>

                {pet.idade && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500" />

                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Idade
                      </p>

                      <p className="font-medium text-gray-700 dark:text-slate-200">
                        {pet.idade}
                      </p>
                    </div>
                  </div>
                )}

                {pet.peso && (
                  <div className="flex items-center gap-3">
                    <Weight className="w-4 h-4 text-gray-400 dark:text-slate-500" />

                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Peso
                      </p>

                      <p className="font-medium text-gray-700 dark:text-slate-200">
                        {pet.peso}
                      </p>
                    </div>
                  </div>
                )}

                {pet.sexo && (
                  <div className="flex items-center gap-3">
                    <PawPrint className="w-4 h-4 text-gray-400 dark:text-slate-500" />

                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Sexo
                      </p>

                      <p className="font-medium text-gray-700 dark:text-slate-200">
                        {pet.sexo}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {pet.observacoes && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                    Observações
                  </p>

                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    {pet.observacoes}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* SITUAÇÃO VACINAL */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-emerald-600" />

                <CardTitle>
                  Situação Vacinal do Pet
                </CardTitle>
              </div>
            </CardHeader>

            <CardBody>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({
                    length: 3,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : vaccineStatus.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                  Nenhuma vacina cadastrada
                </p>
              ) : (
                <div className="space-y-3">
                  {vaccineStatus.map(
                    (vs, i) => {
                      const cfg =
                        statusConfig[
                          vs.status
                        ];

                      const Icon =
                        cfg.icon;

                      return (
                        <motion.div
                          key={vs.vaccine.id}
                          initial={{
                            opacity: 0,
                            x: 10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              i * 0.05,
                          }}
                          className={`flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3 ${cfg.bg}`}
                        >
                          <Icon
                            className={`w-5 h-5 ${cfg.text}`}
                          />

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-slate-100">
                              {
                                vs
                                  .vaccine
                                  .nome
                              }
                            </p>

                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {
                                vs.appliedDoses
                              }
                              /
                              {
                                vs.totalDoses
                              }{' '}
                              doses
                              aplicadas

                              {vs.nextDoseLabel &&
                                ` · Próxima: ${vs.nextDoseLabel}`}

                              {vs.nextDoseDate &&
                                ` (${formatDate(
                                  vs.nextDoseDate
                                )})`}
                            </p>
                          </div>

                          <Badge
                            className={`${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </Badge>
                        </motion.div>
                      );
                    }
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* HISTÓRICO */}
          <Card>
            <CardHeader>
              <CardTitle>
                Histórico de Aplicações
              </CardTitle>
            </CardHeader>

            <CardBody>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({
                    length: 3,
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse"
                    />
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                  Nenhuma aplicação registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {applications.map(
                    (app, i) => (
                      <motion.div
                        key={app.id}
                        initial={{
                          opacity: 0,
                          y: 8,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay:
                            i * 0.05,
                        }}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                          <Syringe className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 dark:text-slate-100">
                            {
                              app
                                .vaccine
                                ?.nome
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
                        </div>

                        {app.proxima_dose && (
                          <div className="text-right">
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              Próxima
                              dose
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
            </CardBody>
          </Card>
        </div>
      </div>
    </Layout>
  );
}