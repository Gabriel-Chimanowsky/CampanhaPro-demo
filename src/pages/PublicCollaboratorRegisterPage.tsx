import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
    User, Mail, Lock, Phone, 
    AlertCircle, Loader2, 
    ChevronRight, CheckCircle2, Eye, EyeOff
} from 'lucide-react';
import Button from '../components/ui/Button';
import { motion } from 'framer-motion';

const PublicCollaboratorRegisterPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const queryParams = new URLSearchParams(window.location.search);
    const urlCampaignId = queryParams.get('campaign_id') || queryParams.get('campaignId');
    const DEFAULT_CAMPAIGN_ID = '455d21f3-f254-4b96-b49c-e70192c3fe27';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        campaignId: urlCampaignId || DEFAULT_CAMPAIGN_ID
    });

    const [pingStatus, setPingStatus] = useState<string>('');

    const formatPhone = (value: string) => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 11) {
            return numbers
                .replace(/(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{5})(\d)/, '$1-$2')
                .replace(/(-\d{4})\d+?$/, '$1');
        }
        return value;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = formatPhone(e.target.value);
        if (masked.length <= 15) {
            setFormData({ ...formData, phone: masked });
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            console.log('[Register] Iniciando cadastro...', formData.email);
            const { error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        phone: formData.phone,
                        type: 'Colaborador',
                        campaignId: formData.campaignId
                    }
                }
            });

            if (authError) {
                console.error('[Register] Erro no Auth:', authError);
                throw authError;
            }

            setSuccess(true);
        } catch (err: any) {
            console.error('[Register] Erro capturado:', err);
            setError(err.message || 'Erro ao realizar cadastro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#161b22] border border-green-500/30 p-8 rounded-2xl max-w-md w-full text-center space-y-6"
                >
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Cadastro Realizado!</h2>
                    <p className="text-slate-400">
                        Sua conta foi criada com sucesso. Você já pode acessar o Hub do Colaborador.
                    </p>
                    <Link 
                        to="/login-colaborador"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors"
                    >
                        Ir para Login <ChevronRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </div>
        );
    }


    const testConnection = async () => {
        setPingStatus('Testando Conexão...');
        try {
            const res = await fetch('/api/ping');
            if (res.ok) {
                setPingStatus('CONEXÃO OK! Servidor Respondendo.');
            } else {
                throw new Error('Falha no Servidor');
            }
        } catch (e: any) {
            setPingStatus(`ERRO: Servidor Offline ou CORS.`);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[#0d1117] flex flex-col items-center justify-center p-4 font-sans text-slate-200">
            {/* Botão de Diagnóstico (Opcional, apenas para debug) */}
            <div className="fixed top-4 left-4 z-50">
                <button 
                    onClick={testConnection}
                    className="text-[10px] font-black uppercase tracking-widest bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-700 transition-all text-slate-400"
                >
                    {pingStatus || 'Testar Conexão'}
                </button>
            </div>
            <div className="w-full max-w-[420px] mx-auto">
                <div className="text-center mb-8 px-2">
                    <img src="/logo.png?v=1" alt="Logo" className="w-16 h-16 mx-auto mb-6 object-contain" />
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">Seja um <span className="text-blue-500">Colaborador</span></h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed px-4">Cadastre-se para começar a enviar relatos e ajudar sua cidade.</p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#161b22] border border-slate-800 p-6 rounded-[32px] shadow-2xl relative overflow-hidden"
                >
                    <form onSubmit={handleRegister} className="space-y-4 relative z-10">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold animate-in fade-in zoom-in-95">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            {/* Nome */}
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="Nome Completo"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {/* Email */}
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="E-mail de Acesso"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            {/* WhatsApp com Máscara */}
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type="tel"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="WhatsApp (com DDD)"
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                />
                            </div>

                            {/* Senha com Toggle */}
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-12 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="Criar Senha"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Confirmar Senha com Toggle */}
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type={showConfirmPassword ? "text" : "password"}
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-12 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all text-sm"
                                    placeholder="Confirmar Senha"
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 rounded-[24px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                                {loading ? 'Criando Conta...' : 'Finalizar Cadastro'}
                            </Button>
                        </div>
                    </form>
                </motion.div>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-slate-500 text-sm font-medium">
                        Já tem uma conta? <Link to="/login-colaborador" className="text-blue-400 font-black hover:text-blue-300 transition-colors ml-1">Entrar Agora</Link>
                    </p>
                    <p className="text-slate-800 text-[9px] font-black uppercase tracking-[0.2em]">
                        © 2026 CampanhaPró Intelligence
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicCollaboratorRegisterPage;
