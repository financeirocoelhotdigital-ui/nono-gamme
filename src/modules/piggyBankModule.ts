import { db, auth } from "../lib/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, getDoc, runTransaction } from "firebase/firestore";
import { PiggyBank, PiggyBankHistory, Transaction, Account } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { cleanData } from "../lib/utils";
import { contas } from "./contasModule";

export const piggyBankModule = {
  async criarCofrinho(userId: string, data: Omit<PiggyBank, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'history'>) {
    try {
      const cleanDataObj = cleanData(data);
      const docRef = await addDoc(collection(db, "piggyBanks"), {
        ...cleanDataObj,
        userId,
        currentValue: 0,
        status: "active",
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error("FIREBASE ERROR CREATE PIGGY:", error); handleFirestoreError(error, OperationType.CREATE, "piggyBanks");
      return null;
    }
  },

  async atualizarCofrinho(id: string, data: Partial<PiggyBank>) {
    try {
      const cleanDataObj = cleanData(data);
      await updateDoc(doc(db, "piggyBanks", id), {
        ...cleanDataObj,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `piggyBanks/${id}`);
      return false;
    }
  },

  async deletarCofrinho(id: string) {
    try {
      await deleteDoc(doc(db, "piggyBanks", id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `piggyBanks/${id}`);
      return false;
    }
  },

  async adicionarDinheiro(piggyBankId: string, value: number, accountId?: string, description?: string) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return false;

      await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST
        const piggyBankRef = doc(db, "piggyBanks", piggyBankId);
        const piggyBankSnap = await transaction.get(piggyBankRef);
        if (!piggyBankSnap.exists()) throw new Error("Cofrinho não encontrado");

        let accountSnap: any = null;
        let accountRef: any = null;
        if (accountId) {
          accountRef = doc(db, "accounts", accountId);
          accountSnap = await transaction.get(accountRef);
          if (!accountSnap.exists()) throw new Error("Conta não encontrada");
          const account = accountSnap.data() as Account;
          if (account.balance < value) throw new Error("Saldo insuficiente na conta");
        }

        // 2. ALL WRITES NEXT
        const piggyBank = piggyBankSnap.data() as PiggyBank;
        const newHistoryItem: PiggyBankHistory = {
          id: Math.random().toString(36).substr(2, 9),
          type: "in",
          value,
          date: new Date().toISOString(),
          description: description || "Depósito no cofrinho",
          accountId
        };

        const newCurrentValue = (piggyBank.currentValue || 0) + value;
        const isCompleted = newCurrentValue >= piggyBank.targetValue;

        transaction.update(piggyBankRef, {
          currentValue: newCurrentValue,
          status: isCompleted ? "completed" : "active",
          history: [...(piggyBank.history || []), newHistoryItem],
          updatedAt: new Date().toISOString()
        });

        if (accountId) {
          const transactionRef = doc(collection(db, "transactions"));
          const mainTransaction: Omit<Transaction, 'id'> = {
            userId: uid,
            title: `Depósito: ${piggyBank.name}`,
            value,
            type: "transfer",
            category: "Cofrinho",
            date: new Date().toISOString(),
            accountId,
            notes: `Transferência para o cofrinho: ${piggyBank.name}`,
            emotion: "feliz",
            createdAt: new Date().toISOString()
          };

          transaction.set(transactionRef, { ...mainTransaction, id: transactionRef.id });
        }
      });

      if (accountId) {
        await contas.recalcularSaldo(accountId);
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `piggyBanks/${piggyBankId}/add`);
      return false;
    }
  },

  async retirarDinheiro(piggyBankId: string, value: number, accountId?: string, description?: string) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return false;

      await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST
        const piggyBankRef = doc(db, "piggyBanks", piggyBankId);
        const piggyBankSnap = await transaction.get(piggyBankRef);
        if (!piggyBankSnap.exists()) throw new Error("Cofrinho não encontrado");

        const piggyBank = piggyBankSnap.data() as PiggyBank;
        if ((piggyBank.currentValue || 0) < value) throw new Error("Saldo insuficiente no cofrinho");

        let accountSnap: any = null;
        let accountRef: any = null;
        if (accountId) {
          accountRef = doc(db, "accounts", accountId);
          accountSnap = await transaction.get(accountRef);
          if (!accountSnap.exists()) throw new Error("Conta não encontrada");
        }

        // 2. ALL WRITES NEXT
        const newHistoryItem: PiggyBankHistory = {
          id: Math.random().toString(36).substr(2, 9),
          type: "out",
          value,
          date: new Date().toISOString(),
          description: description || "Retirada do cofrinho",
          accountId
        };

        const newCurrentValue = (piggyBank.currentValue || 0) - value;

        transaction.update(piggyBankRef, {
          currentValue: newCurrentValue,
          status: "active",
          history: [...(piggyBank.history || []), newHistoryItem],
          updatedAt: new Date().toISOString()
        });

        if (accountId) {
          const transactionRef = doc(collection(db, "transactions"));
          const mainTransaction: Omit<Transaction, 'id'> = {
            userId: uid,
            title: `Resgate: ${piggyBank.name}`,
            value,
            type: "transfer",
            category: "Cofrinho",
            date: new Date().toISOString(),
            accountId,
            notes: `Resgate do cofrinho: ${piggyBank.name}`,
            emotion: "feliz",
            createdAt: new Date().toISOString()
          };

          transaction.set(transactionRef, { ...mainTransaction, id: transactionRef.id });
        }
      });

      if (accountId) {
        await contas.recalcularSaldo(accountId);
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `piggyBanks/${piggyBankId}/withdraw`);
      return false;
    }
  }
};
