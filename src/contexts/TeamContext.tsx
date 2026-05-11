import * as React from 'react';
import { supabase } from '../lib/supabaseClient';
import { TeamMember, Location } from '../types/teams';
import { RJ_MUNICIPALITIES } from '../data/rj-locations';
import { handleSupabaseError, sanitizeData, OperationType } from '../utils/supabaseUtils';
import { useAuth } from './AuthContext';

interface TeamContextType {
    teamMembers: TeamMember[];
    addTeamMember: (member: Omit<TeamMember, 'id'>) => Promise<void>;
    updateTeamMember: (member: TeamMember) => Promise<void>;
    deleteTeamMember: (id: string | number) => Promise<void>;
    locations: Location[];
    addLocation: (location: Omit<Location, 'id'>) => Promise<void>;
    deleteLocation: (id: string | number) => Promise<void>;
    loadRioBairros: () => void;
}

const TeamContext = React.createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children?: React.ReactNode }) => {
    const { user } = useAuth();
    const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
    const [locations, setLocations] = React.useState<Location[]>([]);

    React.useEffect(() => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;

        const fetchData = async () => {
            let teamQuery = supabase
                .from('team_members')
                .select('*')
                .eq('campaign_id', campaignId);

            if (user.type === 'Líder') {
                teamQuery = teamQuery.eq('assigned_leader_id', user.uid);
            } else if (user.type !== 'Admin' && user.type !== 'Candidato') {
                teamQuery = teamQuery.eq('email', user.email);
            }

            console.log("[TeamContext] Buscando membros para campanha:", campaignId, "Tipo usuário:", user.type);
            const { data: teamData, error: teamError } = await teamQuery;
            console.log("[TeamContext] Membros encontrados:", teamData?.length || 0);
            
            if (teamError) {
                console.error("[TeamContext] Erro ao buscar membros:", teamError);
                handleSupabaseError(teamError, OperationType.GET, 'team_members');
            }
            else setTeamMembers(teamData as TeamMember[]);

            const { data: locData, error: locError } = await supabase
                .from('locations')
                .select('*')
                .eq('campaign_id', campaignId);
            
            if (locError) handleSupabaseError(locError, OperationType.GET, 'locations');
            else setLocations(locData as Location[]);
        };

        fetchData();

        const channelTeamId = `team-${campaignId}`;
        const channelTeam = supabase.channel(channelTeamId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members', filter: `campaign_id=eq.${campaignId}` }, fetchData)
            .subscribe();

        const channelLocsId = `locations-${campaignId}`;
        const channelLocs = supabase.channel(channelLocsId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'locations', filter: `campaign_id=eq.${campaignId}` }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channelTeam);
            supabase.removeChannel(channelLocs);
        };
    }, [user?.campaign_id, user?.campaignId, user?.type, user?.uid]);

    const addTeamMember = async (member: Omit<TeamMember, 'id'>) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) {
            alert('Erro: usuário sem campanha vinculada. Faça logout e login novamente.');
            throw new Error('campaignId não definido para este usuário');
        }
        const assignedLeaderId = user.type === 'Líder' ? user.uid : (member.assignedLeaderId || null);
        const { password, ...memberWithoutPassword } = member as any;
        const { error } = await supabase.from('team_members').insert(sanitizeData({
            ...memberWithoutPassword,
            campaign_id: campaignId,
            added_by: user.uid,
            assigned_leader_id: assignedLeaderId,
        }));
        if (error) await handleSupabaseError(error, OperationType.CREATE, 'team_members');
    };

    const updateTeamMember = async (updatedMember: TeamMember) => {
        try {
            const { id, password, ...data } = updatedMember as any;
            const { error } = await supabase.from('team_members').update(sanitizeData(data)).eq('id', id);
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `team_members/${updatedMember.id}`);
        }
    };

    const deleteTeamMember = async (id: string | number) => {
        try {
            const { error } = await supabase.from('team_members').delete().eq('id', String(id));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `team_members/${id}`);
        }
    };

    const addLocation = async (location: Omit<Location, 'id'>) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase.from('locations').insert(sanitizeData({
                ...location,
                campaign_id: campaignId
            }));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'locations');
        }
    };

    const deleteLocation = async (id: string | number) => {
        try {
            const { error } = await supabase.from('locations').delete().eq('id', String(id));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `locations/${id}`);
        }
    };
    
    const loadRioBairros = () => {
        const existingKeys = new Set(locations.map(l => `${l.municipality.toLowerCase()}|${l.name.toLowerCase()}`));
        
        RJ_MUNICIPALITIES.forEach(municipality => {
            municipality.neighborhoods.forEach(async (bairro) => {
                const key = `${municipality.name.toLowerCase()}|${bairro.toLowerCase()}`;
                if (!existingKeys.has(key)) {
                    await addLocation({ 
                        name: bairro, 
                        municipality: municipality.name 
                    });
                }
            });
        });
    };

    const value = {
        teamMembers, addTeamMember, updateTeamMember, deleteTeamMember,
        locations, addLocation, deleteLocation, loadRioBairros,
    };

    return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeam = () => {
    const context = React.useContext(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
};
