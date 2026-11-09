import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { LifePlan, LifePlanScenario, LifePlanProjectionPoint, LifePlanSimulation, LifePlanProfile } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useContas } from "./ContasContext";
import { useTransacoes } from "./TransacoesContext";
import { useMetas } from "./MetasContext";
import { useDebts } from "./DebtsContext";
import { useReceivables } from "./ReceivablesContext";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

const LOCAL_LIFE_PLAN_KEY = "finance_local_life_plan_v1";
const LOCAL_SIMULATIONS_KEY = "finance_local_simulations_v1";

interface LifePlanContextType {
  lifePlan: LifePlan | null;
  projections: Record<LifePlanScenario, LifePlanProjectionPoint[]>;
  simulations: LifePlanSimulation[];
  loading: boolean;
  healthScore: number;
  healthStatus: "green" | "yellow" | "red";
  createLifePlan: (data: Omit<LifePlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string | null>;
  updateLifePlan: (data: Partial<LifePlan>) => Promise<boolean>;
  addSimulation: (sim: Omit<LifePlanSimulation, 'id'>) => Promise<boolean>;
  removeSimulation: (id: string) => Promise<boolean>;
}

const LifePlanContext = createContext<LifePlanContextType | undefined>(undefined);

export function LifePlanProvider({ children }: { children: ReactNode }) {
  const [lifePlan, setLifePlan] = useState<LifePlan | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_LIFE_PLAN_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [simulations, setSimulations] = useState<LifePlanSimulation[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_SIMULATIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  const { debts } = useDebts();
  const { goals } = useMetas();

  // Persist local state whenever it changes
  useEffect(() => {
    try {
      if (lifePlan) {
        localStorage.setItem(LOCAL_LIFE_PLAN_KEY, JSON.stringify(lifePlan));
      } else {
        localStorage.removeItem(LOCAL_LIFE_PLAN_KEY);
      }
    } catch (e) {
      console.warn("Error saving life plan to local storage:", e);
    }
  }, [lifePlan]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_SIMULATIONS_KEY, JSON.stringify(simulations));
    } catch (e) {
      console.warn("Error saving simulations to local storage:", e);
    }
  }, [simulations]);

  useEffect(() => {
    let unsubPlan: (() => void) | null = null;
    let unsubSims: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubPlan) unsubPlan();
      if (unsubSims) unsubSims();

      if (user) {
        // Life Plan
        const qPlan = query(collection(db, "lifePlans"), where("userId", "==", user.uid));
        unsubPlan = onSnapshot(qPlan, (snap) => {
          if (!snap.empty) {
            const plan = { id: snap.docs[0].id, ...snap.docs[0].data() } as LifePlan;
            setLifePlan(plan);
          }
        }, (err) => {
          if (auth.currentUser) {
            handleFirestoreError(err, OperationType.GET, "lifePlans");
          }
        });

        // Simulations
        const qSims = query(collection(db, "lifePlanSimulations"), where("userId", "==", user.uid));
        unsubSims = onSnapshot(qSims, (snap) => {
          if (!snap.empty) {
            setSimulations(snap.docs.map(d => ({ id: d.id, ...d.data() } as LifePlanSimulation)));
          }
        }, (err) => {
          if (auth.currentUser) {
            handleFirestoreError(err, OperationType.GET, "lifePlanSimulations");
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubPlan) unsubPlan();
      if (unsubSims) unsubSims();
    };
  }, []);

  const projections = useMemo(() => {
    if (!lifePlan) return { otimista: [], realista: [], pessimista: [] };

    const calculateScenario = (scenario: LifePlanScenario): LifePlanProjectionPoint[] => {
      const points: LifePlanProjectionPoint[] = [];
      let currentWealth = lifePlan.currentWealth;
      let currentIncome = lifePlan.currentIncome;
      let currentExpenses = lifePlan.currentExpenses;

      // Rates based on scenario and profile
      let incomeGrowth = 0.05; // 5%
      let expenseInflation = 0.04; // 4%
      let investmentReturn = 0.08; // 8%

      if (scenario === "otimista") {
        incomeGrowth = 0.08;
        expenseInflation = 0.03;
        investmentReturn = 0.12;
      } else if (scenario === "pessimista") {
        incomeGrowth = 0.02;
        expenseInflation = 0.06;
        investmentReturn = 0.04;
      }

      // Adjust by profile
      if (lifePlan.profile === "conservador") investmentReturn *= 0.7;
      if (lifePlan.profile === "agressivo") investmentReturn *= 1.3;

      const horizon = lifePlan.horizonYears || 10;
      const now = new Date();
      const currentYear = now.getFullYear();

      for (let i = 0; i <= horizon; i++) {
        const year = currentYear + i;
        
        // Apply simulations for this year
        const yearSims = simulations.filter(s => new Date(s.date).getFullYear() === year);
        yearSims.forEach(sim => {
          if (sim.type === "compra") currentWealth -= sim.value;
          if (sim.type === "renda") currentIncome += sim.value;
          if (sim.type === "estilo_vida") currentExpenses += sim.value;
        });

        // Apply goals for this year
        const yearGoals = (goals || []).filter(g => new Date(g.deadline).getFullYear() === year && lifePlan.linkedGoalIds?.includes(g.id));
        yearGoals.forEach(goal => {
          currentWealth -= Math.max(0, goal.targetValue - (goal.currentValue || 0));
        });

        points.push({
          year,
          wealth: Math.max(0, currentWealth),
          income: currentIncome,
          expenses: currentExpenses,
          goalsProgress: 0 
        });

        // Evolution for next year
        const savings = currentIncome - currentExpenses;
        currentWealth = currentWealth * (1 + investmentReturn) + savings;
        currentIncome *= (1 + incomeGrowth);
        currentExpenses *= (1 + expenseInflation);
      }

      return points;
    };

    return {
      otimista: calculateScenario("otimista"),
      realista: calculateScenario("realista"),
      pessimista: calculateScenario("pessimista")
    };
  }, [lifePlan, simulations, goals]);

  const { healthScore, healthStatus } = useMemo(() => {
    if (!lifePlan || projections.realista.length === 0) return { healthScore: 0, healthStatus: "yellow" as const };

    const lastPoint = projections.realista[projections.realista.length - 1];
    const firstPoint = projections.realista[0];

    let score = 50;

    // Wealth growth
    if (lastPoint && firstPoint && lastPoint.wealth > firstPoint.wealth) score += 20;
    else score -= 20;

    // Savings rate
    const savingsRate = lifePlan.currentIncome > 0 
      ? (lifePlan.currentIncome - lifePlan.currentExpenses) / lifePlan.currentIncome 
      : 0;
    if (savingsRate > 0.2) score += 20;
    else if (savingsRate < 0) score -= 30;

    // Debt ratio
    const totalDebts = (debts || []).reduce((acc, d) => acc + (d.remainingValue || 0), 0);
    const debtRatio = lifePlan.currentWealth > 0 ? totalDebts / lifePlan.currentWealth : 0;
    if (debtRatio > 0.5) score -= 20;
    else if (debtRatio < 0.1) score += 10;

    score = Math.max(0, Math.min(100, score));

    let status: "green" | "yellow" | "red" = "yellow";
    if (score >= 70) status = "green";
    else if (score <= 40) status = "red";

    return { healthScore: score, healthStatus: status };
  }, [lifePlan, projections, debts]);

  const createLifePlan = async (data: Omit<LifePlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const uid = auth.currentUser?.uid || "local_user";
    const newId = `lp_${Date.now()}`;
    const newPlan: LifePlan = {
      ...data,
      id: newId,
      userId: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Immediate local state update
    setLifePlan(newPlan);
    try {
      localStorage.setItem(LOCAL_LIFE_PLAN_KEY, JSON.stringify(newPlan));
    } catch {}

    if (auth.currentUser?.uid) {
      try {
        const docRef = await addDoc(collection(db, "lifePlans"), {
          ...data,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        const serverPlan = { ...newPlan, id: docRef.id };
        setLifePlan(serverPlan);
        localStorage.setItem(LOCAL_LIFE_PLAN_KEY, JSON.stringify(serverPlan));
        return docRef.id;
      } catch (err) {
        console.warn("Firestore save failed, using local copy:", err);
      }
    }
    return newId;
  };

  const updateLifePlan = async (data: Partial<LifePlan>) => {
    if (!lifePlan) return false;
    const updated = {
      ...lifePlan,
      ...data,
      updatedAt: new Date().toISOString()
    };
    setLifePlan(updated);
    try {
      localStorage.setItem(LOCAL_LIFE_PLAN_KEY, JSON.stringify(updated));
    } catch {}

    if (auth.currentUser?.uid && !lifePlan.id.startsWith("lp_")) {
      try {
        await updateDoc(doc(db, "lifePlans", lifePlan.id), {
          ...data,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Firestore update error:", err);
      }
    }
    return true;
  };

  const addSimulation = async (sim: Omit<LifePlanSimulation, 'id'>) => {
    const newSim: LifePlanSimulation = {
      ...sim,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };

    setSimulations(prev => [...prev, newSim]);

    if (auth.currentUser?.uid) {
      try {
        const docRef = await addDoc(collection(db, "lifePlanSimulations"), {
          ...sim,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });
        setSimulations(prev => prev.map(s => s.id === newSim.id ? { ...s, id: docRef.id } : s));
      } catch (err) {
        console.warn("Simulation Firestore write error:", err);
      }
    }
    return true;
  };

  const removeSimulation = async (id: string) => {
    setSimulations(prev => prev.filter(s => s.id !== id));
    if (auth.currentUser?.uid && !id.startsWith("sim_")) {
      try {
        await deleteDoc(doc(db, "lifePlanSimulations", id));
      } catch (err) {
        console.warn("Simulation Firestore delete error:", err);
      }
    }
    return true;
  };

  return (
    <LifePlanContext.Provider value={{
      lifePlan,
      projections,
      simulations,
      loading,
      healthScore,
      healthStatus,
      createLifePlan,
      updateLifePlan,
      addSimulation,
      removeSimulation
    }}>
      {children}
    </LifePlanContext.Provider>
  );
}

export function useLifePlan() {
  const context = useContext(LifePlanContext);
  if (context === undefined) {
    throw new Error("useLifePlan must be used within a LifePlanProvider");
  }
  return context;
}
