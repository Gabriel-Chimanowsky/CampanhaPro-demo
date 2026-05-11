/**
 * Tipos e interfaces para integração Instagram
 */

/**
 * Tipo de engajamento no Instagram
 */
export type InstagramEngagementType = 'comment' | 'like' | 'reply' | 'share';

/**
 * Status de um token de integração social
 */
export type SocialTokenStatus = 'active' | 'revoked' | 'expired';

/**
 * Provider de rede social
 */
export type SocialProvider = 'meta' | 'instagram' | 'facebook';

/**
 * Engajamento do Instagram normalizado
 * Representa um comentário, like, etc que foi recebido via webhook
 */
export interface InstagramEngagement {
    id?: string;
    campaignId: string;
    instagramHandle: string;
    instagramUserId: string;
    engagementType: InstagramEngagementType;
    instagramPostId: string;
    instagramCommentId?: string;
    commentText?: string;
    matchedLeadId?: string;
    matchConfidence?: number; // 0-1
    webhookReceivedAt?: Date;
    createdAt?: Date;
}

/**
 * Resultado de engajamento no ranking
 */
export interface RankingResult {
    rank: number;
    instagramHandle: string;
    engagementCount: number;
    lastEngagementAt: Date;
    lastCommentText?: string;
    matchedLeadName?: string;
    matchedLeadId?: string;
}

/**
 * Token de integração com rede social
 */
export interface SocialToken {
    id?: string;
    campaignId: string;
    provider: SocialProvider;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    userId?: string;
    accountName?: string;
    status: SocialTokenStatus;
    lastRefreshedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Log de webhook recebido
 */
export interface InstagramWebhookLog {
    id?: string;
    campaignId?: string;
    webhookId: string;
    event: string; // 'comments', 'likes', etc
    rawPayload: Record<string, any>;
    status: 'success' | 'failed' | 'processed';
    errorMessage?: string;
    processedEngagements?: number;
    matchedLeads?: number;
    receivedAt?: Date;
    createdAt?: Date;
}

/**
 * Payload de webhook do Instagram (formato Meta)
 */
export interface InstagramWebhookPayload {
    entry: Array<{
        id: string; // Page ID
        messaging?: Array<{
            sender: { id: string };
            message: { text: string };
            postback?: { title: string; payload: string };
        }>;
        changes?: Array<{
            field: string; // 'comments', 'likes'
            value: {
                from: { username: string; id: string };
                comment_text?: string;
                object: string;
                media?: { id: string };
                post?: { id: string };
            };
        }>;
    }>;
}

/**
 * Response do ranking
 */
export interface InstagramRankingResponse {
    ranking: RankingResult[];
    totalEngagements: number;
    period?: string;
}
