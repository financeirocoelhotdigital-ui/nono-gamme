import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Transaction } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const LOCAL_TRANSACTIONS_KEY = "finance_local_transactions_v2";

export function getStoredTransactions(): Transaction[] {
  try {
    const saved = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Error loading stored transactions:", e);
  }
  return [];
}

export function saveStoredTransactions(txs: Transaction[]) {
  try {
    localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(txs));
    window.dispatchEvent(new CustomEvent("local_transactions_changed"));
  } catch (e) {
    console.warn("Error saving transactions:", e);
  }
}

interface TransacoesContextType {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
}

const TransacoesContext = createContext<TransacoesContextType | undefined>(undefined);

export function TransacoesProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setTransactions(getStoredTransactions());
    };

    window.addEventListener("local_transactions_changed", handleStorageChange);

    return () => {
      window.removeEventListener("local_transactions_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      if (user) {
        const q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const transactionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Transaction));

          // Merge Firestore docs with local storage
          const localList = getStoredTransactions();
          const merged = [...transactionsData];
          for (const localTx of localList) {
            if (!merged.some(t => t.id === localTx.id)) {
              merged.push(localTx);
            }
          }
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setTransactions(merged);
          saveStoredTransactions(merged);
          setLoading(false);
          setError(null);
        }, (err) => {
          console.warn("Notice: Firestore transactions snapshot listener warning:", err);
          setLoading(false);
        });
      } else {
        // Guest mode / Unauthenticated
        setTransactions(getStoredTransactions());
        setLoading(false);
        setError(null);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  return (
    <TransacoesContext.Provider value={{ transactions, loading, error }}>
      {children}
    </TransacoesContext.Provider>
  );
}

export function useTransacoes() {
  const context = useContext(TransacoesContext);
  if (context === undefined) {
    throw new Error("useTransacoes must be used within a TransacoesProvider");
  }
  return context;
}

