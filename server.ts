import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import path from 'path';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import { createServer as createHttpServer } from 'http';
import { getConversionFunnelStats, getTerritorialAlerts } from './src/services/intelligenceService';
import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from './src/lib/mysql';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';

// Função utilitária para gerar UUID se não houver nativo
const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};


// __dirname is not needed as we use process.cwd() for path resolution

// Configuração centralizada
const AI_MODEL = "gpt-4o-mini"; 
const GEMINI_MODEL_NAME = "gemini-1.5-flash"; 

let supabaseAdmin: any = null;

const adminUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (adminUrl && adminKey) {
  supabaseAdmin = createClient(adminUrl, adminKey);
  console.log("[Supabase Admin] Inicializado com sucesso.");
} else {
  console.warn("[Supabase Admin] Falha ao inicializar: URL ou Service Role Key ausentes.");
}

// Mock Auth Middleware for Local Development
const requireAuth = (req: any, _res: any, next: any) => {
  // Em dev, vamos injetar um usuário mock se o token for o nosso
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.includes('eyJ')) { // JWT fake
    req.user = { id: '27ff83c3-440e-48a1-8226-460108bf10e6', email: 'eldastito@teste.com' };
  }
  next();
};

const requireMySQLAuth = requireAuth;
const JWT_SECRET = process.env.JWT_SECRET || 'campanhapro_super_secret_key_2024';

// --- CATÁLOGO DE SKILLS (AGENT TOOLS) ---
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_backup",
      description: "Cria um snapshot de segurança de todos os dados da campanha.",
      parameters: { type: "object", properties: { reason: { type: "string" } } }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_dalle_image",
      description: "Gera uma imagem real usando DALL-E 3 baseada em um prompt artístico.",
      parameters: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] }
    }
  },
  {
    type: "function",
    function: {
      name: "open_social_media_studio",
      description: "Prepara a interface de publicação para as redes sociais.",
      parameters: { type: "object", properties: { content: { type: "string" } } }
    }
  },
  {
    type: "function",
    function: {
      name: "publish_war_room_insight",
      description: "Publica um insight crítico no feed da Sala de Guerra para visualização no Dashboard.",
      parameters: { 
        type: "object", 
        properties: { 
          category: { type: "string", enum: ["Nicho", "Crise", "Oportunidade", "Logística"] },
          priority: { type: "string", enum: ["Baixa", "Media", "Alta", "CRÍTICO"] },
          insight_text: { type: "string" },
          neighborhood: { type: "string" }
        },
        required: ["category", "priority", "insight_text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "flag_fraudulent_data",
      description: "Sinaliza um registro (eleitor ou reporte) como suspeito de fraude para auditoria.",
      parameters: { 
        type: "object", 
        properties: { 
          entity_type: { type: "string", enum: ["voter", "street_report"] },
          entity_id: { type: "string" },
          risk_level: { type: "string", enum: ["Médio", "Alto", "CRÍTICO"] },
          reason: { type: "string" }
        },
        required: ["entity_type", "entity_id", "risk_level", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_conversion_funnel",
      description: "Retorna as estatísticas atuais do funil de conversão (quantos eleitores em cada estágio da jornada).",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_territorial_gap",
      description: "Analisa os bairros com maior diferença entre visitas realizadas e potencial de votos (Gaps Territoriais).",
      parameters: { type: "object", properties: {} }
    }
  }
];

const cleanJSON = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

const callChatGPT = async (prompt: string, systemInstruction?: string, tools?: any[]) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");

  const messages: any[] = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: prompt });

  const body: any = { model: AI_MODEL, messages, temperature: 0.7 };
  if (tools && tools.length > 0) { body.tools = tools; body.tool_choice = "auto"; }

  const response = await axios.post('https://api.openai.com/v1/chat/completions', body, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
  });

  const result = response.data.choices[0].message;
  return {
    text: () => result.content || "",
    tool_calls: result.tool_calls,
    response: { text: () => result.content || "" }
  };
};

const callGeminiREST = async (prompt: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: () => response.text(),
      response: { text: () => response.text() }
    };
  } catch (error: any) {
    console.error("[Gemini] Erro na chamada:", error.message);
    throw error;
  }
};


async function startServer() {
  const port: number = Number(process.env.PORT) || 3001;
  const app = express();
  const httpServer = createHttpServer(app);

  // Core Middlewares
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true
  }));
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  
  // Serve static files from uploads folder
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
  app.use('/uploads', express.static('uploads'));

  // Configure Multer for local storage
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
  });

  app.use((req, _res, next) => {
    console.log(`[REQ] ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });


  // Rota de Emergência para Sincronizar Banco de Dados
  app.get('/api/admin/sync-db', async (_req, res) => {
    try {
      console.log('[Admin] Iniciando sincronização forçada do banco...');
      
      // Sincronizar street_reports
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS street_reports (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          campaign_id VARCHAR(255),
          title VARCHAR(255),
          reclamacao TEXT,
          description TEXT,
          bairro VARCHAR(255),
          address TEXT,
          clima VARCHAR(100),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          media_urls JSON,
          video_url TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const [reportCols]: any = await pool.execute('DESCRIBE street_reports');
      const colNames = reportCols.map((c: any) => c.Field);
      
      const requiredCols = [
        { name: 'user_id', type: 'VARCHAR(255)' },
        { name: 'campaign_id', type: 'VARCHAR(255)' },
        { name: 'title', type: 'VARCHAR(255)' },
        { name: 'reclamacao', type: 'TEXT' },
        { name: 'bairro', type: 'VARCHAR(255)' },
        { name: 'clima', type: 'VARCHAR(100)' },
        { name: 'video_url', type: 'TEXT' },
        { name: 'media_urls', type: 'JSON' },
        { name: 'latitude', type: 'DECIMAL(10, 8)' },
        { name: 'longitude', type: 'DECIMAL(11, 8)' },
        { name: 'status', type: "VARCHAR(50) DEFAULT 'pending'" }
      ];

      let added = [];
      for (const col of requiredCols) {
        if (!colNames.includes(col.name)) {
          console.log(`[Database] Adding missing column: ${col.name}...`);
          await pool.execute(`ALTER TABLE street_reports ADD COLUMN ${col.name} ${col.type}`);
          added.push(col.name);
        }
      }

      res.json({ 
        message: 'Banco de Dados Sincronizado com Sucesso!', 
        added_columns: added,
        current_columns: colNames
      });
    } catch (err: any) {
      console.error('[Admin] Erro na sincronização:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/ping', (_req, res) => {
    res.json({ pong: true, time: new Date().toISOString() });
  });



  // Heartbeat para garantir que o processo está vivo
  setInterval(() => {
    console.log(`[Heartbeat] Server is alive - ${new Date().toISOString()}`);
  }, 30000);

  // Endpoint de Upload Local
  app.post('/api/upload', (req, res, next) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('[Multer Error]', err);
        return res.status(400).json({ error: `Erro no Multer: ${err.message}` });
      } else if (err) {
        console.error('[Upload Error]', err);
        return res.status(500).json({ error: `Erro no Upload: ${err.message}` });
      }
      next();
    });
  }, (req, res) => {
    console.log('[Upload] Recebendo arquivos...', (req as any).files?.length);
    try {
      const files = (req as any).files as any[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }
      
      const urls = files.map(file => `/uploads/${file.filename}`);
      
      res.json({ urls });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/reports', async (req, res) => {
    try {
      const { 
        title, reclamacao, bairro, clima, 
        latitude, longitude, mediaUrls, videoUrl, 
        userId, campaignId 
      } = req.body;

      const reportId = generateUUID();
      
      await pool.execute(
        `INSERT INTO street_reports 
          (id, user_id, campaign_id, title, reclamacao, bairro, clima, latitude, longitude, media_urls, video_url, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          userId,
          campaignId,
          title,
          reclamacao || '',
          bairro || '',
          clima,
          latitude,
          longitude,
          JSON.stringify(mediaUrls || []),
          videoUrl || null,
          'Pendente'
        ]
      );

      res.status(201).json({ success: true, id: reportId });
    } catch (error: any) {
      console.error('[Reports] Erro ao salvar:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const { email, password, options } = req.body || {};
    console.log(`[AUTH-MYSQL] Register attempt for: ${email}`);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Timer para monitorar lentidão do banco
    const dbTimeout = setTimeout(() => {
      console.error(`[AUTH-MYSQL] DATABASE HANG DETECTED for ${email}`);
      if (!res.headersSent) {
        res.status(504).json({ error: 'O banco de dados demorou muito para responder. Verifique seu MySQL/XAMPP.' });
      }
    }, 8000); // 8s limite para o DB

    try {
      console.log('[AUTH-MYSQL] Step 1: Parsing options');
      const { name, phone, type, campaignId } = options?.data || {};
      const userId = `user_${Date.now()}`;
      
      console.log('[AUTH-MYSQL] Step 2: Hashing password');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log('[AUTH-MYSQL] Step 3: Executing MySQL Insert');
      
      await pool.execute(
        `INSERT INTO users (id, name, email, password, phone, type, plan, role, campaign_id, is_supreme_admin) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), phone = VALUES(phone)`,
        [
          userId, 
          name || 'Novo Colaborador', 
          email, 
          hashedPassword,
          phone || null, 
          type || 'Colaborador', 
          'ESSENCIAL', 
          'active', 
          campaignId || '75341594-5f1d-4064-9f41-2b1a7613fe48',
          0
        ]
      );

      console.log('[AUTH-MYSQL] Step 4: Finalizing response');
      clearTimeout(dbTimeout);
      const responseBody = { 
        user: { id: userId, email, user_metadata: { name, phone, type, campaignId } },
        session: { 
          access_token: jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' }),
          user: { id: userId, email } 
        }
      };

      console.log(`[AUTH-MYSQL] SUCCESS: User ${userId} created.`);
      if (!res.headersSent) res.status(201).json(responseBody);
    } catch (err: any) {
      clearTimeout(dbTimeout);
      console.error('[AUTH-MYSQL] DATABASE ERROR:', err);
      if (!res.headersSent) res.status(500).json({ error: `Erro no MySQL: ${err.message}` });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    console.log(`[AUTH-LOGIN] Attempt for: ${email}`);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Bypass de Emergência para Administradores Conhecidos
    const cleanEmail = (email || '').trim();
    const cleanPass = (password || '').trim();
    const isAdminBypass = (cleanEmail === 'demo@campanhapro.com.br' || cleanEmail === 'eldastito@teste.com') && cleanPass === 'CampanhaPro@2024';

    console.log(`[DEBUG-LOGIN] Admin Bypass Check: ${isAdminBypass}`);

    try {
      const [users]: any = await pool.execute('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      
      console.log(`[DEBUG-LOGIN] Users found: ${users?.length || 0}`);
      
      if (isAdminBypass && (!users || users.length === 0)) {
         // Se é admin mas não existe no MySQL, criamos agora
         const adminId = `admin_${Date.now()}`;
         const hashed = await bcrypt.hash(password, 10);
         await pool.execute(
           'INSERT INTO users (id, name, email, password, type, role, is_supreme_admin) VALUES (?, ?, ?, ?, ?, ?, ?)',
           [adminId, 'Administrador Central', email, hashed, 'Admin', 'active', 1]
         );
         return res.json({ 
           token: jwt.sign({ id: adminId, email }, JWT_SECRET),
           user: { id: adminId, email, type: 'Admin', is_supreme_admin: 1 }
         });
      }
      // Caso o Admin já exista mas a senha esteja NULL ou errada, o bypass "conserta" a conta
      if (isAdminBypass && users.length > 0) {
        const user = users[0];
        console.log(`[AUTH-LOGIN] Admin Bypass: Synchronizing password for ${email}`);
        const hashed = await bcrypt.hash(password, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
        return res.json({ 
          token: jwt.sign({ id: user.id, email }, JWT_SECRET),
          user: { id: user.id, email, type: user.type, is_supreme_admin: user.is_supreme_admin }
        });
      }

      if (!users || users.length === 0) {
        console.warn(`[AUTH-LOGIN] User not found: ${email}`);
        return res.status(401).json({ error: 'E-mail ou senha incorretos' });
      }

      const user = users[0];
      // Garantir que a senha do banco seja tratada como string
      const dbPassword = user.password ? user.password.toString() : null;
      
      console.log(`[DEBUG-LOGIN] DB Password: ${dbPassword ? 'Exists' : 'NULL'}`);
      console.log(`[DEBUG-LOGIN] DB Password Length: ${dbPassword?.length || 0}`);

      // 2. Verificar senha
      let isMatch = false;
      
      if (dbPassword) {
        try {
          isMatch = await bcrypt.compare(password, dbPassword);
        } catch (e) {
          console.error('[DEBUG-LOGIN] Bcrypt compare failed:', e);
        }
      }
      
      // Fallback para senhas em texto puro (migração)
      if (!isMatch && dbPassword === password) {
        console.log(`[AUTH-LOGIN] Upgrading plain-text password for: ${email}`);
        const newHash = await bcrypt.hash(password, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newHash, user.id]);
        isMatch = true;
      }
      
      // Se ainda não deu match e a senha digitada for a mesma do banco (caso texto puro)
      // Ou se o campo password for nulo e você estiver tentando criar uma senha (opcional)

      if (!isMatch) {
        console.warn(`[AUTH-LOGIN] Invalid password for: ${email}`);
        return res.status(401).json({ error: 'E-mail ou senha incorretos' });
      }

      // 3. Gerar Token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      
      console.log(`[AUTH-LOGIN] SUCCESS: ${email} logged in.`);
      
      return res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          type: user.type, 
          campaign_id: user.campaign_id,
          is_supreme_admin: user.is_supreme_admin
        } 
      });
    } catch (err: any) {
      console.error('[AUTH-LOGIN] CRITICAL ERROR:', err);
      return res.status(500).json({ error: `Erro no Servidor: ${err.message}` });
    }
  });

  app.use('/api', (_req, _res, next) => {
    // Middleware de log unificado
    next();
  });




  // --- Universal MySQL Proxy (Mimics Supabase Rest API) ---
  app.get('/api/db/:table', requireMySQLAuth, async (req, res) => {
    try {
      const { table } = req.params;
      const { campaign_id: _cid, id: _id, order, limit } = req.query;
      
      // Especial para street_reports: Trazer nome do usuário (JOIN)
      let sql = table === 'street_reports' 
        ? `SELECT sr.*, u.name as user_name 
           FROM street_reports sr 
           LEFT JOIN users u ON sr.user_id = u.id`
        : `SELECT * FROM ${table}`;
      
      let query = `${sql} WHERE 1=1`;
      const params: any[] = [];

      for (const [key, value] of Object.entries(req.query)) {
        if (['order', 'limit', 'select'].includes(key)) continue;

        const isStreetReport = table === 'street_reports';
        const snakeKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
        const isNullValue = value === 'null' || value === null;
        const prefix = isStreetReport ? 'sr.' : '';
        
        if (snakeKey.includes('!not!is')) {
          const rawCol = snakeKey.split('!')[0];
          query += isNullValue ? ` AND ${prefix}${rawCol} IS NOT NULL` : ` AND ${prefix}${rawCol} != ?`;
          if (!isNullValue) params.push(value);
        } else if (snakeKey.includes('!is')) {
          const rawCol = snakeKey.split('!')[0];
          query += isNullValue ? ` AND ${prefix}${rawCol} IS NULL` : ` AND ${prefix}${rawCol} = ?`;
          if (!isNullValue) params.push(value);
        } else if (snakeKey.includes('!gte')) {
          const rawCol = snakeKey.split('!')[0];
          query += ` AND ${prefix}${rawCol} >= ?`;
          params.push(value);
        } else if (snakeKey.includes('!lte')) {
          const rawCol = snakeKey.split('!')[0];
          query += ` AND ${prefix}${rawCol} <= ?`;
          params.push(value);
        } else if (snakeKey.includes('!neq')) {
          const rawCol = snakeKey.split('!')[0];
          query += isNullValue ? ` AND ${prefix}${rawCol} IS NOT NULL` : ` AND ${prefix}${rawCol} != ?`;
          if (!isNullValue) params.push(value);
        } else {
          // Standard equality check
          query += isNullValue ? ` AND ${prefix}${snakeKey} IS NULL` : ` AND ${prefix}${snakeKey} = ?`;
          if (!isNullValue) params.push(value);
        }
      }

      if (order) {
        const [col, dir] = (order as string).split('.');
        const prefix = table === 'street_reports' ? 'sr.' : '';
        query += ` ORDER BY ${prefix}${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
      }

      if (limit) {
        query += ` LIMIT ${parseInt(limit as string)}`;
      }

      const [rows]: any = await pool.execute(query, params as any);
      
      // Convert result keys to camelCase and sanitize URLs
      const camelRows = rows.map((row: any) => {
        const newRow: any = {};
        for (const key of Object.keys(row)) {
          const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          let value = row[key];
          
          // Sanitize URLs to be relative if they contain the APP_URL or localhost
          if (typeof value === 'string' && (camelKey === 'mediaUrls' || camelKey === 'videoUrl' || camelKey === 'fotoUrl')) {
            const appUrl = process.env.APP_URL || '';
            if (appUrl && value.includes(appUrl)) {
              value = value.replace(appUrl, '');
            } else if (value.includes('http://localhost:3001')) {
              value = value.replace('http://localhost:3001', '');
            }
          }
          
          newRow[camelKey] = value;
        }
        return newRow;
      });

      res.json(camelRows);
    } catch (err: any) {
      console.error(`Erro select ${req.params.table}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/:table', requireMySQLAuth, express.json(), async (req, res) => {
    try {
      const { table } = req.params;
      const data = req.body;
      
      const snakeData: any = {};
      for (const key of Object.keys(data)) {
        const snakeKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
        snakeData[snakeKey] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
      }

      // Auto-generate UUID if missing
      if (!snakeData.id) {
        snakeData.id = crypto.randomUUID();
      }

      const keys = Object.keys(snakeData);
      const values = Object.values(snakeData);
      const placeholders = keys.map(() => '?').join(', ');
      
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      await pool.execute(query, values as any);
      
      res.status(201).json(data);
    } catch (err: any) {
      console.error(`Erro insert ${req.params.table}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/db/:table', requireMySQLAuth, express.json(), async (req, res) => {
    try {
      const { table } = req.params;
      const { data, filters } = req.body;
      
      const setClauses: string[] = [];
      const values: any[] = [];

      for (const key of Object.keys(data)) {
        const snakeKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
        setClauses.push(`${snakeKey} = ?`);
        values.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
      }

      let whereClause = '1=1';
      for (const key of Object.keys(filters)) {
        whereClause += ` AND ${key} = ?`;
        values.push(filters[key]);
      }

      const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClause}`;
      await pool.execute(query, values as any);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error(`Erro update ${req.params.table}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- DELETE Route with Cascading for Users ---
  app.delete('/api/db/:table', requireMySQLAuth, async (req, res) => {
    try {
      const { table } = req.params;
      const { id } = req.query;

      if (!id) return res.status(400).json({ error: 'ID is required' });

      // Cascading logic for users
      if (table === 'users') {
        console.log(`[Cascading Delete] Removing reports for user: ${id}`);
        await pool.execute('DELETE FROM street_reports WHERE user_id = ?', [id as string]);
      }

      const query = `DELETE FROM ${table} WHERE id = ?`;
      await pool.execute(query, [id as string]);
      
      res.json({ success: true });
    } catch (err: any) {
      console.error(`Erro delete ${req.params.table}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Real File Upload Endpoint ---
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      // Use APP_URL for the public path
      const appUrl = process.env.APP_URL || `http://localhost:${port}`;
      const publicUrl = `${appUrl.replace(/\/$/, '')}/uploads/${req.file.filename}`;
      res.json({ publicUrl, path: req.file.path });
    } catch (err: any) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/:table/upsert', requireMySQLAuth, express.json(), async (req, res) => {
    try {
      const { table } = req.params;
      const data = req.body;
      
      const snakeData: any = {};
      for (const key of Object.keys(data)) {
        const snakeKey = key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`);
        snakeData[snakeKey] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key];
      }

      const keys = Object.keys(snakeData);
      const values = Object.values(snakeData);
      const placeholders = keys.map(() => '?').join(', ');
      
      const updates = keys.map(k => `${k} = VALUES(${k})`).join(', ');
      
      const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      await pool.execute(query, values as any);
      
      res.status(201).json(data);
    } catch (err: any) {
      console.error(`Erro upsert ${req.params.table}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log(`[System] Inicializando CampanhaPro v1.0.3...`);
  console.log(`[Env] Modo: ${process.env.NODE_ENV || 'development'}`);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  
  // Já configuramos cors() no middleware global.

  
  // Mock Social Status
app.get('/api/social/status', (_req, res) => {
  res.json({
    connected: true,
    last_sync: new Date().toISOString(),
    metrics: { followers: 0, engagement: 0 }
  });
});

// Mock War Room Feed
app.get('/api/war-room/feed', (_req, res) => {
  res.json({
    items: [],
    total: 0
  });
});

// Middleware de Autenticação MySQL (Ponte)
  app.use((_req, res, next) => {
      res.setHeader('X-App-Version', '1.0.3');
      next();
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // --- Campanhas ---
  app.get('/api/campaigns', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      
      // Get user's campaign from MySQL
      const [users]: any = await pool.execute('SELECT campaign_id FROM users WHERE id = ?', [userId]);
      const userData = users[0];

      if (!userData?.campaign_id) {
        return res.status(404).json({ error: 'No campaign found for user' });
      }

      // Get campaign config from MySQL
      const [configs]: any = await pool.execute('SELECT * FROM campaign_configs WHERE id = ?', [userData.campaign_id]);
      const campaignData = configs[0];

      if (!campaignData) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({
        id: userData.campaign_id,
        ...campaignData
      });
    } catch (error: any) {
      console.error('[Campaigns] Erro:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/campaigns/:campaignId', requireAuth, async (req, res) => {
    try {
      const { campaignId } = req.params;
      
      const [configs]: any = await pool.execute('SELECT * FROM campaign_configs WHERE id = ?', [campaignId]);
      const data = configs[0];

      if (!data) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({ id: campaignId, ...data });
    } catch (error: any) {
      console.error('[Campaign Detail] Erro:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- OAuth Social ---
  app.get('/api/auth/meta/url', async (req, res) => {
    const { campaignId } = req.query;
    const metaAppId = process.env.META_APP_ID;
    
    if (metaAppId) {
      // Flow real: redireciona para o Facebook
      const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback/meta`;
      const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement&state=${campaignId}`;
      return res.json({ url });
    }

    // Fallback: Simulação
    res.json({ url: `${req.protocol}://${req.get('host')}/api/auth/callback/simulate?campaignId=${campaignId}&provider=meta` });
  });

  // Callback real para Meta
  app.get('/api/auth/callback/meta', async (req, res) => {
    const { code, state: campaignId } = req.query;
    const metaAppId = process.env.META_APP_ID;
    const metaAppSecret = process.env.META_APP_SECRET;
    const redirectUri = `${req.protocol}://${req.get('host')}/api/auth/callback/meta`;

    try {
      // Trocar code por User Access Token
      const tokenRes = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        params: {
          client_id: metaAppId,
          client_secret: metaAppSecret,
          redirect_uri: redirectUri,
          code
        }
      });

      const accessToken = tokenRes.data.access_token;

      if (supabaseAdmin && campaignId) {
        await supabaseAdmin.from('social_tokens').delete().eq('campaign_id', campaignId).eq('provider', 'meta');
        await supabaseAdmin.from('social_tokens').insert({
            campaign_id: campaignId,
            provider: 'meta',
            access_token: accessToken,
            updated_at: new Date().toISOString()
        });
      }

      res.send(`
        <html>
          <body style="background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; padding: 20px;">
            <div style="background: #1e293b; padding: 40px; border: 1px solid #334155; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="color: #22c55e; font-size: 48px; margin-bottom: 20px;">✓</div>
              <h2 style="margin: 0 0 10px 0;">Instagram Conectado!</h2>
              <p style="color: #94a3b8; font-size: 14px;">A conta foi vinculada com sucesso.</p>
              <script>
                setTimeout(() => {
                  if (window.opener) window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '*');
                  window.close();
                }, 2000);
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send("Erro ao processar login do Meta: " + error.message);
    }
  });

  app.get('/api/auth/tiktok/url', async (req, res) => {
    const { campaignId } = req.query;
    res.json({ url: `${req.protocol}://${req.get('host')}/api/auth/callback/simulate?campaignId=${campaignId}&provider=tiktok` });
  });

  app.get('/api/auth/callback/simulate', async (req, res) => {
    const { campaignId, provider } = req.query;
    
    let dbError = null;
    if (supabaseAdmin && campaignId) {
        const { error: delErr } = await supabaseAdmin.from('social_tokens').delete().eq('campaign_id', campaignId).eq('provider', provider);
        const { error: insErr } = await supabaseAdmin.from('social_tokens').insert({
            campaign_id: campaignId,
            provider,
            access_token: 'SIMULATED_TOKEN_' + Math.random().toString(36).substring(7),
            updated_at: new Date().toISOString()
        });
        if (delErr) dbError = delErr;
        else if (insErr) dbError = insErr;
    }

    if (dbError) {
      return res.send(`
        <html>
          <body style="background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; padding: 20px;">
            <div style="background: #1e293b; padding: 40px; border: 1px solid #ef4444; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
              <div style="color: #ef4444; font-size: 48px; margin-bottom: 20px;">✖</div>
              <h2 style="margin: 0 0 10px 0;">Erro no Banco de Dados!</h2>
              <p style="color: #94a3b8; font-size: 14px;">Você rodou os scripts SQL no Supabase?</p>
              <pre style="background: #000; padding: 10px; border-radius: 5px; color: #ef4444; font-size: 12px; text-align: left; overflow: auto; max-width: 400px;">${JSON.stringify(dbError, null, 2)}</pre>
            </div>
          </body>
        </html>
      `);
    }

    res.send(`
      <html>
        <body style="background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; padding: 20px;">
          <div style="background: #1e293b; padding: 40px; border: 1px solid #334155; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="color: #22c55e; font-size: 48px; margin-bottom: 20px;">✓</div>
            <h2 style="margin: 0 0 10px 0;">Conexão Bem Sucedida!</h2>
            <p style="color: #94a3b8; font-size: 14px;">A conta do ${String(provider).toUpperCase()} foi vinculada com sucesso.</p>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">Esta janela fechará automaticamente...</p>
          </div>
          <script>
            setTimeout(() => {
              if (window.opener) {
                window.opener.postMessage({ type: '${provider === 'tiktok' ? 'TIKTOK' : 'META'}_AUTH_SUCCESS' }, '*');
              }
              window.close();
            }, 2500);
          </script>
        </body>
      </html>
    `);
  });

  // --- Endpoints de IA e Agentes ---

  app.post('/api/agents/chat', requireAuth, async (req, res) => {
    try {
      const { prompt, systemInstruction, campaignId, userId, agentId } = req.body;
      
      if (supabaseAdmin && campaignId && agentId) {
          await supabaseAdmin.from('agent_chat_history').insert({
              campaign_id: campaignId, agent_id: agentId, role: 'user', content: prompt
          });
      }

      const aiResponse = await callChatGPT(prompt, systemInstruction, AGENT_TOOLS);
      let textResult = aiResponse.text();

      // EXECUTAR TOOLS SE HOUVER (e coletar resultados para a 2a chamada)
      const toolResults: { tool_call_id: string; output: any }[] = [];

      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        for (const tool of aiResponse.tool_calls) {
          const args = JSON.parse(tool.function.arguments);
          let toolOutput: any = { success: true };

          if (tool.function.name === 'publish_war_room_insight') {
            if (supabaseAdmin) {
              await supabaseAdmin.from('war_room_intelligence').insert({
                campaign_id: campaignId,
                source_agent: agentId,
                category: args.category,
                priority: args.priority,
                insight_text: args.insight_text,
                metadata: { neighborhood: args.neighborhood },
                created_at: new Date().toISOString()
              });
            }
            toolOutput = { success: true, message: 'Insight publicado na Sala de Guerra.' };
          }

          if (tool.function.name === 'get_conversion_funnel') {
            const stats = await getConversionFunnelStats(campaignId);
            if (supabaseAdmin) {
              await supabaseAdmin.from('war_room_intelligence').insert({
                campaign_id: campaignId,
                source_agent: agentId,
                category: 'Oportunidade',
                priority: 'Media',
                insight_text: `Análise de Funil solicitada: ${stats.map((s: any) => `${s.stage}: ${s.count}`).join(', ')}`,
                created_at: new Date().toISOString()
              });
            }
            toolOutput = { funnel: stats };
          }

          if (tool.function.name === 'analyze_territorial_gap') {
            const alerts = await getTerritorialAlerts(campaignId);
            if (supabaseAdmin) {
              for (const alert of alerts.slice(0, 3)) {
                 await supabaseAdmin.from('war_room_intelligence').insert({
                   campaign_id: campaignId,
                   source_agent: agentId,
                   category: 'Logística',
                   priority: alert.risk_level === 'Critical' ? 'CRÍTICO' : 'Alta',
                   insight_text: `GAP TERRITORIAL em ${alert.neighborhood}: ${alert.gap_percentage.toFixed(1)}% de defasagem.`,
                   metadata: { neighborhood: alert.neighborhood, risk: alert.risk_level },
                   created_at: new Date().toISOString()
                 });
              }
            }
            toolOutput = { territorial_alerts: alerts };
          }

          toolResults.push({ tool_call_id: tool.id, output: toolOutput });
        }
      }

      // SEGUNDA CHAMADA: alimentar resultados das tools de volta na IA pra gerar texto final
      if (toolResults.length > 0) {
        try {
          const apiKey = process.env.OPENAI_API_KEY;
          const followupMessages: any[] = [];
          if (systemInstruction) followupMessages.push({ role: 'system', content: systemInstruction });
          followupMessages.push({ role: 'user', content: prompt });
          followupMessages.push({
            role: 'assistant',
            content: aiResponse.text() || null,
            tool_calls: aiResponse.tool_calls
          });
          for (const tr of toolResults) {
            followupMessages.push({
              role: 'tool',
              tool_call_id: tr.tool_call_id,
              content: JSON.stringify(tr.output)
            });
          }

          const followup = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: AI_MODEL,
            messages: followupMessages,
            temperature: 0.7
          }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
          });

          const followupText = followup.data.choices[0].message.content;
          if (followupText) textResult = followupText;
        } catch (followupError: any) {
          console.error('[Agent Chat] Erro na follow-up call:', followupError.message);
        }
      }

      if (supabaseAdmin && campaignId && agentId) {
          await supabaseAdmin.from('agent_chat_history').insert({
              campaign_id: campaignId, agent_id: agentId, role: 'agent', content: textResult, 
              metadata: { tool_calls: aiResponse.tool_calls }
          });

          // Log de Compliance para geração de chat
          await supabaseAdmin.from('ai_compliance_logs').insert({
              campaign_id: campaignId,
              agent_id: agentId,
              action_type: 'chat_generation',
              input_summary: prompt.substring(0, 200),
              output_summary: textResult.substring(0, 200),
              ai_disclosure_required: true,
              human_approved: false, // Apenas geração, ainda não publicado
              created_by: userId
          });
      }

      res.json({ text: textResult, tool_calls: aiResponse.tool_calls });
    } catch (error: any) {
      console.error("[Agent Chat] Erro:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Endpoints Gemini (Usados pelo geminiService.ts) ---
  app.post('/api/gemini/chat', requireAuth, async (req, res) => {
    try {
      const { prompt } = req.body;
      const aiResponse = await callGeminiREST(prompt);
      res.json({ text: aiResponse.text() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/public/chat', async (req, res) => {
    try {
      const { prompt } = req.body;
      // Endpoint público usa Gemini (mais econômico/rápido para eleitores)
      const aiResponse = await callGeminiREST(prompt);
      res.json({ text: aiResponse.text() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/agents/history/:agentId', requireAuth, async (req: any, res: any) => {
    try {
        const { agentId } = req.params;
        const { campaignId } = req.query;
        const { data, error } = await supabaseAdmin.from('agent_chat_history')
            .select('*').eq('campaign_id', campaignId).eq('agent_id', agentId)
            .order('created_at', { ascending: true }).limit(50);
        if (error) throw error;
        res.json({ history: data || [] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/agents/generate-image', requireAuth, async (req: any, res: any) => {
    try {
      const { prompt, campaignId, agentId } = req.body;
      const ptPrompt = `ESTRITAMENTE EM PORTUGUÊS DO BRASIL: Qualquer texto na imagem deve ser em português brasileiro. Tema: ${prompt}.`;
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: "dall-e-3", prompt: ptPrompt, n: 1, size: "1024x1792"
      }, { headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } });

      const imageUrl = response.data.data[0].url;
      await supabaseAdmin.from('agent_chat_history').insert({
          campaign_id: campaignId, agent_id: agentId, role: 'agent', content: `![ATIVO](${imageUrl})`, metadata: { type: 'image' }
      });
      res.json({ imageUrl });
    } catch (error) { res.status(500).json({ error: 'Erro DALL-E' }); }
  });

  // --- Dashboard Feed ---
  app.get('/api/war-room/feed', requireAuth, async (req, res) => {
    const { campaign_id } = req.query;
    const { data } = await supabaseAdmin.from('war_room_intelligence')
      .select('*').eq('campaign_id', campaign_id).order('created_at', { ascending: false }).limit(10);
    res.json({ insights: data || [] });
  });

  app.get('/api/social/status', requireAuth, async (req, res) => {
    try {
      const { campaignId, provider } = req.query;
      if (!campaignId || !provider) return res.status(400).json({ error: 'campaignId and provider are required' });

      const { data, error } = await supabaseAdmin
        .from('social_tokens')
        .select('id, updated_at')
        .eq('campaign_id', campaignId)
        .eq('provider', provider)
        .maybeSingle();

      if (error) throw error;
      res.json({ connected: !!data, lastUpdate: data?.updated_at });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/instagram/ranking', requireAuth, async (req, res) => {
    try {
      const { campaign_id } = req.body;

      if (!campaign_id) {
        return res.status(400).json({ error: 'campaign_id is required' });
      }

      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }

      // 1. Get Instagram Token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('social_tokens')
        .select('access_token')
        .eq('campaign_id', campaign_id)
        .eq('provider', 'meta')
        .single();

      if (tokenError || !tokenData) {
        return res.json({ ranking: [], connected: false, error: 'Instagram não conectado' });
      }

      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return res.json({ ranking: [], connected: false, error: 'Instagram não conectado' });
      }

      // Se for um token simulado (ambiente de teste/desenvolvimento)
      if (accessToken.startsWith('SIMULATED_TOKEN')) {
        return res.json({
          ranking: [
            { username: 'maria_silva', count: 42, lastComment: 'Excelente proposta para a saúde!' },
            { username: 'joao_pedro', count: 35, lastComment: 'Conte com meu apoio!' },
            { username: 'ana_claudia', count: 28, lastComment: 'Bairro de Copacabana precisa disso.' },
            { username: 'carlos_edu', count: 15, lastComment: 'Vou compartilhar no meu grupo.' },
            { username: 'beatriz_lopes', count: 12, lastComment: 'Parabéns pelo trabalho.' }
          ]
        });
      }

      // FETCH MEDIA (Recent Posts)
      const mediaResponse = await axios.get(`https://graph.facebook.com/v19.0/me/media?fields=id,caption,timestamp,comments_count&access_token=${accessToken}`);
      const mediaData = mediaResponse.data;

      if (mediaData.error) {
        throw new Error(mediaData.error.message);
      }

      const posts = mediaData.data || [];
      const rankingMap: Record<string, { count: number, lastComment: string }> = {};

      // 3. Fetch Comments for each post
      for (const post of posts.slice(0, 10)) {
        if (post.comments_count > 0) {
          const commentsResponse = await axios.get(`https://graph.facebook.com/v19.0/${post.id}/comments?fields=from,text,timestamp&access_token=${accessToken}`);
          const commentsData = commentsResponse.data;
          
          if (commentsData.data) {
            for (const comment of commentsData.data) {
              const username = comment.from?.username || 'usuario_privado';
              if (!rankingMap[username]) {
                rankingMap[username] = { count: 0, lastComment: '' };
              }
              rankingMap[username].count += 1;
              rankingMap[username].lastComment = comment.text;
            }
          }
        }
      }

      // 4. Format and Sort Ranking
      const ranking = Object.entries(rankingMap)
        .map(([username, data]) => ({
          username,
          count: data.count,
          lastComment: data.lastComment
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      res.json({ ranking });
    } catch (error: any) {
      console.error('[Instagram API]', error.response?.data || error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- IA Agents Configuration ---
  app.get('/api/fraud/logs', requireAuth, async (req, res) => {
    const { campaign_id } = req.query;
    const { data } = await supabaseAdmin.from('fraud_audit_logs')
      .select('*').eq('campaign_id', campaign_id).order('created_at', { ascending: false });
    res.json({ logs: data || [] });
  });

  app.post('/api/agents/publish-social', requireAuth, async (req, res) => {
    try {
      const { campaign_id, platforms, content, agent_id, ai_disclosure_required } = req.body;
      const user_id = (req as any).user?.id;

      // 1. Validar se o usuário pertence à campanha e tem permissão (Admin ou Líder)
      if (supabaseAdmin) {
        const { data: userCampaign, error: campaignError } = await supabaseAdmin
          .from('users')
          .select('campaign_id, type')
          .eq('id', user_id)
          .single();

        if (campaignError || !userCampaign || userCampaign.campaign_id !== campaign_id) {
          return res.status(403).json({ error: "Acesso negado: Usuário não pertence a esta campanha." });
        }

        const allowedTypes = ['Admin', 'Líder', 'Candidato'];
        if (!allowedTypes.includes(userCampaign.type)) {
          return res.status(403).json({ error: "Permissão insuficiente para publicar em redes sociais." });
        }

        // 2. Registrar log de compliance
        await supabaseAdmin.from('ai_compliance_logs').insert({
          campaign_id,
          agent_id: agent_id || 'manual_publish',
          action_type: 'social_publication',
          input_summary: content.substring(0, 200),
          output_summary: `Publicado em: ${platforms.join(', ')}`,
          ai_disclosure_required: ai_disclosure_required || true,
          human_approved: true,
          risk_level: 'baixo',
          created_by: user_id
        });
      }

      console.log(`[SOCIAL PUBLISH] Campanha ${campaign_id} postando por usuário ${user_id} em: ${platforms.join(', ')}`);
      
      // Simulação de processamento de rede social
      await new Promise(r => setTimeout(r, 1500));
      
      res.json({ 
        success: true, 
        message: `Conteúdo publicado com sucesso em ${platforms.length} rede(s).`,
        platforms: platforms
      });
    } catch (error: any) {
           res.status(500).json({ error: error.message });
    }
  });

  // --- Instagram Webhooks (Tempo Real) ---
  app.get('/api/webhooks/instagram', (req, res) => {
    // Verificação de desafio da Meta
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // O VERIFY_TOKEN aqui precisa ser configurado no Meta App
    if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  app.post('/api/webhooks/instagram', async (req, res) => {
    const body = req.body;
    
    // Verifica se é evento do Instagram
    if (body.object === 'instagram') {
      try {
        if (!supabaseAdmin) {
          throw new Error('Database service unavailable');
        }

        // Loop sobre os entries (pode haver mais de um em lote)
        for (const entry of body.entry) {
          // const _campaignId = entry.id; // O Instagram ID da Business Account vinculada
          
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'comments') {
                const commentData = change.value;
                const instagramHandle = commentData.from?.username?.toLowerCase().replace(/@/g, '').trim();
                
                if (instagramHandle) {
                  // Busca no banco se o @ é um lead nosso
                  const { data: matchedLead } = await supabaseAdmin
                    .from('contacts')
                    .select('id, name')
                    .eq('instagram_handle', instagramHandle)
                    // Como não temos o campaign_id exato do payload (entry.id é a page ID), a gente busca no geral ou faz match pelo campaign_id mapeado
                    .limit(1)
                    .single();

                  if (matchedLead) {
                    console.log(`[Webhook] Novo comentário do lead verificado: ${instagramHandle} (${matchedLead.name})`);
                    
                    // Aqui poderia salvar o engajamento na tabela `instagram_engagements` para ranking em tempo real
                    await supabaseAdmin.from('instagram_engagements').insert({
                      instagram_handle: instagramHandle,
                      comment_text: commentData.text,
                      post_id: commentData.media?.id,
                      matched_lead_id: matchedLead.id,
                      webhook_received_at: new Date().toISOString()
                    });
                  } else {
                    console.log(`[Webhook] Novo comentário de conta externa: ${instagramHandle}`);
                  }
                }
              }
            }
          }
        }
        res.status(200).send('EVENT_RECEIVED');
      } catch (error: any) {
        console.error('[Webhook] Erro no processamento:', error.message);
        res.status(500).send('ERROR');
      }
    } else {
      res.sendStatus(404);
    }
  });

  // --- API Externa v1 (Ingestão de Dados) ---
  app.post('/api/agents/advisor', requireAuth, async (req, res) => {
    try {
      const { campaignDataPrompt } = req.body;
      console.log("[Advisor] Solicitando análise para dados...");
      
      const aiResponse = await callChatGPT(campaignDataPrompt, "Você é um consultor político sênior. Forneça exatamente 3 dicas práticas baseadas nos dados fornecidos. Responda ESTRITAMENTE em formato JSON: { \"tips\": [{ \"title\": \"...\", \"message\": \"...\", \"type\": \"info\"|\"warning\"|\"success\" }] }");
      
      const rawText = aiResponse.text();
      console.log("[Advisor] Resposta bruta da IA:", rawText);

      try {
        const cleanData = JSON.parse(cleanJSON(rawText));
        res.json(cleanData);
      } catch (parseError) {
        console.error("[Advisor] Erro ao processar JSON da IA. Tentando recuperação básica.");
        // Fallback para caso a IA falhe no formato JSON mas mande texto útil
        res.json({
          tips: [
            { title: "Análise Estratégica", message: rawText.substring(0, 200) + "...", type: "info" },
            { title: "Dica de Campo", message: "Continue monitorando os bairros com maior rejeição para ações rápidas.", type: "warning" },
            { title: "Foco Digital", message: "Gere novos conteúdos baseados nas dores captadas hoje.", type: "success" }
          ]
        });
      }
    } catch (error: any) {
      console.error("[Advisor] Erro crítico no endpoint:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Relatório Executivo (generateExecutiveReport) ---
  app.post('/api/agents/report', requireAuth, async (req, res) => {
    try {
      const { campaignDataPrompt, campaignId } = req.body;
      console.log("[Report] Gerando relatório executivo para campanha:", campaignId);

      const aiResponse = await callChatGPT(
        campaignDataPrompt,
        "Você é um consultor político sênior especializado em análise de desempenho eleitoral. Gere um relatório executivo detalhado em português brasileiro, com seções: 1) Resumo Executivo, 2) Análise de Campo, 3) Oportunidades Estratégicas, 4) Riscos e Alertas, 5) Recomendações Prioritárias. Use formatação markdown clara."
      );

      const report = aiResponse.text();
      res.json({ report });
    } catch (error: any) {
      console.error("[Report] Erro:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Pipeline Automática (Analisar Agora) ---
  app.post('/api/agents/pipeline', requireAuth, async (req, res) => {
    try {
      const { campaignDataPrompt, campaignId } = req.body;
      console.log("[Pipeline] Iniciando análise profunda para campanha:", campaignId);
      
      const aiResponse = await callChatGPT(`Analise estes dados e gere uma estratégia completa. Você DEVE separar cada seção com o marcador '#' seguido do nome do agente (ex: # Estrategista, # Growth, # Social, # Field, # Creative):\n\n${campaignDataPrompt}`);
      const text = aiResponse.text();
      console.log("[Pipeline] Resposta bruta da IA:", text);
      
      if (!text || text.length < 50) {
          throw new Error("Resposta da IA muito curta ou vazia.");
      }

      // Separar por blocos de forma mais robusta
      const parts = text.split('#');
      const findPart = (keywords: string[]) => {
          const part = parts.find((p: any) => keywords.some(k => p.toLowerCase().includes(k.toLowerCase())));
          return part ? part.split('\n').slice(1).join('\n').trim() : '';
      };

      const result = {
        strategist: findPart(['Estrategista', 'Strategist']) || (parts[1] || text),
        growth: findPart(['Growth', 'Hacker']),
        social: findPart(['Social', 'Media']),
        field: findPart(['Field', 'Campo', 'Comandante']),
        creativeText: findPart(['Creative', 'Criativo', 'Produtor']),
      };

      console.log("[Pipeline] Blocos processados:", Object.keys(result).filter(k => (result as any)[k].length > 0));

      if (supabaseAdmin && campaignId) {
          // Garantimos que estamos enviando para as colunas corretas (camelCase)
          const { error } = await supabaseAdmin.from('agent_outputs').insert({
            campaign_id: campaignId,
            agent_type: 'war-room-pipeline',
            input: { description: 'Full automated analysis' },
            output: result,
            created_at: new Date().toISOString()
          });
          if (error) {
              console.error("[Pipeline] Erro ao salvar no banco:", error);
              // Se o erro for de coluna ausente (creativeText), significa que a tabela está no formato antigo (uma coluna por agente)
              // Nesse caso, tentamos salvar no formato antigo como fallback
              if (error.message?.includes('creativeText')) {
                  console.log("[Pipeline] Detectado esquema antigo. Tentando fallback...");
                  await supabaseAdmin.from('agent_outputs').insert({
                      campaign_id: campaignId,
                      agent_type: 'war-room-pipeline',
                      ...result,
                      created_at: new Date().toISOString()
                  });
              }
          }
      }

      res.json(result);
    } catch (error: any) {
      console.error("[Pipeline] Erro crítico:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Ordens de Produção (Passagem de Bola) ---
  app.post('/api/agents/production-order', requireAuth, async (req, res) => {
    try {
      const { campaignId, originAgent, targetAgent, content } = req.body;
      const { data, error } = await supabaseAdmin.from('production_orders').insert({
        campaign_id: campaignId, origin_agent: originAgent, target_agent: targetAgent, content: content, status: 'pending'
      }).select().single();
      if (error) throw error;
      res.json(data);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.get('/api/agents/production-orders', requireAuth, async (req, res) => {
    try {
      const { campaignId, targetAgent } = req.query;
      const { data } = await supabaseAdmin.from('production_orders')
        .select('*').eq('campaign_id', campaignId).eq('target_agent', targetAgent).eq('status', 'pending');
      res.json({ orders: data || [] });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- API EXTERNA V1 (Integração com Apps Terceiros) ---
  const validateApiKey = async (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'X-API-KEY ausente' });
    
    // Busca campanha pela API KEY
    const { data: campaign, error } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('api_key', apiKey)
      .single();

    if (error || !campaign) return res.status(403).json({ error: 'API KEY inválida' });
    req.campaignId = campaign.id;
    next();
  };

  app.post('/api/external/v1/voters', validateApiKey, async (req: any, res) => {
    try {
      const { name, phone, email, neighborhood, city, observations, birthDate, gps } = req.body;
      const { data, error } = await supabaseAdmin.from('contacts').insert({
        campaign_id: req.campaignId,
        name: name,
        phone: phone,
        email: email,
        neighborhood: neighborhood,
        city: city,
        ai_notes: observations,
        birth_date: birthDate,
        gps_coords: gps,
        created_at: new Date()
      }).select().single();
      if (error) throw error;
      res.status(201).json({ message: 'Eleitor importado com sucesso', id: data.id });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  app.post('/api/external/v1/visits', validateApiKey, async (req: any, res) => {
    try {
      const { contactId, notes, status, gps, duration } = req.body;
      const { data, error } = await supabaseAdmin.from('visits').insert({
        campaign_id: req.campaignId,
        leader_id: contactId, // Usando leader_id como fallback para associação de contato
        resp: 'Importado via API', // Campo obrigatório na tabela visits
        bairro: 'API', // Campo obrigatório na tabela visits
        apoiador: 'Sistema', // Campo obrigatório na tabela visits
        votos: 0,
        solicit: notes,
        realizada: status === 'realizada' ? 'sim' : 'nao',
        gps_coords: gps,
        duracao_segundos: duration,
        data: new Date().toISOString().split('T')[0],
        created_at: new Date()
      }).select().single();
      if (error) throw error;
      res.status(201).json({ message: 'Atendimento/Visita registrada via API', id: data.id });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
  });

  // --- Instagram Webhook ---
  // GET para verificação inicial do Meta
  app.get('/api/webhook/instagram', async (req, res) => {
    try {
      const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
      const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || 'campanha-pro-webhook';

      if (mode === 'subscribe' && token === verifyToken && challenge) {
        console.log('[Webhook] Instagram subscription verificada com sucesso');
        res.status(200).send(challenge);
      } else {
        console.warn('[Webhook] Verificação do Instagram falhou - token inválido');
        res.status(403).json({ error: 'Verification failed' });
      }
    } catch (error: any) {
      console.error('[Webhook] Erro na verificação:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST para receber engagements em tempo real
  app.post('/api/webhook/instagram', async (req, res) => {
    try {
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }

      const payload = req.body;
      const signature = req.headers['x-hub-signature-256'] as string;
      const webhookSecret = process.env.INSTAGRAM_WEBHOOK_SECRET;

      // Extrair campaignId do query param ou payload
      let campaignId = (req.query.campaignId as string) || payload.campaign_id;

      if (!campaignId) {
        console.warn('[Webhook] Nenhum campaignId fornecido');
        // Retornar 200 mesmo sem campaignId para o Meta não retentar
        return res.status(200).json({ message: 'Webhook received but no campaign context' });
      }

      // Importar o webhook service
      const { processInstagramWebhook } = await import('./src/services/webhookService');

      // Processar webhook
      const result = await processInstagramWebhook(
        payload,
        signature,
        webhookSecret || '',
        campaignId,
        supabaseAdmin
      );

      if (!result.success) {
        console.error('[Webhook] Falha ao processar:', result.errorMessage);
        // Ainda retorna 200 para o Meta não retentar
        return res.status(200).json({
          message: 'Webhook processed with errors',
          error: result.errorMessage,
        });
      }

      console.log(`[Webhook] ✓ Processado: ${result.processedCount} engagements, ${result.matchedCount} matches`);

      res.status(200).json({
        message: 'Webhook processed successfully',
        processedCount: result.processedCount,
        matchedCount: result.matchedCount,
      });
    } catch (error: any) {
      console.error('[Webhook] Erro crítico:', error);
      // Retorna 200 para evitar retry do Meta
      res.status(200).json({ error: error.message });
    }
  });

  // --- Social Token Management ---
  // Armazenar token após OAuth
  app.post('/api/social/token', requireAuth, async (req, res) => {
    try {
      const { campaignId, provider, accessToken, refreshToken, expiresIn } = req.body;

      if (!campaignId) {
        return res.status(400).json({ error: 'Missing campaignId' });
      }

      const tokenExpiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null;

      await pool.execute(
        `INSERT INTO social_tokens (id, campaign_id, provider, access_token, refresh_token, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
            access_token = VALUES(access_token),
            refresh_token = VALUES(refresh_token),
            expires_at = VALUES(expires_at),
            status = VALUES(status),
            updated_at = CURRENT_TIMESTAMP`,
        [
          crypto.randomUUID(),
          campaignId,
          provider,
          accessToken,
          refreshToken,
          tokenExpiresAt,
          'active'
        ]
      );

      res.json({
        message: 'Token salvo com sucesso',
        token: { provider },
      });
    } catch (error: any) {
      console.error('[Social Token] Erro:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verificar status da conexão social
  app.get('/api/social/status', requireAuth, async (req, res) => {
    try {
      const { campaignId, provider } = req.query;

      if (!campaignId) {
        return res.status(400).json({ error: 'Missing campaignId' });
      }

      const [tokens]: any = await pool.query(
        'SELECT status, expires_at FROM social_tokens WHERE campaign_id = ? AND provider = ?',
        [campaignId as string, (provider as string) || 'meta']
      );
      const data = tokens[0];

      if (!data) {
        return res.json({ connected: false });
      }

      const isExpired = data.expires_at && new Date(data.expires_at) < new Date();

      res.json({
        connected: data.status === 'active' && !isExpired,
        status: data.status,
        expiresAt: data.expires_at,
      });
    } catch (error: any) {
      console.error('[Social Status] Erro:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Global Error Handler]', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Erro interno no servidor', 
        details: err.message || 'Erro desconhecido',
        path: _req.path 
      });
    }
  });

  // Vite / Static Assets
  // Vite integration disabled to prevent conflicts with standalone Vite (npm run dev)
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
      console.log(`[Production] Servindo arquivos estáticos de: ${distPath}`);
      app.use(express.static(distPath));
      app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // Final step: Start listening
  httpServer.listen(port, '0.0.0.0', async () => {
    console.log(`[CRITICAL] Server listening on http://0.0.0.0:${port}`);
    try {
      const actualCampaignId = '455d21f3-f254-4b96-b49c-e70192c3fe27';
      await pool.execute(
        'UPDATE street_reports SET campaign_id = ? WHERE campaign_id = ? OR campaign_id IS NULL', 
        [actualCampaignId, 'demo']
      );
      
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS street_reports (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255),
          campaign_id VARCHAR(255),
          title VARCHAR(255),
          reclamacao TEXT,
          bairro VARCHAR(255),
          clima VARCHAR(100),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          media_urls JSON,
          video_url TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('[Database] System Tables Ready.');
    } catch (dbErr) {
      console.warn('[Database] Startup sync failed.');
    }
  });
}

startServer();