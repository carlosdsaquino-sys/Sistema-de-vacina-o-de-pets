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
// CONFIGURAÇÃO DA SESSÃO DIÁRIA
// =========================================================
//
// A sessão é válida somente no dia em que o usuário fez login.
// Quando virar o dia:
// 1. faz logout;
// 2. limpa a sessão local;
// 3. recarrega a página inteira.
//
// O reload completo também faz o navegador buscar a versão
// mais recente publicada no Vercel.
// =========================================================

const DAILY_SESSION_KEY =
  'patapass-login-date';

function getTodayKey() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function getMillisecondsUntilNextDay() {
  const now =
    new Date();

  const nextDay =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      1,
      0
    );

  return Math.max(
    1000,
    nextDay.getTime() -
      now.getTime()
  );
}

function markSessionForToday() {
  localStorage.setItem(
    DAILY_SESSION_KEY,
    getTodayKey()
  );
}

function clearDailySession() {
  localStorage.removeItem(
    DAILY_SESSION_KEY
  );
}

function isSessionFromToday() {
  return (
    localStorage.getItem(
      DAILY_SESSION_KEY
    ) === getTodayKey()
  );
}

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
  // LOGOUT NORMAL
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
        clearDailySession();
        clearAuthState();
      }
    }, [
      clearAuthState,
    ]);

  // =======================================================
  // ENCERRAR SESSÃO POR VIRADA DO DIA
  // =======================================================

  const expireDailySession =
    useCallback(async () => {
      try {
        await supabase.auth.signOut();
      } catch (
        error
      ) {
        console.error(
          'Erro ao encerrar sessão diária:',
          error
        );
      } finally {
        clearDailySession();
        clearAuthState();

        // Reload completo:
        // garante que uma versão nova publicada no Vercel
        // seja carregada na próxima tela.
        window.location.reload();
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

        if (!authProfile) {
          await signOut();

          return {
            valid: false,
            error:
              'Seu usuário não possui um perfil de acesso configurado.',
          };
        }

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

        // Não existe sessão.
        if (
          !nextSession?.user
        ) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);

          return;
        }

        // Existe uma sessão do Supabase, mas ela não pertence
        // ao dia atual. Força logout + reload completo.
        if (
          !isSessionFromToday()
        ) {
          setLoading(true);

          await expireDailySession();

          return;
        }

        setSession(
          nextSession
        );

        setUser(
          nextSession.user
        );

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
    expireDailySession,
    loadProfile,
  ]);

  // =======================================================
  // ENCERRAR AUTOMATICAMENTE AO VIRAR O DIA
  // =======================================================

  useEffect(() => {
    if (
      !session?.user
    ) {
      return;
    }

    const validateDay =
      () => {
        if (
          !isSessionFromToday()
        ) {
          void expireDailySession();

          return false;
        }

        return true;
      };

    // Agenda o encerramento para 00:00:01 no horário
    // local do computador onde o sistema está aberto.
    const timeoutId =
      window.setTimeout(
        () => {
          void expireDailySession();
        },
        getMillisecondsUntilNextDay()
      );

    // Se o computador dormir durante a madrugada,
    // essa verificação pega a virada do dia ao voltar.
    const handleFocus =
      () => {
        validateDay();
      };

    const handleVisibility =
      () => {
        if (
          document.visibilityState ===
          'visible'
        ) {
          validateDay();
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
      window.clearTimeout(
        timeoutId
      );

      window.removeEventListener(
        'focus',
        handleFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };
  }, [
    session?.user?.id,
    expireDailySession,
  ]);

  // =======================================================
  // VIGIAR USUÁRIO DESATIVADO
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

        // Antes de consultar qualquer coisa,
        // também confirma se ainda estamos no mesmo dia.
        if (
          !isSessionFromToday()
        ) {
          await expireDailySession();

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
    expireDailySession,
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
        // Marcamos o dia antes do signIn porque o Supabase
        // dispara onAuthStateChange durante o processo.
        markSessionForToday();

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
          clearDailySession();

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

        // Confirma oficialmente que esta sessão pertence
        // ao dia de hoje.
        markSessionForToday();

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
        markSessionForToday();

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
          clearDailySession();

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
