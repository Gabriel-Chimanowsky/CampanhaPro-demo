import { createClient } from '@supabase/supabase-js';

// Execute com: node --env-file=.env --import tsx/esm seed-instagram-test.ts

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const metaToken = process.env.META_TOKEN;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Configurações do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const TEST_USER = {
  email: 'test-instagram@campanhapro.com',
  password: 'TestInstagram123!',
  name: 'Tester Instagram',
  campaignId: 'insta-test-campaign-' + Math.random().toString(36).substring(7),
};

async function main() {
  console.log(`🚀 Criando ambiente de teste para Instagram...`);

  // 1. Criar Usuário
  const { data: { users: existing } } = await supabase.auth.admin.listUsers();
  let authUserId = existing?.find(u => u.email === TEST_USER.email)?.id;

  if (!authUserId) {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true,
      user_metadata: { name: TEST_USER.name },
    });
    if (error) throw error;
    authUserId = created.user!.id;
    console.log(`✅ Usuário auth criado: ${TEST_USER.email}`);
  } else {
    await supabase.auth.admin.updateUserById(authUserId, {
        password: TEST_USER.password,
    });
    console.log(`🔄 Usuário auth atualizado.`);
  }

  // 2. Criar Perfil e Campanha
  await supabase.from('users').upsert({
    id: authUserId,
    email: TEST_USER.email,
    name: TEST_USER.name,
    type: 'Admin',
    plan: 'Total',
    campaignId: TEST_USER.campaignId,
  });
  console.log(`✅ Perfil vinculado à campanha: ${TEST_USER.campaignId}`);

  // 3. Inserir Token (se existir no .env)
  if (metaToken) {
    const { error: tokenErr } = await supabase.from('social_tokens').upsert({
        campaignId: TEST_USER.campaignId,
        provider: 'meta',
        access_token: metaToken,
        updatedAt: new Date().toISOString()
    }, { onConflict: 'campaignId,provider' });
    
    if (tokenErr) console.error('❌ Erro ao inserir token:', tokenErr.message);
    else console.log(`✅ Token real do .env inserido com sucesso.`);
  } else {
    console.warn(`⚠️ META_TOKEN não encontrado no .env. Use o botão "Conectar Instagram" na UI para simular.`);
  }

  console.log('\n' + '━'.repeat(50));
  console.log('🎉 CREDENCIAIS DE TESTE GERADAS');
  console.log(`📧 Email: ${TEST_USER.email}`);
  console.log(`🔑 Senha: ${TEST_USER.password}`);
  console.log(`📊 Campanha ID: ${TEST_USER.campaignId}`);
  console.log('━'.repeat(50) + '\n');
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
