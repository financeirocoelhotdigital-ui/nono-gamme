import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Category, SubCategory, Tag } from "../types";
import { db, auth } from "../lib/firebase";
import { collection, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { initializeDefaultCategories } from "../services/categoryService";

const LOCAL_CATEGORIES_KEY = "finance_local_categories_v2";
const LOCAL_SUBCATEGORIES_KEY = "finance_local_subcategories_v2";
const LOCAL_TAGS_KEY = "finance_local_tags_v2";

const DEFAULT_EXPENSE_CATS: Category[] = [
  { id: "cat_exp_1", userId: "default", name: "Alimentação", type: "expense", icon: "Utensils", color: "#EF4444", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_2", userId: "default", name: "Moradia", type: "expense", icon: "Home", color: "#3B82F6", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_3", userId: "default", name: "Transporte", type: "expense", icon: "Car", color: "#F59E0B", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_4", userId: "default", name: "Saúde", type: "expense", icon: "HeartPulse", color: "#10B981", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_5", userId: "default", name: "Educação", type: "expense", icon: "GraduationCap", color: "#8B5CF6", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_6", userId: "default", name: "Lazer", type: "expense", icon: "Gamepad2", color: "#EC4899", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_7", userId: "default", name: "Compras", type: "expense", icon: "ShoppingBag", color: "#6366F1", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_8", userId: "default", name: "Assinaturas", type: "expense", icon: "CreditCard", color: "#14B8A6", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_9", userId: "default", name: "Dívidas", type: "expense", icon: "Banknote", color: "#64748B", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_10", userId: "default", name: "Impostos", type: "expense", icon: "FileText", color: "#475569", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_exp_11", userId: "default", name: "Outros", type: "expense", icon: "MoreHorizontal", color: "#94A3B8", isDefault: true, createdAt: new Date().toISOString() },
];

const DEFAULT_INCOME_CATS: Category[] = [
  { id: "cat_inc_1", userId: "default", name: "Salário", type: "income", icon: "Briefcase", color: "#10B981", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_inc_2", userId: "default", name: "Freelance", type: "income", icon: "Laptop", color: "#3B82F6", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_inc_3", userId: "default", name: "Vendas", type: "income", icon: "Tag", color: "#F59E0B", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_inc_4", userId: "default", name: "Investimentos", type: "income", icon: "TrendingUp", color: "#8B5CF6", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_inc_5", userId: "default", name: "Comissão", type: "income", icon: "Percent", color: "#F43F5E", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_inc_6", userId: "default", name: "Aluguel recebido", type: "income", icon: "Key", color: "#6366F1", isDefault: true, createdAt: new Date().toISOString() },
  { id: "cat_inc_7", userId: "default", name: "Outros", type: "income", icon: "MoreHorizontal", color: "#94A3B8", isDefault: true, createdAt: new Date().toISOString() },
];

export function deduplicateCategories(cats: Category[]): Category[] {
  if (!Array.isArray(cats)) return [];
  const map = new Map<string, Category>();
  for (const cat of cats) {
    if (!cat || !cat.name) continue;
    const key = `${cat.name.toLowerCase().trim()}_${cat.type || "expense"}`;
    if (!map.has(key)) {
      map.set(key, cat);
    } else {
      // If previous was a temporary local id and current is from firestore, prefer firestore
      const existing = map.get(key)!;
      if (existing.id.startsWith("cat_local_") && !cat.id.startsWith("cat_local_")) {
        map.set(key, cat);
      }
    }
  }
  return Array.from(map.values());
}

export function deduplicateSubCategories(subs: SubCategory[]): SubCategory[] {
  if (!Array.isArray(subs)) return [];
  const map = new Map<string, SubCategory>();
  for (const sub of subs) {
    if (!sub || !sub.name) continue;
    const key = `${sub.parentCategoryId || ""}_${sub.name.toLowerCase().trim()}`;
    if (!map.has(key)) {
      map.set(key, sub);
    }
  }
  return Array.from(map.values());
}

export function getStoredCategories(): Category[] {
  try {
    const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return deduplicateCategories(parsed);
      }
    }
  } catch (e) {
    console.warn("Error loading stored categories:", e);
  }
  const defaultList = deduplicateCategories([...DEFAULT_EXPENSE_CATS, ...DEFAULT_INCOME_CATS]);
  try {
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(defaultList));
  } catch {}
  return defaultList;
}

export function saveStoredCategories(cats: Category[]) {
  try {
    const deduped = deduplicateCategories(cats);
    localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(deduped));
    window.dispatchEvent(new CustomEvent("local_categories_changed"));
  } catch (e) {
    console.warn("Error saving categories:", e);
  }
}

export function getStoredSubCategories(): SubCategory[] {
  try {
    const saved = localStorage.getItem(LOCAL_SUBCATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Error loading stored subcategories:", e);
  }
  return [];
}

export function saveStoredSubCategories(subs: SubCategory[]) {
  try {
    localStorage.setItem(LOCAL_SUBCATEGORIES_KEY, JSON.stringify(subs));
    window.dispatchEvent(new CustomEvent("local_subcategories_changed"));
  } catch (e) {
    console.warn("Error saving subcategories:", e);
  }
}

interface CategoriasContextType {
  categories: Category[];
  subCategories: SubCategory[];
  tags: Tag[];
  loading: boolean;
  addCategory: (catData: Omit<Category, "id" | "createdAt">) => Promise<Category>;
  addSubCategory: (subData: Omit<SubCategory, "id" | "createdAt">) => Promise<SubCategory>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategory: (categoryId: string, data: Partial<Category>) => Promise<void>;
}

const CategoriasContext = createContext<CategoriasContextType | undefined>(undefined);

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(getStoredCategories);
  const [subCategories, setSubCategories] = useState<SubCategory[]>(getStoredSubCategories);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setCategories(getStoredCategories());
      setSubCategories(getStoredSubCategories());
    };

    window.addEventListener("local_categories_changed", handleStorageChange);
    window.addEventListener("local_subcategories_changed", handleStorageChange);

    return () => {
      window.removeEventListener("local_categories_changed", handleStorageChange);
      window.removeEventListener("local_subcategories_changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let unsubCat: (() => void) | null = null;
    let unsubSub: (() => void) | null = null;
    let unsubTags: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubCat) unsubCat();
      if (unsubSub) unsubSub();
      if (unsubTags) unsubTags();

      if (user) {
        const handleCatSnapshot = (snap: any) => {
          if (snap.empty) {
            initializeDefaultCategories(user.uid);
          } else {
            const list = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Category));
            const localList = getStoredCategories();
            const merged = deduplicateCategories([...list, ...localList]);
            merged.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            setCategories(merged);
            saveStoredCategories(merged);
          }
        };

        const setupCatListener = () => {
          try {
            unsubCat = onSnapshot(
              query(collection(db, "categories"), where("userId", "==", user.uid)),
              handleCatSnapshot,
              (err) => console.warn("Notice: Categories Firestore snapshot fallback:", err)
            );
          } catch (e) {
            console.error("Error setting up categories listener:", e);
          }
        };

        setupCatListener();

        const handleSubSnapshot = (snap: any) => {
          const list = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as SubCategory));
          const localList = getStoredSubCategories();
          const merged = deduplicateSubCategories([...list, ...localList]);
          merged.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setSubCategories(merged);
          saveStoredSubCategories(merged);
        };

        try {
          unsubSub = onSnapshot(
            query(collection(db, "subCategories"), where("userId", "==", user.uid)),
            handleSubSnapshot,
            (err) => console.warn("Notice: SubCategories Firestore snapshot fallback:", err)
          );
        } catch (e) {}

      } else {
        // Unauthenticated / Guest Mode -> retain stored categories & subcategories
        setCategories(getStoredCategories());
        setSubCategories(getStoredSubCategories());
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubCat) unsubCat();
      if (unsubSub) unsubSub();
      if (unsubTags) unsubTags();
    };
  }, []);

  const addCategoryHandler = async (catData: Omit<Category, "id" | "createdAt">): Promise<Category> => {
    const newId = `cat_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCat: Category = {
      ...catData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    const currentCats = getStoredCategories();
    // Check duplicate name
    const existing = currentCats.find(c => c.name.toLowerCase() === catData.name.toLowerCase() && c.type === catData.type);
    if (existing) {
      return existing;
    }

    const updatedCats = [newCat, ...currentCats];
    setCategories(updatedCats);
    saveStoredCategories(updatedCats);

    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        const docRef = await addDoc(collection(db, "categories"), {
          ...catData,
          userId: uid,
          createdAt: new Date().toISOString()
        });
        const firestoreCat = { ...newCat, id: docRef.id, userId: uid };
        const finalCats = updatedCats.map(c => c.id === newId ? firestoreCat : c);
        setCategories(finalCats);
        saveStoredCategories(finalCats);
        return firestoreCat;
      } catch (err) {
        console.warn("Notice: Category saved locally, Firestore sync pending:", err);
      }
    }

    return newCat;
  };

  const addSubCategoryHandler = async (subData: Omit<SubCategory, "id" | "createdAt">): Promise<SubCategory> => {
    const newId = `sub_local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSub: SubCategory = {
      ...subData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    const currentSubs = getStoredSubCategories();
    const updatedSubs = [newSub, ...currentSubs];
    setSubCategories(updatedSubs);
    saveStoredSubCategories(updatedSubs);

    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        const docRef = await addDoc(collection(db, "subCategories"), {
          ...subData,
          userId: uid,
          createdAt: new Date().toISOString()
        });
        const firestoreSub = { ...newSub, id: docRef.id, userId: uid };
        const finalSubs = updatedSubs.map(s => s.id === newId ? firestoreSub : s);
        setSubCategories(finalSubs);
        saveStoredSubCategories(finalSubs);
        return firestoreSub;
      } catch (err) {
        console.warn("Notice: SubCategory saved locally, Firestore sync pending:", err);
      }
    }

    return newSub;
  };

  const deleteCategoryHandler = async (categoryId: string): Promise<void> => {
    const currentCats = getStoredCategories().filter(c => c.id !== categoryId);
    setCategories(currentCats);
    saveStoredCategories(currentCats);

    if (auth.currentUser?.uid && !categoryId.startsWith("cat_local_")) {
      try {
        await deleteDoc(doc(db, "categories", categoryId));
      } catch (err) {
        console.warn("Notice: Failed to delete category in Firestore:", err);
      }
    }
  };

  const updateCategoryHandler = async (categoryId: string, data: Partial<Category>): Promise<void> => {
    const currentCats = getStoredCategories().map(c => c.id === categoryId ? { ...c, ...data } : c);
    setCategories(currentCats);
    saveStoredCategories(currentCats);

    if (auth.currentUser?.uid && !categoryId.startsWith("cat_local_")) {
      try {
        await updateDoc(doc(db, "categories", categoryId), data);
      } catch (err) {
        console.warn("Notice: Failed to update category in Firestore:", err);
      }
    }
  };

  return (
    <CategoriasContext.Provider value={{ 
      categories, 
      subCategories, 
      tags, 
      loading,
      addCategory: addCategoryHandler,
      addSubCategory: addSubCategoryHandler,
      deleteCategory: deleteCategoryHandler,
      updateCategory: updateCategoryHandler
    }}>
      {children}
    </CategoriasContext.Provider>
  );
}

export function useCategorias() {
  const context = useContext(CategoriasContext);
  if (context === undefined) {
    throw new Error("useCategorias must be used within a CategoriasProvider");
  }
  return context;
}

