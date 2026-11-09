import { db, auth } from "../lib/firebase";
import { doc, setDoc, collection, addDoc, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { TransactionHistory } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";

export const historico = {
  async registrarAlteracao(userId: string, historyData: Omit<TransactionHistory, 'id'>) {
    try {
      const historyRef = doc(collection(db, "transactionHistory"));
      const newHistory = { ...historyData, id: historyRef.id, userId };
      await setDoc(historyRef, newHistory);
      return newHistory;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "transactionHistory");
      return null;
    }
  },

  async buscarHistoricoPorTransacao(transactionId: string) {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return [];
      const historyRef = collection(db, "transactionHistory");
      const q = query(historyRef, 
        where("userId", "==", uid),
        where("transactionId", "==", transactionId),
        orderBy("timestamp", "desc")
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionHistory));
    } catch (error) {
      console.warn("Could not fetch transaction history:", error);
      return [];
    }
  },

  async buscarHistoricoRecente(userId: string, limitCount: number = 50) {
    try {
      const historyRef = collection(db, "transactionHistory");
      const q = query(historyRef, 
        where("userId", "==", userId),
        orderBy("timestamp", "desc"),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionHistory));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "transactionHistory");
      return [];
    }
  }
};
