import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  writeBatch, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy,
  increment
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Category, SubCategory, Tag } from "../types";
import { getActiveUserId } from "../lib/authUtils";

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Alimentação", icon: "Utensils", color: "#EF4444" },
  { name: "Moradia", icon: "Home", color: "#3B82F6" },
  { name: "Transporte", icon: "Car", color: "#F59E0B" },
  { name: "Saúde", icon: "HeartPulse", color: "#10B981" },
  { name: "Educação", icon: "GraduationCap", color: "#8B5CF6" },
  { name: "Lazer", icon: "Gamepad2", color: "#EC4899" },
  { name: "Compras", icon: "ShoppingBag", color: "#6366F1" },
  { name: "Assinaturas", icon: "CreditCard", color: "#14B8A6" },
  { name: "Dívidas", icon: "Banknote", color: "#64748B" },
  { name: "Impostos", icon: "FileText", color: "#475569" },
  { name: "Outros", icon: "MoreHorizontal", color: "#94A3B8" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salário", icon: "Briefcase", color: "#10B981" },
  { name: "Freelance", icon: "Laptop", color: "#3B82F6" },
  { name: "Vendas", icon: "Tag", color: "#F59E0B" },
  { name: "Investimentos", icon: "TrendingUp", color: "#8B5CF6" },
  { name: "Comissão", icon: "Percent", color: "#F43F5E" },
  { name: "Aluguel recebido", icon: "Key", color: "#6366F1" },
  { name: "Outros", icon: "MoreHorizontal", color: "#94A3B8" },
];

export const initializeDefaultCategories = async (userId: string) => {
  const categoriesRef = collection(db, "categories");
  const q = query(categoriesRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    const batch = writeBatch(db);

    DEFAULT_EXPENSE_CATEGORIES.forEach((cat) => {
      const newDocRef = doc(categoriesRef);
      batch.set(newDocRef, {
        ...cat,
        userId,
        type: "expense",
        isDefault: true,
        createdAt: new Date().toISOString(),
      });
    });

    DEFAULT_INCOME_CATEGORIES.forEach((cat) => {
      const newDocRef = doc(categoriesRef);
      batch.set(newDocRef, {
        ...cat,
        userId,
        type: "income",
        isDefault: true,
        createdAt: new Date().toISOString(),
      });
    });

    await batch.commit();
  }
};

export const getCategories = async (userId: string, type?: "income" | "expense"): Promise<Category[]> => {
  const categoriesRef = collection(db, "categories");
  let q = query(categoriesRef, where("userId", "==", userId), orderBy("name", "asc"));
  
  if (type) {
    q = query(categoriesRef, where("userId", "==", userId), where("type", "==", type), orderBy("name", "asc"));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
};

export const getSubCategories = async (userId: string, parentCategoryId?: string): Promise<SubCategory[]> => {
  const subCategoriesRef = collection(db, "subCategories");
  let q = query(subCategoriesRef, where("userId", "==", userId), orderBy("name", "asc"));
  
  if (parentCategoryId) {
    q = query(subCategoriesRef, where("userId", "==", userId), where("parentCategoryId", "==", parentCategoryId), orderBy("name", "asc"));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubCategory));
};

export const getTags = async (userId: string): Promise<Tag[]> => {
  const tagsRef = collection(db, "tags");
  const q = query(tagsRef, where("userId", "==", userId), orderBy("usageCount", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
};

export const addCategory = async (category: Omit<Category, "id" | "createdAt">) => {
  return addDoc(collection(db, "categories"), {
    ...category,
    createdAt: new Date().toISOString(),
  });
};

export const addSubCategory = async (subCategory: Omit<SubCategory, "id" | "createdAt">) => {
  return addDoc(collection(db, "subCategories"), {
    ...subCategory,
    createdAt: new Date().toISOString(),
  });
};

export const addOrUpdateTag = async (userId: string, tagName: string) => {
  const tagsRef = collection(db, "tags");
  const q = query(tagsRef, where("userId", "==", userId), where("name", "==", tagName));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return addDoc(tagsRef, {
      userId,
      name: tagName,
      usageCount: 1,
      createdAt: new Date().toISOString(),
    });
  } else {
    const tagDoc = snapshot.docs[0];
    return updateDoc(doc(db, "tags", tagDoc.id), {
      usageCount: increment(1),
    });
  }
};

export const deleteCategory = async (categoryId: string) => {
  const userId = auth.currentUser?.uid || getActiveUserId();

  if (auth.currentUser) {
    try {
      // Also delete subcategories
      const subCategoriesRef = collection(db, "subCategories");
      const q = query(
        subCategoriesRef, 
        where("userId", "==", userId), 
        where("parentCategoryId", "==", categoryId)
      );
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      batch.delete(doc(db, "categories", categoryId));
      
      await batch.commit();
    } catch (e) {
      console.warn("Notice: Firestore deleteCategory sync warning:", e);
    }
  }
};

export const updateCategory = async (categoryId: string, data: Partial<Category>) => {
  return updateDoc(doc(db, "categories", categoryId), data);
};

export const updateSubCategory = async (subCategoryId: string, data: Partial<SubCategory>) => {
  return updateDoc(doc(db, "subCategories", subCategoryId), data);
};

export const deleteSubCategory = async (subCategoryId: string) => {
  return deleteDoc(doc(db, "subCategories", subCategoryId));
};
