import * as React from 'react';
import { supabase } from '../lib/supabaseClient';
import { Visit } from '../types/visits';
import { EngagementAction } from '../types/engagement';
import { handleSupabaseError, sanitizeData, OperationType } from '../utils/supabaseUtils';
import { useAuth } from './AuthContext';

interface VisitsContextType {
    visits: Visit[];
    addVisit: (visit: Omit<Visit, 'id'>) => Promise<void>;
    updateVisit: (visit: Visit) => Promise<void>;
    deleteVisit: (id: string | number) => Promise<void>;
    engagementActions: EngagementAction[];
    addEngagementAction: (action: Omit<EngagementAction, 'id'>) => Promise<void>;
    isLoading: boolean;
}

const VisitsContext = React.createContext<VisitsContextType | undefined>(undefined);

export const VisitsProvider = ({ children }: { children?: React.ReactNode }) => {
    const { user } = useAuth();
    const [visits, setVisits] = React.useState<Visit[]>([]);
    const [engagementActions, setEngagementActions] = React.useState<EngagementAction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!user) return;
        const currentCampaignId = user.campaign_id || user.campaignId;
        if (!currentCampaignId) return;

        const buildVisitsQuery = () => {
            let query = supabase
                .from('visits')
                .select('*')
                .eq('campaign_id', currentCampaignId)
                .order('data', { ascending: false });

            if (user.type === 'Líder') {
                query = query.eq('leader_id', user.uid);
            }
            return query;
        };

        const buildEngagementQuery = () => {
             return supabase
                .from('engagement_actions')
                .select('*')
                .eq('campaign_id', currentCampaignId)
                .order('data', { ascending: false });
        };

        const fetchVisits = async () => {
            const { data, error } = await buildVisitsQuery();
            if (error) handleSupabaseError(error, OperationType.GET, 'visits');
            else setVisits(data as Visit[]);
        };

        const fetchEngagement = async () => {
             const { data, error } = await buildEngagementQuery();
             if (error) handleSupabaseError(error, OperationType.GET, 'engagement_actions');
             else setEngagementActions(data as EngagementAction[]);
        };

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [visitsResponse, engagementResponse] = await Promise.all([
                    buildVisitsQuery(),
                    buildEngagementQuery()
                ]);

                if (visitsResponse.error) handleSupabaseError(visitsResponse.error, OperationType.GET, 'visits');
                else setVisits(visitsResponse.data as Visit[]);

                if (engagementResponse.error) handleSupabaseError(engagementResponse.error, OperationType.GET, 'engagement_actions');
                else setEngagementActions(engagementResponse.data as EngagementAction[]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const channelVisitsId = `visits-${currentCampaignId}`;
        const channelVisits = supabase.channel(channelVisitsId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'visits', filter: `campaign_id=eq.${currentCampaignId}` }, fetchVisits)
            .subscribe();

        const channelEngagementId = `engagement-${currentCampaignId}`;
        const channelEngagement = supabase.channel(channelEngagementId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_actions', filter: `campaign_id=eq.${currentCampaignId}` }, fetchEngagement)
            .subscribe();

        return () => {
            supabase.removeChannel(channelVisits);
            supabase.removeChannel(channelEngagement);
        };
    }, [user?.campaign_id, user?.campaignId, user?.type, user?.uid]);

    const addVisit = async (visit: Omit<Visit, 'id'>) => {
        try {
            const currentCampaignId = user?.campaign_id || user?.campaignId;
            const dataToSave = {
                ...visit,
                campaign_id: currentCampaignId,
                created_by: user?.uid,
                leader_id: user?.type === 'Líder' ? user?.uid : (user?.assigned_leader_id || user?.assignedLeaderId || null),
            };
            const { error } = await supabase.from('visits').insert(sanitizeData(dataToSave));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'visits');
        }
    };

    const updateVisit = async (updatedVisit: Visit) => {
        try {
            const { id, ...data } = updatedVisit;
            const { error } = await supabase.from('visits').update(sanitizeData(data)).eq('id', id);
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `visits/${updatedVisit.id}`);
        }
    };

    const deleteVisit = async (id: string | number) => {
        try {
            const { error } = await supabase.from('visits').delete().eq('id', String(id));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `visits/${id}`);
        }
    };

    const addEngagementAction = async (action: Omit<EngagementAction, 'id'>) => {
        try {
            const currentCampaignId = user?.campaign_id || user?.campaignId;
            const { error } = await supabase.from('engagement_actions').insert(sanitizeData({
                ...action,
                campaign_id: currentCampaignId,
                created_by: user?.uid,
            }));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'engagement_actions');
        }
    };

    const value = {
        visits, addVisit, updateVisit, deleteVisit,
        engagementActions, addEngagementAction, isLoading
    };

    return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
};

export const useVisits = () => {
    const context = React.useContext(VisitsContext);
    if (context === undefined) {
        throw new Error('useVisits must be used within a VisitsProvider');
    }
    return context;
};