/**
 * Webhook Service - Processa webhooks do Instagram
 * Valida, normaliza, e persiste engagements usando MySQL
 */

import pool from '../lib/mysql';
import {
  normalizeInstagramHandle,
  parseInstagramWebhook,
  validateInstagramWebhookSignature,
  validateInstagramWebhookToken,
} from './instagramService';
import type {
  InstagramWebhookPayload,
  InstagramEngagement,
  InstagramWebhookLog,
} from '../types/instagram';
import crypto from 'crypto';

interface WebhookProcessResult {
  success: boolean;
  processedCount: number;
  matchedCount: number;
  errorMessage?: string;
  engagements: InstagramEngagement[];
}

/**
 * Processa webhook do Instagram e salva no banco MySQL
 * Valida assinatura, extrai engagements, faz match com leads
 */
export const processInstagramWebhook = async (
  payload: InstagramWebhookPayload,
  signature: string | null,
  webhookSecret: string,
  campaignId: string,
  _supabase: any // Mantido para compatibilidade de assinatura, mas não usado
): Promise<WebhookProcessResult> => {
  const result: WebhookProcessResult = {
    success: false,
    processedCount: 0,
    matchedCount: 0,
    engagements: [],
  };

  try {
    // 1. Validar assinatura HMAC (se houver)
    if (signature && webhookSecret) {
      const body = JSON.stringify(payload);
      const isValid = validateInstagramWebhookSignature(body, signature, webhookSecret);

      if (!isValid) {
        result.errorMessage = 'Invalid webhook signature';
        console.error('[Webhook] Invalid signature for campaign:', campaignId);
        return result;
      }
    }

    // 2. Parse dos engagements do webhook
    const engagements = parseInstagramWebhook(payload);

    if (engagements.length === 0) {
      result.success = true;
      result.processedCount = 0;
      return result;
    }

    // 3. Para cada engagement, fazer match com database MySQL
    for (const engagement of engagements) {
      engagement.campaignId = campaignId;

      // Buscar match de handle no banco MySQL
      const matchedLeadId = await findMatchedLead(campaignId, engagement.instagramHandle);

      if (matchedLeadId) {
        engagement.matchedLeadId = matchedLeadId;
        result.matchedCount++;
      }

      // Salvar no banco MySQL
      try {
        await pool.execute(
          `INSERT INTO instagram_engagements 
           (id, campaign_id, instagram_handle, instagram_user_id, engagement_type, instagram_post_id, instagram_comment_id, comment_text, matched_lead_id, match_confidence, webhook_received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            campaignId,
            engagement.instagramHandle,
            engagement.instagramUserId,
            engagement.engagementType,
            engagement.instagramPostId,
            engagement.instagramCommentId,
            engagement.commentText,
            matchedLeadId,
            matchedLeadId ? 1.0 : 0,
            new Date()
          ]
        );
        result.processedCount++;
        result.engagements.push(engagement);
      } catch (dbErr: any) {
        console.error('[Webhook] Error inserting engagement to MySQL:', dbErr.message);
      }
    }

    // 4. Log do webhook no MySQL
    await logWebhookProcessing({
      campaignId,
      webhookId: `webhook_${Date.now()}`,
      event: payload.entry?.[0]?.changes?.[0]?.field || 'unknown',
      rawPayload: JSON.stringify(payload),
      status: 'processed',
      processedEngagements: result.processedCount,
      matchedLeads: result.matchedCount,
    });

    result.success = true;
    return result;
  } catch (error: any) {
    result.errorMessage = error.message;
    console.error('[Webhook] Error processing webhook:', error);

    // Log do erro no MySQL
    await logWebhookProcessing({
      campaignId,
      webhookId: `webhook_${Date.now()}`,
      event: 'error',
      rawPayload: JSON.stringify(payload),
      status: 'failed',
      errorMessage: error.message,
    });

    return result;
  }
};

/**
 * Busca lead que tem o instagram_handle correspondente no MySQL
 */
async function findMatchedLead(
  campaignId: string,
  instagramHandle: string
): Promise<string | null> {
  try {
    const normalized = normalizeInstagramHandle(instagramHandle);
    const [rows]: any = await pool.query(
      'SELECT id FROM contacts WHERE campaign_id = ? AND instagram_handle = ? LIMIT 1',
      [campaignId, normalized]
    );

    if (!rows || rows.length === 0) return null;
    return rows[0].id;
  } catch (error) {
    console.error('[Webhook] Error finding matched lead in MySQL:', error);
    return null;
  }
}

/**
 * Registra processamento de webhook no banco MySQL
 */
async function logWebhookProcessing(
  log: Partial<InstagramWebhookLog> & { campaignId: string, webhookId: string }
): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO instagram_webhook_logs 
       (id, campaign_id, event, raw_payload, status, processed_engagements, matched_leads, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        log.campaignId,
        log.event,
        log.rawPayload,
        log.status,
        log.processedEngagements || 0,
        log.matchedLeads || 0,
        log.errorMessage || null
      ]
    );
  } catch (error) {
    console.error('[Webhook] Error logging webhook to MySQL:', error);
  }
}

/**
 * Valida e processa webhook GET (verificação inicial do Meta)
 */
export const handleWebhookVerification = (
  token: string | null,
  verifyToken: string,
  challenge: string | null
): { success: boolean; response?: string; error?: string } => {
  if (!token || !challenge) {
    return {
      success: false,
      error: 'Missing token or challenge parameter',
    };
  }

  if (!validateInstagramWebhookToken(token, verifyToken)) {
    return {
      success: false,
      error: 'Invalid verification token',
    };
  }

  return {
    success: true,
    response: challenge,
  };
};

/**
 * Calcula stats do engajamento para ranking
 */
export const calculateEngagementStats = (engagements: InstagramEngagement[]) => {
  const stats = {
    totalEngagements: engagements.length,
    byType: {
      comment: 0,
      like: 0,
      reply: 0,
      share: 0,
    } as Record<string, number>,
    matchedEngagements: 0,
    topHandles: new Map<string, number>(),
  };

  for (const engagement of engagements) {
    if (stats.byType[engagement.engagementType] !== undefined) {
      stats.byType[engagement.engagementType]++;
    }

    if (engagement.matchedLeadId) {
      stats.matchedEngagements++;
    }

    const count = stats.topHandles.get(engagement.instagramHandle) || 0;
    stats.topHandles.set(engagement.instagramHandle, count + 1);
  }

  return stats;
};
