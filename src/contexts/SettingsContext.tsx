import * as React from 'react';
import { supabase } from '../lib/supabaseClient';
import { handleSupabaseError, sanitizeData, OperationType } from '../utils/supabaseUtils';
import { CampaignDetails } from '../types/campaign';
import { useAuth } from './AuthContext';

interface SettingsContextType {
    campaignDetails: CampaignDetails;
    updateCampaignDetails: (details: CampaignDetails) => Promise<void>;
    headerLogo: string | null;
    updateHeaderLogo: (logo: string | null) => Promise<void>;
    footerLogo: string | null;
    updateFooterLogo: (logo: string | null) => Promise<void>;
}

const SettingsContext = React.createContext<SettingsContextType | undefined>(undefined);

const initialCampaignDetails: CampaignDetails = {
    nomeCompleto: '',
    nomeUrna: '',
    numero: '',
    partido: '',
    cnpj: '',
    cpf: '',
    identidade: '',
    dataNascimento: '',
    estadoCivil: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    orcamento: 50000,
    candidatePhotoUrl: ''
};

export const SettingsProvider = ({ children }: { children?: React.ReactNode }) => {
    const { user } = useAuth();
    const [campaignDetails, setCampaignDetails] = React.useState<CampaignDetails>(initialCampaignDetails);
    const [headerLogo, setHeaderLogo] = React.useState<string | null>(null);
    const [footerLogo, setFooterLogo] = React.useState<string | null>(null);

    React.useEffect(() => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;

        const fetchData = async () => {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .eq('id', campaignId)
                .maybeSingle();

            if (error) {
                if (error.code !== 'PGRST116') {
                    handleSupabaseError(error, OperationType.GET, `settings/${campaignId}`);
                }
            } else if (data) {
                if (data.campaign_details) setCampaignDetails(data.campaign_details as CampaignDetails);
                if (data.header_logo) setHeaderLogo(data.header_logo);
                if (data.footer_logo) setFooterLogo(data.footer_logo);
            }
        };

        fetchData();

        // Canal único por execução do effect — evita conflito quando React re-roda
        // o effect (Strict Mode) e tenta registrar callbacks num canal já subscrito.
        const channelId = `settings-changes-${campaignId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const channel = supabase.channel(channelId);

        channel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'settings', filter: `id=eq.${campaignId}` },
                fetchData
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch (err) {
                // Silencia erros de cleanup (pode ocorrer se canal já foi removido)
            }
        };
    }, [user?.campaign_id, user?.campaignId]);


    const updateSettings = async (updates: Record<string, any>) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    id: campaignId,
                    ...sanitizeData(updates),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.WRITE, `settings/${user.campaignId}`);
        }
    };

    const updateCampaignDetails = async (details: CampaignDetails) => {
        await updateSettings({ campaign_details: details });
        setCampaignDetails(details);
    };

    const updateHeaderLogo = async (logo: string | null) => {
        await updateSettings({ header_logo: logo });
        setHeaderLogo(logo);
    };

    const updateFooterLogo = async (logo: string | null) => {
        await updateSettings({ footer_logo: logo });
        setFooterLogo(logo);
    };

    const value = {
        campaignDetails, updateCampaignDetails,
        headerLogo, updateHeaderLogo,
        footerLogo, updateFooterLogo
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
    const context = React.useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
