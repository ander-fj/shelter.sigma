import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, Timestamp } from 'firebase/firestore';
import { Supplier } from '../types';

const COLLECTION_NAME = 'suppliers';

export const supplierService = {
  async addSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    try {
      const suppliersRef = collection(db, COLLECTION_NAME);
      const docRef = await addDoc(suppliersRef, {
        ...supplierData,
        createdAt: Timestamp.now()
      });

      const newSupplier: Supplier = {
        id: docRef.id,
        ...supplierData,
        createdAt: new Date()
      };

      console.log('✅ Fornecedor adicionado:', newSupplier);
      return newSupplier;
    } catch (error) {
      console.error('❌ Erro ao adicionar fornecedor:', error);
      throw error;
    }
  },

  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const suppliersRef = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(suppliersRef);

      const suppliers: Supplier[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          contact: data.contact,
          email: data.email,
          phone: data.phone,
          address: data.address,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      });

      console.log(`✅ ${suppliers.length} fornecedores carregados`);
      return suppliers;
    } catch (error) {
      console.error('❌ Erro ao carregar fornecedores:', error);
      throw error;
    }
  }
};
