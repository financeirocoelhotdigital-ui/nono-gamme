import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Investment, InvestmentContribution } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, writeBatch, doc, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { investmentModule } from "../modules/investmentModule";
import { transacoes } from "../modules/transacoesModule";
import { differenceInDays, parseISO } from "date-fns";
import { getActiveUserId } from "../lib/authUtils";

const LOCAL_STORAGE_INVESTMENTS = "finance_local_investments_v1";
const LOCAL_STORAGE_CONTRIBUTIONS = "finance_local_contributions_v1";

export function getStoredInvestments(): Investment[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_INVESTMENTS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar investimentos locais:", e);
  }
  return [];
}

export function saveStoredInvestments(items: Investment[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INVESTMENTS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_investments_changed"));
  } catch (e) {
    console.warn("Erro ao salvar investimentos locais:", e);
  }
}

export function getStoredContributions(): InvestmentContribution[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_CONTRIBUTIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar aportes locais:", e);
  }
  return [];
}

export function saveStoredContributions(items: InvestmentContribution[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CONTRIBUTIONS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_contributions_changed"));
  } catch (e) {
    console.warn("Erro ao salvar aportes locais:", e);
  }
}

interface InvestmentContextType {
  investments: Investment[];
  contributions: InvestmentContribution[];
  loading: boolean;
  addInvestment: (investment: Omit<Investment, "id" | "userId" | "createdAt" | "updatedAt" | "currentYield" | "currentValue" | "status">, accountId?: string) => Promise<string>;
  updateInvestment: (id: string, investment: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;
  addContribution: (contribution: Omit<InvestmentContribution, "id" | "userId" | "createdAt">, accountId?: string) => Promise<string>;
  calculateInvestmentYield: (investment: Investment) => {
    currentValue: number;
    totalYield: number;
    monthlyGain: number;
    annualGain: number;
    dailyGain: number;
  };
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export function InvestmentProvider({ children }: { children: ReactNode }) {
  const [investments, setInvestments] = useState<Investment[]>(getStoredInvestments);
  const [contributions, setContributions] = useState<InvestmentContribution[]>(getStoredContributions);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setInvestments(getStoredInvestments());
      setContributions(getStoredContributions());
    };
    window.addEventListener("local_investments_changed", handleStorageChange);
    window.addEventListener("local_contributions_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_investments_changed", handleStorageChange);
      window.removeEventListener("local_contributions_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeInv: (() => void) | null = null;
    let unsubscribeCont: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeInv) unsubscribeInv();
      if (unsubscribeCont) unsubscribeCont();

      if (user) {
        // Investments query
        const qInv = query(collection(db, "investments"), where("userId", "==", user.uid));
        unsubscribeInv = onSnapshot(qInv, (snapshot) => {
          const remoteInv = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Investment));

          const localInv = getStoredInvestments();
          const merged = [...remoteInv];
          for (const item of localInv) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          setInvestments(merged);
          saveStoredInvestments(merged);
        }, (error) => {
          console.warn("Notice: investments snapshot warning (using local):", error);
          setInvestments(getStoredInvestments());
        });

        // Contributions query (in-memory sort by date desc to avoid composite index requirements)
        const qCont = query(
          collection(db, "investment_contributions"), 
          where("userId", "==", user.uid)
        );
        unsubscribeCont = onSnapshot(qCont, (snapshot) => {
          const remoteCont = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as InvestmentContribution));

          const localCont = getStoredContributions();
          const merged = [...remoteCont];
          for (const item of localCont) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setContributions(merged);
          saveStoredContributions(merged);
          setLoading(false);
        }, (error) => {
          console.warn("Notice: investment_contributions snapshot warning (using local):", error);
          setContributions(getStoredContributions());
          setLoading(false);
        });
      } else {
        setInvestments(getStoredInvestments());
        setContributions(getStoredContributions());
        setLoading(false);
        unsubscribeInv = null;
        unsubscribeCont = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeInv) unsubscribeInv();
      if (unsubscribeCont) unsubscribeCont();
    };
  }, []);

  const calculateInvestmentYield = useCallback((investment: Investment) => {
    try {
      const now = new Date();
      const monthlyRate = (investment.monthlyYield || 0) / 100;
      const dailyRate = Math.pow(1 + monthlyRate, 1 / 30) - 1;

      const invContributions = contributions.filter(c => c.investmentId === investment.id);
      
      const totalContributions = invContributions.reduce((acc, c) => {
        if (c.type === "aporte") return acc + c.value;
        if (c.type === "resgate") return acc - c.value;
        return acc;
      }, 0);
      const initialValue = investment.investedValue - totalContributions;

      let currentValue = 0;
      let totalYield = 0;

      const startDate = parseISO(investment.startDate);
      if (now >= startDate) {
        const days = differenceInDays(now, startDate);
        currentValue += initialValue * Math.pow(1 + dailyRate, days);
      } else {
        currentValue += initialValue;
      }

      invContributions.forEach(c => {
        const cDate = parseISO(c.date);
        if (now >= cDate) {
          const cDays = differenceInDays(now, cDate);
          if (c.type === "aporte") {
            currentValue += c.value * Math.pow(1 + dailyRate, cDays);
          } else if (c.type === "resgate") {
            currentValue -= c.value * Math.pow(1 + dailyRate, cDays);
          } else if (c.type === "rendimento") {
            currentValue += c.value * Math.pow(1 + dailyRate, cDays);
          }
        } else {
          if (c.type === "aporte" || c.type === "rendimento") {
            currentValue += c.value;
          } else if (c.type === "resgate") {
            currentValue -= c.value;
          }
        }
      });

      totalYield = currentValue - investment.investedValue;

      return {
        currentValue: isNaN(currentValue) ? investment.investedValue : currentValue,
        totalYield: isNaN(totalYield) ? 0 : totalYield,
        monthlyGain: isNaN(currentValue * monthlyRate) ? 0 : currentValue * monthlyRate,
        annualGain: isNaN(currentValue * (Math.pow(1 + monthlyRate, 12) - 1)) ? 0 : currentValue * (Math.pow(1 + monthlyRate, 12) - 1),
        dailyGain: isNaN(currentValue * dailyRate) ? 0 : currentValue * dailyRate
      };
    } catch (error) {
      return {
        currentValue: investment.investedValue || 0,
        totalYield: 0,
        monthlyGain: 0,
        annualGain: 0,
        dailyGain: 0
      };
    }
  }, [contributions]);

  const addInvestment = async (investment: Omit<Investment, "id" | "userId" | "createdAt" | "updatedAt" | "currentYield" | "currentValue" | "status">, accountId?: string) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newInv: Investment = {
      ...investment,
      id: tempId,
      userId: uid,
      currentYield: 0,
      currentValue: investment.investedValue,
      status: "active",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // 1. Local update
    const currentList = getStoredInvestments();
    const updatedList = [newInv, ...currentList.filter(i => i.id !== tempId)];
    saveStoredInvestments(updatedList);
    setInvestments(updatedList);

    if (accountId) {
      await transacoes.registrarTransacao({
        title: `Investimento Inicial: ${investment.name}`,
        value: investment.investedValue,
        type: "expense",
        category: "Investimentos",
        date: investment.startDate || nowIso,
        accountId,
        userId: uid,
        emotion: "racional",
        createdAt: nowIso
      });
    }

    // 2. Firestore Sync
    try {
      if (auth.currentUser) {
        const firestoreId = await investmentModule.addInvestment({
          ...newInv,
          userId: auth.currentUser.uid
        });
        if (firestoreId && firestoreId !== tempId) {
          const syncedList = getStoredInvestments().map(i => i.id === tempId ? { ...i, id: firestoreId, userId: auth.currentUser!.uid } : i);
          saveStoredInvestments(syncedList);
          setInvestments(syncedList);
          return firestoreId;
        }
      }
    } catch (err) {
      console.warn("Notice: investment saved locally, Firestore sync notice:", err);
    }

    return tempId;
  };

  const updateInvestment = async (id: string, investmentUpdates: Partial<Investment>) => {
    const currentList = getStoredInvestments();
    const updatedList = currentList.map(i => i.id === id ? { ...i, ...investmentUpdates, updatedAt: new Date().toISOString() } : i);
    saveStoredInvestments(updatedList);
    setInvestments(updatedList);

    if (auth.currentUser && !id.startsWith("inv_")) {
      try {
        await investmentModule.updateInvestment(id, investmentUpdates);
      } catch (err) {
        console.warn("Notice: Firestore updateInvestment notice:", err);
      }
    }
  };

  const deleteInvestment = async (id: string) => {
    const currentList = getStoredInvestments();
    const updatedList = currentList.filter(i => i.id !== id);
    saveStoredInvestments(updatedList);
    setInvestments(updatedList);

    const currentConts = getStoredContributions();
    const updatedConts = currentConts.filter(c => c.investmentId !== id);
    saveStoredContributions(updatedConts);
    setContributions(updatedConts);

    if (auth.currentUser && !id.startsWith("inv_")) {
      try {
        const uid = auth.currentUser.uid;
        const batch = writeBatch(db);
        batch.delete(doc(db, "investments", id));
        const qCont = query(collection(db, "investment_contributions"), where("investmentId", "==", id), where("userId", "==", uid));
        const snapshot = await getDocs(qCont);
        snapshot.forEach(docSnap => batch.delete(docSnap.ref));
        await batch.commit();
      } catch (error) {
        console.warn("Notice: Firestore deleteInvestment warning:", error);
      }
    }
  };

  const addContribution = async (contribution: Omit<InvestmentContribution, "id" | "userId" | "createdAt">, accountId?: string) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `contrib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newContrib: InvestmentContribution = {
      ...contribution,
      id: tempId,
      userId: uid,
      createdAt: nowIso
    };

    // Update investment locally
    const currentInvs = getStoredInvestments();
    const investment = currentInvs.find(i => i.id === contribution.investmentId);
    if (investment) {
      let newValue = investment.investedValue;
      if (contribution.type === "aporte" || contribution.type === "rendimento") {
        newValue += contribution.value;
      } else if (contribution.type === "resgate") {
        newValue -= contribution.value;
      }
      const updatedInvs = currentInvs.map(i => i.id === investment.id ? { ...i, investedValue: newValue } : i);
      saveStoredInvestments(updatedInvs);
      setInvestments(updatedInvs);

      if (accountId && contribution.type !== "rendimento") {
        await transacoes.registrarTransacao({
          title: contribution.type === "aporte" ? `Aporte: ${investment.name}` : `Resgate: ${investment.name}`,
          value: contribution.value,
          type: contribution.type === "aporte" ? "expense" : "income",
          category: contribution.type === "aporte" ? "Investimentos" : "Resgate de Investimento",
          date: contribution.date || nowIso,
          accountId,
          userId: uid,
          emotion: "racional",
          createdAt: nowIso
        });
      }
    }

    // Save contribution locally
    const currentConts = getStoredContributions();
    const updatedConts = [newContrib, ...currentConts];
    saveStoredContributions(updatedConts);
    setContributions(updatedConts);

    if (auth.currentUser) {
      try {
        const firestoreId = await investmentModule.addContribution({
          ...newContrib,
          userId: auth.currentUser.uid
        });
        if (firestoreId && firestoreId !== tempId) {
          const syncedConts = getStoredContributions().map(c => c.id === tempId ? { ...c, id: firestoreId, userId: auth.currentUser!.uid } : c);
          saveStoredContributions(syncedConts);
          setContributions(syncedConts);
          return firestoreId;
        }
      } catch (err) {
        console.warn("Notice: contribution saved locally, Firestore sync notice:", err);
      }
    }

    return tempId;
  };

  return (
    <InvestmentContext.Provider value={{ 
      investments, 
      contributions, 
      loading,
      addInvestment,
      updateInvestment,
      deleteInvestment,
      addContribution,
      calculateInvestmentYield
    }}>
      {children}
    </InvestmentContext.Provider>
  );
}

export function useInvestments() {
  const context = useContext(InvestmentContext);
  if (context === undefined) {
    throw new Error("useInvestments must be used within an InvestmentProvider");
  }
  return context;
}
