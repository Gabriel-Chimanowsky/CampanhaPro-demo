import * as React from 'react';
import { 
  Instagram, 
  Search, 
  Calendar, 
  Trophy, 
  MessageCircle, 
  TrendingUp,
  User,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';

interface RankingItem {
  username: string;
  count: number;
  lastComment: string;
  avatar?: string;
  matchedContact?: {
    name: string;
    id: string;
    lider?: string;
  };
}

const getMockRanking = (period: string): RankingItem[] => {
  const multiplier = period === '24h' ? 0.2 : period === '7d' ? 1 : period === '30d' ? 4 : 10;
  return [
    { username: 'maria_silva', count: Math.floor(42 * multiplier), lastComment: 'Excelente proposta para a saúde!', matchedContact: { name: 'Maria Silva', id: '1' } },
    { username: 'joao_pedro', count: Math.floor(35 * multiplier), lastComment: 'Conte com meu apoio!', matchedContact: { name: 'João Pedro', id: '2' } },
    { username: 'ana_claudia', count: Math.floor(28 * multiplier), lastComment: 'Bairro de Copacabana precisa disso.' },
    { username: 'carlos_edu', count: Math.floor(15 * multiplier), lastComment: 'Vou compartilhar no meu grupo.' },
    { username: 'beatriz_lopes', count: Math.floor(12 * multiplier), lastComment: 'Parabéns pelo trabalho.' }
  ];
};

const InstagramRankingPage: React.FC = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [period, setPeriod] = React.useState('7d');
  const [ranking, setRanking] = React.useState<RankingItem[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const campaignId = user?.campaignId || user?.campaign_id;
      if (!campaignId) {
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('campanhapro-mysql-token');
      const response = await fetch(`/api/social/status?campaignId=${campaignId}&provider=meta`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      setIsConnected(result.connected);
    } catch (err) {
      console.error('Erro ao verificar conexão:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.campaignId, user?.campaign_id]);

  React.useEffect(() => {
    if (user) checkConnection();
  }, [user, checkConnection]);

  // handleSearch memoizado para evitar re-criação e loops em deps
  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setError(null);
    try {
      const campaignId = user?.campaignId || user?.campaign_id || 'demo';
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      let data: any = null;

      // 1. Tenta buscar os dados reais do Express Backend
      try {
        const token = localStorage.getItem('campanhapro-mysql-token');
        const response = await fetch('/api/instagram/ranking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ campaign_id: campaignId, period })
        });
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Erro na requisição ao backend');
        }
        
        data = await response.json();
      } catch (fErr) {
        console.warn('[Instagram] Falha na API do Express, usando fallback...', fErr);
        if (!isLocal) throw fErr;
        data = { ranking: [] };
      }

      // 2. Busca contatos com instagram_handle preenchido (com try-catch para caso a coluna não exista)
      let contactsData: any[] = [];
      /* DESATIVADO TEMPORARIAMENTE PARA EVITAR ERRO 400 NO CONSOLE: A coluna instagram_handle ainda não existe
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, name, instagram_handle')
          .eq('campaign_id', campaignId)
          .not('instagram_handle', 'is', null);
        if (!error && data) contactsData = data;
      } catch (err) {
        console.warn('Tabela contacts não possui instagram_handle ou não existe.', err);
      }
      */

      // 3. Faz o cruzamento de dados
      const rankingSource = (data?.ranking && data.ranking.length > 0) ? data.ranking : (isLocal ? getMockRanking(period) : []);
      
      const rankingWithMatches = rankingSource.map((item: any) => {
        const match = contactsData?.find((c: any) => c.instagram_handle === item.username.toLowerCase());
        return {
          ...item,
          matchedContact: match ? { name: match.name, id: match.id } : undefined
        };
      });

      setRanking(rankingWithMatches);
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Erro ao buscar dados do Instagram. Verifique sua conexão ou se o Instagram está vinculado.');
    } finally {
      setIsSearching(false);
    }
  }, [user?.campaignId, user?.campaign_id, period]);

  // Dispara busca inicial quando conectar pela primeira vez ou quando mudar o período
  React.useEffect(() => {
    if (isConnected && !isSearching) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, period]);

  const handleConnect = async () => {
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Abre janela imediatamente para evitar bloqueio de pop-up
    const authWindow = window.open('about:blank', 'Instagram Auth', `width=${width},height=${height},left=${left},top=${top}`);
    
    if (authWindow) {
      authWindow.document.write('<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#0f172a;color:#94a3b8;">Carregando conexão segura...</div>');
    }

    const currentCampaignId = user?.campaignId || user?.campaign_id || 'demo';
    console.log('[Instagram] Iniciando conexão para Campaign:', currentCampaignId);

    try {
      const response = await fetch(`/api/auth/meta/url?campaignId=${currentCampaignId}`);
      const result = await response.json();
      
      if (result.error || !result.url) {
        authWindow?.close();
        throw new Error(result.error || 'Falha ao obter URL de autenticação');
      }
      
      if (authWindow) {
        authWindow.location.href = result.url;
      }
      
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'META_AUTH_SUCCESS') {
          setIsConnected(true);
          window.removeEventListener('message', messageHandler);
        }
      };
      
      window.addEventListener('message', messageHandler);
    } catch (err: any) {
      console.error('[Instagram Auth Error]:', err);
      authWindow?.close();
      setError(`Falha ao iniciar conexão com Instagram: ${err.message || 'Verifique se o servidor de backend está rodando'}`);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Tem certeza que deseja desconectar sua conta do Instagram?')) return;
    
    try {
      const campaignId = user?.campaignId || user?.campaign_id;
      const token = localStorage.getItem('campanhapro-mysql-token');

      const response = await fetch('/api/social/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId, provider: 'meta' })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao desconectar');
      }

      setIsConnected(false);
      setRanking([]);
    } catch (err: any) {
      setError('Erro ao desconectar: ' + err.message);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Instagram className="w-8 h-8 text-slate-50" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-50">Ranking de Engajamento</h1>
              <p className="text-slate-400">Monitore os seguidores mais ativos nos comentários</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            ) : !isConnected ? (
              <button 
                onClick={handleConnect}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-slate-50 rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/20"
              >
                <Instagram className="w-5 h-5" />
                Conectar Instagram
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Instagram Conectado
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                >
                  Sair / Desconectar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-3">
            <Calendar className="w-4 h-4" />
            Período de Análise
          </label>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all appearance-none"
          >
            <option value="24h">Últimas 24 horas</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="all">Todo o período</option>
          </select>
        </div>

        <div className="md:col-span-2 flex items-end">
          <button 
            onClick={handleSearch}
            disabled={!isConnected || isSearching}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all shadow-lg
              ${!isConnected 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-white text-slate-900 hover:bg-slate-100 shadow-white/10 active:scale-[0.98]'
              }`}
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processando Comentários...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Buscar e Calcular Ranking
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {ranking.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h2 className="font-bold text-slate-50 text-lg">Top Apoiadores</h2>
              </div>
              <span className="text-sm text-slate-400">
                {ranking.length} perfis encontrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-500 text-sm border-b border-slate-700/50">
                    <th className="px-6 py-4 font-medium">Posição</th>
                    <th className="px-6 py-4 font-medium">Usuário</th>
                    <th className="px-6 py-4 font-medium text-center">Interações</th>
                    <th className="px-6 py-4 font-medium">Último Insight</th>
                    <th className="px-6 py-4 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {ranking.map((item, index) => (
                    <motion.tr 
                      key={item.username}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                            index === 1 ? 'bg-slate-400/20 text-slate-300' :
                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                            'bg-slate-700/30 text-slate-500'}`}
                        >
                          {index + 1}º
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100 block">@{item.username}</span>
                              {item.matchedContact && (
                                <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">
                                  CRM Match
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {item.matchedContact 
                                ? `Lead: ${item.matchedContact.name}` 
                                : 'Apoiador Fiel'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 rounded-full text-sm font-bold border border-purple-500/20">
                          <MessageCircle className="w-3.5 h-3.5" />
                          {item.count}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-400 line-clamp-1 italic">
                          "{item.lastComment}"
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => window.open(`https://instagram.com/${item.username}`, '_blank')}
                          className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition-all"
                          title="Abrir perfil no Instagram"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 bg-slate-800/20 text-center">
              <button 
                onClick={() => alert('O relatório completo avançado estará disponível no módulo de Analytics.')}
                className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                Ver relatório completo de engajamento
              </button>
            </div>
          </motion.div>
        ) : !isSearching && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center space-y-4"
          >
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
              <TrendingUp className="w-10 h-10 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-300">Nenhum dado para exibir</h3>
              <p className="text-slate-500 max-w-xs">
                {isConnected 
                  ? 'Clique no botão acima para buscar os comentários mais recentes.' 
                  : 'Conecte sua conta do Instagram para começar a monitorar o engajamento.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default InstagramRankingPage;
