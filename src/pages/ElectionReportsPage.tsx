import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Filter, Map as MapIcon, ChevronRight, LayoutGrid, List, FileSpreadsheet, FileJson } from 'lucide-react';
import ElectionReportGenerator from '../components/election/ElectionReportGenerator';

interface ReportDef {
  id: string;
  title: string;
  category: string;
  type: string;
}

const reports: ReportDef[] = [
  { id: '1', title: 'Comparativo Geral: Voto Real vs Projeção', category: 'Macro', type: 'PDF' },
  { id: '2', title: 'Performance por Bairro: Top 10 Bairros', category: 'Geográfico', type: 'Excel' },
  { id: '3', title: 'Detalhamento por Zona Eleitoral', category: 'Técnico', type: 'PDF' },
  { id: '4', title: 'ROI da Campanha: Custo por Voto Real', category: 'Financeiro', type: 'Excel' },
  { id: '5', title: 'Relatório de Seções e Locais de Votação', category: 'Operacional', type: 'CSV' },
  { id: '6', title: 'Análise de Fidelidade da Base (Fiscais)', category: 'Equipe', type: 'PDF' },
];

const ElectionReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeReport, setActiveReport] = useState<ReportDef | null>(null);

  const handleOpenReport = (report: ReportDef) => {
    setActiveReport(report);
  };

  return (
    <>
      {activeReport && (
        <ElectionReportGenerator
          reportId={activeReport.id}
          reportTitle={activeReport.title}
          onClose={() => setActiveReport(null)}
        />
      )}

      <div className="space-y-6 text-slate-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="text-blue-400" />
              Analytics e Relatórios Eleitorais
            </h1>
            <p className="text-slate-400">Dados consolidados para auditoria e prestação de contas.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtros Avançados
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Zona Eleitoral</label>
                  <select className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500">
                    <option>Todas as Zonas</option>
                    <option>Zona 001</option>
                    <option>Zona 002</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Bairro</label>
                  <select className="w-full bg-black/40 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500">
                    <option>Todos os Bairros</option>
                    <option>Centro</option>
                    <option>Jardim América</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Status de Apuração</label>
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" defaultChecked className="rounded border-slate-700 bg-black/40" />
                      Finalizada (100%)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="checkbox" className="rounded border-slate-700 bg-black/40" />
                      Parcial
                    </label>
                  </div>
                </div>

                <button className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-sm font-bold transition-all mt-4">
                  Aplicar Filtros
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-emerald-600/20 p-6 rounded-2xl border border-blue-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                <MapIcon className="w-10 h-10 text-blue-400 mb-4" />
                <h4 className="font-bold mb-2">Relatório Geográfico</h4>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Exporte o mapa de calor completo com a densidade de votos por seção eleitoral.
                </p>
                <button
                  onClick={() => navigate('/app/dia-das-eleicoes')}
                  className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                >
                  Visualizar no Mapa <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
            </div>
          </div>

          {/* Report list */}
          <div className="md:col-span-3">
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-bold">Biblioteca de Relatórios</h3>
                <div className="text-xs text-slate-400">Exibindo {reports.length} documentos</div>
              </div>

              <div className={viewMode === 'list' ? 'divide-y divide-white/5' : 'grid grid-cols-1 md:grid-cols-2 gap-4 p-6'}>
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={`group transition-all cursor-pointer ${
                      viewMode === 'list'
                        ? 'p-4 flex items-center justify-between hover:bg-white/[0.02]'
                        : 'p-6 rounded-xl bg-white/5 border border-slate-700/50 hover:border-blue-500/30 hover:bg-white/[0.08]'
                    }`}
                    onClick={() => handleOpenReport(report)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        report.type === 'PDF' ? 'bg-red-500/10 text-red-400' :
                        report.type === 'Excel' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {report.type === 'PDF' ? <FileText className="w-6 h-6" /> :
                         report.type === 'Excel' ? <FileSpreadsheet className="w-6 h-6" /> :
                         <FileJson className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-blue-400 transition-colors">{report.title}</h4>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">{report.category}</p>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'mt-6' : ''}`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenReport(report); }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-slate-50 transition-all text-slate-400"
                        title="Gerar Relatório"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50">
                <h4 className="font-bold mb-4 flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
                  Resumo da Exportação
                </h4>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-black text-slate-50">{reports.length}</div>
                    <p className="text-xs text-slate-400">Relatórios disponíveis nesta campanha</p>
                  </div>
                  <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-full"></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50">
                <h4 className="font-bold mb-4 flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
                  Dados em Tempo Real
                </h4>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-4xl font-black text-slate-50">Live</div>
                    <p className="text-xs text-slate-400">Todos os relatórios usam dados ao vivo do Supabase</p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ElectionReportsPage;
