import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { Budget, Transaction, Category } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTransacoes } from "./TransacoesContext";
import { useCategorias } from "./CategoriasContext";
import { orcamento as orcamentoModule } from "../modules/orcamentoModule";
import { getActiveUserId } from "../lib/authUtils";
import { parseCurrencyInput } from "../lib/utils";

const LOCAL_STORAGE_KEY = "finance_local_budgets_v1";

export function getStoredBudgets(): Budget[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar orçamentos do localStorage:", e);
  }
  return [];
}

export function saveStoredBudgets(budgets: Budget[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(budgets));
    window.dispatchEvent(new CustomEvent("local_budgets_changed"));
  } catch (e) {
    console.warn("Erro ao salvar orçamentos no localStorage:", e);
  }
}

interface BudgetWithStats extends Budget {
  spentValue: number;
  remainingBalance: number;
  percentageUsed: number;
  prediction: number;
  status: "safe" | "warning" | "alert" | "over";
}

interface OrcamentoContextType {
  budgets: BudgetWithStats[];
  allBudgets: Budget[];
  stats: {
    spentTotal: number;
    plannedTotal: number;
    remainingTotal: number;
    percentageTotal: number;
  };
  loading: boolean;
  currentMonth: number;
  currentYear: number;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  createBudget: (data: Omit<Budget, 'id' | 'userId' | 'createdAt'>) => Promise<string | null>;
  updateBudget: (id: string, data: Partial<Budget>) => Promise<boolean>;
  deleteBudget: (id: string) => Promise<boolean>;
  clonePreviousMonth: () => Promise<boolean>;
}

const OrcamentoContext = createContext<OrcamentoContextType | undefined>(undefined);

export function OrcamentoProvider({ children }: { children: ReactNode }) {
  const [rawBudgets, setRawBudgets] = useState<Budget[]>(getStoredBudgets);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const { transactions } = useTransacoes();
  const { categories } = useCategorias();

  // Listen to cross-component or cross-tab local updates
  useEffect(() => {
    const handleStorageChange = () => {
      setRawBudgets(getStoredBudgets());
    };
    window.addEventListener("local_budgets_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_budgets_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        // Query only by userId to prevent composite index requirements
        const q = query(
          collection(db, "budgets"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const firestoreBudgets = snapshot.docs.map(doc => {
              const data = doc.data() as any;
              return {
                id: doc.id,
                userId: data.userId || user.uid,
                categoryId: data.categoryId || "",
                categoryName: data.categoryName || data.category || "Geral",
                plannedValue: parseCurrencyInput(data.plannedValue != null ? data.plannedValue : data.limit),
                month: typeof data.month === "number" ? data.month : new Date().getMonth(),
                year: typeof data.year === "number" ? data.year : new Date().getFullYear(),
                createdAt: data.createdAt || new Date().toISOString()
              } as Budget;
            });

            // Merge with local storage
            const localBudgets = getStoredBudgets();
            const merged = [...firestoreBudgets];
            for (const localB of localBudgets) {
              if (!merged.some(b => b.id === localB.id)) {
                if (localB.userId === user.uid || !localB.userId || localB.userId === "default_user") {
                  merged.push({ ...localB, userId: user.uid });
                }
              }
            }

            setRawBudgets(merged);
            saveStoredBudgets(merged);
            setLoading(false);
          },
          (err) => {
            console.warn("Notice: Firestore budgets snapshot warning (using local):", err);
            setRawBudgets(getStoredBudgets());
            setLoading(false);
          }
        );
      } else {
        setRawBudgets(getStoredBudgets());
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const budgets = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;

    // Filter raw budgets for the selected month and year
    const monthBudgets = rawBudgets.filter(b => b.month === currentMonth && b.year === currentYear);

    return monthBudgets.map(budget => {
      const plannedVal = parseCurrencyInput(budget.plannedValue);
      // Calculate spent value for this category in this month/year
      const spentValue = transactions
        .filter(t => t.type === "expense" && (t.categoryId === budget.categoryId || t.category === budget.categoryName))
        .filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((acc, curr) => acc + parseCurrencyInput(curr.value), 0);

      const remainingBalance = plannedVal - spentValue;
      const percentageUsed = plannedVal > 0 ? (spentValue / plannedVal) * 100 : 0;

      // Prediction: Daily average * days in month
      const dailyAverage = currentDay > 0 ? spentValue / currentDay : 0;
      const prediction = dailyAverage * daysInMonth;

      let status: "safe" | "warning" | "alert" | "over" = "safe";
      if (percentageUsed >= 100) status = "over";
      else if (percentageUsed >= 90) status = "alert";
      else if (percentageUsed >= 70) status = "warning";

      return {
        ...budget,
        plannedValue: plannedVal,
        spentValue,
        remainingBalance,
        percentageUsed,
        prediction,
        status
      } as BudgetWithStats;
    });
  }, [rawBudgets, transactions, currentMonth, currentYear]);

  const stats = useMemo(() => {
    const spentTotal = budgets.reduce((acc, b) => acc + b.spentValue, 0);
    const plannedTotal = budgets.reduce((acc, b) => acc + b.plannedValue, 0);
    const remainingTotal = plannedTotal - spentTotal;
    const percentageTotal = plannedTotal > 0 ? (spentTotal / plannedTotal) * 100 : 0;

    return {
      spentTotal,
      plannedTotal,
      remainingTotal,
      percentageTotal
    };
  }, [budgets]);

  const createBudget = async (data: Omit<Budget, 'id' | 'userId' | 'createdAt'>): Promise<string | null> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const cleanPlanned = parseCurrencyInput(data.plannedValue);
    const tempId = `budget_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newBudget: Budget = {
      id: tempId,
      userId: uid,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      plannedValue: cleanPlanned,
      month: typeof data.month === "number" ? data.month : currentMonth,
      year: typeof data.year === "number" ? data.year : currentYear,
      createdAt: new Date().toISOString()
    };

    // Optimistically update local state & storage immediately
    setRawBudgets(prev => {
      // Remove any existing duplicate for same category/month/year
      const filtered = prev.filter(b => !(b.categoryId === newBudget.categoryId && b.month === newBudget.month && b.year === newBudget.year));
      const next = [newBudget, ...filtered];
      saveStoredBudgets(next);
      return next;
    });

    try {
      const docId = await orcamentoModule.criarOrcamento(uid, {
        categoryId: newBudget.categoryId,
        categoryName: newBudget.categoryName,
        plannedValue: newBudget.plannedValue,
        month: newBudget.month,
        year: newBudget.year,
        userId: uid,
        createdAt: newBudget.createdAt
      });

      if (docId) {
        setRawBudgets(prev => {
          const next = prev.map(b => b.id === tempId ? { ...b, id: docId } : b);
          saveStoredBudgets(next);
          return next;
        });
        return docId;
      }
    } catch (e) {
      console.warn("Could not sync budget to Firestore, preserved locally:", e);
    }

    return tempId;
  };

  const updateBudget = async (id: string, data: Partial<Budget>): Promise<boolean> => {
    const cleanPlanned = data.plannedValue !== undefined ? parseCurrencyInput(data.plannedValue) : undefined;
    
    // Optimistic local update
    setRawBudgets(prev => {
      const next = prev.map(b => {
        if (b.id === id) {
          return {
            ...b,
            ...data,
            plannedValue: cleanPlanned !== undefined ? cleanPlanned : b.plannedValue
          };
        }
        return b;
      });
      saveStoredBudgets(next);
      return next;
    });

    try {
      await orcamentoModule.atualizarOrcamento(id, {
        ...data,
        plannedValue: cleanPlanned
      });
    } catch (e) {
      console.warn("Could not sync budget update to Firestore:", e);
    }
    return true;
  };

  const deleteBudget = async (id: string): Promise<boolean> => {
    // Optimistic local removal
    setRawBudgets(prev => {
      const next = prev.filter(b => b.id !== id);
      saveStoredBudgets(next);
      return next;
    });

    try {
      await orcamentoModule.deletarOrcamento(id);
    } catch (e) {
      console.warn("Could not delete budget from Firestore:", e);
    }
    return true;
  };

  const clonePreviousMonth = async (): Promise<boolean> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }

    const prevBudgets = rawBudgets.filter(b => b.month === prevMonth && b.year === prevYear);
    if (prevBudgets.length === 0) return false;

    // Check if current month already has budgets
    const currentHasBudgets = rawBudgets.some(b => b.month === currentMonth && b.year === currentYear);
    if (currentHasBudgets) return false;

    const cloned = prevBudgets.map(b => ({
      id: `budget_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: uid,
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      plannedValue: parseCurrencyInput(b.plannedValue),
      month: currentMonth,
      year: currentYear,
      createdAt: new Date().toISOString()
    }));

    // Optimistic update
    setRawBudgets(prev => {
      const next = [...cloned, ...prev];
      saveStoredBudgets(next);
      return next;
    });

    try {
      await orcamentoModule.clonarOrcamentoMesAnterior(uid, currentMonth, currentYear);
    } catch (e) {
      console.warn("Could not sync cloned budgets to Firestore, kept locally:", e);
    }

    return true;
  };

  return (
    <OrcamentoContext.Provider value={{ 
      budgets, 
      allBudgets: rawBudgets,
      stats,
      loading, 
      currentMonth, 
      currentYear, 
      setCurrentMonth, 
      setCurrentYear,
      createBudget,
      updateBudget,
      deleteBudget,
      clonePreviousMonth
    }}>
      {children}
    </OrcamentoContext.Provider>
  );
}

export function useOrcamento() {
  const context = useContext(OrcamentoContext);
  if (context === undefined) {
    throw new Error("useOrcamento must be used within a OrcamentoProvider");
  }
  return context;
}
