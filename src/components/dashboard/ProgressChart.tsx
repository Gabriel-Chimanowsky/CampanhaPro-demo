import * as React from 'react';
import Card from '../ui/Card';
import { Visit } from '../../types/visits';

interface ProgressChartProps {
    filteredVisits: Visit[];
    municipioFilter: string;
    setMunicipioFilter: (value: string) => void;
    allMunicipios: string[];
    bairroFilter: string;
    setBairroFilter: (value: string) => void;
    allBairros: string[];
    apoiadorFilter: string;
    setApoiadorFilter: (value: string) => void;
    allApoiadores: string[];
}

const AnimatedBarChart = ({ data }: { data: { date: string; visits: number; votes: number }[] }) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
    
    const chartHeight = 180;
    const chartWidth = 800;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    
    const maxVisits = Math.max(...data.map(d => d.visits), 0);
    const maxVotes = Math.max(...data.map(d => d.votes), 0);
    const yMax = Math.max(maxVisits, maxVotes, 5);
    
    const yScale = (value: number) => chartHeight - padding.bottom - (value / yMax) * (chartHeight - padding.top - padding.bottom);
    const spacing = (chartWidth - padding.left - padding.right) / data.length;
    const barWidth = Math.max(Math.min(spacing * 0.45, 30), 8);

    const handleMouseMove = (e: React.MouseEvent, index: number) => {
        const svg = e.currentTarget.closest('svg');
        if (svg) {
            const pt = svg.createSVGPoint();
            pt.x = e.clientX;
            pt.y = e.clientY;
            const cursorPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
            setTooltipPos({ x: cursorPt.x, y: cursorPt.y });
            setHoveredIndex(index);
        }
    };

    return (
        <div className="relative w-full overflow-hidden">
            <div className="h-[185px] w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="min-w-[800px] select-none">
                    <defs>
                        <linearGradient id="gradVisits" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4ac7f0" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="gradVotes" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#1abc9c" />
                            <stop offset="100%" stopColor="#0d9488" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                        const val = Math.round(yMax * p);
                        const y = yScale(val);
                        return (
                            <g key={i}>
                                <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} stroke="#334155" strokeWidth="0.5" strokeDasharray="4 4" />
                                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-500 font-bold">{val}</text>
                            </g>
                        );
                    })}

                    {data.map((d, i) => {
                        const x = padding.left + i * spacing + spacing / 2;
                        const visitY = yScale(d.visits);
                        const voteY = yScale(d.votes);
                        const base = chartHeight - padding.bottom;
                        const isHovered = hoveredIndex === i;

                        return (
                            <g key={i} onMouseMove={(e) => handleMouseMove(e, i)} onMouseLeave={() => setHoveredIndex(null)}>
                                <rect x={x - spacing / 2} y={padding.top} width={spacing} height={chartHeight - padding.top - padding.bottom} fill="transparent" className="cursor-pointer" />
                                <rect x={x - barWidth - 1} y={visitY} width={barWidth} height={Math.max(base - visitY, 2)} fill="url(#gradVisits)" rx="3" className="transition-all duration-300" style={{ filter: isHovered ? 'url(#glow)' : 'none' }} />
                                <rect x={x + 1} y={voteY} width={barWidth} height={Math.max(base - voteY, 2)} fill="url(#gradVotes)" rx="3" className="transition-all duration-300" style={{ filter: isHovered ? 'url(#glow)' : 'none' }} />
                                {i % (Math.ceil(data.length / 10)) === 0 && (
                                    <text x={x} y={chartHeight - 5} textAnchor="middle" className="text-[9px] fill-slate-500 font-bold">
                                        {(() => {
                                            const p = d.date.split('-');
                                            return `${p[2]}/${p[1]}`;
                                        })()}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {hoveredIndex !== null && data[hoveredIndex] && (
                    <div 
                        className="absolute z-50 pointer-events-none bg-slate-900/95 border border-slate-700 p-2 rounded-lg shadow-2xl backdrop-blur-sm min-w-[120px]"
                        style={{ 
                            left: Math.min(tooltipPos.x + 10, chartWidth - 130), 
                            top: Math.max(10, Math.min(tooltipPos.y - 80, chartHeight - 90)) 
                        }}
                    >
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">
                            {(() => {
                                const p = data[hoveredIndex].date.split('-');
                                return `${p[2]}/${p[1]}/${p[0]}`;
                            })()}
                        </p>
                        <div className="flex justify-between items-center gap-2 mb-1">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#4ac7f0]" /><span className="text-[10px] text-slate-300 font-bold">Visitas</span></div>
                            <span className="text-[10px] text-white font-black">{data[hoveredIndex].visits}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#1abc9c]" /><span className="text-[10px] text-slate-300 font-bold">Votos</span></div>
                            <span className="text-[10px] text-white font-black">{data[hoveredIndex].votes}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProgressChart: React.FC<ProgressChartProps> = ({ 
    filteredVisits, municipioFilter, setMunicipioFilter, allMunicipios,
    bairroFilter, setBairroFilter, allBairros,
    apoiadorFilter, setApoiadorFilter, allApoiadores
}) => {
    const data = React.useMemo(() => {
        const aggregated: Record<string, { date: string, visits: number, votes: number }> = {};
        filteredVisits.forEach(v => {
            const dateStr = v.data; 
            if (!dateStr) return;
            const date = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            if (!aggregated[date]) aggregated[date] = { date, visits: 0, votes: 0 };
            if (v.realizada === 'sim') {
                aggregated[date].visits++;
                aggregated[date].votes += (v.votos || 0);
            }
        });
        return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredVisits]);

    return (
        <Card className="p-3 sm:p-4 shadow-xl border-slate-700/50">
            <h3 className="font-bold text-base text-slate-300 mb-2">Progresso (Visitas e Votos / Dia)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 no-print">
                <select value={municipioFilter} onChange={e => { setMunicipioFilter(e.target.value); setBairroFilter(''); }} className="bg-slate-800/50 text-xs border border-slate-700 rounded-md py-1 px-2">
                    <option value="">Todos os Municípios</option>
                    {allMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={bairroFilter} onChange={e => setBairroFilter(e.target.value)} className="bg-slate-800/50 text-xs border border-slate-700 rounded-md py-1 px-2">
                    <option value="">Todos os Bairros</option>
                    {allBairros.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={apoiadorFilter} onChange={e => setApoiadorFilter(e.target.value)} className="bg-slate-800/50 text-xs border border-slate-700 rounded-md py-1 px-2">
                    <option value="">Todos os Apoiadores</option>
                    {allApoiadores.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            {data.length > 0 ? <AnimatedBarChart data={data} /> : (
                <div className="h-32 flex items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                    <p className="italic">Sem dados para exibir.</p>
                </div>
            )}
        </Card>
    );
};

export default ProgressChart;