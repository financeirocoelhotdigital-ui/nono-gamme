import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { db, auth } from "../lib/firebase";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { PiggyBank } from "../types";
import { piggyBankModule } from "../modules/piggyBankModule";
import { getActiveUserId } from "../lib/authUtils";
import { cleanData } from "../lib/utils";

const LOCAL_STORAGE_KEY = "finance_local_piggy_banks_v1";

function getPiggyFingerprint(p: Partial<PiggyBank>): string {
  return [
    (p.name || "").trim().toLowerCase(),
    Number(p.targetValue || 0).toFixed(2)
  ].join("|");
}

function getExactCloneFingerprint(p: Partial<PiggyBank>): string {
  return [
    (p.name || "").trim().toLowerCase(),
    Number(p.targetValue || 0).toFixed(2),
    Number(p.currentValue || 0).toFixed(2),
    String((p.history || []).length)
  ].join("|");
}

export function dedupePiggyBanks(items: PiggyBank[]): PiggyBank[] {
  const byId = new Map<string, PiggyBank>();
  for (const item of items) {
    if (!item || !item.id) continue;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  const all = Array.from(byId.values());
  const remoteFingerprints = new Set(
    all
      .filter(p => !p.id.startsWith("piggy_"))
      .map(getPiggyFingerprint)
  );

  // Prefer keeping the item with highest balance/history, then earliest creation
  const ordered = [...all].sort((a, b) => {
    const valDiff = Number(b.currentValue || 0) - Number(a.currentValue || 0);
    if (valDiff !== 0) return valDiff;
    const histDiff = (b.history?.length || 0) - (a.history?.length || 0);
    if (histDiff !== 0) return histDiff;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  const seenOfflineFingerprints = new Set<string>();
  const seenRemoteCloneFingerprints = new Set<string>();
  const keptFingerprints = new Set<string>();
  const result: PiggyBank[] = [];

  for (const item of ordered) {
    const fp = getPiggyFingerprint(item);
    if (item.id.startsWith("piggy_")) {
      if (remoteFingerprints.has(fp) || seenOfflineFingerprints.has(fp)) {
        continue;
      }
      seenOfflineFingerprints.add(fp);
      keptFingerprints.add(fp);
      result.push(item);
      continue;
    }

    const isZeroCloneOfExisting =
      keptFingerprints.has(fp) &&
      Number(item.currentValue || 0) === 0 &&
      (item.history?.length || 0) === 0;

    const exactCloneKey = getExactCloneFingerprint(item);
    if (isZeroCloneOfExisting || seenRemoteCloneFingerprints.has(exactCloneKey)) {
      continue;
    }

    seenRemoteCloneFingerprints.add(exactCloneKey);
    keptFingerprints.add(fp);
    result.push(item);
  }

  result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return result;
}

export function getStoredPiggyBanks(): PiggyBank[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return dedupePiggyBanks(parsed);
    }
  } catch (e) {
    console.warn("Erro ao carregar cofrinhos locais:", e);
  }
  return [];
}

export function saveStoredPiggyBanks(items: PiggyBank[]) {
  try {
    const cleanItems = dedupePiggyBanks(items);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanItems));
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
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const cleanedDuplicateIdsRef = useRef<Set<string>>(new Set());
  const inFlightKeysRef = useRef<Set<string>>(new Set());

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
          const remoteMap = new Map<string, PiggyBank>();
          snapshot.docs.forEach(docSnap => {
            remoteMap.set(docSnap.id, {
              id: docSnap.id,
              ...docSnap.data()
            } as PiggyBank);
            pendingIdsRef.current.delete(docSnap.id);
          });

          const remoteData = Array.from(remoteMap.values());
          const remoteFingerprints = new Set(remoteData.map(getPiggyFingerprint));
          const localList = getStoredPiggyBanks();
          const mergedMap = new Map<string, PiggyBank>();

          for (const remoteItem of remoteData) {
            mergedMap.set(remoteItem.id, remoteItem);
          }

          for (const item of localList) {
            if (mergedMap.has(item.id)) continue;
            const belongsToUser = item.userId === user.uid || !item.userId || item.userId === "default_user";
            if (!belongsToUser) continue;

            if (pendingIdsRef.current.has(item.id)) {
              mergedMap.set(item.id, { ...item, userId: user.uid });
            } else if (item.id.startsWith("piggy_") && !remoteFingerprints.has(getPiggyFingerprint(item))) {
              mergedMap.set(item.id, { ...item, userId: user.uid });
            }
          }

          const merged = dedupePiggyBanks(Array.from(mergedMap.values()));
          const keptIds = new Set(merged.map(m => m.id));

          // Clean up any pre-existing duplicate documents in Firestore safely
          for (const remoteItem of remoteData) {
            if (!keptIds.has(remoteItem.id) && !cleanedDuplicateIdsRef.current.has(remoteItem.id)) {
              cleanedDuplicateIdsRef.current.add(remoteItem.id);
              piggyBankModule.deletarCofrinho(remoteItem.id).catch(() => {});
            }
          }

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
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || getActiveUserId();
    const cleanedPayload = cleanData(data);
    const dedupeKey = getPiggyFingerprint(cleanedPayload);

    if (inFlightKeysRef.current.has(dedupeKey)) {
      const existing = getStoredPiggyBanks().find(p => getPiggyFingerprint(p) === dedupeKey);
      return existing?.id || null;
    }

    inFlightKeysRef.current.add(dedupeKey);
    const docId = firebaseUser
      ? doc(collection(db, "piggyBanks")).id
      : `piggy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newPiggy: PiggyBank = {
      ...cleanedPayload,
      id: docId,
      userId: uid,
      targetValue: Number(cleanedPayload.targetValue || 0),
      currentValue: Number(cleanedPayload.currentValue || 0),
      status: cleanedPayload.status === "completed" ? "completed" : "active",
      createdAt: nowIso,
      updatedAt: nowIso,
      history: []
    };

    if (firebaseUser) {
      pendingIdsRef.current.add(docId);
    }

    const currentList = getStoredPiggyBanks();
    const updatedList = dedupePiggyBanks([newPiggy, ...currentList.filter(p => p.id !== docId)]);
    saveStoredPiggyBanks(updatedList);
    setPiggyBanks(updatedList);

    try {
      if (firebaseUser) {
        await piggyBankModule.criarCofrinho(firebaseUser.uid, cleanedPayload, docId);
      }
      return docId;
    } catch (e) {
      pendingIdsRef.current.delete(docId);
      console.warn("Notice: piggy bank saved locally, Firestore sync notice:", e);
      return docId;
    } finally {
      setTimeout(() => {
        inFlightKeysRef.current.delete(dedupeKey);
      }, 2500);
    }
  };

  const updatePiggyBank = async (id: string, data: Partial<PiggyBank>) => {
    const cleanedUpdates = cleanData(data);
    const currentList = getStoredPiggyBanks();
    const updatedList = dedupePiggyBanks(
      currentList.map(p => p.id === id ? { ...p, ...cleanedUpdates, updatedAt: new Date().toISOString() } : p)
    );
    saveStoredPiggyBanks(updatedList);
    setPiggyBanks(updatedList);

    if (auth.currentUser && !id.startsWith("piggy_")) {
      try {
        return await piggyBankModule.atualizarCofrinho(id, cleanedUpdates);
      } catch (e) {
        console.warn("Notice: Firestore update piggy bank notice:", e);
      }
    }
    return true;
  };

  const deletePiggyBank = async (id: string) => {
    pendingIdsRef.current.delete(id);
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
