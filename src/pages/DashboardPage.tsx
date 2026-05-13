import * as React from 'react';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import { supabase } from '../lib/supabaseClient';
import DailyGoal from '../components/dashboard/DailyGoal';
import KpiGrid from '../components/dashboard/KpiGrid';
import ProgressChart from '../components/dashboard/ProgressChart';
import Rankings from '../components/dashboard/Rankings';
import IssueMap from '../components/dashboard/IssueMap';
import DigitalColinha from '../components/dashboard/DigitalColinha';
import CampaignAdvisor from '../components/dashboard/CampaignAdvisor';
import ReportModal from '../components/dashboard/ReportModal';
import ReportGenerator from '../components/dashboard/ReportGenerator';
import PesquisaChart from '../components/dashboard/PesquisaChart';
import FraudAlertPanel from '../components/dashboard/FraudAlertPanel';
import WarRoomFeed from '../components/dashboard/WarRoomFeed';
import SupporterProfileCard from '../components/dashboard/SupporterProfileCard';
import ConversionFunnel from '../components/dashboard/ConversionFunnel';
import TeamTasksWidget from '../components/dashboard/TeamTasksWidget';
import Button from '../components/ui/Button';
import SyncButton from '../components/ui/SyncButton';
import { PrintIcon, SparklesIcon } from '../components/icons';
import { 
    Target,
    Share2,
    Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { askAdvisor } from '../services/agentsClientService';
import CityAlertsMap from '../components/dashboard/CityAlertsMap';

const DashboardPage: React.FC = () => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();
  const [leaderFilter, setLeaderFilter] = React.useState('');
  const [municipioFilter, setMunicipioFilter] = React.useState('');
  const [bairroFilter, setBairroFilter] = React.useState('');
  const [apoiadorFilter, setApoiadorFilter] = React.useState('');
  const [isAdvisorOpen, setIsAdvisorOpen] = React.useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const [selectedReport, setSelectedReport] = React.useState<string | null>(null);

  const [advisorTips, setAdvisorTips] = React.useState<any[]>([]);
  const [isAdvisorLoading, setIsAdvisorLoading] = React.useState(false);
  const [isInstagramConnected, setIsInstagramConnected] = React.useState(false);
  const [checkingSocial, setCheckingSocial] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  const {
    kpis,
    dailyGoal,
    allLeaders,
    allMunicipios,
    allBairros,
    allApoiadores,
    bairroRanking,
    apoiadorRanking,
    leaderRanking,
    currentScenarioStatus,
    idealScenario,
    filteredVisits,
    filteredEngagements,
    pesquisas,
    isLoading
  } = useDashboardMetrics({ municipioFilter, bairroFilter, apoiadorFilter, leaderFilter });

  React.useEffect(() => {
    const checkSocial = async () => {
      try {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/social/status?campaignId=${campaignId}&provider=meta`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const result = await response.json();
        setIsInstagramConnected(result.connected);
      } catch (err) {
        console.error('Erro social check:', err);
      } finally {
        setCheckingSocial(false);
      }
    };
    if (user) checkSocial();
  }, [user]);

  const handleOpenAdvisor = async () => {
      setIsAdvisorOpen(true);
      setIsAdvisorLoading(true);
      try {
         const prompt = `
           KPIs Atuais:
           - Visitas Realizadas: ${kpis.realizadas} / Pendentes: ${kpis.pendentes}
           - Votos Mapeados: ${kpis.votos}
           - Apoiadores Ativos (7d): ${kpis.apoiadoresAtivos}
           - Abordagens Rápidas: ${kpis.totalAbordagens}
           - Materiais Distribuídos: ${kpis.totalMateriais}
           
           Top Bairros com interações (Atenção):
           ${bairroRanking.slice(0,3).map(b => `- ${b.name}: ${b.visits} visitas, ${b.votes} votos intenção`).join('\n')}

           Status do Cenário Ideal:
           ${currentScenarioStatus?.name || 'N/A'}
         `;
         const campaignId = user?.campaign_id || user?.campaignId || 'default';
         const tips = await askAdvisor(prompt, campaignId, String(user?.uid || 'unknown'));
         setAdvisorTips(tips);
      } catch (e) {
         console.error(e);
         setAdvisorTips([{ title: "Erro na IA", message: "Consultor de IA indisponível. Verifique a configuração da chave de IA no ambiente.", type: "error" }]);
      } finally {
         setIsAdvisorLoading(false);
      }
  };

  return (
    <div className="space-y-6">
      {selectedReport && (
        <ReportGenerator 
          reportType={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
      <div className="flex flex-wrap justify-between items-center gap-4 no-print">
        <h2 className="text-2xl font-bold text-slate-200">Dashboard de Campanha</h2>
        <div className="flex gap-2">
            <Button variant="primary" onClick={handleOpenAdvisor} className="bg-gradient-to-r from-[#4ac7f0] to-[#1abc9c] border-none shadow-lg shadow-sky-500/20">
                <SparklesIcon className="mr-2" /> Consultor de IA
            </Button>
            <Button variant="secondary" onClick={() => setIsReportModalOpen(true)}><PrintIcon className="mr-2" /> Relatórios (Export C-Level)</Button>
        </div>
      </div>
      
      <SyncButton />

      <div className="print-page-title hidden print:block">Relatório de Desempenho - {new Date().toLocaleDateString('pt-BR')}</div>

      {idealScenario && <DailyGoal dailyGoal={dailyGoal} />}

      <div className="print-stack space-y-6">
        {/* Victory Forecast - Executivo */}
        <Card className="p-6 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-600/5 to-transparent">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Projeção de Vitória</h3>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-black text-slate-50">{kpis.votos}</p>
                <p className="text-slate-500 text-sm">votos mapeados de <span className="font-bold text-slate-300">{idealScenario?.meta || '5.000'}</span> necessários</p>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full mt-4 overflow-hidden border border-slate-700/50">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000" 
                  style={{ width: `${Math.min((kpis.votos / (idealScenario?.meta || 5000)) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 text-center md:border-l md:border-slate-700/50 md:pl-8">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Confiança</p>
                <p className="text-2xl font-black text-emerald-400">
                  {Math.min((kpis.votos / (idealScenario?.meta || 5000)) * 100, 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tendência</p>
                <p className="text-2xl font-black text-blue-400">Estável</p>
              </div>
            </div>
          </div>
        </Card>

        <KpiGrid kpis={kpis} currentScenarioStatus={currentScenarioStatus} isLoading={isLoading} />

        <div className="space-y-6">
            <ProgressChart 
                filteredVisits={filteredVisits}
                municipioFilter={municipioFilter}
                setMunicipioFilter={(val) => {
                    setMunicipioFilter(val);
                    setBairroFilter('');
                    setApoiadorFilter('');
                }}
                allMunicipios={allMunicipios}
                bairroFilter={bairroFilter}
                setBairroFilter={(val) => {
                    setBairroFilter(val);
                    setApoiadorFilter('');
                }}
                allBairros={allBairros}
                apoiadorFilter={apoiadorFilter}
                setApoiadorFilter={setApoiadorFilter}
                allApoiadores={allApoiadores}
            />

            {apoiadorFilter && (
                <div className="mb-6">
                    <SupporterProfileCard supporterName={apoiadorFilter} />
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <FraudAlertPanel />
                <IssueMap visits={filteredVisits} engagements={filteredEngagements} />
                <Card className="p-5 border-slate-700/50 bg-slate-800/80 backdrop-blur-md">
                    <ConversionFunnel />
                </Card>
                <WarRoomFeed />
                
                <div className="md:col-span-2 xl:col-span-4">
                    <Rankings bairroRanking={bairroRanking} apoiadorRanking={apoiadorRanking} leaderRanking={leaderRanking} />
                </div>
                
                <TeamTasksWidget />
                <PesquisaChart data={pesquisas} />
                <DigitalColinha />
                
                {/* App do Colaborador Card moved here */}
                <Card className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-blue-500/30 p-6 flex flex-col justify-between">
                    <div>
                        <Share2 className="w-8 h-8 text-blue-400 mb-4" />
                        <h3 className="text-lg font-black text-white mb-2">App do Colaborador</h3>
                        <p className="text-xs text-slate-400 mb-6">Envie este link para sua equipe de campo. Eles poderão instalar o App e enviar alertas em tempo real.</p>
                    </div>
                    
                    <div className="space-y-3">
                        <input 
                            readOnly
                            value={`${window.location.origin}/colaborador`}
                            className="w-full bg-black/40 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-300 font-mono"
                        />
                        <Button 
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/colaborador`);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className={`w-full py-3 font-bold transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        >
                            {copied ? 'Link Copiado!' : 'Copiar Link de Convite'}
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="mt-8">
                <CityAlertsMap campaignId={user?.campaign_id || user?.campaignId || 'demo'} />
            </div>

            {userType === 'Admin' && allLeaders.length > 0 && (
                <Card className="no-print p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <label htmlFor="leader-filter" className="text-sm font-medium text-slate-300">Filtrar por Equipe (Líder):</label>
                        <select id="leader-filter" value={leaderFilter} onChange={e => setLeaderFilter(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md py-1 px-3 text-sm focus:ring-2 focus:ring-sky-500">
                            <option value="">Todas as Equipes</option>
                            {allLeaders.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </Card>
            )}
        </div>
      </div>

      <CampaignAdvisor 
        isOpen={isAdvisorOpen} 
        onClose={() => setIsAdvisorOpen(false)} 
        title="Consultor Estratégico de Campanha"
        isLoading={isAdvisorLoading}
        tips={advisorTips}
      />

      {/* Social Media Insights - Fase 4 */}
      <Card className="no-print p-6 border-t-4 border-t-pink-500 bg-slate-900/40">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg shadow-lg shadow-pink-500/20">
                      <Share2 className="w-6 h-6 text-slate-50" />
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-slate-100">Desempenho em Mídias Sociais</h3>
                      <p className="text-sm text-slate-400">Integração Omni-channel (Instagram, Facebook & WhatsApp)</p>
                  </div>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/app/instagram')}
                className="border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
              >
                  Ver Ranking de Engajamento →
              </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Status da Conexão</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${isInstagramConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                    <p className={`text-xl font-black ${isInstagramConnected ? 'text-slate-50' : 'text-slate-500'}`}>
                      {checkingSocial ? 'Verificando...' : isInstagramConnected ? 'Instagram Ativo' : 'Desconectado'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isInstagramConnected ? 'Sincronização em tempo real' : 'Clique no ranking para conectar'}
                  </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Engajamento / Sentimento</h4>
                  <p className="text-3xl font-black text-slate-50 mt-2">
                    {isInstagramConnected ? '84%' : '--%'}
                  </p>
                  <p className="text-xs text-emerald-400 mt-1">
                    {isInstagramConnected ? 'Tendência: Alta (↗ 12%)' : 'Status: Aguardando integração'}
                  </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Interações Identificadas</h4>
                  <p className="text-3xl font-black text-slate-50 mt-2">
                    {isInstagramConnected ? '1.240' : '--'}
                  </p>
                  <p className="text-xs text-sky-400 mt-1">
                    {isInstagramConnected ? 'Cruzado com CRM: 342 leads' : 'Status: Aguardando integração'}
                  </p>
              </div>
          </div>
      </Card>

      <ReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        onGenerateReport={(id) => setSelectedReport(id)}
      />

      {/* Toast Notification */}
      {copied && (
        <div className="fixed bottom-10 right-10 z-[2000] animate-in slide-in-from-right-10 fade-in duration-300">
            <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50">
                <Check className="w-5 h-5" />
                <div>
                    <p className="font-black text-sm">Link Copiado!</p>
                    <p className="text-[10px] opacity-80 font-bold">Envie agora para seu colaborador.</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;