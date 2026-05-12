import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import { motion } from 'framer-motion';

const PublicCollaboratorLoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            navigate('/colaborador');
        } catch (err: any) {
            console.error('Erro no login:', err);
            setError(err.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[#0d1117] flex flex-col items-center justify-center p-4 font-sans text-slate-200">
            <div className="w-full max-w-[400px] mx-auto">
                <div className="text-center mb-8 px-2">
                    <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/10">
                        <Lock className="w-8 h-8 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">Área do <span className="text-blue-500">Colaborador</span></h1>
                    <p className="text-slate-400 text-sm font-medium">Faça login para gerenciar seus relatos e ajudar a cidade.</p>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#161b22] border border-slate-800 p-6 rounded-[32px] shadow-2xl relative overflow-hidden"
                >
                    <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold animate-in fade-in zoom-in-95">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                                    placeholder="Seu E-mail"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    required
                                    type="password"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                                    placeholder="Sua Senha"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 rounded-[24px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                {loading ? 'Acessando...' : 'Entrar no Hub'}
                            </Button>
                        </div>
                    </form>
                </motion.div>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-slate-500 text-sm font-medium">
                        Não tem uma conta? <Link to="/registro-colaborador" className="text-blue-400 font-black hover:text-blue-300 transition-colors ml-1">Cadastre-se</Link>
                    </p>
                    <p className="text-slate-800 text-[9px] font-black uppercase tracking-[0.2em]">
                        © 2026 CampanhaPró Intelligence
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicCollaboratorLoginPage;
