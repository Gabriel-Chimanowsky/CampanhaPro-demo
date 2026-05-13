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

// Componente de Gráfico de Barras SVG Moderno e Animado
const AnimatedBarChart = ({ data }: { data: { date: string; visits: number; votes: number }[] }) => {
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
    
    const chartHeight = 220;
    const chartWidth = 800;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    
    const maxVisits = Math.max(...data.map(d => d.visits), 0);
    const maxVotes = Math.max(...data.map(d => d.votes), 0);
    const yMax = Math.max(maxVisits, maxVotes, 5);
    
    const yScale = (value: number) => chartHeight - padding.bottom - (value / yMax) * (chartHeight - padding.top - padding.bottom);
    const spacing = (chartWidth - padding.left - padding.right) / data.length;
    const barWidth = Math.min(spacing * 0.35, 30);

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
            <div className="h-[225px] w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" className="min-w-[800px] select-none">
                    <defs>
                        <linearGradient id="gradVisits" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                        <linearGradient id="gradVotes" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#34d399" />
                            <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Linhas de Grade e Eixo Y */}
                    {Array.from({ length: 6 }).map((_, i) => {
                        const y = padding.top + i * ((chartHeight - padding.top - padding.bottom) / 5);
                        const value = Math.round(yMax * (1 - i / 5));
                        return (
                            <g key={i}>
                                <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#334155" strokeDasharray="3 6" strokeWidth="0.5" />
                                <text x={padding.left - 15} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="bold">{value}</text>
                            </g>
                        )
                    })}

                    {/* Barras Interativas */}
                    {data.map((d, i) => {
                        const x = padding.left + (i + 0.5) * spacing;
                        const hVisits = chartHeight - padding.bottom - yScale(d.visits);
                        const hVotes = chartHeight - padding.bottom - yScale(d.votes);
                        const isHovered = hoveredIndex === i;
                        
                        return (
                            <g key={d.date} 
                               onMouseMove={(e) => handleMouseMove(e, i)}
                               onMouseLeave={() => setHoveredIndex(null)}
                               className="transition-all duration-300"
                            >
                                {/* Background Highlight */}
                                {isHovered && (
                                    <rect x={x - spacing/2} y={padding.top - 10} width={spacing} height={chartHeight - padding.top - padding.bottom + 20} fill="#334155" fillOpacity="0.2" rx="8" />
                                )}

                                {/* Barra Visitas */}
                                <rect
                                    x={x - barWidth - 3}
                                    y={yScale(d.visits)}
                                    width={barWidth}
                                    height={hVisits}
                                    fill="url(#gradVisits)"
                                    rx="6"
                                    className="transition-all duration-500"
                                    style={{ filter: isHovered ? 'url(#glow)' : 'none' }}
                                >
                                    <animate attributeName="height" from="0" to={hVisits} dur={`${0.5 + i * 0.05}s`} fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1" />
                                    <animate attributeName="y" from={chartHeight - padding.bottom} to={yScale(d.visits)} dur={`${0.5 + i * 0.05}s`} fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1" />
                                </rect>

                                {/* Barra Votos */}
                                <rect
                                    x={x + 3}
                                    y={yScale(d.votes)}
                                    width={barWidth}
                                    height={hVotes}
                                    fill="url(#gradVotes)"
                                    rx="6"
                                    className="transition-all duration-500"
                                    style={{ filter: isHovered ? 'url(#glow)' : 'none' }}
                                >
                                    <animate attributeName="height" from="0" to={hVotes} dur={`${0.7 + i * 0.05}s`} fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1" />
                                    <animate attributeName="y" from={chartHeight - padding.bottom} to={yScale(d.votes)} dur={`${0.7 + i * 0.05}s`} fill="freeze" calcMode="spline" keySplines="0.42 0 0.58 1" />
                                </rect>

                                 <text x={x} y={chartHeight - padding.bottom + 25} textAnchor="middle" fill={isHovered ? "#f8fafc" : "#64748b"} fontSize="11" fontWeight={isHovered ? "bold" : "600"} className="transition-colors">
                                    {(() => {
                                        try {
                                            const baseDate = d.date.includes('T') ? d.date.split('T')[0] : d.date;
                                            const parts = baseDate.split(/[-/]/);
                                            // Handle YYYY-MM-DD or DD-MM-YYYY
                                            let dateObj;
                                            if (parts[0].length === 4) {
                                                dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                            } else {
                                                dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                                            }
                                            return isNaN(dateObj.getTime()) ? d.date : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                        } catch (e) {
                                            return d.date;
                                        }
                                    })()}
                                </text>
                            </g>
                        )
                    })}
                    
                    {/* Linha de base */}
                    <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke="#475569" strokeWidth="2" strokeLinecap="round" />
                </svg>

                {/* Tooltip Customizado (Floating HTML) */}
                {hoveredIndex !== null && (
                    <div 
                        className="pointer-events-none absolute z-50 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md min-w-[140px]"
                        style={{ 
                            left: Math.min(tooltipPos.x + 20, chartWidth - 160), 
                            top: Math.min(tooltipPos.y - 80, chartHeight - 100),
                            transform: 'translateY(-50%)'
                        }}
                    >
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                            {(() => {
                                try {
                                    const baseDate = data[hoveredIndex].date.includes('T') ? data[hoveredIndex].date.split('T')[0] : data[hoveredIndex].date;
                                    const parts = baseDate.split(/[-/]/);
                                    let dateObj;
                                    if (parts[0].length === 4) {
                                        dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                    } else {
                                        dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                                    }
                                    return isNaN(dateObj.getTime()) ? data[hoveredIndex].date : dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                                } catch (e) {
                                    return data[hoveredIndex].date;
                                }
                            })()}
                        </p>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center gap-4">
                                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div> Visitas
                                </span>
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">{formatFullDate(data[hoveredIndex].date)}</p>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-[#4ac7f0]" />
                            <span className="text-xs text-slate-300 font-bold">Visitas</span>
                            <span className="ml-auto text-xs text-white font-black">{data[hoveredIndex].visits}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#1abc9c]" />
                            <span className="text-xs text-slate-300 font-bold">Votos</span>
                            <span className="ml-auto text-xs text-white font-black">{data[hoveredIndex].votes}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProgressChart: React.FC<ProgressChartProps> = ({ 
    filteredVisits, 
    municipioFilter, 
    setMunicipioFilter, 
    allMunicipios,
    bairroFilter,
    setBairroFilter,
    allBairros,
    apoiadorFilter,
    setApoiadorFilter,
    allApoiadores
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
                aggregated[date].votes += v.votos;
            }
        });

        return Object.values(aggregated).sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredVisits]);

    return (
        <Card className="p-3 sm:p-4 print-break-inside-avoid">
            <h3 className="font-bold text-base text-slate-300 mb-1">Progresso (Visitas e Votos / Dia)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-1 no-print">
                <select value={municipioFilter} onChange={e => { setMunicipioFilter(e.target.value); setBairroFilter(''); }} className="w-full bg-slate-700/50 text-xs border border-slate-600 rounded-md py-1 px-2">
                    <option value="">Todos os Municípios</option>
                    {allMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={bairroFilter} onChange={e => setBairroFilter(e.target.value)} className="w-full bg-slate-700/50 text-xs border border-slate-600 rounded-md py-1 px-2">
                    <option value="">Todos os Bairros</option>
                    {allBairros.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={apoiadorFilter} onChange={e => setApoiadorFilter(e.target.value)} className="w-full bg-slate-700/50 text-xs border border-slate-600 rounded-md py-1 px-2">
                    <option value="">Todos os Apoiadores</option>
                    {allApoiadores.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-4 mb-2 text-[10px] font-bold no-print">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#4ac7f0]" /> Visitas</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#1abc9c]" /> Votos</div>
            </div>
            
            {data.length > 0 ? (
                <AnimatedBarChart data={data} />
            ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                    <p>Sem dados de visitas realizadas.</p>
                </div>
            )}
        </Card>
    );
};

export default ProgressChart;