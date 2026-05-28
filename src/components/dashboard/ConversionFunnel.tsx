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



  if (loading) return <div className="p-4 text-slate-500 animate-pulse">Calculando funil...</div>;

  const total = stats.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          </div>
          Funil de Conversão
        </h3>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Total Geral</span>
          <span className="text-lg font-black text-white leading-none">{total}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between py-2 gap-2">
        {stats.map((item, idx) => {
          const width = 100 - (idx * 6); 
          const colors = [
            'from-blue-600/40 to-blue-400/10 border-blue-400/30 text-blue-300 shadow-blue-500/10',
            'from-indigo-600/40 to-indigo-400/10 border-indigo-400/30 text-indigo-300 shadow-indigo-500/10',
            'from-purple-600/40 to-purple-400/10 border-purple-400/30 text-purple-300 shadow-purple-500/10',
            'from-emerald-600/40 to-emerald-400/10 border-emerald-400/30 text-emerald-300 shadow-emerald-500/10',
            'from-amber-600/40 to-amber-400/10 border-amber-400/30 text-amber-300 shadow-amber-500/10'
          ];
          const currentColor = colors[idx] || colors[0];

          return (
            <div key={item.stage} className="relative group">
              <div 
                className={`relative overflow-hidden bg-gradient-to-r ${currentColor} border backdrop-blur-md rounded-2xl p-4 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-2xl shadow-lg flex items-center justify-between`}
                style={{ 
                  width: `${width}%`, 
                  marginLeft: `${(100 - width) / 2}%`,
                }}
              >
                {/* Background Pattern */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)]" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-black/20 rounded-xl shadow-inner">
                    {getIcon(item.stage)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-0.5">{item.stage.replace('_', ' ')}</span>
                    <span className="text-base font-black leading-none">{item.count}</span>
                  </div>
                </div>

                {idx < stats.length - 1 && item.count > 0 && (
                  <div className="flex flex-col items-end relative z-10">
                    <span className="text-[7px] font-black uppercase tracking-tighter opacity-40">Conversão</span>
                    <div className="flex items-center gap-1 text-xs font-black">
                      <TrendingUp className="w-3 h-3" />
                      {getConversionRate(stats[idx+1].count, item.count)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-white/5">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Métrica de Eficiência Global</span>
          </div>
          <span className="text-sm font-black text-blue-400">
            {stats.length > 1 ? `${getConversionRate(stats[stats.length-1].count, stats[0].count)}%` : '0%'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnel;
