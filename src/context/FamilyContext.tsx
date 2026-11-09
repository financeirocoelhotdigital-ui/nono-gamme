import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { FamilyMember, DependencyAnalysis, FamilyIncome, FamilyGoal, FamilyFinancialAnalysis, FamilyDistribution } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getActiveUserId } from "../lib/authUtils";

const LOCAL_STORAGE_FAMILY = "finance_local_family_v1";
const LOCAL_STORAGE_INCOMES = "finance_local_family_incomes_v1";
const LOCAL_STORAGE_GOALS = "finance_local_family_goals_v1";

export function getStoredFamily(): FamilyMember[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_FAMILY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar família local:", e);
  }
  return [];
}

export function saveStoredFamily(items: FamilyMember[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_FAMILY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_family_changed"));
  } catch (e) {
    console.warn("Erro ao salvar família local:", e);
  }
}

export function getStoredIncomes(): FamilyIncome[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_INCOMES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar rendas familiares locais:", e);
  }
  return [];
}

export function saveStoredIncomes(items: FamilyIncome[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_INCOMES, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_family_incomes_changed"));
  } catch (e) {
    console.warn("Erro ao salvar rendas familiares locais:", e);
  }
}

export function getStoredGoals(): FamilyGoal[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_GOALS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao carregar metas familiares locais:", e);
  }
  return [];
}

export function saveStoredGoals(items: FamilyGoal[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_GOALS, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("local_family_goals_changed"));
  } catch (e) {
    console.warn("Erro ao salvar metas familiares locais:", e);
  }
}

interface FamilyContextType {
  family: FamilyMember[];
  incomes: FamilyIncome[];
  goals: FamilyGoal[];
  loading: boolean;
  analysis: DependencyAnalysis | null;
  financialAnalysis: FamilyFinancialAnalysis | null;
  addMember: (member: Omit<FamilyMember, "id" | "userId" | "createdAt">) => Promise<string>;
  updateMember: (id: string, member: Partial<FamilyMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  addIncome: (income: Omit<FamilyIncome, "id" | "userId" | "createdAt">) => Promise<string>;
  updateIncome: (id: string, income: Partial<FamilyIncome>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addGoal: (goal: Omit<FamilyGoal, "id" | "userId" | "createdAt">) => Promise<string>;
  updateGoal: (id: string, goal: Partial<FamilyGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateDistribution: (distribution: FamilyDistribution) => void;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<FamilyMember[]>(getStoredFamily);
  const [incomes, setIncomes] = useState<FamilyIncome[]>(getStoredIncomes);
  const [goals, setGoals] = useState<FamilyGoal[]>(getStoredGoals);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<DependencyAnalysis>({
    totalDependents: 0,
    totalDependentCost: 0,
    dependencyIndex: 0,
    riskLevel: "saudavel",
    userOverload: false
  });
  const [financialAnalysis, setFinancialAnalysis] = useState<FamilyFinancialAnalysis>({
    totalIncome: 0,
    incomeByMember: {},
    contributionPercentageByMember: {},
    distribution: { expenses: 50, lifestyle: 30, goals: 20, reserve: 0 },
    goalsProgress: 0,
    alerts: []
  });
  const [distribution, setDistribution] = useState<FamilyDistribution>({
    expenses: 50,
    lifestyle: 30,
    goals: 20,
    reserve: 0
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setFamily(getStoredFamily());
      setIncomes(getStoredIncomes());
      setGoals(getStoredGoals());
    };
    window.addEventListener("local_family_changed", handleStorageChange);
    window.addEventListener("local_family_incomes_changed", handleStorageChange);
    window.addEventListener("local_family_goals_changed", handleStorageChange);
    return () => {
      window.removeEventListener("local_family_changed", handleStorageChange);
      window.removeEventListener("local_family_incomes_changed", handleStorageChange);
      window.removeEventListener("local_family_goals_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubscribeFamily: (() => void) | null = null;
    let unsubscribeIncomes: (() => void) | null = null;
    let unsubscribeGoals: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeFamily) unsubscribeFamily();
      if (unsubscribeIncomes) unsubscribeIncomes();
      if (unsubscribeGoals) unsubscribeGoals();

      if (user) {
        // Family Members
        const qFamily = query(collection(db, "family"), where("userId", "==", user.uid));
        unsubscribeFamily = onSnapshot(qFamily, (snapshot) => {
          const remoteData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as FamilyMember));

          const localList = getStoredFamily();
          const merged = [...remoteData];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          setFamily(merged);
          saveStoredFamily(merged);
        }, (error) => {
          console.warn("Notice: family snapshot warning (using local):", error);
          setFamily(getStoredFamily());
        });

        // Family Incomes
        const qIncomes = query(collection(db, "family_incomes"), where("userId", "==", user.uid));
        unsubscribeIncomes = onSnapshot(qIncomes, (snapshot) => {
          const remoteData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as FamilyIncome));

          const localList = getStoredIncomes();
          const merged = [...remoteData];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          setIncomes(merged);
          saveStoredIncomes(merged);
        }, (error) => {
          console.warn("Notice: family_incomes snapshot warning (using local):", error);
          setIncomes(getStoredIncomes());
        });

        // Family Goals
        const qGoals = query(collection(db, "family_goals"), where("userId", "==", user.uid));
        unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
          const remoteData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as FamilyGoal));

          const localList = getStoredGoals();
          const merged = [...remoteData];
          for (const item of localList) {
            if (!merged.some(r => r.id === item.id)) {
              if (item.userId === user.uid || !item.userId || item.userId === "default_user") {
                merged.push({ ...item, userId: user.uid });
              }
            }
          }
          setGoals(merged);
          saveStoredGoals(merged);
          setLoading(false);
        }, (error) => {
          console.warn("Notice: family_goals snapshot warning (using local):", error);
          setGoals(getStoredGoals());
          setLoading(false);
        });
      } else {
        const storedFam = getStoredFamily();
        const storedInc = getStoredIncomes();
        const storedGls = getStoredGoals();
        setFamily(storedFam);
        setIncomes(storedInc);
        setGoals(storedGls);
        calculateAnalysis(storedFam);
        calculateFinancialAnalysis(storedFam, storedInc, storedGls);
        setLoading(false);
        unsubscribeFamily = null;
        unsubscribeIncomes = null;
        unsubscribeGoals = null;
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFamily) unsubscribeFamily();
      if (unsubscribeIncomes) unsubscribeIncomes();
      if (unsubscribeGoals) unsubscribeGoals();
    };
  }, []);

  useEffect(() => {
    calculateAnalysis(family);
    calculateFinancialAnalysis(family, incomes, goals);
    setLoading(false);
  }, [family, incomes, goals, distribution]);

  const calculateAnalysis = (members: FamilyMember[]) => {
    const user = members.find(m => m.type === "usuario");
    const userIncome = user ? (user.income || 0) : members.reduce((acc, m) => acc + (m.income || 0), 0);
    
    const dependents = members.filter(m => m.type === "dependente");
    const totalDependentCost = dependents.reduce((acc, m) => acc + Math.max(0, (m.monthlyExpenses || 0) - (m.income || 0)), 0);
    
    const dependencyIndex = userIncome > 0 ? (totalDependentCost / userIncome) * 100 : 0;
    
    let riskLevel: DependencyAnalysis["riskLevel"] = "saudavel";
    if (dependencyIndex > 60) riskLevel = "risco_alto";
    else if (dependencyIndex > 30) riskLevel = "atencao";

    setAnalysis({
      totalDependents: dependents.length,
      totalDependentCost,
      dependencyIndex,
      riskLevel,
      userOverload: dependencyIndex > 60
    });
  };

  const calculateFinancialAnalysis = (members: FamilyMember[], incs: FamilyIncome[], gls: FamilyGoal[]) => {
    const totalIncome = incs.reduce((acc, inc) => acc + (inc.value || 0), 0);
    
    const incomeByMember: { [key: string]: number } = {};
    members.forEach(m => {
      incomeByMember[m.id] = incs
        .filter(inc => inc.memberId === m.id)
        .reduce((acc, inc) => acc + (inc.value || 0), 0);
    });

    const contributionPercentageByMember: { [key: string]: number } = {};
    if (totalIncome > 0) {
      Object.keys(incomeByMember).forEach(memberId => {
        contributionPercentageByMember[memberId] = (incomeByMember[memberId] / totalIncome) * 100;
      });
    }

    const totalTarget = gls.reduce((acc, g) => acc + (g.targetValue || 0), 0);
    const totalCurrent = gls.reduce((acc, g) => acc + (g.currentValue || 0), 0);
    const goalsProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    const alerts: FamilyFinancialAnalysis["alerts"] = [];
    if (totalIncome < 1000 && members.length > 1) {
      alerts.push({ type: "warning", message: "Renda familiar total baixa para o número de membros." });
    }

    Object.keys(contributionPercentageByMember).forEach(memberId => {
      if (contributionPercentageByMember[memberId] > 80) {
        const member = members.find(m => m.id === memberId);
        alerts.push({ type: "danger", message: `${member?.name || "Membro"} está sobrecarregado com mais de 80% da renda familiar.` });
      }
    });

    setFinancialAnalysis({
      totalIncome,
      incomeByMember,
      contributionPercentageByMember,
      distribution,
      goalsProgress,
      alerts
    });
  };

  const addMember = async (member: Omit<FamilyMember, "id" | "userId" | "createdAt">): Promise<string> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `fam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newMember: FamilyMember = {
      ...member,
      id: tempId,
      userId: uid,
      createdAt: nowIso
    };

    const currentList = getStoredFamily();
    const updatedList = [newMember, ...currentList.filter(m => m.id !== tempId)];
    saveStoredFamily(updatedList);
    setFamily(updatedList);

    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, "family"), {
          ...member,
          userId: auth.currentUser.uid,
          createdAt: nowIso
        });
        const firestoreId = docRef.id;
        const syncedList = getStoredFamily().map(m => m.id === tempId ? { ...m, id: firestoreId, userId: auth.currentUser!.uid } : m);
        saveStoredFamily(syncedList);
        setFamily(syncedList);
        return firestoreId;
      } catch (err) {
        console.warn("Notice: family member saved locally, Firestore sync notice:", err);
      }
    }

    return tempId;
  };

  const updateMember = async (id: string, memberUpdates: Partial<FamilyMember>) => {
    const currentList = getStoredFamily();
    const updatedList = currentList.map(m => m.id === id ? { ...m, ...memberUpdates, updatedAt: new Date().toISOString() } : m);
    saveStoredFamily(updatedList);
    setFamily(updatedList);

    if (auth.currentUser && !id.startsWith("fam_")) {
      try {
        await updateDoc(doc(db, "family", id), {
          ...memberUpdates,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn("Notice: Firestore updateMember notice:", err);
      }
    }
  };

  const deleteMember = async (id: string) => {
    const currentList = getStoredFamily();
    const updatedList = currentList.filter(m => m.id !== id);
    saveStoredFamily(updatedList);
    setFamily(updatedList);

    if (auth.currentUser && !id.startsWith("fam_")) {
      try {
        await deleteDoc(doc(db, "family", id));
      } catch (err) {
        console.warn("Notice: Firestore deleteMember notice:", err);
      }
    }
  };

  const addIncome = async (income: Omit<FamilyIncome, "id" | "userId" | "createdAt">): Promise<string> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `finc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newIncome: FamilyIncome = {
      ...income,
      id: tempId,
      userId: uid,
      createdAt: nowIso
    };

    const currentList = getStoredIncomes();
    const updatedList = [newIncome, ...currentList.filter(i => i.id !== tempId)];
    saveStoredIncomes(updatedList);
    setIncomes(updatedList);

    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, "family_incomes"), {
          ...income,
          userId: auth.currentUser.uid,
          createdAt: nowIso
        });
        const firestoreId = docRef.id;
        const syncedList = getStoredIncomes().map(i => i.id === tempId ? { ...i, id: firestoreId, userId: auth.currentUser!.uid } : i);
        saveStoredIncomes(syncedList);
        setIncomes(syncedList);
        return firestoreId;
      } catch (err) {
        console.warn("Notice: family income saved locally, Firestore sync notice:", err);
      }
    }

    return tempId;
  };

  const updateIncome = async (id: string, incomeUpdates: Partial<FamilyIncome>) => {
    const currentList = getStoredIncomes();
    const updatedList = currentList.map(i => i.id === id ? { ...i, ...incomeUpdates } : i);
    saveStoredIncomes(updatedList);
    setIncomes(updatedList);

    if (auth.currentUser && !id.startsWith("finc_")) {
      try {
        await updateDoc(doc(db, "family_incomes", id), incomeUpdates);
      } catch (err) {
        console.warn("Notice: Firestore updateIncome notice:", err);
      }
    }
  };

  const deleteIncome = async (id: string) => {
    const currentList = getStoredIncomes();
    const updatedList = currentList.filter(i => i.id !== id);
    saveStoredIncomes(updatedList);
    setIncomes(updatedList);

    if (auth.currentUser && !id.startsWith("finc_")) {
      try {
        await deleteDoc(doc(db, "family_incomes", id));
      } catch (err) {
        console.warn("Notice: Firestore deleteIncome notice:", err);
      }
    }
  };

  const addGoal = async (goal: Omit<FamilyGoal, "id" | "userId" | "createdAt">): Promise<string> => {
    const uid = auth.currentUser?.uid || getActiveUserId();
    const tempId = `fgol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newGoal: FamilyGoal = {
      ...goal,
      id: tempId,
      userId: uid,
      createdAt: nowIso
    };

    const currentList = getStoredGoals();
    const updatedList = [newGoal, ...currentList.filter(g => g.id !== tempId)];
    saveStoredGoals(updatedList);
    setGoals(updatedList);

    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(db, "family_goals"), {
          ...goal,
          userId: auth.currentUser.uid,
          createdAt: nowIso
        });
        const firestoreId = docRef.id;
        const syncedList = getStoredGoals().map(g => g.id === tempId ? { ...g, id: firestoreId, userId: auth.currentUser!.uid } : g);
        saveStoredGoals(syncedList);
        setGoals(syncedList);
        return firestoreId;
      } catch (err) {
        console.warn("Notice: family goal saved locally, Firestore sync notice:", err);
      }
    }

    return tempId;
  };

  const updateGoal = async (id: string, goalUpdates: Partial<FamilyGoal>) => {
    const currentList = getStoredGoals();
    const updatedList = currentList.map(g => g.id === id ? { ...g, ...goalUpdates } : g);
    saveStoredGoals(updatedList);
    setGoals(updatedList);

    if (auth.currentUser && !id.startsWith("fgol_")) {
      try {
        await updateDoc(doc(db, "family_goals", id), goalUpdates);
      } catch (err) {
        console.warn("Notice: Firestore updateGoal notice:", err);
      }
    }
  };

  const deleteGoal = async (id: string) => {
    const currentList = getStoredGoals();
    const updatedList = currentList.filter(g => g.id !== id);
    saveStoredGoals(updatedList);
    setGoals(updatedList);

    if (auth.currentUser && !id.startsWith("fgol_")) {
      try {
        await deleteDoc(doc(db, "family_goals", id));
      } catch (err) {
        console.warn("Notice: Firestore deleteGoal notice:", err);
      }
    }
  };

  const updateDistribution = (newDist: FamilyDistribution) => {
    setDistribution(newDist);
  };

  return (
    <FamilyContext.Provider value={{ 
      family, incomes, goals, loading, analysis, financialAnalysis, 
      addMember, updateMember, deleteMember,
      addIncome, updateIncome, deleteIncome,
      addGoal, updateGoal, deleteGoal,
      updateDistribution
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
}
