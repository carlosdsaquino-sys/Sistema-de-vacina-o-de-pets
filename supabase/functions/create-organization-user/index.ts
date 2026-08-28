import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type CreateUserBody = {
  nome?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'funcionario';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('Variáveis do Supabase não encontradas.');
      return jsonResponse(
        { error: 'Configuração interna do servidor incompleta.' },
        500
      );
    }

    const authorization = req.headers.get('Authorization');

    if (!authorization) {
      return jsonResponse({ error: 'Usuário não autenticado.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ error: 'Sessão inválida ou expirada.' }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, organization_id, role, ativo')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      console.error('Perfil do administrador não encontrado:', profileError);
      return jsonResponse({ error: 'Perfil do usuário não encontrado.' }, 403);
    }

    if (callerProfile.ativo !== true) {
      return jsonResponse({ error: 'Seu usuário está desativado.' }, 403);
    }

    if (callerProfile.role !== 'admin') {
      return jsonResponse(
        { error: 'Apenas administradores podem cadastrar usuários.' },
        403
      );
    }

    if (!callerProfile.organization_id) {
      return jsonResponse(
        { error: 'Seu usuário não está vinculado a uma empresa.' },
        403
      );
    }

    let body: CreateUserBody;

    try {
      body = (await req.json()) as CreateUserBody;
    } catch {
      return jsonResponse({ error: 'Dados enviados são inválidos.' }, 400);
    }

    const nome = body.nome?.trim() || '';
    const email = body.email?.trim().toLowerCase() || '';
    const password = body.password || '';
    const role = body.role || 'funcionario';

    if (!nome) {
      return jsonResponse({ error: 'Informe o nome do usuário.' }, 400);
    }

    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'Informe um e-mail válido.' }, 400);
    }

    if (password.length < 8) {
      return jsonResponse(
        { error: 'A senha deve possuir pelo menos 8 caracteres.' },
        400
      );
    }

    if (role !== 'admin' && role !== 'funcionario') {
      return jsonResponse({ error: 'Tipo de usuário inválido.' }, 400);
    }

    // O organization_id nunca vem do navegador.
    // Ele é obtido do perfil do administrador autenticado.
    const { data: createdAuth, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          nome,
        },
      });

    if (createError || !createdAuth.user) {
      console.error('Erro ao criar usuário no Auth:', createError);

      const message = createError?.message?.toLowerCase().includes('already')
        ? 'Já existe um usuário com este e-mail.'
        : createError?.message || 'Não foi possível criar o usuário.';

      return jsonResponse({ error: message }, 400);
    }

    const newUserId = createdAuth.user.id;

    const { data: profile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        nome,
        email,
        role,
        ativo: true,
        organization_id: callerProfile.organization_id,
      })
      .eq('id', newUserId)
      .select('id, nome, email, role, ativo, organization_id')
      .single();

    if (updateError || !profile) {
      console.error('Erro ao vincular perfil:', updateError);

      // Rollback: evita deixar um usuário órfão no Auth.
      const { error: rollbackError } =
        await adminClient.auth.admin.deleteUser(newUserId);

      if (rollbackError) {
        console.error('Erro no rollback do usuário:', rollbackError);
      }

      return jsonResponse(
        { error: 'Não foi possível vincular o usuário à empresa.' },
        500
      );
    }

    return jsonResponse(
      {
        message: 'Usuário criado com sucesso.',
        user: profile,
      },
      201
    );
  } catch (error) {
    console.error('Erro inesperado:', error);
    return jsonResponse({ error: 'Erro interno ao criar usuário.' }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
