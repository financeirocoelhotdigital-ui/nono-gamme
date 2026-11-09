import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Card } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { cartoes } from "../modules/cartoesModule";

interface CartoesContextType {
  cards: Card[];
  loading: boolean;
  addCard: (cardData: Omit<Card, "id">) => Promise<Card | null>;
  updateCard: (cardId: string, cardData: Partial<Card>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
}

const LOCAL_STORAGE_KEY = "finance_local_cards_v1";

const DEFAULT_INITIAL_CARDS: Card[] = [];

export function getStoredCards(): Card[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(c => c.id !== "card_nubank_default" && c.userId !== "default_user");
      }
    }
  } catch (e) {
    console.warn("Erro ao carregar cartões do localStorage:", e);
  }
  return [];
}

export function saveStoredCards(cards: Card[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
    window.dispatchEvent(new CustomEvent("local_cards_changed"));
  } catch (e) {
    console.warn("Erro ao salvar cartões no localStorage:", e);
  }
}

const CartoesContext = createContext<CartoesContextType | undefined>(undefined);

export function CartoesProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Card[]>(getStoredCards);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorage = () => {
      setCards(getStoredCards());
    };
    window.addEventListener("local_cards_changed", handleStorage);
    return () => window.removeEventListener("local_cards_changed", handleStorage);
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      if (user) {
        const q = query(
          collection(db, "cards"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const cardsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Card));
          setCards(cardsData);
          saveStoredCards(cardsData);
          setLoading(false);
        }, (err) => {
          console.warn("Erro no snapshot de cartões (usando cópia local):", err);
          setLoading(false);
        });
      } else {
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const addCard = async (cardData: Omit<Card, "id">): Promise<Card | null> => {
    const uid = auth.currentUser?.uid || "default_user";
    const newId = doc(collection(db, "cards")).id;
    const newCard: Card = {
      id: newId,
      ...cardData,
      userId: uid,
      createdAt: cardData.createdAt || new Date().toISOString()
    };

    setCards(prev => {
      const updated = [newCard, ...prev.filter(c => c.id !== newId)];
      saveStoredCards(updated);
      return updated;
    });

    try {
      await cartoes.criarCartao(uid, newCard);
    } catch (e) {
      console.warn("Aviso ao criar cartão no Firestore (preservado localmente):", e);
    }

    return newCard;
  };

  const updateCard = async (cardId: string, cardData: Partial<Card>) => {
    setCards(prev => {
      const updated = prev.map(c => c.id === cardId ? { ...c, ...cardData } : c);
      saveStoredCards(updated);
      return updated;
    });

    try {
      await cartoes.atualizarCartao(cardId, cardData);
    } catch (e) {
      console.warn("Aviso ao atualizar cartão no Firestore (preservado localmente):", e);
    }
  };

  const deleteCard = async (cardId: string) => {
    setCards(prev => {
      const updated = prev.filter(c => c.id !== cardId);
      saveStoredCards(updated);
      return updated;
    });

    try {
      await cartoes.deletarCartao(cardId);
    } catch (e) {
      console.warn("Aviso ao deletar cartão no Firestore (preservado localmente):", e);
    }
  };

  return (
    <CartoesContext.Provider value={{ cards, loading, addCard, updateCard, deleteCard }}>
      {children}
    </CartoesContext.Provider>
  );
}

export function useCartoes() {
  const context = useContext(CartoesContext);
  if (context === undefined) {
    throw new Error("useCartoes must be used within a CartoesProvider");
  }
  return context;
}

