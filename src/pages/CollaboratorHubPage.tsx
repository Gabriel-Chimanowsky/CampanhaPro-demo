import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    MapPin, Send, Camera, 
    Smile, Meh, Frown, LogOut, CheckCircle2, 
    Loader2, Navigation, Video,
    ChevronRight, Trash2, Map as MapIcon, ClipboardList, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';

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
                    setLocationStatus('success');
                } catch (e) {
                    console.error('Erro ao buscar endereço:', e);
                    setLocationStatus('success');
                }
            },
            (error) => {
                console.error('Erro de GPS:', error);
                setLocationStatus('error');
                alert('Não foi possível capturar sua localização. Verifique as permissões de GPS.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleAddVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validar tamanho (50MB)
            if (file.size > 50 * 1024 * 1024) {
                alert('O vídeo deve ter no máximo 50MB.');
                return;
            }

            // Validar duração (30 segundos)
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = function() {
                window.URL.revokeObjectURL(video.src);
                if (video.duration > 31) { // 31s para dar uma margem
                    alert('O vídeo deve ter no máximo 30 segundos.');
                    return;
                }
                setFormData(prev => ({ ...prev, videoFile: file, mediaFiles: [] })); // Limpa fotos se escolher vídeo
            };
            video.src = URL.createObjectURL(file);
        }
    };

    const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            if (formData.mediaFiles.length + files.length > 10) {
                alert('Limite máximo de 10 fotos.');
                return;
            }
            setFormData(prev => ({ ...prev, mediaFiles: [...prev.mediaFiles, ...files], videoFile: null })); // Limpa vídeo se escolher fotos
        }
    };

    const removePhoto = (index: number) => {
        setFormData(prev => ({
            ...prev,
            mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.clima || !formData.latitude) {
            alert('Por favor, preencha todos os campos obrigatórios e capture sua localização.');
            return;
        }

        setSubmitting(true);
        try {
            let mediaUrls: string[] = [];
            let videoUrl = '';

            // 1. Upload via Backend Local (MySQL/Folder)
            const mediaToUpload = [...formData.mediaFiles];
            if (formData.videoFile) mediaToUpload.push(formData.videoFile);

            if (mediaToUpload.length > 0) {
                const uploadFormData = new FormData();
                mediaToUpload.forEach(file => uploadFormData.append('files', file));
                
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: uploadFormData
                });

                if (!uploadRes.ok) {
                    const errData = await uploadRes.json();
                    throw new Error(errData.error || 'Erro no upload para o servidor');
                }

                const uploadData = await uploadRes.json();
                
                if (uploadData.urls) {
                    if (formData.videoFile) {
                        videoUrl = uploadData.urls[uploadData.urls.length - 1];
                        mediaUrls = uploadData.urls.slice(0, -1);
                    } else {
                        mediaUrls = uploadData.urls;
                    }
                }
            }

            const actualCampaignId = user.user_metadata?.campaignId || user.user_metadata?.campaign_id || '455d21f3-f254-4b96-b49c-e70192c3fe27';
            
            // 2. Salvar no Backend Local (MySQL)
            const reportRes = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    reclamacao: formData.reclamacao,
                    bairro: formData.bairro,
                    clima: formData.clima,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    mediaUrls: mediaUrls,
                    videoUrl: videoUrl,
                    userId: user.id,
                    campaignId: actualCampaignId
                })
            });

            if (!reportRes.ok) {
                const errData = await reportRes.json();
                throw new Error(errData.error || 'Falha ao salvar relato no MySQL');
            }

            setSuccess(true);
        } catch (e: any) {
            console.error('Erro ao enviar:', e);
            alert('ERRO NO SISTEMA: ' + (e.message || 'Erro desconhecido. Verifique se o servidor foi reiniciado.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login-colaborador');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#0d1117] flex flex-col font-sans text-slate-200">
            {/* Header Compacto */}
            <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500 font-black shadow-lg shadow-blue-500/5">
                        <MapPin size={22} />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white leading-none tracking-tight">CampanhaPró</h1>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Colaborador</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                >
                    <LogOut size={20} />
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center pb-24">
                <div className="w-full max-w-[440px] mx-auto space-y-6">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div 
                                key="success-screen"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12 px-6 bg-[#161b22] border border-emerald-500/30 rounded-[32px] text-center shadow-2xl mt-8"
                            >
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">Relato Enviado!</h2>
                                <p className="text-slate-400 text-sm mb-8">Obrigado por ajudar a construir uma cidade melhor.</p>
                                <Button 
                                    onClick={() => {
                                        setSuccess(false);
                                        setStep(1);
                                        setFormData({
                                            title: '', reclamacao: '', bairro: '', clima: '',
                                            latitude: null, longitude: null, mediaFiles: [], videoFile: null
                                        });
                                        setLocationStatus('idle');
                                    }}
                                    className="w-full py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-lg shadow-xl shadow-emerald-900/20 transition-all active:scale-95"
                                >
                                    Fazer Novo Relato
                                </Button>
                            </motion.div>
                        ) : (
                            <div className="space-y-6">
                                {/* Indicador de Step */}
                                <div className="flex items-center gap-2 px-2">
                                    {[1, 2, 3].map(s => (
                                        <div 
                                            key={s} 
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-500 shadow-sm shadow-blue-500/50' : 'bg-slate-800'}`} 
                                        />
                                    ))}
                                </div>

                                {step === 1 ? (
                                    <motion.div 
                                        key="step1"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center px-4">
                                            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Onde você está?</h2>
                                            <p className="text-slate-400 text-sm">Precisamos do seu GPS para localizar a demanda.</p>
                                        </div>

                                        <div className="relative group">
                                            <Card className="!p-0 overflow-hidden !bg-[#161b22] border-slate-700 h-[220px] relative shadow-2xl rounded-[28px] border-2">
                                                {formData.latitude && formData.longitude ? (
                                                    <MapContainer 
                                                        center={[formData.latitude, formData.longitude]} 
                                                        zoom={16} 
                                                        style={{ height: '100%', width: '100%' }}
                                                        zoomControl={false}
                                                    >
                                                        <ChangeView center={[formData.latitude, formData.longitude]} zoom={16} />
                                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                                        <Marker position={[formData.latitude, formData.longitude]} icon={DefaultIcon} />
                                                    </MapContainer>
                                                ) : (
                                                    <div className="w-full h-full bg-slate-900/50 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                                                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                                                            <MapPin size={32} className="text-slate-600" />
                                                        </div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Aguardando GPS</p>
                                                    </div>
                                                )}

                                                {locationStatus === 'fetching' && (
                                                    <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md z-[1000] flex flex-col items-center justify-center text-white">
                                                        <Loader2 className="w-10 h-10 animate-spin text-white mb-2" />
                                                        <p className="font-black text-[10px] uppercase tracking-widest">Sincronizando...</p>
                                                    </div>
                                                )}
                                            </Card>
                                        </div>

                                        <div className="space-y-4">
                                            <Button 
                                                onClick={handleGetLocation}
                                                disabled={locationStatus === 'fetching'}
                                                className={`w-full py-6 rounded-[24px] font-black text-lg flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 ${locationStatus === 'success' ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-900/20'}`}
                                            >
                                                {locationStatus === 'fetching' ? <Loader2 className="animate-spin w-6 h-6" /> : <Navigation size={22} />}
                                                {locationStatus === 'success' ? 'Localização Fixada' : 'Ativar Meu GPS'}
                                            </Button>

                                            {locationStatus === 'success' && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }} 
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 bg-[#161b22] border border-emerald-500/30 rounded-2xl flex items-center gap-4"
                                                >
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                        <MapPin size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[9px] uppercase font-black text-emerald-500 tracking-widest">Bairro Detectado</p>
                                                        <p className="text-sm font-bold text-white truncate">{formData.bairro || 'Coordenadas capturadas!'}</p>
                                                    </div>
                                                </motion.div>
                                            )}

                                            <Button 
                                                disabled={!formData.latitude}
                                                onClick={() => setStep(2)}
                                                className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30"
                                            >
                                                Próximo Passo <ChevronRight size={18} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ) : step === 2 ? (
                                    <motion.div 
                                        key="step2"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center px-4">
                                            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter leading-none">O que está havendo?</h2>
                                            <p className="text-slate-400 text-sm">Conte-nos sobre a situação.</p>
                                        </div>

                                        <div className="bg-[#161b22] border border-slate-800 p-5 rounded-[32px] space-y-6 shadow-2xl">
                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Título do Alerta</label>
                                                <input 
                                                    type="text"
                                                    placeholder="Ex: Rua sem luz, Buraco..."
                                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500 transition-all font-bold text-base"
                                                    value={formData.title}
                                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Clima nas Ruas</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'Positivo', label: 'Ótimo', icon: Smile, color: 'emerald' },
                                                        { id: 'Neutro', label: 'Normal', icon: Meh, color: 'yellow' },
                                                        { id: 'Negativo', label: 'Crítico', icon: Frown, color: 'red' }
                                                    ].map(opt => (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => setFormData({...formData, clima: opt.id as any})}
                                                            className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all active:scale-90 ${formData.clima === opt.id ? `bg-${opt.color}-500/10 border-${opt.color}-500/50 text-${opt.color}-400` : 'bg-black/20 border-slate-800 text-slate-600'}`}
                                                        >
                                                            <opt.icon className="w-8 h-8 mb-1" />
                                                            <span className="text-[9px] font-black uppercase">{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Descrição</label>
                                                <textarea 
                                                    placeholder="Descreva aqui..."
                                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500 h-28 resize-none transition-all font-medium text-sm"
                                                    value={formData.reclamacao}
                                                    onChange={e => setFormData({...formData, reclamacao: e.target.value})}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button 
                                                    onClick={() => setStep(1)}
                                                    className="flex-1 py-4 rounded-xl bg-slate-800 text-white font-bold text-xs"
                                                >
                                                    Voltar
                                                </Button>
                                                <Button 
                                                    disabled={!formData.title || !formData.clima}
                                                    onClick={() => setStep(3)}
                                                    className="flex-[2] py-4 rounded-xl bg-blue-600 text-white font-black text-sm disabled:opacity-30"
                                                >
                                                    Continuar
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="step3"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="space-y-6"
                                    >
                                        <div className="text-center px-4">
                                            <h2 className="text-3xl font-black text-white mb-2 tracking-tighter leading-none">Anexar Mídia</h2>
                                            <p className="text-slate-400 text-sm">Fotos ou vídeo comprovam a situação.</p>
                                        </div>

                                        <Card className="!bg-[#161b22] !border-slate-800 rounded-[32px] p-5 space-y-6 shadow-2xl">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Evidências</span>
                                                <span className="text-[9px] text-blue-500 font-black px-2 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">
                                                    {formData.videoFile ? '1 VÍDEO' : `${formData.mediaFiles.length}/10 FOTOS`}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all active:scale-95 ${formData.videoFile ? 'opacity-20 pointer-events-none' : 'bg-blue-600/5 border-blue-500/20'}`}>
                                                    <Camera className="w-6 h-6 text-blue-400 mb-1" />
                                                    <span className="text-[9px] font-black text-blue-400 uppercase">Fotos</span>
                                                    <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleAddPhotos} disabled={!!formData.videoFile} />
                                                </label>
                                                <label className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl cursor-pointer transition-all active:scale-90 ${formData.mediaFiles.length > 0 ? 'opacity-20 pointer-events-none' : 'bg-red-600/5 border-red-500/20'}`}>
                                                    <Video className="w-6 h-6 text-red-400 mb-1" />
                                                    <span className="text-[9px] font-black text-red-400 uppercase">Vídeo</span>
                                                    <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleAddVideo} disabled={formData.mediaFiles.length > 0} />
                                                </label>
                                            </div>

                                            {/* Previews */}
                                            <div className="grid grid-cols-2 gap-2">
                                                {formData.mediaFiles.map((file, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-xl bg-slate-800 overflow-hidden border border-slate-700">
                                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                                                        <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-lg text-white flex items-center justify-center"><Trash2 size={14} /></button>
                                                    </div>
                                                ))}
                                                {formData.videoFile && (
                                                    <div className="col-span-2 relative aspect-video rounded-xl bg-black overflow-hidden border border-slate-700">
                                                        <video src={URL.createObjectURL(formData.videoFile)} className="w-full h-full object-cover" />
                                                        <button onClick={() => setFormData(prev => ({ ...prev, videoFile: null }))} className="absolute top-2 right-2 w-8 h-8 bg-red-500 rounded-xl text-white flex items-center justify-center"><Trash2 size={18} /></button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2">
                                                <Button onClick={() => setStep(2)} className="flex-1 py-4 rounded-xl bg-slate-800 text-white font-bold text-xs">Voltar</Button>
                                                <Button 
                                                    onClick={handleSubmit} 
                                                    disabled={submitting} 
                                                    className="flex-[2] py-4 rounded-xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                                                >
                                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                    {submitting ? 'ENVIANDO...' : 'PUBLICAR ALERTA'}
                                                </Button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Nav PWA Bar */}
            <nav className="fixed bottom-4 left-4 right-4 z-[100] max-w-[440px] mx-auto">
                <div className="bg-[#161b22]/90 backdrop-blur-xl border border-white/10 rounded-[28px] p-2 flex items-center justify-around shadow-2xl">
                    <button onClick={() => setStep(1)} className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all ${step === 1 ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                        <MapIcon size={20} />
                        <span className="text-[9px] font-black uppercase">Mapa</span>
                    </button>
                    <button onClick={() => formData.latitude && setStep(2)} disabled={!formData.latitude} className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all ${step === 2 ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                        <ClipboardList size={20} />
                        <span className="text-[9px] font-black uppercase">Relato</span>
                    </button>
                    <button onClick={() => formData.title && setStep(3)} disabled={!formData.title} className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all ${step === 3 ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                        <Camera size={20} />
                        <span className="text-[9px] font-black uppercase">Mídia</span>
                    </button>
                </div>
            </nav>

            {/* Tutorial */}
            <AnimatePresence>
                {showTutorial && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-xs w-full space-y-6">
                            <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20"><Info size={32} className="text-blue-400" /></div>
                            <h2 className="text-2xl font-black">Guia Rápido</h2>
                            <p className="text-slate-400 text-sm">Capture o GPS, anexe fotos e publique seu relato em poucos segundos.</p>
                            <Button className="w-full py-4 rounded-xl bg-blue-600 font-black text-sm" onClick={() => { setShowTutorial(false); localStorage.setItem('collaborator_tutorial_seen', 'true'); }}>Entendi!</Button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CollaboratorHubPage;
