import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { motion } from 'framer-motion';

import {
  UserCog,
  UserPlus,
  ShieldCheck,
  User,
  Mail,
  CheckCircle2,
  XCircle,
  Pencil,
  Power,
  RotateCcw,
  Trash2,
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
  Select,
} from '@/components/ui/Input';

import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';

type UserRole =
  | 'admin'
  | 'funcionario';

type TeamMember = {
  id: string;
  nome: string | null;
  email: string | null;
  role: UserRole;
  ativo: boolean;
  created_at: string;
};

type ManageAction =
  | 'update'
  | 'deactivate'
  | 'reactivate'
  | 'delete';

type ConfirmAction =
  | 'deactivate'
  | 'delete'
  | null;

export function TeamPage() {
  const { toast } =
    useToast();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    members,
    setMembers,
  ] =
    useState<TeamMember[]>([]);

  const [
    currentProfile,
    setCurrentProfile,
  ] =
    useState<TeamMember | null>(
      null
    );

  const [
    createModal,
    setCreateModal,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    selectedMember,
    setSelectedMember,
  ] =
    useState<TeamMember | null>(
      null
    );

  const [
    managing,
    setManaging,
  ] =
    useState(false);

  const [
    confirmAction,
    setConfirmAction,
  ] =
    useState<ConfirmAction>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState({
      nome: '',
      email: '',
      password: '',
      role:
        'funcionario' as UserRole,
    });

  const [
    editForm,
    setEditForm,
  ] =
    useState({
      nome: '',
      role:
        'funcionario' as UserRole,
    });

  // =========================================================
  // ERRO DAS EDGE FUNCTIONS
  // =========================================================

  const getFunctionErrorMessage =
    async (
      error: unknown,
      fallback: string
    ) => {
      if (
        error &&
        typeof error ===
          'object' &&
        'context' in error
      ) {
        const context =
          (
            error as {
              context?: Response;
            }
          ).context;

        if (context) {
          try {
            const body =
              await context
                .clone()
                .json();

            if (
              body &&
              typeof body.error ===
                'string'
            ) {
              return body.error;
            }
          } catch {
            // Ignora erro de leitura do body.
          }
        }
      }

      if (
        error instanceof Error
      ) {
        return error.message;
      }

      return fallback;
    };

  // =========================================================
  // CARREGAR EQUIPE
  // =========================================================

  const load =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const {
            data: authData,
            error: authError,
          } =
            await supabase.auth.getUser();

          if (
            authError ||
            !authData.user
          ) {
            throw new Error(
              'Usuário não autenticado.'
            );
          }

          const {
            data: profile,
            error: profileError,
          } =
            await supabase
              .from('profiles')
              .select(
                'id, nome, email, role, ativo, created_at'
              )
              .eq(
                'id',
                authData.user.id
              )
              .single();

          if (
            profileError ||
            !profile
          ) {
            throw (
              profileError ||
              new Error(
                'Perfil não encontrado.'
              )
            );
          }

          setCurrentProfile(
            profile as TeamMember
          );

          const {
            data: teamData,
            error: teamError,
          } =
            await supabase
              .from('profiles')
              .select(
                'id, nome, email, role, ativo, created_at'
              )
              .order(
                'nome',
                {
                  ascending: true,
                }
              );

          if (teamError) {
            throw teamError;
          }

          setMembers(
            (teamData as TeamMember[]) ||
              []
          );
        } catch (
          error: unknown
        ) {
          console.error(
            'Erro ao carregar equipe:',
            error
          );

          const message =
            error instanceof Error
              ? error.message
              : 'Erro ao carregar equipe';

          toast(
            message,
            'error'
          );
        } finally {
          setLoading(false);
        }
      },
      [toast]
    );

  useEffect(() => {
    load();
  }, [load]);

  // =========================================================
  // NOVO USUÁRIO
  // =========================================================

  const openCreate =
    () => {
      setForm({
        nome: '',
        email: '',
        password: '',
        role:
          'funcionario',
      });

      setCreateModal(
        true
      );
    };

  const handleCreate =
    async () => {
      const nome =
        form.nome.trim();

      const email =
        form.email
          .trim()
          .toLowerCase();

      if (!nome) {
        toast(
          'Informe o nome do usuário.',
          'warning'
        );

        return;
      }

      if (
        !email ||
        !email.includes('@')
      ) {
        toast(
          'Informe um e-mail válido.',
          'warning'
        );

        return;
      }

      if (
        form.password.length <
        8
      ) {
        toast(
          'A senha deve possuir pelo menos 8 caracteres.',
          'warning'
        );

        return;
      }

      setSaving(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            'create-organization-user',
            {
              body: {
                nome,
                email,
                password:
                  form.password,
                role:
                  form.role,
              },
            }
          );

        if (error) {
          const message =
            await getFunctionErrorMessage(
              error,
              'Erro ao criar usuário'
            );

          throw new Error(
            message
          );
        }

        if (
          data?.error
        ) {
          throw new Error(
            data.error
          );
        }

        toast(
          'Usuário criado com sucesso!'
        );

        setCreateModal(
          false
        );

        await load();
      } catch (
        error: unknown
      ) {
        console.error(
          'Erro ao criar usuário:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Erro ao criar usuário';

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
  // ABRIR DETALHES / EDIÇÃO
  // =========================================================

  const openMember =
    (
      member: TeamMember
    ) => {
      setSelectedMember(
        member
      );

      setEditForm({
        nome:
          member.nome || '',
        role:
          member.role,
      });
    };

  const closeMember =
    () => {
      if (managing) {
        return;
      }

      setSelectedMember(
        null
      );

      setConfirmAction(
        null
      );
    };

  // =========================================================
  // GERENCIAR USUÁRIO
  // =========================================================

  const invokeManage =
    async (
      action: ManageAction,
      extra?: {
        nome?: string;
        role?: UserRole;
      }
    ) => {
      if (!selectedMember) {
        return false;
      }

      setManaging(
        true
      );

      try {
        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
            'manage-organization-user',
            {
              body: {
                action,
                user_id:
                  selectedMember.id,
                ...extra,
              },
            }
          );

        if (error) {
          const message =
            await getFunctionErrorMessage(
              error,
              'Erro ao gerenciar usuário'
            );

          throw new Error(
            message
          );
        }

        if (
          data?.error
        ) {
          throw new Error(
            data.error
          );
        }

        if (
          typeof data?.message ===
          'string'
        ) {
          toast(
            data.message
          );
        }

        return true;
      } catch (
        error: unknown
      ) {
        console.error(
          'Erro ao gerenciar usuário:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Erro ao gerenciar usuário';

        toast(
          message,
          'error'
        );

        return false;
      } finally {
        setManaging(
          false
        );
      }
    };

  // =========================================================
  // SALVAR EDIÇÃO
  // =========================================================

  const handleUpdate =
    async () => {
      if (!selectedMember) {
        return;
      }

      const nome =
        editForm.nome.trim();

      if (!nome) {
        toast(
          'Informe o nome do usuário.',
          'warning'
        );

        return;
      }

      const success =
        await invokeManage(
          'update',
          {
            nome,
            role:
              editForm.role,
          }
        );

      if (success) {
        setSelectedMember(
          null
        );

        await load();
      }
    };

  // =========================================================
  // DESATIVAR
  // =========================================================

  const handleDeactivate =
    async () => {
      const success =
        await invokeManage(
          'deactivate'
        );

      setConfirmAction(
        null
      );

      if (success) {
        setSelectedMember(
          null
        );

        await load();
      }
    };

  // =========================================================
  // REATIVAR
  // =========================================================

  const handleReactivate =
    async () => {
      const success =
        await invokeManage(
          'reactivate'
        );

      if (success) {
        setSelectedMember(
          null
        );

        await load();
      }
    };

  // =========================================================
  // EXCLUIR
  // =========================================================

  const handleDelete =
    async () => {
      const success =
        await invokeManage(
          'delete'
        );

      setConfirmAction(
        null
      );

      if (success) {
        setSelectedMember(
          null
        );

        await load();
      }
    };

  // =========================================================
  // ACESSO SOMENTE ADMIN
  // =========================================================

  const isAdmin =
    currentProfile?.role ===
    'admin';

  const isSelectedSelf =
    !!selectedMember &&
    selectedMember.id ===
      currentProfile?.id;

  if (loading) {
    return (
      <Layout title="Equipe">
        <PageHeader
          title="Equipe"
          description="Gerencie os usuários da sua empresa"
        />

        <SkeletonList
          count={4}
        />
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout title="Equipe">
        <PageHeader
          title="Equipe"
          description="Gerencie os usuários da sua empresa"
        />

        <EmptyState
          icon={
            <ShieldCheck className="w-8 h-8" />
          }
          title="Acesso restrito"
          description="Somente administradores podem gerenciar a equipe."
        />
      </Layout>
    );
  }

  // =========================================================
  // TELA
  // =========================================================

  return (
    <Layout
      title="Equipe"
      actions={
        <Button
          onClick={
            openCreate
          }
        >
          <UserPlus className="w-4 h-4" />

          Novo Usuário
        </Button>
      }
    >
      <PageHeader
        title="Equipe"
        description="Gerencie os usuários que possuem acesso ao sistema"
      />

      {members.length ===
      0 ? (
        <EmptyState
          icon={
            <UserCog className="w-8 h-8" />
          }
          title="Nenhum usuário encontrado"
          description="Cadastre o primeiro usuário da equipe."
          action={
            <Button
              onClick={
                openCreate
              }
            >
              <UserPlus className="w-4 h-4" />

              Novo Usuário
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {members.map(
            (
              member,
              index
            ) => {
              const isSelf =
                member.id ===
                currentProfile?.id;

              return (
                <motion.div
                  key={
                    member.id
                  }
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      index *
                      0.04,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      openMember(
                        member
                      )
                    }
                    className="block w-full text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <Card hover>
                      <CardBody>

                        <div className="flex items-center gap-4">

                          <div
                            className="
                              flex
                              h-12
                              w-12
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-emerald-50
                              dark:bg-emerald-950/50
                              text-emerald-700
                              dark:text-emerald-400
                            "
                          >
                            {member.role ===
                            'admin' ? (
                              <ShieldCheck className="w-5 h-5" />
                            ) : (
                              <User className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                {member.nome ||
                                  'Sem nome'}
                              </h3>

                              <span
                                className={`
                                  rounded-full
                                  px-2
                                  py-0.5
                                  text-[11px]
                                  font-semibold
                                  ${
                                    member.role ===
                                    'admin'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                                  }
                                `}
                              >
                                {member.role ===
                                'admin'
                                  ? 'Administrador'
                                  : 'Funcionário'}
                              </span>

                              {isSelf && (
                                <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                  Você
                                </span>
                              )}

                            </div>

                            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 min-w-0">

                              <Mail className="w-3.5 h-3.5 shrink-0" />

                              <span className="truncate">
                                {member.email ||
                                  'Sem e-mail'}
                              </span>

                            </div>

                          </div>

                          <div
                            className={`
                              flex
                              items-center
                              gap-1.5
                              rounded-full
                              px-2.5
                              py-1
                              text-xs
                              font-semibold
                              ${
                                member.ativo
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                              }
                            `}
                          >
                            {member.ativo ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}

                            {member.ativo
                              ? 'Ativo'
                              : 'Desativado'}
                          </div>

                        </div>

                        <div className="mt-3 flex items-center justify-end gap-1 text-xs font-medium text-gray-400 dark:text-slate-500">
                          <Pencil className="w-3.5 h-3.5" />
                          Clique para ver e editar
                        </div>

                      </CardBody>
                    </Card>
                  </button>
                </motion.div>
              );
            }
          )}

        </div>
      )}

      {/* =================================================== */}
      {/* NOVO USUÁRIO */}
      {/* =================================================== */}

      <Modal
        open={
          createModal
        }
        onClose={() => {
          if (
            saving
          ) {
            return;
          }

          setCreateModal(
            false
          );
        }}
        title="Novo Usuário"
        description="Crie um acesso para um funcionário da sua empresa"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                setCreateModal(
                  false
                )
              }
              disabled={
                saving
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleCreate
              }
              loading={
                saving
              }
            >
              <UserPlus className="w-4 h-4" />

              Criar Usuário
            </Button>
          </>
        }
      >
        <div className="space-y-4">

          <Input
            label="Nome"
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
            placeholder="Ex: João Silva"
            required
          />

          <Input
            label="E-mail"
            type="email"
            value={
              form.email
            }
            onChange={(e) =>
              setForm({
                ...form,
                email:
                  e.target.value,
              })
            }
            placeholder="joao@empresa.com"
            required
          />

          <Input
            label="Senha temporária"
            type="password"
            value={
              form.password
            }
            onChange={(e) =>
              setForm({
                ...form,
                password:
                  e.target.value,
              })
            }
            placeholder="Mínimo de 8 caracteres"
            required
          />

          <Select
            label="Tipo de usuário"
            value={
              form.role
            }
            onChange={(e) =>
              setForm({
                ...form,
                role:
                  e.target
                    .value as UserRole,
              })
            }
          >
            <option value="funcionario">
              Funcionário
            </option>

            <option value="admin">
              Administrador
            </option>
          </Select>

          <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-sm text-blue-700 dark:text-blue-300">
            O novo usuário será vinculado automaticamente à sua empresa.
          </div>

        </div>
      </Modal>

      {/* =================================================== */}
      {/* DETALHES / EDITAR USUÁRIO */}
      {/* =================================================== */}

      <Modal
        open={
          !!selectedMember
        }
        onClose={
          closeMember
        }
        title="Usuário da Equipe"
        description={
          selectedMember?.email ||
          undefined
        }
        footer={
          selectedMember ? (
            <>
              <Button
                variant="outline"
                onClick={
                  closeMember
                }
                disabled={
                  managing
                }
              >
                Fechar
              </Button>

              <Button
                onClick={
                  handleUpdate
                }
                loading={
                  managing
                }
              >
                <Pencil className="w-4 h-4" />
                Salvar Alterações
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedMember && (
          <div className="space-y-5">

            <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-slate-950/50 p-4">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                {selectedMember.role ===
                'admin' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">

                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {selectedMember.nome ||
                    'Sem nome'}
                </p>

                <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                  {selectedMember.email ||
                    'Sem e-mail'}
                </p>

              </div>

              <div
                className={`
                  rounded-full
                  px-2.5
                  py-1
                  text-xs
                  font-semibold
                  ${
                    selectedMember.ativo
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                  }
                `}
              >
                {selectedMember.ativo
                  ? 'Ativo'
                  : 'Desativado'}
              </div>

            </div>

            <Input
              label="Nome"
              value={
                editForm.nome
              }
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  nome:
                    e.target.value,
                })
              }
              required
            />

            <Input
              label="E-mail"
              type="email"
              value={
                selectedMember.email ||
                ''
              }
              disabled
            />

            <Select
              label="Tipo de usuário"
              value={
                editForm.role
              }
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  role:
                    e.target
                      .value as UserRole,
                })
              }
              disabled={
                isSelectedSelf
              }
            >
              <option value="funcionario">
                Funcionário
              </option>

              <option value="admin">
                Administrador
              </option>
            </Select>

            {isSelectedSelf && (
              <div className="rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-sm text-blue-700 dark:text-blue-300">
                Este é o seu próprio usuário. Por segurança, você pode editar o nome, mas não pode alterar seu cargo, desativar ou excluir esta conta.
              </div>
            )}

            {!isSelectedSelf && (
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4">

                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  Acesso ao sistema
                </p>

                {selectedMember.ativo ? (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction(
                        'deactivate'
                      )
                    }
                    disabled={
                      managing
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/60 px-3 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 transition hover:bg-amber-50 dark:hover:bg-amber-950/30 disabled:opacity-50"
                  >
                    <Power className="w-4 h-4" />
                    Desativar Usuário
                  </button>
                ) : (
                  <div className="space-y-2">

                    <button
                      type="button"
                      onClick={
                        handleReactivate
                      }
                      disabled={
                        managing
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reativar Usuário
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setConfirmAction(
                          'delete'
                        )
                      }
                      disabled={
                        managing
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Permanentemente
                    </button>

                    <p className="text-xs text-gray-400 dark:text-slate-500 text-center">
                      A exclusão permanente remove o acesso e não poderá ser desfeita.
                    </p>

                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </Modal>

      {/* =================================================== */}
      {/* CONFIRMAR DESATIVAÇÃO / EXCLUSÃO */}
      {/* =================================================== */}

      <ConfirmDialog
        open={
          confirmAction ===
          'deactivate'
        }
        onClose={() => {
          if (!managing) {
            setConfirmAction(
              null
            );
          }
        }}
        onConfirm={
          handleDeactivate
        }
        title="Desativar Usuário"
        message={`Deseja desativar o acesso de "${selectedMember?.nome || 'este usuário'}"? Ele deixará de acessar os dados da empresa.`}
        confirmLabel="Desativar"
        danger
      />

      <ConfirmDialog
        open={
          confirmAction ===
          'delete'
        }
        onClose={() => {
          if (!managing) {
            setConfirmAction(
              null
            );
          }
        }}
        onConfirm={
          handleDelete
        }
        title="Excluir Usuário Permanentemente"
        message={`Deseja excluir permanentemente "${selectedMember?.nome || 'este usuário'}"? Esta ação não poderá ser desfeita.`}
        confirmLabel="Excluir Permanentemente"
        danger
      />

    </Layout>
  );
}
