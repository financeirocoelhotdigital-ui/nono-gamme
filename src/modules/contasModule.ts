import { db, auth } from "../lib/firebase";
import { doc, updateDoc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Account, Transaction } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { cleanData } from "../lib/utils";
import { getActiveUserId } from "../lib/authUtils";

export const contas = {
  async recalcularSaldo(accountId: string) {
    if (!accountId) return null;
    try {
      const accountRef = doc(db, "accounts", accountId);
      const accountSnap = await getDoc(accountRef);
      if (!accountSnap.exists()) return null;

      const account = accountSnap.data() as Account;
      const initialBalance = account.initialBalance || 0;

      // Fetch all transactions for this account
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", account.userId),
        where("accountId", "==", accountId)
      );
      
      const qTo = query(
        collection(db, "transactions"),
        where("userId", "==", account.userId),
        where("toAccountId", "==", accountId)
      );

      const [snap, snapTo] = await Promise.all([getDocs(q), getDocs(qTo)]);
      
      const transactionsMap = new Map<string, Transaction>();
      snap.docs.forEach(d => transactionsMap.set(d.id, { id: d.id, ...d.data() } as Transaction));
      snapTo.docs.forEach(d => transactionsMap.set(d.id, { id: d.id, ...d.data() } as Transaction));
      const transactions = Array.from(transactionsMap.values());

      // Calculate balance
      const balance = transactions.reduce((acc, t) => {
        if (t.type === "income") {
          return acc + t.value;
        } else if (t.type === "expense") {
          return acc - t.value;
        } else if (t.type === "transfer") {
          if (t.accountId === accountId) {
            return acc - t.value; // Sent
          } else if (t.toAccountId === accountId) {
            return acc + t.value; // Received
          }
        }
        return acc;
      }, initialBalance);

      await updateDoc(accountRef, { balance });
      return balance;
    } catch (error) {
      console.error(`Erro ao recalcular saldo para a conta ${accountId}:`, error);
      return null;
    }
  },
  
  async criarConta(userId: string, accountData: Omit<Account, 'id'> & { id?: string }) {
    const activeUid = auth.currentUser?.uid || userId || getActiveUserId();
    const accountRef = accountData.id ? doc(db, "accounts", accountData.id) : doc(collection(db, "accounts"));
    const cleanAccountData = cleanData(accountData);
    const newAccount = { ...cleanAccountData, id: accountRef.id, userId: activeUid };

    if (!auth.currentUser?.uid) {
      return newAccount;
    }

    try {
      await setDoc(accountRef, newAccount, { merge: true });
      return newAccount;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "accounts");
      return newAccount;
    }
  },

  async atualizarConta(accountId: string, accountData: Partial<Account>) {
    if (!auth.currentUser?.uid) return;
    try {
      const accountRef = doc(db, "accounts", accountId);
      const cleanAccountData = cleanData(accountData);
      await updateDoc(accountRef, cleanAccountData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${accountId}`);
    }
  },

  async deletarConta(accountId: string) {
    if (!auth.currentUser?.uid) return;
    try {
      const uid = auth.currentUser.uid;
      
      const q = query(collection(db, "transactions"), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      
      let hasTransactions = false;
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.accountId === accountId || data.toAccountId === accountId) {
          hasTransactions = true;
        }
      });
      
      if (hasTransactions) {
        throw new Error("Não é possível excluir uma conta que possui transações vinculadas.");
      }
      
      await deleteDoc(doc(db, "accounts", accountId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/${accountId}`);
      throw error;
    }
  },

  async definirComoPadrao(accountId: string, accounts: Account[]) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const targetAccount = accounts.find(acc => acc.id === accountId);
      const unsetPromises = accounts
        .filter(acc => acc.id !== accountId && acc.isDefault)
        .map(acc => updateDoc(doc(db, "accounts", acc.id), { isDefault: false }).catch(() => {}));

      // Also query Firestore in case any other remote doc had isDefault: true
      try {
        const qDefaults = query(
          collection(db, "accounts"),
          where("userId", "==", uid),
          where("isDefault", "==", true)
        );
        const snap = await getDocs(qDefaults);
        snap.docs.forEach(d => {
          if (d.id !== accountId) {
            unsetPromises.push(updateDoc(doc(db, "accounts", d.id), { isDefault: false }).catch(() => {}));
          }
        });
      } catch {}

      await Promise.allSettled(unsetPromises);

      const targetRef = doc(db, "accounts", accountId);
      try {
        await updateDoc(targetRef, { isDefault: true });
      } catch {
        if (targetAccount) {
          const cleanTarget = cleanData({ ...targetAccount, userId: uid, isDefault: true });
          await setDoc(targetRef, cleanTarget, { merge: true });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "accounts");
    }
  }
};

