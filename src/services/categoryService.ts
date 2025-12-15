import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, Timestamp } from 'firebase/firestore';
import { Category } from '../types';

const COLLECTION_NAME = 'categories';

export const categoryService = {
  async addCategory(categoryData: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    try {
      const categoriesRef = collection(db, COLLECTION_NAME);
      const docRef = await addDoc(categoriesRef, {
        ...categoryData,
        createdAt: Timestamp.now()
      });

      const newCategory: Category = {
        id: docRef.id,
        ...categoryData,
        createdAt: new Date()
      };

      console.log('✅ Categoria adicionada:', newCategory);
      return newCategory;
    } catch (error) {
      console.error('❌ Erro ao adicionar categoria:', error);
      throw error;
    }
  },

  async getAllCategories(): Promise<Category[]> {
    try {
      const categoriesRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(categoriesRef);

      const categories: Category[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          color: data.color,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });

      console.log(`✅ ${categories.length} categorias carregadas`);
      return categories;
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      throw error;
    }
  }
};
