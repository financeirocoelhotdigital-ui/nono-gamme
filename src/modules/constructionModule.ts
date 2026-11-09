import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { Construction, ConstructionStep } from "../types";
import { cleanData } from "../lib/utils";

export const constructionModule = {
  async getConstructions(wealthItemId: string, userId: string) {
    try {
      const q = query(
        collection(db, "constructions"),
        where("userId", "==", userId),
        where("wealthItemId", "==", wealthItemId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Construction));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "constructions");
      throw error;
    }
  },

  async startConstruction(construction: Omit<Construction, "id">) {
    try {
      const docRef = await addDoc(collection(db, "constructions"), cleanData({
        ...construction,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "constructions");
      throw error;
    }
  },

  async getConstruction(id: string) {
    try {
      const docSnap = await getDoc(doc(db, "constructions", id));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Construction;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `constructions/${id}`);
      throw error;
    }
  },

  async updateConstruction(id: string, updates: Partial<Construction>) {
    try {
      const docRef = doc(db, "constructions", id);
      await updateDoc(docRef, cleanData({
        ...updates,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `constructions/${id}`);
      throw error;
    }
  },

  async getSteps(constructionId: string, userId: string) {
    try {
      const q = query(
        collection(db, "constructionSteps"),
        where("userId", "==", userId),
        where("constructionId", "==", constructionId),
        orderBy("date", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConstructionStep));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "constructionSteps");
      throw error;
    }
  },

  async addStep(step: Omit<ConstructionStep, "id">) {
    try {
      const docRef = await addDoc(collection(db, "constructionSteps"), cleanData({
        ...step,
        createdAt: new Date().toISOString()
      }));
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "constructionSteps");
      throw error;
    }
  },

  async updateStep(id: string, updates: Partial<ConstructionStep>) {
    try {
      const docRef = doc(db, "constructionSteps", id);
      await updateDoc(docRef, cleanData(updates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `constructionSteps/${id}`);
      throw error;
    }
  },

  async deleteStep(id: string) {
    try {
      const docRef = doc(db, "constructionSteps", id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `constructionSteps/${id}`);
      throw error;
    }
  }
};
