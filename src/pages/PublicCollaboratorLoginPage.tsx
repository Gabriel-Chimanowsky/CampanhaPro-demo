import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LogIn, UserPlus, Shield, Loader2, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';

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
                password
            });

            if (authError) throw authError;

            navigate('/colaborador');
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4 border border-blue-500/30">
                        <Shield className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">CampanhaPró</h1>
                    <p className="text-slate-400 font-medium">Área do Colaborador de Campo</p>
                </div>

                <div className="bg-[#161b22] border border-slate-800 p-8 rounded-3xl shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="seu@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Senha</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
                            Entrar no App
                        </Button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                        <p className="text-slate-500 text-sm mb-4">Ainda não é um colaborador oficial?</p>
                        <Link
                            to="/registro-colaborador"
                            className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-blue-300 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" /> Criar nova conta
                        </Link>
                    </div>
                </div>

                <p className="mt-10 text-center text-slate-600 text-xs">
                    © 2026 CampanhaPró Intelligence System. Todos os direitos reservados.
                </p>
            </div>
        </div>
    );
};

export default PublicCollaboratorLoginPage;
