import { parseISO, isValid } from 'date-fns';
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
import { InventorySchedule, InventoryCount } from '../types';

const SCHEDULES_COLLECTION = 'inventory_schedules';

// Helper function to safely convert date strings to Date objects
const safeParseDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  
  // Handle Firebase Timestamp objects
  if (dateValue && typeof dateValue.toDate === 'function') {
    try {
      return dateValue.toDate();
    } catch {
      return new Date();
    }
  }
  
  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : new Date();
  }
  
  if (typeof dateValue === 'string') {
    if (dateValue.trim() === '') return new Date();
    
    // Try parseISO for ISO strings
    if (dateValue.includes('-') || dateValue.includes('T')) {
      const parsed = parseISO(dateValue);
      if (isValid(parsed)) return parsed;
    }
    
    // Fallback to new Date()
    const fallback = new Date(dateValue);
    return isValid(fallback) ? fallback : new Date();
  }
  
  if (typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isValid(parsed) ? parsed : new Date();
  }
  
  return new Date();
};
// Helper function to detect Firebase permission errors
const isPermissionError = (error: any): boolean => {
  return error?.code === 'permission-denied' || 
         error?.message?.includes('permissions') ||
         error?.message?.includes('Missing or insufficient permissions');
};

// Converter Firestore document para InventorySchedule
const convertFirestoreToSchedule = (doc: QueryDocumentSnapshot<DocumentData>): InventorySchedule => {
  const data = doc.data();
  
  // Helper function to safely convert any value to string
  const safeStringConvert = (value: any): string => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') {
      // Try common property names first
      if (value.name) return String(value.name);
      if (value.warehouse) return String(value.warehouse);
      if (value.sector) return String(value.sector);
      // Fallback to JSON string representation
      try {
        return JSON.stringify(value);
      } catch {
        return 'N/A';
      }
    }
    return String(value);
  };

  return {
    id: doc.id,
    name: data.name,
    code: data.code,
    scheduledDate: data.scheduledDate?.toDate ? data.scheduledDate.toDate() : safeParseDate(data.scheduledDate),
    location: safeStringConvert(data.location),
    sector: safeStringConvert(data.sector),
    status: data.status,
    expectedProducts: data.expectedProducts || [],
    countedProducts: (data.countedProducts || []).map((count: any) => ({
      ...count,
      countedAt: count.countedAt?.toDate ? count.countedAt.toDate() : safeParseDate(count.countedAt),
      validations: (count.validations || []).map((validation: any) => ({
        ...validation,
        validatedAt: validation.validatedAt?.toDate ? validation.validatedAt.toDate() : safeParseDate(validation.validatedAt)
      })),
      status: count.status || 'pending'
    })),
    createdBy: data.createdBy,
    assignedUsers: data.assignedUsers || [],
    userRoles: data.userRoles || {},
    notes: data.notes,
    activities: data.activities || [],
    activityStatus: data.activityStatus || [],
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : safeParseDate(data.createdAt),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : safeParseDate(data.updatedAt),
    completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : (data.completedAt ? safeParseDate(data.completedAt) : undefined),
  };
};

// Converter InventorySchedule para Firestore document
const convertScheduleToFirestore = (schedule: Omit<InventorySchedule, 'id'>) => {
  return {
    name: schedule.name,
    code: schedule.code,
    scheduledDate: schedule.scheduledDate ? Timestamp.fromDate(schedule.scheduledDate) : Timestamp.now(),
    location: schedule.location,
    sector: schedule.sector,
    status: schedule.status,
    expectedProducts: schedule.expectedProducts,
    countedProducts: schedule.countedProducts.map(count => ({
      ...count,
      countedAt: count.countedAt ? Timestamp.fromDate(count.countedAt) : Timestamp.now(),
      validations: (count.validations || []).map(validation => ({
        ...validation,
        validatedAt: validation.validatedAt ? Timestamp.fromDate(validation.validatedAt) : Timestamp.now()
      })),
      status: count.status || 'pending'
    })),
    createdBy: schedule.createdBy,
    assignedUsers: schedule.assignedUsers,
    userRoles: schedule.userRoles || {},
    notes: schedule.notes || null,
    activities: schedule.activities || [],
    activityStatus: schedule.activityStatus || [],
    createdAt: schedule.createdAt ? Timestamp.fromDate(schedule.createdAt) : Timestamp.now(),
    updatedAt: schedule.updatedAt ? Timestamp.fromDate(schedule.updatedAt) : Timestamp.now(),
    completedAt: schedule.completedAt ? Timestamp.fromDate(schedule.completedAt) : null,
  };
};

export const inventoryScheduleService = {
  // Buscar todos os agendamentos
  async getAllSchedules(): Promise<InventorySchedule[]> {
    try {
      console.log('Carregando agendamentos do Firebase...');
      const q = query(collection(db, SCHEDULES_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const schedules = querySnapshot.docs.map(convertFirestoreToSchedule);
      console.log(`${schedules.length} agendamentos carregados do Firebase`);
      return schedules;
    } catch (error) {
      console.warn('Erro ao buscar agendamentos do Firebase:', error);
      
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes no Firebase - usando dados locais');
        return [];
      }
      
      console.warn('Falha ao carregar agendamentos do Firebase - continuando em modo local');
      return [];
    }
  },

  // Criar novo agendamento
  async createSchedule(scheduleData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      console.log('Criando agendamento no Firebase:', scheduleData.name);
      console.log('🌐 Ambiente de criação:', {
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
        isVercel: typeof window !== 'undefined' ? window.location.hostname.includes('vercel') : false
      });
      
      const scheduleToCreate = {
        ...scheduleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, SCHEDULES_COLLECTION), convertScheduleToFirestore(scheduleToCreate));
      console.log('Agendamento criado no Firebase com ID:', docRef.id);
      console.log('✅ Agendamento salvo com sucesso no Firebase');
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro detalhado ao criar agendamento:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        isPermissionError: isPermissionError(error)
      });
      
      if (isPermissionError(error)) {
        console.warn('Firebase permissions not configured - using local mode:', error);
      } else {
        console.error('Erro ao criar agendamento:', error);
      }
      // Em caso de erro, retornar ID local para continuar funcionamento
      const localId = `local_${Date.now()}`;
      console.log('Usando ID local para agendamento:', localId);
      return localId;
    }
  },

  // Atualizar agendamento existente
  async updateSchedule(scheduleId: string, scheduleData: Partial<Omit<InventorySchedule, 'id' | 'createdAt'>>): Promise<void> {
    try {
      console.log('🔄 [FIREBASE] Atualizando agendamento:', scheduleId, {
        isLocalId: scheduleId.startsWith('local_') || !isNaN(Number(scheduleId)),
        hasCountedProducts: scheduleData.countedProducts?.length || 0,
        status: scheduleData.status
      });
      
      // Skip Firebase update for local IDs
      if (scheduleId.startsWith('local_') || !isNaN(Number(scheduleId))) {
        console.log('Pulando atualização no Firebase para ID local:', scheduleId);
        return;
      }

      const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
      const updateData: any = {
        ...scheduleData,
        updatedAt: Timestamp.now(),
      };

      // Converter datas para Timestamp se necessário
      if (updateData.scheduledDate) {
        updateData.scheduledDate = Timestamp.fromDate(updateData.scheduledDate instanceof Date ? updateData.scheduledDate : new Date(updateData.scheduledDate));
      }
      if (updateData.completedAt) {
        updateData.completedAt = Timestamp.fromDate(updateData.completedAt instanceof Date ? updateData.completedAt : new Date(updateData.completedAt));
      }
      if (updateData.countedProducts) {
        console.log('📊 [FIREBASE] Convertendo produtos contados:', updateData.countedProducts.length);
        updateData.countedProducts = updateData.countedProducts.map((count: any) => ({
          ...count,
          countedAt: count.countedAt ? 
            (count.countedAt instanceof Date ? Timestamp.fromDate(count.countedAt) : Timestamp.fromDate(new Date(count.countedAt))) : 
            Timestamp.now(),
          metadata: count.metadata || {},
          validations: (count.validations || []).map((validation: any) => ({
            ...validation,
            validatedAt: validation.validatedAt ? 
              (validation.validatedAt instanceof Date ? Timestamp.fromDate(validation.validatedAt) : Timestamp.fromDate(new Date(validation.validatedAt))) : 
              Timestamp.now()
          })),
          status: count.status || 'pending'
        }));
      }

      await updateDoc(scheduleRef, updateData);
      console.log('✅ [FIREBASE] Agendamento atualizado com sucesso:', scheduleId);
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      
      if (isPermissionError(error)) {
        console.warn('Firebase permissions not configured - continuing with local operation:', error);
        return;
      } else {
        console.error('Erro crítico ao atualizar agendamento:', error);
        throw error;
      }
    }
  },

  // Excluir agendamento
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      console.log('🗑️ [FIREBASE] Iniciando exclusão do agendamento:', scheduleId);
      
      // Skip Firebase deletion for local IDs
      if (scheduleId.startsWith('local_') || !isNaN(Number(scheduleId))) {
        console.log('📝 [FIREBASE] Pulando exclusão no Firebase para ID local:', scheduleId);
        return;
      }
      
      // Try to delete from Firebase for Firebase IDs
      try {
        await deleteDoc(doc(db, SCHEDULES_COLLECTION, scheduleId));
        console.log('✅ [FIREBASE] Agendamento excluído do Firebase:', scheduleId);
      } catch (firebaseError) {
        console.warn('⚠️ [FIREBASE] Erro ao excluir do Firebase:', firebaseError);
        
        // If it's a permission error or document not found, that's okay
        if (isPermissionError(firebaseError) || firebaseError?.code === 'not-found') {
          console.log('📝 [FIREBASE] Documento não encontrado ou sem permissão - OK');
        } else {
          console.warn('🔄 [FIREBASE] Erro inesperado - continuando');
          throw firebaseError; // Re-throw unexpected errors
        }
      }

      console.log('✅ [FIREBASE] Processo de exclusão concluído para:', scheduleId);
    } catch (error) {
      console.error('❌ [FIREBASE] Erro crítico ao excluir agendamento:', error);
      
      // Only throw if it's a critical error that should stop the operation
      if (!isPermissionError(error) && error?.code !== 'not-found') {
        console.log('🔄 [FIREBASE] Erro crítico - operação local pode continuar');
        // Don't throw to allow local operation to continue
      }
    }
  },

  // Configurar listener em tempo real para agendamentos
  setupRealtimeListener(callback: (schedules: InventorySchedule[]) => void): () => void {
    try {
      console.log('Configurando listener em tempo real para agendamentos...');
      console.log('🌐 Ambiente de execução:', {
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
        isProduction: typeof window !== 'undefined' ? window.location.hostname.includes('vercel') : false,
        firebaseProject: 'shelter-65f31'
      });
      
      const q = query(collection(db, SCHEDULES_COLLECTION), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            console.log('Agendamentos atualizados em tempo real:', snapshot.size);
            console.log('🔄 Snapshot metadata:', {
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
              isFromCache: snapshot.metadata.fromCache,
              size: snapshot.size,
              source: snapshot.metadata.fromCache ? 'cache' : 'server',
              timestamp: new Date().toISOString()
            });
            
            const schedules = snapshot.docs.map(convertFirestoreToSchedule);
            console.log('🔄 Agendamentos convertidos:', schedules.map(s => ({
              id: s.id,
              name: s.name,
              status: s.status,
              assignedUsers: s.assignedUsers,
              location: s.location,
              sector: s.sector
            })));
            
            callback(schedules);
          } catch (error) {
            console.error('Erro ao processar dados do snapshot:', error);
            console.error('🚨 Erro detalhado:', {
              message: error.message,
              stack: error.stack
            });
            callback([]);
          }
        },
        (error) => {
          console.warn('Erro no listener de agendamentos:', error?.message || error);
          console.warn('🚨 Erro completo do listener:', {
            code: error?.code,
            message: error?.message,
            details: error
          });
          
          if (isPermissionError(error)) {
            console.warn('Firebase: Permissões insuficientes para agendamentos - continuando em modo local');
          } else {
            console.warn('Firebase: Erro de conexão - continuando em modo local');
          }
          
          // Sempre usar dados locais em caso de erro
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener de agendamentos:', error?.message || error);
      console.warn('🚨 Erro na configuração do listener:', {
        message: error?.message,
        stack: error?.stack,
        isPermissionError: isPermissionError(error)
      });
      
      if (isPermissionError(error)) {
        console.warn('Firebase: Permissões insuficientes - operando em modo local');
      } else {
        console.warn('Firebase: Erro de configuração - operando em modo local');
      }
      
      // Retornar dados locais vazios e função vazia se falhar
      callback([]);
      return () => {};
    }
  }
};