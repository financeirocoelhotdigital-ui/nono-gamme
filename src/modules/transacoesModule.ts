import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc, updateDoc, runTransaction, increment } from "firebase/firestore";
import { Transaction, Invoice, TransactionHistory } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { contas } from "./contasModule";
import { cartoes } from "./cartoesModule";
import { cleanData } from "../lib/utils";
import { getStoredTransactions, saveStoredTransactions } from "../context/TransacoesContext";
import { getStoredCards, saveStoredCards } from "../context/CartoesContext";
import { getStoredInvoices, saveStoredInvoices } from "../context/FaturasContext";
import { getBillingPeriod, getInvoiceDates } from "../lib/creditCardUtils";

function recordHistory(
  action: "created" | "edited" | "deleted" | "restored", 
  tx: Transaction, 
  description: string, 
  changes?: any[]
) {
  try {
    const LOCAL_HISTORY_KEY = "finance_local_history_v1";
    const historyEntry: TransactionHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: tx.userId || auth.currentUser?.uid || "default_user",
      transactionId: tx.id,
      action,
      date: new Date().toISOString(),
      description,
      module: tx.type,
      changes
    };
    const saved = localStorage.getItem(LOCAL_HISTORY_KEY);
    const list: TransactionHistory[] = saved ? JSON.parse(saved) : [];
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify([historyEntry, ...list.slice(0, 199)]));
    window.dispatchEvent(new CustomEvent("local_history_changed"));

    if (auth.currentUser?.uid) {
      addDoc(collection(db, "transactionHistory"), {
        ...historyEntry,
        timestamp: new Date().toISOString()
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("Notice: History record notice:", e);
  }
}

export const transacoes = {
  async registrarTransacao(transactionData: Omit<Transaction, 'id'>) {
    const uid = auth.currentUser?.uid || "default_user";
    const cleanTransactionData = cleanData(transactionData);
    const generatedId = doc(collection(db, "transactions")).id;

    const newTx: Transaction = {
      ...cleanTransactionData,
      id: generatedId,
      userId: uid,
      createdAt: cleanTransactionData.createdAt || new Date().toISOString()
    };

    // 1. Instant local persistence for transactions
    try {
      const currentList = getStoredTransactions();
      const updatedList = [newTx, ...currentList.filter(t => t.id !== generatedId)];
      saveStoredTransactions(updatedList);
    } catch (e) {
      console.warn("Local storage write notice:", e);
    }

    // 2. Instant local card limit and invoice update if paid via card
    if (cleanTransactionData.cardId && cleanTransactionData.type === "expense") {
      try {
        const cards = getStoredCards();
        const targetCard = cards.find(c => c.id === cleanTransactionData.cardId);
        if (targetCard) {
          targetCard.usedLimit = (targetCard.usedLimit || 0) + (cleanTransactionData.value || 0);
          saveStoredCards([...cards]);

          // Update local invoice
          const period = getBillingPeriod(new Date(cleanTransactionData.date || new Date()), targetCard.closingDay || 1);
          const month = typeof cleanTransactionData.billingMonth === "number" ? cleanTransactionData.billingMonth : period.month;
          const year = typeof cleanTransactionData.billingYear === "number" ? cleanTransactionData.billingYear : period.year;
          const invoiceId = `${cleanTransactionData.cardId}_${year}_${month}`;

          const invoices = getStoredInvoices();
          const existingInv = invoices.find(i => i.id === invoiceId);
          if (existingInv) {
            existingInv.totalValue = (existingInv.totalValue || 0) + cleanTransactionData.value;
            if (!existingInv.items?.includes(generatedId)) {
              existingInv.items = [...(existingInv.items || []), generatedId];
            }
            saveStoredInvoices([...invoices]);
          } else {
            const { closingDate, dueDate } = getInvoiceDates(month, year, targetCard.closingDay || 1, targetCard.dueDay || 10);
            const newInv: Invoice = {
              id: invoiceId,
              userId: uid,
              cardId: cleanTransactionData.cardId,
              month,
              year,
              totalValue: cleanTransactionData.value,
              paidValue: 0,
              status: new Date(dueDate) < new Date() ? "overdue" : "open",
              closingDate,
              dueDate,
              items: [generatedId],
              createdAt: new Date().toISOString()
            };
            saveStoredInvoices([newInv, ...invoices]);
          }
        }
      } catch (cardErr) {
        console.warn("Local card/invoice update warning:", cardErr);
      }
    }

    // 3. Record in Global History
    recordHistory("created", newTx, `Lançamento de ${newTx.type === "income" ? "receita" : "despesa"}: ${newTx.title || newTx.category} (${newTx.value})`);

    // 4. Attempt Firestore sync if authenticated
    if (auth.currentUser?.uid) {
      try {
        const { calculateInstallments, getInvoiceDates, getBillingPeriod } = await import("../lib/creditCardUtils");
        
        await runTransaction(db, async (transaction) => {
          if (cleanTransactionData.cardId && cleanTransactionData.type === "expense") {
            const cardRef = doc(db, "cards", cleanTransactionData.cardId);
            const cardSnap = await transaction.get(cardRef);
            
            if (cardSnap.exists()) {
              const card = cardSnap.data();

              if (cleanTransactionData.installment && cleanTransactionData.totalInstallments && cleanTransactionData.totalInstallments > 1) {
                // Installment transaction flow
                const installmentsData = calculateInstallments(
                  cleanTransactionData.value, 
                  cleanTransactionData.totalInstallments, 
                  new Date(cleanTransactionData.date), 
                  card.closingDay
                );
                
                const groupId = doc(collection(db, "transactions")).id;
                
                for (const inst of installmentsData) {
                  const instRef = doc(collection(db, "transactions"));
                  const instData = {
                    ...cleanTransactionData,
                    id: instRef.id,
                    userId: uid,
                    value: inst.value,
                    currentInstallment: inst.installmentNumber,
                    totalInstallments: cleanTransactionData.totalInstallments,
                    installmentGroupId: groupId,
                    billingMonth: inst.month,
                    billingYear: inst.year,
                    date: new Date(inst.year, inst.month, new Date(cleanTransactionData.date).getDate()).toISOString()
                  };
                  transaction.set(instRef, instData);

                  const invoiceId = `${cleanTransactionData.cardId}_${inst.year}_${inst.month}`;
                  const invoiceRef = doc(db, "invoices", invoiceId);
                  const invoiceSnap = await transaction.get(invoiceRef);

                  if (invoiceSnap.exists()) {
                    const existingItems = invoiceSnap.data().items || [];
                    transaction.update(invoiceRef, {
                      totalValue: increment(inst.value),
                      items: [...existingItems, instRef.id]
                    });
                  } else {
                    const { closingDate, dueDate } = getInvoiceDates(inst.month, inst.year, card.closingDay, card.dueDay);
                    transaction.set(invoiceRef, {
                      id: invoiceId,
                      userId: uid,
                      cardId: cleanTransactionData.cardId,
                      month: inst.month,
                      year: inst.year,
                      totalValue: inst.value,
                      paidValue: 0,
                      status: "open",
                      closingDate,
                      dueDate,
                      items: [instRef.id],
                      createdAt: new Date().toISOString()
                    });
                  }
                }
              } else {
                // Single 1x Card Transaction
                const transactionRef = doc(db, "transactions", generatedId);
                transaction.set(transactionRef, newTx);

                const period = getBillingPeriod(new Date(cleanTransactionData.date), card.closingDay);
                const invoiceId = `${cleanTransactionData.cardId}_${period.year}_${period.month}`;
                const invoiceRef = doc(db, "invoices", invoiceId);
                const invoiceSnap = await transaction.get(invoiceRef);

                if (invoiceSnap.exists()) {
                  const existingItems = invoiceSnap.data().items || [];
                  transaction.update(invoiceRef, {
                    totalValue: increment(cleanTransactionData.value),
                    items: [...existingItems, generatedId]
                  });
                } else {
                  const { closingDate, dueDate } = getInvoiceDates(period.month, period.year, card.closingDay, card.dueDay);
                  transaction.set(invoiceRef, {
                    id: invoiceId,
                    userId: uid,
                    cardId: cleanTransactionData.cardId,
                    month: period.month,
                    year: period.year,
                    totalValue: cleanTransactionData.value,
                    paidValue: 0,
                    status: "open",
                    closingDate,
                    dueDate,
                    items: [generatedId],
                    createdAt: new Date().toISOString()
                  });
                }
              }

              // Update card usedLimit in Firestore
              transaction.update(cardRef, { 
                usedLimit: (card.usedLimit || 0) + cleanTransactionData.value 
              });
            } else {
              const transactionRef = doc(db, "transactions", generatedId);
              transaction.set(transactionRef, newTx);
            }
          } else {
            // Standard non-card transaction
            const transactionRef = doc(db, "transactions", generatedId);
            transaction.set(transactionRef, newTx);
          }
        });
      } catch (err) {
        console.warn("Notice: Transaction saved locally, Firestore background sync notice:", err);
      }
    }

    return newTx;
  },

  async deletarTransacao(transaction: Transaction) {
    // 1. Instant local removal
    try {
      const currentList = getStoredTransactions();
      const updatedList = currentList.filter(t => t.id !== transaction.id);
      saveStoredTransactions(updatedList);
    } catch (e) {
      console.warn("Error deleting transaction locally:", e);
    }

    // 2. Restore card limit if applicable
    if (transaction.cardId && transaction.type === "expense") {
      try {
        const cards = getStoredCards();
        const target = cards.find(c => c.id === transaction.cardId);
        if (target) {
          target.usedLimit = Math.max(0, (target.usedLimit || 0) - transaction.value);
          saveStoredCards([...cards]);
        }
      } catch (e) {}
    }

    // 3. Record in Global History
    recordHistory("deleted", transaction, `Exclusão de transação: ${transaction.title || transaction.category} (${transaction.value})`);

    // 4. Attempt Firestore deletion if authenticated
    if (auth.currentUser?.uid && !transaction.id.startsWith("tx_local_")) {
      try {
        const transactionRef = doc(db, "transactions", transaction.id);
        await deleteDoc(transactionRef);

        if (transaction.cardId && transaction.type === "expense") {
          const cardRef = doc(db, "cards", transaction.cardId);
          await updateDoc(cardRef, {
            usedLimit: increment(-transaction.value)
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("Notice: Transaction deleted locally, Firestore sync notice:", err);
      }
    }
  },

  async atualizarTransacao(transactionId: string, newData: Partial<Transaction>, oldData: Transaction) {
    const cleanNewData = cleanData(newData);
    const updatedTx = { ...oldData, ...cleanNewData, id: transactionId };

    // 1. Instant local update
    try {
      const currentList = getStoredTransactions();
      const updatedList = currentList.map(t => t.id === transactionId ? updatedTx : t);
      saveStoredTransactions(updatedList);
    } catch (e) {
      console.warn("Error updating transaction locally:", e);
    }

    // 2. Adjust card limit if value changed
    if (updatedTx.cardId && updatedTx.type === "expense" && typeof cleanNewData.value === "number") {
      const diff = cleanNewData.value - (oldData.value || 0);
      if (diff !== 0) {
        try {
          const cards = getStoredCards();
          const target = cards.find(c => c.id === updatedTx.cardId);
          if (target) {
            target.usedLimit = Math.max(0, (target.usedLimit || 0) + diff);
            saveStoredCards([...cards]);
          }
        } catch (e) {}
      }
    }

    // 3. Record in Global History
    recordHistory("edited", updatedTx, `Edição de transação: ${updatedTx.title || updatedTx.category}`);

    // 4. Attempt Firestore update if authenticated
    if (auth.currentUser?.uid && !transactionId.startsWith("tx_local_")) {
      try {
        const transactionRef = doc(db, "transactions", transactionId);
        await updateDoc(transactionRef, cleanNewData);
      } catch (err) {
        console.warn("Notice: Transaction updated locally, Firestore sync notice:", err);
      }
    }
  }
};
