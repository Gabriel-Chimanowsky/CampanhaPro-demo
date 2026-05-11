import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { createServer as createHttpServer } from 'http';
import { createAuthMiddleware } from './src/middleware/authMiddleware';
import { getConversionFunnelStats, getTerritorialAlerts } from './src/services/intelligenceService';
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração centralizada
const AI_MODEL = "gpt-4o-mini"; 
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
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

const requireAuth = createAuthMiddleware(supabaseAdmin);

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
  const app = express();
  const httpServer = createHttpServer(app);
  const port = Number(process.env.PORT) || 3001;
  console.log(`[System] Inicializando CampanhaPro v1.0.3...`);
  console.log(`[Env] Modo: ${process.env.NODE_ENV || 'development'}`);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());
  
  // Middleware de diagnóstico de versão
  app.use((_req, res, next) => {
      res.setHeader('X-App-Version', '1.0.3');
      next();
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // --- Campanhas ---
  app.get('/api/campaigns', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }

      // Get user's campaign
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('campaignId')
        .eq('id', userId)
        .single();

      if (userError || !userData?.campaignId) {
        return res.status(404).json({ error: 'No campaign found for user' });
      }

      // Get campaign config
      const { data: campaignData, error: campaignError } = await supabaseAdmin
        .from('campaign_configs')
        .select('*')
        .eq('id', userData.campaignId)
        .single();

      if (campaignError || !campaignData) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json({
        id: userData.campaignId,
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
      if (!supabaseAdmin) {
        return res.status(503).json({ error: 'Database service unavailable' });
      }

      const { data, error } = await supabaseAdmin
        .from('campaign_configs')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error || !data) {
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
                insight_text: `Análise de Funil solicitada: ${stats.map(s => `${s.stage}: ${s.count}`).join(', ')}`,
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

  app.get('/api/agents/history/:agentId', requireAuth, async (req: Request, res: Response) => {
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

  app.post('/api/agents/generate-image', requireAuth, async (req: Request, res: Response) => {
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

      if (!supabaseAdmin || !campaignId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tokenExpiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null;

      const { data, error } = await supabaseAdmin
        .from('social_tokens')
        .upsert({
          campaignId,
          provider,
          accessToken,
          refreshToken,
          tokenExpiresAt,
          status: 'active',
          lastRefreshedAt: new Date(),
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        message: 'Token salvo com sucesso',
        token: { id: data.id, provider: data.provider },
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

      if (!supabaseAdmin || !campaignId) {
        return res.status(400).json({ error: 'Missing campaignId' });
      }

      const { data, error } = await supabaseAdmin
        .from('social_tokens')
        .select('status, tokenExpiresAt')
        .eq('campaignId', campaignId)
        .eq('provider', provider || 'meta')
        .single();

      if (error || !data) {
        return res.json({ connected: false });
      }

      const isExpired = data.tokenExpiresAt && new Date(data.tokenExpiresAt) < new Date();

      res.json({
        connected: data.status === 'active' && !isExpired,
        status: data.status,
        expiresAt: data.tokenExpiresAt,
      });
    } catch (error: any) {
      console.error('[Social Status] Erro:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite / Static Assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true, hmr: { server: httpServer } }, appType: 'custom' });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.includes('.')) return next();
      let template = await fsPromises.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
        console.log(`[Production] Servindo arquivos estáticos de: ${distPath}`);
        app.use(express.static(distPath));
        app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    } else {
        console.error(`[CRÍTICO] Pasta de build não encontrada: ${distPath}`);
    }
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando em todas as interfaces na porta ${port}`);
  });
}

startServer();