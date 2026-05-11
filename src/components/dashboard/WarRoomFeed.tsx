import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles, MessageSquare,
  MapPin, Zap, ChevronRight, Bot
} from 'lucide-react';

interface WarRoomInsight {
  id: string;
  sourceAgent: string;
  category: string;
  priority: string;
  insightText: string;
  metadata: any;
  createdAt: string;
}

const WarRoomFeed: React.FC = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<WarRoomInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.campaignId) return;
    fetchInsights();

    const subscription = supabase
      .channel(`war-room-${user.campaignId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'war_room_intelligence',
        filter: `campaign_id=eq.${user.campaignId || user.campaign_id}` 
      }, (payload: any) => {
        setInsights(prev => [payload.new as WarRoomInsight, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.campaignId]);

  const fetchInsights = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/war-room/feed?campaign_id=${user?.campaignId || user?.campaign_id}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error("Erro ao carregar feed da War Room:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'CRITICO': return 'border-red-500 text-red-400 bg-red-500/10';
      case 'ALTA': return 'border-orange-500 text-orange-400 bg-orange-500/10';
      default: return 'border-blue-500 text-blue-400 bg-blue-500/10';
    }
  };

  const getAgentIcon = (agent: string) => {
    if (agent.includes('CRM')) return <MessageSquare className="w-4 h-4" />;
    if (agent.includes('Strategist')) return <Zap className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  return (
    <div className="bg-slate-800/80 rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-slate-700/50 bg-white/[0.02] flex justify-between items-center">
        <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest text-slate-400">
          <Sparkles className="w-4 h-4 text-yellow-400" /> IA War Room Feed
        </h3>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-10 text-center text-slate-500 text-xs italic">Sincronizando com a Sala de Guerra...</div>
        ) : insights.length === 0 ? (
          <div className="py-10 text-center text-slate-600 text-xs italic">
            Nenhum insight compartilhado nas últimas 48h.
          </div>
        ) : (
          insights.map((item) => (
            <div key={item.id} className={`p-4 rounded-2xl border-l-4 ${getPriorityColor(item.priority)} bg-white/[0.02] hover:bg-white/[0.04] transition-all group`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-black/40 rounded-lg text-slate-50/70">
                    {getAgentIcon(item.sourceAgent)}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-50/50">{item.sourceAgent}</span>
                </div>
                <span className="text-[10px] text-slate-600">{new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
              
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {item.insightText}
              </p>

              {item.metadata?.neighborhood && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
                  <MapPin className="w-3 h-3" /> {item.metadata.neighborhood}
                </div>
              )}

              <div className="flex justify-end">
                <button className="text-[10px] font-bold flex items-center gap-1 text-blue-400 group-hover:underline">
                  Ver Estratégia <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-black/40 border-t border-slate-700/50">
        <p className="text-[9px] text-slate-500 text-center">
          As IAs estão processando dados de CRM e Pesquisa em tempo real para otimizar o ROI da campanha.
        </p>
      </div>
    </div>
  );
};

export default WarRoomFeed;
