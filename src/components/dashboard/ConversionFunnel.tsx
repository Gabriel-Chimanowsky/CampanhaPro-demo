import React, { useEffect, useState } from 'react';
import { getConversionFunnelStats, FunnelStats } from '../../services/intelligenceService';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Target, Heart, Star, TrendingUp } from 'lucide-react';

const ConversionFunnel: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FunnelStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.campaignId) return;
    fetchStats();
  }, [user?.campaignId]);

  const fetchStats = async () => {
    const data = await getConversionFunnelStats(user!.campaignId!);
    setStats(data);
    setLoading(false);
  };

  const getConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current / previous) * 100).toFixed(1);
  };

  const getIcon = (stage: string) => {
    switch (stage) {
      case 'capturado': return <Users className="w-4 h-4" />;
      case 'contato_validado': return <Target className="w-4 h-4" />;
      case 'interessado': return <TrendingUp className="w-4 h-4" />;
      case 'apoiador_confirmado': return <Heart className="w-4 h-4" />;
      case 'multiplicador': return <Star className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getColor = (index: number) => {
    const colors = [
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    ];
    return colors[index] || colors[0];
  };

  if (loading) return <div className="p-4 text-slate-500 animate-pulse">Calculando funil...</div>;

  const total = stats.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" /> Funil de Conversão
        </h3>
        <span className="text-[10px] text-slate-500">Total: {total}</span>
      </div>

      <div className="flex flex-col gap-1">
        {stats.map((item, idx) => {
          const width = 100 - (idx * 8); 

          return (
            <div key={item.stage} className="space-y-1">
              <div 
                className={`relative border rounded-xl p-2.5 transition-all hover:scale-[1.02] ${getColor(idx)}`}
                style={{ width: `${width}%`, marginLeft: `${(100 - width) / 2}%` }}
              >
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                    {getIcon(item.stage)}
                    <span className="text-[9px] font-bold uppercase truncate">{item.stage.replace('_', ' ')}</span>
                  </div>
                  <span className="font-black text-sm">{item.count}</span>
                </div>
                <div className="absolute inset-0 bg-white/5 rounded-xl opacity-30" />
              </div>
              {idx < stats.length - 1 && item.count > 0 && (
                <div className="text-[9px] text-slate-500 flex justify-center items-center gap-1 py-0.5">
                   <TrendingUp className="w-2 h-2" /> {getConversionRate(stats[idx+1].count, item.count)}% de conversão
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-slate-500 italic text-center mt-2 border-t border-slate-700/50 pt-2">
        {stats.length > 1
          ? `* Métrica de eficiência: ${getConversionRate(stats[stats.length-1].count, stats[0].count)}% (Geral)`
          : '* Aguardando dados do funil de conversão...'}
      </p>
    </div>
  );
};

export default ConversionFunnel;
