-- =============================================
-- MIGRAÇÃO: Integração Instagram com CampanhaPro
-- Adiciona suporte a instagram_handle e engagements em tempo real
-- =============================================

-- =============================================
-- 1. ADICIONAR COLUNA EM TEAM_MEMBERS
-- =============================================

ALTER TABLE IF EXISTS team_members 
ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;

-- Índice para busca rápida de handle (não é UNIQUE porque nem todos vão ter)
CREATE INDEX IF NOT EXISTS idx_team_members_instagram_handle 
ON team_members("instagramHandle");

-- Índice composto para busca por campanha + handle
CREATE INDEX IF NOT EXISTS idx_team_members_campaign_instagram 
ON team_members("campaignId", "instagramHandle");

-- =============================================
-- 2. NOVA TABELA: INSTAGRAM_ENGAGEMENTS
-- Armazena comentários/likes em tempo real do webhook
-- =============================================

CREATE TABLE IF NOT EXISTS instagram_engagements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "engagementType" TEXT CHECK ("engagementType" IN ('comment', 'like', 'reply', 'share')) NOT NULL,
    "instagramPostId" TEXT NOT NULL,
    "instagramCommentId" TEXT,
    "commentText" TEXT,
    "matchedLeadId" UUID REFERENCES team_members(id) ON DELETE SET NULL,
    "matchConfidence" DECIMAL(3,2) DEFAULT 0,
    "webhookReceivedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_instagram_engagements_campaign 
ON instagram_engagements("campaignId");

CREATE INDEX IF NOT EXISTS idx_instagram_engagements_handle 
ON instagram_engagements("instagramHandle");

CREATE INDEX IF NOT EXISTS idx_instagram_engagements_timestamp 
ON instagram_engagements("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_engagements_matched_lead 
ON instagram_engagements("matchedLeadId");

-- Índice composto para ranking rápido
CREATE INDEX IF NOT EXISTS idx_instagram_engagements_ranking 
ON instagram_engagements("campaignId", "instagramHandle", "createdAt" DESC);

-- Enable RLS
ALTER TABLE instagram_engagements ENABLE ROW LEVEL SECURITY;

-- RLS Policy para instagram_engagements
DROP POLICY IF EXISTS "instagram_engagements_select" ON instagram_engagements;
DROP POLICY IF EXISTS "instagram_engagements_insert" ON instagram_engagements;

CREATE POLICY "instagram_engagements_select" ON instagram_engagements 
FOR SELECT USING ("campaignId" = get_user_campaign_id() OR is_supreme_admin());

CREATE POLICY "instagram_engagements_insert" ON instagram_engagements 
FOR INSERT WITH CHECK (true); -- Webhook server insere via service_role

-- =============================================
-- 3. NOVA TABELA: INSTAGRAM_WEBHOOK_LOGS
-- Logs de webhooks recebidos para auditoria
-- =============================================

CREATE TABLE IF NOT EXISTS instagram_webhook_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "campaignId" TEXT,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL, -- 'comments', 'likes', etc
    "rawPayload" JSONB NOT NULL,
    "status" TEXT CHECK ("status" IN ('success', 'failed', 'processed')) DEFAULT 'processed',
    "errorMessage" TEXT,
    "processedEngagements" INTEGER DEFAULT 0,
    "matchedLeads" INTEGER DEFAULT 0,
    "receivedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_webhook_logs_campaign 
ON instagram_webhook_logs("campaignId");

CREATE INDEX IF NOT EXISTS idx_instagram_webhook_logs_timestamp 
ON instagram_webhook_logs("createdAt" DESC);

ALTER TABLE instagram_webhook_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. NOVA TABELA: SOCIAL_TOKENS
-- Armazena access tokens e refresh tokens das integrações
-- =============================================

CREATE TABLE IF NOT EXISTS social_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "provider" TEXT NOT NULL CHECK ("provider" IN ('meta', 'instagram', 'facebook')),
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP WITH TIME ZONE,
    "userId" TEXT, -- ID do usuário no provider
    "accountName" TEXT, -- Nome da conta (ex: nome da página)
    "status" TEXT CHECK ("status" IN ('active', 'revoked', 'expired')) DEFAULT 'active',
    "lastRefreshedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("campaignId", "provider", "userId")
);

CREATE INDEX IF NOT EXISTS idx_social_tokens_campaign_provider 
ON social_tokens("campaignId", "provider");

CREATE INDEX IF NOT EXISTS idx_social_tokens_expires_at 
ON social_tokens("tokenExpiresAt");

ALTER TABLE social_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: Apenas usuários da campanha ou supreme admin podem ver seus próprios tokens
DROP POLICY IF EXISTS "social_tokens_select" ON social_tokens;
DROP POLICY IF EXISTS "social_tokens_insert" ON social_tokens;

CREATE POLICY "social_tokens_select" ON social_tokens 
FOR SELECT USING ("campaignId" = get_user_campaign_id() OR is_supreme_admin());

CREATE POLICY "social_tokens_insert" ON social_tokens 
FOR INSERT WITH CHECK ("campaignId" = get_user_campaign_id() OR is_supreme_admin());

-- =============================================
-- 5. ATUALIZAR TEAM_MEMBERS RLS PARA INCLUIR INSTAGRAM
-- =============================================

-- Trigger para atualizar updatedAt em social_tokens
DROP TRIGGER IF EXISTS set_updated_at_social_tokens ON social_tokens;
CREATE TRIGGER set_updated_at_social_tokens BEFORE UPDATE ON social_tokens 
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 6. HELPER FUNCTION: Normalizar Instagram Handle
-- =============================================

CREATE OR REPLACE FUNCTION normalize_instagram_handle(handle TEXT)
RETURNS TEXT AS $$
BEGIN
  IF handle IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN LOWER(TRIM(REGEXP_REPLACE(handle, '^@+', '')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- 7. HELPER FUNCTION: Get Ranking por Campanha
-- =============================================

CREATE OR REPLACE FUNCTION get_instagram_ranking(
  p_campaign_id TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  "rank" BIGINT,
  "instagramHandle" TEXT,
  "engagementCount" BIGINT,
  "lastEngagementAt" TIMESTAMP WITH TIME ZONE,
  "lastCommentText" TEXT,
  "matchedLeadName" TEXT,
  "matchedLeadId" UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC),
    ie."instagramHandle",
    COUNT(*)::BIGINT,
    MAX(ie."createdAt"),
    (ARRAY_AGG(ie."commentText" ORDER BY ie."createdAt" DESC))[1],
    tm.name,
    ie."matchedLeadId"
  FROM instagram_engagements ie
  LEFT JOIN team_members tm ON ie."matchedLeadId" = tm.id
  WHERE ie."campaignId" = p_campaign_id
  GROUP BY ie."instagramHandle", ie."matchedLeadId", tm.name
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- 8. HELPER FUNCTION: Match Handle com Lead
-- Busca o líder correspondente a um instagram_handle
-- =============================================

CREATE OR REPLACE FUNCTION match_instagram_handle_to_lead(
  p_campaign_id TEXT,
  p_instagram_handle TEXT
)
RETURNS UUID AS $$
BEGIN
  -- Normaliza o handle e busca match exato
  RETURN (
    SELECT id FROM team_members
    WHERE "campaignId" = p_campaign_id
    AND "instagramHandle" = normalize_instagram_handle(p_instagram_handle)
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================
-- COMENTÁRIO DE IMPLEMENTAÇÃO
-- =============================================

/*
  PRÓXIMOS PASSOS APÓS MIGRAÇÃO:

  1. Backend (server.ts):
     - Adicionar POST /api/webhook/instagram
     - Implementar validateInstagramWebhookSignature()
     - Implementar processamento de engagements
     - Armazenar em instagram_engagements com match automático

  2. Frontend (types.ts):
     - Adicionar instagramHandle?: string ao TeamMember interface

  3. Frontend (Components):
     - Adicionar campo de input para instagramHandle no Team Form
     - Validação com regex: /^[a-z0-9._]{2,30}$/

  4. Edge Function:
     - Usar get_instagram_ranking() para calcular ranking
     - Retornar com matchedLeadName pre-preenchido

  5. Testes:
     - Testar webhook signature validation
     - Testar normalizeInstagramHandle()
     - Testar match_instagram_handle_to_lead()
*/
