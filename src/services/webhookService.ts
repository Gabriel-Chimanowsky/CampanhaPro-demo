/**
 * Webhook Service - Processa webhooks do Instagram
 * Valida, normaliza, e persiste engagements
 */


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

interface WebhookProcessResult {
  success: boolean;
  processedCount: number;
  matchedCount: number;
  errorMessage?: string;
  engagements: InstagramEngagement[];
}

/**
 * Processa webhook do Instagram e salva no banco
 * Valida assinatura, extrai engagements, faz match com leads
 */
export const processInstagramWebhook = async (
  payload: InstagramWebhookPayload,
  signature: string | null,
  webhookSecret: string,
  campaignId: string,
  supabase: any
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

    // 3. Para cada engagement, fazer match com database
    for (const engagement of engagements) {
      engagement.campaignId = campaignId;

      // Buscar match de handle no banco
      const matchedLeadId = await findMatchedLead(
        supabase,
        campaignId,
        engagement.instagramHandle
      );

      if (matchedLeadId) {
        engagement.matchedLeadId = matchedLeadId;
        result.matchedCount++;
      }

      // Salvar no banco
      const { error } = await supabase
        .from('instagram_engagements')
        .insert([
          {
            campaignId,
            instagramHandle: engagement.instagramHandle,
            instagramUserId: engagement.instagramUserId,
            engagementType: engagement.engagementType,
            instagramPostId: engagement.instagramPostId,
            instagramCommentId: engagement.instagramCommentId,
            commentText: engagement.commentText,
            matchedLeadId,
            matchConfidence: matchedLeadId ? 1.0 : 0,
            webhookReceivedAt: new Date(),
          },
        ]);

      if (!error) {
        result.processedCount++;
        result.engagements.push(engagement);
      } else {
        console.error('[Webhook] Error inserting engagement:', error, engagement);
      }
    }

    // 4. Log do webhook
    await logWebhookProcessing(supabase, {
      campaignId,
      webhookId: `webhook_${Date.now()}`,
      event: payload.entry?.[0]?.changes?.[0]?.field || 'unknown',
      rawPayload: payload,
      status: 'processed',
      processedEngagements: result.processedCount,
      matchedLeads: result.matchedCount,
    });

    result.success = true;
    return result;
  } catch (error: any) {
    result.errorMessage = error.message;
    console.error('[Webhook] Error processing webhook:', error);

    // Log do erro
    await logWebhookProcessing(supabase, {
      campaignId,
      webhookId: `webhook_${Date.now()}`,
      event: 'error',
      rawPayload: payload,
      status: 'failed',
      errorMessage: error.message,
    });

    return result;
  }
};

/**
 * Busca lead que tem o instagram_handle correspondente
 */
async function findMatchedLead(
  supabase: any,
  campaignId: string,
  instagramHandle: string
): Promise<string | null> {
  try {
    const normalized = normalizeInstagramHandle(instagramHandle);

    const { data, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('instagram_handle', normalized)
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('[Webhook] Error finding matched lead:', error);
    return null;
  }
}

/**
 * Registra processamento de webhook no banco
 */
async function logWebhookProcessing(
  supabase: any,
  log: Partial<InstagramWebhookLog>
): Promise<void> {
  try {
    await supabase.from('instagram_webhook_logs').insert([log]);
  } catch (error) {
    console.error('[Webhook] Error logging webhook:', error);
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
    },
    matchedEngagements: 0,
    topHandles: new Map<string, number>(),
  };

  for (const engagement of engagements) {
    stats.byType[engagement.engagementType]++;

    if (engagement.matchedLeadId) {
      stats.matchedEngagements++;
    }

    const count = stats.topHandles.get(engagement.instagramHandle) || 0;
    stats.topHandles.set(engagement.instagramHandle, count + 1);
  }

  return stats;
};
