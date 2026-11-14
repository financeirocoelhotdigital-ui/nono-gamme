import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from "react";
import { Account, ReconciliationHistory } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useTransacoes } from "./TransacoesContext";
import { calculateAccountBalance } from "../lib/financialCalculations";
import { conciliarConta, generateAdjustmentTransaction } from "../lib/reconciliation";
import { getActiveUserId } from "../lib/authUtils";

import { transacoes } from "../modules/transacoesModule";
import { contas } from "../modules/contasModule";

interface ContasContextType {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  addAccount: (accountData: Omit<Account, "id" | "userId">) => Promise<Account | null>;
  updateAccount: (accountId: string, accountData: Partial<Account>) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  setDefaultAccount: (accountId: string) => Promise<void>;
  reconcileAccount: (accountId: string, notes?: string) => Promise<void>;
  adjustAccountBalance: (accountId: string, difference: number) => Promise<void>;
  reconciliationHistory: ReconciliationHistory[];
}

const ContasContext = createContext<ContasContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "finance_local_accounts_v1";

export function getStoredAccounts(): Account[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const activeUid = getActiveUserId();
        return parsed.filter((a: any) => {
          if (!a || !a.id || a.id === "acc_principal") return false;
          if (!activeUid || activeUid === "default_user") {
            return !a.userId || a.userId === "default_user";
          }
          return a.userId === activeUid || !a.userId || a.userId === "default_user";
        });
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar contas do localStorage:", e);
  }
  return [];
}

export function saveStoredAccounts(accounts: Account[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent("local_accounts_changed"));
  } catch (e) {
    console.warn("Erro ao salvar contas no localStorage:", e);
  }
}

export function ContasProvider({ children }: { children: ReactNode }) {
  const [rawAccounts, setRawAccounts] = useState<Account[]>(getStoredAccounts);
  const rawAccountsRef = useRef<Account[]>(rawAccounts);
  rawAccountsRef.current = rawAccounts;

  const [reconciliationHistory, setReconciliationHistory] = useState<ReconciliationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { transactions } = useTransacoes();

  useEffect(() => {
    const handleStorageChange = () => {
      setRawAccounts(getStoredAccounts());
    };
    window.addEventListener("local_accounts_changed", handleStorageChange);
    window.addEventListener("user_profile_updated", handleStorageChange);
    return () => {
      window.removeEventListener("local_accounts_changed", handleStorageChange);
      window.removeEventListener("user_profile_updated", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeAccounts: (() => void) | null = null;
    let unsubscribeHistory: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeAccounts) unsubscribeAccounts();
      if (unsubscribeHistory) unsubscribeHistory();

      if (user) {
        // Accounts listener without composite index constraint
        const qAccounts = query(
          collection(db, "accounts"),
          where("userId", "==", user.uid)
        );

        unsubscribeAccounts = onSnapshot(qAccounts, (snapshot) => {
          const accountsData = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as Account));

          const localList = getStoredAccounts();
          const merged = [...accountsData];
          const toSync: Account[] = [];

          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                const normalized = { ...item, userId: user.uid, active: item.active !== false };
                merged.push(normalized);
                toSync.push(normalized);
              }
            }
          }

          if (toSync.length > 0) {
            toSync.forEach(acc => {
              contas.criarConta(user.uid, acc).catch(() => {});
            });
          }

          merged.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

          setRawAccounts(merged);
          saveStoredAccounts(merged);
          setLoading(false);
          setError(null);
        }, (err) => {
          console.warn("Aviso no snapshot de contas (mantido estado local):", err);
          setRawAccounts(getStoredAccounts());
          setLoading(false);
        });

        // Reconciliation History listener
        const qHistory = query(
          collection(db, "reconciliationHistory"),
          where("userId", "==", user.uid)
        );

        unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
          const historyData = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          } as ReconciliationHistory));
          historyData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
          setReconciliationHistory(historyData);
          setError(null);
        }, (err) => {
          console.warn("Aviso histórico conciliação:", err);
          setLoading(false);
        });
      } else {
        setRawAccounts(getStoredAccounts());
        setLoading(false);
        setError(null);
        unsubscribeAccounts = null;
        unsubscribeHistory = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeAccounts) unsubscribeAccounts();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, []);

  const accounts = useMemo(() => {
    return rawAccounts.map(acc => ({
      ...acc,
      active: acc.active !== false,
      balance: calculateAccountBalance(acc, transactions)
    }));
  }, [rawAccounts, transactions]);

  const reconcileAccount = async (accountId: string, notes?: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    const uid = getActiveUserId();
    const result = conciliarConta(account, transactions);
    
    const history: Partial<ReconciliationHistory> = {
      userId: uid,
      accountId,
      date: new Date().toISOString(),
      calculatedBalance: result.calculatedBalance,
      storedBalance: result.storedBalance,
      difference: result.difference,
      notes,
      status: result.isBalanced ? "success" : "divergence"
    };

    try {
      await addDoc(collection(db, "reconciliationHistory"), history);
      await updateDoc(doc(db, "accounts", accountId), {
        lastReconciliation: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Erro ao salvar histórico de conciliação:", e);
    }
  };

  const adjustAccountBalance = async (accountId: string, difference: number) => {
    const uid = getActiveUserId();
    const adjustment = generateAdjustmentTransaction(uid, accountId, difference);
    await transacoes.registrarTransacao(adjustment as any);
    
    const latestHistory = reconciliationHistory.find(h => h.accountId === accountId);
    if (latestHistory && latestHistory.status === "divergence") {
      try {
        await updateDoc(doc(db, "reconciliationHistory", latestHistory.id), {
          status: "adjusted"
        });
      } catch (e) {
        console.warn("Erro ao atualizar histórico:", e);
      }
    }
  };

  const addAccount = async (accountData: Omit<Account, "id" | "userId">) => {
    const uid = getActiveUserId();
    const newId = doc(collection(db, "accounts")).id;
    const currentAccounts = rawAccountsRef.current;
    const shouldBeDefault = accountData.isDefault !== undefined ? !!accountData.isDefault : currentAccounts.length === 0;

    const newAccount: Account = {
      id: newId,
      userId: uid,
      name: accountData.name,
      institution: accountData.institution,
      type: accountData.type || "corrente",
      balance: accountData.balance ?? 0,
      initialBalance: accountData.initialBalance ?? accountData.balance ?? 0,
      color: accountData.color || "#10b981",
      icon: accountData.icon || "landmark",
      isDefault: shouldBeDefault,
      active: accountData.active !== false,
      notes: accountData.notes || "",
      balanceThreshold: accountData.balanceThreshold,
      createdAt: new Date().toISOString()
    };

    let nextAccounts = [...currentAccounts.filter(a => a.id !== newAccount.id)];
    if (newAccount.isDefault) {
      nextAccounts = nextAccounts.map(a => ({ ...a, isDefault: false }));
    }
    nextAccounts.push(newAccount);
    rawAccountsRef.current = nextAccounts;
    setRawAccounts(nextAccounts);
    saveStoredAccounts(nextAccounts);

    try {
      await contas.criarConta(uid, newAccount);
      if (newAccount.isDefault) {
        await contas.definirComoPadrao(newAccount.id, nextAccounts);
      }
    } catch (err) {
      console.warn("Aviso ao salvar conta no Firestore (mantida localmente):", err);
    }

    return newAccount;
  };

  const updateAccount = async (accountId: string, accountData: Partial<Account>) => {
    const currentAccounts = rawAccountsRef.current;
    const nextAccounts = currentAccounts.map(acc => {
      if (acc.id === accountId) {
        return { ...acc, ...accountData };
      }
      if (accountData.isDefault) {
        return { ...acc, isDefault: false };
      }
      return acc;
    });
    rawAccountsRef.current = nextAccounts;
    setRawAccounts(nextAccounts);
    saveStoredAccounts(nextAccounts);

    try {
      await contas.atualizarConta(accountId, accountData);
      if (accountData.isDefault) {
        await contas.definirComoPadrao(accountId, nextAccounts);
      }
    } catch (err) {
      console.warn("Aviso ao atualizar conta no Firestore:", err);
    }
  };

  const deleteAccount = async (accountId: string) => {
    const currentAccounts = rawAccountsRef.current;
    const deletedAccount = currentAccounts.find(acc => acc.id === accountId);
    let nextAccounts = currentAccounts.filter(acc => acc.id !== accountId);

    // If the deleted account was the default and other active accounts remain, promote the first active one
    let promotedAccountId: string | null = null;
    if (deletedAccount?.isDefault && nextAccounts.length > 0 && !nextAccounts.some(a => a.isDefault)) {
      const candidate = nextAccounts.find(a => a.active !== false) || nextAccounts[0];
      if (candidate) {
        promotedAccountId = candidate.id;
        nextAccounts = nextAccounts.map(a => ({
          ...a,
          isDefault: a.id === candidate.id
        }));
      }
    }

    rawAccountsRef.current = nextAccounts;
    setRawAccounts(nextAccounts);
    saveStoredAccounts(nextAccounts);

    try {
      await contas.deletarConta(accountId);
      if (promotedAccountId) {
        await contas.definirComoPadrao(promotedAccountId, nextAccounts);
      }
    } catch (err) {
      console.warn("Aviso ao deletar conta do Firestore:", err);
    }
  };

  const setDefaultAccount = async (accountId: string) => {
    const currentAccounts = rawAccountsRef.current;
    const nextAccounts = currentAccounts.map(acc => ({
      ...acc,
      isDefault: acc.id === accountId
    }));
    rawAccountsRef.current = nextAccounts;
    setRawAccounts(nextAccounts);
    saveStoredAccounts(nextAccounts);

    try {
      await contas.definirComoPadrao(accountId, nextAccounts);
    } catch (err) {
      console.warn("Aviso ao definir conta padrão no Firestore:", err);
    }
  };

  return (
    <ContasContext.Provider value={{ 
      accounts, 
      loading, 
      error,
      addAccount,
      updateAccount,
      deleteAccount,
      setDefaultAccount,
      reconcileAccount, 
      adjustAccountBalance,
      reconciliationHistory 
    }}>
      {children}
    </ContasContext.Provider>
  );
}

export function useContas() {
  const context = useContext(ContasContext);
  if (context === undefined) {
    throw new Error("useContas must be used within a ContasProvider");
  }
  return context;
}
