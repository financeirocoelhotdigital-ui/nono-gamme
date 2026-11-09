import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth } from "../lib/firebase";
import { StrategicInsight, UserProfile } from "../types";
import { insightsModule } from "../modules/insightsModule";
import { generateStrategicInsights } from "../services/geminiService";
import { useTransacoes } from "./TransacoesContext";
import { useContas } from "./ContasContext";
import { useMetas } from "./MetasContext";
import { useDebts } from "./DebtsContext";
import { useOrcamento } from "./OrcamentoContext";
import { useCashFlow } from "./CashFlowContext";
import { useReminders } from "./ReminderContext";
import { useCalendar } from "./CalendarContext";

interface InsightsContextType {
  insights: StrategicInsight[];
  isLoading: boolean;
  refreshInsights: (userProfile: UserProfile) => Promise<void>;
  archiveInsight: (insightId: string) => Promise<void>;
  deleteInsight: (insightId: string) => Promise<void>;
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

export const InsightsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [insights, setInsights] = useState<StrategicInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals } = useMetas();
  const { debts } = useDebts();
  const { budgets } = useOrcamento();
  const { projection } = useCashFlow();
  const { reminders, userEvents } = useReminders();
  const { analysis } = useCalendar();

  const loadInsights = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = await insightsModule.getInsights(userId);
      setInsights(data);
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshInsights = async (userProfile: UserProfile) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    setIsLoading(true);
    try {
      const data = {
        transactions,
        accounts,
        goals,
        debts,
        budgets,
        cashFlow: projection,
        reminders,
        userEvents
      };

      const newAIInsights = await generateStrategicInsights(userProfile, data);
      
      if (newAIInsights.length > 0) {
        // Map to StrategicInsight interface
        const insightsToSave = newAIInsights.map(insight => ({
          ...insight,
          userId,
          status: "ativo" as const,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }));

        await insightsModule.saveInsights(userId, insightsToSave);
        await loadInsights();
      }
    } catch (error) {
      console.error("Error refreshing insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const archiveInsight = async (insightId: string) => {
    try {
      await insightsModule.updateInsightStatus(insightId, "arquivado");
      setInsights(prev => prev.map(i => i.id === insightId ? { ...i, status: "arquivado" } : i));
    } catch (error) {
      console.error("Error archiving insight:", error);
    }
  };

  const deleteInsight = async (insightId: string) => {
    try {
      await insightsModule.deleteInsight(insightId);
      setInsights(prev => prev.filter(i => i.id !== insightId));
    } catch (error) {
      console.error("Error deleting insight:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadInsights();
      } else {
        setInsights([]);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [loadInsights]);

  return (
    <InsightsContext.Provider
      value={{
        insights,
        isLoading,
        refreshInsights,
        archiveInsight,
        deleteInsight
      }}
    >
      {children}
    </InsightsContext.Provider>
  );
};

export const useInsights = () => {
  const context = useContext(InsightsContext);
  if (context === undefined) {
    throw new Error("useInsights must be used within an InsightsProvider");
  }
  return context;
};
