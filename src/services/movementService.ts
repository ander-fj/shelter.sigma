import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  query, 
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { StockMovement } from '../types';

const MOVEMENTS_COLLECTION = 'movements';

// Helper function to detect Firebase permission errors
const isPermissionError = (error: any): boolean => {
  return error?.code === 'permission-denied' || 
         error?.message?.includes('permissions') ||
         error?.message?.includes('Missing or insufficient permissions');
};

// Converter Firestore document para StockMovement
const convertFirestoreToMovement = (doc: QueryDocumentSnapshot<DocumentData>): StockMovement => {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    previousStock: data.previousStock,
    newStock: data.newStock,
    reason: data.reason,
    batch: data.batch,
    userId: data.userId,
    notes: data.notes,
    price: data.price,
    newLocation: data.newLocation,
    transferData: data.transferData ? {
      ...data.transferData,
      sentAt: data.transferData.sentAt?.toDate() || new Date(),
      receivedAt: data.transferData.receivedAt?.toDate(),
      rejectedAt: data.transferData.rejectedAt?.toDate(),
      expectedDeliveryDate: data.transferData.expectedDeliveryDate?.toDate(),
      actualDeliveryDate: data.transferData.actualDeliveryDate?.toDate(),
    } : undefined,
    obra: data.obra,
    notaFiscal: data.notaFiscal,
    attachments: data.attachments,
    // Campos de aprovação
    approvalStatus: data.approvalStatus,
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt?.toDate(),
    approvalNotes: data.approvalNotes,
    classifications: data.classifications || [],
    createdAt: data.createdAt?.toDate() || new Date(),
  };
};

// Converter StockMovement para Firestore document
const convertMovementToFirestore = (movement: Omit<StockMovement, 'id'>) => {
  console.log('🔄 [CONVERT] Convertendo movimento para Firestore:', {
    type: movement.type,
    hasTransferData: !!movement.transferData,
    transferData: movement.transferData
  });

  return {
    productId: movement.productId,
    type: movement.type,
    quantity: movement.quantity,
    previousStock: movement.previousStock,
    newStock: movement.newStock,
    reason: movement.reason,
    batch: movement.batch || null,
    userId: movement.userId,
    notes: movement.notes || null,
    price: movement.price || null,
    newLocation: movement.newLocation || null,
    transferData: movement.transferData ? {
      fromWarehouse: movement.transferData.fromWarehouse,
      toWarehouse: movement.transferData.toWarehouse,
      transferStatus: movement.transferData.transferStatus,
      sentBy: movement.transferData.sentBy,
      sentAt: movement.transferData.sentAt ? Timestamp.fromDate(movement.transferData.sentAt) : Timestamp.now(),
      receivedBy: movement.transferData.receivedBy || null,
      receivedAt: movement.transferData.receivedAt ? Timestamp.fromDate(movement.transferData.receivedAt) : null,
      rejectedBy: movement.transferData.rejectedBy || null,
      rejectedAt: movement.transferData.rejectedAt ? Timestamp.fromDate(movement.transferData.rejectedAt) : null,
      rejectionReason: movement.transferData.rejectionReason || null,
      trackingCode: movement.transferData.trackingCode,
      expectedDeliveryDate: movement.transferData.expectedDeliveryDate ? Timestamp.fromDate(movement.transferData.expectedDeliveryDate) : null,
      actualDeliveryDate: movement.transferData.actualDeliveryDate ? Timestamp.fromDate(movement.transferData.actualDeliveryDate) : null,
      transportNotes: movement.transferData.transportNotes || null
    } : null,
    obra: movement.obra || null,
    notaFiscal: movement.notaFiscal || null,
    attachments: movement.attachments || null,
    // Campos de aprovação
    approvalStatus: movement.approvalStatus || null,
    approvedBy: movement.approvedBy || null,
    approvedAt: movement.approvedAt ? Timestamp.fromDate(movement.approvedAt) : null,
    approvalNotes: movement.approvalNotes || null,
    classifications: movement.classifications || [],
    createdAt: movement.createdAt ? Timestamp.fromDate(movement.createdAt) : Timestamp.now(),
  };

};

export const movementService = {
  // Buscar todas as movimentações
  async getAllMovements(): Promise<StockMovement[]> {
    try {
      console.log('Carregando movimentações do Firebase...');
      const q = query(collection(db, MOVEMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const movements = querySnapshot.docs.map(convertFirestoreToMovement);
      console.log(`${movements.length} movimentações carregadas do Firebase`);
      return movements;
    } catch (error) {
      console.warn('Erro ao buscar movimentações do Firebase:', error);
      
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes no Firebase - usando dados locais');
        return [];
      }
      
      console.warn('Falha ao carregar movimentações do Firebase - continuando em modo local');
      return [];
    }
  },

  // Criar nova movimentação
  async createMovement(movementData: Omit<StockMovement, 'id' | 'createdAt'>): Promise<string> {
    try {
      console.log('Criando movimentação no Firebase:', movementData.type);
      const movementToCreate = {
        ...movementData,
        createdAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, MOVEMENTS_COLLECTION), convertMovementToFirestore(movementToCreate));
      console.log('Movimentação criada no Firebase com ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      if (isPermissionError(error)) {
        console.warn('Firebase permissions not configured - using local mode:', error);
      } else {
        console.error('Erro ao criar movimentação:', error);
      }
      // Em caso de erro, retornar ID local para continuar funcionamento
      const localId = `local_${Date.now()}`;
      console.log('Usando ID local para movimentação:', localId);
      return localId;
    }
  },

  // Atualizar movimentação existente
  async updateMovement(movementId: string, updates: Partial<StockMovement>): Promise<void> {
    try {
      console.log('Atualizando movimentação no Firebase:', movementId, updates);
      
      // Sempre tentar atualizar no Firebase quando online
      const updateData: any = { ...updates };
      
      // Converter datas para Timestamp do Firebase
      if (updateData.approvedAt && updateData.approvedAt instanceof Date) {
        updateData.approvedAt = Timestamp.fromDate(updateData.approvedAt);
      }
      
      if (updateData.createdAt && updateData.createdAt instanceof Date) {
        updateData.createdAt = Timestamp.fromDate(updateData.createdAt);
      }

      // Garantir que campos nulos sejam tratados corretamente
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          updateData[key] = null;
        }
      });
      
      const docRef = doc(db, MOVEMENTS_COLLECTION, movementId);
      await setDoc(docRef, updateData, { merge: true });
      
      console.log('✅ Movimentação atualizada no Firebase com sucesso');
      
      // Aguardar um pouco para garantir que Firebase foi atualizado
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      if (isPermissionError(error)) {
        console.warn('Firebase permissions not configured - continuing with local operation:', error);
        // Não falhar para erros de permissão - continuar operação local
        return;
      } else {
        console.error('Erro ao atualizar movimentação no Firebase:', error);
        // Para outros erros, também continuar localmente
        console.warn('Continuando com operação local devido a erro no Firebase');
      }
    }
  },

  // Configurar listener em tempo real para movimentações
  setupRealtimeListener(callback: (movements: StockMovement[]) => void): () => void {
    try {
      console.log('Configurando listener em tempo real para movimentações...');
      const q = query(collection(db, MOVEMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            console.log('Movimentações atualizadas em tempo real:', snapshot.size);
            const movements = snapshot.docs.map(convertFirestoreToMovement);
            
            // Log approval status for debugging
            const approvedMovements = movements.filter(m => m.approvalStatus === 'approved');
            console.log(`📋 Movimentações aprovadas carregadas: ${approvedMovements.length}`);
            approvedMovements.forEach(m => {
              console.log(`  - ${m.reason} (${m.approvalStatus}) - Aprovado por: ${m.approvedBy} em ${m.approvedAt ? m.approvedAt.toLocaleString() : 'N/A'}`);
            });
            
            callback(movements);
          } catch (error) {
            console.error('Erro ao processar dados do snapshot de movimentações:', error);
            callback([]);
          }
        },
        (error) => {
          console.warn('Erro no listener de movimentações:', error?.message || error);
          
          if (isPermissionError(error)) {
            console.warn('Firebase: Permissões insuficientes para movimentações - continuando em modo local');
          } else {
            console.warn('Firebase: Erro de conexão para movimentações - continuando em modo local');
          }
          
          // Em caso de erro, retornar array vazio
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener de movimentações:', error?.message || error);
      
      // Retornar função vazia se falhar
      callback([]);
      return () => {};
    }
  }
};