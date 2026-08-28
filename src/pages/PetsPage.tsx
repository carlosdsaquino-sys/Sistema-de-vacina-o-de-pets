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
  ArchiveRestore,
  Archive,
  Eye,
  Users,
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

import {
  Input,
  Select,
  Textarea,
} from '@/components/ui/Input';

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

// ===========================================================
// TIPOS
// ===========================================================

type PetWithArchive = Pet & {
  ativo?: boolean;
};

type PetFilter =
  | 'ativos'
  | 'arquivados'
  | 'todos';

type RemoveAction =
  | 'delete'
  | 'archive'
  | 'permanent';

// ===========================================================
// PÁGINA
// ===========================================================

export function PetsPage() {
  const { toast } = useToast();

  const [pets, setPets] =
    useState<PetWithArchive[]>([]);

  const [tutors, setTutors] =
    useState<Tutor[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<PetFilter>('ativos');

  // =========================================================
  // MODAL
  // =========================================================

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<PetWithArchive | null>(null);

  const [selectedPet, setSelectedPet] =
    useState<PetWithArchive | null>(null);

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // ARQUIVAR / EXCLUIR
  // =========================================================

  const [actionTarget, setActionTarget] =
    useState<PetWithArchive | null>(null);

  const [actionType, setActionType] =
    useState<RemoveAction | null>(null);

  const [checkingPetId, setCheckingPetId] =
    useState<string | null>(null);

  const [processingAction, setProcessingAction] =
    useState(false);

  // =========================================================
  // FOTO
  // =========================================================

  const [photoFile, setPhotoFile] =
    useState<File | null>(null);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  // =========================================================
  // FORMULÁRIO
  // =========================================================

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
  // CARREGAR
  // =========================================================

  const load = useCallback(async () => {
    setLoading(true);

    const [
      {
        data: petsData,
        error: petsError,
      },
      {
        data: tutorsData,
        error: tutorsError,
      },
    ] = await Promise.all([
      supabase
        .from('pets')
        .select('*, tutor:tutors!pets_org_tutor_fkey(*)')
        .order('created_at', {  
          ascending: false,
        }),

      supabase
        .from('tutors')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ]);

    if (petsError) {
      console.error(
        'Erro ao carregar pets:',
        petsError
      );

      toast(
        'Erro ao carregar pets',
        'error'
      );
    }

    if (tutorsError) {
      console.error(
        'Erro ao carregar tutores:',
        tutorsError
      );
    }

    setPets(
      (petsData as PetWithArchive[]) || []
    );

    setTutors(
      (tutorsData as Tutor[]) || []
    );

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // CONTADORES
  // =========================================================

  const activeCount =
    pets.filter(
      (pet) => pet.ativo !== false
    ).length;

  const archivedCount =
    pets.filter(
      (pet) => pet.ativo === false
    ).length;

  const totalCount =
    pets.length;

  // =========================================================
  // FILTRO
  // =========================================================

  const filtered =
    pets.filter((pet) => {
      const query =
        search
          .trim()
          .toLowerCase();

      const matchSearch =
        pet.nome
          .toLowerCase()
          .includes(query) ||
        pet.tutor?.nome
          ?.toLowerCase()
          .includes(query) ||
        pet.raca
          ?.toLowerCase()
          .includes(query);

      if (!matchSearch) {
        return false;
      }

      const isActive =
        pet.ativo !== false;

      if (
        statusFilter === 'ativos'
      ) {
        return isActive;
      }

      if (
        statusFilter === 'arquivados'
      ) {
        return !isActive;
      }

      return true;
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
      tutor_id:
        tutors[0]?.id || '',
    });

    setPhotoFile(null);
    setPhotoPreview(null);

    setModalOpen(true);
  };

  // =========================================================
  // EDITAR
  // =========================================================

  const openEdit = (
    pet: PetWithArchive
  ) => {
    setEditing(pet);

    setForm({
      nome: pet.nome,
      especie: pet.especie,
      raca: pet.raca || '',
      idade: pet.idade || '',
      peso: pet.peso || '',
      sexo: pet.sexo || '',
      descricao:
        pet.descricao || '',
      observacoes:
        pet.observacoes || '',
      tutor_id:
        pet.tutor_id,
    });

    setPhotoFile(null);

    setPhotoPreview(
      pet.foto_url || null
    );

    setModalOpen(true);
  };

  // =========================================================
  // UPLOAD FOTO
  // =========================================================

  const uploadPetPhoto = async (
    petId: string
  ) => {
    if (!photoFile) {
      return null;
    }

    // Descobre a empresa do usuário logado.
    // O caminho no Storage passa a ficar:
    // organization_id/pet_id/foto-arquivo.ext
    const {
      data: organizationId,
      error: organizationError,
    } = await supabase.rpc(
      'current_organization_id'
    );

    if (
      organizationError ||
      !organizationId
    ) {
      throw new Error(
        'Não foi possível identificar a empresa do usuário.'
      );
    }

    const extension =
      photoFile.name
        .split('.')
        .pop()
        ?.toLowerCase() ||
      'jpg';

    const filePath =
      `${organizationId}/${petId}/foto-${Date.now()}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from('pet-photos')
      .upload(
        filePath,
        photoFile,
        {
          cacheControl: '3600',
          upsert: false,
        }
      );

    if (uploadError) {
      throw uploadError;
    }

    const { data } =
      supabase.storage
        .from('pet-photos')
        .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // =========================================================
  // REMOVER FOTO STORAGE
  // =========================================================

  const removePetPhoto = async (
    photoUrl:
      | string
      | null
      | undefined
  ) => {
    if (!photoUrl) {
      return;
    }

    try {
      const marker =
        '/storage/v1/object/public/pet-photos/';

      const index =
        photoUrl.indexOf(marker);

      if (index === -1) {
        return;
      }

      const filePath =
        decodeURIComponent(
          photoUrl.substring(
            index + marker.length
          )
        );

      const { error } =
        await supabase.storage
          .from('pet-photos')
          .remove([filePath]);

      if (error) {
        console.error(
          'Erro ao remover foto:',
          error
        );
      }
    } catch (error) {
      console.error(
        'Erro ao remover foto:',
        error
      );
    }
  };

  // =========================================================
  // SALVAR
  // =========================================================

  const handleSave = async () => {
    if (
      !form.nome.trim() ||
      !form.tutor_id
    ) {
      toast(
        'Nome e tutor são obrigatórios',
        'error'
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        nome:
          form.nome.trim(),

        especie:
          form.especie,

        raca:
          form.raca.trim() ||
          null,

        idade:
          form.idade.trim() ||
          null,

        peso:
          form.peso.trim() ||
          null,

        sexo:
          form.sexo.trim() ||
          null,

        descricao:
          form.descricao.trim() ||
          null,

        observacoes:
          form.observacoes.trim() ||
          null,

        tutor_id:
          form.tutor_id,
      };

      // =====================================================
      // EDITAR
      // =====================================================

      if (editing) {
        let fotoUrl =
          editing.foto_url ||
          null;

        const oldPhotoUrl =
          editing.foto_url ||
          null;

        if (photoFile) {
          fotoUrl =
            await uploadPetPhoto(
              editing.id
            );
        }

        const { error } =
          await supabase
            .from('pets')
            .update({
              ...payload,
              foto_url:
                fotoUrl,
            })
            .eq(
              'id',
              editing.id
            );

        if (error) {
          throw error;
        }

        if (
          photoFile &&
          oldPhotoUrl &&
          fotoUrl !== oldPhotoUrl
        ) {
          await removePetPhoto(
            oldPhotoUrl
          );
        }

        toast(
          'Pet atualizado com sucesso'
        );
      }

      // =====================================================
      // NOVO
      // =====================================================

      else {
        const {
          data: newPet,
          error,
        } =
          await supabase
            .from('pets')
            .insert({
              ...payload,
              ativo: true,
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        if (
          photoFile &&
          newPet
        ) {
          const fotoUrl =
            await uploadPetPhoto(
              newPet.id
            );

          const {
            error: photoError,
          } =
            await supabase
              .from('pets')
              .update({
                foto_url:
                  fotoUrl,
              })
              .eq(
                'id',
                newPet.id
              );

          if (photoError) {
            throw photoError;
          }
        }

        toast(
          'Pet cadastrado com sucesso'
        );
      }

      setModalOpen(false);

      setPhotoFile(null);
      setPhotoPreview(null);

      await load();
    } catch (
      error: unknown
    ) {
      console.error(
        'Erro ao salvar pet:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Erro ao salvar pet';

      toast(
        message,
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // VERIFICAR HISTÓRICO
  // =========================================================

  const petHasHistory = async (
    petId: string
  ) => {
    const [
      appointmentsResult,
      applicationsResult,
      bookletsResult,
    ] = await Promise.all([
      supabase
        .from('appointments')
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('pet_id', petId),

      supabase
        .from(
          'vaccine_applications'
        )
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('pet_id', petId),

      supabase
        .from(
          'digital_booklets'
        )
        .select('id', {
          count: 'exact',
          head: true,
        })
        .eq('pet_id', petId),
    ]);

    if (
      appointmentsResult.error
    ) {
      throw appointmentsResult.error;
    }

    if (
      applicationsResult.error
    ) {
      throw applicationsResult.error;
    }

    if (
      bookletsResult.error
    ) {
      throw bookletsResult.error;
    }

    return (
      (appointmentsResult.count || 0) >
        0 ||
      (applicationsResult.count || 0) >
        0 ||
      (bookletsResult.count || 0) >
        0
    );
  };

  // =========================================================
  // CLICOU NA LIXEIRA
  // =========================================================

  const handleRemoveClick = async (
    pet: PetWithArchive
  ) => {
    if (pet.ativo === false) {
      setActionTarget(pet);

      setActionType(
        'permanent'
      );

      return;
    }

    setCheckingPetId(
      pet.id
    );

    try {
      const hasHistory =
        await petHasHistory(
          pet.id
        );

      setActionTarget(pet);

      if (hasHistory) {
        setActionType(
          'archive'
        );
      } else {
        setActionType(
          'delete'
        );
      }
    } catch (error) {
      console.error(
        'Erro ao verificar histórico:',
        error
      );

      toast(
        'Não foi possível verificar o histórico do pet.',
        'error'
      );
    } finally {
      setCheckingPetId(
        null
      );
    }
  };

  // =========================================================
  // CONFIRMAR AÇÃO
  // =========================================================

  const handleConfirmAction =
    async () => {
      if (
        !actionTarget ||
        !actionType
      ) {
        return;
      }

      setProcessingAction(
        true
      );

      try {
        // ===================================================
        // ARQUIVAR
        // ===================================================

        if (
          actionType === 'archive'
        ) {
          const { error } =
            await supabase
              .from('pets')
              .update({
                ativo: false,
              })
              .eq(
                'id',
                actionTarget.id
              );

          if (error) {
            throw error;
          }

          toast(
            'Pet arquivado com sucesso!'
          );
        }

        // ===================================================
        // EXCLUIR SEM HISTÓRICO
        // ===================================================

        if (
          actionType === 'delete'
        ) {
          const { error } =
            await supabase
              .from('pets')
              .delete()
              .eq(
                'id',
                actionTarget.id
              );

          if (error) {
            throw error;
          }

          await removePetPhoto(
            actionTarget.foto_url
          );

          toast(
            'Pet excluído permanentemente!'
          );
        }

        // ===================================================
        // EXCLUIR ARQUIVADO
        // ===================================================

        if (
          actionType ===
          'permanent'
        ) {
          const { error } =
            await supabase.rpc(
              'delete_pet_permanently',
              {
                p_pet_id:
                  actionTarget.id,
              }
            );

          if (error) {
            throw error;
          }

          await removePetPhoto(
            actionTarget.foto_url
          );

          toast(
            'Pet e histórico excluídos permanentemente!'
          );
        }

        setActionTarget(null);
        setActionType(null);

        await load();
      } catch (
        error: unknown
      ) {
        console.error(
          'Erro ao processar pet:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Erro ao processar pet';

        toast(
          message,
          'error'
        );
      } finally {
        setProcessingAction(
          false
        );
      }
    };

  // =========================================================
  // RESTAURAR
  // =========================================================

  const handleRestore = async (
    pet: PetWithArchive
  ) => {
    const { error } =
      await supabase
        .from('pets')
        .update({
          ativo: true,
        })
        .eq(
          'id',
          pet.id
        );

    if (error) {
      toast(
        'Erro ao restaurar pet',
        'error'
      );

      return;
    }

    toast(
      'Pet restaurado com sucesso!'
    );

    await load();
  };

  // =========================================================
  // PERFIL
  // =========================================================

  if (selectedPet) {
    return (
      <PetProfile
        pet={selectedPet}
        onBack={() =>
          setSelectedPet(null)
        }
      />
    );
  }

  // =========================================================
  // DIALOG
  // =========================================================

  const dialogTitle =
    actionType === 'archive'
      ? 'Arquivar Pet'
      : actionType ===
          'permanent'
        ? 'Excluir Permanentemente'
        : 'Excluir Pet';

  const dialogMessage =
    actionType === 'archive'
      ? `"${actionTarget?.nome}" possui histórico no sistema. Para preservar esses registros, o pet será arquivado em vez de excluído. Deseja continuar?`
      : actionType ===
          'permanent'
        ? `ATENÇÃO: isso excluirá permanentemente "${actionTarget?.nome}" e também seus agendamentos, aplicações, caderneta e registros relacionados. Esta ação não pode ser desfeita.`
        : `Tem certeza que deseja excluir "${actionTarget?.nome}" permanentemente? Este pet não possui histórico vinculado.`;

  // =========================================================
  // TELA
  // =========================================================

  return (
    <Layout
      title="Pets"
      actions={
        <Button
          onClick={openCreate}
          disabled={
            tutors.length === 0
          }
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

      {/* =================================================== */}
      {/* RESUMO */}
      {/* =================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <PawPrint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Pets ativos
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCount}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800">
                <Archive className="w-5 h-5 text-gray-600 dark:text-slate-300" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Arquivados
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {archivedCount}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Total cadastrado
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalCount}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

      </div>

      {tutors.length === 0 && (
        <Card className="mb-5 border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardBody>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Cadastre ou restaure um tutor antes de adicionar pets.
            </p>
          </CardBody>
        </Card>
      )}

      {/* =================================================== */}
      {/* BUSCA / FILTROS */}
      {/* =================================================== */}

      <Card className="mb-5">
        <CardBody>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar por nome do pet, tutor ou raça..."
                className="w-full"
              />
            </div>

            <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-slate-950 p-1.5 overflow-x-auto">

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(
                    'ativos'
                  )
                }
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  statusFilter ===
                  'ativos'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Ativos

                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(
                    'arquivados'
                  )
                }
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  statusFilter ===
                  'arquivados'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Arquivados

                <span className="rounded-full bg-gray-200 dark:bg-slate-700 px-2 py-0.5 text-xs">
                  {archivedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStatusFilter(
                    'todos'
                  )
                }
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                  statusFilter ===
                  'todos'
                    ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white'
                }`}
              >
                Todos

                <span className="rounded-full bg-gray-200 dark:bg-slate-700 px-2 py-0.5 text-xs">
                  {totalCount}
                </span>
              </button>

            </div>

          </div>

        </CardBody>
      </Card>

      {/* =================================================== */}
      {/* PETS */}
      {/* =================================================== */}

      {loading ? (
        <SkeletonList count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={
            statusFilter ===
            'arquivados' ? (
              <Archive className="w-8 h-8" />
            ) : (
              <Dog className="w-8 h-8" />
            )
          }
          title={
            statusFilter ===
            'arquivados'
              ? 'Nenhum pet arquivado'
              : search
                ? 'Nenhum pet encontrado'
                : 'Nenhum pet cadastrado'
          }
          description={
            statusFilter ===
            'arquivados'
              ? 'Pets arquivados aparecerão aqui.'
              : search
                ? 'Tente realizar outra busca.'
                : 'Comece cadastrando o primeiro pet.'
          }
          action={
            !search &&
            statusFilter ===
              'ativos' &&
            tutors.length > 0 ? (
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Novo Pet
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">

          {filtered.map(
            (
              pet,
              index
            ) => {
              const archived =
                pet.ativo === false;

              return (
                <motion.div
                  key={pet.id}
                  initial={{
                    opacity: 0,
                    y: 12,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index * 0.04,
                  }}
                >
                  <Card
                    hover
                    className={
                      archived
                        ? 'border-dashed opacity-85'
                        : ''
                    }
                  >
                    <CardBody>

                      {/* =================================== */}
                      {/* CABEÇALHO */}
                      {/* =================================== */}

                      <div className="flex items-start gap-4">

                        {pet.foto_url ? (
                          <img
                            src={
                              pet.foto_url
                            }
                            alt={
                              pet.nome
                            }
                            className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl object-cover border border-gray-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">

                            {pet.especie ===
                            'Gato' ? (
                              <PawPrint className="w-8 h-8" />
                            ) : (
                              <Dog className="w-8 h-8" />
                            )}

                          </div>
                        )}

                        <div className="flex-1 min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                              {pet.nome}
                            </h3>

                            {archived && (
                              <Badge className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                                Arquivado
                              </Badge>
                            )}

                          </div>

                          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                            {pet.especie}

                            {pet.raca
                              ? ` · ${pet.raca}`
                              : ''}
                          </p>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">

                            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />

                            <span>
                              Tutor:{' '}
                              <strong className="font-medium">
                                {pet.tutor
                                  ?.nome ||
                                  'Sem tutor'}
                              </strong>
                            </span>

                          </div>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* INFORMAÇÕES */}
                      {/* =================================== */}

                      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            Espécie
                          </p>

                          <p className="mt-1 font-semibold text-gray-800 dark:text-slate-100">
                            {pet.especie}
                          </p>

                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            Raça
                          </p>

                          <p className="mt-1 font-semibold text-gray-800 dark:text-slate-100 truncate">
                            {pet.raca ||
                              '—'}
                          </p>

                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            Idade
                          </p>

                          <p className="mt-1 font-semibold text-gray-800 dark:text-slate-100">
                            {pet.idade ||
                              '—'}
                          </p>

                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-gray-400 dark:text-slate-500">
                            Peso
                          </p>

                          <p className="mt-1 font-semibold text-gray-800 dark:text-slate-100">
                            {pet.peso ||
                              '—'}
                          </p>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* RODAPÉ */}
                      {/* =================================== */}

                      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setSelectedPet(
                              pet
                            )
                          }
                        >
                          <Eye className="w-4 h-4" />
                          Ver perfil
                        </Button>

                        <div className="flex flex-wrap items-center gap-2">

                          {!archived && (
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  pet
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </button>
                          )}

                          {archived && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRestore(
                                  pet
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                            >
                              <ArchiveRestore className="w-4 h-4" />
                              Restaurar
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={
                              checkingPetId ===
                              pet.id
                            }
                            onClick={() =>
                              handleRemoveClick(
                                pet
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                          >
                            <Trash2
                              className={`w-4 h-4 ${
                                checkingPetId ===
                                pet.id
                                  ? 'animate-pulse'
                                  : ''
                              }`}
                            />

                            {archived
                              ? 'Excluir permanentemente'
                              : 'Remover'}
                          </button>

                        </div>

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
      {/* MODAL */}
      {/* =================================================== */}

      <Modal
        open={modalOpen}
        onClose={() =>
          setModalOpen(false)
        }
        title={
          editing
            ? 'Editar Pet'
            : 'Novo Pet'
        }
        description="Preencha os dados do pet"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                setModalOpen(false)
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSave}
              loading={saving}
            >
              {editing
                ? 'Salvar'
                : 'Cadastrar'}
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

                    if (
                      file.size >
                      5 *
                        1024 *
                        1024
                    ) {
                      toast(
                        'A foto deve ter no máximo 5 MB',
                        'error'
                      );

                      e.target.value =
                        '';

                      return;
                    }

                    setPhotoFile(
                      file
                    );

                    setPhotoPreview(
                      URL.createObjectURL(
                        file
                      )
                    );
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
                tutor_id:
                  e.target.value,
              })
            }
            required
          >
            <option value="">
              Selecione um tutor
            </option>

            {tutors.map(
              (tutor) => (
                <option
                  key={tutor.id}
                  value={tutor.id}
                >
                  {tutor.nome}
                </option>
              )
            )}
          </Select>

          <div className="grid grid-cols-2 gap-3">

            <Input
              label="Nome do Pet"
              value={form.nome}
              onChange={(e) =>
                setForm({
                  ...form,
                  nome:
                    e.target.value,
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
                    e.target
                      .value as Especie,
                })
              }
            >
              {ESPECIES.map(
                (especie) => (
                  <option
                    key={especie}
                    value={especie}
                  >
                    {especie}
                  </option>
                )
              )}
            </Select>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <Input
              label="Raça"
              value={form.raca}
              onChange={(e) =>
                setForm({
                  ...form,
                  raca:
                    e.target.value,
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
                  idade:
                    e.target.value,
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
                  peso:
                    e.target.value,
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
                  sexo:
                    e.target.value,
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
                descricao:
                  e.target.value,
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
                observacoes:
                  e.target.value,
              })
            }
            placeholder="Observações clínicas"
            rows={2}
          />

        </div>
      </Modal>

      {/* =================================================== */}
      {/* CONFIRMAÇÃO */}
      {/* =================================================== */}

      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => {
          if (
            processingAction
          ) {
            return;
          }

          setActionTarget(null);
          setActionType(null);
        }}
        onConfirm={
          handleConfirmAction
        }
        title={dialogTitle}
        message={dialogMessage}
        confirmLabel={
          actionType ===
          'archive'
            ? 'Arquivar'
            : actionType ===
                'permanent'
              ? 'Excluir Permanentemente'
              : 'Excluir'
        }
        danger={
          actionType !==
          'archive'
        }
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

  const loadProfile =
    useCallback(async () => {
      setLoading(true);

      const [
        {
          data: apps,
        },
        {
          data: vax,
        },
      ] =
        await Promise.all([
          supabase
            .from(
              'vaccine_applications'
            )
            .select(
              '*, vaccine:vaccines(*)'
            )
            .eq(
              'pet_id',
              pet.id
            )
            .order(
              'data_aplicacao',
              {
                ascending:
                  false,
              }
            ),

          supabase
            .from('vaccines')
            .select('*')
            .eq(
              'ativo',
              true
            ),
        ]);

      const appList =
        (apps as VaccineApplication[]) ||
        [];

      const vaxList =
        (vax as Vaccine[]) ||
        [];

      setApplications(
        appList
      );

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
      bg:
        'bg-emerald-50 dark:bg-emerald-950/40',
      text:
        'text-emerald-700 dark:text-emerald-300',
      icon: CheckCircle2,
    },

    pendente: {
      label: 'Pendente',
      bg:
        'bg-blue-50 dark:bg-blue-950/40',
      text:
        'text-blue-700 dark:text-blue-300',
      icon: Clock,
    },

    atrasada: {
      label: 'Atrasada',
      bg:
        'bg-red-50 dark:bg-red-950/40',
      text:
        'text-red-700 dark:text-red-300',
      icon:
        AlertTriangle,
    },

    incompleto: {
      label: 'Incompleto',
      bg:
        'bg-amber-50 dark:bg-amber-950/40',
      text:
        'text-amber-700 dark:text-amber-300',
      icon:
        AlertTriangle,
    },

    nao_iniciado: {
      label: 'Não Iniciado',
      bg:
        'bg-gray-100 dark:bg-slate-800',
      text:
        'text-gray-600 dark:text-slate-300',
      icon: Clock,
    },
  };

  return (
    <Layout
      title={`Pet: ${pet.nome}`}
    >
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
                    className="h-28 w-28 rounded-3xl object-cover border border-gray-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">

                    {pet.especie ===
                    'Gato' ? (
                      <PawPrint className="w-11 h-11" />
                    ) : (
                      <Dog className="w-11 h-11" />
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
                      {pet.tutor
                        ?.nome ||
                        'N/A'}
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

        {/* ================================================= */}
        {/* VACINAS / HISTÓRICO */}
        {/* ================================================= */}

        <div className="lg:col-span-2 space-y-6">

          <Card>

            <CardHeader>
              <div className="flex items-center gap-2">

                <Syringe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />

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
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-16 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse"
                      />
                    )
                  )}

                </div>
              ) : vaccineStatus.length ===
                0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                  Nenhuma vacina cadastrada
                </p>
              ) : (
                <div className="space-y-3">

                  {vaccineStatus.map(
                    (
                      status,
                      index
                    ) => {
                      const config =
                        statusConfig[
                          status.status
                        ];

                      const Icon =
                        config.icon;

                      return (
                        <motion.div
                          key={
                            status
                              .vaccine
                              .id
                          }
                          initial={{
                            opacity:
                              0,
                            x:
                              10,
                          }}
                          animate={{
                            opacity:
                              1,
                            x:
                              0,
                          }}
                          transition={{
                            delay:
                              index *
                              0.05,
                          }}
                          className={`flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3 ${config.bg}`}
                        >

                          <Icon
                            className={`w-5 h-5 ${config.text}`}
                          />

                          <div className="flex-1 min-w-0">

                            <p className="font-medium text-gray-800 dark:text-slate-100">
                              {
                                status
                                  .vaccine
                                  .nome
                              }
                            </p>

                            <p className="text-xs text-gray-500 dark:text-slate-400">

                              {
                                status.appliedDoses
                              }

                              /

                              {
                                status.totalDoses
                              }{' '}

                              doses aplicadas

                              {status.nextDoseLabel &&
                                ` · Próxima: ${status.nextDoseLabel}`}

                              {status.nextDoseDate &&
                                ` (${formatDate(
                                  status.nextDoseDate
                                )})`}

                            </p>

                          </div>

                          <Badge
                            className={`${config.bg} ${config.text}`}
                          >
                            {config.label}
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
                  }).map(
                    (_, index) => (
                      <div
                        key={index}
                        className="h-16 rounded-lg bg-gray-100 dark:bg-slate-800 animate-pulse"
                      />
                    )
                  )}

                </div>
              ) : applications.length ===
                0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">
                  Nenhuma aplicação registrada
                </p>
              ) : (
                <div className="space-y-3">

                  {applications.map(
                    (
                      application,
                      index
                    ) => (
                      <motion.div
                        key={
                          application.id
                        }
                        initial={{
                          opacity:
                            0,
                          y:
                            8,
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
                            0.05,
                        }}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 dark:border-slate-800 p-3"
                      >

                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">

                          <Syringe className="w-4 h-4" />

                        </div>

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

                        </div>

                        {application.proxima_dose && (
                          <div className="text-right">

                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              Próxima dose
                            </p>

                            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                              {formatDate(
                                application.proxima_dose
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
