import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { TransactionHistory, Transaction } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getStoredTransactions } from "./TransacoesContext";

const LOCAL_HISTORY_KEY = "finance_local_history_v1";

export function getStoredHistory(): TransactionHistory[] {
  try {
    const saved = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar histórico local:", e);
  }
  // Synthesize initial history from existing transactions if empty
  try {
    const txs = getStoredTransactions();
    if (txs.length > 0) {
      const initial: TransactionHistory[] = txs.map(t => ({
        id: `hist_init_${t.id}`,
        userId: t.userId || "default_user",
        transactionId: t.id,
        action: "created",
        date: t.date || t.createdAt || new Date().toISOString(),
        description: `Lançamento de ${t.type === "income" ? "receita" : "despesa"}: ${t.title || t.category} (${t.value})`,
        module: t.type
      }));
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(initial));
      return initial;
    }
  } catch (e) {}
  return [];
}

export function saveStoredHistory(history: TransactionHistory[]) {
  try {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("local_history_changed"));
  } catch (e) {
    console.warn("Erro ao salvar histórico local:", e);
  }
}

interface HistoricoContextType {
  history: TransactionHistory[];
  loading: boolean;
  clearHistory: () => void;
}

const HistoricoContext = createContext<HistoricoContextType | undefined>(undefined);

export function HistoricoProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<TransactionHistory[]>(getStoredHistory);
  const [loading, setLoading] = useState(false);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(LOCAL_HISTORY_KEY);
    setHistory([]);
    window.dispatchEvent(new CustomEvent("local_history_changed"));
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      setHistory(getStoredHistory());
    };
    window.addEventListener("local_history_changed", handleStorage);
    window.addEventListener("local_transactions_changed", handleStorage);

    return () => {
      window.removeEventListener("local_history_changed", handleStorage);
      window.removeEventListener("local_transactions_changed", handleStorage);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      if (user) {
        // Query without multiple orderBys to prevent Firestore missing index requirement
        const q = query(
          collection(db, "transactionHistory"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const remoteHistory = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as TransactionHistory));

          const localList = getStoredHistory();
          const merged = [...remoteHistory];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              merged.push(item);
            }
          }

          merged.sort((a, b) => new Date(b.date || (b as any).timestamp || 0).getTime() - new Date(a.date || (a as any).timestamp || 0).getTime());
          setHistory(merged);
          saveStoredHistory(merged);
          setLoading(false);
        }, (err) => {
          console.warn("Notice: Firestore transactionHistory fallback to local:", err);
          setHistory(getStoredHistory());
          setLoading(false);
        });
      } else {
        setHistory(getStoredHistory());
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return (
    <HistoricoContext.Provider value={{ history, loading, clearHistory }}>
      {children}
    </HistoricoContext.Provider>
  );
}

export function useHistorico() {
  const context = useContext(HistoricoContext);
  if (context === undefined) {
    throw new Error("useHistorico must be used within a HistoricoProvider");
  }
  return context;
}
