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

const KpiCard = ({ title, value, description, valueClassName = '', isLoading = false }: { title: string; value: string | number; description?: string, valueClassName?: string, isLoading?: boolean }) => (
  <div className="bg-slate-700/40 p-4 rounded-xl border border-white/5 h-full flex flex-col justify-start">
    <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2 h-4 overflow-hidden">{title}</p>
    <div className="flex-1 flex flex-col justify-center">
      {isLoading ? (
          <div className="h-8 bg-slate-600/50 rounded w-1/2 animate-pulse"></div>
      ) : (
          <p className={`text-2xl font-black ${valueClassName}`}>{value}</p>
      )}
    </div>
    {description && (
        <div className="mt-2 h-4 flex items-end">
          {isLoading ? (
              <div className="h-3 bg-slate-600/50 rounded w-3/4 animate-pulse"></div>
          ) : (
              <p className="text-[9px] text-slate-500 font-medium truncate">{description}</p>
          )}
        </div>
    )}
  </div>
);

const KpiGrid = ({ kpis, currentScenarioStatus, isLoading = false }: KpiGridProps) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 print-break-inside-avoid">
    <KpiCard title="Visitas Realizadas" value={kpis.realizadas} description={`de ${kpis.total} totais`} valueClassName={kpis.total === 0 ? "text-slate-500" : "text-[#4ac7f0]"} isLoading={isLoading} />
    <KpiCard title="Votos Comprometidos" value={kpis.votos} valueClassName={kpis.total === 0 ? "text-slate-500" : "text-[#1abc9c]"} isLoading={isLoading} />
    <KpiCard title="Média de Votos" value={kpis.avgVotos} description="por visita" isLoading={isLoading} />
    <KpiCard title="Apoiadores Ativos" value={kpis.apoiadoresAtivos} description="últimos 7 dias" isLoading={isLoading} />
    <KpiCard title="Total Abordagens" value={kpis.totalAbordagens} description="engajamento rápido" isLoading={isLoading} />
    <KpiCard title="Materiais Entregues" value={kpis.totalMateriais} description="panfletos, etc." isLoading={isLoading} />
    <KpiCard title="Visitas Pendentes" value={kpis.pendentes} valueClassName={kpis.total === 0 ? "text-slate-500" : "text-yellow-400"} isLoading={isLoading} />
    <KpiCard title="Cenário Atual" value={kpis.total === 0 && !isLoading ? 'Sem Dados' : currentScenarioStatus.name} valueClassName={`text-lg ${kpis.total === 0 ? "text-slate-500" : currentScenarioStatus.color}`} description={`Média: ${currentScenarioStatus.avg.toFixed(2)} votos`} isLoading={isLoading} />
  </div>
);

export default KpiGrid;