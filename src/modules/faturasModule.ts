import { db, auth } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Invoice, InvoiceStatus, Card, Account, Transaction } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { getStoredInvoices, saveStoredInvoices } from "../context/FaturasContext";
import { getStoredCards, saveStoredCards } from "../context/CartoesContext";
import { getStoredAccounts, saveStoredAccounts } from "../context/ContasContext";
import { getStoredTransactions, saveStoredTransactions } from "../context/TransacoesContext";

export const faturas = {
  async adicionarItemFatura(cardId: string, month: number, year: number, amount: number) {
    if (!cardId) return;

    // 1. Update local invoice
    try {
      const stored = getStoredInvoices();
      const invoiceId = `${cardId}_${year}_${month}`;
      const existing = stored.find(i => i.id === invoiceId);
      if (existing) {
        existing.totalValue = (existing.totalValue || 0) + amount;
        saveStoredInvoices([...stored]);
      }
    } catch (e) {
      console.warn("Notice: Local invoice update warning:", e);
    }
    
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, 
        where("userId", "==", uid),
        where("cardId", "==", cardId),
        where("month", "==", month),
        where("year", "==", year)
      );
      
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const invoiceDoc = snap.docs[0];
        await updateDoc(doc(db, "invoices", invoiceDoc.id), {
          totalValue: increment(amount)
        });
      } else {
        const cardRef = doc(db, "cards", cardId);
        const cardSnap = await getDoc(cardRef);
        const cardData = cardSnap.exists() ? cardSnap.data() : null;
        
        const closingDay = cardData?.closingDay || 1;
        const dueDay = cardData?.dueDay || 10;

        const closingDate = new Date(year, month, closingDay).toISOString();
        const dueDate = new Date(year, month, dueDay).toISOString();

        const invoiceId = `${cardId}_${year}_${month}`;
        const newInvoice: Invoice = {
          id: invoiceId,
          userId: uid,
          cardId,
          month,
          year,
          totalValue: amount,
          paidValue: 0,
          status: 'open',
          closingDate,
          dueDate,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, "invoices", invoiceId), newInvoice);
      }
    } catch (error) {
      console.warn("Notice: Firestore invoice sync warning:", error);
    }
  },

  async atualizarStatusFatura(invoiceId: string, status: InvoiceStatus) {
    try {
      const stored = getStoredInvoices();
      const updated = stored.map(i => i.id === invoiceId ? { ...i, status } : i);
      saveStoredInvoices(updated);
    } catch (e) {}

    try {
      if (auth.currentUser) {
        const invoiceRef = doc(db, "invoices", invoiceId);
        await updateDoc(invoiceRef, { status });
      }
    } catch (error) {
      console.warn("Notice: Firestore atualizarStatusFatura warning:", error);
    }
  },

  async pagarFatura(invoiceId: string, accountId: string, amount: number): Promise<boolean> {
    if (!invoiceId || !accountId || amount <= 0) return false;

    const uid = auth.currentUser?.uid || "default_user";

    // 1. Instant local persistence for invoice, card limit, account balance, and payment transaction
    try {
      const storedInvoices = getStoredInvoices();
      const targetInvoice = storedInvoices.find(i => i.id === invoiceId);

      if (targetInvoice) {
        const currentPaid = targetInvoice.paidValue || 0;
        const newPaid = currentPaid + amount;
        targetInvoice.paidValue = newPaid;
        targetInvoice.status = newPaid >= targetInvoice.totalValue ? "paid" : "partial";
        saveStoredInvoices([...storedInvoices]);

        // Restore card limit locally
        const storedCards = getStoredCards();
        const targetCard = storedCards.find(c => c.id === targetInvoice.cardId);
        if (targetCard) {
          targetCard.usedLimit = Math.max(0, (targetCard.usedLimit || 0) - amount);
          saveStoredCards([...storedCards]);
        }
      }

      // Deduct account balance locally
      const storedAccounts = getStoredAccounts();
      const targetAccount = storedAccounts.find(a => a.id === accountId);
      if (targetAccount) {
        targetAccount.balance = (targetAccount.balance || 0) - amount;
        saveStoredAccounts([...storedAccounts]);
      }

      // Create transaction record locally
      const paymentTx: Transaction = {
        id: `tx_pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: uid,
        value: amount,
        type: "expense",
        title: "Pagamento de Fatura",
        category: "Pagamento de Fatura",
        date: new Date().toISOString(),
        accountId,
        cardId: targetInvoice?.cardId,
        invoiceId,
        notes: `Pagamento de fatura ${targetInvoice ? `${targetInvoice.month + 1}/${targetInvoice.year}` : ""}`,
        createdAt: new Date().toISOString(),
        emotion: "neutro"
      };
      const storedTx = getStoredTransactions();
      saveStoredTransactions([paymentTx, ...storedTx]);
    } catch (localErr) {
      console.warn("Notice: Local invoice payment update warning:", localErr);
    }

    // 2. Synchronize to Firestore if authenticated
    if (auth.currentUser?.uid) {
      try {
        const { runTransaction } = await import("firebase/firestore");
        await runTransaction(db, async (transaction) => {
          const invoiceRef = doc(db, "invoices", invoiceId);
          const invoiceSnap = await transaction.get(invoiceRef);
          
          let cardIdToUse = "";
          let totalVal = amount;

          if (invoiceSnap.exists()) {
            const invoice = invoiceSnap.data() as Invoice;
            cardIdToUse = invoice.cardId;
            totalVal = invoice.totalValue;
            const currentPaid = invoice.paidValue || 0;
            const newPaidValue = currentPaid + amount;
            const newStatus: InvoiceStatus = newPaidValue >= totalVal ? "paid" : "partial";

            transaction.update(invoiceRef, {
              paidValue: newPaidValue,
              status: newStatus
            });
          }

          const accountRef = doc(db, "accounts", accountId);
          const accountSnap = await transaction.get(accountRef);
          if (accountSnap.exists()) {
            transaction.update(accountRef, {
              balance: increment(-amount)
            });
          }

          if (cardIdToUse) {
            const cardRef = doc(db, "cards", cardIdToUse);
            const cardSnap = await transaction.get(cardRef);
            if (cardSnap.exists()) {
              const currentUsed = cardSnap.data().usedLimit || 0;
              transaction.update(cardRef, {
                usedLimit: Math.max(0, currentUsed - amount)
              });
            }
          }

          // Register transaction in Firestore
          const transRef = doc(collection(db, "transactions"));
          transaction.set(transRef, {
            id: transRef.id,
            userId: uid,
            value: amount,
            type: "expense",
            title: "Pagamento de Fatura",
            category: "Pagamento de Fatura",
            date: new Date().toISOString(),
            accountId,
            cardId: cardIdToUse,
            invoiceId,
            notes: `Pagamento de fatura`,
            createdAt: new Date().toISOString()
          });
        });
      } catch (err) {
        console.warn("Notice: Firestore invoice payment sync pending:", err);
      }
    }

    return true;
  }
};
