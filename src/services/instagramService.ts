/**
 * Instagram Service - Integração com Instagram Graph API
 * Gerencia handles, webhooks e engajamento
 */



/**
 * Normaliza um Instagram handle para o formato padrão
 * Remove @ e converte para minúsculas
 * @param handle - ex: "@JoaoDaSilva" ou "joaodasilva" ou "@joaodasilva"
 * @returns - ex: "joaodasilva"
 */
export const normalizeInstagramHandle = (handle: string): string => {
  if (!handle) return '';
  return handle
    .replace(/^@+/, '') // Remove @ do início
    .toLowerCase() // Minúsculas
    .trim(); // Remove espaços
};

/**
 * Valida se um handle é válido (formato Instagram)
 * Permite: letras, números, pontos, underscores (2-30 chars)
 */
export const isValidInstagramHandle = (handle: string): boolean => {
  const normalized = normalizeInstagramHandle(handle);
  const regex = /^[a-z0-9._]{2,30}$/;
  return regex.test(normalized);
};

/**
 * Calcula score de confiança do match entre engagement e contact
 * Usa múltiplos fatores: handle match, timing, histórico
 */
export const calculateMatchConfidence = (
  engagementHandle: string,
  contactHandle: string,
  _engagementTime: Date,
  _lastContactUpdate: Date | null
): number => {
  // 1. Match exato de handle = 100% confiança
  if (normalizeInstagramHandle(engagementHandle) === normalizeInstagramHandle(contactHandle)) {
    return 1.0;
  }

  // 2. Se não há match exato = 0% confiança (dados sensíveis)
  return 0;
};

/**
 * Formata resposta de webhook do Instagram
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
 * Interface para dados de engajamento normalizados
 */
export interface NormalizedEngagement {
  campaignId: string;
  instagramPostId: string;
  instagramCommentId: string;
  instagramHandle: string;
  instagramUserId: string;
  commentText?: string;
  engagementType: 'comment' | 'like' | 'reply';
  timestamp: Date;
  matchedLeadId?: string;
}

/**
 * Parser de webhook do Instagram
 * Extrai dados de comentários/likes do formato padrão do Meta
 */
export const parseInstagramWebhook = (payload: InstagramWebhookPayload): NormalizedEngagement[] => {
  const engagements: NormalizedEngagement[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === 'comments') {
        const value = change.value;
        if (value.from?.username) {
          engagements.push({
            campaignId: '', // Será preenchido depois
            instagramPostId: value.post?.id || value.media?.id || '',
            instagramCommentId: value.comment_text ? `comment_${Date.now()}` : '',
            instagramHandle: normalizeInstagramHandle(value.from.username),
            instagramUserId: value.from.id,
            commentText: value.comment_text,
            engagementType: 'comment',
            timestamp: new Date(),
          });
        }
      }

      if (change.field === 'likes') {
        const value = change.value;
        if (value.from?.username) {
          engagements.push({
            campaignId: '',
            instagramPostId: value.post?.id || value.media?.id || '',
            instagramCommentId: `like_${value.from.id}_${Date.now()}`,
            instagramHandle: normalizeInstagramHandle(value.from.username),
            instagramUserId: value.from.id,
            engagementType: 'like',
            timestamp: new Date(),
          });
        }
      }
    }
  }

  return engagements;
};

/**
 * Chama Instagram Graph API para buscar comentários de um post
 */
export const fetchInstagramPostComments = async (
  postId: string,
  accessToken: string
): Promise<NormalizedEngagement[]> => {
  try {
    const response = await fetch(
      `https://graph.instagram.com/${postId}/comments?fields=from{username,id},text&access_token=${accessToken}`
    );

    if (!response.ok) throw new Error(`Instagram API error: ${response.status}`);

    const data = await response.json();
    return (data.data || []).map((comment: any) => ({
      campaignId: '',
      instagramPostId: postId,
      instagramCommentId: comment.id,
      instagramHandle: normalizeInstagramHandle(comment.from.username),
      instagramUserId: comment.from.id,
      commentText: comment.text,
      engagementType: 'comment' as const,
      timestamp: new Date(),
    }));
  } catch (error) {
    console.error('[Instagram] Erro ao buscar comentários:', error);
    throw error;
  }
};

/**
 * Valida assinatura do webhook do Instagram
 * Usa HMAC-SHA256 para verificar autenticidade
 */
export const validateInstagramWebhookSignature = (
  body: string,
  signature: string,
  secret: string
): boolean => {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return hash === signature;
};

/**
 * Valida token do webhook do Instagram (GET request de verificação)
 */
export const validateInstagramWebhookToken = (
  token: string,
  verifyToken: string
): boolean => {
  return token === verifyToken;
};

/**
 * Gera URL do perfil do Instagram baseado no handle
 */
export const getInstagramProfileUrl = (handle: string): string => {
  const normalized = normalizeInstagramHandle(handle);
  return `https://instagram.com/${normalized}`;
};

/**
 * Extrai lista de @mentions de um texto
 */
export const extractMentions = (text: string): string[] => {
  if (!text) return [];
  const regex = /@([a-z0-9._]+)/gi;
  const matches = text.match(regex);
  return matches ? matches.map(m => normalizeInstagramHandle(m)) : [];
};

/**
 * Formata um engagement para exibição
 */
export const formatEngagementForDisplay = (engagement: NormalizedEngagement) => {
  return {
    ...engagement,
    instagramHandle: `@${engagement.instagramHandle}`,
    profileUrl: getInstagramProfileUrl(engagement.instagramHandle),
  };
};

