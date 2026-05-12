import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Credenciais do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setup() {
  console.log('--- Iniciando Configuração do Supabase ---');

  // 1. Criar Bucket
  console.log('Verificando bucket "street-reports"...');
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Erro ao listar buckets:', listError);
    return;
  }

  const exists = buckets.find(b => b.name === 'street-reports');
  if (!exists) {
    console.log('Criando bucket "street-reports"...');
    const { error: createError } = await supabase.storage.createBucket('street-reports', {
      public: true,
      allowedMimeTypes: ['image/*', 'video/*'],
      fileSizeLimit: 52428800 // 50MB
    });
    
    if (createError) {
      console.error('Erro ao criar bucket:', createError);
    } else {
      console.log('Bucket "street-reports" criado com sucesso!');
    }
  } else {
    console.log('Bucket "street-reports" já existe.');
  }

  console.log('--- Configuração Finalizada ---');
}

setup();
