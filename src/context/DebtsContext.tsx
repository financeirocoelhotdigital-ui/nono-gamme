import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { Debt, Installment, DebtStatus, DebtPriority, InterestType, InstallmentStatus, DebtType, UserProfile, DebtHistory } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, orderBy, writeBatch, doc, updateDoc, deleteDoc, getDocs, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { transacoes } from "../modules/transacoesModule";
import { analyzeDebtUrgency } from "../services/geminiService";
import { parseLocalDate, getDaysRemaining, parseCurrencyInput } from "../lib/utils";
import { getActiveUserId, getActiveUserProfile } from "../lib/authUtils";

const LOCAL_DEBTS_KEY = "finance_local_debts_v2";
const LOCAL_INSTALLMENTS_KEY = "finance_local_installments_v2";
const LOCAL_HISTORY_KEY = "finance_local_debt_history_v2";

export function getStoredDebts(): Debt[] {
  try {
    const saved = localStorage.getItem(LOCAL_DEBTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const uniqueMap = new Map<string, Debt>();
        for (const item of parsed) {
          if (item && item.id) {
            uniqueMap.set(item.id, item);
          }
        }
        return Array.from(uniqueMap.values());
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar dívidas locais:", e);
  }
  return [];
}

export function saveStoredDebts(debts: Debt[]) {
  try {
    const uniqueMap = new Map<string, Debt>();
    for (const item of debts) {
      if (item && item.id) {
        uniqueMap.set(item.id, item);
      }
    }
    const cleanList = Array.from(uniqueMap.values());
    localStorage.setItem(LOCAL_DEBTS_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent("local_debts_changed"));
  } catch (e) {
    console.warn("Erro ao salvar dívidas locais:", e);
  }
}

export function getStoredInstallments(): Installment[] {
  try {
    const saved = localStorage.getItem(LOCAL_INSTALLMENTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const uniqueMap = new Map<string, Installment>();
        for (const item of parsed) {
          if (item && item.id) {
            uniqueMap.set(item.id, item);
          }
        }
        return Array.from(uniqueMap.values());
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar parcelas locais:", e);
  }
  return [];
}

export function saveStoredInstallments(installments: Installment[]) {
  try {
    const uniqueMap = new Map<string, Installment>();
    for (const item of installments) {
      if (item && item.id) {
        uniqueMap.set(item.id, item);
      }
    }
    const cleanList = Array.from(uniqueMap.values());
    localStorage.setItem(LOCAL_INSTALLMENTS_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent("local_installments_changed"));
  } catch (e) {
    console.warn("Erro ao salvar parcelas locais:", e);
  }
}

export function getStoredHistory(): DebtHistory[] {
  try {
    const saved = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const uniqueMap = new Map<string, DebtHistory>();
        for (const item of parsed) {
          if (item && item.id) {
            uniqueMap.set(item.id, item);
          }
        }
        return Array.from(uniqueMap.values());
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar histórico de dívidas local:", e);
  }
  return [];
}

export function saveStoredHistory(history: DebtHistory[]) {
  try {
    const uniqueMap = new Map<string, DebtHistory>();
    for (const item of history) {
      if (item && item.id) {
        uniqueMap.set(item.id, item);
      }
    }
    const cleanList = Array.from(uniqueMap.values());
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent("local_debt_history_changed"));
  } catch (e) {
    console.warn("Erro ao salvar histórico de dívidas local:", e);
  }
}

// Helper for adding months safely to YYYY-MM-DD date string
const addMonthsToDate = (baseStr: string, monthsToAdd: number): string => {
  const d = parseLocalDate(baseStr) || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();
  
  const targetYear = year + Math.floor((month + monthsToAdd) / 12);
  const targetMonth = ((month + monthsToAdd) % 12 + 12) % 12;
  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  
  const mm = String(targetMonth + 1).padStart(2, '0');
  const dd = String(targetDay).padStart(2, '0');
  return `${targetYear}-${mm}-${dd}`;
};

interface DebtsContextType {
  debts: Debt[];
  installments: Installment[];
  loading: boolean;
  addDebt: (debt: Omit<Debt, "id" | "userId" | "createdAt" | "remainingValue" | "paidValue" | "paidInstallments" | "urgencyScore" | "urgency" | "urgencyReason" | "priorityReason" | "installmentValue" | "currentValue" | "interestAccrued" | "totalPaidValue" | "finalTotalCost" | "prepaymentSavings">, userProfile?: UserProfile) => Promise<void>;
  payInstallment: (installmentId: string, accountId: string, paymentValue?: number) => Promise<void>;
  updateDebt: (debtId: string, updates: Partial<Debt>, userProfile?: UserProfile) => Promise<void>;
  deleteDebt: (debtId: string) => Promise<void>;
  accrueInterest: () => Promise<void>;
  checkOverdue: () => Promise<void>;
  simulatePrepayment: (debtId: string, value: number) => { savings: number; newTotalCost: number; monthsSaved: number };
  renegotiateDebt: (
    debtId: string,
    renegData: {
      totalInstallments: number;
      interestRate: number;
      installmentValue: number;
      dueDate: string;
      discountValue?: number;
      newRemainingValue: number;
      notes?: string;
    },
    userProfile?: UserProfile
  ) => Promise<void>;
  history: DebtHistory[];
}

const DebtsContext = createContext<DebtsContextType | undefined>(undefined);

export function DebtsProvider({ children }: { children: ReactNode }) {
  const [debts, setDebts] = useState<Debt[]>(getStoredDebts);
  const [installments, setInstallments] = useState<Installment[]>(getStoredInstallments);
  const [history, setHistory] = useState<DebtHistory[]>(getStoredHistory);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setDebts(getStoredDebts());
      setInstallments(getStoredInstallments());
      setHistory(getStoredHistory());
    };

    window.addEventListener("local_debts_changed", handleStorageChange);
    window.addEventListener("local_installments_changed", handleStorageChange);
    window.addEventListener("local_debt_history_changed", handleStorageChange);

    return () => {
      window.removeEventListener("local_debts_changed", handleStorageChange);
      window.removeEventListener("local_installments_changed", handleStorageChange);
      window.removeEventListener("local_debt_history_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeDebts: (() => void) | null = null;
    let unsubscribeInstallments: (() => void) | null = null;
    let unsubscribeHistory: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeDebts) unsubscribeDebts();
      if (unsubscribeInstallments) unsubscribeInstallments();
      if (unsubscribeHistory) unsubscribeHistory();

      if (user) {
        // Debts snapshot
        const debtsQuery = query(
          collection(db, "debts"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        unsubscribeDebts = onSnapshot(debtsQuery, (snapshot) => {
          const debtsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Debt));

          // Merge Firestore docs with local storage ensuring unique IDs
          const localList = getStoredDebts();
          const map = new Map<string, Debt>();
          for (const d of debtsData) {
            if (d && d.id) map.set(d.id, d);
          }
          for (const localD of localList) {
            if (localD && localD.id && !map.has(localD.id)) {
              map.set(localD.id, localD);
            }
          }
          const merged = Array.from(map.values());
          setDebts(merged);
          saveStoredDebts(merged);
        }, (error) => {
          console.warn("Notice: Firestore debts snapshot listener warning:", error);
        });

        // Installments snapshot
        const installmentsQuery = query(
          collection(db, "installments"),
          where("userId", "==", user.uid),
          orderBy("dueDate", "asc")
        );

        unsubscribeInstallments = onSnapshot(installmentsQuery, (snapshot) => {
          const installmentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Installment));

          const localInst = getStoredInstallments();
          const map = new Map<string, Installment>();
          for (const inst of installmentsData) {
            if (inst && inst.id) map.set(inst.id, inst);
          }
          for (const localI of localInst) {
            if (localI && localI.id && !map.has(localI.id)) {
              map.set(localI.id, localI);
            }
          }
          const mergedInst = Array.from(map.values());
          setInstallments(mergedInst);
          saveStoredInstallments(mergedInst);
        }, (error) => {
          console.warn("Notice: Firestore installments snapshot listener warning:", error);
        });

        // Debt History snapshot
        const historyQuery = query(
          collection(db, "debtHistory"),
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          limit(100)
        );

        unsubscribeHistory = onSnapshot(historyQuery, (snapshot) => {
          const historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as DebtHistory));

          const localHist = getStoredHistory();
          const map = new Map<string, DebtHistory>();
          for (const hist of historyData) {
            if (hist && hist.id) map.set(hist.id, hist);
          }
          for (const localH of localHist) {
            if (localH && localH.id && !map.has(localH.id)) {
              map.set(localH.id, localH);
            }
          }
          const mergedHist = Array.from(map.values());
          setHistory(mergedHist);
          saveStoredHistory(mergedHist);
          setLoading(false);
        }, (error) => {
          console.warn("Notice: Firestore debtHistory snapshot listener warning:", error);
        });

        // Run automatic checks on mount
        const runChecks = async () => {
          await checkOverdue();
          const lastAccrual = localStorage.getItem(`last_accrual_${user.uid}`);
          const today = new Date().toDateString();
          if (lastAccrual !== today) {
            await accrueInterest();
            localStorage.setItem(`last_accrual_${user.uid}`, today);
          }
        };
        runChecks();
      } else {
        setDebts(getStoredDebts());
        setInstallments(getStoredInstallments());
        setHistory(getStoredHistory());
        setLoading(false);
        unsubscribeDebts = null;
        unsubscribeInstallments = null;
        unsubscribeHistory = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDebts) unsubscribeDebts();
      if (unsubscribeInstallments) unsubscribeInstallments();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  const addDebt = async (debtData: any, userProfile?: UserProfile) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const effectiveProfile = userProfile || getActiveUserProfile();

    try {
      const origValNum = parseCurrencyInput(debtData.originalValue);
      const totValNum = parseCurrencyInput(debtData.totalValue);
      const originalValue = (!isNaN(origValNum) && origValNum > 0) ? origValNum : (!isNaN(totValNum) && totValNum > 0 ? totValNum : 0);
      const remainingValue = (!isNaN(totValNum) && totValNum > 0) ? totValNum : originalValue;
      const paidValue = 0;
      const paidInstallments = 0;
      const totalInstallments = Math.max(1, parseInt(debtData.totalInstallments) || 1);
      const customInstVal = parseCurrencyInput(debtData.installmentValue);
      const installmentValue = debtData.type === "parcelada" 
        ? (customInstVal > 0 ? customInstVal : (remainingValue / totalInstallments))
        : remainingValue;

      // Fast, smart default scoring (non-blocking)
      const urgencyScore = (debtData.interestRate > 5 || debtData.priority === "urgente") ? 85 : 50;
      const initialAnalysis = {
        urgency: urgencyScore > 75 ? "alta" : "moderada",
        urgencyScore,
        urgencyReason: "Análise inicial com base na taxa de juros e prazo.",
        priority: debtData.priority || "media",
        priorityReason: "Prioridade inicial configurada.",
        riskLevel: urgencyScore > 75 ? "alto" : "medio",
        riskReason: "Acompanhe os vencimentos regularmente."
      };

      const debtId = "debt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      
      const newDebt: Debt = {
        ...debtData,
        id: debtId,
        userId: uid,
        originalValue,
        remainingValue,
        currentValue: remainingValue,
        totalValue: remainingValue,
        interestAccrued: 0,
        totalPaidValue: 0,
        paidValue,
        paidInstallments,
        installmentValue,
        totalInstallments,
        finalTotalCost: remainingValue,
        prepaymentSavings: 0,
        urgency: initialAnalysis.urgency as any,
        urgencyScore: initialAnalysis.urgencyScore,
        urgencyReason: initialAnalysis.urgencyReason,
        priority: debtData.priority || (initialAnalysis.priority as DebtPriority) || "media",
        priorityReason: initialAnalysis.priorityReason,
        riskLevel: initialAnalysis.riskLevel,
        riskReason: initialAnalysis.riskReason,
        createdAt: new Date().toISOString()
      };

      // Record History item
      const historyId = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      const historyItem: DebtHistory = {
        id: historyId,
        userId: uid,
        debtId: debtId,
        action: "created",
        value: debtData.totalValue,
        date: new Date().toISOString(),
        description: `Dívida "${debtData.name}" criada com ${totalInstallments} parcelas (Valor Original: R$ ${originalValue.toFixed(2)}).`
      };

      const newInstallmentsList: Installment[] = [];

      if (debtData.type === "parcelada" && totalInstallments > 0) {
        const principalPerInstallment = originalValue / totalInstallments;
        const interestPerInstallment = (debtData.totalValue - originalValue) / totalInstallments;
        const baseDueDateStr = debtData.dueDate || debtData.startDate || new Date().toISOString().split("T")[0];

        for (let i = 1; i <= totalInstallments; i++) {
          const installmentId = "inst_" + debtId + "_" + i;
          const dueDateStr = addMonthsToDate(baseDueDateStr, i - 1);

          const installment: Installment = {
            id: installmentId,
            userId: uid,
            debtId: debtId,
            installmentNumber: i,
            value: installmentValue,
            principalValue: principalPerInstallment,
            interestValue: interestPerInstallment,
            dueDate: dueDateStr,
            status: "pendente",
            createdAt: new Date().toISOString()
          };
          newInstallmentsList.push(installment);
        }
      } else if (debtData.type === "unica") {
        const installmentId = "inst_" + debtId + "_1";
        const dueDateStr = debtData.dueDate || debtData.endDate || debtData.startDate || new Date().toISOString().split("T")[0];
        const installment: Installment = {
          id: installmentId,
          userId: uid,
          debtId: debtId,
          installmentNumber: 1,
          value: debtData.totalValue,
          principalValue: originalValue,
          interestValue: debtData.totalValue - originalValue,
          dueDate: dueDateStr,
          status: "pendente",
          createdAt: new Date().toISOString()
        };
        newInstallmentsList.push(installment);
      }

      // Optimistic local state update and storage persistence
      setDebts(prev => {
        const filtered = prev.filter(d => d.id !== newDebt.id);
        const updated = [newDebt, ...filtered];
        saveStoredDebts(updated);
        return updated;
      });

      setInstallments(prev => {
        const newIds = new Set(newInstallmentsList.map(i => i.id));
        const filtered = prev.filter(i => !newIds.has(i.id));
        const updated = [...newInstallmentsList, ...filtered];
        saveStoredInstallments(updated);
        return updated;
      });

      setHistory(prev => {
        const filtered = prev.filter(h => h.id !== historyItem.id);
        const updated = [historyItem, ...filtered];
        saveStoredHistory(updated);
        return updated;
      });

      // Commit to Firestore if user is authenticated with Firebase Auth SDK
      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          const debtRef = doc(db, "debts", debtId);
          batch.set(debtRef, newDebt);

          const historyRef = doc(db, "debtHistory", historyId);
          batch.set(historyRef, historyItem);

          for (const inst of newInstallmentsList) {
            const instRef = doc(db, "installments", inst.id);
            batch.set(instRef, inst);
          }

          await batch.commit();

          // Non-blocking background AI analysis
          if (effectiveProfile) {
            analyzeDebtUrgency(
              { ...newDebt },
              effectiveProfile,
              effectiveProfile?.onboardingData?.monthlyIncome || 0,
              effectiveProfile?.onboardingData?.fixedExpenses || 0
            ).then(aiRes => {
              if (aiRes) {
                updateDoc(debtRef, {
                  urgency: aiRes.urgency,
                  urgencyScore: aiRes.urgencyScore,
                  urgencyReason: aiRes.urgencyReason,
                  priority: debtData.priority || aiRes.priority,
                  priorityReason: aiRes.priorityReason,
                  riskLevel: aiRes.riskLevel,
                  riskReason: aiRes.riskReason
                }).catch(() => {});
              }
            }).catch(() => {});
          }
        } catch (fbError) {
          console.warn("Notice: Saved debt locally, Firestore sync warning:", fbError);
        }
      }
    } catch (error) {
      console.error("Error adding debt:", error);
      throw error;
    }
  };

  const payInstallment = async (installmentId: string, accountId: string, paymentValue?: number) => {
    const uid = auth.currentUser?.uid || getActiveUserId();

    try {
      const installment = installments.find(i => i.id === installmentId);
      if (!installment) return;

      const debt = debts.find(d => d.id === installment.debtId);
      if (!debt) return;

      const actualPaymentValue = paymentValue || installment.value;
      
      let savings = 0;
      if (actualPaymentValue > installment.value) {
        const excess = actualPaymentValue - installment.value;
        const remainingInterest = debt.finalTotalCost - debt.totalPaidValue - debt.remainingValue;
        if (remainingInterest > 0 && debt.remainingValue > 0) {
          savings = (excess / debt.remainingValue) * remainingInterest;
        }
      }

      const newRemainingValue = Math.max(0, debt.remainingValue - actualPaymentValue - savings);
      const newPaidInstallments = debt.paidInstallments + 1;
      const newStatus: DebtStatus = newRemainingValue <= 0 ? "quitada" : debt.status;
      const newTotalPaidValue = debt.totalPaidValue + actualPaymentValue;

      const historyId = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      const historyItem: DebtHistory = {
        id: historyId,
        userId: uid,
        debtId: debt.id,
        installmentId: installmentId,
        action: "paid",
        value: actualPaymentValue,
        date: new Date().toISOString(),
        description: `Parcela ${installment.installmentNumber} paga. ${savings > 0 ? `Economia de R$ ${savings.toFixed(2)} em juros.` : ""}`
      };

      // Optimistic updates
      setInstallments(prev => {
        const updated = prev.map(i => i.id === installmentId ? {
          ...i,
          status: "paga" as InstallmentStatus,
          paymentDate: new Date().toISOString(),
          value: actualPaymentValue
        } : i);
        saveStoredInstallments(updated);
        return updated;
      });

      setDebts(prev => {
        const updated = prev.map(d => d.id === debt.id ? {
          ...d,
          remainingValue: newRemainingValue,
          currentValue: newRemainingValue,
          paidInstallments: newPaidInstallments,
          status: newStatus,
          paidValue: d.paidValue + actualPaymentValue,
          totalPaidValue: newTotalPaidValue,
          prepaymentSavings: d.prepaymentSavings + savings,
          updatedAt: new Date().toISOString()
        } : d);
        saveStoredDebts(updated);
        return updated;
      });

      setHistory(prev => {
        const updated = [historyItem, ...prev];
        saveStoredHistory(updated);
        return updated;
      });

      // Register transaction in financial system
      try {
        await transacoes.registrarTransacao({
          userId: uid,
          title: `Pagamento Parcela ${installment.installmentNumber} - ${debt.name}`,
          value: actualPaymentValue,
          type: "expense",
          category: "Dívidas",
          accountId: accountId,
          date: new Date().toISOString(),
          description: `Pagamento da parcela ${installment.installmentNumber} da dívida ${debt.name}. ${savings > 0 ? `Economia de R$ ${savings.toFixed(2)}.` : ""}`,
          emotion: "racional",
          createdAt: new Date().toISOString(),
          linkedDebtId: debt.id,
          linkedInstallmentId: installmentId
        } as any);
      } catch (e) {
        console.warn("Notice: Registering transaction warning:", e);
      }

      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          const installmentRef = doc(db, "installments", installmentId);
          batch.update(installmentRef, {
            status: "paga",
            paymentDate: new Date().toISOString(),
            value: actualPaymentValue
          });

          const debtRef = doc(db, "debts", debt.id);
          batch.update(debtRef, {
            remainingValue: newRemainingValue,
            currentValue: newRemainingValue,
            paidInstallments: newPaidInstallments,
            status: newStatus,
            paidValue: debt.paidValue + actualPaymentValue,
            totalPaidValue: newTotalPaidValue,
            prepaymentSavings: debt.prepaymentSavings + savings,
            updatedAt: new Date().toISOString()
          });

          const historyRef = doc(db, "debtHistory", historyId);
          batch.set(historyRef, historyItem);

          await batch.commit();
        } catch (error) {
          console.warn("Notice: Firestore pay installment sync warning:", error);
        }
      }
    } catch (error) {
      console.error("Error paying installment:", error);
    }
  };

  const updateDebt = async (debtId: string, updates: Partial<Debt>, userProfile?: UserProfile) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const effectiveProfile = userProfile || getActiveUserProfile();

    try {
      const currentDebt = debts.find(d => d.id === debtId);
      if (!currentDebt) return;

      const rawTotal = updates.totalValue !== undefined ? parseCurrencyInput(updates.totalValue) : currentDebt.totalValue;
      const newTotalValue = rawTotal > 0 ? rawTotal : currentDebt.totalValue;

      const rawOriginal = updates.originalValue !== undefined ? parseCurrencyInput(updates.originalValue) : currentDebt.originalValue;
      const newOriginalValue = rawOriginal > 0
        ? rawOriginal
        : ((currentDebt.originalValue && currentDebt.originalValue > 0) ? currentDebt.originalValue : newTotalValue);

      const rawInstCount = updates.totalInstallments !== undefined ? parseInt(String(updates.totalInstallments)) : currentDebt.totalInstallments;
      const newTotalInstallments = Math.max(1, !isNaN(rawInstCount) ? rawInstCount : (currentDebt.totalInstallments || 1));
      const newType = updates.type || currentDebt.type || "parcelada";

      const totalPaidValue = currentDebt.totalPaidValue || 0;
      const newRemainingValue = Math.max(0, newTotalValue - totalPaidValue);
      const customInstVal = updates.installmentValue !== undefined ? parseCurrencyInput(updates.installmentValue) : 0;
      const newInstallmentValue = newType === "parcelada" 
        ? (customInstVal > 0 ? customInstVal : (newTotalValue / newTotalInstallments)) 
        : newTotalValue;

      const updatedDebtData: Debt = {
        ...currentDebt,
        ...updates,
        totalValue: newTotalValue,
        originalValue: newOriginalValue,
        totalInstallments: newTotalInstallments,
        remainingValue: newRemainingValue,
        currentValue: newRemainingValue,
        installmentValue: newInstallmentValue,
        finalTotalCost: newTotalValue,
        updatedAt: new Date().toISOString()
      };

      // Update installments list
      const existingInstallments = installments.filter(i => i.debtId === debtId);
      const paidInsts = existingInstallments.filter(i => i.status === "paga");
      const pendingInsts = existingInstallments.filter(i => i.status !== "paga").sort((a, b) => a.installmentNumber - b.installmentNumber);

      const paidCount = paidInsts.length;
      const neededPendingCount = Math.max(0, newTotalInstallments - paidCount);

      const baseDueDateStr = updates.dueDate || updates.startDate || currentDebt.dueDate || currentDebt.startDate || new Date().toISOString().split("T")[0];
      const principalPerInst = newOriginalValue / newTotalInstallments;
      const interestPerInst = (newTotalValue - newOriginalValue) / newTotalInstallments;

      const updatedInstsList: Installment[] = [...paidInsts];

      for (let idx = 0; idx < neededPendingCount; idx++) {
        const instNumber = paidCount + idx + 1;
        const dueDateStr = addMonthsToDate(baseDueDateStr, instNumber - 1);

        if (idx < pendingInsts.length) {
          const oldInst = pendingInsts[idx];
          updatedInstsList.push({
            ...oldInst,
            installmentNumber: instNumber,
            value: newInstallmentValue,
            principalValue: principalPerInst,
            interestValue: interestPerInst,
            dueDate: dueDateStr,
            updatedAt: new Date().toISOString()
          });
        } else {
          updatedInstsList.push({
            id: "inst_" + debtId + "_" + instNumber + "_" + Date.now(),
            userId: uid,
            debtId,
            installmentNumber: instNumber,
            value: newInstallmentValue,
            principalValue: principalPerInst,
            interestValue: interestPerInst,
            dueDate: dueDateStr,
            status: "pendente",
            createdAt: new Date().toISOString()
          });
        }
      }

      const historyId = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      const historyItem: DebtHistory = {
        id: historyId,
        userId: uid,
        debtId,
        action: "edited",
        date: new Date().toISOString(),
        description: `Dívida "${currentDebt.name}" editada.`
      };

      // Optimistic updates
      setDebts(prev => {
        const updated = prev.map(d => d.id === debtId ? updatedDebtData : d);
        saveStoredDebts(updated);
        return updated;
      });

      setInstallments(prev => {
        const otherInsts = prev.filter(i => i.debtId !== debtId);
        const updated = [...otherInsts, ...updatedInstsList];
        saveStoredInstallments(updated);
        return updated;
      });

      setHistory(prev => {
        const updated = [historyItem, ...prev];
        saveStoredHistory(updated);
        return updated;
      });

      if (auth.currentUser) {
        try {
          const debtRef = doc(db, "debts", debtId);
          const batch = writeBatch(db);
          batch.update(debtRef, updatedDebtData as any);

          // Update/create/delete in Firestore
          for (let idx = 0; idx < Math.min(pendingInsts.length, neededPendingCount); idx++) {
            const inst = pendingInsts[idx];
            const instRef = doc(db, "installments", inst.id);
            const instNumber = paidCount + idx + 1;
            const dueDateStr = addMonthsToDate(baseDueDateStr, instNumber - 1);
            batch.update(instRef, {
              installmentNumber: instNumber,
              value: newInstallmentValue,
              principalValue: principalPerInst,
              interestValue: interestPerInst,
              dueDate: dueDateStr,
              updatedAt: new Date().toISOString()
            });
          }

          if (neededPendingCount > pendingInsts.length) {
            for (let idx = pendingInsts.length; idx < neededPendingCount; idx++) {
              const instRef = doc(collection(db, "installments"));
              const instNumber = paidCount + idx + 1;
              const dueDateStr = addMonthsToDate(baseDueDateStr, instNumber - 1);
              batch.set(instRef, {
                id: instRef.id,
                userId: auth.currentUser.uid,
                debtId,
                installmentNumber: instNumber,
                value: newInstallmentValue,
                principalValue: principalPerInst,
                interestValue: interestPerInst,
                dueDate: dueDateStr,
                status: "pendente",
                createdAt: new Date().toISOString()
              });
            }
          }

          if (pendingInsts.length > neededPendingCount) {
            for (let idx = neededPendingCount; idx < pendingInsts.length; idx++) {
              const instRef = doc(db, "installments", pendingInsts[idx].id);
              batch.delete(instRef);
            }
          }

          const historyRef = doc(db, "debtHistory", historyId);
          batch.set(historyRef, historyItem);

          await batch.commit();

          if (effectiveProfile) {
            analyzeDebtUrgency(
              { ...currentDebt, ...updatedDebtData },
              effectiveProfile,
              effectiveProfile?.onboardingData?.monthlyIncome || 0,
              effectiveProfile?.onboardingData?.fixedExpenses || 0
            ).then(aiRes => {
              if (aiRes) {
                updateDoc(debtRef, {
                  urgency: aiRes.urgency,
                  urgencyScore: aiRes.urgencyScore,
                  urgencyReason: aiRes.urgencyReason,
                  priority: updates.priority || aiRes.priority,
                  priorityReason: aiRes.priorityReason,
                  riskLevel: aiRes.riskLevel,
                  riskReason: aiRes.riskReason
                }).catch(() => {});
              }
            }).catch(() => {});
          }
        } catch (error) {
          console.warn("Notice: Firestore update debt warning:", error);
        }
      }
    } catch (error) {
      console.error("Error updating debt:", error);
      throw error;
    }
  };

  const deleteDebt = async (debtId: string) => {
    // Optimistic local state update
    setDebts(prev => {
      const updated = prev.filter(d => d.id !== debtId);
      saveStoredDebts(updated);
      return updated;
    });

    setInstallments(prev => {
      const updated = prev.filter(i => i.debtId !== debtId);
      saveStoredInstallments(updated);
      return updated;
    });

    setHistory(prev => {
      const updated = prev.filter(h => h.debtId !== debtId);
      saveStoredHistory(updated);
      return updated;
    });

    if (auth.currentUser) {
      try {
        const userId = auth.currentUser.uid;
        const [instSnapshot, histSnapshot, transSnapshot] = await Promise.all([
          getDocs(query(collection(db, "installments"), where("userId", "==", userId), where("debtId", "==", debtId))),
          getDocs(query(collection(db, "debtHistory"), where("userId", "==", userId), where("debtId", "==", debtId))),
          getDocs(query(collection(db, "transactions"), where("userId", "==", userId), where("linkedDebtId", "==", debtId)))
        ]);

        for (const tDoc of transSnapshot.docs) {
          const tData = tDoc.data();
          await transacoes.deletarTransacao({ id: tDoc.id, ...tData } as any);
        }

        const refsToDelete = [
          doc(db, "debts", debtId),
          ...instSnapshot.docs.map(d => d.ref),
          ...histSnapshot.docs.map(d => d.ref)
        ];

        const chunkSize = 450;
        for (let i = 0; i < refsToDelete.length; i += chunkSize) {
          const batch = writeBatch(db);
          const chunk = refsToDelete.slice(i, i + chunkSize);
          chunk.forEach(ref => batch.delete(ref));
          await batch.commit();
        }
      } catch (error) {
        console.warn("Notice: Firestore delete debt warning:", error);
      }
    }
  };

  const simulatePrepayment = (debtId: string, value: number) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt || debt.remainingValue <= 0) return { savings: 0, newTotalCost: 0, monthsSaved: 0 };

    const remainingInterest = debt.finalTotalCost - debt.totalPaidValue - debt.remainingValue;
    const savings = remainingInterest > 0 ? (value / debt.remainingValue) * remainingInterest : 0;
    const newTotalCost = debt.finalTotalCost - savings;
    
    const monthlyPayment = debt.installmentValue;
    const monthsSaved = monthlyPayment > 0 ? Math.floor((value + savings) / monthlyPayment) : 0;

    return { savings, newTotalCost, monthsSaved };
  };

  const accrueInterest = async () => {
    const uid = auth.currentUser?.uid || getActiveUserId();

    try {
      let hasChanges = false;
      const updatedDebtsList = debts.map(debt => {
        if (debt.status !== "quitada" && debt.interestRate > 0) {
          let interestAmount = 0;
          if (debt.interestType === "simples") {
            interestAmount = debt.originalValue * (debt.interestRate / 100);
          } else {
            interestAmount = debt.remainingValue * (debt.interestRate / 100);
          }

          if (interestAmount > 0) {
            hasChanges = true;
            return {
              ...debt,
              remainingValue: debt.remainingValue + interestAmount,
              currentValue: debt.remainingValue + interestAmount,
              interestAccrued: (debt.interestAccrued || 0) + interestAmount,
              finalTotalCost: (debt.finalTotalCost || debt.totalValue) + interestAmount,
              updatedAt: new Date().toISOString()
            };
          }
        }
        return debt;
      });

      if (hasChanges) {
        setDebts(updatedDebtsList);
        saveStoredDebts(updatedDebtsList);
      }

      if (auth.currentUser && hasChanges) {
        const batch = writeBatch(db);
        updatedDebtsList.forEach(debt => {
          const debtRef = doc(db, "debts", debt.id);
          batch.update(debtRef, {
            remainingValue: debt.remainingValue,
            currentValue: debt.currentValue,
            interestAccrued: debt.interestAccrued,
            finalTotalCost: debt.finalTotalCost,
            updatedAt: debt.updatedAt
          });
        });
        await batch.commit().catch(() => {});
      }
    } catch (error) {
      console.warn("Notice: accrue interest warning:", error);
    }
  };

  const checkOverdue = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let hasChanges = false;
      const updatedInsts = installments.map(inst => {
        if (inst.status === "pendente") {
          const dueDate = parseLocalDate(inst.dueDate);
          if (dueDate) {
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) {
              hasChanges = true;
              return { ...inst, status: "atrasada" as InstallmentStatus };
            }
          }
        }
        return inst;
      });

      if (hasChanges) {
        setInstallments(updatedInsts);
        saveStoredInstallments(updatedInsts);
      }
    } catch (error) {
      console.warn("Notice: check overdue warning:", error);
    }
  };

  const renegotiateDebt = async (
    debtId: string,
    renegData: {
      totalInstallments: number;
      interestRate: number;
      installmentValue: number;
      dueDate: string;
      discountValue?: number;
      newRemainingValue: number;
      notes?: string;
    },
    userProfile?: UserProfile
  ) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const effectiveProfile = userProfile || getActiveUserProfile();

    try {
      const currentDebt = debts.find(d => d.id === debtId);
      if (!currentDebt) return;

      const discount = renegData.discountValue || 0;
      const finalRemainingValue = renegData.newRemainingValue;

      // Preserve the immutable original value of the debt so it never changes upon renegotiation
      const preservedOriginalValue = (typeof currentDebt.originalValue === "number" && !isNaN(currentDebt.originalValue) && currentDebt.originalValue > 0)
        ? currentDebt.originalValue
        : (currentDebt.totalValue || finalRemainingValue);

      const historyId = "hist_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      const historyItem: DebtHistory = {
        id: historyId,
        userId: uid,
        debtId,
        action: "renegotiated",
        date: new Date().toISOString(),
        description: `Dívida renegociada: Novo saldo de R$ ${finalRemainingValue.toFixed(2)} dividido em ${renegData.totalInstallments} parcelas de R$ ${renegData.installmentValue.toFixed(2)}. Desconto de R$ ${discount.toFixed(2)} aplicado (Valor Original mantido: R$ ${preservedOriginalValue.toFixed(2)}).`,
        value: finalRemainingValue
      };

      const baseStartDateStr = renegData.dueDate || new Date().toISOString().split("T")[0];
      const principalPerInstallment = finalRemainingValue / renegData.totalInstallments;
      const newInstsList: Installment[] = [];

      for (let i = 1; i <= renegData.totalInstallments; i++) {
        const installmentId = "inst_reneg_" + debtId + "_" + i + "_" + Date.now();
        const dueDateStr = addMonthsToDate(baseStartDateStr, i - 1);

        const installment: Installment = {
          id: installmentId,
          userId: uid,
          debtId,
          installmentNumber: i,
          value: renegData.installmentValue,
          principalValue: principalPerInstallment,
          interestValue: 0,
          dueDate: dueDateStr,
          status: "pendente",
          createdAt: new Date().toISOString()
        };
        newInstsList.push(installment);
      }

      const updatedDebt: Debt = {
        ...currentDebt,
        originalValue: preservedOriginalValue,
        remainingValue: finalRemainingValue,
        currentValue: finalRemainingValue,
        totalValue: finalRemainingValue,
        totalInstallments: renegData.totalInstallments,
        interestRate: renegData.interestRate,
        installmentValue: renegData.installmentValue,
        status: "em_negociacao",
        notes: renegData.notes || currentDebt.notes || "",
        updatedAt: new Date().toISOString()
      };

      setDebts(prev => {
        const updated = prev.map(d => d.id === debtId ? updatedDebt : d);
        saveStoredDebts(updated);
        return updated;
      });

      setInstallments(prev => {
        // Keep paid installments, replace pending/overdue
        const keptInsts = prev.filter(i => i.debtId !== debtId || i.status === "paga");
        const updated = [...keptInsts, ...newInstsList];
        saveStoredInstallments(updated);
        return updated;
      });

      setHistory(prev => {
        const updated = [historyItem, ...prev];
        saveStoredHistory(updated);
        return updated;
      });

      if (auth.currentUser) {
        try {
          const batch = writeBatch(db);
          const instSnapshot = await getDocs(
            query(
              collection(db, "installments"),
              where("debtId", "==", debtId)
            )
          );

          instSnapshot.docs.forEach((docSnap) => {
            const inst = docSnap.data();
            if (inst.status !== "paga") {
              batch.delete(docSnap.ref);
            }
          });

          const historyRef = doc(db, "debtHistory", historyId);
          batch.set(historyRef, historyItem);

          for (const inst of newInstsList) {
            const instRef = doc(db, "installments", inst.id);
            batch.set(instRef, inst);
          }

          const debtRef = doc(db, "debts", debtId);
          batch.update(debtRef, updatedDebt as any);

          await batch.commit();
        } catch (error) {
          console.warn("Notice: Firestore renegotiate sync warning:", error);
        }
      }
    } catch (error) {
      console.error("Error renegotiating debt:", error);
      throw error;
    }
  };

  const enrichedDebts = useMemo(() => {
    const uniqueDebtsMap = new Map<string, Debt>();
    for (const d of debts) {
      if (d && d.id) {
        uniqueDebtsMap.set(d.id, d);
      }
    }
    const uniqueDebts = Array.from(uniqueDebtsMap.values());

    return uniqueDebts.map(debt => {
      const debtInsts = installments
        .filter(i => i.debtId === debt.id && i.status !== "paga")
        .sort((a, b) => {
          const da = parseLocalDate(a.dueDate)?.getTime() || 0;
          const db = parseLocalDate(b.dueDate)?.getTime() || 0;
          return da - db;
        });
      
      const nextInst = debtInsts[0];
      const computedNextDate = nextInst ? nextInst.dueDate : debt.dueDate;

      return {
        ...debt,
        nextInstallmentDate: computedNextDate
      };
    });
  }, [debts, installments]);

  return (
    <DebtsContext.Provider value={{ debts: enrichedDebts, installments, history, loading, addDebt, payInstallment, updateDebt, deleteDebt, accrueInterest, checkOverdue, simulatePrepayment, renegotiateDebt }}>
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const context = useContext(DebtsContext);
  if (context === undefined) {
    throw new Error("useDebts must be used within a DebtsProvider");
  }
  return context;
}
