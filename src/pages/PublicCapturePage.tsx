import React, { useState } from 'react';
import { 
  Heart, Send, CheckCircle2, User, Phone, 
  MapPin, Calendar, Sparkles, ShieldCheck 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PublicCapturePage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    neighborhood: '',
    birthDate: '',
    interests: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [consent, setConsent] = useState(false);

  // Pega o campaignId da URL (ex: ?c=CAMPAIGN_ID)
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get('c') || 'default';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // Inserir contato com colunas snake_case
      const { error } = await supabase
        .from('contacts')
        .insert({
          name: formData.name,
          phone: formData.phone,
          neighborhood: formData.neighborhood,
          birth_date: formData.birthDate,
          campaign_id: campaignId,
          source: 'App Externa',
          classification: 'Indeciso', // Triagem inicial
          tags: formData.interests,
          created_at: new Date().toISOString()
        });
  
      if (error) throw error;
  
      // Buscar o ID do novo contato para registros relacionados
      const { data: newContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', formData.phone)
        .eq('campaign_id', campaignId)
        .single();
  
      if (newContact) {
        // Gravar registro de consentimento (snake_case)
        await supabase.from('consent_records').insert({
          campaign_id: campaignId,
          contact_id: newContact.id,
          consent_type: 'electoral_marketing',
          granted: true,
          source: 'public_capture_page',
          privacy_notice_version: '1.0',
          user_agent: navigator.userAgent
        });
  
        // Iniciar Jornada do Eleitor (snake_case)
        await supabase.from('voter_journey').insert({
          campaign_id: campaignId,
          contact_id: newContact.id,
          current_stage: 'capturado',
          consent_status: 'granted'
        });
      }
  
      setSuccess(true);
    } catch (err) {
      console.error("Erro ao se cadastrar:", err);
      alert("Ocorreu um erro ao enviar seu cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-10 rounded-3xl bg-gradient-to-b from-[#161b22] to-[#0d1117] border border-emerald-500/30 shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black mb-4">Obrigado por apoiar!</h2>
          <p className="text-slate-400 leading-relaxed mb-8">
            Seu cadastro foi recebido com sucesso. Nossa equipe (e nossa inteligência artificial) entrará em contato em breve.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 rounded-2xl bg-white/5 border border-slate-700 hover:bg-white/10 transition-all font-bold"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Background Decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-emerald-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-xl mx-auto p-6 pt-16 relative z-10">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3 h-3" /> Juntos por uma mudança real
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
            Quero Ser um <br/>
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Apoiador Oficial</span>
          </h1>
          <p className="text-slate-400">
            Cadastre-se para receber novidades, convites para reuniões e ajudar a construir o futuro da nossa cidade.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-800/80/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-700 shadow-2xl">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                <input 
                  required
                  type="text" 
                  placeholder="Seu Nome Completo"
                  className="w-full bg-black/40 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                <input 
                  required
                  type="tel" 
                  placeholder="WhatsApp (com DDD)"
                  className="w-full bg-black/40 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                  <input 
                    required
                    type="text" 
                    placeholder="Seu Bairro"
                    className="w-full bg-black/40 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={formData.neighborhood}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                  />
                </div>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors w-5 h-5" />
                  <input 
                    type="date" 
                    className="w-full bg-black/40 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-400"
                    value={formData.birthDate}
                    onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Interesses principais:</p>
              <div className="flex flex-wrap gap-2">
                {['Saúde', 'Educação', 'Segurança', 'Causa Animal', 'Emprego', 'Cultura'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const newInterests = formData.interests.includes(tag)
                        ? formData.interests.filter(i => i !== tag)
                        : [...formData.interests, tag];
                      setFormData({...formData, interests: newInterests});
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                      formData.interests.includes(tag)
                        ? 'bg-blue-600 border-blue-500 text-slate-50 shadow-lg shadow-blue-600/20'
                        : 'bg-white/5 border-slate-700 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-slate-800/80/50 border border-slate-700 rounded-2xl">
            <input 
              required
              type="checkbox" 
              id="consent"
              className="mt-1 w-5 h-5 rounded border-slate-700 bg-black/40 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
            />
            <label htmlFor="consent" className="text-[11px] text-slate-400 leading-snug cursor-pointer">
              Autorizo o uso dos meus dados para contato político-eleitoral, envio de informações da campanha e registro das minhas preferências, conforme a <a href="#" onClick={(e) => { e.preventDefault(); alert('Política de Privacidade: Seus dados serão usados exclusivamente para fins de campanha eleitoral, garantindo o direito à informação e participação política, em conformidade com a LGPD.'); }} className="text-blue-400 underline">política de privacidade</a>.
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading || !consent}
            className="w-full py-5 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-slate-50 font-black text-lg shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                Confirmar Apoio <Send className="w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-slate-600 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Seus dados estão seguros e protegidos pela LGPD.
          </p>
        </form>

        <footer className="mt-16 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
            Feito com <Heart className="w-3 h-3 text-red-500" /> pela plataforma CampanhaPro
          </p>
        </footer>
      </div>
    </div>
  );
};

export default PublicCapturePage;
