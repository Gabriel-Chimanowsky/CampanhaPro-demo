interface KpiGridProps {
  kpis: {
    total: number;
    realizadas: number;
    pendentes: number;
    votos: number;
    avgVotos: number;
    apoiadoresAtivos: number;
    totalAbordagens: number;
    totalMateriais: number;
  };
  currentScenarioStatus: {
    name: string;
    color: string;
    avg: number;
  };
  isLoading?: boolean;
}

const KpiCard = ({ title, value, description, valueClassName = '', isLoading = false }: { title: string; value: React.ReactNode; description?: string, valueClassName?: string, isLoading?: boolean }) => (
  <div className="bg-slate-700/60 p-4 rounded-xl border border-white/10 flex flex-col h-[130px] shadow-lg">
    <div className="h-5 overflow-hidden">
      <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">{title}</p>
    </div>
    
    <div className="flex-1 flex flex-col justify-center">
      {isLoading ? (
          <div className="h-10 bg-slate-600/50 rounded w-1/2 animate-pulse"></div>
      ) : (
          <div className={`text-3xl font-black leading-tight ${valueClassName}`}>
            {value}
          </div>
      )}
    </div>
    
    <div className="h-5 flex items-end overflow-hidden">
      {!isLoading && description && (
          <p className="text-[11px] text-slate-300 font-semibold truncate opacity-90">{description}</p>
      )}
    </div>
  </div>
);

const KpiGrid = ({ kpis, currentScenarioStatus, isLoading = false }: KpiGridProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 print-break-inside-avoid">
    <KpiCard title="Visitas Realizadas" value={kpis.realizadas} description={`de ${kpis.total} totais`} valueClassName={kpis.total === 0 ? "text-slate-500" : "text-[#4ac7f0]"} isLoading={isLoading} />
    <KpiCard title="Votos" value={kpis.votos} description="Comprometidos" valueClassName={kpis.total === 0 ? "text-slate-500" : "text-[#1abc9c]"} isLoading={isLoading} />
    <KpiCard title="Média de Votos" value={kpis.avgVotos.toFixed(2)} description="por visita" isLoading={isLoading} />
    <KpiCard title="Apoiadores Ativos" value={kpis.apoiadoresAtivos} description="últimos 7 dias" isLoading={isLoading} />
    <KpiCard title="Total Abordagens" value={kpis.totalAbordagens} description="engajamento rápido" isLoading={isLoading} />
    <KpiCard title="Materiais Entregues" value={kpis.totalMateriais} description="panfletos, etc." isLoading={isLoading} />
    <KpiCard title="Visitas Pendentes" value={kpis.pendentes} valueClassName={kpis.total === 0 ? "text-slate-500" : "text-yellow-400"} isLoading={isLoading} />
    <KpiCard 
      title="Cenário Atual" 
      value={
        kpis.total === 0 && !isLoading ? '---' : (() => {
          const threshold = currentScenarioStatus.name.match(/\((.*?)\)/)?.[1] || '';
          const name = currentScenarioStatus.name.split(' (')[0];
          return (
            <div className="flex flex-col">
              <span className={`text-2xl font-black opacity-90 ${currentScenarioStatus.color}`}>{`(${threshold})`}</span>
              <span className={`text-sm font-bold mt-1 ${currentScenarioStatus.color}`}>{name}</span>
            </div>
          );
        })()
      } 
      description={`Média Real: ${currentScenarioStatus.avg.toFixed(2)}`} 
      isLoading={isLoading}
    />
  </div>
);

export default KpiGrid;