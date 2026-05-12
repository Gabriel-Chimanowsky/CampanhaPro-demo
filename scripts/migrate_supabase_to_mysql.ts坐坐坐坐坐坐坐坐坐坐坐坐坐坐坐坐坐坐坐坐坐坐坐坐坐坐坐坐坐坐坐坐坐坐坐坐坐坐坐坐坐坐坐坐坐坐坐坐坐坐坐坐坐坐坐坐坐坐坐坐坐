import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'campanhapro'
};

const tables = [
  'users',
  'locations',
  'team_members',
  'visits',
  'engagement_actions',
  'incomes',
  'expenses',
  'settings',
  'campaign_configs',
  'calculator_settings',
  'scenarios',
  'ai_usage',
  'platform_stats',
  'pesquisas',
  'street_reports',
  'instagram_engagements',
  'instagram_webhook_logs',
  'social_tokens'
];

async function migrate() {
  let connection;
  try {
    // Connect to MySQL (without DB first to create it)
    const tempConn = await mysql.createConnection({
        host: mysqlConfig.host,
        user: mysqlConfig.user,
        password: mysqlConfig.password
    });
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS ${mysqlConfig.database}`);
    await tempConn.end();

    connection = await mysql.createConnection(mysqlConfig);
    console.log('Connected to MySQL');

    for (const table of tables) {
      console.log(`Migrating table: ${table}...`);
      
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Error fetching from Supabase table ${table}:`, error);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`Table ${table} is empty, skipping.`);
        continue;
      }

      // Prepara inserção
      const columns = Object.keys(data[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT IGNORE INTO ${table} (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;

      for (const row of data) {
        const values = columns.map(col => {
          const val = row[col];
          // Trata JSON e Arrays para MySQL
          if (val !== null && typeof val === 'object') {
            return JSON.stringify(val);
          }
          return val;
        });

        try {
          await connection.execute(sql, values);
        } catch (err: any) {
          console.error(`Error inserting into MySQL table ${table}:`, err.message);
        }
      }
      console.log(`Table ${table} migrated (${data.length} rows).`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
