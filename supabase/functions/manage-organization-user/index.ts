import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type UserRole = 'admin' | 'funcionario';

type ManageUserBody = {
  action?:
    | 'update'
    | 'deactivate'
    | 'reactivate'
    | 'delete';
  user_id?: string;
  nome?: string;
  role?: UserRole;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Método não permitido.' },
      405
    );
  }

  try {
    const supabaseUrl =
      Deno.env.get('SUPABASE_URL');

    const supabaseAnonKey =
      Deno.env.get('SUPABASE_ANON_KEY');

    const serviceRoleKey =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      );

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        {
          error:
            'Configuração interna do servidor incompleta.',
        },
        500
      );
    }

    const authorization =
      req.headers.get('Authorization');

    if (!authorization) {
      return jsonResponse(
        {
          error:
            'Usuário não autenticado.',
        },
        401
      );
    }

    // =====================================================
    // CLIENTE DO USUÁRIO LOGADO
    // =====================================================

    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization:
              authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } =
      await userClient.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonResponse(
        {
          error:
            'Sessão inválida ou expirada.',
        },
        401
      );
    }

    // =====================================================
    // CLIENTE ADMINISTRATIVO
    // =====================================================

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // =====================================================
    // VALIDAR ADMINISTRADOR LOGADO
    // =====================================================

    const {
      data: callerProfile,
      error: callerError,
    } =
      await adminClient
        .from('profiles')
        .select(
          'id, organization_id, role, ativo'
        )
        .eq('id', user.id)
        .single();

    if (
      callerError ||
      !callerProfile
    ) {
      return jsonResponse(
        {
          error:
            'Perfil do administrador não encontrado.',
        },
        403
      );
    }

    if (
      callerProfile.ativo !== true
    ) {
      return jsonResponse(
        {
          error:
            'Seu usuário está desativado.',
        },
        403
      );
    }

    if (
      callerProfile.role !== 'admin'
    ) {
      return jsonResponse(
        {
          error:
            'Apenas administradores podem gerenciar usuários.',
        },
        403
      );
    }

    if (
      !callerProfile.organization_id
    ) {
      return jsonResponse(
        {
          error:
            'Seu usuário não está vinculado a uma empresa.',
        },
        403
      );
    }

    // =====================================================
    // BODY
    // =====================================================

    let body: ManageUserBody;

    try {
      body =
        (await req.json()) as ManageUserBody;
    } catch {
      return jsonResponse(
        {
          error:
            'Dados enviados são inválidos.',
        },
        400
      );
    }

    const action =
      body.action;

    const targetUserId =
      body.user_id?.trim();

    if (
      !action ||
      ![
        'update',
        'deactivate',
        'reactivate',
        'delete',
      ].includes(action)
    ) {
      return jsonResponse(
        {
          error:
            'Ação inválida.',
        },
        400
      );
    }

    if (!targetUserId) {
      return jsonResponse(
        {
          error:
            'Usuário não informado.',
        },
        400
      );
    }

    // =====================================================
    // BUSCAR USUÁRIO ALVO
    // SOMENTE DA MESMA EMPRESA
    // =====================================================

    const {
      data: targetProfile,
      error: targetError,
    } =
      await adminClient
        .from('profiles')
        .select(
          'id, nome, email, role, ativo, organization_id'
        )
        .eq('id', targetUserId)
        .eq(
          'organization_id',
          callerProfile.organization_id
        )
        .single();

    if (
      targetError ||
      !targetProfile
    ) {
      return jsonResponse(
        {
          error:
            'Usuário não encontrado na sua empresa.',
        },
        404
      );
    }

    const isSelf =
      targetProfile.id === user.id;

    // =====================================================
    // PROTEÇÃO DO ÚLTIMO ADMIN
    // =====================================================

    const ensureAnotherActiveAdmin =
      async () => {
        if (
          targetProfile.role !==
          'admin'
        ) {
          return true;
        }

        const {
          count,
          error,
        } =
          await adminClient
            .from('profiles')
            .select(
              'id',
              {
                count: 'exact',
                head: true,
              }
            )
            .eq(
              'organization_id',
              callerProfile.organization_id
            )
            .eq(
              'role',
              'admin'
            )
            .eq(
              'ativo',
              true
            )
            .neq(
              'id',
              targetProfile.id
            );

        if (error) {
          console.error(
            'Erro ao contar administradores:',
            error
          );

          throw new Error(
            'Não foi possível validar os administradores da empresa.'
          );
        }

        return (
          (count || 0) >
          0
        );
      };

    // =====================================================
    // EDITAR
    // =====================================================

    if (
      action ===
      'update'
    ) {
      const nome =
        body.nome?.trim();

      const role =
        body.role;

      if (!nome) {
        return jsonResponse(
          {
            error:
              'Informe o nome do usuário.',
          },
          400
        );
      }

      if (
        role !== 'admin' &&
        role !== 'funcionario'
      ) {
        return jsonResponse(
          {
            error:
              'Tipo de usuário inválido.',
          },
          400
        );
      }

      // O admin pode editar o próprio nome,
      // mas não pode rebaixar o próprio cargo.
      if (
        isSelf &&
        role !==
          targetProfile.role
      ) {
        return jsonResponse(
          {
            error:
              'Você não pode alterar o seu próprio tipo de usuário.',
          },
          400
        );
      }

      // Se estiver rebaixando outro admin,
      // precisa sobrar pelo menos um admin ativo.
      if (
        targetProfile.role ===
          'admin' &&
        role ===
          'funcionario'
      ) {
        const hasAnotherAdmin =
          await ensureAnotherActiveAdmin();

        if (
          !hasAnotherAdmin
        ) {
          return jsonResponse(
            {
              error:
                'A empresa precisa possuir pelo menos um administrador ativo.',
            },
            400
          );
        }
      }

      const {
        data: updated,
        error,
      } =
        await adminClient
          .from('profiles')
          .update({
            nome,
            role,
          })
          .eq(
            'id',
            targetProfile.id
          )
          .eq(
            'organization_id',
            callerProfile.organization_id
          )
          .select(
            'id, nome, email, role, ativo, organization_id'
          )
          .single();

      if (
        error ||
        !updated
      ) {
        console.error(
          'Erro ao atualizar usuário:',
          error
        );

        return jsonResponse(
          {
            error:
              'Não foi possível atualizar o usuário.',
          },
          500
        );
      }

      // Mantém também o nome no metadata do Auth.
      const {
        error: authUpdateError,
      } =
        await adminClient.auth.admin.updateUserById(
          targetProfile.id,
          {
            user_metadata: {
              nome,
            },
          }
        );

      if (
        authUpdateError
      ) {
        console.error(
          'Aviso: perfil atualizado, mas metadata do Auth não:',
          authUpdateError
        );
      }

      return jsonResponse({
        message:
          'Usuário atualizado com sucesso.',
        user: updated,
      });
    }

    // =====================================================
    // DESATIVAR
    // =====================================================

    if (
      action ===
      'deactivate'
    ) {
      if (isSelf) {
        return jsonResponse(
          {
            error:
              'Você não pode desativar o seu próprio usuário.',
          },
          400
        );
      }

      if (
        targetProfile.ativo ===
        false
      ) {
        return jsonResponse(
          {
            message:
              'Usuário já está desativado.',
          }
        );
      }

      const hasAnotherAdmin =
        await ensureAnotherActiveAdmin();

      if (
        !hasAnotherAdmin
      ) {
        return jsonResponse(
          {
            error:
              'A empresa precisa possuir pelo menos um administrador ativo.',
          },
          400
        );
      }

      const {
        data: updated,
        error,
      } =
        await adminClient
          .from('profiles')
          .update({
            ativo: false,
          })
          .eq(
            'id',
            targetProfile.id
          )
          .eq(
            'organization_id',
            callerProfile.organization_id
          )
          .select(
            'id, nome, email, role, ativo, organization_id'
          )
          .single();

      if (
        error ||
        !updated
      ) {
        return jsonResponse(
          {
            error:
              'Não foi possível desativar o usuário.',
          },
          500
        );
      }

      return jsonResponse({
        message:
          'Usuário desativado com sucesso.',
        user: updated,
      });
    }

    // =====================================================
    // REATIVAR
    // =====================================================

    if (
      action ===
      'reactivate'
    ) {
      const {
        data: updated,
        error,
      } =
        await adminClient
          .from('profiles')
          .update({
            ativo: true,
          })
          .eq(
            'id',
            targetProfile.id
          )
          .eq(
            'organization_id',
            callerProfile.organization_id
          )
          .select(
            'id, nome, email, role, ativo, organization_id'
          )
          .single();

      if (
        error ||
        !updated
      ) {
        return jsonResponse(
          {
            error:
              'Não foi possível reativar o usuário.',
          },
          500
        );
      }

      return jsonResponse({
        message:
          'Usuário reativado com sucesso.',
        user: updated,
      });
    }

    // =====================================================
    // EXCLUIR PERMANENTEMENTE
    // SOMENTE DEPOIS DE DESATIVADO
    // =====================================================

    if (
      action ===
      'delete'
    ) {
      if (isSelf) {
        return jsonResponse(
          {
            error:
              'Você não pode excluir o seu próprio usuário.',
          },
          400
        );
      }

      if (
        targetProfile.ativo ===
        true
      ) {
        return jsonResponse(
          {
            error:
              'Desative o usuário antes de excluí-lo permanentemente.',
          },
          400
        );
      }

      const hasAnotherAdmin =
        await ensureAnotherActiveAdmin();

      if (
        !hasAnotherAdmin
      ) {
        return jsonResponse(
          {
            error:
              'A empresa precisa possuir pelo menos um administrador ativo.',
          },
          400
        );
      }

      const {
        error: deleteError,
      } =
        await adminClient.auth.admin.deleteUser(
          targetProfile.id
        );

      if (deleteError) {
        console.error(
          'Erro ao excluir usuário do Auth:',
          deleteError
        );

        return jsonResponse(
          {
            error:
              'Não foi possível excluir o usuário permanentemente.',
          },
          500
        );
      }

      // Normalmente profiles.id referencia auth.users
      // com ON DELETE CASCADE. Caso não exista cascade,
      // tentamos remover o profile explicitamente.
      const {
        error: profileDeleteError,
      } =
        await adminClient
          .from('profiles')
          .delete()
          .eq(
            'id',
            targetProfile.id
          )
          .eq(
            'organization_id',
            callerProfile.organization_id
          );

      if (
        profileDeleteError
      ) {
        console.error(
          'Aviso ao remover profile após Auth:',
          profileDeleteError
        );
      }

      return jsonResponse({
        message:
          'Usuário excluído permanentemente.',
      });
    }

    return jsonResponse(
      {
        error:
          'Ação não tratada.',
      },
      400
    );
  } catch (error) {
    console.error(
      'Erro inesperado:',
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Erro interno ao gerenciar usuário.';

    return jsonResponse(
      {
        error:
          message,
      },
      500
    );
  }
});

function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type':
          'application/json; charset=utf-8',
      },
    }
  );
}
