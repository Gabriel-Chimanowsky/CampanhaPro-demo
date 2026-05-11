import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { UserPlus, ArrowLeft, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';

const PublicCollaboratorRegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Sign up user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        type: 'Colaborador'
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Create user profile in 'users' table
                const { error: profileError } = await supabase.from('users').insert({
                    id: authData.user.id,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    type: 'Colaborador',
                    createdAt: new Date().toISOString()
                });

                if (profileError) throw profileError;
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar cadastro.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full p-10 rounded-3xl bg-[#161b22] border border-emerald-500/30 shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Bem-vindo ao Time!</h2>
                    <p className="text-slate-400 leading-relaxed mb-8">
                        Seu cadastro foi realizado com sucesso. Agora você pode entrar no app e começar a colaborar com a cidade.
                    </p>
                    <Link
                        to="/login-colaborador"
                        className="block w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg transition-all"
                    >
                        Fazer Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d1117] flex flex-col p-6 font-sans">
            <Link to="/login-colaborador" className="inline-flex items-center gap-2 text-slate-400 font-bold hover:text-white transition-colors mb-10">
                <ArrowLeft className="w-5 h-5" /> Voltar
            </Link>

            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black text-white mb-2">Seja um <span className="text-blue-500">Colaborador</span></h1>
                    <p className="text-slate-400">Ajude a construir uma cidade melhor reportando demandas reais.</p>
                </div>

                <div className="bg-[#161b22] border border-slate-800 p-8 rounded-3xl shadow-2xl">
                    <form onSubmit={handleRegister} className="space-y-5">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Nome Completo</label>
                            <input
                                required
                                type="text"
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Como devemos te chamar?"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">WhatsApp</label>
                            <input
                                required
                                type="tel"
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="(00) 00000-0000"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">E-mail</label>
                            <input
                                required
                                type="email"
                                className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                placeholder="seu@email.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Senha</label>
                                <input
                                    required
                                    type="password"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="••••••"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Confirmar</label>
                                <input
                                    required
                                    type="password"
                                    className="w-full bg-black/40 border border-slate-700 rounded-2xl p-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="••••••"
                                    value={formData.confirmPassword}
                                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
                                Finalizar Cadastro
                            </Button>
                        </div>
                    </form>

                    <p className="mt-6 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Seus dados estão protegidos pela LGPD.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PublicCollaboratorRegisterPage;
