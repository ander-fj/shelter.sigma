import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product } from '../types';

const PRODUCTS_COLLECTION = 'products';

// Converter Firestore document para Product
const convertFirestoreToProduct = (doc: QueryDocumentSnapshot<DocumentData>): Product => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    sku: data.sku,
    barcode: data.barcode,
    category: data.category,
    supplier: data.supplier,
    purchasePrice: data.purchasePrice,
    salePrice: data.salePrice,
    unit: data.unit,
    location: data.location,
    currentStock: data.currentStock,
    minStock: data.minStock,
    maxStock: data.maxStock,
    batch: data.batch,
    expiryDate: data.expiryDate?.toDate(),
    images: data.images || [],
    isActive: data.isActive,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

// Converter Product para Firestore document
const convertProductToFirestore = (product: Omit<Product, 'id'>) => {
  return {
    name: product.name,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode || null,
    category: product.category,
    supplier: {
      ...product.supplier,
      email: product.supplier.email || null,
      phone: product.supplier.phone || null,
      address: product.supplier.address || null,
    },
    purchasePrice: product.purchasePrice,
    salePrice: product.salePrice,
    unit: product.unit,
    location: product.location,
    currentStock: product.currentStock,
    minStock: product.minStock,
    maxStock: product.maxStock || null,
    batch: product.batch || null,
    expiryDate: product.expiryDate ? Timestamp.fromDate(product.expiryDate) : null,
    images: product.images,
    isActive: product.isActive,
    createdAt: product.createdAt ? Timestamp.fromDate(product.createdAt) : Timestamp.now(),
    updatedAt: product.updatedAt ? Timestamp.fromDate(product.updatedAt) : Timestamp.now(),
  };
};

export const productService = {
  // Buscar todos os produtos
  async getAllProducts(): Promise<Product[]> {
    try {
      const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertFirestoreToProduct);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      throw new Error('Falha ao carregar produtos');
    }
  },

  // Criar novo produto
  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Criando produto no Firebase:', productData.name);
      const productToCreate = {
        ...productData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), convertProductToFirestore(productToCreate));
      console.log('Produto criado no Firebase com ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      // Provide more specific error information for permissions issues
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.error('Firebase Security Rules Error: Write access denied to products collection');
        console.error('To fix this, go to Firebase Console > Firestore Database > Rules and update security rules');
        throw new Error('Erro de permissão do Firebase: Acesso negado para criar produto. Verifique as regras de segurança no Firebase Console.');
      }
      console.error('Erro ao criar produto:', error);
      throw new Error('Falha ao criar produto');
    }
  },

  // Atualizar produto existente
  async updateProduct(productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>): Promise<void> {
    try {
      const productRef = doc(db, PRODUCTS_COLLECTION, productId);
      const updateData: any = {
        ...productData,
        updatedAt: Timestamp.now(),
      };

      // Converter datas para Timestamp se necessário
      if (updateData.expiryDate) {
        updateData.expiryDate = Timestamp.fromDate(updateData.expiryDate);
      }

      await updateDoc(productRef, updateData);
      console.log('Produto atualizado:', productId);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw new Error('Falha ao atualizar produto');
    }
  },

  // Excluir produto
  async deleteProduct(productId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
      console.log('Produto excluído:', productId);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      throw new Error('Falha ao excluir produto');
    }
  },

  // Configurar listener em tempo real para produtos
  setupRealtimeListener(callback: (products: Product[]) => void): () => void {
    try {
      console.log('Configurando listener em tempo real para produtos...');
      const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            console.log('Produtos atualizados em tempo real:', snapshot.size);
            const products = snapshot.docs.map(convertFirestoreToProduct);
            callback(products);
          } catch (error) {
            console.error('Erro ao processar dados do snapshot de produtos:', error);
            callback([]);
          }
        },
        (error) => {
          console.warn('Erro no listener de produtos:', error?.message || error);
          
          if (error?.code === 'permission-denied') {
            console.warn('Firebase: Permissões insuficientes para produtos - continuando em modo local');
          } else {
            console.warn('Firebase: Erro de conexão para produtos - continuando em modo local');
          }
          
          // Em caso de erro, retornar array vazio
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener de produtos:', error?.message || error);
      
      // Retornar função vazia se falhar
      callback([]);
      return () => {};
    }
  }
};