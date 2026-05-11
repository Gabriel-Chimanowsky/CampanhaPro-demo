-- =============================================
-- PARTE 26: Instagram Engagement System
-- Adiciona capacidades de engajamento via Instagram Graph API
-- =============================================

-- 1. Adicionar coluna de instagram_handle ao tabela de contactos/leads
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_instagram_handle ON contacts("instagramHandle");
COMMENT ON COLUMN contacts."instagramHandle" IS 'Handle do Instagram (formato normalizado: sem @ e minúsculo)';

-- 2. Adicionar coluna de instagram_handle à tabela visits (para rastreamento)
ALTER TABLE visits ADD COLUMN IF NOT EXISTS "instagramEngagementId" UUID;
COMMENT ON COLUMN visits."instagramEngagementId" IS 'Referência ao engagement do Instagram (comentário/like)';

-- 3. Nova tabela: Instagram Engagements (comentários, likes, etc via webhook)
CREATE TABLE IF NOT EXISTS instagram_engagements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "instagramPostId" TEXT NOT NULL,
    "instagramCommentId" TEXT NOT NULL,
    "instagramHandle" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "commentText" TEXT,
    "engagementType" TEXT CHECK ("engagementType" IN ('comment', 'like', 'reply')) DEFAULT 'comment',
    "matchedContactId" UUID REFERENCES contacts(id),
    "matchConfidence" DECIMAL(3,2), -- 0.0 a 1.0 (100% de certeza)
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_engagements_campaign ON instagram_engagements("campaignId");
CREATE INDEX IF NOT EXISTS idx_instagram_engagements_handle ON instagram_engagements("instagramHandle");
CREATE INDEX IF NOT EXISTS idx_instagram_engagements_matched ON instagram_engagements("matchedContactId");

-- 4. Nova tabela: Instagram Campaign Settings (config por campanha)
CREATE TABLE IF NOT EXISTS instagram_campaign_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "campaignId" TEXT NOT NULL UNIQUE,
    "instagramBusinessAccountId" TEXT,
    "instagramAccessToken" TEXT, -- Encrypted em produção!
    "webhookSecret" TEXT, -- Para validar requisições do webhook
    "isActive" BOOLEAN DEFAULT TRUE,
    "lastWebhookCheck" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_settings_campaign ON instagram_campaign_settings("campaignId");

-- 5. Tabela de ranking de engajamento (desnormalizada para performance)
CREATE TABLE IF NOT EXISTS engagement_rankings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "leaderId" UUID REFERENCES users(id),
    "leaderName" TEXT,
    "engagementCount" INTEGER DEFAULT 0,
    "commentsCount" INTEGER DEFAULT 0,
    "uniqueFollowersEngaged" INTEGER DEFAULT 0,
    "engagementScore" DECIMAL(10,2) DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE("campaignId", "periodStart", "periodEnd", "leaderId")
);

CREATE INDEX IF NOT EXISTS idx_engagement_rankings_campaign_period ON engagement_rankings("campaignId", "periodStart", "periodEnd");

-- 6. RLS Policy: Usuários só veem engagements de sua própria campanha
ALTER TABLE instagram_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagement_campaign_isolation" ON instagram_engagements
    USING (
        "campaignId" IN (
            SELECT "campaignId" FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "settings_campaign_isolation" ON instagram_campaign_settings
    USING (
        "campaignId" IN (
            SELECT "campaignId" FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "rankings_campaign_isolation" ON engagement_rankings
    USING (
        "campaignId" IN (
            SELECT "campaignId" FROM users WHERE id = auth.uid()
        )
    );
