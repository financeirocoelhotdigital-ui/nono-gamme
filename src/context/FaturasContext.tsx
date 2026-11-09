import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Invoice, Card, Transaction } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getStoredCards } from "./CartoesContext";
import { getStoredTransactions } from "./TransacoesContext";
import { getBillingPeriod, getInvoiceDates } from "../lib/creditCardUtils";

const LOCAL_STORAGE_INVOICES = "finance_local_invoices_v1";

export function getStoredInvoices(): Invoice[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_INVOICES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar faturas locais:", e);
  }
  return [];
}

export function saveStoredInvoices(invoices: Invoice[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INVOICES, JSON.stringify(invoices));
    window.dispatchEvent(new CustomEvent("local_invoices_changed"));
  } catch (e) {
    console.warn("Erro ao salvar faturas locais:", e);
  }
}

/**
 * Derives/merges invoices from transactions that belong to credit cards.
 */
export function deriveInvoicesFromTransactions(
  transactions: Transaction[], 
  cards: Card[], 
  existingInvoices: Invoice[]
): Invoice[] {
  const invoiceMap = new Map<string, Invoice>();

  // 1. Seed with existing invoices
  for (const inv of existingInvoices) {
    invoiceMap.set(inv.id, { ...inv });
  }

  // 2. Scan card transactions and ensure matching invoices exist
  const cardMap = new Map<string, Card>(cards.map(c => [c.id, c]));

  for (const tx of transactions) {
    if (!tx.cardId || tx.type !== "expense") continue;

    const card = cardMap.get(tx.cardId);
    const closingDay = card?.closingDay || 1;
    const dueDay = card?.dueDay || 10;
    const txDate = tx.date ? new Date(tx.date) : new Date();

    const period = getBillingPeriod(txDate, closingDay);
    const month = typeof tx.billingMonth === "number" ? tx.billingMonth : period.month;
    const year = typeof tx.billingYear === "number" ? tx.billingYear : period.year;

    const invoiceId = `${tx.cardId}_${year}_${month}`;

    if (invoiceMap.has(invoiceId)) {
      const inv = invoiceMap.get(invoiceId)!;
      const items = inv.items || [];
      if (!items.includes(tx.id)) {
        inv.items = [...items, tx.id];
        // Only increase totalValue if invoice isn't already marked paid
        if (inv.status !== "paid") {
          inv.totalValue = (inv.totalValue || 0) + (tx.value || 0);
        }
      }
    } else {
      const { closingDate, dueDate } = getInvoiceDates(month, year, closingDay, dueDay);
      const isPastDue = new Date(dueDate) < new Date();
      invoiceMap.set(invoiceId, {
        id: invoiceId,
        userId: tx.userId || auth.currentUser?.uid || "default_user",
        cardId: tx.cardId,
        month,
        year,
        totalValue: tx.value || 0,
        paidValue: 0,
        status: isPastDue ? "overdue" : "open",
        closingDate,
        dueDate,
        items: [tx.id],
        createdAt: new Date().toISOString()
      });
    }
  }

  const list = Array.from(invoiceMap.values());
  // Sort descending by year, then month
  list.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return b.month - a.month;
  });

  return list;
}

interface FaturasContextType {
  invoices: Invoice[];
  loading: boolean;
  refreshInvoices: () => void;
}

const FaturasContext = createContext<FaturasContextType | undefined>(undefined);

export function FaturasProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const stored = getStoredInvoices();
    const cards = getStoredCards();
    const txs = getStoredTransactions();
    return deriveInvoicesFromTransactions(txs, cards, stored);
  });
  const [loading, setLoading] = useState(false);

  const refreshInvoices = useCallback(() => {
    const stored = getStoredInvoices();
    const cards = getStoredCards();
    const txs = getStoredTransactions();
    const derived = deriveInvoicesFromTransactions(txs, cards, stored);
    setInvoices(derived);
    saveStoredInvoices(derived);
  }, []);

  useEffect(() => {
    const handleStorage = () => {
      refreshInvoices();
    };
    window.addEventListener("local_invoices_changed", handleStorage);
    window.addEventListener("local_transactions_changed", handleStorage);
    window.addEventListener("local_cards_changed", handleStorage);

    return () => {
      window.removeEventListener("local_invoices_changed", handleStorage);
      window.removeEventListener("local_transactions_changed", handleStorage);
      window.removeEventListener("local_cards_changed", handleStorage);
    };
  }, [refreshInvoices]);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      if (user) {
        // Query WITHOUT multiple orderBys to prevent Firestore index requirements
        const q = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const remoteInvoices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Invoice));

          const stored = getStoredInvoices();
          const cards = getStoredCards();
          const txs = getStoredTransactions();

          // Merge remote with local and derive
          const merged = [...remoteInvoices];
          for (const s of stored) {
            if (!merged.some(m => m.id === s.id)) {
              merged.push(s);
            }
          }

          const derived = deriveInvoicesFromTransactions(txs, cards, merged);
          setInvoices(derived);
          saveStoredInvoices(derived);
          setLoading(false);
        }, (err) => {
          console.warn("Notice: Firestore invoice snapshot fallback to local:", err);
          refreshInvoices();
          setLoading(false);
        });
      } else {
        refreshInvoices();
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [refreshInvoices]);

  return (
    <FaturasContext.Provider value={{ invoices, loading, refreshInvoices }}>
      {children}
    </FaturasContext.Provider>
  );
}

export function useFaturas() {
  const context = useContext(FaturasContext);
  if (context === undefined) {
    throw new Error("useFaturas must be used within a FaturasProvider");
  }
  return context;
}
