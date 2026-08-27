import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  Users,
  UserPlus,
  Phone,
  MapPin,
  Instagram,
  Edit2,
  Trash2,
  Dog,
  PawPrint,
  Archive,
  ArchiveRestore,
  CalendarDays,
} from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { PageHeader } from '@/components/layout/PageHeader';

import {
  Card,
  CardBody,
} from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';

import {
  Input,
  Textarea,
} from '@/components/ui/Input';

import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useToast } from '@/contexts/ToastContext';

import { supabase } from '@/lib/supabase';

import {
  formatDate,
  formatPhone,
  getInitials,
  normalizePhone,
} from '@/lib/utils';

import type {
  Tutor,
  Pet,
} from '@/types/database';

// ===========================================================
// TIPOS
// ===========================================================

type TutorWithArchive = Tutor & {
  ativo?: boolean;
};

type TutorFilter =
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

export function TutorsPage() {
  const { toast } = useToast();

  const [tutors, setTutors] =
    useState<TutorWithArchive[]>([]);

  const [petsMap, setPetsMap] =
    useState<Record<string, Pet[]>>({});

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<TutorFilter>(
      'ativos'
    );

  // =========================================================
  // MODAL
  // =========================================================

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<TutorWithArchive | null>(
      null
    );

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // ARQUIVAR / EXCLUIR
  // =========================================================

  const [
    actionTarget,
    setActionTarget,
  ] =
    useState<TutorWithArchive | null>(
      null
    );

  const [
    actionType,
    setActionType,
  ] =
    useState<RemoveAction | null>(
      null
    );

  const [
    checkingTutorId,
    setCheckingTutorId,
  ] =
    useState<string | null>(
      null
    );

  const [
    processingAction,
    setProcessingAction,
  ] =
    useState(false);

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] =
    useState({
      nome: '',
      whatsapp: '',
      instagram: '',
      endereco: '',
      observacoes: '',
    });

  // =========================================================
  // CARREGAR
  // =========================================================

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        const {
          data,
          error,
        } =
          await supabase
            .from('tutors')
            .select('*')
            .order(
              'created_at',
              {
                ascending:
                  false,
              }
            );

        if (error) {
          throw error;
        }

        const tutorList =
          (data as TutorWithArchive[]) ||
          [];

        setTutors(
          tutorList
        );

        // ===================================================
        // PETS DOS TUTORES
        // ===================================================

        if (
          tutorList.length >
          0
        ) {
          const {
            data: petsData,
            error:
              petsError,
          } =
            await supabase
              .from('pets')
              .select('*')
              .in(
                'tutor_id',
                tutorList.map(
                  (tutor) =>
                    tutor.id
                )
              );

          if (petsError) {
            throw petsError;
          }

          const map:
            Record<
              string,
              Pet[]
            > = {};

          for (
            const pet of
            (petsData as Pet[]) ||
            []
          ) {
            if (
              !map[
                pet.tutor_id
              ]
            ) {
              map[
                pet.tutor_id
              ] = [];
            }

            map[
              pet.tutor_id
            ].push(
              pet
            );
          }

          setPetsMap(
            map
          );
        } else {
          setPetsMap({});
        }
      } catch (error) {
        console.error(
          'Erro ao carregar tutores:',
          error
        );

        toast(
          'Erro ao carregar tutores',
          'error'
        );
      } finally {
        setLoading(false);
      }
    }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // CONTADORES
  // =========================================================

  const activeCount =
    tutors.filter(
      (tutor) =>
        tutor.ativo !==
        false
    ).length;

  const archivedCount =
    tutors.filter(
      (tutor) =>
        tutor.ativo ===
        false
    ).length;

  const totalCount =
    tutors.length;

  const totalPets =
    Object.values(
      petsMap
    ).reduce(
      (
        total,
        list
      ) =>
        total +
        list.length,
      0
    );

  // =========================================================
  // FILTRAR
  // =========================================================

  const filtered =
    tutors.filter(
      (tutor) => {
        const q =
          search
            .trim()
            .toLowerCase();

        const petMatch =
          (
            petsMap[
              tutor.id
            ] || []
          ).some(
            (pet) =>
              pet.nome
                .toLowerCase()
                .includes(
                  q
                )
          );

        const matchesSearch =
          tutor.nome
            .toLowerCase()
            .includes(
              q
            ) ||
          tutor.whatsapp
            .toLowerCase()
            .includes(
              q
            ) ||
          tutor.instagram
            ?.toLowerCase()
            .includes(
              q
            ) ||
          petMatch;

        if (
          !matchesSearch
        ) {
          return false;
        }

        const isActive =
          tutor.ativo !==
          false;

        if (
          statusFilter ===
          'ativos'
        ) {
          return isActive;
        }

        if (
          statusFilter ===
          'arquivados'
        ) {
          return !isActive;
        }

        return true;
      }
    );

  // =========================================================
  // NOVO TUTOR
  // =========================================================

  const openCreate = () => {
    setEditing(null);

    setForm({
      nome: '',
      whatsapp: '',
      instagram: '',
      endereco: '',
      observacoes: '',
    });

    setModalOpen(
      true
    );
  };

  // =========================================================
  // EDITAR
  // =========================================================

  const openEdit = (
    tutor: TutorWithArchive
  ) => {
    setEditing(
      tutor
    );

    setForm({
      nome:
        tutor.nome,

      whatsapp:
        tutor.whatsapp,

      instagram:
        tutor.instagram ||
        '',

      endereco:
        tutor.endereco ||
        '',

      observacoes:
        tutor.observacoes ||
        '',
    });

    setModalOpen(
      true
    );
  };

  // =========================================================
  // SALVAR
  // =========================================================

  const handleSave =
    async () => {
      if (
        !form.nome.trim() ||
        !form.whatsapp.trim()
      ) {
        toast(
          'Nome e WhatsApp são obrigatórios',
          'error'
        );

        return;
      }

      setSaving(true);

      try {
        const payload = {
          nome:
            form.nome.trim(),

          whatsapp:
            normalizePhone(
              form.whatsapp
            ),

          instagram:
            form.instagram.trim() ||
            null,

          endereco:
            form.endereco.trim() ||
            null,

          observacoes:
            form.observacoes.trim() ||
            null,
        };

        // ===================================================
        // EDITAR
        // ===================================================

        if (editing) {
          const {
            error,
          } =
            await supabase
              .from(
                'tutors'
              )
              .update(
                payload
              )
              .eq(
                'id',
                editing.id
              );

          if (error) {
            throw error;
          }

          toast(
            'Tutor atualizado com sucesso'
          );
        }

        // ===================================================
        // NOVO
        // ===================================================

        else {
          const {
            error,
          } =
            await supabase
              .from(
                'tutors'
              )
              .insert({
                ...payload,
                ativo:
                  true,
              });

          if (error) {
            throw error;
          }

          toast(
            'Tutor cadastrado com sucesso'
          );
        }

        setModalOpen(
          false
        );

        await load();
      } catch (
        error: unknown
      ) {
        console.error(
          'Erro ao salvar tutor:',
          error
        );

        let message =
          'Erro ao salvar tutor';

        if (
          error instanceof
          Error
        ) {
          if (
            error.message
              .toLowerCase()
              .includes(
                'duplicate'
              )
          ) {
            message =
              'WhatsApp já cadastrado';
          } else {
            message =
              error.message;
          }
        }

        toast(
          message,
          'error'
        );
      } finally {
        setSaving(
          false
        );
      }
    };

  // =========================================================
  // VERIFICAR HISTÓRICO
  // =========================================================

  const tutorHasHistory =
    async (
      tutorId: string
    ) => {
      const [
        petsResult,
        appointmentsResult,
        messagesResult,
      ] =
        await Promise.all([
          supabase
            .from('pets')
            .select(
              'id',
              {
                count:
                  'exact',
                head:
                  true,
              }
            )
            .eq(
              'tutor_id',
              tutorId
            ),

          supabase
            .from(
              'appointments'
            )
            .select(
              'id',
              {
                count:
                  'exact',
                head:
                  true,
              }
            )
            .eq(
              'tutor_id',
              tutorId
            ),

          supabase
            .from(
              'message_logs'
            )
            .select(
              'id',
              {
                count:
                  'exact',
                head:
                  true,
              }
            )
            .eq(
              'tutor_id',
              tutorId
            ),
        ]);

      if (
        petsResult.error
      ) {
        throw petsResult.error;
      }

      if (
        appointmentsResult.error
      ) {
        throw appointmentsResult.error;
      }

      if (
        messagesResult.error
      ) {
        throw messagesResult.error;
      }

      return (
        (petsResult.count ||
          0) >
          0 ||
        (appointmentsResult.count ||
          0) >
          0 ||
        (messagesResult.count ||
          0) >
          0
      );
    };

  // =========================================================
  // CLICOU EM REMOVER
  // =========================================================

  const handleRemoveClick =
    async (
      tutor:
        TutorWithArchive
    ) => {
      if (
        tutor.ativo ===
        false
      ) {
        setActionTarget(
          tutor
        );

        setActionType(
          'permanent'
        );

        return;
      }

      setCheckingTutorId(
        tutor.id
      );

      try {
        const hasHistory =
          await tutorHasHistory(
            tutor.id
          );

        setActionTarget(
          tutor
        );

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
          'Não foi possível verificar o histórico do tutor.',
          'error'
        );
      } finally {
        setCheckingTutorId(
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
          actionType ===
          'archive'
        ) {
          const {
            error,
          } =
            await supabase
              .from(
                'tutors'
              )
              .update({
                ativo:
                  false,
              })
              .eq(
                'id',
                actionTarget.id
              );

          if (error) {
            throw error;
          }

          toast(
            'Tutor arquivado com sucesso!'
          );
        }

        // ===================================================
        // EXCLUIR SEM HISTÓRICO
        // ===================================================

        if (
          actionType ===
          'delete'
        ) {
          const {
            error,
          } =
            await supabase
              .from(
                'tutors'
              )
              .delete()
              .eq(
                'id',
                actionTarget.id
              );

          if (error) {
            throw error;
          }

          toast(
            'Tutor excluído permanentemente!'
          );
        }

        // ===================================================
        // EXCLUSÃO PERMANENTE
        // ===================================================

        if (
          actionType ===
          'permanent'
        ) {
          const {
            error,
          } =
            await supabase.rpc(
              'delete_tutor_permanently',
              {
                p_tutor_id:
                  actionTarget.id,
              }
            );

          if (error) {
            throw error;
          }

          toast(
            'Tutor, pets e histórico excluídos permanentemente!'
          );
        }

        setActionTarget(
          null
        );

        setActionType(
          null
        );

        await load();
      } catch (
        error: unknown
      ) {
        console.error(
          'Erro ao processar tutor:',
          error
        );

        const message =
          error instanceof
          Error
            ? error.message
            : 'Erro ao processar tutor';

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

  const handleRestore =
    async (
      tutor:
        TutorWithArchive
    ) => {
      const {
        error,
      } =
        await supabase
          .from('tutors')
          .update({
            ativo:
              true,
          })
          .eq(
            'id',
            tutor.id
          );

      if (error) {
        console.error(
          'Erro ao restaurar:',
          error
        );

        toast(
          'Erro ao restaurar tutor',
          'error'
        );

        return;
      }

      toast(
        'Tutor restaurado com sucesso!'
      );

      await load();
    };

  // =========================================================
  // DIALOG
  // =========================================================

  const dialogTitle =
    actionType ===
    'archive'
      ? 'Arquivar Tutor'
      : actionType ===
          'permanent'
        ? 'Excluir Permanentemente'
        : 'Excluir Tutor';

  const dialogMessage =
    actionType ===
    'archive'
      ? `"${actionTarget?.nome}" possui pets ou histórico vinculado. Para preservar os dados, o tutor será arquivado em vez de excluído. Deseja continuar?`
      : actionType ===
          'permanent'
        ? `ATENÇÃO: isso excluirá permanentemente "${actionTarget?.nome}", seus pets, agendamentos, aplicações, cadernetas e demais registros relacionados. Esta ação não pode ser desfeita.`
        : `Tem certeza que deseja excluir "${actionTarget?.nome}" permanentemente? Este tutor não possui pets ou histórico vinculado.`;

  // =========================================================
  // TELA
  // =========================================================

  return (
    <Layout
      title="Tutores"
      actions={
        <Button
          onClick={
            openCreate
          }
        >
          <UserPlus className="w-4 h-4" />

          Novo Tutor
        </Button>
      }
    >
      <PageHeader
        title="Tutores"
        description="Gerencie os tutores cadastrados no sistema"
      />

      {/* =================================================== */}
      {/* RESUMO */}
      {/* =================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Tutores ativos
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
                  Total de tutores
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalCount}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center gap-3">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
                <Dog className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Pets vinculados
                </p>

                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalPets}
                </p>
              </div>

            </div>
          </CardBody>
        </Card>

      </div>

      {/* =================================================== */}
      {/* BUSCA */}
      {/* =================================================== */}

      <Card className="mb-5">
        <CardBody>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

            <div className="flex-1">

              <SearchInput
                value={
                  search
                }
                onChange={
                  setSearch
                }
                placeholder="Buscar por nome, WhatsApp ou pet..."
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
      {/* TUTORES */}
      {/* =================================================== */}

      {loading ? (
        <SkeletonList
          count={4}
        />
      ) : filtered.length ===
        0 ? (
        <EmptyState
          icon={
            statusFilter ===
            'arquivados' ? (
              <Archive className="w-8 h-8" />
            ) : (
              <Users className="w-8 h-8" />
            )
          }
          title={
            statusFilter ===
            'arquivados'
              ? 'Nenhum tutor arquivado'
              : search
                ? 'Nenhum tutor encontrado'
                : 'Nenhum tutor cadastrado'
          }
          description={
            statusFilter ===
            'arquivados'
              ? 'Os tutores arquivados aparecerão aqui.'
              : search
                ? 'Tente outra busca.'
                : 'Comece cadastrando o primeiro tutor.'
          }
          action={
            !search &&
            statusFilter ===
              'ativos' ? (
              <Button
                onClick={
                  openCreate
                }
              >
                <UserPlus className="w-4 h-4" />

                Novo Tutor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">

          {filtered.map(
            (
              tutor,
              index
            ) => {
              const archived =
                tutor.ativo ===
                false;

              const tutorPets =
                petsMap[
                  tutor.id
                ] || [];

              return (
                <motion.div
                  key={
                    tutor.id
                  }
                  initial={{
                    opacity:
                      0,
                    y:
                      12,
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
                      0.04,
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
                      {/* TUTOR */}
                      {/* =================================== */}

                      <div className="flex items-start gap-4">

                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                          {getInitials(
                            tutor.nome
                          )}
                        </div>

                        <div className="flex-1 min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                              {
                                tutor.nome
                              }
                            </h3>

                            {archived && (
                              <span className="inline-flex rounded-full bg-gray-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-slate-300">
                                Arquivado
                              </span>
                            )}

                          </div>

                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">

                            <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />

                            <span>
                              {formatPhone(
                                tutor.whatsapp
                              )}
                            </span>

                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">

                            <CalendarDays className="w-3.5 h-3.5" />

                            <span>
                              Cadastrado em{' '}
                              {formatDate(
                                tutor.created_at
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* CONTATO */}
                      {/* =================================== */}

                      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                          <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">

                            <Instagram className="w-4 h-4" />

                            <span className="text-[11px] uppercase tracking-wide">
                              Instagram
                            </span>

                          </div>

                          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">
                            {tutor.instagram ||
                              '—'}
                          </p>

                        </div>

                        <div className="rounded-xl bg-gray-50 dark:bg-slate-950/50 p-3">

                          <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">

                            <MapPin className="w-4 h-4" />

                            <span className="text-[11px] uppercase tracking-wide">
                              Endereço
                            </span>

                          </div>

                          <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-slate-100 line-clamp-2">
                            {tutor.endereco ||
                              '—'}
                          </p>

                        </div>

                      </div>

                      {/* =================================== */}
                      {/* PETS - NOVO DESIGN */}
                      {/* =================================== */}

                      <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800">

                        {/* CABEÇALHO */}

                        <div className="flex items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-950/40 px-4 py-3">

                          <div className="flex items-center gap-2">

                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60">

                              <Dog className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />

                            </div>

                            <div>

                              <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                                Pets vinculados
                              </p>

                              <p className="text-[11px] text-gray-400 dark:text-slate-500">
                                Animais deste tutor
                              </p>

                            </div>

                          </div>

                          <div className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {tutorPets.length}
                          </div>

                        </div>

                        {/* LISTA DE PETS */}

                        {tutorPets.length >
                        0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">

                            {tutorPets.map(
                              (
                                pet
                              ) => (
                                <div
                                  key={
                                    pet.id
                                  }
                                  className="group flex items-center gap-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 transition hover:border-emerald-200 dark:hover:border-emerald-900/70 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10"
                                >

                                  {/* ÍCONE DO PET */}

                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">

                                    {pet.especie ===
                                    'Gato' ? (
                                      <PawPrint className="w-5 h-5" />
                                    ) : (
                                      <Dog className="w-5 h-5" />
                                    )}

                                  </div>

                                  {/* DADOS */}

                                  <div className="min-w-0 flex-1">

                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                      {pet.nome}
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-slate-400">
                                      {pet.especie}

                                      {pet.raca
                                        ? ` · ${pet.raca}`
                                        : ''}
                                    </p>

                                  </div>

                                </div>
                              )
                            )}

                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center px-4 py-6 text-center">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800">

                              <PawPrint className="w-5 h-5 text-gray-400 dark:text-slate-500" />

                            </div>

                            <p className="mt-2 text-sm font-medium text-gray-600 dark:text-slate-300">
                              Nenhum pet vinculado
                            </p>

                            <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">
                              Os pets deste tutor aparecerão aqui.
                            </p>

                          </div>
                        )}

                      </div>

                      {/* =================================== */}
                      {/* AÇÕES */}
                      {/* =================================== */}

                      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">

                        <div className="flex flex-wrap items-center gap-2">

                          {!archived && (
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  tutor
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
                                  tutor
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
                              checkingTutorId ===
                              tutor.id
                            }
                            onClick={() =>
                              handleRemoveClick(
                                tutor
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition disabled:opacity-50"
                          >
                            <Trash2
                              className={`w-4 h-4 ${
                                checkingTutorId ===
                                tutor.id
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
        open={
          modalOpen
        }
        onClose={() =>
          setModalOpen(
            false
          )
        }
        title={
          editing
            ? 'Editar Tutor'
            : 'Novo Tutor'
        }
        description="Preencha os dados do tutor"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                setModalOpen(
                  false
                )
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleSave
              }
              loading={
                saving
              }
            >
              {editing
                ? 'Salvar'
                : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">

          <Input
            label="Nome Completo"
            value={
              form.nome
            }
            onChange={(e) =>
              setForm({
                ...form,
                nome:
                  e.target.value,
              })
            }
            placeholder="Nome do tutor"
            required
          />

          <Input
            label="WhatsApp"
            value={
              form.whatsapp
            }
            onChange={(e) =>
              setForm({
                ...form,
                whatsapp:
                  e.target.value,
              })
            }
            placeholder="(11) 99999-9999"
            icon={
              <Phone className="w-4 h-4" />
            }
            required
          />

          <Input
            label="Instagram (opcional)"
            value={
              form.instagram
            }
            onChange={(e) =>
              setForm({
                ...form,
                instagram:
                  e.target.value,
              })
            }
            placeholder="@usuario"
            icon={
              <Instagram className="w-4 h-4" />
            }
          />

          <Textarea
            label="Endereço"
            value={
              form.endereco
            }
            onChange={(e) =>
              setForm({
                ...form,
                endereco:
                  e.target.value,
              })
            }
            placeholder="Endereço completo"
            rows={2}
          />

          <Textarea
            label="Observações"
            value={
              form.observacoes
            }
            onChange={(e) =>
              setForm({
                ...form,
                observacoes:
                  e.target.value,
              })
            }
            placeholder="Observações sobre o tutor"
            rows={2}
          />

        </div>
      </Modal>

      {/* =================================================== */}
      {/* CONFIRMAÇÃO */}
      {/* =================================================== */}

      <ConfirmDialog
        open={
          !!actionTarget
        }
        onClose={() => {
          if (
            processingAction
          ) {
            return;
          }

          setActionTarget(
            null
          );

          setActionType(
            null
          );
        }}
        onConfirm={
          handleConfirmAction
        }
        title={
          dialogTitle
        }
        message={
          dialogMessage
        }
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