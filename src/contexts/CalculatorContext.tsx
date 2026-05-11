import * as React from 'react';
import { supabase } from '../lib/supabaseClient';
import { Scenario, CalculatorState } from '../types/calculator';
import { getNextElectionDate } from '../utils/helpers';
import { handleSupabaseError, sanitizeData, OperationType } from '../utils/supabaseUtils';
import { useAuth } from './AuthContext';

interface CalculatorContextType {
    scenarios: Scenario[];
    addScenario: (scenario: Omit<Scenario, 'id'>) => Promise<void>;
    deleteScenario: (id: string | number) => Promise<void>;
    idealScenarioId: string | number | null;
    setIdealScenarioId: (id: string | number | null) => Promise<void>;
    calcState: CalculatorState;
    setCalcState: (state: CalculatorState) => Promise<void>;
}

const CalculatorContext = React.createContext<CalculatorContextType | undefined>(undefined);

const initialCalcState: CalculatorState = { meta: 2000, eleicao: getNextElectionDate(), ds: 5, vpf: 5, cap: 10, buff: 20 };

export const CalculatorProvider = ({ children }: { children?: React.ReactNode }) => {
    const { user } = useAuth();
    const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
    const [idealScenarioId, setIdealScenarioIdState] = React.useState<string | number | null>(null);
    const [calcState, setCalcStateState] = React.useState<CalculatorState>(initialCalcState);

    React.useEffect(() => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;

        const fetchScenarios = async () => {
            const { data, error } = await supabase
                .from('scenarios')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });
            
            if (error) handleSupabaseError(error, OperationType.GET, 'scenarios');
            else setScenarios(data as Scenario[]);
        };

        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('calculator_settings')
                .select('*')
                .eq('id', campaignId)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') handleSupabaseError(error, OperationType.GET, `calculator_settings/${campaignId}`);
            else if (data) {
                if (data.ideal_scenario_id !== undefined) setIdealScenarioIdState(data.ideal_scenario_id);
                if (data.calc_state) setCalcStateState(data.calc_state as CalculatorState);
            }
        };

        fetchScenarios();
        fetchSettings();

        const channelScenariosId = `scenarios-${campaignId}`;
        const channelScenarios = supabase.channel(channelScenariosId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scenarios', filter: `campaign_id=eq.${campaignId}` }, fetchScenarios)
            .subscribe();

        const channelSettingsId = `calc-settings-${campaignId}`;
        const channelSettings = supabase.channel(channelSettingsId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'calculator_settings', filter: `id=eq.${campaignId}` }, fetchSettings)
            .subscribe();

        return () => {
            supabase.removeChannel(channelScenarios);
            supabase.removeChannel(channelSettings);
        };
    }, [user?.campaign_id, user?.campaignId]);

    const addScenario = async (scenario: Omit<Scenario, 'id'>) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase.from('scenarios').insert(sanitizeData({ 
                ...scenario, 
                campaign_id: campaignId,
                created_at: new Date().toISOString(),
            }));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'scenarios');
        }
    };

    const deleteScenario = async (id: string | number) => {
        try {
            if (idealScenarioId === id) await setIdealScenarioId(null);
            const { error } = await supabase.from('scenarios').delete().eq('id', String(id));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `scenarios/${id}`);
        }
    };

    const setIdealScenarioId = async (id: string | number | null) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase
                .from('calculator_settings')
                .upsert({ id: campaignId, ideal_scenario_id: id });
            if (error) throw error;
            setIdealScenarioIdState(id);
        } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `calculator_settings/${campaignId}`);
        }
    };

    const setCalcState = async (state: CalculatorState) => {
        // Atualiza o estado local imediatamente (optimistic update)
        setCalcStateState(state);
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase
                .from('calculator_settings')
                .upsert({ id: campaignId, calc_state: sanitizeData(state) });
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.UPDATE, `calculator_settings/${campaignId}`);
        }
    };

    const value = {
        scenarios, addScenario, deleteScenario, idealScenarioId, setIdealScenarioId,
        calcState, setCalcState
    };

    return <CalculatorContext.Provider value={value}>{children}</CalculatorContext.Provider>;
};

export const useCalculator = () => {
    const context = React.useContext(CalculatorContext);
    if (context === undefined) {
        throw new Error('useCalculator must be used within a CalculatorProvider');
    }
    return context;
};
