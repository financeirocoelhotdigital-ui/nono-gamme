import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { WealthItem, WealthAssetType, WealthEvolution, WealthEvolutionType, Construction, ConstructionStep } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { wealthModule } from "../modules/wealthModule";
import { constructionModule } from "../modules/constructionModule";
import { transacoes } from "../modules/transacoesModule";
import { deleteWealthImage } from "../lib/storage";
import { getActiveUserId } from "../lib/authUtils";

const LOCAL_STORAGE_WEALTH = "finance_local_wealth_v1";
const LOCAL_STORAGE_EVOLUTIONS = "finance_local_wealth_evolutions_v1";

export function getStoredWealth(): WealthItem[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_WEALTH);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar patrimônio do localStorage:", e);
  }
  return [];
}

export function saveStoredWealth(items: WealthItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_WEALTH, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_wealth_changed"));
  } catch (e) {
    console.warn("Erro ao salvar patrimônio no localStorage:", e);
  }
}

export function getStoredEvolutions(): WealthEvolution[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_EVOLUTIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar evoluções do localStorage:", e);
  }
  return [];
}

export function saveStoredEvolutions(evolutions: WealthEvolution[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_EVOLUTIONS, JSON.stringify(evolutions));
    window.dispatchEvent(new CustomEvent("local_wealth_evolutions_changed"));
  } catch (e) {
    console.warn("Erro ao salvar evoluções no localStorage:", e);
  }
}

interface WealthContextType {
  wealth: WealthItem[];
  loading: boolean;
  addWealthItem: (item: Omit<WealthItem, "id" | "userId" | "createdAt">) => Promise<string>;
  updateWealthItem: (id: string, item: Partial<WealthItem>) => Promise<void>;
  updateWealthValue: (id: string, newValue: number) => Promise<void>;
  getEvolutions: (wealthItemId: string) => Promise<WealthEvolution[]>;
  getAllEvolutions: () => Promise<WealthEvolution[]>;
  evolveWealthItem: (id: string, evolutionData: {
    value: number,
    type: WealthEvolutionType,
    description: string,
    date: string,
    addToAssetValue?: boolean,
    newType?: WealthAssetType,
    newName?: string,
    accountId?: string,
    tags?: string[]
  }) => Promise<void>;
  sellWealthItem: (id: string, saleData: { 
    saleValue: number, 
    saleDate: string, 
    accountId: string, 
    notes?: string 
  }) => Promise<void>;
  deleteWealthItem: (id: string) => Promise<void>;
  deleteEvolution: (evolutionId: string, wealthItemId: string) => Promise<void>;
  // Construction
  getConstructions: (wealthItemId: string) => Promise<Construction[]>;
  startConstruction: (wealthItemId: string, name: string, targetValue?: number, plannedSteps?: number) => Promise<string>;
  getConstructionSteps: (constructionId: string) => Promise<ConstructionStep[]>;
  addConstructionStep: (constructionId: string, stepData: Omit<ConstructionStep, 'id' | 'userId' | 'constructionId' | 'createdAt'>) => Promise<string>;
  updateConstructionStep: (stepId: string, constructionId: string, updates: Partial<ConstructionStep>) => Promise<void>;
  deleteConstructionStep: (stepId: string, constructionId: string) => Promise<void>;
}

const WealthContext = createContext<WealthContextType | undefined>(undefined);

export function WealthProvider({ children }: { children: ReactNode }) {
  const [wealth, setWealth] = useState<WealthItem[]>(getStoredWealth);
  const [loading, setLoading] = useState(false);

  // Listen to cross-component or cross-tab local updates
  useEffect(() => {
    const handleStorageChange = () => {
      setWealth(getStoredWealth());
    };
    window.addEventListener("local_wealth_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_wealth_changed", handleStorageChange);
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
        const q = query(collection(db, "wealth"), where("userId", "==", user.uid));
        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const firestoreItems = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as WealthItem));

            const localItems = getStoredWealth();
            const merged = [...firestoreItems];
            for (const localItem of localItems) {
              if (!merged.some(item => item.id === localItem.id)) {
                if (localItem.userId === user.uid || !localItem.userId || localItem.userId === "default_user") {
                  merged.push({ ...localItem, userId: user.uid });
                }
              }
            }

            setWealth(merged);
            saveStoredWealth(merged);
            setLoading(false);
          },
          (error) => {
            console.warn("Notice: Firestore wealth snapshot warning (using local fallback):", error);
            setWealth(getStoredWealth());
            setLoading(false);
          }
        );
      } else {
        setWealth(getStoredWealth());
        setLoading(false);
        unsubscribeSnapshot = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const addWealthItem = async (item: Omit<WealthItem, "id" | "userId" | "createdAt">) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `wealth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    
    const valNum = Number(item.value) || 0;
    const purchaseValNum = Number(item.purchaseValue) || 0;
    const totalAppreciation = valNum - purchaseValNum;
    const percentageAppreciation = purchaseValNum > 0 ? (totalAppreciation / purchaseValNum) * 100 : 0;

    const newItem: WealthItem = {
      ...item,
      id: tempId,
      userId: uid,
      value: valNum,
      purchaseValue: purchaseValNum,
      status: item.status || "ativo",
      totalInvested: purchaseValNum,
      totalAppreciation,
      percentageAppreciation,
      createdAt: nowIso,
      lastUpdate: nowIso
    };

    // 1. Optimistic Local Update
    const currentList = getStoredWealth();
    const updatedList = [newItem, ...currentList.filter(i => i.id !== tempId)];
    saveStoredWealth(updatedList);
    setWealth(updatedList);

    // Initial evolution record locally
    const initialEvo: WealthEvolution = {
      id: `evo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      wealthItemId: tempId,
      userId: uid,
      type: "ajuste",
      value: purchaseValNum,
      description: "Aquisição inicial",
      date: item.purchaseDate || nowIso,
      createdAt: nowIso
    };
    const currentEvos = getStoredEvolutions();
    saveStoredEvolutions([initialEvo, ...currentEvos]);

    // 2. Sync to Firestore if authenticated
    try {
      if (auth.currentUser) {
        const firestoreId = await wealthModule.addWealthItem({
          ...newItem,
          userId: auth.currentUser.uid
        });

        if (firestoreId && firestoreId !== tempId) {
          const syncedList = getStoredWealth().map(i => i.id === tempId ? { ...i, id: firestoreId, userId: auth.currentUser!.uid } : i);
          saveStoredWealth(syncedList);
          setWealth(syncedList);

          const syncedEvos = getStoredEvolutions().map(e => e.wealthItemId === tempId ? { ...e, wealthItemId: firestoreId, userId: auth.currentUser!.uid } : e);
          saveStoredEvolutions(syncedEvos);

          return firestoreId;
        }
      }
    } catch (err) {
      console.warn("Notice: Firestore addWealthItem warning (saved locally):", err);
    }

    return tempId;
  };

  const updateWealthItem = async (id: string, itemUpdates: Partial<WealthItem>) => {
    const currentList = getStoredWealth();
    const updatedList = currentList.map(i => i.id === id ? { ...i, ...itemUpdates, lastUpdate: new Date().toISOString() } : i);
    saveStoredWealth(updatedList);
    setWealth(updatedList);

    if (auth.currentUser && !id.startsWith("wealth_")) {
      try {
        await wealthModule.updateWealthItem(id, itemUpdates);
      } catch (err) {
        console.warn("Notice: Firestore updateWealthItem warning:", err);
      }
    }
  };

  const sellWealthItem = async (id: string, saleData: { 
    saleValue: number, 
    saleDate: string, 
    accountId: string, 
    notes?: string 
  }) => {
    const item = wealth.find(i => i.id === id) || getStoredWealth().find(i => i.id === id);
    if (!item) throw new Error(`Item não encontrado: ${id}`);

    const totalInvested = item.totalInvested || item.purchaseValue;
    const numSaleValue = Number(saleData.saleValue) || 0;
    const profit = numSaleValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;
    const activeUid = item.userId || auth.currentUser?.uid || getActiveUserId();

    const updatedItem: WealthItem = {
      ...item,
      status: "vendido",
      saleValue: numSaleValue,
      saleDate: saleData.saleDate,
      profit,
      profitPercentage,
      destinationAccountId: saleData.accountId,
      lastUpdate: new Date().toISOString()
    };

    const newEvo: WealthEvolution = {
      id: `evo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      wealthItemId: id,
      userId: activeUid,
      type: "venda",
      value: numSaleValue,
      description: `Venda concluída. ${saleData.notes || ""}`.trim(),
      date: saleData.saleDate,
      createdAt: new Date().toISOString()
    };

    // 1. Atualizar patrimônio e histórico de evoluções
    const currentList = getStoredWealth();
    const updatedList = currentList.map(i => i.id === id ? updatedItem : i);
    saveStoredWealth(updatedList);
    setWealth(updatedList);

    const currentEvos = getStoredEvolutions();
    saveStoredEvolutions([newEvo, ...currentEvos]);

    // 2. Registrar a receita do dinheiro da venda para atualizar a conta bancária e o Dashboard imediatamente
    if (numSaleValue > 0) {
      try {
        await transacoes.registrarTransacao({
          userId: activeUid,
          title: `Venda de Patrimônio: ${item.name}`,
          description: `Venda de ativo: ${item.name}. ${saleData.notes || ""}`.trim(),
          type: "income",
          value: numSaleValue,
          category: "Patrimônio",
          accountId: saleData.accountId || undefined,
          date: saleData.saleDate || new Date().toISOString().split("T")[0],
          emotion: "feliz",
          essential: false,
          createdAt: new Date().toISOString()
        });
      } catch (txErr) {
        console.warn("Notice: Erro ao registrar transação da venda de patrimônio:", txErr);
      }
    }

    // 3. Notificar todos os módulos e dashboard em tempo real
    window.dispatchEvent(new CustomEvent("local_transactions_changed"));
    window.dispatchEvent(new CustomEvent("local_accounts_changed"));
    window.dispatchEvent(new CustomEvent("local_wealth_changed"));

    // 4. Sincronizar com Firestore se autenticado
    if (auth.currentUser && !id.startsWith("wealth_")) {
      try {
        await wealthModule.sellWealthItem(id, saleData, item, true);
      } catch (err) {
        console.warn("Notice: Firestore sellWealthItem warning (saved locally):", err);
      }
    }
  };

  const updateWealthValue = async (id: string, newValue: number) => {
    const item = wealth.find(i => i.id === id) || getStoredWealth().find(i => i.id === id);
    if (!item) throw new Error(`Item não encontrado: ${id}`);
    await evolveWealthItem(id, {
      value: newValue,
      type: "ajuste",
      description: "Atualização manual de valor",
      date: new Date().toISOString()
    });
  };

  const getEvolutions = async (wealthItemId: string) => {
    const localEvos = getStoredEvolutions().filter(e => e.wealthItemId === wealthItemId);
    
    if (auth.currentUser) {
      try {
        const remoteEvos = await wealthModule.getEvolutions(wealthItemId, auth.currentUser.uid);
        const allEvos = getStoredEvolutions();
        const merged = [...remoteEvos];
        for (const localE of localEvos) {
          if (!merged.some(r => r.id === localE.id)) {
            merged.push(localE);
          }
        }
        merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        
        const remainingEvos = allEvos.filter(e => e.wealthItemId !== wealthItemId);
        saveStoredEvolutions([...merged, ...remainingEvos]);
        return merged;
      } catch (err) {
        console.warn("Notice: Firestore getEvolutions warning (using local cache):", err);
      }
    }
    return localEvos.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  };

  const getAllEvolutions = async () => {
    const localEvos = getStoredEvolutions();

    if (auth.currentUser) {
      try {
        const remoteEvos = await wealthModule.getAllEvolutions(auth.currentUser.uid);
        const merged = [...remoteEvos];
        for (const localE of localEvos) {
          if (!merged.some(r => r.id === localE.id)) {
            merged.push(localE);
          }
        }
        merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        saveStoredEvolutions(merged);
        return merged;
      } catch (err) {
        console.warn("Notice: Firestore getAllEvolutions warning (using local cache):", err);
      }
    }
    return localEvos.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  };

  const evolveWealthItem = async (id: string, evolutionData: {
    value: number,
    type: WealthEvolutionType,
    description: string,
    date: string,
    addToAssetValue?: boolean,
    newType?: WealthAssetType,
    newName?: string,
    accountId?: string,
    tags?: string[]
  }) => {
    const item = wealth.find(i => i.id === id) || getStoredWealth().find(i => i.id === id);
    if (!item) throw new Error(`Item não encontrado: ${id}`);

    let newValue = item.value;
    let newTotalInvested = item.totalInvested || item.purchaseValue;
    let newType = item.type;
    let newName = item.name;

    switch (evolutionData.type) {
      case "valorizacao":
        newValue += evolutionData.value;
        break;
      case "desvalorizacao":
        newValue -= evolutionData.value;
        break;
      case "investimento":
      case "reforma":
      case "construcao":
        if (evolutionData.addToAssetValue) {
          newValue += evolutionData.value;
          newTotalInvested += evolutionData.value;
        }
        break;
      case "transformacao":
        if (evolutionData.newType) newType = evolutionData.newType;
        if (evolutionData.newName) newName = evolutionData.newName;
        newValue += evolutionData.value;
        newTotalInvested += evolutionData.value;
        break;
      case "renomear":
        if (evolutionData.newName) newName = evolutionData.newName;
        break;
      case "ajuste":
        newValue = evolutionData.value;
        break;
    }

    const totalAppreciation = newValue - newTotalInvested;
    const percentageAppreciation = newTotalInvested > 0 ? (totalAppreciation / newTotalInvested) * 100 : 0;

    const updatedItem: WealthItem = {
      ...item,
      value: newValue,
      totalInvested: newTotalInvested,
      type: newType,
      name: newName,
      totalAppreciation,
      percentageAppreciation,
      lastUpdate: new Date().toISOString()
    };

    const newEvo: WealthEvolution = {
      id: `evo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      wealthItemId: id,
      userId: item.userId,
      type: evolutionData.type,
      value: evolutionData.value,
      description: evolutionData.description,
      date: evolutionData.date,
      createdAt: new Date().toISOString()
    };

    const currentList = getStoredWealth();
    const updatedList = currentList.map(i => i.id === id ? updatedItem : i);
    saveStoredWealth(updatedList);
    setWealth(updatedList);

    const currentEvos = getStoredEvolutions();
    saveStoredEvolutions([newEvo, ...currentEvos]);

    if (auth.currentUser && !id.startsWith("wealth_")) {
      try {
        await wealthModule.evolveWealthItem(id, evolutionData, item);
      } catch (err) {
        console.warn("Notice: Firestore evolveWealthItem warning (saved locally):", err);
      }
    }
  };

  const deleteWealthItem = async (id: string) => {
    const item = wealth.find(i => i.id === id) || getStoredWealth().find(i => i.id === id);
    if (item?.imageUrl && item.imageUrl.includes("firebasestorage")) {
      try {
        await deleteWealthImage(item.imageUrl);
      } catch (e) {
        console.warn("Notice: failed deleting wealth image:", e);
      }
    }

    const currentList = getStoredWealth();
    const updatedList = currentList.filter(i => i.id !== id);
    saveStoredWealth(updatedList);
    setWealth(updatedList);

    const currentEvos = getStoredEvolutions();
    const updatedEvos = currentEvos.filter(e => e.wealthItemId !== id);
    saveStoredEvolutions(updatedEvos);

    if (auth.currentUser && !id.startsWith("wealth_")) {
      try {
        await wealthModule.deleteWealthItem(id);
      } catch (err) {
        console.warn("Notice: Firestore deleteWealthItem warning:", err);
      }
    }
  };

  const deleteEvolution = async (evolutionId: string, wealthItemId: string) => {
    const currentEvos = getStoredEvolutions();
    const updatedEvos = currentEvos.filter(e => e.id !== evolutionId);
    saveStoredEvolutions(updatedEvos);

    const item = wealth.find(i => i.id === wealthItemId) || getStoredWealth().find(i => i.id === wealthItemId);
    if (item && auth.currentUser && !evolutionId.startsWith("evo_")) {
      try {
        await wealthModule.deleteEvolution(evolutionId, wealthItemId, item);
      } catch (err) {
        console.warn("Notice: Firestore deleteEvolution warning:", err);
      }
    }
  };

  const getConstructions = async (wealthItemId: string) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    return await constructionModule.getConstructions(wealthItemId, uid);
  };

  const startConstruction = async (wealthItemId: string, name: string, targetValue?: number, plannedSteps?: number) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    return await constructionModule.startConstruction({
      userId: uid,
      wealthItemId,
      name,
      status: "em_andamento",
      progress: 0,
      totalInvested: 0,
      targetValue,
      plannedSteps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const getConstructionSteps = async (constructionId: string) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    return await constructionModule.getSteps(constructionId, uid);
  };

  const recalculateConstructionProgress = async (constructionId: string) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    
    const construction = await constructionModule.getConstruction(constructionId);
    if (!construction) return;

    const steps = await constructionModule.getSteps(constructionId, uid);
    const completedSteps = steps.filter(s => s.status === 'concluido');
    const totalInvested = completedSteps.reduce((acc, s) => acc + s.value, 0);
    
    let progress = 0;

    if (construction.targetValue && construction.targetValue > 0) {
      progress = (totalInvested / construction.targetValue) * 100;
    } else if (construction.plannedSteps && construction.plannedSteps > 0) {
      progress = (completedSteps.length / construction.plannedSteps) * 100;
    } else if (steps.length > 0) {
      progress = (completedSteps.length / steps.length) * 100;
    }

    const cappedProgress = Math.min(progress, 100);
    
    await constructionModule.updateConstruction(constructionId, { 
      progress: Math.min(progress, 100),
      totalInvested,
      status: cappedProgress === 100 ? 'concluida' : 'em_andamento'
    });

    return { progress, totalInvested, steps };
  };

  const addConstructionStep = async (constructionId: string, stepData: Omit<ConstructionStep, 'id' | 'userId' | 'constructionId' | 'createdAt'>) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const stepId = await constructionModule.addStep({
      ...stepData,
      userId: uid,
      constructionId,
      createdAt: new Date().toISOString()
    });

    await recalculateConstructionProgress(constructionId);
    return stepId;
  };

  const updateConstructionStep = async (stepId: string, constructionId: string, updates: Partial<ConstructionStep>) => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    
    const stepsBefore = await constructionModule.getSteps(constructionId, uid);
    const stepBefore = stepsBefore.find(s => s.id === stepId);
    
    await constructionModule.updateStep(stepId, updates);
    
    const result = await recalculateConstructionProgress(constructionId);
    
    if (result) {
      const { progress, steps: stepsAfter } = result;
      const stepAfter = stepsAfter.find(s => s.id === stepId);
      
      if (stepAfter) {
        const construction = await constructionModule.getConstruction(constructionId);
        const wealthItemId = construction?.wealthItemId || "";

        if (updates.status === 'concluido' && stepBefore?.status !== 'concluido' && wealthItemId) {
          await evolveWealthItem(wealthItemId, {
            value: stepAfter.value,
            type: "investimento",
            description: `Etapa concluída: ${stepAfter.name}`,
            date: stepAfter.date,
            addToAssetValue: true
          });

          if (progress === 100) {
            await evolveWealthItem(wealthItemId, {
              value: 0,
              type: "transformacao",
              description: `Construção finalizada!`,
              date: stepAfter.date,
              newType: "imovel"
            });
          }
        }
      }
    }
  };

  const deleteConstructionStep = async (stepId: string, constructionId: string) => {
    await constructionModule.deleteStep(stepId);
    await recalculateConstructionProgress(constructionId);
  };

  return (
    <WealthContext.Provider value={{ 
      wealth, 
      loading,
      addWealthItem,
      updateWealthItem,
      updateWealthValue,
      getEvolutions,
      getAllEvolutions,
      evolveWealthItem,
      sellWealthItem,
      deleteWealthItem,
      deleteEvolution,
      getConstructions,
      startConstruction,
      getConstructionSteps,
      addConstructionStep,
      updateConstructionStep,
      deleteConstructionStep
    }}>
      {children}
    </WealthContext.Provider>
  );
}

export function useWealth() {
  const context = useContext(WealthContext);
  if (context === undefined) {
    throw new Error("useWealth must be used within a WealthProvider");
  }
  return context;
}
