import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { 
    AlertTriangle, MapPin, Clock, User, 
    Search, Filter, ChevronRight, Maximize2,
    Smile, Meh, Frown, Camera, CheckCircle2, Share2
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

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
    const [mapConfig, setMapConfig] = useState({
        center: [-22.9068, -43.1729] as [number, number],
        zoom: 12
    });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClima, setFilterClima] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchAlerts();
        
        const channel = supabase
            .channel('city_alerts_realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'street_reports'
            }, () => {
                fetchAlerts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [campaignId]);

    const fetchAlerts = async () => {
        const { data, error } = await supabase
            .from('street_reports')
            .select('*')
            .eq('campaignId', campaignId)
            .order('createdAt', { ascending: false });

        if (!error && data) {
            setAlerts(data);
            if (data.length > 0 && !selectedAlert) {
                // Pre-select first alert if it has GPS
                const firstWithGps = data.find(a => a.latitude && a.longitude);
                if (firstWithGps) {
                    // setSelectedAlert(firstWithGps);
                }
            }
        }
        setLoading(false);
    };

    const filteredAlerts = useMemo(() => {
        return alerts.filter(a => {
            const matchesSearch = (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (a.bairro || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (a.reclamacao || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFilter = filterClima === '' || a.clima === filterClima;
            return matchesSearch && matchesFilter;
        });
    }, [alerts, searchTerm, filterClima]);

    const handleSelectAlert = (alert: any) => {
        setSelectedAlert(alert);
        if (alert.latitude && alert.longitude) {
            setMapConfig({
                center: [alert.latitude, alert.longitude],
                zoom: 16
            });
        }
    };

    const getStatusStyles = (clima: string) => {
        switch (clima) {
            case 'Positivo': return { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: <Smile size={14} /> };
            case 'Negativo': return { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: <Frown size={14} /> };
            default: return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: <Meh size={14} /> };
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

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] space-y-6">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                        <AlertTriangle className="text-orange-500" /> Monitoramento Urbano
                    </h2>
                    <p className="text-sm text-slate-400">Alertas em tempo real enviados pelos colaboradores de campo.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            placeholder="Buscar bairro ou tema..."
                            className="bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none w-64"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
                        value={filterClima}
                        onChange={e => setFilterClima(e.target.value)}
                    >
                        <option value="">Todos os Sentimentos</option>
                        <option value="Positivo">Positivo</option>
                        <option value="Neutro">Neutro</option>
                        <option value="Negativo">Crítico</option>
                    </select>
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* List Side */}
                <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500 animate-pulse">Carregando alertas...</div>
                    ) : filteredAlerts.length === 0 ? (
                        <Card className="p-10 text-center text-slate-500 italic">
                            Nenhum alerta encontrado para os filtros atuais.
                        </Card>
                    ) : (
                        filteredAlerts.map((alert) => {
                            const styles = getStatusStyles(alert.clima);
                            const isSelected = selectedAlert?.id === alert.id;
                            
                            return (
                                <div 
                                    key={alert.id}
                                    onClick={() => handleSelectAlert(alert)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${isSelected ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20' : 'bg-[#161b22] border-slate-800 hover:border-slate-700'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${styles.bg} ${styles.text} ${styles.border}`}>
                                            {styles.icon} {alert.clima}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                            <Clock size={10} /> {new Date(alert.createdAt).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    
                                    <h3 className={`font-bold mb-1 group-hover:text-blue-400 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-100'}`}>
                                        {alert.title || alert.bairro}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">{alert.reclamacao}</p>
                                    
                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <User size={12} className="text-slate-600" />
                                            <span className="font-bold">{alert.users?.name || 'Colaborador'}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-700" />
                                            <MapPin size={12} className="text-slate-600" />
                                            <span>{alert.bairro}</span>
                                        </div>
                                        {alert.latitude && <div className="text-[10px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1"><MapPin size={8} /> GPS</div>}
                                    </div>
                                    
                                    {alert.status === 'concluido' && (
                                        <div className="absolute top-2 right-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                    
                    {/* Share Link Section at the bottom of the sidebar */}
                    <Card className="!bg-blue-600/10 border-blue-500/30 p-4 mt-auto">
                        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Share2 size={12} /> Convidar Colaboradores
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-3">Compartilhe este link para que sua equipe possa baixar o App e enviar alertas.</p>
                        <div className="flex gap-2">
                            <input 
                                readOnly
                                value={`${window.location.origin}/colaborador`}
                                className="flex-1 bg-black/40 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-300 font-mono"
                            />
                            <Button 
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/colaborador`);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                className={`!py-2 !px-3 !text-[10px] !rounded-lg transition-all ${copied ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
                            >
                                {copied ? 'Copiado!' : 'Copiar'}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Map/Details Side */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Real Map */}
                    <Card className="flex-1 !p-0 overflow-hidden relative border-slate-700/50 shadow-2xl">
                        <MapContainer 
                            center={mapConfig.center} 
                            zoom={mapConfig.zoom} 
                            style={{ height: '100%', width: '100%' }}
                            className="z-10"
                        >
                            <ChangeView center={mapConfig.center} zoom={mapConfig.zoom} />
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            {alerts.filter(a => a.latitude && a.longitude).map(alert => {
                                const styles = getStatusStyles(alert.clima);
                                return (
                                    <Marker 
                                        key={alert.id} 
                                        position={[alert.latitude, alert.longitude]}
                                        eventHandlers={{
                                            click: () => handleSelectAlert(alert)
                                        }}
                                    >
                                        <Popup className="custom-popup">
                                            <div className="p-1 min-w-[200px]">
                                                <div className="flex justify-between mb-2">
                                                    <span className={`text-[10px] font-bold uppercase ${styles.text}`}>
                                                        {alert.clima}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(alert.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-sm mb-1">{alert.title || 'Alerta de Rua'}</h3>
                                                <p className="text-xs text-slate-600 mb-2">{alert.reclamacao}</p>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                    <User size={12} /> <span className="font-bold">{alert.users?.name}</span>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
                        
                        {/* Selected Alert Details Floating Overlay */}
                        {selectedAlert && (
                            <div className="absolute bottom-6 left-6 right-6 z-[1000] animate-in slide-in-from-bottom-4 duration-300">
                                <div className="bg-[#161b22]/95 backdrop-blur-md border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter ${getStatusStyles(selectedAlert.clima).bg} ${getStatusStyles(selectedAlert.clima).text}`}>
                                                {selectedAlert.clima}
                                            </div>
                                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{selectedAlert.bairro}</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-white mb-2">{selectedAlert.title || 'Alerta de Rua'}</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-4">{selectedAlert.reclamacao}</p>
                                        
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black">Enviado por</p>
                                                    <p className="text-xs font-bold text-slate-200">{selectedAlert.users?.name || 'Colaborador'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-orange-600/20 flex items-center justify-center">
                                                    <Clock className="w-4 h-4 text-orange-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-500 uppercase font-black">Data/Hora</p>
                                                    <p className="text-xs font-bold text-slate-200">{new Date(selectedAlert.createdAt).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col gap-4 min-w-[200px]">
                                        {selectedAlert.photoUrl && (
                                            <div className="relative group overflow-hidden rounded-2xl border border-slate-700 h-32 md:h-full">
                                                <img src={selectedAlert.photoUrl} alt="Evidência" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                <button 
                                                    onClick={() => window.open(selectedAlert.photoUrl, '_blank')}
                                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Maximize2 className="text-white" />
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <Button 
                                                variant="primary" 
                                                className={`w-full ${selectedAlert.status === 'concluido' ? 'bg-emerald-600' : ''}`}
                                                onClick={() => handleUpdateStatus(selectedAlert.id, selectedAlert.status === 'concluido' ? 'pendente' : 'concluido')}
                                            >
                                                {selectedAlert.status === 'concluido' ? 'Marcar como Pendente' : 'Marcar Resolvido'}
                                            </Button>
                                            <Button variant="secondary" className="w-full" onClick={() => setSelectedAlert(null)}>Fechar</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CityAlertsPage;
