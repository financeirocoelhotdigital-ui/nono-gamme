import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { Subscription } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getActiveUserId } from "../lib/authUtils";
import { parseCurrencyInput, cleanData } from "../lib/utils";

const LOCAL_STORAGE_KEY = "finance_local_subscriptions_v1";

export function getStoredSubscriptions(): Subscription[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar assinaturas do localStorage:", e);
  }
  return [];
}

export function saveStoredSubscriptions(subs: Subscription[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subs));
    window.dispatchEvent(new CustomEvent("local_subscriptions_changed"));
  } catch (e) {
    console.warn("Erro ao salvar assinaturas no localStorage:", e);
  }
}

interface SubscriptionsContextType {
  subscriptions: Subscription[];
  loading: boolean;
  totalMonthly: number;
  totalYearly: number;
  createSubscription: (data: Omit<Subscription, "id" | "userId">) => Promise<string | null>;
  updateSubscription: (id: string, data: Partial<Subscription>) => Promise<boolean>;
  deleteSubscription: (id: string) => Promise<boolean>;
  toggleSubscriptionStatus: (id: string) => Promise<boolean>;
}

const SubscriptionsContext = createContext<SubscriptionsContextType | undefined>(undefined);

export function SubscriptionsProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(getStoredSubscriptions);
  const [loading, setLoading] = useState(false);

  // Listen to local changes
  useEffect(() => {
    const handleStorageChange = () => {
      setSubscriptions(getStoredSubscriptions());
    };
    window.addEventListener("local_subscriptions_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_subscriptions_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        const q = query(
          collection(db, "subscriptions"),
          where("userId", "==", user.uid)
        );

        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const firestoreData = snapshot.docs.map(doc => {
              const data = doc.data() as any;
              return {
                id: doc.id,
                userId: data.userId || user.uid,
                name: data.name || "Assinatura",
                value: parseCurrencyInput(data.value),
                billingCycle: data.billingCycle || "mensal",
                category: data.category || "streaming",
                nextBilling: data.nextBilling || new Date().toISOString().split("T")[0],
                active: data.active !== false,
                createdAt: data.createdAt || new Date().toISOString()
              } as Subscription;
            });

            // Merge with local storage
            const localSubs = getStoredSubscriptions();
            const merged = [...firestoreData];
            for (const localSub of localSubs) {
              if (!merged.some(s => s.id === localSub.id)) {
                if (localSub.userId === user.uid || !localSub.userId || localSub.userId === "default_user") {
                  merged.push({ ...localSub, userId: user.uid });
                }
              }
            }

            setSubscriptions(merged);
            saveStoredSubscriptions(merged);
            setLoading(false);
          },
          (error) => {
            console.warn("Notice: Firestore subscriptions snapshot warning (using local):", error);
            setSubscriptions(getStoredSubscriptions());
            setLoading(false);
          }
        );
      } else {
        setSubscriptions(getStoredSubscriptions());
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const totalMonthly = useMemo(() => {
    return subscriptions
      .filter(s => s.active !== false)
      .reduce((acc, sub) => {
        const val = parseCurrencyInput(sub.value);
        if (sub.billingCycle === "mensal") return acc + val;
        return acc + (val / 12);
      }, 0);
  }, [subscriptions]);

  const totalYearly = useMemo(() => {
    return totalMonthly * 12;
  }, [totalMonthly]);

  const createSubscription = async (data: Omit<Subscription, "id" | "userId">): Promise<string | null> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const cleanVal = parseCurrencyInput(data.value);
    const tempId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newSub: Subscription = {
      id: tempId,
      userId: uid,
      name: data.name?.trim() || "Nova Assinatura",
      value: cleanVal,
      billingCycle: data.billingCycle || "mensal",
      category: data.category || "streaming",
      nextBilling: data.nextBilling || new Date().toISOString().split("T")[0],
      active: data.active !== false,
      createdAt: new Date().toISOString()
    };

    // Optimistically update local state & storage
    setSubscriptions(prev => {
      const next = [newSub, ...prev.filter(s => s.id !== tempId)];
      saveStoredSubscriptions(next);
      return next;
    });

    try {
      const cleanObj = cleanData({
        userId: uid,
        name: newSub.name,
        value: newSub.value,
        billingCycle: newSub.billingCycle,
        category: newSub.category,
        nextBilling: newSub.nextBilling,
        active: newSub.active,
        createdAt: newSub.createdAt
      });

      const docRef = await addDoc(collection(db, "subscriptions"), cleanObj);
      if (docRef?.id) {
        setSubscriptions(prev => {
          const next = prev.map(s => s.id === tempId ? { ...s, id: docRef.id } : s);
          saveStoredSubscriptions(next);
          return next;
        });
        return docRef.id;
      }
    } catch (e) {
      console.warn("Could not sync subscription to Firestore, kept locally:", e);
    }

    return tempId;
  };

  const updateSubscription = async (id: string, data: Partial<Subscription>): Promise<boolean> => {
    const cleanVal = data.value !== undefined ? parseCurrencyInput(data.value) : undefined;

    // Optimistic local update
    setSubscriptions(prev => {
      const next = prev.map(s => {
        if (s.id === id) {
          return {
            ...s,
            ...data,
            value: cleanVal !== undefined ? cleanVal : s.value
          };
        }
        return s;
      });
      saveStoredSubscriptions(next);
      return next;
    });

    try {
      const cleanObj = cleanData({
        ...data,
        value: cleanVal !== undefined ? cleanVal : undefined,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, "subscriptions", id), cleanObj);
    } catch (e) {
      console.warn("Could not sync subscription update to Firestore:", e);
    }
    return true;
  };

  const deleteSubscription = async (id: string): Promise<boolean> => {
    // Optimistic local removal
    setSubscriptions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveStoredSubscriptions(next);
      return next;
    });

    try {
      await deleteDoc(doc(db, "subscriptions", id));
    } catch (e) {
      console.warn("Could not delete subscription from Firestore:", e);
    }
    return true;
  };

  const toggleSubscriptionStatus = async (id: string): Promise<boolean> => {
    const target = subscriptions.find(s => s.id === id);
    if (!target) return false;
    const newStatus = !target.active;
    return updateSubscription(id, { active: newStatus });
  };

  return (
    <SubscriptionsContext.Provider value={{ 
      subscriptions, 
      loading,
      totalMonthly,
      totalYearly,
      createSubscription,
      updateSubscription,
      deleteSubscription,
      toggleSubscriptionStatus
    }}>
      {children}
    </SubscriptionsContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionsContext);
  if (context === undefined) {
    throw new Error("useSubscriptions must be used within a SubscriptionsProvider");
  }
  return context;
}
