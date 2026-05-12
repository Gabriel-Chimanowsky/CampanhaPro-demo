import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function initMySQL() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
  });

  console.log('🚀 Iniciando migração para MySQL...');

  try {
    // 1. Criar o banco se não existir
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.MYSQL_DATABASE || 'campanhapro'}\``);
    await connection.query(`USE \`${process.env.MYSQL_DATABASE || 'campanhapro'}\``);

    // 2. Ler o arquivo de schema
    const schemaPath = path.join(process.cwd(), 'mysql-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // 3. Executar o schema (dividindo por ponto e vírgula)
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err: any) {
        console.warn(`⚠️ Erro ao executar statement: ${statement.substring(0, 50)}...`);
        console.warn(`Mensagem: ${err.message}`);
      }
    }

    console.log('✅ Banco de dados MySQL inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro fatal na migração:', error);
  } finally {
    await connection.end();
  }
}

initMySQL();
