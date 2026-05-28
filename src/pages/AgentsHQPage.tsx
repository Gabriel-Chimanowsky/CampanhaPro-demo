import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, TrendingUp, Share2, Map, Send, Loader2, LayoutDashboard, Ticket, ArrowRight, CheckCircle2, Link as LinkIcon, ShieldCheck, Sparkles as SparklesIcon, History, Shield, Zap, X, BellRing, Download, MessageSquarePlus, Video, Paperclip, Lightbulb, Cpu } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { askStrategist, askGrowthHacker, askSocialMedia, askFieldCommander, askCreativeProducer, askBackupAgent, askFraudAuditor, runFullPipeline, savePipelineResult, getPipelineHistory, PipelineResult, generateCreativeImage, createProductionOrder, publishToSocialMedia } from '../services/agentsClientService';
import { createBackup, restoreBackup, BackupData } from '../services/backupService';
import { useAuth } from '../contexts/AuthContext';
import { useAutoPipeline, AutoPipelineNotification } from '../hooks/useAutoPipeline';
import Button from '../components/ui/Button';
import { AlertCircle } from 'lucide-react';
import { SocialConnectionsHub } from '../components/resources/SocialConnectionsHub';

import { useAgentStore } from '../stores/useAgentStore';

const AgentsHQPage: React.FC = () => {
    const { user } = useAuth();
    const { activeTab, setActiveTab } = useAgentStore();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Zustand persist hydration check
        const unsub = useAgentStore.persist.onHydrate(() => setIsHydrated(false));
        const unsubFinish = useAgentStore.persist.onFinishHydration(() => setIsHydrated(true));
        
        // Se já estiver hidratado (navegação interna)
        if (useAgentStore.persist.hasHydrated()) {
            setIsHydrated(true);
        }

        return () => {
            unsub();
            unsubFinish();
        };
    }, []);

    useEffect(() => {
        if (isHydrated) {
            console.log("[AgentsHQ] Store hidratado. Aba ativa:", activeTab);
        }
    }, [isHydrated, activeTab]);
    const [isLimitExceeded, setIsLimitExceeded] = useState(false);
    const [credits, setCredits] = useState({ used: 0, total: 100 });
    const [pendingContext, setPendingContext] = useState<string | null>(null);
    const [autoPipelineEnabled, setAutoPipelineEnabled] = useState(true);
    const [notifications, setNotifications] = useState<AutoPipelineNotification[]>([]);

    const handleProductionHandoff = async (origin: string, target: string, content: string) => {
        try {
            await createProductionOrder(user?.campaign_id || user?.campaignId || 'default', origin, target, content);
            setPendingContext(content);
            setActiveTab(target as any);
        } catch (err) {
            console.error("Erro ao criar ordem de produção:", err);
            setPendingContext(content);
            setActiveTab(target as any);
        }
    };
    const handlePublishToSocial = async (content: string, mediaUrl?: string) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        
        const activePlatforms = Object.entries(connections)
            .filter(([_, active]) => active)
            .map(([name]) => name);

        if (activePlatforms.length === 0) {
            alert("Nenhuma rede social conectada! Vá na aba 'Conexões' primeiro.");
            return;
        }

        const confirmPost = confirm(`Deseja publicar este conteúdo no ${activePlatforms.join(', ')}?`);
        if (!confirmPost) return;

        try {
            const result = await publishToSocialMedia(campaignId, activePlatforms, content, mediaUrl);
            alert(result.message);
        } catch (err) {
            alert("Erro ao publicar: " + (err as any).message);
        }
    };

    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
    const [connections, setConnections] = useState({
        instagram: false,
        facebook: false,
        whatsapp: false,
        tiktok: false
    });

    const fetchConnections = useCallback(async () => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { data } = await supabase.from('social_tokens').select('provider').eq('campaign_id', campaignId);
            const newConn = { instagram: false, facebook: false, whatsapp: false, tiktok: false };
            data?.forEach((t: any) => {
                if (t.provider === 'meta') {
                    newConn.instagram = true; newConn.facebook = true; newConn.whatsapp = true;
                } else if (t.provider in newConn) {
                    (newConn as any)[t.provider] = true;
                }
            });
            setConnections(newConn);
        } catch (e) { console.error(e); }
    }, [user?.campaignId]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections, activeTab]);

    const handleNotification = useCallback((notif: AutoPipelineNotification) => {
        setNotifications((prev: AutoPipelineNotification[]) => {
            const exists = prev.find(n => n.id === notif.id);
            if (exists) return prev.map(n => n.id === notif.id ? notif : n);
            return [notif, ...prev].slice(0, 5);
        });
        if (notif.type !== 'running') {
            setTimeout(() => {
                setNotifications((prev: AutoPipelineNotification[]) => prev.filter(n => n.id !== notif.id));
            }, 8000);
        }
    }, []);

    const { runManualPipeline } = useAutoPipeline({
        campaignId: user?.campaign_id || user?.campaignId,
        enabled: autoPipelineEnabled,
        onNotification: handleNotification
    });

    useEffect(() => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('campanhapro-mysql-token');
                const res = await fetch('/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Erro ao buscar créditos no MySQL");
                const profile = await res.json();

                if (profile) {
                    const used = profile.ai_used || 0;
                    const total = profile.ai_credits !== null && profile.ai_credits !== undefined ? profile.ai_credits : 100;
                    setCredits({ used, total });
                    
                    // Se for Supreme Admin e não tiver limite definido (null ou <= 0), créditos ilimitados
                    const isSupreme = !!profile.is_supreme_admin;
                    const limitActive = profile.ai_credits !== null && profile.ai_credits > 0;
                    
                    if (used >= total && (!isSupreme || limitActive)) {
                        setIsLimitExceeded(true);
                    } else {
                        setIsLimitExceeded(false);
                    }
                }
            } catch (err) {
                console.error("Erro ao carregar créditos de IA:", err);
            }
        };

        fetchData();

        const channelId = `user-credits-${user?.id}`;
        const channel = supabase.channel(channelId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${user?.id}` }, fetchData)
            .subscribe();

        window.addEventListener('refresh-credits', fetchData);

        return () => {
            window.removeEventListener('refresh-credits', fetchData);
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'META_AUTH_SUCCESS') {
                setConnections((prev) => ({ ...prev, instagram: true, facebook: true }));
            }
            if (event.data?.type === 'TIKTOK_AUTH_SUCCESS') {
                setConnections((prev) => ({ ...prev, tiktok: true }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const getContextData = async (type: 'field' | 'growth' | 'strategist' | 'social' | 'fraud') => {
        try {
            const limitVal = type === 'field' ? 5 : 20;

            const campaignId = user?.campaign_id || user?.campaignId;
            const [{ data: reports }, { data: pesquisas }, { data: visits }] = await Promise.all([
                supabase.from('street_reports').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(15),
                supabase.from('pesquisas').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(limitVal),
                supabase.from('visits').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(20)
            ]);
            
            let context = "\n\n[DADOS REAIS DA CAMPANHA (EXTRAÍDOS DO BANCO)]\n";

            if (type === 'fraud' && visits) {
                context += "--- Dados de Visitas para Auditoria ---\n";
                visits.forEach((v: any) => {
                    context += `- Eleitor: ${v.nomeEleitor || 'N/A'} | Bairro: ${v.bairro} | Votos: ${v.votos} | Notas: ${v.notas || 'Sem notas'}\n`;
                });
            }

            if (pesquisas && pesquisas.length > 0) {
                const rejeicoes = pesquisas.map((p: any) => p.fatorRejeicao).filter(Boolean);
                const dores = pesquisas.map((p: any) => p.dorImediata).filter(Boolean);
                const topRejeicao = rejeicoes.sort((a: any, b: any) => rejeicoes.filter((v: any) => v===a).length - rejeicoes.filter((v: any) => v===b).length).pop() || 'N/A';
                const topDor = dores.sort((a: any, b: any) => dores.filter((v: any) => v===a).length - dores.filter((v: any) => v===b).length).pop() || 'N/A';
                
                context += "--- Insights da Pesquisa Eleitoral Mais Recente ---\n";
                context += `- Amostra: ${pesquisas.length} eleitores.\n`;
                context += `- Dor imediata predominante na base: ${topDor}.\n`;
                context += `- Maior Fator de Rejeição a ser evitado: ${topRejeicao}.\n`;
                context += "--------------------------------------------------------\n";
            }

            if (reports && reports.length > 0) {
                context += "--- Últimos Reportes da Equipe de Rua ---\n";
                reports.forEach((r: any) => {
                    context += `- Bairro: ${r.bairro} | Clima: ${r.clima} | Reclamação: ${r.reclamacao || 'Nenhuma'}\n`;
                });
            }

            return context;
        } catch (error) {
            console.error("Erro ao buscar dados do Supabase:", error);
            return ""; 
        }
    };

    const handleAgentCallGen = async (prompt: string, agentFn: (p: string, cid?: string, uid?: string) => Promise<any>, type: 'field' | 'growth' | 'strategist' | 'social' | 'fraud') => {
        if (isLimitExceeded) {
            alert("Limite de IA excedido para esta campanha.");
            throw new Error("Limit exceeded");
        }
        const context = await getContextData(type);
        const finalPrompt = `${prompt}${context}`;
        const campaignId = user?.campaign_id || user?.campaignId || 'default';
        return await agentFn(finalPrompt, campaignId, String(user?.id || 'unknown'));
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'war-room':
                return <WarRoom getContextData={getContextData} isLimitExceeded={isLimitExceeded} user={user} setHistoryRefreshKey={setHistoryRefreshKey} />;
            case 'history':
                return <PipelineHistory campaignId={user?.campaignId || ''} key={historyRefreshKey} />;
            case 'strategist':
                return <AgentRoom 
                    key="strategist"
                    title="O Estrategista" 
                    description="Diretor de Operações Políticas. Serve para análise de cenário, gestão de crise e definição de diretrizes estratégicas baseadas nas pesquisas."
                    examples={[
                        "Como agir estrategicamente baseados no último ponto de maior rejeição apontado pela pesquisa?",
                        "Quais devem ser nossos 3 principais KPIs para esta semana de campanha?",
                        "Com base nas maiores dores mapeadas no município, desenhe as diretrizes para meu plano de governo."
                    ]}
                    agentId="strategist"
                    icon={<Bot className="w-6 h-6 text-blue-400" />}
                    campaignId={user?.campaignId || 'default'}
                    agentCall={(p) => handleAgentCallGen(p, askStrategist, 'strategist')}
                    placeholder="Ex: Como lidar com nossa taxa de rejeição atual?"
                    isLimitExceeded={isLimitExceeded}
                />;
            case 'growth':
                return <AgentRoom 
                    key="growth"
                    title="O Growth Hacker" 
                    description="Arquiteto de Conversão. Serve para criar réguas de relacionamento e transformar interesse em votos."
                    examples={[
                        "Desenhe um funil de conversão focado em eleitores indecisos que tem a segurança como dor primária.",
                        "Crie uma sequência de de WhatsApp agressiva direcionada às periferias listadas nos reportes.",
                        "Identifique um segmento na amostra de pesquisa perfeito para uma ação 'Member-get-member'."
                    ]}
                    agentId="growth"
                    icon={<TrendingUp className="w-6 h-6 text-green-400" />}
                    campaignId={user?.campaignId || 'default'}
                    agentCall={(p) => handleAgentCallGen(p, askGrowthHacker, 'growth')}
                    placeholder="Ex: Crie um funil focado nas dores captadas na pesquisa."
                    isLimitExceeded={isLimitExceeded}
                />;
            case 'social':
                return <AgentRoom 
                    key="social"
                    title="O Social Media" 
                    description="Social Media Creator. Serve para criar conteúdos virais adaptados usando de 'Dores Reais' listadas na Inteligência de dados."
                    examples={[
                        "Crie um roteiro de Reels de 15 segundos sobre a maior reclamação apontada no bairro X.",
                        "Escreva uma legenda agressiva (sem atacar ninguém) sobre a dor imediata descoberta na pesquisa.",
                        "Crie um Story focado em eleitores com Perfil D e Alto Consumo de Info no IG."
                    ]}
                    agentId="social"
                    icon={<Share2 className="w-6 h-6 text-purple-400" />}
                    campaignId={user?.campaignId || 'default'}
                    agentCall={(p) => handleAgentCallGen(p, askSocialMedia, 'social')}
                    placeholder="Ex: Roteiro de TikTok de 60s focando na dor primária."
                    initialPrompt={pendingContext ? `CONTEÚDO RECEBIDO PARA POSTAGEM (Analise/Produção):\n\n${pendingContext}\n\nPor favor, finalize o post viral com base nisso.` : undefined}
                    onClearInitial={() => setPendingContext(null)}
                    onHandoff={(script) => handleProductionHandoff('social', 'creative', script)}
                    onPublish={(content) => handlePublishToSocial(content)}
                    isLimitExceeded={isLimitExceeded}
                />;
            case 'creative':
                return <AgentRoom 
                    key="creative"
                    title="O Produtor Criativo" 
                    description="Artista Digital & Google Flow. Transforma scripts em ativos visuais (imagens e vídeos) de alto impacto."
                    examples={[
                        "Gere uma imagem fótica de uma caminhada lotada no bairro X com estética de esperança.",
                        "Renderize um vídeo de 15s estilo cinemático sobre as obras de asfalto prometidas no script.",
                        "Crie um carrossel de 4 artes focadas na dor de segurança pública mapeada."
                    ]}
                    agentId="creative"
                    icon={<SparklesIcon className="w-6 h-6 text-yellow-400" />}
                    campaignId={user?.campaignId || 'default'}
                    agentCall={(p) => askCreativeProducer(p, user?.campaign_id || user?.campaignId || 'default', String(user?.id || 'unknown'))}
                    placeholder="Cole aqui o SCRIPT PARA O PRODUTOR gerado pelo Social Media..."
                    initialPrompt={pendingContext ? `SCRIPT RECEBIDO DO SOCIAL MEDIA:\n\n${pendingContext}\n\nPor favor, processe a geração deste conteúdo.` : undefined}
                    onClearInitial={() => setPendingContext(null)}
                    onExecuteAction={(p) => generateCreativeImage(p, user?.campaign_id || user?.campaignId || 'default', String(user?.id || 'unknown'))}
                    onGeneratePost={(content) => handleProductionHandoff('field', 'social', content)}
                    onPublish={(content, media) => handlePublishToSocial(content, media)}
                    isLimitExceeded={isLimitExceeded}
                />;
            case 'field':
                return <AgentRoom 
                    key="field"
                    title="O Comandante de Campo" 
                    description="Logística de Rua. Usa reportes imediatos para logística, roteirização e inteligência de panfletagem."
                    examples={[
                        "Com base nos reports de hoje, qual bairro deve receber nossa caminhada amanhã?",
                        "Onde estão os maiores focos de reclamação sobre iluminação pública nesta semana?",
                        "Trace uma rota de panfletagem focando na localidade onde as respostas apontam que as pessoas votariam em outros candidatos."
                    ]}
                    agentId="field"
                    icon={<Map className="w-6 h-6 text-orange-400" />}
                    campaignId={user?.campaignId || 'default'}
                    agentCall={(p) => handleAgentCallGen(p, askFieldCommander, 'field')}
                    placeholder="Ex: Onde focar panfletagem para mitigar críticas de asfalto detectadas na pesquisa?"
                    onGeneratePost={(content) => handleProductionHandoff('field', 'social', content)}
                    isLimitExceeded={isLimitExceeded}
                />;
            case 'connections':
                return <SocialConnectionsHub />;
            case 'backup':
                return <BackupAgentRoom campaignId={user?.campaignId || ''} user={user} />;
            case 'fraud':
                return <AgentRoom 
                    key="fraud"
                    title="Auditor de Integridade" 
                    description="Caça-Fraudes de Campanha. Especialista em detectar dados falsos, cadastros suspeitos e inconsistências nos reportes de rua."
                    examples={[
                        "Analise os últimos 10 cadastros de eleitores e procure por padrões de nomes falsos ou CEPs repetidos.",
                        "Identifique si há reportes de rua com textos idênticos vindo de voluntários diferentes.",
                        "Sinale possíveis fraudes no bairro X baseadas nas contradições das notas de atendimento."
                    ]}
                    agentId="fraud"
                    icon={<ShieldCheck className="w-6 h-6 text-red-400" />}
                    campaignId={user?.campaignId || 'default'}
                    agentCall={(p) => handleAgentCallGen(p, askFraudAuditor, 'fraud')}
                    placeholder="Ex: Verifique a integridade dos cadastros realizados hoje."
                    isLimitExceeded={isLimitExceeded}
                />;
        }
    };

    return (
        <div className="space-y-4 flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] min-h-[650px] overflow-hidden">
            {notifications.length > 0 && (
                <div className="space-y-2 flex-shrink-0">
                    {notifications.map(notif => (
                        <div
                            key={notif.id}
                            className={`flex items-start gap-3 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300 ${
                                notif.type === 'running' 
                                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                                    : notif.type === 'done'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                            }`}
                        >
                            {notif.type === 'running' 
                                ? <Loader2 className="w-5 h-5 animate-spin shrink-0 mt-0.5" />
                                : <BellRing className="w-5 h-5 shrink-0 mt-0.5" />
                            }
                            <div className="flex-1">
                                <p className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-70">Pipeline Automática</p>
                                <p className="text-sm font-medium">{notif.message}</p>
                            </div>
                            <button
                                onClick={() => setNotifications((prev: AutoPipelineNotification[]) => prev.filter(n => n.id !== notif.id))}
                                className="text-current opacity-50 hover:opacity-100 transition-opacity shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isLimitExceeded && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <div>
                            <p className="text-sm font-bold text-red-400">Limite de IA Atingido ({credits.used}/{credits.total})</p>
                            <p className="text-xs text-red-400/70">O limite de chamadas de IA foi atingido para o seu usuário. Contate o Gestor Supremo para expansão.</p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-50 flex items-center gap-2">
                        <Bot className="w-6 h-6 text-blue-400" />
                        Quartel General de IA
                    </h2>
                    <p className="text-slate-400 mt-1">Sistema Multi-Agente "Voto Inteligente"</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <Cpu className="w-3.5 h-3.5" />
                        Créditos: {credits.total - credits.used}
                    </div>
                    <button
                        onClick={() => setAutoPipelineEnabled((prev: boolean) => !prev)}
                        title={autoPipelineEnabled ? 'Automação ativa — clique para pausar' : 'Automação pausada — clique para ativar'}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            autoPipelineEnabled
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                        }`}
                    >
                        <Zap className={`w-3.5 h-3.5 ${autoPipelineEnabled ? 'animate-pulse' : ''}`} />
                        {autoPipelineEnabled ? 'Automação ON' : 'Automação OFF'}
                    </button>
                    <button
                        onClick={runManualPipeline}
                        title="Rodar análise diária agora"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 transition-all"
                    >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        Análise Manual
                    </button>
                    {Object.values(connections).some((v: boolean) => v) && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs font-medium border border-green-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            IA Conectada às Redes
                        </div>
                    )}
                </div>
            </div>

            <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg border border-slate-700 overflow-x-auto flex-shrink-0">
                <button onClick={() => setActiveTab('war-room')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'war-room' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <LayoutDashboard className="w-4 h-4" /> War Room
                </button>
                <button onClick={() => setActiveTab('history')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <History className="w-4 h-4" /> Histórico de Análises
                </button>
                <button onClick={() => setActiveTab('strategist')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'strategist' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <Bot className="w-4 h-4" /> O Estrategista
                </button>
                <button onClick={() => setActiveTab('growth')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'growth' ? 'bg-green-500/20 text-green-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <TrendingUp className="w-4 h-4" /> O Growth Hacker
                </button>
                <button onClick={() => setActiveTab('social')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'social' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <Share2 className="w-4 h-4" /> O Social Media
                </button>
                <button onClick={() => setActiveTab('creative')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'creative' ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <SparklesIcon className="w-4 h-4" /> Produtor Criativo
                </button>
                <button onClick={() => setActiveTab('field')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'field' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <Map className="w-4 h-4" /> Comandante de Campo
                </button>
                <button onClick={() => setActiveTab('backup')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <Shield className="w-4 h-4" /> Guardião de Dados (Backup)
                </button>
                <button onClick={() => setActiveTab('fraud')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'fraud' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <ShieldCheck className="w-4 h-4" /> Auditor de Fraudes
                </button>
                <div className="flex-1" />
                <button onClick={() => setActiveTab('connections')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'connections' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'}`}>
                    <LinkIcon className="w-4 h-4" /> Conexões
                </button>
            </div>

            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex-1 min-h-0 flex flex-col overflow-hidden">
                {!isHydrated ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-400" />
                        <p className="text-sm font-medium">Sincronizando Quartel General...</p>
                    </div>
                ) : (
                    renderTabContent()
                )}
            </div>
        </div>
    );
};

interface AttachedMedia {
    type: 'image' | 'video';
    dataUrl: string;
    name: string;
}

interface AgentRoomProps {
    title: string;
    description: string;
    examples?: string[];
    icon: React.ReactNode;
    agentId: string;
    campaignId: string;
    agentCall: (prompt: string, agent_id: string) => Promise<any>;
    placeholder: string;
    initialPrompt?: string | null;
    onClearInitial?: () => void;
    onHandoff?: (content: string) => void;
    onExecuteAction?: (content: string, agent_id: string) => Promise<string>;
    onGeneratePost?: (content: string) => void;
    onPublish?: (content: string, media?: string) => void;
    isLimitExceeded?: boolean;
}

const AgentRoom: React.FC<AgentRoomProps> = ({ title, description, agentId, campaignId, examples, icon, agentCall, placeholder, initialPrompt, onClearInitial, onExecuteAction, isLimitExceeded }) => {
    const [input, setInput] = useState('');
    const { histories, setHistory, addMessage } = useAgentStore();
    const { user } = useAuth();
    const history = histories[agentId] || [];
    const [isLoading, setIsLoading] = useState(false);
    const [pendingOrders, setPendingOrders] = useState<any[]>([]);
    const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
    const [loadingCardKey, setLoadingCardKey] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [lightboxRefText, setLightboxRefText] = useState('');
    const lightboxInputRef = useRef<HTMLInputElement>(null);
    
    const [attachedMedia, setAttachedMedia] = useState<AttachedMedia | null>(null);
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
    const strategistHistory = histories['strategist'] || [];
    
    const getMsgKey = (msg: any, absoluteIdx: number) => msg.id ? String(msg.id) : String(absoluteIdx);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [input]);

    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [history, isLoading]);

    useEffect(() => {
        if (strategistHistory.length > 0) {
            const lastAgentMsgs = strategistHistory
                .filter(m => m.role === 'agent')
                .slice(-3)
                .map(m => m.content);
            const newSuggestions: string[] = [];
            lastAgentMsgs.forEach(msg => {
                const lines = msg.split('\n').filter(l => l.trim().length > 20 && l.trim().length < 120);
                if (lines.length > 0) {
                    const clean = lines[0].replace(/^[\-\*\d\.\s]+/, '').replace(/\*\*/g, '').trim();
                    if (clean && !newSuggestions.includes(clean)) newSuggestions.push(clean);
                }
            });
            setSuggestions(newSuggestions.slice(0, 3));
        }
    }, [strategistHistory.length]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers = { 'Authorization': `Bearer ${session?.access_token}` };
                const histRes = await fetch(`/api/agents/history/${agentId}?campaignId=${campaignId}`, { headers });
                const histData = await histRes.json();
                if (histData.history) {
                    setHistory(agentId, histData.history.map((h: any) => ({ id: h.id, role: h.role, content: h.content })));
                }
                const ordersRes = await fetch(`/api/agents/production-orders?campaignId=${campaignId}&targetAgent=${agentId}`, { headers });
                const ordersData = await ordersRes.json();
                if (ordersData) setPendingOrders(ordersData);
            } catch (err) {
                console.error("Erro ao carregar dados iniciais:", err);
            }
        };
        loadInitialData();
    }, [agentId, campaignId]);

    useEffect(() => {
        if (initialPrompt) {
            setInput(initialPrompt);
            if (onClearInitial) onClearInitial();
        }
    }, [initialPrompt]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && !attachedMedia) || isLoading) return;

        // Bloqueia se créditos esgotados — mostra mensagem no chat
        if (isLimitExceeded) {
            addMessage(agentId, {
                role: 'agent',
                content: '🚫 **Créditos insuficientes.** Você atingiu o limite de chamadas de IA desta campanha.\n\nPor favor, entre em contato com o Administrador para liberar mais créditos e continuar usando os agentes.'
            });
            setInput('');
            setAttachedMedia(null);
            return;
        }

        const userMsg = input.trim();
        const mediaToSend = attachedMedia;
        setInput('');
        setAttachedMedia(null);

        let displayContent = userMsg;
        if (mediaToSend) {
            displayContent = userMsg || `[${mediaToSend.type === 'image' ? 'Imagem' : 'Vídeo'}: ${mediaToSend.name}]`;
        }
        const messageToStore = mediaToSend && mediaToSend.type === 'image'
            ? `${displayContent}\n![REFERÊNCIA-USUÁRIO](${mediaToSend.dataUrl})`
            : mediaToSend && mediaToSend.type === 'video'
            ? `${displayContent}\n[VIDEO-REFERÊNCIA:${mediaToSend.dataUrl}]`
            : displayContent;

        addMessage(agentId, { role: 'user', content: messageToStore });
        setIsLoading(true);
        try {
            const contextPrompt = history.length > 0 
                ? `Histórico da conversa:\n${history.map(h => `${h.role === 'user' ? 'Eu' : 'Você'}: ${h.content}`).join('\n')}\n\nMinha nova mensagem: ${userMsg}`
                : userMsg;
            const response = await agentCall(contextPrompt, agentId);
            addMessage(agentId, { role: 'agent', content: typeof response === 'string' ? response : (response as any).text || "" });
            if (typeof response !== 'string' && (response as any).tool_calls) {
                (response as any).tool_calls.forEach((tool: any) => {
                    addMessage(agentId, { 
                        role: 'agent', 
                        content: `🛡️ **SISTEMA EM AÇÃO:** Analisando integridade via \`${tool.function.name}\`...\nStatus: Verificação autônoma processada no cluster de segurança.` 
                    });
                });
            }
            window.dispatchEvent(new Event('refresh-credits'));
        } catch (error) {
            addMessage(agentId, { role: 'agent', content: "❌ Erro de comunicação com a base. Tente novamente." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteAction = async (msgKey: string, content: string) => {
        if (!onExecuteAction) return;
        setLoadingCardKey(msgKey);
        setIsLoading(true);
        try {
            const refImg = attachedMedia?.type === 'image' ? attachedMedia.dataUrl : referenceImage || undefined;
            const resultUrl = await generateCreativeImage(content, campaignId, String(user?.id || 'unknown'), refImg, agentId);
            if (resultUrl) {
                setGeneratedImages(prev => ({ ...prev, [msgKey]: resultUrl }));
                addMessage(agentId, { role: 'agent', content: `![ATIVO](${resultUrl})` });
                window.dispatchEvent(new Event('refresh-credits'));
            } else {
                setErrorModal({
                    title: 'Erro na Geração',
                    message: 'Geração concluída mas a URL da imagem ficou vazia. Tente novamente.'
                });
            }
        } catch (error: any) {
            console.error("Erro na geração da imagem:", error);
            setErrorModal({
                title: 'Geração de Ativo Interrompida',
                message: error.message || String(error)
            });
        } finally {
            setIsLoading(false);
            setLoadingCardKey(null);
        }
    };

    const handleMediaAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachedMedia({
                type: isVideo ? 'video' : 'image',
                dataUrl: reader.result as string,
                name: file.name
            });
        };
        reader.readAsDataURL(file);
        if (isImage) {
            const reader2 = new FileReader();
            reader2.onloadend = () => setReferenceImage(reader2.result as string);
            reader2.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleDownload = async (url: string) => {
        try {
            if (url.startsWith('data:')) {
                const res = await fetch(url);
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `ativo-visual-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            } else {
                const a = document.createElement('a');
                a.href = url;
                a.download = `ativo-visual-${Date.now()}.png`;
                a.target = '_blank';
                a.click();
            }
        } catch (e) {
            window.open(url, '_blank');
        }
    };

    const isActionable = (content: string) =>
        !content.startsWith('🛡️') &&
        !content.startsWith('🛠️') &&
        !content.startsWith('❌') &&
        !content.includes('![ATIVO]') &&
        !content.includes('![REFERÊNCIA-USUÁRIO]') &&
        !content.includes('[VIDEO-REFERÊNCIA:') &&
        content.trim().length > 10;

    const renderMarkdown = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, lineIdx) => {
            const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            const rendered = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
                if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-slate-300">{part.slice(1, -1)}</em>;
                return <span key={i}>{part}</span>;
            });
            if (line.match(/^[\-\*]\s/)) {
                return <div key={lineIdx} className="flex gap-2 items-start my-0.5"><span className="text-blue-400 mt-1 shrink-0">•</span><span>{rendered}</span></div>;
            }
            if (line.match(/^\d+\.\s/)) {
                const num = line.match(/^(\d+)\./)![1];
                const rest = line.replace(/^\d+\.\s/, '');
                return <div key={lineIdx} className="flex gap-2 items-start my-0.5"><span className="text-blue-400 font-bold shrink-0 min-w-[1.2rem]">{num}.</span><span>{rest}</span></div>;
            }
            if (line.startsWith('# ')) return <h4 key={lineIdx} className="text-base font-bold text-slate-100 mt-2 mb-1">{line.slice(2)}</h4>;
            if (line.startsWith('## ')) return <h5 key={lineIdx} className="text-sm font-bold text-slate-200 mt-2 mb-0.5">{line.slice(3)}</h5>;
            if (line.trim() === '') return <div key={lineIdx} className="h-2" />;
            return <div key={lineIdx} className="leading-relaxed">{rendered}</div>;
        });
    };

    const parseUserMessage = (content: string) => {
        const imgMatch = content.match(/!\[.*?\]\((.+?)\)/);
        const vidMatch = content.match(/\[VIDEO-REFERÊNCIA:(.+?)\]/);
        const cleanText = content
            .replace(/!\[REFERÊNCIA-USUÁRIO\]\(.+?\)/, '')
            .replace(/!\[ATIVO\]\(.+?\)/, '')
            .replace(/!\[.*?\]\(.+?\)/, '')
            .replace(/\[VIDEO-REFERÊNCIA:.+?\]/, '')
            .trim();
        return { cleanText, imgUrl: imgMatch?.[1], vidUrl: vidMatch?.[1] };
    };

    const getAgentAvatar = () => {
        const avatars: Record<string, string> = {
            strategist: '🎯', growth: '📈', social: '📱', creative: '🎨',
            field: '🗺️', backup: '🛡️', fraud: '🔍', backup_guardian: '🔒'
        };
        return avatars[agentId] || '🤖';
    };

    const accentColor: Record<string, string> = {
        strategist: 'from-blue-600 to-blue-700',
        growth: 'from-green-600 to-emerald-700',
        social: 'from-purple-600 to-purple-700',
        creative: 'from-yellow-600 to-amber-700',
        field: 'from-orange-600 to-orange-700',
        backup: 'from-emerald-600 to-teal-700',
        fraud: 'from-red-600 to-red-700',
    };
    const accent = accentColor[agentId] || 'from-blue-600 to-blue-700';

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/60 flex-shrink-0">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center text-lg shadow-lg flex-shrink-0`}>
                    {icon || getAgentAvatar()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-50 truncate">{title}</h3>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-500/20 shrink-0">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                            Online
                        </span>
                        <span className="text-[10px] text-slate-500 shrink-0">Gemini AI</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{description}</p>
                </div>
                {examples && examples.length > 0 && (
                    <div className="hidden xl:flex flex-wrap gap-1 max-w-xs shrink-0">
                        {examples.map((ex, i) => (
                            <button key={i} onClick={() => setInput(ex)}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg transition-all text-left line-clamp-1 max-w-[140px]">
                                {ex}
                            </button>
                        ))}
                    </div>
                )}
            </div>



            {agentId === 'fraud' && history.some(m => m.content.includes('🛡️')) && (
                <div className="mb-3 bg-red-500/5 border border-red-500/15 p-3 rounded-xl flex-shrink-0 animate-in fade-in duration-500">
                    <p className="text-[10px] font-bold text-red-400 uppercase mb-2 tracking-widest flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Relatórios de Integridade
                    </p>
                    <div className="space-y-1.5">
                        {history.filter(m => m.content.includes('🛡️')).slice(-3).map((msg, i) => (
                            <div key={i} className="text-[11px] bg-slate-900/50 border border-red-500/20 text-red-200/70 p-2 rounded-lg flex items-center gap-2 italic">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                {msg.content.replace(/🛡️ \*\*SISTEMA EM AÇÃO:\*\* /g, '').split('...')[0]}...
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto mb-3 px-1 space-y-1" ref={scrollRef}
                style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>

                {pendingOrders.length > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/25 rounded-xl p-3 mb-4">
                        <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold text-xs uppercase tracking-wider"><BellRing className="w-3.5 h-3.5" /> Ordens Pendentes</div>
                        <div className="space-y-2">
                            {pendingOrders.map((order) => (
                                <div key={order.id} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                                    <p className="text-xs text-slate-400 mb-1">De: <span className="text-blue-300 font-medium capitalize">{order.origin_agent}</span></p>
                                    <p className="text-xs text-slate-300 line-clamp-2 italic mb-2">"{order.content}"</p>
                                    <button onClick={() => { setInput(order.content); setPendingOrders((prev: any[]) => prev.filter(o => o.id !== order.id)); }}
                                        className="flex items-center gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-all">
                                        <ArrowRight className="w-3 h-3" /> Usar contexto
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 py-10">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center text-3xl mb-4 shadow-2xl opacity-80`}>
                            {getAgentAvatar()}
                        </div>
                        <p className="font-semibold text-slate-400 mb-1">{title} pronto para operar</p>
                        <p className="text-xs text-slate-600 mb-6 text-center max-w-xs">Powered by Gemini AI — envie sua primeira mensagem abaixo</p>
                        {examples && (
                            <div className="w-full max-w-md space-y-2">
                                <p className="text-[10px] uppercase tracking-wider text-slate-600 font-bold text-center mb-3">Sugestões rápidas:</p>
                                {examples.map((ex, i) => (
                                    <button key={i} onClick={() => setInput(ex)}
                                        className="block w-full text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 p-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all text-left group">
                                        <span className="text-slate-600 group-hover:text-slate-500 mr-2">💬</span>
                                        {ex}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    history.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        const { cleanText, imgUrl, vidUrl } = parseUserMessage(msg.content);
                        return (
                            <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isUser ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                    {imgUrl && (
                                        <div className="mb-2 rounded-xl overflow-hidden border border-slate-700/60 shadow-md max-w-full sm:max-w-[380px] cursor-pointer hover:opacity-95 transition-opacity" 
                                             onClick={() => { setLightboxImage(imgUrl); setLightboxRefText(''); }}>
                                            <img src={imgUrl} alt="Visual Asset" className="w-full h-auto object-cover max-h-[300px]" />
                                        </div>
                                    )}
                                    {vidUrl && (
                                        <div className="mb-2 rounded-lg overflow-hidden border border-white/10 max-w-[240px]">
                                            <video src={vidUrl} controls className="w-full h-auto max-h-[180px]" />
                                        </div>
                                    )}
                                    {cleanText && <div className="whitespace-pre-wrap">{renderMarkdown(cleanText)}</div>}
                                    
                                    {!isUser && agentId === 'creative' && isActionable(msg.content) && (
                                        <div className="mt-3 pt-2 border-t border-slate-700/50 flex flex-wrap gap-2">
                                            {generatedImages[getMsgKey(msg, idx)] ? (
                                                <div className="text-[10px] bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 flex items-center gap-2 text-slate-400">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                    Ativo Gerado com Sucesso!
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleExecuteAction(getMsgKey(msg, idx), msg.content)}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-md hover:scale-105 active:scale-95"
                                                >
                                                    {loadingCardKey === getMsgKey(msg, idx) ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Gerando Ativo...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SparklesIcon className="w-3 h-3 text-yellow-300" />
                                                            Gerar Ativo Visual
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <span className="text-[9px] opacity-50 block mt-1 text-right">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-700 text-slate-400 flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Smart Suggestions from Strategist */}
            {suggestions.length > 0 && history.length > 0 && (
                <div className="mb-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">Sugestões do Estrategista:</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {suggestions.map((s, i) => (
                            <button key={i} onClick={() => setInput(s)}
                                className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/40 text-amber-300/90 px-3 py-1.5 rounded-xl transition-all text-left max-w-[200px] line-clamp-1">
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="flex-shrink-0">
                {/* Attached Media Preview */}
                {attachedMedia && (
                    <div className="mb-2 p-2 bg-slate-900/80 border border-slate-700 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {attachedMedia.type === 'image' ? (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-indigo-500/40 flex-shrink-0 relative group">
                                <img src={attachedMedia.dataUrl} alt="Preview" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setAttachedMedia(null)}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-lg border border-purple-500/40 flex-shrink-0 relative group bg-slate-800 flex items-center justify-center">
                                <Video className="w-5 h-5 text-purple-400" />
                                <button type="button" onClick={() => setAttachedMedia(null)}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-red-400">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                                {attachedMedia.type === 'image' ? '📷 Imagem de referência' : '🎬 Vídeo de referência'}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{attachedMedia.name}</p>
                        </div>
                        <button type="button" onClick={() => setAttachedMedia(null)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <button type="button" onClick={() => mediaInputRef.current?.click()} disabled={isLoading || isLimitExceeded}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400 transition-all disabled:opacity-40"
                        title="Anexar imagem ou vídeo">
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <input type="file" ref={mediaInputRef} onChange={handleMediaAttach} accept="image/*,video/*" className="hidden" />
                    <input type="file" ref={fileInputRef} onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { const r = new FileReader(); r.onloadend = () => setReferenceImage(r.result as string); r.readAsDataURL(f); }
                    }} accept="image/*" className="hidden" />

                    <div className="flex-1">
                        <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
                            placeholder={isLimitExceeded ? "🚫 Sem créditos de IA disponíveis nesta campanha" : placeholder}
                            className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ minHeight: '44px', maxHeight: '120px' }} disabled={isLoading || isLimitExceeded} rows={1} />
                    </div>

                    <button type="submit" disabled={(!input.trim() && !attachedMedia) || isLoading || isLimitExceeded}
                        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg ${
                            (input.trim() || attachedMedia) && !isLoading && !isLimitExceeded
                                ? `bg-gradient-to-br ${accent} hover:opacity-90 text-white hover:scale-105 active:scale-95`
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                        }`}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </form>
                <p className="text-[10px] text-slate-600 mt-1.5 ml-12">Enter para enviar · Shift+Enter nova linha · Imagens e vídeos suportados</p>
            </div>

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}>
                    <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
                            <p className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-indigo-400" /> Visualização
                            </p>
                            <div className="flex items-center gap-2">
                                <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(lightboxImage!); }}
                                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-bold transition-all shadow-md hover:scale-105">
                                    <Download className="w-3.5 h-3.5" /> Baixar
                                </a>
                                <button onClick={() => setLightboxImage(null)} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-xl transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 p-4">
                            <img src={lightboxImage} alt="Ativo Visual" className="w-full h-auto rounded-xl border border-slate-700 block" />
                        </div>
                        <div className="px-4 pb-4 pt-3 border-t border-slate-700 flex-shrink-0">
                            <p className="text-[11px] text-slate-400 mb-2 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                                <MessageSquarePlus className="w-3.5 h-3.5 text-purple-400" /> Referenciar no chat
                            </p>
                            <div className="flex gap-2">
                                <input ref={lightboxInputRef} type="text" value={lightboxRefText} onChange={(e) => setLightboxRefText(e.target.value)}
                                    placeholder="Ex: Adicione o nome do candidato..."
                                    className="flex-1 bg-slate-800 border border-slate-600 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && lightboxRefText.trim()) { setInput(`[Referindo-se ao ativo visual gerado] ${lightboxRefText.trim()}`); setLightboxImage(null); setLightboxRefText(''); }
                                        if (e.key === 'Escape') setLightboxImage(null);
                                    }} autoFocus />
                                <button disabled={!lightboxRefText.trim()} onClick={() => {
                                    if (!lightboxRefText.trim()) return;
                                    setInput(`[Referindo-se ao ativo visual gerado] ${lightboxRefText.trim()}`);
                                    setLightboxImage(null); setLightboxRefText('');
                                }} className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-2 rounded-xl font-bold transition-all shadow-md hover:scale-105">
                                    <Send className="w-3 h-3" /> Usar
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1.5">Enter para enviar · Esc para fechar</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Dialog Modal */}
            {errorModal && (
                <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                     onClick={() => setErrorModal(null)}>
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200"
                         onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-bounce">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-slate-50 mb-2">{errorModal.title}</h3>
                            <div className="text-xs text-slate-400 bg-slate-950/50 border border-slate-800 rounded-xl p-3 mb-6 whitespace-pre-wrap leading-relaxed select-all">
                                {errorModal.message}
                            </div>
                            <button
                                onClick={() => setErrorModal(null)}
                                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const WarRoom: React.FC<{ getContextData: (type: any) => Promise<string>; isLimitExceeded: boolean; user: any; setHistoryRefreshKey?: React.Dispatch<React.SetStateAction<number>>; }> = ({ getContextData, isLimitExceeded, user, setHistoryRefreshKey }) => {
    const [reports, setReports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPipelineRunning, setIsPipelineRunning] = useState(false);
    const [pipelineMessage, setPipelineMessage] = useState("");
    const { warRoomResult: pipelineResult, warRoomStep: pipelineStep, setWarRoomResult: setPipelineResult, setWarRoomStep: setPipelineStep } = useAgentStore();

    useEffect(() => {
        const fetchReports = async () => {
            const campaignId = user?.campaign_id || user?.campaignId;
            try {
                const { data } = await supabase.from('street_reports').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(10);
                setReports(data || []);
            } catch (error) { console.error(error); }
            finally { setIsLoading(false); }
        };
        fetchReports();
    }, []);

    const handleRunPipeline = async (contextAddition: string) => {
        if (isLimitExceeded) { alert("Limite excedido."); return; }
        setIsPipelineRunning(true); setPipelineResult(null); setPipelineStep(0);
        try {
            const campaignId = user?.campaign_id || user?.campaignId || 'default';
            const context = await getContextData('strategist');
            const dataPrompt = `${contextAddition}\n${context}`;
            const history = await getPipelineHistory(campaignId, 1);
            const historyPrompt = history.length > 0 ? `ANÁLISE ANTERIOR:\nEstrategista: ${history[0].strategist}` : "";
            const result = await runFullPipeline(dataPrompt, (step, msg) => { setPipelineStep(step); setPipelineMessage(msg); }, historyPrompt, campaignId, String(user?.id || ''));
            
            // Salva no Store primeiro (para garantir visibilidade na UI)
            setPipelineResult(result);
            setPipelineStep(7); // Garante que o status mostre "Concluída"

            // Salva no banco de forma assíncrona (não bloqueia a UI se falhar)
            savePipelineResult(user?.campaign_id || user?.campaignId || 'default', result).then(() => {
                // Se salvou com sucesso, sinaliza para o histórico atualizar
                if (setHistoryRefreshKey) setHistoryRefreshKey((prev: number) => prev + 1);
            }).catch(err => console.error("Erro silencioso ao salvar histórico:", err));

        } catch (error) { 
            console.error("Erro na pipeline:", error);
            setPipelineMessage("Erro na pipeline."); 
        }
        finally { setIsPipelineRunning(false); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4"><LayoutDashboard className="w-6 h-6 text-red-400" /><div><h3 className="text-xl font-bold text-slate-50">War Room: Linha de Montagem</h3><p className="text-sm text-slate-400">Fluxo: Estratégia → Growth → Campo → Social → Produtor.</p></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Ticket className="w-4 h-4 text-orange-400" /> Gatilhos Ativos</h4><button onClick={() => handleRunPipeline("Geral")} disabled={isPipelineRunning} className="bg-indigo-600 hover:bg-indigo-700 text-slate-50 text-xs px-3 py-1.5 rounded font-bold flex gap-2 items-center"><SparklesIcon className="w-3 h-3"/> Analisar Agora</button></div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">{reports.length === 0 ? <p className="text-xs text-slate-500 italic">Sem reportes.</p> : reports.map((r) => (<div key={r.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700"><div className="flex justify-between items-start mb-2"><span className="text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">{r.bairro}</span></div><p className="text-sm text-slate-200 line-clamp-2 mb-3">{r.reclamacao}</p><button onClick={() => handleRunPipeline(`${r.bairro}: ${r.reclamacao}`)} disabled={isPipelineRunning} className="w-full flex items-center justify-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-slate-50 py-2 rounded font-medium disabled:opacity-50 transition-colors">Analisar Ticket <ArrowRight className="w-3 h-3" /></button></div>))}</div>
                </div>
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /> Status da Produção</h4>
                    <div className="flex-1 space-y-4 flex flex-col justify-center">
                        {[ {id:1, n:'Estrategista'}, {id:2, n:'Growth Hacker'}, {id:3, n:'Comandante Campo'}, {id:4, n:'Social Media'}, {id:5, n:'Produtor Criativo'} ].map(s => (
                            <div key={s.id} className="flex items-center gap-3 opacity-50 data-[active=true]:opacity-100" data-active={pipelineStep >= s.id}>
                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">{s.id}</div>
                                <div className="flex-1"><p className="text-[11px] font-medium text-slate-200">{s.n}</p><div className="w-full bg-slate-800 h-1 rounded-full mt-1"><div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: pipelineStep > s.id ? '100%' : pipelineStep === s.id ? '50%' : '0%' }}></div></div></div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 p-3 bg-slate-800/80 rounded-lg border border-slate-700 text-center">{isPipelineRunning ? <p className="text-xs text-indigo-400 flex items-center justify-center gap-2 animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> {pipelineMessage}</p> : pipelineStep === 7 ? <p className="text-xs text-green-400 flex items-center justify-center gap-2 font-bold"><CheckCircle2 className="w-3 h-3" /> Pipeline Concluída!</p> : <p className="text-[10px] text-slate-500">Aguardando gatilho...</p>}</div>
                </div>
            </div>
            {pipelineResult && (
                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400"/> Resultado</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[ {t:'Estrategista', c:pipelineResult.strategist, cl:'text-blue-400'}, {t:'Growth', c:pipelineResult.growth, cl:'text-green-400'}, {t:'Campo', c:pipelineResult.field, cl:'text-orange-400'}, {t:'Social', c:pipelineResult.social, cl:'text-purple-400'} ].map(p => (
                            <div key={p.t} className="bg-slate-900 border border-slate-700 rounded-xl p-5"><h4 className={`font-bold ${p.cl} border-b border-slate-800 pb-2 mb-2`}>{p.t}</h4><div className="text-sm text-slate-300 whitespace-pre-wrap">{p.c}</div></div>
                        ))}
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 lg:col-span-2"><h4 className="font-bold text-yellow-400 border-b border-slate-800 pb-2 mb-2 flex items-center gap-2"><SparklesIcon className="w-4 h-4"/> Produtor Criativo</h4><div className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{pipelineResult.creative_text}</div>
                        {pipelineResult.creativeImageBase64 && ( <div className="mt-4 border border-slate-700 rounded-xl p-2 bg-black/50 text-center"><img src={`data:image/jpeg;base64,${pipelineResult.creativeImageBase64}`} alt="IA" className="w-full max-w-xl mx-auto rounded-lg" /><a href={`data:image/jpeg;base64,${pipelineResult.creativeImageBase64}`} download="midia.jpg" className="inline-block mt-4 bg-yellow-600 text-slate-900 font-bold py-1.5 px-6 rounded-full text-xs">Baixar Imagem</a></div> )}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PipelineHistory: React.FC<{ campaignId: string }> = ({ campaignId }) => {
    const [history, setHistory] = useState<PipelineResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchHistory = async () => {
            if (!campaignId) { setIsLoading(false); return; }
            try { const data = await getPipelineHistory(campaignId, 10); setHistory(data); } catch (err) { console.error(err); } finally { setIsLoading(false); }
        };
        fetchHistory();
    }, [campaignId]);
    if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4"><History className="w-6 h-6 text-indigo-400" /><div><h3 className="text-xl font-bold text-slate-50">Histórico</h3><p className="text-sm text-slate-400">Análises passadas.</p></div></div>
            {history.length === 0 ? <div className="text-center p-12 bg-slate-900 border border-slate-700 rounded-xl">Sem histórico.</div> : (
                <div className="space-y-4">
                    {history.map((r, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest">Análise de IA</h4>
                                <span className="text-[10px] text-slate-50">{r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : 'Data Indisponível'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-blue-500/70 uppercase">Estrategista</p>
                                    <div className="text-xs text-slate-300 line-clamp-3 bg-slate-800/50 p-2 rounded border border-slate-700/50 italic">"{r.strategist}"</div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-green-500/70 uppercase">Growth</p>
                                    <div className="text-xs text-slate-300 line-clamp-3 bg-slate-800/50 p-2 rounded border border-slate-700/50 italic">"{r.growth}"</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BackupAgentRoom: React.FC<{ campaignId: string, user: any }> = ({ campaignId, user }) => {
    const [backups, setBackups] = useState<BackupData[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    useEffect(() => {
        if (!campaignId) return;
        const fetch = async () => {
            const { data } = await supabase.from('backups').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: false }).limit(5);
            setBackups(data || []);
        };
        fetch();
    }, [campaignId]);
    const handleCreate = async () => {
        setIsCreating(true);
        try { await createBackup(campaignId, `Snapshot ${new Date().toLocaleString()}`); alert('Sucesso!'); } catch { alert('Erro!'); }
        finally { setIsCreating(false); }
    };
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            <AgentRoom key="backup" title="Guardião" description="Backup e Integridade." agentId="backup" campaignId={campaignId} agentCall={(p) => askBackupAgent(p, campaignId, user?.id)} placeholder="Comande o backup..." icon={<Shield className="w-6 h-6 text-emerald-400" />} />
            <div className="space-y-4">
                <div className="flex justify-between items-center"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Snapshots</h4><Button onClick={handleCreate} disabled={isCreating} className="bg-emerald-600 h-8 text-xs">{isCreating ? 'Salvando...' : 'Novo Ponto'}</Button></div>
                <div className="space-y-2">{backups.map(b => (<div key={b.id} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center"><div className="text-xs font-bold text-slate-50">{b.label}</div><button onClick={() => restoreBackup(b.id)} className="text-[10px] text-emerald-400 hover:underline">Restaurar</button></div>))}</div>
            </div>
        </div>
    );
};

export default AgentsHQPage;
