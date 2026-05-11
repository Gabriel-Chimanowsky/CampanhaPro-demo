import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    MapPin, Send, Camera, AlertTriangle, 
    Smile, Meh, Frown, LogOut, CheckCircle2, 
    Loader2, Navigation, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const CollaboratorHubPage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const [formData, setFormData] = useState({
        title: '',
        reclamacao: '',
        bairro: '',
        clima: '' as 'Positivo' | 'Neutro' | 'Negativo' | '',
        latitude: null as number | null,
        longitude: null as number | null,
        photoUrl: ''
    });

    const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'error'>('idle');

    useEffect(() => {
        checkUser();
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
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
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
            const { error } = await supabase.from('street_reports').insert({
                campaignId: user?.user_metadata?.campaignId || 'demo',
                bairro: formData.bairro,
                clima: formData.clima,
                reclamacao: formData.reclamacao,
                title: formData.title,
                latitude: formData.latitude,
                longitude: formData.longitude,
                photoUrl: formData.photoUrl,
                createdBy: user?.id,
                createdAt: new Date().toISOString()
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
                                <Camera className="w-3 h-3" /> Foto do Local (Link)
                            </label>
                            <input 
                                type="url"
                                placeholder="https://..."
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all text-xs"
                                value={formData.photoUrl}
                                onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                            />
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

            {/* Bottom Nav Simulation */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#161b22]/80 backdrop-blur-xl border-t border-slate-800 p-4 flex justify-around text-slate-500">
                <div className="flex flex-col items-center text-blue-400">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="text-[10px] font-bold mt-1">Alertas</span>
                </div>
                <div className="flex flex-col items-center opacity-40">
                    <Info className="w-6 h-6" />
                    <span className="text-[10px] font-bold mt-1">Tutorial</span>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorHubPage;
