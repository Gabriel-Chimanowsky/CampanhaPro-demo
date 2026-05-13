import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../../lib/supabaseClient';
import { AlertCircle, MapPin, User, X } from 'lucide-react';
import Card from '../ui/Card';
import { useNavigate } from 'react-router-dom';

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
        html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px ${color};"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });
};

const icons = {
    Positivo: createColoredIcon('#10b981'), // Green
    Neutro: createColoredIcon('#f59e0b'),   // Orange
    Negativo: createColoredIcon('#ef4444')  // Red
};

const CityAlertsMap: React.FC<{ campaignId: string }> = ({ campaignId }) => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState<any>(null);

    useEffect(() => {
        fetchAlerts();
        
        // Subscription for real-time alerts
        const channel = supabase
            .channel('public:street_reports')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'street_reports',
                filter: `campaign_id=eq.${campaignId}`
            }, (payload: any) => {
                // Normalizar para camelCase pois o payload do canal vem bruto do Postgres
                const normalized = {
                    ...payload.new,
                    campaignId: payload.new.campaign_id,
                    createdAt: payload.new.created_at,
                    photoUrl: payload.new.photo_url
                };
                setAlerts(prev => [normalized, ...prev]);
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
            .order('createdAt', { ascending: false })
            .limit(50);

        if (!error && data) {
            setAlerts(data);
        }
        setLoading(false);
    };

    const getStatusColor = (clima: string) => {
        switch (clima) {
            case 'Positivo': return 'text-green-400';
            case 'Negativo': return 'text-red-400';
            default: return 'text-yellow-400';
        }
    };

    return (
        <Card className="h-[500px] flex flex-col p-0 overflow-hidden border-slate-700/50 shadow-2xl">
            <div className="p-4 border-b border-slate-800 bg-slate-800/80 backdrop-blur-md flex flex-wrap justify-between items-center gap-4 no-print">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                        <AlertCircle className="text-orange-400 w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-100">Monitoramento em Tempo Real (GPS)</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Alertas de Rua da Equipe</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1.5 text-green-400"><div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,199,156,0.5)]" /> Positivo</span>
                        <span className="flex items-center gap-1.5 text-yellow-400"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(245,158,11,0.5)]" /> Neutro</span>
                        <span className="flex items-center gap-1.5 text-red-400"><div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.5)]" /> Crítico</span>
                    </div>
                    <button 
                        onClick={() => navigate('/app/city-alerts')}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                    >
                        Ver Todos Alertas <MapPin size={12} />
                    </button>
                </div>
            </div>

            <div className="flex-1 relative z-10">
                <MapContainer 
                    center={alerts.length > 0 && alerts[0].latitude ? [alerts[0].latitude, alerts[0].longitude] : [-22.9068, -43.1729]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />
                    {alerts.filter(a => a.latitude && a.longitude).map(alert => (
                        <Marker 
                            key={alert.id} 
                            position={[alert.latitude, alert.longitude]}
                            icon={(icons as any)[alert.clima] || DefaultIcon}
                            eventHandlers={{
                                click: () => setSelectedAlert(alert)
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[200px]">
                                    <div className="flex justify-between mb-2">
                                        <span className={`text-[10px] font-bold uppercase ${getStatusColor(alert.clima)}`}>
                                            {alert.clima}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(alert.createdAt || alert.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-sm mb-1">{alert.title || 'Alerta de Rua'}</h3>
                                    <p className="text-xs text-slate-600 mb-3">{alert.reclamacao}</p>
                                    
                                    {alert.photoUrl && (
                                        <img src={alert.photoUrl} alt="Alerta" className="w-full h-24 object-cover rounded-md mb-3" />
                                    )}

                                    <div className="border-t pt-2 flex flex-col gap-1">
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <User size={12} /> <span className="font-bold">{alert.users?.name || 'Colaborador'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                            <MapPin size={12} /> <span>{alert.bairro}</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Floating Detail Card if selected */}
                {selectedAlert && (
                    <div className="absolute bottom-4 left-4 right-4 z-[1000] animate-in slide-in-from-bottom-2 duration-300">
                        <Card className="!bg-[#161b22]/95 backdrop-blur-md border-slate-700 p-4 shadow-2xl relative">
                            <button 
                                onClick={() => setSelectedAlert(null)}
                                className="absolute top-2 right-2 text-slate-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                            <div className="flex gap-4">
                                {selectedAlert.photoUrl && (
                                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-slate-800">
                                        <img src={selectedAlert.photoUrl} className="w-full h-full object-cover" alt="Alerta" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${icons[selectedAlert.clima as keyof typeof icons] ? 'bg-slate-800' : ''}`}>
                                            {selectedAlert.clima}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">
                                            {new Date(selectedAlert.createdAt || selectedAlert.created_at).toLocaleString('pt-BR')}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-100 text-sm">{selectedAlert.title || selectedAlert.bairro}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2">{selectedAlert.reclamacao}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default CityAlertsMap;
