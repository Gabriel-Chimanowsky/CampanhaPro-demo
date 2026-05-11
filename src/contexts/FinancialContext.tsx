import * as React from 'react';
import { supabase } from '../lib/supabaseClient';
import { Income, Expense } from '../types/financial';
import { handleSupabaseError, sanitizeData, OperationType } from '../utils/supabaseUtils';
import { useAuth } from './AuthContext';

interface FinancialContextType {
    incomes: Income[];
    addIncome: (income: Omit<Income, 'id'>) => Promise<void>;
    deleteIncome: (id: string | number) => Promise<void>;
    expenses: Expense[];
    addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
    deleteExpense: (id: string | number) => Promise<void>;
}

const FinancialContext = React.createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children?: React.ReactNode }) => {
    const { user } = useAuth();
    const [incomes, setIncomes] = React.useState<Income[]>([]);
    const [expenses, setExpenses] = React.useState<Expense[]>([]);

    React.useEffect(() => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;

        // Verifica se é Líder ou Admin
        if (user.type !== 'Admin' && user.type !== 'Líder' && user.type !== 'Candidato') return;

        const fetchData = async () => {
            const { data: incomesData, error: incomesError } = await supabase
                .from('incomes')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('data', { ascending: false });
            
            if (incomesError) handleSupabaseError(incomesError, OperationType.GET, 'incomes');
            else setIncomes(incomesData as Income[]);

            const { data: expensesData, error: expensesError } = await supabase
                .from('expenses')
                .select('*')
                .eq('campaign_id', campaignId)
                .order('data', { ascending: false });
                
            if (expensesError) handleSupabaseError(expensesError, OperationType.GET, 'expenses');
            else setExpenses(expensesData as Expense[]);
        };

        fetchData();

        const channelIncomesId = `incomes-${campaignId}`;
        const channelIncomes = supabase.channel(channelIncomesId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes', filter: `campaign_id=eq.${campaignId}` }, fetchData)
            .subscribe();

        const channelExpensesId = `expenses-${campaignId}`;
        const channelExpenses = supabase.channel(channelExpensesId)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `campaign_id=eq.${campaignId}` }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(channelIncomes);
            supabase.removeChannel(channelExpenses);
        };
    }, [user?.campaign_id, user?.campaignId, user?.type]);

    const addIncome = async (income: Omit<Income, 'id'>) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase.from('incomes').insert(sanitizeData({ 
                ...income, 
                campaign_id: campaignId,
                created_by: user.uid, 
            }));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'incomes');
        }
    };

    const deleteIncome = async (id: string | number) => {
        try {
            const { error } = await supabase.from('incomes').delete().eq('id', String(id));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `incomes/${id}`);
        }
    };
    
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        const campaignId = user?.campaign_id || user?.campaignId;
        if (!campaignId) return;
        try {
            const { error } = await supabase.from('expenses').insert(sanitizeData({ 
                ...expense, 
                campaign_id: campaignId,
                created_by: user.uid, 
            }));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.CREATE, 'expenses');
        }
    };

    const deleteExpense = async (id: string | number) => {
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', String(id));
            if (error) throw error;
        } catch (error) {
            handleSupabaseError(error, OperationType.DELETE, `expenses/${id}`);
        }
    };

    const value = {
        incomes, addIncome, deleteIncome,
        expenses, addExpense, deleteExpense,
    };

    return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = () => {
    const context = React.useContext(FinancialContext);
    if (context === undefined) {
        throw new Error('useFinancial must be used within a FinancialProvider');
    }
    return context;
};
