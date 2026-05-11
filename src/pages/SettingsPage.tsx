import { useSettings } from '../contexts/SettingsContext';
import CampaignDetailsForm from '../components/settings/CampaignDetailsForm';
import Card from '../components/ui/Card';
import { CogIcon, RefreshIcon } from '../components/icons';
import { syncVoterJourneys } from '../services/voterJourneyService';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const SettingsPage = () => {
    const { campaignDetails, updateCampaignDetails } = useSettings();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <CogIcon className="h-8 w-8 text-sky-400" />
                <h2 className="text-2xl font-bold text-slate-200">Configurações da Campanha</h2>
            </div>
            
            <Card>
                <h3 className="text-lg font-bold text-slate-300 mb-4">Dados do Candidato e Orçamento</h3>
                <p className="text-sm text-slate-400 mb-6">
                    Preencha as informações oficiais da sua campanha. O valor do orçamento será usado como base para os cálculos no dashboard financeiro.
                </p>
                <CampaignDetailsForm 
                    initialDetails={campaignDetails}
                    onSave={updateCampaignDetails}
                />
            </Card>

            <MaintenanceSection />
        </div>
    );
};

const MaintenanceSection = () => {
    const { user } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const handleSync = async () => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        setSyncing(true);
        setResult(null);
        try {
            const count = await syncVoterJourneys(campaignId);
            setResult(`Sucesso! ${count} eleitores sincronizados com o motor de jornada.`);
        } catch (e) {
            setResult("Erro ao sincronizar dados.");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Card className="border-t-4 border-t-yellow-500">
            <h3 className="text-lg font-bold text-slate-300 mb-2">Manutenção e Sincronização</h3>
            <p className="text-sm text-slate-400 mb-6">
                Use esta ferramenta para atualizar a jornada de todos os eleitores antigos que ainda não possuem estágio de voto calculado.
            </p>
            <button 
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-slate-50 px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50"
            >
                <RefreshIcon className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Jornada do Eleitor'}
            </button>
            {result && <p className="mt-4 text-sm font-bold text-emerald-400">{result}</p>}
        </Card>
    );
};

export default SettingsPage;