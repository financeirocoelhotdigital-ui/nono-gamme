import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { Investment, InvestmentContribution } from "../types";

export const investmentModule = {
  async addInvestment(investment: Omit<Investment, "id">) {
    try {
      const docRef = await addDoc(collection(db, "investments"), {
        ...investment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "investments");
      throw error;
    }
  },

  async updateInvestment(id: string, investment: Partial<Investment>) {
    try {
      await updateDoc(doc(db, "investments", id), {
        ...investment,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `investments/${id}`);
      throw error;
    }
  },

  async deleteInvestment(id: string) {
    try {
      await deleteDoc(doc(db, "investments", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `investments/${id}`);
      throw error;
    }
  },

  async addContribution(contribution: Omit<InvestmentContribution, "id">) {
    try {
      const docRef = await addDoc(collection(db, "investment_contributions"), {
        ...contribution,
        createdAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "investment_contributions");
      throw error;
    }
  }
};
