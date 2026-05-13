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
    const containerRef = React.useRef<HTMLDivElement>(null);
    
    const chartHeight = 350;
    const chartWidth = 1000; // Maior largura base para melhor distribuição
    const padding = { top: 30, right: 40, bottom: 60, left: 50 };
    
    const maxVisits = Math.max(...data.map(d => d.visits), 0);
    const maxVotes = Math.max(...data.map(d => d.votes), 0);
    const yMax = Math.max(maxVisits, maxVotes, 5);
    
    const yScale = (value: number) => chartHeight - padding.bottom - (value / yMax) * (chartHeight - padding.top - padding.bottom);
    const spacing = (chartWidth - padding.left - padding.right) / Math.max(data.length, 1);
    const barWidth = Math.max(Math.min(spacing * 0.4, 35), 15);

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
        <div ref={containerRef} className="relative w-full overflow-hidden group">
            <div className="w-full overflow-x-auto custom-scrollbar">
                <svg 
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                    className="w-full h-full min-w-[800px] select-none transition-all duration-500"
                    preserveAspectRatio="xMinYMin meet"
                >
                    <defs>
                        <linearGradient id="gradVisits" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#00d2ff" />
                            <stop offset="100%" stopColor="#3a7bd5" />
                        </linearGradient>
                        <linearGradient id="gradVotes" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#00f2fe" />
                            <stop offset="100%" stopColor="#4facfe" />
                        </linearGradient>
                        <linearGradient id="gradVotesPositive" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#43e97b" />
                            <stop offset="100%" stopColor="#38f9d7" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Y Axis Grid */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                        const val = Math.round(yMax * p);
                        const y = yScale(val);
                        return (
                            <g key={i} className="opacity-20">
                                <line 
                                    x1={padding.left} 
                                    x2={chartWidth - padding.right} 
                                    y1={y} 
                                    y2={y} 
                                    stroke="#94a3b8" 
                                    strokeWidth="1" 
                                    strokeDasharray="5 5" 
                                />
                                <text x={padding.left - 15} y={y + 5} textAnchor="end" className="text-[12px] fill-slate-400 font-black">{val}</text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {data.map((d, i) => {
                        const x = padding.left + i * spacing + spacing / 2;
                        const visitY = yScale(d.visits);
                        const voteY = yScale(d.votes);
                        const base = chartHeight - padding.bottom;
                        const isHovered = hoveredIndex === i;

                        return (
                            <g key={i} onMouseMove={(e) => handleMouseMove(e, i)} onMouseLeave={() => setHoveredIndex(null)} className="transition-all duration-300">
                                {/* Hit area */}
                                <rect x={x - spacing / 2} y={padding.top} width={spacing} height={chartHeight - padding.top - padding.bottom} fill="transparent" className="cursor-pointer" />
                                
                                {/* Visits Bar */}
                                <rect 
                                    x={x - barWidth - 2} 
                                    y={visitY} 
                                    width={barWidth} 
                                    height={Math.max(base - visitY, 2)} 
                                    fill="url(#gradVisits)" 
                                    rx="4" 
                                    className="transition-all duration-500 ease-out"
                                    style={{ 
                                        filter: isHovered ? 'url(#glow)' : 'none',
                                        opacity: hoveredIndex !== null && !isHovered ? 0.3 : 1,
                                        transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                                        transformOrigin: `${x}px ${base}px`
                                    }} 
                                />

                                {/* Votes Bar */}
                                <rect 
                                    x={x + 2} 
                                    y={voteY} 
                                    width={barWidth} 
                                    height={Math.max(base - voteY, 2)} 
                                    fill="url(#gradVotesPositive)" 
                                    rx="4" 
                                    className="transition-all duration-500 ease-out"
                                    style={{ 
                                        filter: isHovered ? 'url(#glow)' : 'none',
                                        opacity: hoveredIndex !== null && !isHovered ? 0.3 : 1,
                                        transform: isHovered ? 'scaleY(1.02)' : 'scaleY(1)',
                                        transformOrigin: `${x}px ${base}px`
                                    }} 
                                />

                                {/* X Label (Data) */}
                                {(i % Math.ceil(data.length / 12) === 0 || isHovered) && (
                                    <text 
                                        x={x} 
                                        y={chartHeight - 25} 
                                        textAnchor="middle" 
                                        className={`text-[11px] transition-all duration-300 font-black ${isHovered ? 'fill-blue-400' : 'fill-slate-500'}`}
                                    >
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

                {/* Custom Premium Tooltip */}
                {hoveredIndex !== null && data[hoveredIndex] && (
                    <div 
                        className="absolute z-[100] pointer-events-none bg-slate-900/95 border border-slate-700/50 p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-200"
                        style={{ 
                            left: Math.min(tooltipPos.x + 20, (containerRef.current?.clientWidth || 1000) - 160), 
                            top: Math.max(10, Math.min(tooltipPos.y - 120, chartHeight - 140)) 
                        }}
                    >
                        <div className="flex items-center justify-between gap-4 mb-3 border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {(() => {
                                    const p = data[hoveredIndex].date.split('-');
                                    return `${p[2]}/${p[1]}/${p[0]}`;
                                })()}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                                    <span className="text-xs text-slate-300 font-bold">Visitas</span>
                                </div>
                                <span className="text-sm text-white font-black">{data[hoveredIndex].visits}</span>
                            </div>
                            <div className="flex justify-between items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                                    <span className="text-xs text-slate-300 font-bold">Votos</span>
                                </div>
                                <span className="text-sm text-white font-black">{data[hoveredIndex].votes}</span>
                            </div>
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
        <Card className="p-4 sm:p-6 shadow-2xl border-slate-700/30 bg-slate-900/40 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <div className="text-8xl font-black text-white select-none uppercase tracking-tighter">DATA</div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h3 className="font-black text-xl text-slate-100 tracking-tight">Progresso Diário</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Visitas e Votos Realizados</p>
                </div>

                <div className="flex flex-wrap gap-2 no-print">
                    <select value={municipioFilter} onChange={e => { setMunicipioFilter(e.target.value); setBairroFilter(''); }} className="bg-slate-800/80 text-[11px] font-bold text-slate-300 border border-slate-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 transition-all outline-none">
                        <option value="">Municípios</option>
                        {allMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={bairroFilter} onChange={e => setBairroFilter(e.target.value)} className="bg-slate-800/80 text-[11px] font-bold text-slate-300 border border-slate-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 transition-all outline-none">
                        <option value="">Bairros</option>
                        {allBairros.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select value={apoiadorFilter} onChange={e => setApoiadorFilter(e.target.value)} className="bg-slate-800/80 text-[11px] font-bold text-slate-300 border border-slate-700 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 transition-all outline-none">
                        <option value="">Apoiadores</option>
                        {allApoiadores.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {data.length > 0 ? <AnimatedBarChart data={data} /> : (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                        <div className="w-6 h-6 border-2 border-slate-600 rounded" />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest italic">Aguardando dados de performance...</p>
                </div>
            )}
        </Card>
    );
};

export default ProgressChart;