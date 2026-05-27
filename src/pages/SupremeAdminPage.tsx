import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthenticatedUser, Plan } from '../types/user';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { syncPlanForCampaign, getPlanConfig } from '../utils/planUtils';
import { 
    Users, ShieldAlert, Ban, CheckCircle, Globe, 
    Settings, Plus, Search, Lock, Unlock,
    Layout, Cpu, AlertTriangle, Trash2, Mail,
    CreditCard, Layers, TrendingUp as TrendingIcon,
    Activity, Filter, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, Cell
} from 'recharts';

interface CampaignConfig {
    id: string;
    features: string[];
    limits: {
        aiCalls: number;
        teamMembers: number;
        visits: number;
    };
    customFields: Record<string, CustomField[]>;
    status: 'active' | 'blocked';
}

interface AIUsageRecord {
    id: string;
    campaign_id: string;
    user_id: string;
    model: string;
    total_tokens: number;
    estimated_cost: number;
    timestamp: any;
}

interface CustomField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    options?: string[];
    required: boolean;
}

const SupremeAdminPage: React.FC = () => {
    const { user, logout, sendPasswordReset } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'users' | 'platform' | 'financial'>('overview');
    
    // Campaigns Data
    const [campaigns, setCampaigns] = useState<AuthenticatedUser[]>([]);
    const [campaignConfigs, setCampaignConfigs] = useState<Record<string, CampaignConfig>>({});
    
    // Global Users Data
    const [globalUsers, setGlobalUsers] = useState<AuthenticatedUser[]>([]);
    const [userSearch, setUserSearch] = useState('');
    const [userFilter, setUserFilter] = useState<'all' | 'Admin' | 'Líder' | 'Apoiador' | 'Colaborador' | 'Pesquisador' | 'Suporte' | 'Manutenção'>('all');
    
    // AI Usage Data
    const [aiUsageData, setAiUsageData] = useState<AIUsageRecord[]>([]);
    const [usageStats, setUsageStats] = useState({ totalTokens: 0, totalCost: 0 });
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [editUserForm, setEditUserForm] = useState({
        id: '',
        name: '',
        email: '',
        password: '',
        type: 'Colaborador' as any,
        campaign_id: '',
        ai_credits: 100,
        ai_used: 0,
        role: 'active' as any
    });
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
    const [passwordModal, setPasswordModal] = useState<{ isOpen: boolean; email: string }>({ isOpen: false, email: '' });
    const [manualPassword, setManualPassword] = useState('');
    const [isManagingPassword, setIsManagingPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form Creation State
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        email: '',
        password: '',
        plan: Plan.ESSENCIAL
    });

    const [newInternalUser, setNewInternalUser] = useState({
        name: '',
        email: '',
        type: 'Suporte' as any,
        campaign_id: 'PLATFORM_CORE'
    });

    const fetchAllData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Users
            const { data: allUsers, error: usersError } = await supabase.from('users').select('*');
            if (usersError) throw usersError;
            
            setGlobalUsers(allUsers as AuthenticatedUser[]);
            setCampaigns((allUsers as AuthenticatedUser[]).filter(u => u.type === 'Admin'));

            // 2. Fetch Configs
            const { data: configsData, error: configsError } = await supabase.from('campaign_configs').select('*');
            if (configsError) throw configsError;

            const configs: Record<string, CampaignConfig> = {};
            configsData?.forEach((c: any) => {
                configs[c.id] = c as CampaignConfig;
            });
            setCampaignConfigs(configs);

            // 3. Fetch AI Usage
            const { data: usageData, error: usageError } = await supabase
                .from('ai_usage')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);
            if (usageError) throw usageError;
            setAiUsageData(usageData as AIUsageRecord[]);

            // 4. Fetch Platform Stats
            const { data: statsData } = await supabase
                .from('platform_stats')
                .select('*')
                .eq('id', 'global')
                .single();
            if (statsData) {
                setUsageStats({
                    totalTokens: statsData.total_tokens || 0,
                    totalCost: statsData.total_cost || 0
                });
            }

        } catch (error) {
            console.error("Supreme Admin Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleCreateInternalUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: newUser, error } = await supabase.auth.signUp({
                email: newInternalUser.email,
                password: 'temporary-password-123' // Or prompt for it
            });
            if (error) throw error;
            
            if (newUser.user) {
                const userData: AuthenticatedUser = {
                    id: newUser.user.id,
                    name: newInternalUser.name,
                    email: newInternalUser.email,
                    type: newInternalUser.type,
                    plan: Plan.TOTAL,
                    campaign_id: newInternalUser.campaign_id,
                    role: 'active'
                };
                await supabase.from('users').insert(userData);
                
                setShowCreateUserModal(false);
                fetchAllData();
                alert(`Usuário de ${newInternalUser.type} criado com sucesso.`);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao criar usuário.');
        }
    };

    const handleUpdatePlan = async (userId: string, campaignId: string, newPlan: Plan) => {
        try {
            // Sincroniza users.plan + campaign_configs.planTier + features + limits em uma única operação
            await syncPlanForCampaign(supabase, userId, campaignId, newPlan);

            fetchAllData();
            const tier = getPlanConfig(newPlan).planTier;
            alert(`Plano atualizado para ${newPlan} (tier: ${tier}). O usuário deve recarregar a página.`);
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao atualizar plano: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const handleSetUserPassword = async (email: string, pass: string) => {
        try {
            const { error } = await supabase.functions.invoke('set-password', {
                body: { email, newPassword: pass }
            });

            if (error) throw error;
            
            return true;
        } catch (error: any) {
            console.error("Erro no set-password:", error);
            alert(`Erro ao definir senha: ${error.message || 'Erro de conexão com o servidor.'}`);
            return false;
        }
    };

    const handleForcePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (manualPassword.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsManagingPassword(true);
        const success = await handleSetUserPassword(passwordModal.email, manualPassword);
        if (success) {
            alert("Senha definida com sucesso via Global Auth.");
            setPasswordModal({ isOpen: false, email: '' });
            setManualPassword('');
        }
        setIsManagingPassword(false);
    };

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            // 1. Create User Identity in Auth (via Supabase)
            const { data: newUser, error: signUpError } = await supabase.auth.signUp({
                email: newCampaign.email,
                password: newCampaign.password
            });
            if (signUpError) throw signUpError;
            
            if (newUser.user) {
                const campaignId = `camp_${Date.now()}`;
                
                await supabase.from('users').insert({
                    id: newUser.user.id,
                    name: newCampaign.name,
                    email: newCampaign.email,
                    type: 'Admin',
                    plan: newCampaign.plan,
                    campaign_id: campaignId,
                    role: 'active'
                });

                // Cria campaign_configs com planTier/features/limits derivados do plano
                const config = getPlanConfig(newCampaign.plan);
                await supabase.from('campaign_configs').insert({
                    id: campaignId,
                    features: config.features,
                    limits: config.limits,
                    status: 'active'
                });
                
                setShowCreateModal(false);
                setNewCampaign({ name: '', email: '', password: '', plan: Plan.ESSENCIAL });
                await fetchAllData();
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro crítico ao provisionar servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleUserStatus = async (user: AuthenticatedUser) => {
        const isBlocked = user.role === 'blocked';
        try {
            await supabase
                .from('users')
                .update({ role: isBlocked ? 'active' : 'blocked' })
                .eq('id', user.id);
            fetchAllData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleResetPassword = async (email: string) => {
        try {
            await sendPasswordReset(email);
            alert(`Email de recuperação enviado para ${email}`);
        } catch (error) {
            console.error(error);
            alert('Falha ao enviar email.');
        }
    };

    const updateConfig = async (campaignId: string, updates: any) => {
        try {
            const token = localStorage.getItem('campanhapro-mysql-token');
            const body: any = {};
            if (updates.status !== undefined) body.status = updates.status;
            if (updates.maintenanceStatus !== undefined || updates.maintenance_status !== undefined) {
                body.maintenance_status = updates.maintenanceStatus || updates.maintenance_status;
            }
            if (updates.features !== undefined) body.features = updates.features;
            if (updates.limits !== undefined) {
                body.limits = {
                    ai_calls: updates.limits.aiCalls !== undefined ? updates.limits.aiCalls : (updates.limits.ai_calls !== undefined ? updates.limits.ai_calls : 999999),
                    team_members: updates.limits.teamMembers !== undefined ? updates.limits.teamMembers : (updates.limits.team_members !== undefined ? updates.limits.team_members : 999999),
                    visits: updates.limits.visits !== undefined ? updates.limits.visits : 999999
                };
            }
            if (updates.customFields !== undefined || updates.custom_fields !== undefined) {
                body.customFields = updates.customFields || updates.custom_fields;
            }
            
            const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error('Erro ao atualizar campanha via API administrativa');
            fetchAllData();
        } catch (error) {
            console.error("updateConfig Error:", error);
            alert("Erro ao atualizar configurações da campanha.");
        }
    };

    const handleEditUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingUser(true);
        try {
            const token = localStorage.getItem('campanhapro-mysql-token');
            const response = await fetch(`/api/admin/users/${editUserForm.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editUserForm.name,
                    email: editUserForm.email,
                    password: editUserForm.password || undefined,
                    type: editUserForm.type,
                    campaign_id: editUserForm.campaign_id,
                    role: editUserForm.role,
                    ai_credits: editUserForm.ai_credits,
                    ai_used: editUserForm.ai_used
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro desconhecido');
            }

            alert('Usuário atualizado com sucesso.');
            setShowEditUserModal(false);
            fetchAllData();
        } catch (error: any) {
            console.error(error);
            alert(`Erro ao atualizar usuário: ${error.message}`);
        } finally {
            setIsSavingUser(false);
        }
    };

    const filteredUsers = globalUsers.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                             u.email.toLowerCase().includes(userSearch.toLowerCase());
        const matchesType = userFilter === 'all' || u.type === userFilter;
        return matchesSearch && matchesType;
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
            {isLoading && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Sincronizando Rede Global...</p>
                    </div>
                </div>
            )}
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 p-4 sticky top-0 z-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-red-600 to-rose-900 p-2.5 rounded-xl shadow-lg shadow-red-900/20">
                        <ShieldAlert className="w-6 h-6 text-slate-50" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-50 tracking-widest uppercase italic">SUPREME CONTROL</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[10px] text-slate-500 font-mono tracking-tighter">GLOBAL_CORE_OPERATIONAL</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <nav className="hidden md:flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
                        >
                            Visão Geral
                        </button>
                        <button 
                            onClick={() => setActiveTab('campaigns')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'campaigns' ? 'bg-indigo-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
                        >
                            Campanhas
                        </button>
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
                        >
                            Usuários
                        </button>
                        <button 
                            onClick={() => setActiveTab('financial')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'financial' ? 'bg-indigo-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
                        >
                            Financeiro & IA
                        </button>
                        <button 
                            onClick={() => setActiveTab('platform')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'platform' ? 'bg-indigo-600 text-slate-50 shadow-lg' : 'text-slate-400 hover:text-slate-50'}`}
                        >
                            Configurações
                        </button>
                    </nav>

                    <div className="flex items-center gap-3 pl-6 border-l border-slate-700">
                        <div className="flex flex-col items-end">
                            <p className="text-xs font-black text-slate-50 leading-none uppercase">{user?.name || 'ADMINISTRADOR'}</p>
                            <p className="text-[10px] text-slate-400 font-medium">GESTÃO SUPREMA</p>
                        </div>
                        <Button variant="ghost" onClick={logout} className="h-8 w-8 p-0 rounded-full hover:bg-red-500/10">
                            <Mail className="w-4 h-4 text-slate-500 hover:text-red-500" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto space-y-8 pb-20">
                {/* Visualizer Frame */}
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div 
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Campanhas Ativas', val: campaigns.length, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                                    { label: 'Usuários Totais', val: globalUsers.length, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                                    { label: 'Bloqueios Ativos', val: globalUsers.filter(u => u.role === 'blocked').length, icon: Ban, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                                    { label: 'Integridade Sistema', val: '99.9%', icon: ShieldAlert, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
                                ].map((stat, i) => (
                                    <Card key={i} className="bg-slate-900/50 border-slate-700/50 p-6 relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 p-4 ${stat.bg} rounded-bl-3xl opacity-20 group-hover:scale-110 transition-transform`}>
                                            <stat.icon className={`w-8 h-8 ${stat.color}`} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                        <p className="text-3xl font-black text-slate-50 mt-2 font-mono tracking-tighter">{stat.val}</p>
                                    </Card>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="bg-slate-900 border-slate-700/50 overflow-hidden">
                                    <div className="p-4 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center">
                                        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-indigo-400" /> Atividade Recente do Sistema
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {campaigns.slice(0, 5).map((c, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-lg border border-slate-700/50 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400 font-bold">
                                                        {c.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-50">{c.name}</p>
                                                        <p className="text-[10px] text-slate-500">{c.email}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-mono">Log_{idx + 400}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                <Card className="bg-slate-900 border-slate-700/50 overflow-hidden">
                                    <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                                        <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                            <Cpu className="w-4 h-4 text-emerald-400" /> Recursos de Infraestrutura
                                        </h3>
                                    </div>
                                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                                        <div className="w-32 h-32 rounded-full border-8 border-slate-800 border-t-emerald-500 flex items-center justify-center relative">
                                            <span className="text-2xl font-black text-slate-50">82%</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-50 text-sm">Carga do Cluster Gemini</p>
                                            <p className="text-xs text-slate-500">Multimodal Pipeline Status: Stable</p>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'campaigns' && (
                        <motion.div 
                            key="campaigns"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-50 tracking-tighter">GESTOR DE CAMPANHAS</h2>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Provisionamento e Bloqueio de Candidatos</p>
                                </div>
                                <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-500 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Nova Campanha
                                </Button>
                            </div>

                            <Card className="bg-slate-900 border-slate-700/50 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-700/50">
                                        <tr>
                                            <th className="px-6 py-4">ID / Candidato</th>
                                            <th className="px-6 py-4">Plano</th>
                                            <th className="px-6 py-4">Features</th>
                                            <th className="px-6 py-4">Faturamento</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Controle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {campaigns.map(c => {
                                            const campaignId = c.campaign_id || c.campaignId;
                                            const config = campaignConfigs[campaignId || ''] || {};
                                            const mStatus = config.maintenanceStatus || (config as any).maintenance_status || 'paid';
                                            return (
                                                <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <p className="font-black text-slate-50 text-sm tracking-tight">{c.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono italic">CID: {campaignId?.substring(0, 12)}...</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <span className="bg-slate-800 text-xs px-2 py-1 rounded font-bold uppercase text-slate-300">
                                                            {c.plan}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex gap-1">
                                                            {config.features?.slice(0, 3).map((f, i) => (
                                                                <span key={i} className="w-2 h-2 rounded-full bg-indigo-500" title={f} />
                                                            ))}
                                                            {(config.features?.length || 0) > 3 && <span className="text-[8px] text-slate-500 font-bold">+{config.features!.length - 3}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {mStatus === 'overdue' ? (
                                                            <span className="text-rose-500 text-[10px] font-black uppercase flex items-center gap-1.5 bg-rose-500/10 px-2 py-1 rounded-full w-fit">
                                                                Atrasado
                                                            </span>
                                                        ) : mStatus === 'pending' ? (
                                                            <span className="text-amber-500 text-[10px] font-black uppercase flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-full w-fit">
                                                                Pendente
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                                                                Pago
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        {c.role === 'blocked' ? (
                                                            <span className="text-rose-500 text-[10px] font-black uppercase flex items-center gap-1.5 bg-rose-500/10 px-2 py-1 rounded-full w-fit">
                                                                <Ban className="w-3 h-3" /> Bloqueado
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-500 text-[10px] font-black uppercase flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
                                                                <CheckCircle className="w-3 h-3" /> Liberado
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button 
                                                                variant="ghost" 
                                                                onClick={() => setShowConfigModal(campaignId || '')}
                                                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-50"
                                                            >
                                                                <Settings className="w-4 h-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                onClick={() => handleToggleUserStatus(c)}
                                                                className={`h-8 w-8 p-0 ${c.role === 'blocked' ? 'text-emerald-500' : 'text-rose-500'}`}
                                                            >
                                                                {c.role === 'blocked' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'users' && (
                        <motion.div 
                            key="users"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-50 tracking-tighter uppercase italic">Global Intelligence: Users</h2>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Banco de Dados Centralizado de Colaboradores</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => setShowCreateUserModal(true)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-2">
                                        <Plus className="w-3 h-3" /> Add Suporte/Manut.
                                    </Button>
                                    <select 
                                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none"
                                        value={userFilter}
                                        onChange={(e) => setUserFilter(e.target.value as any)}
                                    >
                                        <option value="all">Todos os Perfis</option>
                                        <option value="Admin">Admins/Candidatos</option>
                                        <option value="Líder">Líderes</option>
                                        <option value="Apoiador">Apoiadores</option>
                                        <option value="Colaborador">Colaboradores</option>
                                        <option value="Pesquisador">Pesquisadores</option>
                                    </select>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Audit Search..."
                                            className="bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none w-64 focus:ring-1 focus:ring-indigo-500"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Card className="bg-slate-900 border-slate-700/50">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4">Usuário</th>
                                                <th className="px-6 py-4">Status / Role</th>
                                                <th className="px-6 py-4">Créditos IA</th>
                                                <th className="px-6 py-4">Campanha</th>
                                                <th className="px-6 py-4 text-right">Gestão de Credencial</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {filteredUsers.map(u => (
                                                <tr key={u.id} className="hover:bg-white/5 text-sm transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="text-slate-50 font-bold">{u.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">{u.email}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                                u.role === 'blocked' ? 'bg-rose-500/20 text-rose-500' : 'bg-indigo-500/20 text-indigo-500'
                                                            }`}>
                                                                {u.type}
                                                            </span>
                                                            {u.role === 'blocked' && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-indigo-400 font-bold font-mono">
                                                                {(u as any).aiUsed !== undefined ? (u as any).aiUsed : 0} / {(u as any).aiCredits !== undefined ? (u as any).aiCredits : 100}
                                                            </span>
                                                            <div className="w-24 bg-slate-800 h-1 rounded overflow-hidden mt-1">
                                                                <div 
                                                                    className="bg-indigo-500 h-full" 
                                                                    style={{ 
                                                                        width: `${Math.min(100, (((u as any).aiUsed || 0) / ((u as any).aiCredits || 100)) * 100)}%` 
                                                                    }} 
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs text-slate-400">ID: {(u.campaign_id || u.campaignId)?.substring(0, 8)}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            className="text-xs h-7 px-3 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                                                            onClick={() => {
                                                                setEditUserForm({
                                                                    id: u.id || '',
                                                                    name: u.name || '',
                                                                    email: u.email || '',
                                                                    password: '',
                                                                    type: u.type || 'Colaborador',
                                                                    campaign_id: u.campaign_id || u.campaignId || '',
                                                                    ai_credits: (u as any).aiCredits !== undefined && (u as any).aiCredits !== null ? (u as any).aiCredits : 100,
                                                                    ai_used: (u as any).aiUsed !== undefined && (u as any).aiUsed !== null ? (u as any).aiUsed : 0,
                                                                    role: u.role || 'active'
                                                                });
                                                                setShowEditUserModal(true);
                                                            }}
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            className="text-xs h-7 px-3 border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
                                                            onClick={async () => {
                                                                try {
                                                                    const { error } = await supabase.functions.invoke('promote-user', {
                                                                        body: { email: u.email }
                                                                    });
                                                                    if (error) throw error;
                                                                    alert('Usuário promovido com sucesso.');
                                                                } catch (e) { 
                                                                    alert('Erro na promoção.'); 
                                                                    console.error(e);
                                                                }
                                                            }}
                                                        >
                                                            Tornar Admin
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            className="text-xs h-7 px-3 border-slate-700 text-slate-400 hover:text-slate-50"
                                                            onClick={() => setPasswordModal({ isOpen: true, email: u.email })}
                                                        >
                                                            Forçar Senha
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            className="text-xs h-7 px-3 border-slate-700 text-slate-400 hover:text-slate-50"
                                                            onClick={async () => {
                                                                if (window.confirm(`Deseja enviar um email de recuperação para ${u.email}?`)) {
                                                                    await handleResetPassword(u.email);
                                                                }
                                                            }}
                                                        >
                                                            Reset via Email
                                                        </Button>
                                                        <Button 
                                                            variant={u.role === 'blocked' ? 'secondary' : 'danger'}
                                                            className="text-xs h-7 px-3"
                                                            onClick={() => handleToggleUserStatus(u)}
                                                        >
                                                            {u.role === 'blocked' ? 'Ativar' : 'Bloquear'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'financial' && (
                        <motion.div 
                            key="financial"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-8"
                        >
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-50 tracking-tighter uppercase italic">AI Intelligence: Consumption & Cost</h2>
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Monitoramento de Consumo de Tokens em Tempo Real</p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-700/50">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Total Gasto (Estimated)</p>
                                        <p className="text-xl font-black text-emerald-400 font-mono">USD {usageStats.totalCost.toFixed(5)}</p>
                                    </div>
                                    <div className="h-8 w-px bg-white/10" />
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Tokens Processados</p>
                                        <p className="text-xl font-black text-slate-50 font-mono">{usageStats.totalTokens.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="bg-slate-900 border-slate-700/50 p-6 h-[400px]">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-indigo-400" /> Fluxo de Consumo por Modelo
                                    </h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <AreaChart data={aiUsageData.slice().reverse()}>
                                            <defs>
                                                <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis 
                                                dataKey="timestamp" 
                                                hide 
                                            />
                                            <YAxis stroke="#94a3b8" fontSize={10} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                itemStyle={{ fontSize: '12px' }}
                                            />
                                            <Area type="monotone" dataKey="total_tokens" stroke="#6366f1" fillOpacity={1} fill="url(#colorTokens)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Card>

                                <Card className="bg-slate-900 border-slate-700/50 p-6 h-[400px]">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                        <TrendingIcon className="w-4 h-4 text-emerald-400" /> Matriz de Custos por Campanha
                                    </h3>
                                    <ResponsiveContainer width="100%" height="85%">
                                        <BarChart data={campaigns.map(c => {
                                            const campaignId = c.campaign_id || c.campaignId;
                                            const campaignUsage = aiUsageData.filter((u: any) => (u.campaign_id ?? u.campaignId) === campaignId);
                                            return {
                                                name: c.name.substring(0, 10),
                                                cost: campaignUsage.reduce((acc: number, curr: any) => acc + (curr.estimated_cost ?? curr.estimatedCost ?? 0), 0),
                                                tokens: campaignUsage.reduce((acc: number, curr: any) => acc + (curr.total_tokens ?? curr.totalTokens ?? 0), 0)
                                            };
                                        }).filter(c => c.tokens > 0)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                                            <YAxis stroke="#94a3b8" fontSize={10} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            />
                                            <Bar dataKey="cost" fill="#10b981" radius={[4, 4, 0, 0]}>
                                                {campaigns.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fillOpacity={0.8} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Card>
                            </div>

                            {/* Detailed Logs */}
                            <Card className="bg-slate-900 border-slate-700/50 overflow-hidden">
                                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                        <Settings className="w-4 h-4 text-slate-500" /> Histórico Operacional de IA
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" className="h-7 text-[10px] flex items-center gap-2"><Filter className="w-3 h-3" /> Filtrar Usuário</Button>
                                        <Button variant="ghost" className="h-7 text-[10px] flex items-center gap-2"><Download className="w-3 h-3" /> Export CSV</Button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                            <tr>
                                                <th className="px-6 py-4">Sessão / Modelo</th>
                                                <th className="px-6 py-4">Campaign ID</th>
                                                <th className="px-6 py-4">Tokens</th>
                                                <th className="px-6 py-4 text-right">Custo Est.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {aiUsageData.map((usage: any) => (
                                                <tr key={usage.id} className="hover:bg-white/5 text-[11px] transition-colors">
                                                    <td className="px-6 py-3">
                                                        <p className="text-slate-200 font-bold">{usage.model}</p>
                                                        <p className="text-[9px] text-slate-500 font-mono">LOG_ID: {usage.id.substring(0, 10)}</p>
                                                    </td>
                                                    <td className="px-6 py-3 text-slate-400 font-mono">
                                                        {usage.campaign_id}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="text-indigo-400 font-bold">{usage.total_tokens}</span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <span className="text-emerald-500 font-black">USD {(usage.estimated_cost ?? 0).toFixed(6)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {aiUsageData.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500 italic">Nenhum log de IA capturado ainda.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {activeTab === 'platform' && (
                        <motion.div 
                            key="platform"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-8"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card className="bg-slate-900 border-slate-700/50 p-6 space-y-4">
                                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                                        <Layout className="w-6 h-6 text-indigo-400" />
                                        <h3 className="font-bold text-slate-50 uppercase tracking-widest text-sm">Estrutura de Formulários Globais</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 leading-relaxed italic">
                                        Defina campos personalizados para toda a plataforma ou campanhas específicas. 
                                        A sincronização no cluster é enviada em tempo real para as equipes de rua.
                                    </p>
                                    <div className="space-y-3">
                                        {['Configuração de Visitas', 'Reportes de Rua', 'Pesquisa Quantitativa'].map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-700/50 group">
                                                <span className="text-xs font-bold text-slate-300">{f}</span>
                                                <Button variant="ghost" className="h-6 text-[10px] p-0 px-2 opacity-50 group-hover:opacity-100">Configurar Schema</Button>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                <Card className="bg-slate-900 border-slate-700/50 p-6 space-y-4">
                                    <div className="flex items-center gap-3 border-b border-slate-700/50 pb-4">
                                        <CreditCard className="w-6 h-6 text-amber-400" />
                                        <h3 className="font-bold text-slate-50 uppercase tracking-widest text-sm">Planos e Monetização</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[Plan.ESSENCIAL, Plan.ESTRATEGICO, Plan.TOTAL].map((p, i) => (
                                            <div key={i} className="p-4 bg-slate-950 rounded-lg border border-slate-700/50 flex justify-between items-center">
                                                <div>
                                                    <p className="text-sm font-black text-slate-50">{p}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono">LEVEL_{i+1}_ACCESS_PROTOCOL</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-indigo-400">R$ {i === 0 ? '999' : i === 1 ? '2.490' : '5.900'}/camp</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Modals */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="LIBERAR NOVO CANDIDATO">
                <form onSubmit={handleCreateCampaign} className="space-y-4 p-4 text-slate-200">
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded text-rose-500 text-xs font-bold">
                            {error}
                        </div>
                    )}
                    <Input 
                        label="Nome da Campanha / Candidato"
                        value={newCampaign.name} 
                        onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                        required
                    />
                    <Input 
                        label="Email de Acesso (Login)"
                        type="email"
                        value={newCampaign.email} 
                        onChange={e => setNewCampaign({...newCampaign, email: e.target.value})}
                        required
                    />
                    <Input 
                        label="Definir Senha Inicial"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newCampaign.password} 
                        onChange={e => setNewCampaign({...newCampaign, password: e.target.value})}
                        required
                    />
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Plano de Entrada</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            value={newCampaign.plan}
                            onChange={e => setNewCampaign({...newCampaign, plan: e.target.value as Plan})}
                        >
                            <option value={Plan.ESSENCIAL}>Essencial</option>
                            <option value={Plan.ESTRATEGICO}>Estratégico</option>
                            <option value={Plan.TOTAL}>Total (Prime)</option>
                        </select>
                    </div>
                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            className="w-full bg-indigo-600 hover:bg-indigo-500"
                            disabled={isLoading}
                        >
                            {isLoading ? 'EXECUTANDO PROVISIONAMENTO...' : 'Provisionar Servidor da Campanha'}
                        </Button>
                    </div>
                </form>
            </Modal>
            
            {/* Forçar Senha Modal */}
            <Modal 
                isOpen={passwordModal.isOpen} 
                onClose={() => setPasswordModal({ isOpen: false, email: '' })}
                title="GESTÃO DE ACESSO: FORÇAR SENHA"
            >
                <form onSubmit={handleForcePasswordSubmit} className="p-4 space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                        <p className="text-[10px] text-amber-200 uppercase font-bold mb-1">Aviso de Segurança</p>
                        <p className="text-xs text-slate-400">
                            Esta ação altera a senha diretamente no cluster de autenticação. 
                            O usuário <strong>{passwordModal.email}</strong> receberá a nova senha definida abaixo.
                        </p>
                    </div>
                    
                    <Input 
                        label="Nova Senha"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={manualPassword}
                        onChange={e => setManualPassword(e.target.value)}
                        required
                    />
                    
                    <div className="pt-4 flex justify-end gap-3">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setPasswordModal({ isOpen: false, email: '' })}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit"
                            disabled={isManagingPassword}
                        >
                            {isManagingPassword ? 'SUBMETENDO NOVO HASH...' : 'Confirmar Alteração'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Config Campaign Modal */}
            <Modal 
                isOpen={!!showConfigModal} 
                onClose={() => setShowConfigModal(null)} 
                title={`CONFIGURAR CAMPANHA: ${showConfigModal?.substring(0, 8)}`}
            >
                {showConfigModal && (
                    <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {/* Plan Strategy Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 border-b border-indigo-500/20 pb-1">Estratégia de Plano (Upgrade/Downgrade)</h4>
                            <div className="flex gap-2">
                                {[Plan.ESSENCIAL, Plan.ESTRATEGICO, Plan.TOTAL].map(p => {
                                    const userObj = campaigns.find(c => c.campaignId === showConfigModal);
                                    const isCurrent = userObj?.plan === p;
                                    return (
                                        <button 
                                            key={p}
                                            onClick={() => userObj && handleUpdatePlan(String(userObj.id!), showConfigModal, p)}
                                            className={`flex-1 p-2 rounded border text-[10px] font-black uppercase transition-all ${
                                                isCurrent ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-700/50 text-slate-500 hover:border-slate-700'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Limits Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 border-b border-indigo-500/20 pb-1">Recursos e Limites</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-slate-500">IA Calls</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs" 
                                        value={campaignConfigs[showConfigModal]?.limits.aiCalls || 0}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const cfg = campaignConfigs[showConfigModal];
                                            updateConfig(showConfigModal, { limits: { ...cfg.limits, aiCalls: val } });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-slate-500">Equipe</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs" 
                                        value={campaignConfigs[showConfigModal]?.limits.teamMembers || 0}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const cfg = campaignConfigs[showConfigModal];
                                            updateConfig(showConfigModal, { limits: { ...cfg.limits, teamMembers: val } });
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase text-slate-500">Visitas</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs" 
                                        value={campaignConfigs[showConfigModal]?.limits.visits || 0}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            const cfg = campaignConfigs[showConfigModal];
                                            updateConfig(showConfigModal, { limits: { ...cfg.limits, visits: val } });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Maintenance Status Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 border-b border-indigo-500/20 pb-1">Status de Manutenção (Faturamento)</h4>
                            <select 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200"
                                value={campaignConfigs[showConfigModal]?.maintenanceStatus || (campaignConfigs[showConfigModal] as any)?.maintenance_status || 'paid'}
                                onChange={(e) => {
                                    updateConfig(showConfigModal, { maintenanceStatus: e.target.value });
                                }}
                            >
                                <option value="paid">Pago (Ativo)</option>
                                <option value="pending">Pendente (Aviso)</option>
                                <option value="overdue">Atrasado (Suspensão)</option>
                            </select>
                        </div>

                        {/* Features Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 border-b border-indigo-500/20 pb-1">Funcionalidades Liberadas</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {['dashboard', 'visits', 'team', 'reports', 'financial', 'ai_agents', 'content_Brief', 'field_ops'].map(feat => {
                                    const isEnabled = campaignConfigs[showConfigModal]?.features.includes(feat);
                                    return (
                                        <button 
                                            key={feat}
                                            onClick={() => {
                                                const current = campaignConfigs[showConfigModal]?.features || [];
                                                const next = isEnabled ? current.filter(f => f !== feat) : [...current, feat];
                                                updateConfig(showConfigModal, { features: next });
                                            }}
                                            className={`text-[10px] p-2 rounded border transition-all text-left uppercase font-bold flex justify-between items-center ${
                                                isEnabled ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-700/50 text-slate-600 hover:border-slate-700'
                                            }`}
                                        >
                                            {feat.replace('_', ' ')}
                                            {isEnabled && <CheckCircle className="w-3 h-3" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Fields Section */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase text-indigo-400 border-b border-indigo-500/20 pb-1">Campos Customizados (Visitas)</h4>
                            <div className="space-y-2">
                                {(campaignConfigs[showConfigModal]?.customFields?.visits || []).map((f, i) => (
                                    <div key={i} className="flex items-center justify-between p-2 bg-slate-950 rounded text-xs">
                                        <span>{f.label} ({f.type})</span>
                                        <button 
                                            onClick={() => {
                                                const nextFields = campaignConfigs[showConfigModal].customFields.visits.filter((_, idx) => idx !== i);
                                                updateConfig(showConfigModal, { customFields: { ...campaignConfigs[showConfigModal].customFields, visits: nextFields } });
                                            }}
                                            className="text-red-500 hover:text-red-400"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <Button 
                                    variant="ghost" 
                                    className="w-full h-8 text-[10px] border-dashed border-slate-700"
                                    onClick={() => {
                                        const label = prompt('Label do campo:');
                                        if (label) {
                                            const nextFields = [...(campaignConfigs[showConfigModal].customFields?.visits || []), { id: `field_${Date.now()}`, label, type: 'text', required: false }];
                                            updateConfig(showConfigModal, { customFields: { ...campaignConfigs[showConfigModal].customFields, visits: nextFields as CustomField[] } });
                                        }
                                    }}
                                >
                                    + Adicionar Campo à Visita
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button onClick={() => setShowConfigModal(null)} className="w-full">Fechar Painel</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Internal User Modal */}
            <Modal isOpen={showCreateUserModal} onClose={() => setShowCreateUserModal(false)} title="CRIAR USUÁRIO DA PLATAFORMA">
                <form onSubmit={handleCreateInternalUser} className="space-y-4 p-4 text-slate-200">
                    <Input 
                        label="Nome Completo"
                        value={newInternalUser.name} 
                        onChange={e => setNewInternalUser({...newInternalUser, name: e.target.value})}
                        required
                    />
                    <Input 
                        label="Email"
                        type="email"
                        value={newInternalUser.email} 
                        onChange={e => setNewInternalUser({...newInternalUser, email: e.target.value})}
                        required
                    />
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Perfil Profissional</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                            value={newInternalUser.type}
                            onChange={e => setNewInternalUser({...newInternalUser, type: e.target.value as any})}
                        >
                            <option value="Suporte">Suporte Técnico</option>
                            <option value="Manutenção">Manutenção de Dados</option>
                        </select>
                    </div>
                    <div className="pt-4">
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500">Gerar Credencial Global</Button>
                    </div>
                </form>
            </Modal>

            {/* Edit User Modal */}
            <Modal isOpen={showEditUserModal} onClose={() => setShowEditUserModal(false)} title="EDITAR USUÁRIO: SUPREME CONTROL">
                <form onSubmit={handleEditUserSubmit} className="space-y-4 p-4 text-slate-200 max-h-[600px] overflow-y-auto custom-scrollbar">
                    <Input 
                        label="Nome Completo"
                        value={editUserForm.name} 
                        onChange={e => setEditUserForm({...editUserForm, name: e.target.value})}
                        required
                    />
                    <Input 
                        label="Email"
                        type="email"
                        value={editUserForm.email} 
                        onChange={e => setEditUserForm({...editUserForm, email: e.target.value})}
                        required
                    />
                    <Input 
                        label="Nova Senha (deixe em branco para não alterar)"
                        type="password"
                        placeholder="Mínimo 6 caracteres se preenchido"
                        value={editUserForm.password} 
                        onChange={e => setEditUserForm({...editUserForm, password: e.target.value})}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Perfil</label>
                            <select 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200"
                                value={editUserForm.type}
                                onChange={e => setEditUserForm({...editUserForm, type: e.target.value as any})}
                            >
                                <option value="Admin">Admin (Candidato)</option>
                                <option value="Coordenador">Coordenador</option>
                                <option value="Líder">Líder</option>
                                <option value="Apoiador">Apoiador</option>
                                <option value="Colaborador">Colaborador</option>
                                <option value="Pesquisador">Pesquisador</option>
                                <option value="Suporte">Suporte Técnico</option>
                                <option value="Manutenção">Manutenção de Dados</option>
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Status</label>
                            <select 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200"
                                value={editUserForm.role}
                                onChange={e => setEditUserForm({...editUserForm, role: e.target.value as any})}
                            >
                                <option value="active">Ativo (Liberado)</option>
                                <option value="blocked">Bloqueado (Suspenso)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-500">Associar à Campanha</label>
                        <select 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200"
                            value={editUserForm.campaign_id}
                            onChange={e => setEditUserForm({...editUserForm, campaign_id: e.target.value})}
                        >
                            <option value="">Sem Campanha (PLATFORM_CORE)</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.campaign_id || c.campaignId}>
                                    {c.name} ({c.plan})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Créditos de IA</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200"
                                value={editUserForm.ai_credits}
                                onChange={e => setEditUserForm({...editUserForm, ai_credits: parseInt(e.target.value) || 0})}
                                required
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Créditos IA Usados</label>
                            <input 
                                type="number" 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200"
                                value={editUserForm.ai_used}
                                onChange={e => setEditUserForm({...editUserForm, ai_used: parseInt(e.target.value) || 0})}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setShowEditUserModal(false)}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={isSavingUser}
                            className="bg-indigo-600 hover:bg-indigo-500 text-xs"
                        >
                            {isSavingUser ? 'SALVANDO ALTERAÇÕES...' : 'Confirmar Atualização'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SupremeAdminPage;
