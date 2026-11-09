import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Receivable } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getActiveUserId } from "../lib/authUtils";

const LOCAL_STORAGE_KEY = "finance_local_receivables_v1";

export function getStoredReceivables(): Receivable[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar recebíveis locais:", e);
  }
  return [];
}

export function saveStoredReceivables(items: Receivable[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_receivables_changed"));
  } catch (e) {
    console.warn("Erro ao salvar recebíveis locais:", e);
  }
}

interface ReceivablesContextType {
  receivables: Receivable[];
  loading: boolean;
  addReceivable: (item: Omit<Receivable, "id" | "userId" | "createdAt">) => Promise<string>;
  updateReceivable: (id: string, updates: Partial<Receivable>) => Promise<void>;
  deleteReceivable: (id: string) => Promise<void>;
}

const ReceivablesContext = createContext<ReceivablesContextType | undefined>(undefined);

export function ReceivablesProvider({ children }: { children: ReactNode }) {
  const [receivables, setReceivables] = useState<Receivable[]>(getStoredReceivables);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setReceivables(getStoredReceivables());
    };
    window.addEventListener("local_receivables_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_receivables_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) unsubscribeSnapshot();

      if (user) {
        // Query by userId only, avoiding composite index requirements
        const q = query(
          collection(db, "receivables"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const remoteData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Receivable));

          const localList = getStoredReceivables();
          const merged = [...remoteData];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          setReceivables(merged);
          saveStoredReceivables(merged);
          setLoading(false);
        }, (error) => {
          console.warn("Notice: receivables snapshot warning (using local):", error);
          setReceivables(getStoredReceivables());
          setLoading(false);
        });
      } else {
        setReceivables(getStoredReceivables());
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const addReceivable = async (item: Omit<Receivable, "id" | "userId" | "createdAt">): Promise<string> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newReceivable: Receivable = {
      ...item,
      id: tempId,
      userId: uid,
      createdAt: nowIso
    };

    const currentList = getStoredReceivables();
    const updatedList = [newReceivable, ...currentList.filter(r => r.id !== tempId)];
    saveStoredReceivables(updatedList);
    setReceivables(updatedList);

    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, "receivables"), {
          ...item,
          userId: auth.currentUser.uid,
          createdAt: nowIso
        });
        const firestoreId = docRef.id;
        const syncedList = getStoredReceivables().map(r => r.id === tempId ? { ...r, id: firestoreId, userId: auth.currentUser!.uid } : r);
        saveStoredReceivables(syncedList);
        setReceivables(syncedList);
        return firestoreId;
      } catch (err) {
        console.warn("Notice: receivable saved locally, Firestore sync notice:", err);
      }
    }

    return tempId;
  };

  const updateReceivable = async (id: string, updates: Partial<Receivable>) => {
    const currentList = getStoredReceivables();
    const updatedList = currentList.map(r => r.id === id ? { ...r, ...updates } : r);
    saveStoredReceivables(updatedList);
    setReceivables(updatedList);

    if (auth.currentUser && !id.startsWith("rec_")) {
      try {
        await updateDoc(doc(db, "receivables", id), updates);
      } catch (err) {
        console.warn("Notice: Firestore updateReceivable notice:", err);
      }
    }
  };

  const deleteReceivable = async (id: string) => {
    const currentList = getStoredReceivables();
    const updatedList = currentList.filter(r => r.id !== id);
    saveStoredReceivables(updatedList);
    setReceivables(updatedList);

    if (auth.currentUser && !id.startsWith("rec_")) {
      try {
        await deleteDoc(doc(db, "receivables", id));
      } catch (err) {
        console.warn("Notice: Firestore deleteReceivable notice:", err);
      }
    }
  };

  return (
    <ReceivablesContext.Provider value={{ receivables, loading, addReceivable, updateReceivable, deleteReceivable }}>
      {children}
    </ReceivablesContext.Provider>
  );
}

export function useReceivables() {
  const context = useContext(ReceivablesContext);
  if (context === undefined) {
    throw new Error("useReceivables must be used within a ReceivablesProvider");
  }
  return context;
}
