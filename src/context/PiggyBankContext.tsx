import React, { createContext, useContext, useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { PiggyBank } from "../types";
import { piggyBankModule } from "../modules/piggyBankModule";
import { getActiveUserId } from "../lib/authUtils";

const LOCAL_STORAGE_KEY = "finance_local_piggy_banks_v1";

export function getStoredPiggyBanks(): PiggyBank[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar cofrinhos locais:", e);
  }
  return [];
}

export function saveStoredPiggyBanks(items: PiggyBank[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_piggy_banks_changed"));
  } catch (e) {
    console.warn("Erro ao salvar cofrinhos locais:", e);
  }
}

interface PiggyBankContextType {
  piggyBanks: PiggyBank[];
  loading: boolean;
  createPiggyBank: (data: Omit<PiggyBank, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'history'>) => Promise<string | null>;
  updatePiggyBank: (id: string, data: Partial<PiggyBank>) => Promise<boolean>;
  deletePiggyBank: (id: string) => Promise<boolean>;
  addMoney: (piggyBankId: string, value: number, accountId?: string, description?: string) => Promise<boolean>;
  withdrawMoney: (piggyBankId: string, value: number, accountId?: string, description?: string) => Promise<boolean>;
}

const PiggyBankContext = createContext<PiggyBankContextType | undefined>(undefined);

export function PiggyBankProvider({ children }: { children: React.ReactNode }) {
  const [piggyBanks, setPiggyBanks] = useState<PiggyBank[]>(getStoredPiggyBanks);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setPiggyBanks(getStoredPiggyBanks());
    };
    window.addEventListener("local_piggy_banks_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_piggy_banks_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribe) unsubscribe();

      if (user) {
        const q = query(
          collection(db, "piggyBanks"),
          where("userId", "==", user.uid)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const banks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PiggyBank[];

          const localList = getStoredPiggyBanks();
          const merged = [...banks];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

          setPiggyBanks(merged);
          saveStoredPiggyBanks(merged);
          setLoading(false);
        }, (err) => {
          console.warn("Notice: piggyBanks snapshot warning (using local):", err);
          setPiggyBanks(getStoredPiggyBanks());
          setLoading(false);
        });
      } else {
        setPiggyBanks(getStoredPiggyBanks());
        setLoading(false);
        unsubscribe = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const createPiggyBank = async (data: Omit<PiggyBank, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'history'>) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `piggy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newPiggy: PiggyBank = {
      ...data,
      id: tempId,
      userId: uid,
      currentValue: data.currentValue || 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      history: []
    };

    const currentList = getStoredPiggyBanks();
    const updatedList = [newPiggy, ...currentList.filter(p => p.id !== tempId)];
    saveStoredPiggyBanks(updatedList);
    setPiggyBanks(updatedList);

    if (auth.currentUser) {
      try {
        const firestoreId = await piggyBankModule.criarCofrinho(auth.currentUser.uid, data);
        if (firestoreId && firestoreId !== tempId) {
          const syncedList = getStoredPiggyBanks().map(p => p.id === tempId ? { ...p, id: firestoreId, userId: auth.currentUser!.uid } : p);
          saveStoredPiggyBanks(syncedList);
          setPiggyBanks(syncedList);
          return firestoreId;
        }
      } catch (e) {
        console.warn("Notice: piggy bank saved locally, Firestore sync notice:", e);
      }
    }

    return tempId;
  };

  const updatePiggyBank = async (id: string, data: Partial<PiggyBank>) => {
    const currentList = getStoredPiggyBanks();
    const updatedList = currentList.map(p => p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p);
    saveStoredPiggyBanks(updatedList);
    setPiggyBanks(updatedList);

    if (auth.currentUser && !id.startsWith("piggy_")) {
      try {
        return await piggyBankModule.atualizarCofrinho(id, data);
      } catch (e) {
        console.warn("Notice: Firestore update piggy bank notice:", e);
      }
    }
    return true;
  };

  const deletePiggyBank = async (id: string) => {
    const currentList = getStoredPiggyBanks();
    const updatedList = currentList.filter(p => p.id !== id);
    saveStoredPiggyBanks(updatedList);
    setPiggyBanks(updatedList);

    if (auth.currentUser && !id.startsWith("piggy_")) {
      try {
        return await piggyBankModule.deletarCofrinho(id);
      } catch (e) {
        console.warn("Notice: Firestore delete piggy bank notice:", e);
      }
    }
    return true;
  };

  const addMoney = async (piggyBankId: string, value: number, accountId?: string, description?: string) => {
    const currentList = getStoredPiggyBanks();
    const target = currentList.find(p => p.id === piggyBankId);
    if (target) {
      const updatedValue = (target.currentValue || 0) + value;
      const historyEntry = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        value,
        type: 'in' as const,
        date: new Date().toISOString(),
        description: description || "Depósito no Cofrinho"
      };
      const updatedList = currentList.map(p => p.id === piggyBankId ? {
        ...p,
        currentValue: updatedValue,
        status: updatedValue >= p.targetValue ? ('completed' as const) : p.status,
        history: [historyEntry, ...(p.history || [])],
        updatedAt: new Date().toISOString()
      } : p);
      saveStoredPiggyBanks(updatedList);
      setPiggyBanks(updatedList);
    }

    if (auth.currentUser && !piggyBankId.startsWith("piggy_")) {
      try {
        return await piggyBankModule.adicionarDinheiro(piggyBankId, value, accountId, description);
      } catch (e) {
        console.warn("Notice: Firestore add money piggy notice:", e);
      }
    }
    return true;
  };

  const withdrawMoney = async (piggyBankId: string, value: number, accountId?: string, description?: string) => {
    const currentList = getStoredPiggyBanks();
    const target = currentList.find(p => p.id === piggyBankId);
    if (target) {
      const updatedValue = Math.max(0, (target.currentValue || 0) - value);
      const historyEntry = {
        id: `ph_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        value,
        type: 'out' as const,
        date: new Date().toISOString(),
        description: description || "Resgate do Cofrinho"
      };
      const updatedList = currentList.map(p => p.id === piggyBankId ? {
        ...p,
        currentValue: updatedValue,
        history: [historyEntry, ...(p.history || [])],
        updatedAt: new Date().toISOString()
      } : p);
      saveStoredPiggyBanks(updatedList);
      setPiggyBanks(updatedList);
    }

    if (auth.currentUser && !piggyBankId.startsWith("piggy_")) {
      try {
        return await piggyBankModule.retirarDinheiro(piggyBankId, value, accountId, description);
      } catch (e) {
        console.warn("Notice: Firestore withdraw piggy notice:", e);
      }
    }
    return true;
  };

  return (
    <PiggyBankContext.Provider value={{
      piggyBanks,
      loading,
      createPiggyBank,
      updatePiggyBank,
      deletePiggyBank,
      addMoney,
      withdrawMoney
    }}>
      {children}
    </PiggyBankContext.Provider>
  );
}

export function usePiggyBanks() {
  const context = useContext(PiggyBankContext);
  if (context === undefined) {
    throw new Error("usePiggyBanks must be used within a PiggyBankProvider");
  }
  return context;
}
