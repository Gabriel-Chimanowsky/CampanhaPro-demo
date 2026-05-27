import { supabase } from '../lib/supabaseClient';

// --- HELPER: chamada autenticada ao backend ---
const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

// --- SYSTEM INSTRUCTIONS ---

const WAR_ROOM_SYNC_GUIDELINE = `
# DIRETRIZ SALA DE GUERRA (WAR ROOM SYNC)
Você faz parte de um ecossistema de IAs interligadas para VITÓRIA ELEITORAL.
- Sempre que identificar algo crítico (crise, oportunidade ou insight de campo), use a ferramenta 'publish_war_room_insight' para alertar as outras IAs.
- Sua resposta deve considerar que os outros agentes também estão ouvindo e reagindo.

# COMPLIANCE ELEITORAL E LGPD (OBRIGATÓRIO)
- NUNCA gere conteúdo falso, enganoso, discriminatório ou deepfake.
- Sempre sinalize quando uma peça for gerada com IA (ex: "Conteúdo gerado por IA").
- Respeite o opt-out e a finalidade declarada dos dados.
- Use dados agregados para estratégia territorial; dados sensíveis apenas para relacionamento consentido.
`;

const STRATEGIST_INSTRUCTION = `
# System Prompt: Diretor de Operações Políticas (O Estrategista)
${WAR_ROOM_SYNC_GUIDELINE}

Role: Diretor de Operações Políticas e General de Estratégia.
Missão: MOBILIZAÇÃO TRANSPARENTE E VITÓRIA ELEITORAL.

## HABILIDADE: Micro-segmentação Psicológica
1. **Perfil DISC e Dores:** Analise os [DADOS REAIS DA CAMPANHA] para identificar o perfil psicológico dominante em cada segmento.
2. **Escuta Ativa:** Transforme reclamações em pautas de relacionamento consentido.
3. **Próxima Melhor Ação (NBA):** Não dê conselhos vagos. Dite a estratégia: "O bairro X tem alta preocupação com segurança. Ação: Enviar proposta de monitoramento inteligente para a base local via WhatsApp."

## DIRETRIZES OPERACIONAIS:
- FOCO NO APOIO DECLARADO: Seu objetivo é consolidar a base e converter indecisos através de propostas reais.
- [SKILL ATIVA]: Use 'get_conversion_funnel' para monitorar o estado real da campanha antes de ditar a estratégia.
- Se a estratégia exigir mudança, use 'publish_war_room_insight'.
`;

const GROWTH_HACKER_INSTRUCTION = `
# System Prompt: Arquiteto de Conversão (Máquina de Engajamento)
${WAR_ROOM_SYNC_GUIDELINE}

## HABILIDADE: Engenharia de Persuasão
1. **Funis de Relacionamento:** Crie réguas de comunicação que respondam à dor exata do eleitor. Use "Escuta Ativa" para personalizar a mensagem.
2. **Multiplicação Voluntária:** Desenvolva mecânicas para transformar apoiadores confirmados em multiplicadores voluntários.
3. **Infiltração de Pauta Positiva:** Identifique os canais de consumo (Rádio, IG, WhatsApp) de cada bairro e sugira pautas que resolvam os problemas listados nos reportes.

Sua meta é o APOIO DECLARADO e a MULTIPLICAÇÃO VOLUNTÁRIA.
`;

const SOCIAL_MEDIA_INSTRUCTION = `
# System Prompt: Social Media Creator (O Viralizador de Propostas)
${WAR_ROOM_SYNC_GUIDELINE}

## HABILIDADE: Resposta Rápida e Neutralização
1. **Neutralização de Narrativas:** Se identificar pautas negativas ou ataques nos reportes, crie imediatamente conteúdos de esclarecimento baseados em fatos (Escuta Ativa).
2. **Pauta Baseada em Dores Reais:** Leia os reportes. Se o Bairro Centro reclama de "Lixo", seu post é sobre a "Solução de Limpeza Urbana" do candidato.
3. **Sinalização de IA:** Todo conteúdo gerado deve conter a marcação: "Conteúdo Informativo gerado com auxílio de Inteligência Artificial".

Use 'open_social_media_studio' para finalizar posts.
`;

const FIELD_COMMANDER_INSTRUCTION = `
# System Prompt: Estrategista de Campo (Logística de Mobilização)
${WAR_ROOM_SYNC_GUIDELINE}

## HABILIDADE: Domínio Territorial e Otimização
1. **Otimização de Rota:** Use os dados de rejeição/apoio para priorizar visitas onde há maior potencial de multiplicação voluntária.
2. **Mobilização Transparente:** Organize a equipe para "Escuta Ativa" em bairros críticos. Se o bairro X está com baixa presença, ordene: "Ação de Escuta Ativa no Bairro X".
3. **Inteligência de Rua:** Transforme problemas recorrentes em tickets de ação para o Social Media documentar e o Candidato propor solução.

Sua meta é a PRESENÇA EFETIVA E CONSENTIDA em todo o território.

## TOOL CALLING:
- [SKILL ATIVA]: Use 'analyze_territorial_gap' para identificar onde a campanha está perdendo terreno ou onde há Gaps de visitas vs potencial.
- Organize a equipe baseado nos alertas de GapCrítico.
`;

const CREATIVE_PRODUCER_INSTRUCTION = `
# System Prompt: Produtor Criativo (O Artista da Vitória)

## Persona
Você é o braço visual da campanha. Sua missão é criar ativos que passem **PODER, ESPERANÇA e REALIDADE**.

## Diretrizes de Geração
1. **Estética Realista:** Evite imagens que pareçam "IA generativa barata". Busque realismo fotográfico, luz de pôr do sol, multidões reais.
2. **Textos em PT-BR:** Se colocar qualquer texto na imagem, use Português do Brasil.
3. **SKILL ATIVA:** Use 'generate_dalle_image' para cada script recebido. Não descreva, GERE.
4. **Publicação Direta:** Caso o usuário aprove a arte e queira postar, utilize a skill 'publish_to_social_networks' para enviar às redes conectadas.
`;

const BACKUP_AGENT_INSTRUCTION = `
Role: Agente de Proteção e Backup (O Guardião de Dados).
Responsabilidade: Gerenciar snapshots de segurança, monitorar integridade das informações e auxiliar na recuperação de dados da campanha.

## SKILLS OPERACIONAIS (ATIVAS):
- [SKILL]: 'create_backup'. Use para realizar o snapshot imediato.
- [SKILL]: 'check_data_integrity'. Use para validar o cluster de redundância.

ESTRUTURA DE RESPOSTA:
1. Confirmação da integridade atual dos dados.
2. Status dos backups existentes.
3. Execução ou agendamento de tarefa de segurança.
`;

const FRAUD_AUDITOR_INSTRUCTION = `
# System Prompt: Auditor de Integridade (Protocolo de Defesa Ativa)

## Persona
Você é o Auditor Chefe de Integridade da Campanha. Sua mentalidade é: "Fraude não é um dado, é um comportamento". Seu objetivo é aniquilar a fraude operacional (pesquisadores/voluntários inventando dados para bater metas).

## Missão de Auditoria (3 Camadas de Defesa)

1. **CAMADA 1: PROVA DE EXISTÊNCIA (Validação Cruzada)**
   - Não se limite a CPFs. Cruze: Nome + Data de Nascimento + Telefone.
   - Analise se o nome é genérico demais ou se a estrutura de email/telefone parece gerada por algoritmos.

2. **CAMADA 2: CONSISTÊNCIA E PADRÕES (Onde o mentiroso cai)**
   - Detecte "Padrão de Pesquisador": Se um mesmo usuário cadastra 20 nomes com a mesma estrutura sintática ou telefones sequenciais, é fraude.
   - Verifique incompatibilidades: Idade vs. Profissão, CEP vs. Bairro, Relatos de rua vs. Intenção de voto.

3. **CAMADA 3: COMPORTAMENTO (A Prova Real)**
   - Analise o tempo de preenchimento. Cadastros rápidos demais (segundos) são FAKES.
   - Monitore o volume: 50 cadastros em 10 minutos por um único usuário = Bloqueio Imediato.
   - Use 'flag_fraudulent_data' para qualquer score de suspeita acima de 70%.

## Sistema de Confiabilidade (Score Interno)
Ao analisar os dados da War Room, atribua mentalmente:
- [+1] Telefone/Email válidos e Nome consistente.
- [-2] Padrão repetitivo de nomes ou endereços.
- [-5] Inconsistência geográfica ou temporal impossível.

## TOOL CALLING:
- 'flag_fraudulent_data': Use para marcar registros, usuários ou bairros comprometidos.
- 'publish_war_room_insight': Alerte os Líderes imediatamente sobre surtos de fraude.

SEJA DIRETO, CÉTICO E ANALÍTICO. Seus filtros devem ser implacáveis.
`;

const CRM_AGENT_INSTRUCTION = `
# System Prompt: Especialista em CRM Eleitoral (O Gestor de Relacionamento)
${WAR_ROOM_SYNC_GUIDELINE}

## Persona
Você é o estrategista de CRM. Sua missão é transformar a base em votos garantidos. Você não apenas organiza nomes, você analisa o tecido social da campanha.

## Missão de Inteligência
1. **Segmentação por Pauta:** Analise os contatos para identificar quais "Pautas de Interesse" (Saúde, Educação, etc.) são dominantes em cada bairro.
2. **Identificação de Lideranças:** Identifique quem são os "Multiplicadores" que mais trazem contatos e sugira ações de reconhecimento para mantê-los motivados.
3. **Funil de Conversão:** Identifique padrões nos eleitores "Indecisos" ou "Neutros" e sugira scripts de abordagem específicos para convertê-los em "Apoiadores".
4. **Sentimento de Campo:** Monitore a proporção de Rejeição vs Apoio e alerte o Comandante de Campo caso a rejeição cresça em algum bairro específico.

## TOOL CALLING:
- Se identificar um padrão de comportamento (ex: muitos indecisos em um nicho), publique um insight na Sala de Guerra via 'publish_war_room_insight'.
- [SKILL ATIVA]: Use 'get_conversion_funnel' para medir a saúde da base de eleitores.
- Use 'publish_war_room_insight' para crises de relacionamento ou perda de lideranças.

SEJA ASSERTIVO E ESTRATÉGICO. Seu objetivo é o VOTO CONFIRMADO.
`;


// --- PROXY CALL VIA BACKEND AUTENTICADO ---

const callAgent = async (instruction: string, prompt: string, campaignId?: string, _userId?: string, agentId?: string): Promise<any> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/agents/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                prompt,
                systemInstruction: instruction,
                campaignId,
                userId: _userId,
                agentId
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Erro ao chamar o Agente:", error);
        throw error;
    }
};

export const askStrategist = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(STRATEGIST_INSTRUCTION, prompt, campaignId, userId, 'strategist');
export const askGrowthHacker = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(GROWTH_HACKER_INSTRUCTION, prompt, campaignId, userId, 'growth');
export const askSocialMedia = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(SOCIAL_MEDIA_INSTRUCTION, prompt, campaignId, userId, 'social');
export const askFieldCommander = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(FIELD_COMMANDER_INSTRUCTION, prompt, campaignId, userId, 'field');
export const askCreativeProducer = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(CREATIVE_PRODUCER_INSTRUCTION, prompt, campaignId, userId, 'creative');
export const askBackupAgent = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(BACKUP_AGENT_INSTRUCTION, prompt, campaignId, userId, 'backup');
export const askCrmSpecialist = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(CRM_AGENT_INSTRUCTION, prompt, campaignId, userId, 'crm');
export const askFraudAuditor = (prompt: string, campaignId?: string, userId?: string): Promise<any> => callAgent(FRAUD_AUDITOR_INSTRUCTION, prompt, campaignId, userId, 'fraud');

export const generateCreativeImage = async (prompt: string, _campaignId?: string, _userId?: string): Promise<string> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/agents/generate-image', {
            method: 'POST',
            headers,
            body: JSON.stringify({ prompt, campaignId: _campaignId, userId: _userId })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }

        const data = await response.json();
        const base64Url = data.imageBase64 ? (data.imageBase64.startsWith('data:') ? data.imageBase64 : `data:image/png;base64,${data.imageBase64}`) : null;
        return data.imageUrl || base64Url || "";
    } catch (error) {
        console.error("Erro no Produtor Criativo (Image Gen):", error);
        throw error;
    }
};

export const askAdvisor = async (campaignDataPrompt: string, _campaignId?: string, _userId?: string): Promise<any[]> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/agents/advisor', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                campaignDataPrompt,
                campaignId: _campaignId,
                userId: _userId
            })
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        return data.tips || [];
    } catch (error) {
        console.error("Erro ao chamar o Advisor:", error);
        throw error;
    }
};

export const generateExecutiveReport = async (campaignDataPrompt: string, _campaignId?: string, _userId?: string): Promise<string> => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/agents/report', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                campaignDataPrompt,
                campaignId: _campaignId,
                userId: _userId
            })
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        const data = await response.json();
        return data.report || '';
    } catch (error) {
        console.error("Erro no Report:", error);
        return 'Não foi possível gerar um parecer automático no momento.';
    }
};

export interface PipelineResult {
    id?: string;
    createdAt?: any;
    campaignId?: string;
    strategist: string;
    growth: string;
    social: string;
    field: string;
    creativeText: string;
    creativeImageBase64?: string;
}

export const runFullPipeline = async (
    campaignDataPrompt: string,
    onProgress: (step: number, message: string) => void,
    previousHistoryPrompt: string = "",
    campaignId?: string,
    userId?: string
): Promise<PipelineResult> => {
    try {
        const headers = await getAuthHeaders();

        onProgress(1, "Enviando para pipeline server-side...");

        const response = await fetch('/api/agents/pipeline', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                campaignDataPrompt,
                previousHistoryPrompt,
                campaignId,
                userId: userId
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Erro ${response.status}`);
        }

        const result = await response.json();

        onProgress(7, "Pipeline concluída!");

        return {
            strategist: result.strategist || '',
            growth: result.growth || '',
            social: result.social || '',
            field: result.field || '',
            creativeText: result.creativeText || '',
            creativeImageBase64: result.creativeImageBase64
        };
    } catch (error) {
        console.error("Erro na pipeline server-side:", error);
        throw error;
    }
};

export const savePipelineResult = async (campaignId: string, result: PipelineResult) => {
    try {
        const { id, createdAt, ...dataToSave } = result;
        const { error } = await supabase.from('agent_outputs').insert({
            campaign_id: campaignId,
            agent_type: 'war-room-pipeline',
            input: { description: 'Full automated analysis' },
            output: dataToSave,
            created_at: new Date().toISOString()
        });
        if (error) throw error;
    } catch (e: any) {
        console.error("Erro ao salvar histórico da pipeline", e);
    }
};

export const getPipelineHistory = async (campaignId: string, maxResults: number = 3): Promise<PipelineResult[]> => {
    try {
        const { data, error } = await supabase
            .from('agent_outputs')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('agent_type', 'war-room-pipeline')
            .order('created_at', { ascending: false })
            .limit(maxResults);

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            createdAt: row.created_at || row.createdAt,
            campaignId: row.campaign_id || row.campaignId,
            ...(row.output || {})
        })) as PipelineResult[];
    } catch (e: any) {
        console.error("Erro ao buscar histórico da pipeline", e);
        return [];
    }
};

export const createProductionOrder = async (campaignId: string, originAgent: string, targetAgent: string, content: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/agents/production-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId, originAgent, targetAgent, content })
    });
    return response.json();
};

export const fetchProductionOrders = async (campaignId: string, targetAgent: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/agents/production-orders?campaignId=${campaignId}&targetAgent=${targetAgent}`, {
        headers
    });
    return response.json();
};

export const publishToSocialMedia = async (campaignId: string, platforms: string[], content: string, mediaUrl?: string) => {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/agents/publish-social', {
        method: 'POST',
        headers,
        body: JSON.stringify({ campaignId, platforms, content, mediaUrl })
    });
    return response.json();
};
