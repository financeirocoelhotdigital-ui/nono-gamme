import { collection, addDoc, serverTimestamp, doc, updateDoc, Transaction as FirestoreTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Transaction, TransactionHistory } from "../types";

export const logTransactionHistory = async (
  userId: string,
  transactionId: string,
  action: "created" | "edited" | "deleted" | "restored",
  module: string,
  oldData?: Partial<Transaction>,
  newData?: Partial<Transaction>,
  description?: string,
  transaction?: FirestoreTransaction
) => {
  const historyRef = collection(db, "transactionHistory");
  const changes: TransactionHistory["changes"] = [];

  if (action === "edited" && oldData && newData) {
    const fieldsToCompare: (keyof Transaction)[] = [
      "title",
      "value",
      "date",
      "accountId",
      "toAccountId",
      "category",
      "subCategory",
      "notes",
      "emotion"
    ];

    fieldsToCompare.forEach((field) => {
      if (oldData[field] !== newData[field]) {
        changes.push({
          field: String(field),
          oldValue: oldData[field],
          newValue: newData[field],
          description: `${field} alterado de ${oldData[field]} para ${newData[field]}`
        });
      }
    });
  }

  const historyData = {
    userId,
    transactionId,
    action,
    date: new Date().toISOString(),
    changes: changes.length > 0 ? changes : null,
    description: description || (action === "created" ? "Transação criada" : action === "edited" ? "Transação editada" : "Transação excluída"),
    module,
    createdAt: serverTimestamp()
  };

  if (transaction) {
    const newHistoryRef = doc(historyRef);
    transaction.set(newHistoryRef, historyData);
    // Update the transaction to indicate it has history
    const transRef = doc(db, "transactions", transactionId);
    transaction.update(transRef, { hasHistory: true });
  } else {
    await addDoc(historyRef, historyData);
    const transRef = doc(db, "transactions", transactionId);
    await updateDoc(transRef, { hasHistory: true });
  }
};
