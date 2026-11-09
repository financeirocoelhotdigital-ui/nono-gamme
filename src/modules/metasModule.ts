import { db } from "../lib/firebase";
import { collection, addDoc, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { Goal, GoalContribution } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { cleanData, parseCurrencyInput } from "../lib/utils";

export const metas = {
  async criarMeta(userId: string, data: Omit<Goal, 'id' | 'userId' | 'createdAt'>) {
    try {
      const targetVal = parseCurrencyInput(data.targetValue);
      const currentVal = parseCurrencyInput(data.currentValue);
      const autoPct = data.autoContributionPercentage != null ? parseCurrencyInput(data.autoContributionPercentage) : undefined;

      const cleanDataObj = cleanData({
        ...data,
        targetValue: targetVal,
        currentValue: currentVal,
        autoContributionPercentage: autoPct,
        status: data.status || "active",
        priority: data.priority || "media",
        category: data.category || "outros"
      });

      const docRef = await addDoc(collection(db, "goals"), {
        ...cleanDataObj,
        userId,
        createdAt: new Date().toISOString(),
        history: []
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "goals");
      return null;
    }
  },

  async atualizarMeta(id: string, data: Partial<Goal>) {
    try {
      const sanitized: any = { ...data };
      if (data.targetValue !== undefined) sanitized.targetValue = parseCurrencyInput(data.targetValue);
      if (data.currentValue !== undefined) sanitized.currentValue = parseCurrencyInput(data.currentValue);
      if (data.autoContributionPercentage !== undefined && data.autoContributionPercentage !== null) {
        sanitized.autoContributionPercentage = parseCurrencyInput(data.autoContributionPercentage);
      }
      const cleanDataObj = cleanData(sanitized);
      await updateDoc(doc(db, "goals", id), cleanDataObj);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${id}`);
      return false;
    }
  },

  async deletarMeta(id: string) {
    try {
      await deleteDoc(doc(db, "goals", id));
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `goals/${id}`);
      return false;
    }
  },

  async registrarAporte(goalId: string, contribution: Omit<GoalContribution, 'id'>) {
    try {
      const goalRef = doc(db, "goals", goalId);
      const goalSnap = await getDoc(goalRef);
      
      if (!goalSnap.exists()) return false;
      
      const goal = goalSnap.data() as Goal;
      const contribVal = parseCurrencyInput(contribution.value);
      const newContribution = cleanData({
        ...contribution,
        value: contribVal,
        id: Math.random().toString(36).substring(2, 9)
      }) as GoalContribution;

      const newCurrentValue = parseCurrencyInput(goal.currentValue) + contribVal;
      const targetVal = parseCurrencyInput(goal.targetValue);
      const isCompleted = targetVal > 0 && newCurrentValue >= targetVal;

      await updateDoc(goalRef, {
        currentValue: newCurrentValue,
        history: [...(goal.history || []), newContribution],
        status: isCompleted ? "completed" : (goal.status || "active")
      });

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `goals/${goalId}/contribution`);
      return false;
    }
  },

  // Calculate monthly savings needed to reach goal by deadline
  calculateMonthlyNeeded(goal: Goal) {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const diffTime = deadline.getTime() - now.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    
    const targetVal = parseCurrencyInput(goal.targetValue);
    const currentVal = parseCurrencyInput(goal.currentValue);
    const remaining = Math.max(0, targetVal - currentVal);

    if (diffMonths <= 0) return remaining;
    return remaining / diffMonths;
  },

  // Health indicator: green, yellow, red
  getGoalHealth(goal: Goal) {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const createdAt = new Date(goal.createdAt || Date.now());
    
    const totalTime = deadline.getTime() - createdAt.getTime();
    const elapsedTime = now.getTime() - createdAt.getTime();
    
    const targetVal = parseCurrencyInput(goal.targetValue);
    const currentVal = parseCurrencyInput(goal.currentValue);

    const timeProgress = totalTime > 0 ? Math.min(1, Math.max(0, elapsedTime / totalTime)) : 1;
    const financialProgress = targetVal > 0 ? Math.min(1, currentVal / targetVal) : 1;
    
    if (financialProgress >= timeProgress || currentVal >= targetVal) return "verde";
    if (financialProgress >= timeProgress * 0.7) return "amarelo";
    return "vermelho";
  },

  // Automatic re-planning if behind
  async replanejarMeta(goal: Goal) {
    return this.calculateMonthlyNeeded(goal);
  }
};
