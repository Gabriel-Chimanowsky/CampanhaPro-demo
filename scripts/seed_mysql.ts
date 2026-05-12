import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seedMySQL() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'campanhapro',
  });

  console.log('🌱 Semeando dados iniciais no MySQL...');

  try {
    const email = 'eldastito@teste.com';
    const password = 'CampanhaPro@2024';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = '75341594-5f1d-4064-9f41-2b1a7613fe48';
    const campaignId = '455d21f3-f254-4b96-b49c-e70192c3fe27';

    // 1. Limpar e Inserir Usuário Demo
    await connection.query('DELETE FROM users WHERE email = ?', [email]);
    await connection.query(
      'INSERT INTO users (id, email, password, name, type, plan, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, 'Apresentação Demo (Local)', 'Admin', 'Total', campaignId]
    );

    console.log(`✅ Usuário Demo criado: ${email} / ${password}`);
    
    // 2. Inserir um alerta de rua para teste
    await connection.query(
      'INSERT INTO street_reports (id, campaign_id, bairro, clima, reclamacao, latitude, longitude, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), campaignId, 'Centro', 'Negativo', 'Buraco na rua principal', -22.9068, -43.1729, userId]
    );

    console.log('✅ Dados de teste inseridos.');

  } catch (error) {
    console.error('❌ Erro no seed:', error);
  } finally {
    await connection.end();
  }
}

seedMySQL();
