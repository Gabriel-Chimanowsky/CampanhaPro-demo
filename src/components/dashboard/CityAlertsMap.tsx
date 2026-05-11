import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../../lib/supabaseClient';
import { AlertCircle, MapPin, User, Smile, Meh, Frown, X, Clock, AlertTriangle, Maximize2 } from 'lucide-react';
import Card from '../ui/Card';

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
                filter: `campaignId=eq.${campaignId}`
            }, (payload: any) => {
                setAlerts(prev => [payload.new, ...prev]);
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
        <Card className="h-[600px] flex flex-col p-0 overflow-hidden border-slate-700/50">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-200 flex items-center gap-2">
                    <AlertCircle className="text-orange-400" /> Monitoramento em Tempo Real (GPS)
                </h3>
                <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1 text-green-400"><div className="w-2 h-2 rounded-full bg-green-400" /> Positivo</span>
                    <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400" /> Crítico</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row">
                {/* List Sidebar */}
                <div className="w-full md:w-80 border-r border-slate-800 overflow-y-auto bg-slate-900/50 max-h-[200px] md:max-h-full">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500 text-sm">Carregando alertas...</div>
                    ) : alerts.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-sm italic">Nenhum alerta recente.</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="p-4 hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(alert.clima)}`}>
                                            {alert.clima}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-200 group-hover:text-blue-400 transition-colors">
                                        {alert.title || alert.bairro}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{alert.reclamacao}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-600">
                                        <User size={10} /> {alert.users?.name || 'Colaborador'}
                                        <MapPin size={10} /> {alert.bairro}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Map View */}
                <div className="flex-1 relative z-10 min-h-[300px]">
                    <MapContainer 
                        center={[-22.9068, -43.1729]} 
                        zoom={12} 
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
                                                {new Date(alert.createdAt).toLocaleDateString()}
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
                                                {new Date(selectedAlert.createdAt).toLocaleString('pt-BR')}
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
            </div>
        </Card>
    );
};

export default CityAlertsMap;
