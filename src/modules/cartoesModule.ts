import { db, auth } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc, setDoc, deleteDoc, collection } from "firebase/firestore";
import { Card } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { cleanData } from "../lib/utils";

export const cartoes = {
  async adicionarCompraCartao(cardId: string, amount: number) {
    if (!cardId) return;
    const cardRef = doc(db, "cards", cardId);
    try {
      await updateDoc(cardRef, {
        usedLimit: increment(amount)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cards/${cardId}`);
    }
  },

  async atualizarLimiteCartao(cardId: string, newLimit: number) {
    if (!cardId) return;
    const cardRef = doc(db, "cards", cardId);
    try {
      await updateDoc(cardRef, {
        limit: newLimit
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cards/${cardId}`);
    }
  },

  async criarCartao(userId: string, cardData: Omit<Card, 'id'>) {
    try {
      const cardRef = doc(collection(db, "cards"));
      const cleanCardData = cleanData(cardData);
      const newCard = { ...cleanCardData, id: cardRef.id, userId };
      await setDoc(cardRef, newCard);
      return newCard;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "cards");
      return null;
    }
  },

  async atualizarCartao(cardId: string, cardData: Partial<Card>) {
    try {
      const cardRef = doc(db, "cards", cardId);
      const cleanCardData = cleanData(cardData);
      await updateDoc(cardRef, cleanCardData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `cards/${cardId}`);
    }
  },

  async deletarCartao(cardId: string) {
    try {
      await deleteDoc(doc(db, "cards", cardId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `cards/${cardId}`);
    }
  }
};
