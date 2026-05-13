import * as React from 'react';
import Card from '../ui/Card';

interface PesquisaChartProps {
    // Para simplificar, vou assumir uma prop que recebe os dados.
    // Você vai plugar isso onde armazenar os dados de pesquisa.
    data: any[]; 
}

const SimpleDoughnutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let cumulativeAngle = 0;

    if (total === 0) {
        return (
            <div className="relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="transparent" stroke="#334155" strokeWidth="12" strokeDasharray="2,2" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem Registros</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase mt-1">Aguardando Pesquisas</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90">
                {data.map((d, i) => {
                    const angle = (d.value / total) * 360;
                    if (angle === 0) return null;
                    
                    const radians = (cumulativeAngle * Math.PI) / 180;
                    const x = 50 + 38 * Math.cos(radians);
                    const y = 50 + 38 * Math.sin(radians);
                    const largeArc = angle > 180 ? 1 : 0;
                    const endRadians = ((cumulativeAngle + angle) * Math.PI) / 180;
                    const endX = 50 + 38 * Math.cos(endRadians);
                    const endY = 50 + 38 * Math.sin(endRadians);
                    
                    const path = `M ${x} ${y} A 38 38 0 ${largeArc} 1 ${endX} ${endY}`;
                    cumulativeAngle += angle;
                    
                    return (
                        <path 
                            key={i} 
                            d={path} 
                            fill="transparent" 
                            stroke={d.color} 
                            strokeWidth="12" 
                            strokeDasharray={angle === 360 ? 'none' : undefined}
                            className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Amostra</span>
                <span className="text-xl font-black text-white">{total}</span>
            </div>
        </div>
    );
};

const PesquisaChart: React.FC<PesquisaChartProps> = ({ data }) => {
    const votingData = React.useMemo(() => {
        const counts = data.reduce((acc, curr) => {
            const vote = (curr.intencaoVoto || curr.intencao_voto || 'indeciso').toLowerCase();
            acc[vote] = (acc[vote] || 0) + 1;
            return acc;
        }, {} as any);
        
        return [
            { label: 'Candidato', value: counts['candidato'] || 0, color: '#3b82f6' },
            { label: 'Outros', value: counts['outro'] || counts['outros'] || 0, color: '#f59e0b' },
            { label: 'Indeciso', value: counts['indeciso'] || 0, color: '#64748b' },
        ];
    }, [data]);

    return (
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-md p-6 h-full flex flex-col">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">
                Intenção de Voto (Pesquisa)
            </h3>
            
            <div className="flex-1 flex flex-col justify-center">
                <SimpleDoughnutChart data={votingData} />
            </div>

            <div className="mt-8 space-y-2">
                {votingData.map(d => (
                    <div key={d.label} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: d.color, boxShadow: `0 0 10px ${d.color}44` }}></div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-200 transition-colors">{d.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{d.value}</span>
                            <span className="text-[9px] font-bold text-slate-600 bg-black/20 px-1.5 py-0.5 rounded">
                                {data.length > 0 ? ((d.value / data.length) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default PesquisaChart;
