import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { Goal, GoalContribution, Account, Transaction } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { metas as metasModule } from "../modules/metasModule";
import { useContas } from "./ContasContext";
import { useTransacoes } from "./TransacoesContext";
import { getActiveUserId } from "../lib/authUtils";
import { parseCurrencyInput } from "../lib/utils";

const LOCAL_STORAGE_KEY = "finance_local_goals_v1";

export function getStoredGoals(): Goal[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar metas do localStorage:", e);
  }
  return [];
}

export function saveStoredGoals(goals: Goal[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(goals));
    window.dispatchEvent(new CustomEvent("local_goals_changed"));
  } catch (e) {
    console.warn("Erro ao salvar metas no localStorage:", e);
  }
}

interface GoalWithStats extends Goal {
  monthlyNeeded: number;
  health: "verde" | "amarelo" | "vermelho";
  timeProgress: number;
  financialProgress: number;
  isAhead: boolean;
  daysRemaining: number;
  monthsRemaining: number;
}

interface MetasContextType {
  goals: GoalWithStats[];
  stats: {
    totalSaved: number;
    totalTarget: number;
    health: "verde" | "amarelo" | "vermelho";
  };
  loading: boolean;
  createGoal: (data: Omit<Goal, 'id' | 'userId' | 'createdAt'>) => Promise<string | null>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<boolean>;
  addContribution: (goalId: string, value: number, type: "manual" | "auto" | "linked_account", description?: string) => Promise<boolean>;
  suggestAutoContributions: (income: number) => { goalId: string, value: number, name: string }[];
}

const MetasContext = createContext<MetasContextType | undefined>(undefined);

export function MetasProvider({ children }: { children: ReactNode }) {
  const [rawGoals, setRawGoals] = useState<Goal[]>(getStoredGoals);
  const [loading, setLoading] = useState(false);
  const { accounts } = useContas();
  const { transactions } = useTransacoes();

  // Listen to local changes across components or tabs
  useEffect(() => {
    const handleStorageChange = () => {
      setRawGoals(getStoredGoals());
    };
    window.addEventListener("local_goals_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_goals_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      const activeUid = user?.uid || getActiveUserId();

      if (user) {
        // Query by userId only to avoid requiring composite indexes in Firestore
        const q = query(
          collection(db, "goals"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const firestoreGoals = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as Goal));

            // Merge with any local goals
            const localGoals = getStoredGoals();
            const merged = [...firestoreGoals];
            for (const localG of localGoals) {
              if (!merged.some(g => g.id === localG.id)) {
                if (localG.userId === user.uid || !localG.userId || localG.userId === "default_user") {
                  merged.push({ ...localG, userId: user.uid });
                }
              }
            }

            merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setRawGoals(merged);
            saveStoredGoals(merged);
            setLoading(false);
          },
          (err) => {
            console.warn("Notice: Firestore goals snapshot warning (using local):", err);
            setRawGoals(getStoredGoals());
            setLoading(false);
          }
        );
      } else {
        setRawGoals(getStoredGoals());
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const goals = useMemo(() => {
    return rawGoals.map(goal => {
      let effectiveCurrentValue = parseCurrencyInput(goal.currentValue);
      if (goal.linkedAccountId) {
        const account = accounts.find(a => a.id === goal.linkedAccountId);
        if (account) {
          effectiveCurrentValue = parseCurrencyInput(account.balance);
        }
      }

      const targetVal = parseCurrencyInput(goal.targetValue);
      const monthlyNeeded = metasModule.calculateMonthlyNeeded({ ...goal, targetValue: targetVal, currentValue: effectiveCurrentValue });
      const health = metasModule.getGoalHealth({ ...goal, targetValue: targetVal, currentValue: effectiveCurrentValue });
      
      const now = new Date();
      const deadline = new Date(goal.deadline);
      const createdAt = new Date(goal.createdAt || Date.now());
      
      const totalTime = deadline.getTime() - createdAt.getTime();
      const elapsedTime = now.getTime() - createdAt.getTime();
      const timeProgress = totalTime > 0 ? Math.min(1, Math.max(0, elapsedTime / totalTime)) : 1;
      const financialProgress = targetVal > 0 ? Math.min(1, effectiveCurrentValue / targetVal) : 1;
      
      const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30.44));

      return {
        ...goal,
        targetValue: targetVal,
        currentValue: effectiveCurrentValue,
        monthlyNeeded,
        health,
        timeProgress: timeProgress * 100,
        financialProgress: financialProgress * 100,
        isAhead: financialProgress >= timeProgress || effectiveCurrentValue >= targetVal,
        daysRemaining,
        monthsRemaining
      } as GoalWithStats;
    });
  }, [rawGoals, accounts]);

  const stats = useMemo(() => {
    const totalSaved = goals.reduce((acc, curr) => acc + curr.currentValue, 0);
    const totalTarget = goals.reduce((acc, curr) => acc + curr.targetValue, 0);
    
    const healthCounts = goals.reduce((acc, curr) => {
      acc[curr.health] = (acc[curr.health] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let health: "verde" | "amarelo" | "vermelho" = "verde";
    if (healthCounts["vermelho"] > 0) health = "vermelho";
    else if (healthCounts["amarelo"] > 0) health = "amarelo";

    return { totalSaved, totalTarget, health };
  }, [goals]);

  const createGoal = async (data: Omit<Goal, 'id' | 'userId' | 'createdAt'>): Promise<string | null> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const cleanTarget = parseCurrencyInput(data.targetValue);
    const cleanCurrent = parseCurrencyInput(data.currentValue);
    const tempId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const newGoal: Goal = {
      id: tempId,
      userId: uid,
      name: data.name?.trim() || "Nova Meta",
      targetValue: cleanTarget,
      currentValue: cleanCurrent,
      deadline: data.deadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: data.priority || "media",
      status: (cleanTarget > 0 && cleanCurrent >= cleanTarget ? "completed" : (data.status || "active")) as "active" | "completed" | "paused",
      category: data.category || "outros",
      linkedAccountId: data.linkedAccountId || undefined,
      autoContributionPercentage: data.autoContributionPercentage != null ? parseCurrencyInput(data.autoContributionPercentage) : undefined,
      isDynamic: Boolean(data.isDynamic),
      createdAt: new Date().toISOString(),
      history: []
    };

    // Optimistically update local state & localStorage immediately
    setRawGoals(prev => {
      const next = [newGoal, ...prev.filter(g => g.id !== tempId)];
      saveStoredGoals(next);
      return next;
    });

    // Sync with Firestore if authenticated
    try {
      const docId = await metasModule.criarMeta(uid, {
        name: newGoal.name,
        targetValue: newGoal.targetValue,
        currentValue: newGoal.currentValue,
        deadline: newGoal.deadline,
        priority: newGoal.priority,
        status: newGoal.status,
        category: newGoal.category,
        linkedAccountId: newGoal.linkedAccountId,
        autoContributionPercentage: newGoal.autoContributionPercentage,
        isDynamic: newGoal.isDynamic
      });

      if (docId) {
        setRawGoals(prev => {
          const next = prev.map(g => g.id === tempId ? { ...g, id: docId } : g);
          saveStoredGoals(next);
          return next;
        });
        return docId;
      }
    } catch (e) {
      console.warn("Could not sync new goal to Firestore, preserved locally:", e);
    }

    return tempId;
  };

  const updateGoal = async (id: string, data: Partial<Goal>): Promise<boolean> => {
    const cleanDataObj: Partial<Goal> = { ...data };
    if (data.targetValue !== undefined) cleanDataObj.targetValue = parseCurrencyInput(data.targetValue);
    if (data.currentValue !== undefined) cleanDataObj.currentValue = parseCurrencyInput(data.currentValue);
    if (data.autoContributionPercentage !== undefined && data.autoContributionPercentage !== null) {
      cleanDataObj.autoContributionPercentage = parseCurrencyInput(data.autoContributionPercentage);
    }

    // Optimistic local update
    setRawGoals(prev => {
      const next = prev.map(g => {
        if (g.id === id) {
          const updated = { ...g, ...cleanDataObj };
          if (updated.targetValue > 0 && updated.currentValue >= updated.targetValue) {
            updated.status = "completed";
          }
          return updated;
        }
        return g;
      });
      saveStoredGoals(next);
      return next;
    });

    try {
      await metasModule.atualizarMeta(id, cleanDataObj);
    } catch (e) {
      console.warn("Could not sync goal update to Firestore:", e);
    }
    return true;
  };

  const deleteGoal = async (id: string): Promise<boolean> => {
    // Optimistic local removal
    setRawGoals(prev => {
      const next = prev.filter(g => g.id !== id);
      saveStoredGoals(next);
      return next;
    });

    try {
      await metasModule.deletarMeta(id);
    } catch (e) {
      console.warn("Could not delete goal from Firestore:", e);
    }
    return true;
  };

  const addContribution = async (goalId: string, value: number, type: "manual" | "auto" | "linked_account", description?: string): Promise<boolean> => {
    const cleanVal = parseCurrencyInput(value);
    if (cleanVal <= 0) return false;

    const newContribution: GoalContribution = {
      id: `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      value: cleanVal,
      date: new Date().toISOString(),
      type,
      description
    };

    // Optimistic local update
    setRawGoals(prev => {
      const next = prev.map(g => {
        if (g.id === goalId) {
          const newCurrent = parseCurrencyInput(g.currentValue) + cleanVal;
          const newHistory = [...(g.history || []), newContribution];
          const isDone = g.targetValue > 0 && newCurrent >= g.targetValue;
          return {
            ...g,
            currentValue: newCurrent,
            history: newHistory,
            status: (isDone ? "completed" : g.status) as "active" | "completed" | "paused"
          };
        }
        return g;
      });
      saveStoredGoals(next);
      return next;
    });

    try {
      await metasModule.registrarAporte(goalId, {
        value: cleanVal,
        date: newContribution.date,
        type,
        description
      });
    } catch (e) {
      console.warn("Could not sync contribution to Firestore:", e);
    }
    return true;
  };

  const suggestAutoContributions = (income: number) => {
    const totalForGoals = income * 0.2;
    const activeGoals = goals.filter(g => g.status === "active");
    
    if (activeGoals.length === 0) return [];

    const sortedGoals = [...activeGoals].sort((a, b) => {
      const healthOrder = { "vermelho": 0, "amarelo": 1, "verde": 2 };
      const priorityOrder = { "alta": 0, "media": 1, "baixa": 2 };
      
      if (healthOrder[a.health] !== healthOrder[b.health]) {
        return healthOrder[a.health] - healthOrder[b.health];
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const suggestions = sortedGoals.map(goal => {
      let value = 0;
      if (goal.autoContributionPercentage) {
        value = income * (goal.autoContributionPercentage / 100);
      } else {
        value = totalForGoals / sortedGoals.length;
      }
      return { goalId: goal.id, value, name: goal.name };
    });

    return suggestions;
  };

  return (
    <MetasContext.Provider value={{ 
      goals, 
      stats, 
      loading, 
      createGoal, 
      updateGoal, 
      deleteGoal, 
      addContribution,
      suggestAutoContributions
    }}>
      {children}
    </MetasContext.Provider>
  );
}

export function useMetas() {
  const context = useContext(MetasContext);
  if (context === undefined) {
    throw new Error("useMetas must be used within a MetasProvider");
  }
  return context;
}
