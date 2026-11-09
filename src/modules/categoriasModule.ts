import { db, auth } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc, setDoc, deleteDoc, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { Category, SubCategory } from "../types";
import { handleFirestoreError, OperationType } from "../lib/error-handler";
import { cleanData } from "../lib/utils";

export const categorias = {
  async criarCategoria(userId: string, categoryData: Omit<Category, 'id'>) {
    try {
      const categoryRef = doc(collection(db, "categories"));
      const cleanCategoryData = cleanData(categoryData);
      const newCategory = { ...cleanCategoryData, id: categoryRef.id, userId };
      await setDoc(categoryRef, newCategory);
      return newCategory;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "categories");
      return null;
    }
  },

  async atualizarCategoria(categoryId: string, categoryData: Partial<Category>) {
    try {
      const categoryRef = doc(db, "categories", categoryId);
      const cleanCategoryData = cleanData(categoryData);
      await updateDoc(categoryRef, cleanCategoryData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${categoryId}`);
    }
  },

  async deletarCategoria(categoryId: string) {
    try {
      await deleteDoc(doc(db, "categories", categoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
    }
  },

  async criarSubCategoria(userId: string, subCategoryData: Omit<SubCategory, 'id'>) {
    try {
      const subCategoryRef = doc(collection(db, "subCategories"));
      const cleanSubCategoryData = cleanData(subCategoryData);
      const newSubCategory = { ...cleanSubCategoryData, id: subCategoryRef.id, userId };
      await setDoc(subCategoryRef, newSubCategory);
      return newSubCategory;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "subCategories");
      return null;
    }
  },

  async deletarSubCategoria(subCategoryId: string) {
    try {
      await deleteDoc(doc(db, "subCategories", subCategoryId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subCategories/${subCategoryId}`);
    }
  }
};
