import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type {
  Session,
  User,
} from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import type {
  Profile,
} from '@/types/database';

// =========================================================
// TIPOS
// =========================================================

type AuthProfile =
  Profile & {
    ativo?: boolean;
    organization_id?: string | null;
  };

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: string | null;
  }>;

  signUp: (
    email: string,
    password: string,
    nome: string
  ) => Promise<{
    error: string | null;
  }>;

  signOut: () => Promise<void>;
}

// =========================================================
// CONTEXTO
// =========================================================

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

// =========================================================
// PROVIDER
// =========================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null
    );

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  // =======================================================
  // LIMPAR ESTADO LOCAL
  // =======================================================

  const clearAuthState =
    useCallback(() => {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }, []);

  // =======================================================
  // LOGOUT
  // =======================================================

  const signOut =
    useCallback(async () => {
      try {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          console.error(
            'Erro ao sair:',
            error
          );
        }
      } finally {
        clearAuthState();
      }
    }, [
      clearAuthState,
    ]);

  // =======================================================
  // CARREGAR / VALIDAR PERFIL
  // =======================================================

  const loadProfile =
    useCallback(
      async (
        userId: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase
            .from('profiles')
            .select('*')
            .eq(
              'id',
              userId
            )
            .maybeSingle();

        if (error) {
          console.error(
            'Erro ao carregar perfil:',
            error
          );

          setProfile(null);
          setLoading(false);

          return {
            valid: false,
            error:
              'Não foi possível validar o seu acesso.',
          };
        }

        const authProfile =
          data as
            | AuthProfile
            | null;

        // Perfil inexistente = usuário sem acesso configurado.
        if (!authProfile) {
          await signOut();

          return {
            valid: false,
            error:
              'Seu usuário não possui um perfil de acesso configurado.',
          };
        }

        // Usuário desativado = logout imediato.
        if (
          authProfile.ativo ===
          false
        ) {
          await signOut();

          return {
            valid: false,
            error:
              'Seu acesso foi desativado. Entre em contato com o administrador da empresa.',
          };
        }

        // Usuário sem empresa não pode acessar o sistema.
        if (
          !authProfile.organization_id
        ) {
          await signOut();

          return {
            valid: false,
            error:
              'Seu usuário ainda não está vinculado a uma empresa.',
          };
        }

        setProfile(
          authProfile as Profile
        );

        setLoading(false);

        return {
          valid: true,
          error: null,
        };
      },
      [
        signOut,
      ]
    );

  // =======================================================
  // INICIALIZAÇÃO DA SESSÃO
  // =======================================================

  useEffect(() => {
    let mounted =
      true;

    const applySession =
      async (
        nextSession:
          | Session
          | null
      ) => {
        if (!mounted) {
          return;
        }

        setSession(
          nextSession
        );

        setUser(
          nextSession?.user ??
            null
        );

        if (
          !nextSession?.user
        ) {
          setProfile(null);
          setLoading(false);

          return;
        }

        setLoading(true);

        await loadProfile(
          nextSession.user.id
        );
      };

    // Sessão já existente ao abrir/recarregar o sistema.
    void supabase.auth
      .getSession()
      .then(
        ({
          data: {
            session:
              currentSession,
          },
        }) => {
          void applySession(
            currentSession
          );
        }
      );

    // Mudanças de login/logout/token.
    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (
          _event,
          nextSession
        ) => {
          void applySession(
            nextSession
          );
        }
      );

    return () => {
      mounted =
        false;

      listener.subscription.unsubscribe();
    };
  }, [
    loadProfile,
  ]);

  // =======================================================
  // VIGIAR USUÁRIO DESATIVADO
  // =======================================================
  //
  // Segurança real:
  // a RLS já bloqueia os dados assim que ativo = false.
  //
  // Experiência:
  // aqui o frontend percebe a desativação e encerra a sessão.
  //
  // Usamos:
  // 1. Realtime, quando disponível;
  // 2. verificação ao voltar para a janela;
  // 3. fallback periódico a cada 30 segundos.
  // =======================================================

  useEffect(() => {
    const userId =
      session?.user?.id;

    if (!userId) {
      return;
    }

    let checking =
      false;

    const checkAccess =
      async () => {
        if (checking) {
          return;
        }

        checking =
          true;

        try {
          const {
            data,
            error,
          } =
            await supabase
              .from('profiles')
              .select(
                'id, ativo, organization_id'
              )
              .eq(
                'id',
                userId
              )
              .maybeSingle();

          // Em erro temporário de rede,
          // não expulsamos o usuário.
          if (error) {
            console.error(
              'Erro ao verificar acesso do usuário:',
              error
            );

            return;
          }

          const accessProfile =
            data as
              | {
                  id: string;
                  ativo:
                    | boolean
                    | null;
                  organization_id:
                    | string
                    | null;
                }
              | null;

          if (
            !accessProfile ||
            accessProfile.ativo ===
              false ||
            !accessProfile.organization_id
          ) {
            await signOut();
          }
        } finally {
          checking =
            false;
        }
      };

    // Realtime: tenta detectar a alteração imediatamente.
    const channel =
      supabase
        .channel(
          `profile-access-${userId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter:
              `id=eq.${userId}`,
          },
          (payload) => {
            const updated =
              payload.new as
                Partial<AuthProfile>;

            if (
              updated.ativo ===
                false ||
              updated.organization_id ===
                null
            ) {
              void signOut();

              return;
            }

            // Se o próprio perfil foi atualizado,
            // mantém nome/cargo etc. sincronizados.
            setProfile(
              (current) =>
                current
                  ? ({
                      ...current,
                      ...updated,
                    } as Profile)
                  : current
            );
          }
        )
        .subscribe();

    // Fallback caso o Realtime da tabela não esteja habilitado.
    const intervalId =
      window.setInterval(
        () => {
          void checkAccess();
        },
        30_000
      );

    // Ao voltar para a aba/janela, valida imediatamente.
    const handleFocus =
      () => {
        void checkAccess();
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          void checkAccess();
        }
      };

    window.addEventListener(
      'focus',
      handleFocus
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      window.clearInterval(
        intervalId
      );

      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );

      void supabase.removeChannel(
        channel
      );
    };
  }, [
    session?.user?.id,
    signOut,
  ]);

  // =======================================================
  // LOGIN
  // =======================================================

  const signIn =
    useCallback(
      async (
        email: string,
        password: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                email
                  .trim()
                  .toLowerCase(),
              password,
            });

        if (error) {
          return {
            error:
              error.message,
          };
        }

        if (
          !data.user ||
          !data.session
        ) {
          await signOut();

          return {
            error:
              'Não foi possível iniciar a sessão.',
          };
        }

        // Não basta a senha estar correta.
        // O perfil precisa estar ativo e vinculado a uma empresa.
        const result =
          await loadProfile(
            data.user.id
          );

        if (!result.valid) {
          return {
            error:
              result.error,
          };
        }

        setSession(
          data.session
        );

        setUser(
          data.user
        );

        return {
          error: null,
        };
      },
      [
        loadProfile,
        signOut,
      ]
    );

  // =======================================================
  // SIGN UP
  // =======================================================
  //
  // Mantido por compatibilidade com o projeto.
  // O fluxo oficial de criação de funcionários continua
  // sendo feito pelo administrador através da Edge Function.
  // =======================================================

  const signUp =
    useCallback(
      async (
        email: string,
        password: string,
        nome: string
      ) => {
        const {
          data,
          error,
        } =
          await supabase.auth
            .signUp({
              email,
              password,
              options: {
                data: {
                  nome,
                },
              },
            });

        if (error) {
          return {
            error:
              error.message,
          };
        }

        if (
          data.user
        ) {
          setSession(
            data.session
          );

          setUser(
            data.user
          );
        }

        return {
          error: null,
        };
      },
      []
    );

  // =======================================================
  // PROVIDER
  // =======================================================

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =========================================================
// HOOK
// =========================================================

export function useAuth() {
  const ctx =
    useContext(
      AuthContext
    );

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}
