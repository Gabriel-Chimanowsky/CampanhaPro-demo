import React, { useEffect, useState } from 'react';
import { generateEngagementTasks, EngagementTask } from '../../services/engagementService';
import { useAuth } from '../../contexts/AuthContext';
import { CheckSquare, Send, MapPin, MessageSquare, AlertCircle } from 'lucide-react';
import Card from '../ui/Card';

const TeamTasksWidget: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<EngagementTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.campaignId) return;
    fetchTasks();
  }, [user?.campaignId]);

  const fetchTasks = async () => {
    const data = await generateEngagementTasks(user!.campaignId!);
    setTasks(data);
    setLoading(false);
  };

  const handleWhatsApp = (task: EngagementTask) => {
    const text = `Olá ${task.contact_name}, ${task.nba}`;
    const url = `https://wa.me/${task.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) return <div className="p-4 text-slate-500 animate-pulse">Gerando tarefas de engajamento...</div>;

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-500/5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg shrink-0">
            <CheckSquare className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Tarefas de Engajamento (IA)</h3>
        </div>
        <span className="shrink-0 text-[9px] bg-blue-600 text-white px-2 py-1 rounded-full font-black whitespace-nowrap shadow-lg shadow-blue-500/20">
          {tasks.length} PENDENTES
        </span>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4 italic">
            <AlertCircle className="w-4 h-4" />
            Nenhuma tarefa urgente no momento.
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-slate-900/60 rounded-xl p-3 border border-blue-500/10 hover:border-blue-500/30 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs font-bold text-slate-50">{task.contact_name}</p>
                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                    <MapPin className="w-2.5 h-2.5" /> {task.neighborhood || 'Bairro N/I'}
                  </div>
                </div>
                <button 
                  onClick={() => handleWhatsApp(task)}
                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-50 transition-all border border-emerald-500/20"
                  title="Enviar via WhatsApp"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2 mb-2">
                <p className="text-[10px] text-blue-300 font-bold mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Recomendação:
                </p>
                <p className="text-[10px] text-slate-400 leading-tight italic line-clamp-2">
                  "{task.nba}"
                </p>
              </div>
              
              <p className="text-[9px] text-slate-500 italic">
                Motivo: {task.reason}
              </p>
            </div>
          ))
        )}
      </div>
      
      <button 
        onClick={fetchTasks}
        className="w-full mt-4 py-2 border-t border-slate-700/50 text-[10px] text-slate-500 hover:text-blue-400 transition-colors uppercase font-bold tracking-widest"
      >
        Atualizar Lista
      </button>
    </Card>
  );
};

export default TeamTasksWidget;
