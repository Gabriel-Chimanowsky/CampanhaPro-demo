/**
 * Engagement Matching Service
 * Cruza dados de engajamento do Instagram com leads do banco
 */

import { calculateMatchConfidence, normalizeInstagramHandle } from './instagramService';

export interface EngagementMatch {
  engagementId: string;
  contactId: string;
  instagramHandle: string;
  contactName: string;
  matchConfidence: number;
  engagementType: 'comment' | 'like' | 'reply';
  engagementTime: Date;
}

/**
 * Busca o contact que corresponde a um Instagram handle
 * Usa match exato de handle normalizado
 */
export const findContactByInstagramHandle = async (
  supabaseAdmin: any,
  campaignId: string,
  instagramHandle: string
): Promise<any | null> => {
  if (!supabaseAdmin) return null;

  try {
    const normalized = normalizeInstagramHandle(instagramHandle);
    
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('id, name, email, phone, instagramHandle')
      .eq('campaignId', campaignId)
      .eq('instagramHandle', normalized)
      .single();

    if (error?.code === 'PGRST116') return null; // Not found
    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[Matching] Erro ao buscar contato:', error);
    return null;
  }
};

/**
 * Processa um engagement do Instagram e faz match automático
 */
export const matchInstagramEngagement = async (
  supabaseAdmin: any,
  campaignId: string,
  engagement: {
    instagramPostId: string;
    instagramCommentId: string;
    instagramHandle: string;
    instagramUserId: string;
    commentText?: string;
    engagementType: 'comment' | 'like' | 'reply';
  }
): Promise<EngagementMatch | null> => {
  try {
    // 1. Normalizar handle
    const normalized = normalizeInstagramHandle(engagement.instagramHandle);

    // 2. Buscar contact correspondente
    const contact = await findContactByInstagramHandle(supabaseAdmin, campaignId, normalized);

    if (!contact) {
      console.log(`[Matching] Nenhum contato encontrado para @${normalized}`);
      return null;
    }

    // 3. Calcular confiança do match
    const matchConfidence = calculateMatchConfidence(
      normalized,
      contact.instagramHandle,
      new Date(),
      new Date(contact.updated_at)
    );

    if (matchConfidence < 0.5) {
      console.log(`[Matching] Match confidence baixa (${matchConfidence}) para @${normalized}`);
      return null;
    }

    // 4. Salvar engagement no banco
    const { data: savedEngagement, error: saveError } = await supabaseAdmin
      .from('instagram_engagements')
      .insert({
        campaignId,
        instagramPostId: engagement.instagramPostId,
        instagramCommentId: engagement.instagramCommentId,
        instagramHandle: normalized,
        instagramUserId: engagement.instagramUserId,
        commentText: engagement.commentText,
        engagementType: engagement.engagementType,
        matchedContactId: contact.id,
        matchConfidence,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Matching] Erro ao salvar engagement:', saveError);
      throw saveError;
    }

    console.log(`[Matching] ✓ Match bem-sucedido: @${normalized} → ${contact.name}`);

    return {
      engagementId: savedEngagement.id,
      contactId: contact.id,
      instagramHandle: normalized,
      contactName: contact.name,
      matchConfidence,
      engagementType: engagement.engagementType,
      engagementTime: new Date(),
    };
  } catch (error) {
    console.error('[Matching] Erro crítico:', error);
    return null;
  }
};

/**
 * Processa múltiplos engagements em batch
 */
export const matchEngagementsBatch = async (
  supabaseAdmin: any,
  campaignId: string,
  engagements: any[]
): Promise<EngagementMatch[]> => {
  const matches: EngagementMatch[] = [];

  for (const engagement of engagements) {
    const match = await matchInstagramEngagement(supabaseAdmin, campaignId, engagement);
    if (match) matches.push(match);
  }

  return matches;
};

/**
 * Gera ranking de engajamento por período
 */
export const generateEngagementRanking = async (
  supabaseAdmin: any,
  campaignId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<any[]> => {
  try {
    if (!supabaseAdmin) return [];

    // 1. Agrupar engagements por contato dentro do período
    const { data: engagements, error } = await supabaseAdmin
      .from('instagram_engagements')
      .select(
        `
        id,
        matchedContactId,
        engagementType,
        createdAt,
        contacts!inner(id, name, team_members!inner(id, name))
      `
      )
      .eq('campaignId', campaignId)
      .gte('createdAt', periodStart.toISOString())
      .lte('createdAt', periodEnd.toISOString())
      .not('matchedContactId', 'is', null);

    if (error) throw error;

    // 2. Agrupar por leader
    const rankingMap = new Map();

    for (const eng of engagements || []) {
      const contact = eng.contacts;
      if (!contact) continue;

      const leaderId = contact.team_members?.id || contact.id;
      const leaderName = contact.team_members?.name || contact.name;

      if (!rankingMap.has(leaderId)) {
        rankingMap.set(leaderId, {
          leaderId,
          leaderName,
          engagementCount: 0,
          commentsCount: 0,
          uniqueFollowersEngaged: new Set(),
        });
      }

      const entry = rankingMap.get(leaderId);
      entry.engagementCount++;
      if (eng.engagementType === 'comment') entry.commentsCount++;
    }

    // 3. Calcular scores e ordenar
    const ranking = Array.from(rankingMap.values())
      .map((entry: any, index: number) => ({
        ...entry,
        uniqueFollowersEngaged: entry.uniqueFollowersEngaged.size,
        engagementScore: (entry.engagementCount * 2 + entry.commentsCount * 3).toFixed(2),
        rank: index + 1,
      }))
      .sort((a: any, b: any) => parseFloat(b.engagementScore) - parseFloat(a.engagementScore));

    return ranking;
  } catch (error) {
    console.error('[Ranking] Erro ao gerar ranking:', error);
    return [];
  }
};

/**
 * Calcula métricas de engajamento para um período
 */
export const getEngagementMetrics = async (
  supabaseAdmin: any,
  campaignId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  totalEngagements: number;
  totalComments: number;
  totalLikes: number;
  uniqueFollowers: number;
  avgEngagementPerLeader: number;
  topPerformers: any[];
}> => {
  try {
    const { data: engagements } = await supabaseAdmin
      .from('instagram_engagements')
      .select('*')
      .eq('campaignId', campaignId)
      .gte('createdAt', periodStart.toISOString())
      .lte('createdAt', periodEnd.toISOString());

    const totalEngagements = engagements?.length || 0;
    const totalComments = engagements?.filter((e: any) => e.engagementType === 'comment').length || 0;
    const totalLikes = engagements?.filter((e: any) => e.engagementType === 'like').length || 0;
    const uniqueFollowers = new Set(engagements?.map((e: any) => e.instagramUserId)).size;

    const ranking = await generateEngagementRanking(supabaseAdmin, campaignId, periodStart, periodEnd);

    return {
      totalEngagements,
      totalComments,
      totalLikes,
      uniqueFollowers,
      avgEngagementPerLeader: ranking.length > 0 ? totalEngagements / ranking.length : 0,
      topPerformers: ranking.slice(0, 5),
    };
  } catch (error) {
    console.error('[Metrics] Erro ao calcular métricas:', error);
    return {
      totalEngagements: 0,
      totalComments: 0,
      totalLikes: 0,
      uniqueFollowers: 0,
      avgEngagementPerLeader: 0,
      topPerformers: [],
    };
  }
};

/**
 * Calcula ranking de engajamento por handle
 * Agrupa engagements por instagram_handle e conta
 */
export const calculateEngagementRanking = (engagements: any[], limit: number = 50): any[] => {
  const rankingMap = new Map<string, {
    count: number;
    lastComment?: string;
    lastTimestamp: Date;
    matchedLeadName?: string;
    matchedLeadId?: string;
  }>();

  for (const engagement of engagements) {
    const handle = engagement.instagramHandle;
    const existing = rankingMap.get(handle) || { count: 0, lastTimestamp: new Date(0) };
    existing.count++;
    existing.matchedLeadId = engagement.matchedLeadId;

    if (engagement.commentText && (!existing.lastComment || 
        (engagement.createdAt && new Date(engagement.createdAt) > existing.lastTimestamp))) {
      existing.lastComment = engagement.commentText;
    }

    if (engagement.createdAt) {
      const engagementDate = new Date(engagement.createdAt);
      if (engagementDate > existing.lastTimestamp) {
        existing.lastTimestamp = engagementDate;
      }
    }

    rankingMap.set(handle, existing);
  }

  return Array.from(rankingMap.entries())
    .map(([handle, data], index) => ({
      rank: index + 1,
      instagramHandle: handle,
      engagementCount: data.count,
      lastEngagementAt: data.lastTimestamp,
      lastCommentText: data.lastComment,
      matchedLeadName: data.matchedLeadName,
      matchedLeadId: data.matchedLeadId,
    }))
    .sort((a, b) => b.engagementCount - a.engagementCount)
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
};

/**
 * Encontra engajadores que NÃO foram matchados com leads
 */
export const getUnmatchedEngagers = (engagements: any[], limit: number = 20): any[] => {
  const unmatchedMap = new Map<string, number>();

  for (const engagement of engagements) {
    if (!engagement.matchedLeadId) {
      const count = unmatchedMap.get(engagement.instagramHandle) || 0;
      unmatchedMap.set(engagement.instagramHandle, count + 1);
    }
  }

  return Array.from(unmatchedMap.entries())
    .map(([handle, count]) => ({ handle, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Calcula taxa de matching
 */
export const calculateMatchingRate = (engagements: any[]): number => {
  if (engagements.length === 0) return 0;
  const matched = engagements.filter(e => e.matchedLeadId).length;
  return (matched / engagements.length) * 100;
};
