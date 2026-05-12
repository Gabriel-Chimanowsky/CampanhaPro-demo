import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertTriangle, MapPin, Clock, User, 
    Search, Maximize2,
    CheckCircle2, Share2, Check, Loader2, Copy, Trash2
} from 'lucide-react';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for sentiments
const createColoredIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
};

const icons = {
    Positivo: createColoredIcon('#10b981'), // Green
    Neutro: createColoredIcon('#f59e0b'),   // Orange
    Negativo: createColoredIcon('#ef4444')  // Red
};

// Helper component to center map
const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const CityAlertsPage: React.FC = () => {
    const { user } = useAuth();
    const campaignId = user?.campaign_id || user?.campaignId || 'demo';
    
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'alerts' | 'team'>('alerts');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSentiment, setFilterSentiment] = useState<string | null>(null);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    
    const [mapCenter, setMapCenter] = useState<[number, number]>([-22.9068, -43.1729]);
    const [zoom, setZoom] = useState(12);
    
    const [copied, setCopied] = useState(false);

    // Stats for the header
    const stats = useMemo(() => ({
        total: alerts.length,
        positive: alerts.filter(a => a.clima === 'Positivo').length,
        neutral: alerts.filter(a => a.clima === 'Neutro').length,
        negative: alerts.filter(a => a.clima === 'Negativo').length
    }), [alerts]);

    const fetchAlerts = async () => {
        if (!campaignId) return;
        try {
            const { data, error } = await supabase
                .from('street_reports')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAlerts(data || []);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCollaborators = async () => {
        if (!campaignId) return;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('campaign_id', campaignId)
                .eq('type', 'Colaborador')
                .order('name', { ascending: true });

            if (error) throw error;
            setCollaborators(data || []);
        } catch (error) {
            console.error('Error fetching team:', error);
        }
    };

    useEffect(() => {
        fetchAlerts();
        fetchCollaborators();
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, [campaignId]);

    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            const matchesSearch = (alert.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  alert.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  alert.bairro?.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesSentiment = !filterSentiment || alert.clima === filterSentiment;
            return matchesSearch && matchesSentiment;
        });
    }, [alerts, searchQuery, filterSentiment]);

    const handleSelectAlert = (alert: any) => {
        setSelectedAlert(alert);
        if (alert.latitude && alert.longitude) {
            setMapCenter([alert.latitude, alert.longitude]);
            setZoom(16);
        }
    };

    const getStatusStyles = (clima: string) => {
        switch (clima) {
            case 'Positivo': return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
            case 'Negativo': return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
            default: return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const { error } = await supabase
            .from('street_reports')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (!error) {
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
            if (selectedAlert?.id === id) {
                setSelectedAlert({ ...selectedAlert, status: newStatus });
            }
        }
    };

    const handleRemoveCollaborator = async (colabId: string) => {
        if (!window.confirm('Tem certeza? Isso removerá o colaborador e TODOS os alertas dele permanentemente.')) return;
        
        try {
            const { error } = await supabase.from('users').delete().eq('id', colabId);
            if (error) throw error;
            
            setCollaborators(prev => prev.filter(c => c.id !== colabId));
            setAlerts(prev => prev.filter(a => a.userId !== colabId));
            if (selectedAlert?.userId === colabId) setSelectedAlert(null);
            
            alert('Colaborador e seus registros removidos com sucesso.');
        } catch (error) {
            console.error('Erro ao remover colaborador:', error);
            alert('Falha ao remover colaborador.');
        }
    };

    // Safe parser for mediaUrls
    const getMediaArray = (mediaData: any) => {
        if (!mediaData) return [];
        if (Array.isArray(mediaData)) return mediaData;
        try {
            const parsed = JSON.parse(mediaData);
            return Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            return typeof mediaData === 'string' ? [mediaData] : [];
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] bg-[#0f172a] rounded-[3.5rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.7)] relative">
            {/* Background Decorative Glow */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Sidebar with Tabs */}
            <div className="w-[450px] flex flex-col border-r border-white/10 bg-[#111827]/80 backdrop-blur-3xl z-20 shadow-2xl">
                {/* Header Section - Super Compact */}
                <div className="p-6 pb-4 bg-gradient-to-b from-white/[0.05] to-transparent">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                                <AlertTriangle size={18} className="text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tighter">RADAR URBANO</h2>
                        </div>
                        <div className="flex bg-black/50 p-1 rounded-xl border border-white/5">
                            <button onClick={() => setActiveTab('alerts')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'alerts' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Alertas</button>
                            <button onClick={() => setActiveTab('team')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeTab === 'team' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Equipe</button>
                        </div>
                    </div>

                    {activeTab === 'alerts' && (
                        <div className="space-y-4">
                            {/* Stats in a single row */}
                            <div className="flex gap-2">
                                {[
                                    { label: 'TOT', val: stats.total, color: 'text-white', bg: 'bg-white/5' },
                                    { label: 'POS', val: stats.positive, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                                    { label: 'NEU', val: stats.neutral, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                    { label: 'NEG', val: stats.negative, color: 'text-rose-400', bg: 'bg-rose-500/10' }
                                ].map((s, i) => (
                                    <div key={i} className={`flex-1 ${s.bg} px-2 py-2 rounded-xl border border-white/5 text-center`}>
                                        <p className="text-[7px] text-slate-500 font-black mb-0.5">{s.label}</p>
                                        <p className={`text-sm font-black ${s.color}`}>{s.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Search and Filters side by side or tighter */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                                    <input 
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/40 transition-all"
                                    />
                                </div>
                                <div className="flex gap-1.5 p-1 bg-black/30 rounded-xl border border-white/5">
                                    {['Todos', 'Positivo', 'Neutro', 'Negativo'].map((s) => (
                                        <button 
                                            key={s}
                                            onClick={() => setFilterSentiment(s === 'Todos' ? null : s)}
                                            className={`flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${(!filterSentiment && s === 'Todos') || filterSentiment === s ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                                        >
                                            {s === 'Todos' ? 'Tudo' : s.substring(0,3)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* List Container - NOW GETS MOST SPACE */}
                <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3 custom-scrollbar bg-black/10">
                    {activeTab === 'alerts' ? (
                        loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-4 opacity-50">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                <p className="text-[8px] font-black uppercase tracking-widest">Sincronizando...</p>
                            </div>
                        ) : filteredAlerts.length === 0 ? (
                            <div className="text-center py-10 opacity-30">
                                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum Alerta</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredAlerts.map((alert: any, index: number) => {
                                    const sentimentColors = {
                                        Positivo: "border-emerald-500/30 text-emerald-400",
                                        Neutro: "border-amber-500/30 text-amber-400",
                                        Negativo: "border-rose-500/30 text-rose-400"
                                    };
                                    return (
                                        <motion.div 
                                            key={alert.id}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            onClick={() => handleSelectAlert(alert)}
                                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedAlert?.id === alert.id ? 'bg-blue-600/20 border-blue-500/50 shadow-xl' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'}`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase border ${sentimentColors[alert.clima as keyof typeof sentimentColors] || 'border-white/10'}`}>
                                                    {alert.clima || 'Alerta'}
                                                </div>
                                                <span className="text-[8px] text-slate-600 font-bold">{new Date(alert.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <h3 className="text-xs font-black text-white truncate uppercase mb-1">{alert.title}</h3>
                                            <p className="text-[10px] text-slate-500 font-medium truncate">{alert.bairro}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            {collaborators.map((colab: any) => (
                                <div key={colab.id} className="p-4 bg-white/[0.04] border border-white/5 rounded-2xl flex items-center gap-3 group">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs uppercase">{colab.name?.substring(0,2)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-white uppercase truncate">{colab.name}</p>
                                        <p className="text-[9px] text-slate-500 font-bold truncate">{colab.email}</p>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveCollaborator(colab.id)}
                                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center hover:bg-red-500 hover:text-white"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Minimalist Footer */}
                <div className="p-6 pt-4 bg-blue-900/10 backdrop-blur-xl border-t border-white/5">
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[8px] text-slate-500 font-black uppercase mb-2 tracking-widest flex items-center gap-2">
                                    <Share2 size={10} className="text-blue-500" /> CONVITE RÁPIDO
                                </p>
                                <div className="text-[9px] text-blue-200/40 font-mono truncate">
                                    {`${window.location.origin}/registro-colaborador?campaign_id=${campaignId}`}
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/registro-colaborador?campaign_id=${campaignId}`);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${copied ? 'bg-emerald-600' : 'bg-blue-600 shadow-lg shadow-blue-500/20'}`}
                            >
                                {copied ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-white" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-[#0f172a]">
                <MapContainer center={mapCenter} zoom={zoom} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                    <ChangeView center={mapCenter} zoom={zoom} />
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    {alerts.filter(a => a.latitude && a.longitude).map(alert => (
                        <Marker 
                            key={alert.id} 
                            position={[alert.latitude, alert.longitude]}
                            icon={(icons as any)[alert.clima] || DefaultIcon}
                            eventHandlers={{ click: () => handleSelectAlert(alert) }}
                        />
                    ))}
                </MapContainer>

                <div className="absolute top-8 right-8 z-[1000] flex flex-col gap-2">
                    <div className="p-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col gap-1 shadow-2xl">
                        <button onClick={() => setZoom(z => z + 1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl font-black text-xl">+</button>
                        <div className="h-px bg-white/10 mx-2" />
                        <button onClick={() => setZoom(z => z - 1)} className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-xl font-black text-xl">-</button>
                    </div>
                </div>

                <AnimatePresence>
                    {selectedAlert && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="absolute inset-x-8 bottom-8 z-[2000] pointer-events-none"
                        >
                            <div className="bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-[0_40px_100px_rgba(0,0,0,0.9)] pointer-events-auto flex flex-col md:flex-row gap-8 max-h-[600px] overflow-hidden">
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusStyles(selectedAlert.clima).bg} ${getStatusStyles(selectedAlert.clima).text} border ${getStatusStyles(selectedAlert.clima).border}`}>
                                            {selectedAlert.clima || 'ALERTA'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-400 font-black text-[10px] uppercase tracking-widest">
                                            <MapPin size={14} /> {selectedAlert.bairro}
                                        </div>
                                    </div>
                                    
                                    <h2 className="text-2xl font-black text-white mb-4 tracking-tighter leading-tight uppercase">{selectedAlert.title}</h2>
                                    
                                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[2rem] mb-6">
                                        <p className="text-slate-300 text-sm leading-relaxed font-medium">{selectedAlert.reclamacao || 'Nenhuma descrição fornecida.'}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="flex items-center gap-3 p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20"><User className="w-5 h-5 text-blue-400" /></div>
                                            <div className="min-w-0">
                                                <p className="text-[8px] text-slate-500 uppercase font-black mb-0.5 tracking-widest">Responsável</p>
                                                <p className="text-xs font-black text-white truncate">{selectedAlert.userName || 'Colaborador'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-black/20 rounded-2xl border border-white/5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-600/10 flex items-center justify-center border border-amber-500/20"><Clock className="w-5 h-5 text-amber-400" /></div>
                                            <div className="min-w-0">
                                                <p className="text-[8px] text-slate-500 uppercase font-black mb-0.5 tracking-widest">Data/Hora</p>
                                                <p className="text-xs font-black text-white truncate">
                                                    {selectedAlert.created_at ? new Date(selectedAlert.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Horário não registrado'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Safe Media Rendering */}
                                    {getMediaArray(selectedAlert.mediaUrls).length > 0 && (
                                        <div className="mt-6">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="h-px flex-1 bg-white/5" />
                                                <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest">EVIDÊNCIAS NO LOCAL</p>
                                                <div className="h-px flex-1 bg-white/5" />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {getMediaArray(selectedAlert.mediaUrls).map((url: string, idx: number) => (
                                                    <motion.div key={idx} whileHover={{ scale: 1.05 }} className="group relative aspect-square rounded-2xl overflow-hidden bg-black border border-white/10 cursor-zoom-in" onClick={() => window.open(url, '_blank')}>
                                                        <img src={url} alt="Evidência" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                        <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 className="text-white w-5 h-5" /></div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="w-full md:w-[260px] flex flex-col gap-3 justify-end">
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`w-full rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all ${selectedAlert.status === 'Concluído' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-500'}`} onClick={() => handleUpdateStatus(selectedAlert.id, selectedAlert.status === 'Concluído' ? 'Pendente' : 'Concluído')}>
                                        {selectedAlert.status === 'Concluído' ? 'REABRIR CHAMADO' : 'ARQUIVAR OCORRÊNCIA'}
                                    </motion.button>
                                    <button className="w-full rounded-2xl h-12 text-slate-500 hover:text-white font-black text-[9px] uppercase tracking-widest border border-white/5 hover:bg-white/5 transition-all" onClick={() => setSelectedAlert(null)}>VOLTAR AO RADAR</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {copied && (
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed bottom-16 right-16 z-[3000]">
                        <div className="bg-emerald-600/90 backdrop-blur-2xl text-white px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center gap-5 border border-emerald-400/40">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center"><CheckCircle2 className="w-7 h-7" /></div>
                            <div><p className="font-black text-base uppercase tracking-tight">OPERACIONALIZADO</p><p className="text-[11px] opacity-80 font-bold uppercase tracking-widest mt-1.5">Link pronto para envio</p></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
                .leaflet-container { background: #0f172a !important; }
                .custom-div-icon { background: transparent !important; border: none !important; }
            `}</style>
        </div>
    );
};

export default CityAlertsPage;
