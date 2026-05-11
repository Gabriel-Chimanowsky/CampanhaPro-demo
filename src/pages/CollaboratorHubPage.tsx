import React, { useState, useEffect } from 'react';
import { supabase, rawSupabase } from '../lib/supabaseClient';
import { 
    MapPin, Send, Camera, 
    Smile, Meh, Frown, LogOut, CheckCircle2, 
    Loader2, Navigation, Play, X, Video,
    ChevronRight, ChevronLeft, Trash2, ArrowUp, ArrowDown, Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        title: '',
        reclamacao: '',
        bairro: '',
        clima: '' as 'Positivo' | 'Neutro' | 'Negativo' | '',
        latitude: null as number | null,
        longitude: null as number | null,
        mediaFiles: [] as File[],
        videoFile: null as File | null
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

    const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFormData(prev => {
                const updated = [...prev.mediaFiles, ...newFiles].slice(0, 10);
                if (prev.mediaFiles.length + newFiles.length > 10) {
                    alert('Limite máximo de 10 fotos atingido.');
                }
                return { ...prev, mediaFiles: updated, videoFile: null }; // Reset video if adding photos
            });
        }
    };

    const handleAddVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 50 * 1024 * 1024) { // 50MB limit approx
                alert('O vídeo é muito grande.');
                return;
            }
            setFormData(prev => ({ ...prev, videoFile: file, mediaFiles: [] })); // Reset photos if adding video
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
        }));
    };

    const movePhoto = (index: number, direction: 'up' | 'down') => {
        setFormData(prev => {
            const newFiles = [...prev.mediaFiles];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex >= 0 && targetIndex < newFiles.length) {
                [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
            }
            return { ...prev, mediaFiles: newFiles };
        });
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
            let uploadedUrl = '';
            
            // Simulação de upload (em produção usaria supabase.storage)
            if (formData.mediaFiles.length > 0) {
                uploadedUrl = URL.createObjectURL(formData.mediaFiles[0]);
            } else if (formData.videoFile) {
                uploadedUrl = URL.createObjectURL(formData.videoFile);
            }

            // Usamos o rawSupabase para garantir que as chaves snake_case cheguem puras ao banco
            const { error, data, status, statusText } = await rawSupabase.from('street_reports').insert({
                campaign_id: user?.user_metadata?.campaignId || user?.campaignId || 'demo',
                bairro: formData.bairro,
                clima: formData.clima,
                reclamacao: formData.reclamacao,
                title: formData.title || `Alerta: ${formData.bairro}`,
                latitude: formData.latitude,
                longitude: formData.longitude,
                photo_url: uploadedUrl,
                created_by: user?.id,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error('[StreetReport Error]', {
                    error,
                    data,
                    status,
                    statusText,
                    payload: {
                        campaign_id: user?.user_metadata?.campaignId || user?.campaignId || 'demo',
                        bairro: formData.bairro,
                        clima: formData.clima,
                        created_by: user?.id
                    }
                });
                throw error;
            }

            setSuccess(true);
            setFormData({
                title: '',
                reclamacao: '',
                bairro: '',
                clima: '',
                latitude: null,
                longitude: null,
                mediaFiles: [],
                videoFile: null
            });
            setLocationStatus('idle');
            setStep(1);
            
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

            <main className="p-4 max-w-lg mx-auto">
                {success && (
                    <div className="bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3 text-emerald-400 mb-6 animate-in fade-in slide-in-from-top-4">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="font-bold">Alerta enviado com sucesso!</span>
                    </div>
                )}

                {/* Stepper Indicator */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${step === 1 ? 'bg-blue-600 ring-4 ring-blue-600/20' : 'bg-emerald-600'}`}>
                        {step > 1 ? <CheckCircle2 size={20} /> : 1}
                    </div>
                    <div className={`h-1 w-12 rounded-full ${step > 1 ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${step === 2 ? 'bg-blue-600 ring-4 ring-blue-600/20' : 'bg-slate-800'}`}>
                        2
                    </div>
                </div>

                {step === 1 ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-black mb-2">Onde você está?</h2>
                            <p className="text-slate-400">Precisamos da sua localização exata para o mapa.</p>
                        </div>

                        <Card className="!p-0 overflow-hidden !bg-[#161b22] border-slate-700 h-80 relative shadow-2xl">
                            {formData.latitude && formData.longitude ? (
                                <MapContainer 
                                    center={[formData.latitude, formData.longitude]} 
                                    zoom={16} 
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={false}
                                >
                                    <ChangeView center={[formData.latitude, formData.longitude]} zoom={16} />
                                    <TileLayer
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    />
                                    <Marker position={[formData.latitude, formData.longitude]} icon={DefaultIcon} />
                                </MapContainer>
                            ) : (
                                <div className="w-full h-full bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 p-10 text-center">
                                    <MapPin size={48} className="mb-4 opacity-20" />
                                    <p className="text-sm font-medium">O mapa aparecerá aqui após a captura.</p>
                                </div>
                            )}

                            {locationStatus === 'fetching' && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center text-white">
                                    <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-4" />
                                    <p className="font-bold">Aguardando GPS...</p>
                                </div>
                            )}
                        </Card>

                        <div className="space-y-4">
                            <Button 
                                onClick={handleGetLocation}
                                disabled={locationStatus === 'fetching'}
                                className={`w-full py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all ${locationStatus === 'success' ? 'bg-emerald-600' : 'bg-blue-600'}`}
                            >
                                {locationStatus === 'fetching' ? <Loader2 className="animate-spin" /> : <Navigation size={24} />}
                                {locationStatus === 'success' ? 'Posição Atualizada' : 'Capturar Meu GPS'}
                            </Button>

                            {locationStatus === 'success' && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <p className="text-[10px] uppercase font-black text-emerald-500 mb-1">Local Detectado</p>
                                    <p className="text-sm font-bold text-slate-200">{formData.bairro || 'Localização capturada com sucesso!'}</p>
                                </div>
                            )}

                            <Button 
                                disabled={!formData.latitude}
                                onClick={() => setStep(2)}
                                className="w-full py-5 rounded-3xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center gap-2"
                            >
                                Próximo Passo <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <button 
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-4"
                        >
                            <ChevronLeft size={16} /> Voltar para o Mapa
                        </button>

                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-black mb-2">Conte o que viu</h2>
                            <p className="text-slate-400">Preencha os detalhes para a central.</p>
                        </div>

                        {/* Detalhes Form */}
                        <Card className="!bg-[#161b22] !border-slate-800 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">O que está acontecendo?</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: Buraco na rua, Falta de luz..."
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold"
                                    value={formData.title}
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Sentimento nas Ruas</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'Positivo', label: 'Ótimo', icon: Smile, color: 'green' },
                                        { id: 'Neutro', label: 'Normal', icon: Meh, color: 'yellow' },
                                        { id: 'Negativo', label: 'Ruim', icon: Frown, color: 'red' }
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setFormData({...formData, clima: opt.id as any})}
                                            className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${formData.clima === opt.id ? `bg-${opt.color}-500/20 border-${opt.color}-500 text-${opt.color}-400` : 'bg-black/20 border-slate-700 text-slate-500'}`}
                                        >
                                            <opt.icon className="w-8 h-8 mb-1" />
                                            <span className="text-[10px] font-bold">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Descrição detalhada</label>
                                <textarea 
                                    placeholder="Descreva a situação com mais detalhes..."
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 h-32 resize-none transition-all"
                                    value={formData.reclamacao}
                                    onChange={e => setFormData({...formData, reclamacao: e.target.value})}
                                />
                            </div>

                            {/* Media Section */}
                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Mídia do Local
                                </label>
                                
                                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 mb-4">
                                    <p className="text-xs font-bold text-blue-400 mb-1">Destaque Importante:</p>
                                    <p className="text-[10px] text-blue-300 opacity-80">Você pode enviar até <span className="font-black underline">10 FOTOS</span> ou <span className="font-black underline">1 VÍDEO de até 30s</span>.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-2xl cursor-pointer transition-all ${formData.videoFile ? 'opacity-30 pointer-events-none' : 'bg-black/40 border-slate-700 hover:bg-black/60'}`}>
                                        <Camera className="w-6 h-6 text-blue-400 mb-1" />
                                        <span className="text-[10px] font-bold text-slate-400">Adicionar Fotos</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple 
                                            className="hidden" 
                                            onChange={handleAddPhotos}
                                            disabled={!!formData.videoFile}
                                        />
                                    </label>
                                    <label className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-2xl cursor-pointer transition-all ${formData.mediaFiles.length > 0 ? 'opacity-30 pointer-events-none' : 'bg-black/40 border-slate-700 hover:bg-black/60'}`}>
                                        <Video className="w-6 h-6 text-red-400 mb-1" />
                                        <span className="text-[10px] font-bold text-slate-400">Gravar Vídeo</span>
                                        <input 
                                            type="file" 
                                            accept="video/*" 
                                            className="hidden" 
                                            onChange={handleAddVideo}
                                            disabled={formData.mediaFiles.length > 0}
                                        />
                                    </label>
                                </div>

                                {/* Media Previews */}
                                {formData.mediaFiles.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {formData.mediaFiles.map((file, idx) => (
                                            <div key={idx} className="relative aspect-video rounded-xl bg-slate-800 overflow-hidden border border-slate-700 group">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => movePhoto(idx, 'up')} disabled={idx === 0} className="p-2 bg-slate-800 rounded-lg text-white disabled:opacity-30"><ArrowUp size={16} /></button>
                                                    <button type="button" onClick={() => movePhoto(idx, 'down')} disabled={idx === formData.mediaFiles.length - 1} className="p-2 bg-slate-800 rounded-lg text-white disabled:opacity-30"><ArrowDown size={16} /></button>
                                                    <button type="button" onClick={() => removePhoto(idx)} className="p-2 bg-red-500 rounded-lg text-white"><Trash2 size={16} /></button>
                                                </div>
                                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold">{idx + 1}</div>
                                            </div>
                                        ))}
                                        {formData.mediaFiles.length < 10 && (
                                            <label className="flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl aspect-video cursor-pointer hover:bg-white/5">
                                                <Plus className="text-slate-700" />
                                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
                                            </label>
                                        )}
                                    </div>
                                )}

                                {formData.videoFile && (
                                    <div className="mt-4 relative aspect-video rounded-2xl bg-black overflow-hidden border border-slate-700 group">
                                        <video src={URL.createObjectURL(formData.videoFile)} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play size={40} className="text-white opacity-50" />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, videoFile: null }))}
                                            className="absolute top-3 right-3 p-2 bg-red-500 rounded-xl text-white shadow-xl"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <div className="absolute bottom-3 left-3 bg-red-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Vídeo Selecionado</div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full py-6 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 mt-8"
                        >
                            {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                            {submitting ? 'Publicando...' : 'Publicar Alerta'}
                        </Button>
                    </form>
                )}
            </main>

            {/* Tutorial Overlay */}
            {showTutorial && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
                    <div className="max-w-md w-full bg-[#161b22] border border-slate-800 rounded-[40px] p-8 shadow-2xl relative">
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
                            <Navigation className="w-10 h-10 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-black text-center mb-4">Bem-vindo ao Campo!</h2>
                        
                        <div className="space-y-4 mb-8 text-left">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-slate-700">1</div>
                                <p className="text-sm text-slate-400 leading-relaxed"><span className="text-white font-bold">Mapa Primeiro:</span> Comece capturando sua posição. Você verá o mapa mudar na hora.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-slate-700">2</div>
                                <p className="text-sm text-slate-400 leading-relaxed"><span className="text-white font-bold">Relatório Completo:</span> No próximo passo, conte os detalhes e anexe fotos (até 10) ou um vídeo.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center font-black text-blue-400 border border-slate-700">3</div>
                                <p className="text-sm text-slate-400 leading-relaxed"><span className="text-white font-bold">Organize as Fotos:</span> Você pode mover as fotos para escolher qual aparece primeiro no painel.</p>
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
