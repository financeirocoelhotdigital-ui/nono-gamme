import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Receivable } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, setDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getActiveUserId } from "../lib/authUtils";
import { cleanData } from "../lib/utils";

const LOCAL_STORAGE_KEY = "finance_local_receivables_v1";

function getReceivableFingerprint(r: Receivable): string {
  return [
    (r.personName || "").trim().toLowerCase(),
    Number(r.totalValue || 0).toFixed(2),
    r.loanDate || "",
    r.dueDate || ""
  ].join("|");
}

export function dedupeReceivables(items: Receivable[]): Receivable[] {
  const byId = new Map<string, Receivable>();
  for (const item of items) {
    if (!item || !item.id) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
    }
  }

  const all = Array.from(byId.values());
  const remoteFingerprints = new Set(
    all
      .filter(r => !r.id.startsWith("rec_"))
      .map(getReceivableFingerprint)
  );

  const seenOfflineFingerprints = new Set<string>();
  const result: Receivable[] = [];

  for (const item of all) {
    if (item.id.startsWith("rec_")) {
      const fp = getReceivableFingerprint(item);
      if (remoteFingerprints.has(fp) || seenOfflineFingerprints.has(fp)) {
        continue;
      }
      seenOfflineFingerprints.add(fp);
    }
    result.push(item);
  }

  result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return result;
}

export function getStoredReceivables(): Receivable[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return dedupeReceivables(parsed);
    }
  } catch (e) {
    console.warn("Erro ao carregar recebíveis locais:", e);
  }
  return [];
}

export function saveStoredReceivables(items: Receivable[]) {
  try {
    const cleanItems = dedupeReceivables(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanItems));
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
  const pendingIdsRef = useRef<Set<string>>(new Set());

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
          const remoteMap = new Map<string, Receivable>();
          snapshot.docs.forEach(docSnap => {
            remoteMap.set(docSnap.id, {
              id: docSnap.id,
              ...docSnap.data()
            } as Receivable);
            pendingIdsRef.current.delete(docSnap.id);
          });

          const remoteData = Array.from(remoteMap.values());
          const remoteFingerprints = new Set(remoteData.map(getReceivableFingerprint));
          const localList = getStoredReceivables();
          const mergedMap = new Map<string, Receivable>();

          for (const remoteItem of remoteData) {
            mergedMap.set(remoteItem.id, remoteItem);
          }

          for (const item of localList) {
            if (mergedMap.has(item.id)) continue;
            const belongsToUser = item.userId === user.uid || !item.userId || item.userId === "default_user";
            if (!belongsToUser) continue;

            if (pendingIdsRef.current.has(item.id)) {
              mergedMap.set(item.id, { ...item, userId: user.uid });
            } else if (item.id.startsWith("rec_") && !remoteFingerprints.has(getReceivableFingerprint(item))) {
              mergedMap.set(item.id, { ...item, userId: user.uid });
            }
          }

          const merged = dedupeReceivables(Array.from(mergedMap.values()));
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
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || getActiveUserId();
    const nowIso = new Date().toISOString();
    const cleanedItem = cleanData(item);

    const docId = firebaseUser
      ? doc(collection(db, "receivables")).id
      : `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newReceivable: Receivable = {
      ...cleanedItem,
      id: docId,
      userId: uid,
      createdAt: nowIso
    };

    if (firebaseUser) {
      pendingIdsRef.current.add(docId);
    }

    const currentList = getStoredReceivables();
    const updatedList = dedupeReceivables([newReceivable, ...currentList.filter(r => r.id !== docId)]);
    saveStoredReceivables(updatedList);
    setReceivables(updatedList);

    if (firebaseUser) {
      try {
        const firestorePayload = cleanData({
          ...cleanedItem,
          userId: firebaseUser.uid,
          createdAt: nowIso
        });
        await setDoc(doc(db, "receivables", docId), firestorePayload);
        return docId;
      } catch (err) {
        pendingIdsRef.current.delete(docId);
        console.warn("Notice: receivable saved locally, Firestore sync notice:", err);
      }
    }

    return docId;
  };

  const updateReceivable = async (id: string, updates: Partial<Receivable>) => {
    const cleanedUpdates = cleanData(updates);
    const currentList = getStoredReceivables();
    const updatedList = currentList.map(r => r.id === id ? { ...r, ...cleanedUpdates } : r);
    saveStoredReceivables(updatedList);
    setReceivables(updatedList);

    if (auth.currentUser && !id.startsWith("rec_")) {
      try {
        await updateDoc(doc(db, "receivables", id), cleanedUpdates);
      } catch (err) {
        console.warn("Notice: Firestore updateReceivable notice:", err);
      }
    }
  };

  const deleteReceivable = async (id: string) => {
    pendingIdsRef.current.delete(id);
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
