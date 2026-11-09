import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import { Budget } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { cleanData, parseCurrencyInput } from "../lib/utils";

export const orcamento = {
  async criarOrcamento(userId: string, data: Omit<Budget, 'id'>) {
    try {
      const cleanPlanned = parseCurrencyInput(data.plannedValue);
      const cleanObj = cleanData({
        ...data,
        plannedValue: cleanPlanned,
        limit: cleanPlanned,
        category: data.categoryName || "Geral",
        categoryName: data.categoryName || "Geral",
        userId,
        createdAt: new Date().toISOString()
      });

      const docRef = await addDoc(collection(db, "budgets"), cleanObj);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "budgets");
      return null;
    }
  },

  async atualizarOrcamento(budgetId: string, data: Partial<Budget>) {
    try {
      const sanitized: any = { ...data };
      if (data.plannedValue !== undefined) {
        const cleanVal = parseCurrencyInput(data.plannedValue);
        sanitized.plannedValue = cleanVal;
        sanitized.limit = cleanVal;
      }
      if (data.categoryName) {
        sanitized.category = data.categoryName;
      }
      const cleanObj = cleanData(sanitized);
      const docRef = doc(db, "budgets", budgetId);
      await updateDoc(docRef, cleanObj);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `budgets/${budgetId}`);
      return false;
    }
  },

  async deletarOrcamento(budgetId: string) {
    try {
      await deleteDoc(doc(db, "budgets", budgetId));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `budgets/${budgetId}`);
      return false;
    }
  },

  async clonarOrcamentoMesAnterior(userId: string, currentMonth: number, currentYear: number) {
    try {
      let prevMonth = currentMonth - 1;
      let prevYear = currentYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }

      const q = query(
        collection(db, "budgets"),
        where("userId", "==", userId)
      );

      const snap = await getDocs(q);
      if (snap.empty) return false;

      const allBudgets = snap.docs.map(d => ({ id: d.id, ...d.data() } as Budget));
      const prevBudgets = allBudgets.filter(b => b.month === prevMonth && b.year === prevYear);
      if (prevBudgets.length === 0) return false;

      const hasCurrent = allBudgets.some(b => b.month === currentMonth && b.year === currentYear);
      if (hasCurrent) return false;

      const promises = prevBudgets.map(data => {
        const cleanPlanned = parseCurrencyInput(data.plannedValue);
        const newBudget = cleanData({
          userId,
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          category: data.categoryName || "Geral",
          plannedValue: cleanPlanned,
          limit: cleanPlanned,
          month: currentMonth,
          year: currentYear,
          createdAt: new Date().toISOString()
        });
        return addDoc(collection(db, "budgets"), newBudget);
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "budgets/clone");
      return false;
    }
  }
};
