import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import pool from '../src/lib/mysql.js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'users', 'campaigns', 'team_members', 'visits', 'street_reports', 
  'war_room_intelligence', 'social_tokens', 'campaign_configs', 
  'settings', 'incomes', 'engagement_actions', 'scenarios', 
  'calculator_settings', 'locations', 'fraud_audit_logs', 
  'voter_journey', 'pesquisas', 'expenses', 'contacts', 
  'agent_outputs', 'agent_chat_history', 'production_orders', 
  'boletins_urna', 'election_incidents'
];

async function migrate() {
  console.log('🚀 Iniciando extração total do Supabase...');

  for (const table of tables) {
    try {
      console.log(`\n📦 Processando tabela: ${table}`);
      
      // 1. Fetch data from Supabase
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`  ⚠️ Erro ao ler ${table}:`, error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`  ℹ️ Tabela vazia no Supabase.`);
        continue;
      }

      console.log(`  ✅ ${data.length} registros encontrados.`);

      // 2. Insert into MySQL
      for (const row of data) {
        const keys = Object.keys(row);
        const values = Object.values(row).map(v => {
            if (v && typeof v === 'object') return JSON.stringify(v);
            return v;
        });
        
        const placeholders = keys.map(() => '?').join(', ');
        const updates = keys.map(k => `${k} = VALUES(${k})`).join(', ');
        
        const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
        
        try {
            await pool.execute(query, values);
        } catch (dbErr: any) {
            console.error(`  ❌ Erro ao inserir registro em ${table}:`, dbErr.message);
        }
      }
      
      console.log(`  ✔️ ${table} sincronizada.`);

    } catch (err: any) {
      console.error(`  💥 Erro fatal em ${table}:`, err.message);
    }
  }

  console.log('\n✨ Migração concluída com sucesso!');
  process.exit(0);
}

migrate();
