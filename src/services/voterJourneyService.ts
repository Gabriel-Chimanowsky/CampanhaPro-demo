import { supabase } from '../lib/supabaseClient';

export type VoterStage = 
  | 'capturado' 
  | 'validado' 
  | 'interessado' 
  | 'apoiador_confirmado' 
  | 'multiplicador' 
  | 'descadastrado' 
  | 'risco_rejeicao';

interface VoterJourneyData {
  contact: any;
  interactions: any[];
  visits: any[];
  pesquisas: any[];
}

/**
 * Calcula o estágio atual do eleitor baseado em regras auditáveis.
 */
export function calculateVoterStage(data: VoterJourneyData): VoterStage {
  const { contact, interactions, visits, pesquisas } = data;

  // 1. Regras de saída/rejeição (Prioridade máxima)
  if (contact.classification === 'Rejeição' || pesquisas.some(p => p.intencaoVoto === 'outro')) {
    return 'risco_rejeicao';
  }

  // 2. Regra de multiplicador (Trouxe novos contatos - simulado por tag ou contagem)
  const isMultiplier = contact.classification === 'Multiplicador' || (contact.tags && contact.tags.includes('Multiplicador'));
  if (isMultiplier) return 'multiplicador';

  // 3. Regra de apoiador confirmado
  const isSupporter = contact.classification === 'Apoiador' || pesquisas.some(p => p.intencaoVoto === 'candidato') || visits.some(v => v.votos > 0);
  if (isSupporter) return 'apoiador_confirmado';

  // 4. Regra de interessado (Interagiu 2+ vezes)
  if (interactions.length >= 2 || visits.length >= 1) {
    return 'interessado';
  }

  // 5. Regra de validado (Telefone e Bairro presentes)
  if (contact.phone && contact.neighborhood && contact.neighborhood !== 'Não Informado') {
    return 'validado';
  }

  // 6. Estágio inicial
  return 'capturado';
}

/**
 * Recomenda a Próxima Melhor Ação (NBA) baseada no estágio e dados.
 */
export function calculateNextBestAction(stage: VoterStage, _trustScore: number) {
  switch (stage) {
    case 'capturado':
      return {
        action: 'Validar Cadastro',
        reason: 'Eleitor recém capturado. Necessário confirmar bairro e telefone para segmentação.'
      };
    case 'validado':
      return {
        action: 'Enviar Convite de Boas-vindas',
        reason: 'Cadastro completo. Iniciar relacionamento via WhatsApp com pauta de interesse.'
      };
    case 'interessado':
      return {
        action: 'Convidar para Reunião/Evento',
        reason: 'Eleitor engajado. Momento de estreitar laços físicos ou em live.'
      };
    case 'apoiador_confirmado':
      return {
        action: 'Desafio de Multiplicação',
        reason: 'Apoio garantido. Pedir indicação de 3 amigos ou familiares.'
      };
    case 'multiplicador':
      return {
        action: 'Manutenção de Liderança',
        reason: 'Liderança ativa. Enviar material exclusivo e agradecer mobilização.'
      };
    case 'risco_rejeicao':
      return {
        action: 'Monitoramento Passivo',
        reason: 'Eleitor com tendência de rejeição. Evitar contato direto invasivo.'
      };
    default:
      return {
        action: 'Escuta Ativa',
        reason: 'Manter fluxo de comunicação para entender necessidades.'
      };
  }
}

// --- JOURNEY SYNC ---
export const updateVoterJourney = async (contactId: string, campaignId: string) => {
    try {
        const { data: contact } = await supabase.from('contacts').select('*').eq('id', contactId).single();
        if (!contact) return;
        
        const { data: interactions } = await supabase.from('contact_interactions').select('*').eq('contact_id', contactId);
        const { data: visits } = await supabase.from('visits').select('*').eq('voter_id', contactId);
        const { data: pesquisas } = await supabase.from('pesquisas').select('*').eq('campaign_id', campaignId); // Melhorar filtro no futuro
        
        const currentStage = calculateVoterStage({ contact, interactions: interactions || [], visits: visits || [], pesquisas: pesquisas || [] });
        const nba = calculateNextBestAction(currentStage, 0);
        
        const { data: existingJourney } = await supabase.from('voter_journey').select('current_stage').eq('contact_id', contactId).maybeSingle();
        
        const journeyUpdate = {
            campaign_id: campaignId,
            contact_id: contactId,
            current_stage: currentStage,
            next_best_action: nba.action,
            next_action_reason: nba.reason,
            updated_at: new Date().toISOString()
        };

        if (existingJourney) {
            await supabase.from('voter_journey').update(journeyUpdate).eq('contact_id', contactId);
        } else {
            await supabase.from('voter_journey').insert(journeyUpdate);
        }
        return currentStage;
    } catch (e) { console.error(e); }
};

/**
 * Sincroniza em massa contatos que não têm jornada iniciada.
 */
export async function syncVoterJourneys(campaignId: string) {
  try {
    // 1. Pegar todos os contatos que NÃO estão na voter_journey
    const { data: contactsWithoutJourney, error } = await supabase
      .from('contacts')
      .select('id')
      .eq('campaign_id', campaignId);

    if (error || !contactsWithoutJourney) return;

    const { data: existingJourneys } = await supabase
      .from('voter_journey')
      .select('contact_id')
      .eq('campaign_id', campaignId);

    const existingIds = new Set(existingJourneys?.map((j: any) => j.contact_id) || []);
    const missingIds = contactsWithoutJourney.filter((c: any) => !existingIds.has(c.id)).map((c: any) => c.id);

    console.log(`[JOURNEY SYNC] Processando ${missingIds.length} contatos...`);

    for (const id of missingIds) {
      await updateVoterJourney(id, campaignId);
    }

    return missingIds.length;
  } catch (error) {
    console.error("Erro na sincronização em massa:", error);
    return 0;
  }
}
