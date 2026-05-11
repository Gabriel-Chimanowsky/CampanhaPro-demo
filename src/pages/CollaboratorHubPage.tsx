import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    MapPin, Send, Camera, 
    Smile, Meh, Frown, LogOut, CheckCircle2, 
    Loader2, Navigation, Play, X, Video
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const ChangeView = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const CollaboratorHubPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        reclamacao: '',
        bairro: '',
        clima: '' as 'Positivo' | 'Neutro' | 'Negativo' | '',
        latitude: null as number | null,
        longitude: null as number | null,
        mediaFiles: [] as File[],
        photoUrl: '' // Mantido para retrocompatibilidade ou link externo
    });

    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');

    useEffect(() => {
        checkUser();
        const hasSeenTutorial = localStorage.getItem('collaborator_tutorial_seen');
        if (!hasSeenTutorial) {
            setShowTutorial(true);
        }
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login-colaborador');
            return;
        }
        setUser(session.user);
        setLoading(false);
    };

    const handleGetLocation = () => {
        setLocationStatus('fetching');
        if (!navigator.geolocation) {
            setLocationStatus('error');
            alert('Geolocalização não é suportada pelo seu navegador.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prev => ({ ...prev, latitude, longitude }));
                
                // Reverse Geocoding (Nominatim)
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                    const data = await response.json();
                    if (data && data.address) {
                        const bairro = data.address.suburb || data.address.neighbourhood || data.address.village || data.address.city_district || '';
                        const cidade = data.address.city || data.address.town || '';
                        setFormData(prev => ({ 
                            ...prev, 
                            bairro: bairro ? `${bairro}${cidade ? ', ' + cidade : ''}` : cidade 
                        }));
                    }
                } catch (err) {
                    console.error('Erro no reverse geocoding:', err);
                }
                
                setLocationStatus('success');
            },
            (error) => {
                console.error('Erro ao pegar localização:', error);
                setLocationStatus('error');
                alert('Não foi possível obter sua localização. Verifique as permissões de GPS.');
            },
            { enableHighAccuracy: true }
        );
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            
            // Validações
            const photos = files.filter(f => f.type.startsWith('image/'));
            const videos = files.filter(f => f.type.startsWith('video/'));
            
            if (photos.length > 10) {
                alert('Limite máximo de 10 fotos atingido.');
                return;
            }
            
            if (videos.length > 1) {
                alert('Você pode enviar apenas 1 vídeo por vez.');
                return;
            }
            
            setFormData(prev => ({ ...prev, mediaFiles: files }));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login-colaborador');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.clima || !formData.bairro) {
            alert('Por favor, informe o bairro e o sentimento das ruas.');
            return;
        }

        setSubmitting(true);
        try {
            let uploadedUrls: string[] = [];
            
            // Simulação de upload para Supabase Storage (ou link direto se mediaFiles for vazio)
            if (formData.mediaFiles.length > 0) {
                // Aqui entraria a lógica de bucket: supabase.storage.from('alerts').upload(...)
                // Para demonstração, vamos simular que o upload ocorreu
                uploadedUrls = formData.mediaFiles.map(f => URL.createObjectURL(f));
            }

            const { error } = await supabase.from('street_reports').insert({
                campaign_id: user?.user_metadata?.campaignId || user?.campaignId || 'demo',
                bairro: formData.bairro,
                clima: formData.clima,
                reclamacao: formData.reclamacao,
                title: formData.title || `Alerta: ${formData.bairro}`,
                latitude: formData.latitude,
                longitude: formData.longitude,
                photo_url: uploadedUrls.length > 0 ? uploadedUrls[0] : formData.photoUrl,
                created_by: user?.id,
                created_at: new Date().toISOString()
            });

            if (error) throw error;

            setSuccess(true);
            setFormData({
                title: '',
                reclamacao: '',
                bairro: '',
                clima: '',
                latitude: null,
                longitude: null,
                mediaFiles: [],
                photoUrl: ''
            });
            setLocationStatus('idle');
            
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Erro ao enviar alerta:', err);
            alert('Erro ao enviar alerta. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d1117] pb-20 font-sans text-slate-100">
            {/* Header */}
            <header className="bg-[#161b22] border-b border-slate-800 p-6 flex justify-between items-center sticky top-0 z-50">
                <div>
                    <h1 className="text-xl font-black text-white">Hub do Colaborador</h1>
                    <p className="text-xs text-slate-400">Logado como: {user?.user_metadata?.name || user?.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="p-4 space-y-6">
                {/* Intro Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black mb-2">Novo Alerta</h2>
                        <p className="text-blue-100 text-sm">Viu algo importante na cidade? Reporte agora para a central de comando.</p>
                    </div>
                    <Navigation className="absolute -bottom-4 -right-4 w-32 h-32 text-white/10 rotate-12" />
                </div>

                {success && (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-top-4">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="font-bold">Alerta enviado com sucesso!</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Localização */}
                    <Card className="!bg-[#161b22] !border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <MapPin className="text-red-400" /> Localização GPS
                            </h3>
                            {formData.latitude && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-mono">
                                    {formData.latitude.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Capture sua posição exata para que possamos mapear o problema.</p>
                        <Button 
                            type="button" 
                            onClick={handleGetLocation}
                            disabled={locationStatus === 'fetching'}
                            className={`w-full py-4 !rounded-2xl flex items-center justify-center gap-2 ${locationStatus === 'success' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'}`}
                        >
                            {locationStatus === 'fetching' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                            {locationStatus === 'success' ? 'Posição Capturada' : 'Capturar Meu GPS'}
                        </Button>
                    </Card>

                    {/* Detalhes */}
                    <Card className="!bg-[#161b22] !border-slate-800 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Bairro / Região</label>
                            <input 
                                required
                                type="text"
                                placeholder="Ex: Copacabana, Centro..."
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all"
                                value={formData.bairro}
                                onChange={e => setFormData({...formData, bairro: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">O que está acontecendo?</label>
                            <input 
                                type="text"
                                placeholder="Título rápido (Ex: Falta de luz)"
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all"
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Sentimento nas Ruas</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, clima: 'Positivo'})}
                                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${formData.clima === 'Positivo' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-black/20 border-slate-700 text-slate-500'}`}
                                >
                                    <Smile className="w-8 h-8 mb-1" />
                                    <span className="text-[10px] font-bold">Ótimo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, clima: 'Neutro'})}
                                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${formData.clima === 'Neutro' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-black/20 border-slate-700 text-slate-500'}`}
                                >
                                    <Meh className="w-8 h-8 mb-1" />
                                    <span className="text-[10px] font-bold">Normal</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, clima: 'Negativo'})}
                                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${formData.clima === 'Negativo' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/20 border-slate-700 text-slate-500'}`}
                                >
                                    <Frown className="w-8 h-8 mb-1" />
                                    <span className="text-[10px] font-bold">Ruim</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Descrição detalhada</label>
                            <textarea 
                                placeholder="Dê mais detalhes sobre o que está ocorrendo..."
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 h-32 resize-none transition-all"
                                value={formData.reclamacao}
                                onChange={e => setFormData({...formData, reclamacao: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest flex items-center gap-2">
                                <Camera className="w-3 h-3" /> Mídia do Local (Foto/Vídeo)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="flex flex-col items-center justify-center p-4 bg-black/40 border border-slate-700 border-dashed rounded-2xl cursor-pointer hover:bg-black/60 transition-all">
                                    <Camera className="w-6 h-6 text-blue-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-400">Tirar Fotos</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" 
                                        multiple 
                                        className="hidden" 
                                        onChange={handleFileChange}
                                    />
                                </label>
                                <label className="flex flex-col items-center justify-center p-4 bg-black/40 border border-slate-700 border-dashed rounded-2xl cursor-pointer hover:bg-black/60 transition-all">
                                    <Video className="w-6 h-6 text-red-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-400">Gravar Vídeo</span>
                                    <input 
                                        type="file" 
                                        accept="video/*" 
                                        capture="environment" 
                                        className="hidden" 
                                        onChange={handleFileChange}
                                    />
                                </label>
                            </div>
                            
                            {formData.mediaFiles.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {formData.mediaFiles.map((file, idx) => (
                                        <div key={idx} className="relative w-12 h-12 rounded-lg bg-slate-800 overflow-hidden border border-slate-700">
                                            {file.type.startsWith('image/') ? (
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                            ) : (
                                                <Play className="w-full h-full p-3 text-slate-500" />
                                            )}
                                            <button 
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, mediaFiles: prev.mediaFiles.filter((_, i) => i !== idx) }))}
                                                className="absolute top-0 right-0 bg-red-500 rounded-bl-lg p-0.5"
                                            >
                                                <X size={10} className="text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <p className="text-[9px] text-slate-600 mt-2">Máximo: 10 fotos ou 1 vídeo (30s).</p>
                        </div>
                    </Card>

                    <Button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full py-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40"
                    >
                        {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                        {submitting ? 'Enviando...' : 'Publicar Alerta'}
                    </Button>
                </form>
            </main>

            {/* Tutorial Overlay */}
            {showTutorial && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="max-w-md w-full bg-[#161b22] border border-slate-800 rounded-[40px] p-8 shadow-2xl relative">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                            <Navigation className="w-10 h-10 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-black text-center mb-4">Bem-vindo ao Campo!</h2>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-slate-700">1</div>
                                <p className="text-sm text-slate-400 leading-relaxed"><span className="text-white font-bold">GPS Automático:</span> Ao clicar em capturar, nós identificamos seu bairro e rua na hora.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-slate-700">2</div>
                                <p className="text-sm text-slate-400 leading-relaxed"><span className="text-white font-bold">Foto ou Vídeo:</span> Registre o que está vendo. Máximo de 10 fotos ou um vídeo rápido.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-slate-700">3</div>
                                <p className="text-sm text-slate-400 leading-relaxed"><span className="text-white font-bold">Instale o App:</span> Clique no menu do seu navegador e escolha <span className="text-white font-bold italic">"Adicionar à Tela de Início"</span> para usar como app.</p>
                            </div>
                        </div>

                        <Button 
                            className="w-full py-5 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg shadow-xl shadow-blue-900/40"
                            onClick={() => {
                                setShowTutorial(false);
                                localStorage.setItem('collaborator_tutorial_seen', 'true');
                            }}
                        >
                            Começar Agora
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CollaboratorHubPage;
