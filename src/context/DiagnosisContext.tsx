import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, getDocFromCache, updateDoc } from "firebase/firestore";
import { FinancialDiagnosis, UserBadge, ScoreHistory, Badge, FinancialProfile } from "../types";
import { diagnosisModule, BADGES } from "../modules/diagnosisModule";
import { useTransacoes } from "./TransacoesContext";
import { useContas } from "./ContasContext";
import { useMetas } from "./MetasContext";
import { useDebts } from "./DebtsContext";
import { useOrcamento } from "./OrcamentoContext";
import { useCashFlow } from "./CashFlowContext";
import { useLifePlan } from "./LifePlanContext";
import { useWealth } from "./WealthContext";
import { useInvestments } from "./InvestmentContext";
import { useCartoes } from "./CartoesContext";

interface DiagnosisContextType {
  diagnosis: FinancialDiagnosis | null;
  userBadges: UserBadge[];
  scoreHistory: ScoreHistory[];
  financialProfile: FinancialProfile | null;
  isLoading: boolean;
  refreshDiagnosis: (forcedProfile?: FinancialProfile) => Promise<void>;
  updateFinancialProfile: (profile: FinancialProfile) => Promise<void>;
  availableBadges: Badge[];
}

const DiagnosisContext = createContext<DiagnosisContextType | undefined>(undefined);

export const DiagnosisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [diagnosis, setDiagnosis] = useState<FinancialDiagnosis | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreHistory[]>([]);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals } = useMetas();
  const { debts } = useDebts();
  const { budgets } = useOrcamento();
  const { projection } = useCashFlow();
  const { lifePlan } = useLifePlan();
  const { wealth } = useWealth();
  const { investments } = useInvestments();
  const { cards } = useCartoes();

  const loadData = useCallback(async () => {
    const userId = auth.currentUser?.uid || "local_user";

    try {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocPromise = getDoc(userDocRef).catch((e: any) => {
          if (e.code === 'unavailable' || e.message?.includes('offline')) {
            return getDocFromCache(userDocRef);
          }
          throw e;
        });

        const [latest, badges, history, userDoc] = await Promise.all([
          diagnosisModule.getLatestDiagnosis(auth.currentUser.uid),
          diagnosisModule.getUserBadges(auth.currentUser.uid),
          diagnosisModule.getScoreHistory(auth.currentUser.uid),
          userDocPromise
        ]);

        if (latest) setDiagnosis(latest);
        setUserBadges(badges);
        setScoreHistory(history);

        if (userDoc?.exists()) {
          const userData = userDoc.data();
          if (userData.financialProfile) {
            setFinancialProfile(userData.financialProfile);
          }
        }
      } else {
        const badges = await diagnosisModule.getUserBadges("local_user");
        setUserBadges(badges);
      }
    } catch (error) {
      console.warn("Notice loading diagnosis data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshDiagnosis = async (forcedProfile?: FinancialProfile) => {
    const userId = auth.currentUser?.uid || "local_user";

    setIsLoading(true);
    try {
      const activeProfile = forcedProfile !== undefined ? forcedProfile : financialProfile;

      const data = {
        transactions,
        accounts,
        goals,
        debts,
        budgets,
        cashFlow: projection,
        wealth,
        investments,
        cards,
        financialProfile: activeProfile
      };

      const result = diagnosisModule.calculateScore(data);
      
      const newDiagnosis: FinancialDiagnosis = {
        id: `diag_${Date.now()}`,
        userId,
        score: result.score,
        level: result.level,
        date: new Date().toISOString(),
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        risks: result.risks,
        recommendations: result.recommendations,
        createdAt: new Date().toISOString()
      };

      setDiagnosis(newDiagnosis);

      if (auth.currentUser) {
        try {
          await diagnosisModule.saveDiagnosis(auth.currentUser.uid, newDiagnosis);
        } catch (e) {
          console.warn("Firestore save diagnosis notice:", e);
        }
      }

      await diagnosisModule.checkAndUnlockBadges(userId, { ...data, lifePlan });
      const badges = await diagnosisModule.getUserBadges(userId);
      setUserBadges(badges);
    } catch (error) {
      console.warn("Notice refreshing diagnosis:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFinancialProfile = async (profile: FinancialProfile) => {
    const userId = auth.currentUser?.uid;
    setFinancialProfile(profile);

    if (userId) {
      try {
        setIsLoading(true);
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          financialProfile: profile
        });
      } catch (error) {
        console.warn("Notice updating financial profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    await refreshDiagnosis(profile);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  return (
    <DiagnosisContext.Provider
      value={{
        diagnosis,
        userBadges,
        scoreHistory,
        financialProfile,
        isLoading,
        refreshDiagnosis,
        updateFinancialProfile,
        availableBadges: BADGES
      }}
    >
      {children}
    </DiagnosisContext.Provider>
  );
};

export const useDiagnosis = () => {
  const context = useContext(DiagnosisContext);
  if (context === undefined) {
    throw new Error("useDiagnosis must be used within a DiagnosisProvider");
  }
  return context;
};
