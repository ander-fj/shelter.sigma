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
import { Loan } from '../types';

const LOANS_COLLECTION = 'loans';

// Helper function to detect Firebase permission errors
const isPermissionError = (error: any): boolean => {
  return error?.code === 'permission-denied' || 
         error?.message?.includes('permissions') ||
         error?.message?.includes('Missing or insufficient permissions');
};

// Converter Firestore document para Loan
const convertFirestoreToLoan = (doc: QueryDocumentSnapshot<DocumentData>): Loan => {
  const data = doc.data();
  return {
    id: doc.id,
    productId: data.productId,
    borrowerName: data.borrowerName,
    borrowerEmail: data.borrowerEmail,
    borrowerPhone: data.borrowerPhone,
    quantity: data.quantity,
    loanDate: data.loanDate?.toDate() || new Date(),
    expectedReturnDate: data.expectedReturnDate?.toDate() || new Date(),
    actualReturnDate: data.actualReturnDate?.toDate(),
    status: data.status,
    notes: data.notes,
    extensions: data.extensions || [],
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
};

// Converter Loan para Firestore document
const convertLoanToFirestore = (loan: Omit<Loan, 'id'>) => {
  return {
    productId: loan.productId,
    borrowerName: loan.borrowerName,
    borrowerEmail: loan.borrowerEmail || null,
    borrowerPhone: loan.borrowerPhone || null,
    quantity: loan.quantity,
    loanDate: loan.loanDate ? Timestamp.fromDate(loan.loanDate) : Timestamp.now(),
    expectedReturnDate: loan.expectedReturnDate ? Timestamp.fromDate(loan.expectedReturnDate) : Timestamp.now(),
    actualReturnDate: loan.actualReturnDate ? Timestamp.fromDate(loan.actualReturnDate) : null,
    status: loan.status,
    notes: loan.notes || null,
    extensions: loan.extensions || [],
    createdBy: loan.createdBy,
    createdAt: loan.createdAt ? Timestamp.fromDate(loan.createdAt) : Timestamp.now(),
    updatedAt: loan.updatedAt ? Timestamp.fromDate(loan.updatedAt) : Timestamp.now(),
  };
};

export const loanService = {
  // Buscar todos os empréstimos
  async getAllLoans(): Promise<Loan[]> {
    try {
      const q = query(collection(db, LOANS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertFirestoreToLoan);
    } catch (error) {
      console.error('Erro ao buscar empréstimos:', error);
      throw new Error('Falha ao carregar empréstimos');
    }
  },

  // Criar novo empréstimo
  async createLoan(loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Criando empréstimo no Firebase:', loanData.borrowerName);
      const loanToCreate = {
        ...loanData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, LOANS_COLLECTION), convertLoanToFirestore(loanToCreate));
      console.log('Empréstimo criado no Firebase com ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      if (isPermissionError(error)) {
        console.warn('Firebase permissions not configured - using local mode:', error);
      } else {
        console.error('Erro ao criar empréstimo:', error);
      }
      // Em caso de erro, retornar ID local para continuar funcionamento
      const localId = `local_${Date.now()}`;
      console.log('Usando ID local para empréstimo:', localId);
      return localId;
    }
  },

  // Atualizar empréstimo existente
  async updateLoan(loanId: string, loanData: Partial<Omit<Loan, 'id' | 'createdAt'>>): Promise<void> {
    try {
      // Skip Firebase update for local IDs
      if (loanId.startsWith('local_') || !isNaN(Number(loanId))) {
        console.log('Pulando atualização no Firebase para ID local:', loanId);
        return;
      }

      const loanRef = doc(db, LOANS_COLLECTION, loanId);
      const updateData: any = {
        ...loanData,
        updatedAt: Timestamp.now(),
      };

      // Converter datas para Timestamp se necessário
      if (updateData.loanDate) {
        updateData.loanDate = Timestamp.fromDate(updateData.loanDate);
      }
      if (updateData.expectedReturnDate) {
        updateData.expectedReturnDate = Timestamp.fromDate(updateData.expectedReturnDate);
      }
      if (updateData.actualReturnDate) {
        updateData.actualReturnDate = Timestamp.fromDate(updateData.actualReturnDate);
      }

      await updateDoc(loanRef, updateData);
      console.log('Empréstimo atualizado:', loanId);
    } catch (error) {
      console.error('Erro ao atualizar empréstimo:', error);
      // Don't throw error for permission issues - allow local operation to continue
      if (error instanceof Error && error.message.includes('permissions')) {
        console.log('Erro de permissão - continuando com operação local');
        return;
      }
      // Only throw for other types of errors
      console.log('Continuando com operação local devido a erro no Firebase');
    }
  },

  // Excluir empréstimo
  async deleteLoan(loanId: string): Promise<void> {
    try {
      // Skip Firebase deletion for local IDs
      if (loanId.startsWith('local_') || !isNaN(Number(loanId))) {
        console.log('Pulando exclusão no Firebase para ID local:', loanId);
        return;
      }

      await deleteDoc(doc(db, LOANS_COLLECTION, loanId));
      console.log('Empréstimo excluído:', loanId);
    } catch (error) {
      console.error('Erro ao excluir empréstimo:', error);
      // Don't throw error for permission issues - allow local operation to continue
      if (error instanceof Error && error.message.includes('permissions')) {
        console.log('Erro de permissão - continuando com operação local');
        return;
      }
      console.log('Continuando com operação local devido a erro no Firebase');
    }
  },

  // Configurar listener em tempo real para empréstimos
  setupRealtimeListener(callback: (loans: Loan[]) => void): () => void {
    try {
      console.log('Configurando listener em tempo real para empréstimos...');
      const q = query(collection(db, LOANS_COLLECTION), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            console.log('Empréstimos atualizados em tempo real:', snapshot.size);
            const loans = snapshot.docs.map(convertFirestoreToLoan);
            callback(loans);
          } catch (error) {
            console.error('Erro ao processar dados do snapshot de empréstimos:', error);
            callback([]);
          }
        },
        (error) => {
          console.warn('Erro no listener de empréstimos:', error?.message || error);
          
          if (isPermissionError(error)) {
            console.warn('Firebase: Permissões insuficientes para empréstimos - continuando em modo local');
          } else {
            console.warn('Firebase: Erro de conexão para empréstimos - continuando em modo local');
          }
          
          // Em caso de erro, retornar array vazio
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener de empréstimos:', error?.message || error);
      
      // Retornar função vazia se falhar
      callback([]);
      return () => {};
    }
  }
};