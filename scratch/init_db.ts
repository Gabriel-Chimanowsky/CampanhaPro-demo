import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function init() {
  console.log("Iniciando configuração do banco...");

  // 1. Criar a tabela social_tokens se não existir (via RPC ou SQL bruto não é possível diretamente via client sem RPC configurado, 
  // mas podemos tentar um upsert e ver se falha por tabela inexistente)
  
  const token = process.env.META_TOKEN;
  const campaignId = 'demo'; // Usando 'demo' como padrão para testes

  console.log(`Tentando salvar o token para a campanha: ${campaignId}`);

  const { error } = await supabase
    .from('social_tokens')
    .upsert({
      campaignId,
      provider: 'meta',
      access_token: token,
      updatedAt: new Date().toISOString()
    }, { onConflict: 'campaignId,provider' });

  if (error) {
    if (error.code === '42P01') {
      console.error("ERRO: A tabela 'social_tokens' não existe no seu Supabase.");
      console.log("Por favor, execute o script SQL que te passei no Dashboard do Supabase primeiro.");
    } else {
      console.error("Erro ao salvar token:", error.message);
    }
  } else {
    console.log("✅ Token do Meta salvo com sucesso no banco de dados!");
  }
}

init();
