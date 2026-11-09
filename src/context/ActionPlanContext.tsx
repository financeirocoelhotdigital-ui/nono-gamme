import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ActionPlan, ActionItem, UserProfile } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, orderBy, addDoc, doc, updateDoc, getDocs, writeBatch, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { generateActionPlan } from "../services/geminiService";
import { useTransacoes } from "./TransacoesContext";
import { useContas } from "./ContasContext";
import { useMetas } from "./MetasContext";
import { useDebts } from "./DebtsContext";
import { useOrcamento } from "./OrcamentoContext";
import { useCartoes } from "./CartoesContext";
import { useReceivables } from "./ReceivablesContext";
import { useWealth } from "./WealthContext";
import { useFamily } from "./FamilyContext";
import { useSubscriptions } from "./SubscriptionsContext";
import { handleFirestoreError, OperationType } from "../lib/firebase";
import { transacoes as transacoesModule } from "../modules/transacoesModule";

interface ActionPlanContextType {
  currentPlan: ActionPlan | null;
  actionItems: ActionItem[];
  loading: boolean;
  generating: boolean;
  refreshPlan: () => Promise<void>;
  addActionItem: (item: Omit<ActionItem, "id">) => Promise<void>;
  executeAction: (actionId: string) => Promise<void>;
  ignoreAction: (actionId: string) => Promise<void>;
}

const ActionPlanContext = createContext<ActionPlanContextType | undefined>(undefined);

export function ActionPlanProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<ActionPlan | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const { transactions } = useTransacoes();
  const { accounts } = useContas();
  const { goals } = useMetas();
  const { debts, installments } = useDebts();
  const { budgets } = useOrcamento();
  const { cards } = useCartoes();
  const { receivables } = useReceivables();
  const { wealth } = useWealth();
  const { family } = useFamily();
  const { subscriptions } = useSubscriptions();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribePlan: (() => void) | null = null;
    let unsubscribeItems: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribePlan) unsubscribePlan();
      if (unsubscribeItems) unsubscribeItems();

      if (user) {
        // Fetch user profile
        unsubscribeProfile = onSnapshot(doc(db, "users", user.uid), (doc) => {
          if (doc.exists()) {
            setUserProfile({ uid: doc.id, ...doc.data() } as UserProfile);
          }
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, "users");
          }
        });

        // Fetch current active plan
        const qPlan = query(
          collection(db, "actionPlans"),
          where("userId", "==", user.uid),
          where("status", "==", "ativo"),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        unsubscribePlan = onSnapshot(qPlan, (snapshot) => {
          if (!snapshot.empty) {
            const planDoc = snapshot.docs[0];
            const planData = { id: planDoc.id, ...planDoc.data() } as ActionPlan;
            setCurrentPlan(planData);

            // Fetch items for this plan
            const qItems = query(
              collection(db, "actionItems"),
              where("userId", "==", user.uid),
              where("planId", "==", planDoc.id),
              orderBy("priority", "asc")
            );

            if (unsubscribeItems) unsubscribeItems();
            unsubscribeItems = onSnapshot(qItems, (itemSnapshot) => {
              const items = itemSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as ActionItem));
              setActionItems(items);
              setLoading(false);
            }, (error) => {
              if (auth.currentUser) {
                handleFirestoreError(error, OperationType.GET, "actionItems");
              }
            });
          } else {
            setCurrentPlan(null);
            setActionItems([]);
            setLoading(false);
          }
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.GET, "actionPlans");
          }
        });
      } else {
        setCurrentPlan(null);
        setActionItems([]);
        setUserProfile(null);
        setLoading(false);
        unsubscribeProfile = null;
        unsubscribePlan = null;
        unsubscribeItems = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribePlan) unsubscribePlan();
      if (unsubscribeItems) unsubscribeItems();
    };
  }, []);

  const refreshPlan = async () => {
    if (!auth.currentUser || !userProfile) return;
    setGenerating(true);

    try {
        const planData = await generateActionPlan(userProfile, {
          transactions,
          accounts,
          goals,
          debts,
          installments,
          budgets,
          cards,
          receivables,
          wealth,
          family,
          subscriptions
        });

      const batch = writeBatch(db);

      // Archive old plan
      if (currentPlan) {
        batch.update(doc(db, "actionPlans", currentPlan.id), { status: "arquivado" });
      }

      // Create new plan
      const planRef = doc(collection(db, "actionPlans"));
      const newPlan: Partial<ActionPlan> = {
        userId: auth.currentUser.uid,
        date: new Date().toISOString(),
        summary: planData.summary,
        status: "ativo",
        createdAt: new Date().toISOString()
      };
      batch.set(planRef, newPlan);

      // Create items
      planData.actions.forEach((action: any) => {
        const itemRef = doc(collection(db, "actionItems"));
        const newItem: Partial<ActionItem> = {
          ...action,
          userId: auth.currentUser!.uid,
          planId: planRef.id,
          status: "pendente",
          createdAt: new Date().toISOString()
        };
        batch.set(itemRef, newItem);
      });

      await batch.commit();
    } catch (error) {
      console.error("Error refreshing action plan:", error);
    } finally {
      setGenerating(false);
    }
  };

  const addActionItem = async (item: Omit<ActionItem, "id">) => {
    try {
      const docRef = await addDoc(collection(db, "actionItems"), {
        ...item,
        createdAt: new Date().toISOString()
      });
      // Update local state if needed, but onSnapshot should handle it
    } catch (error) {
      console.error("Error adding action item:", error);
      throw error;
    }
  };

  const executeAction = async (actionId: string) => {
    const action = actionItems.find(a => a.id === actionId);
    if (!action || !auth.currentUser) return;

    try {
      if (action.executable && action.executionData) {
        const { transactionType, category, accountId, value } = action.executionData;
        
        if (transactionType && category && value) {
          await transacoesModule.registrarTransacao({
            userId: auth.currentUser.uid,
            title: action.title,
            value: value,
            type: transactionType,
            category: category,
            date: new Date().toISOString(),
            accountId: accountId || (accounts.length > 0 ? accounts[0].id : ""),
            reconciled: false,
            createdAt: new Date().toISOString()
          } as any);
        }
      }

      await updateDoc(doc(db, "actionItems", actionId), {
        status: "concluido",
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error executing action:", error);
    }
  };

  const ignoreAction = async (actionId: string) => {
    try {
      await updateDoc(doc(db, "actionItems", actionId), {
        status: "ignorado"
      });
    } catch (error) {
      console.error("Error ignoring action:", error);
    }
  };

  return (
    <ActionPlanContext.Provider value={{
      currentPlan,
      actionItems,
      loading,
      generating,
      refreshPlan,
      addActionItem,
      executeAction,
      ignoreAction
    }}>
      {children}
    </ActionPlanContext.Provider>
  );
}

export function useActionPlan() {
  const context = useContext(ActionPlanContext);
  if (context === undefined) {
    throw new Error("useActionPlan must be used within an ActionPlanProvider");
  }
  return context;
}
