import React, { useEffect, useState } from 'react';
import { getTerritorialAlerts, TerritorialGap } from '../../services/intelligenceService';
import { useAuth } from '../../contexts/AuthContext';
import { AlertTriangle, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TerritorialAlerts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<TerritorialGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.campaignId && !user?.campaign_id) return;
    fetchAlerts();
  }, [user]);

  const fetchAlerts = async () => {
    const campaignId = user?.campaign_id || user?.campaignId;
    const data = await getTerritorialAlerts(campaignId!);
    setAlerts(data);
    setLoading(false);
  };

  if (loading) return <div className="p-4 text-slate-500 animate-pulse text-xs">Analisando território...</div>;

  const criticalAlerts = alerts.filter(a => a.risk_level === 'Critical' || a.risk_level === 'High');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" /> Alertas Territoriais
        </h3>
        <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-bold">
          {criticalAlerts.length} Críticos
        </span>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 4).map((alert) => (
          <div 
            key={alert.neighborhood} 
            className="bg-black/20 border border-slate-700/50 rounded-2xl p-3 hover:border-orange-500/30 transition-all group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <MapPin className={`w-3 h-3 ${alert.risk_level === 'Critical' ? 'text-red-500' : 'text-orange-400'}`} />
                <span className="text-xs font-bold text-slate-200">{alert.neighborhood}</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-50 transition-colors" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Gap de Visitas</p>
                <p className={`text-sm font-black ${alert.risk_level === 'Critical' ? 'text-red-400' : 'text-orange-400'}`}>
                  {alert.gap_percentage.toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Votos Potenciais</p>
                <p className="text-sm font-black text-blue-400">{alert.potential_votes}</p>
              </div>
            </div>

            <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${alert.risk_level === 'Critical' ? 'bg-red-500' : 'bg-orange-500'}`} 
                style={{ width: `${alert.gap_percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {alerts.length > 4 && (
        <button 
          onClick={() => navigate('/app/alertas-urbano')}
          className="w-full text-center py-2 text-[10px] text-slate-500 hover:text-slate-50 transition-colors"
        >
          Ver todos os {alerts.length} alertas →
        </button>
      )}
    </div>
  );
};

export default TerritorialAlerts;
