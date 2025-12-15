import { parseISO, isValid } from 'date-fns';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EquipmentReservation } from '../types';

const RESERVATIONS_COLLECTION = 'reservas';

// Helper function to safely convert date strings to Date objects
const safeParseDate = (dateValue: any): Date | undefined => {
  if (!dateValue) return undefined;
  
  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : undefined;
  }
  
  if (typeof dateValue === 'string') {
    if (dateValue.trim() === '') return undefined;
    
    // Try parseISO for ISO strings
    if (dateValue.includes('-') || dateValue.includes('T')) {
      const parsed = parseISO(dateValue);
      if (isValid(parsed)) return parsed;
    }
    
    // Fallback to new Date()
    const fallback = new Date(dateValue);
    return isValid(fallback) ? fallback : undefined;
  }
  
  if (typeof dateValue === 'number') {
    const parsed = new Date(dateValue);
    return isValid(parsed) ? parsed : undefined;
  }
  
  return undefined;
};
// Helper function to detect Firebase permission errors
const isPermissionError = (error: any): boolean => {
  return error?.code === 'permission-denied' || 
         error?.message?.includes('permissions') ||
         error?.message?.includes('Missing or insufficient permissions');
};

// Converter Firestore document para EquipmentReservation
const convertFirestoreToReservation = (doc: QueryDocumentSnapshot<DocumentData>): EquipmentReservation => {
  const data = doc.data();
  return {
    id: doc.id,
    operador: data.operador,
    equipamento: data.equipamento,
    nivel_oleo: data.nivel_oleo,
    nivel_combustivel: data.nivel_combustivel,
    nivel_poligrama: data.nivel_poligrama,
    status_equipamento: data.status_equipamento,
    observacoes: data.observacoes,
    motivo_reserva: data.motivo_reserva,
    data_inicio: data.data_inicio?.toDate ? data.data_inicio.toDate() : safeParseDate(data.data_inicio),
    motivo_finalizacao: data.motivo_finalizacao,
    data_fim: data.data_fim?.toDate ? data.data_fim.toDate() : safeParseDate(data.data_fim),
    status_reserva: data.status_reserva,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : safeParseDate(data.createdAt) || new Date(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : safeParseDate(data.updatedAt) || new Date(),
  };
};

// Converter EquipmentReservation para Firestore document
const convertReservationToFirestore = (reservation: Omit<EquipmentReservation, 'id'>) => {
  return {
    operador: reservation.operador,
    equipamento: reservation.equipamento,
    nivel_oleo: reservation.nivel_oleo,
    nivel_combustivel: reservation.nivel_combustivel,
    nivel_poligrama: reservation.nivel_poligrama,
    status_equipamento: reservation.status_equipamento,
    observacoes: reservation.observacoes || null,
    motivo_reserva: reservation.motivo_reserva || null,
    data_inicio: reservation.data_inicio ? Timestamp.fromDate(reservation.data_inicio) : null,
    motivo_finalizacao: reservation.motivo_finalizacao || null,
    data_fim: reservation.data_fim ? Timestamp.fromDate(reservation.data_fim) : null,
    status_reserva: reservation.status_reserva,
    createdAt: reservation.createdAt ? Timestamp.fromDate(reservation.createdAt) : Timestamp.now(),
    updatedAt: reservation.updatedAt ? Timestamp.fromDate(reservation.updatedAt) : Timestamp.now(),
  };
};

export const reservationService = {
  // Buscar todas as reservas
  async getAllReservations(): Promise<EquipmentReservation[]> {
    try {
      console.log('Carregando reservas do Firebase...');
      const q = query(collection(db, RESERVATIONS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const reservations = querySnapshot.docs.map(convertFirestoreToReservation);
      console.log(`${reservations.length} reservas carregadas do Firebase`);
      return reservations;
    } catch (error) {
      console.warn('Erro ao buscar reservas do Firebase:', error);
      
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes no Firebase - usando dados locais');
        return [];
      }
      
      console.warn('Falha ao carregar reservas do Firebase - continuando em modo local');
      return [];
    }
  },

  // Criar nova reserva
  async createReservation(reservationData: Omit<EquipmentReservation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Check for existing active reservation for this operator-equipment combination
      const existingReservations = await this.getActiveReservationsByEquipment(reservationData.equipamento);
      const existingForOperator = existingReservations.find(r => 
        r.operador === reservationData.operador && r.status_reserva === 'Ativo'
      );
      
      if (existingForOperator) {
        console.log('⚠️ Reserva ativa já existe para este operador e equipamento:', existingForOperator.id);
        // Update existing reservation instead of creating new one
        await this.updateReservation(existingForOperator.id, {
          ...reservationData,
          updatedAt: new Date()
        });
        return existingForOperator.id;
      }
      
      console.log('Criando reserva no Firebase:', reservationData.operador);
      const reservationToCreate = {
        ...reservationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, RESERVATIONS_COLLECTION), convertReservationToFirestore(reservationToCreate));
      console.log('Reserva criada no Firebase com ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      if (isPermissionError(error)) {
        console.warn('Firebase permissions not configured - using local mode:', error);
      } else {
        console.error('Erro ao criar reserva:', error);
      }
      // Em caso de erro, retornar ID local para continuar funcionamento
      const localId = `local_${Date.now()}`;
      console.log('Usando ID local para reserva:', localId);
      return localId;
    }
  },

  // Atualizar reserva existente
  async updateReservation(reservationId: string, reservationData: Partial<Omit<EquipmentReservation, 'id' | 'createdAt'>>): Promise<void> {
    try {
      // Skip Firebase update for local IDs
      if (reservationId.startsWith('local_') || !isNaN(Number(reservationId))) {
        console.log('Pulando atualização no Firebase para ID local:', reservationId);
        return;
      }

      const reservationRef = doc(db, RESERVATIONS_COLLECTION, reservationId);
      const updateData: any = {
        ...reservationData,
        updatedAt: Timestamp.now(),
      };

      // Converter datas para Timestamp se necessário
      if (updateData.data_inicio) {
        updateData.data_inicio = Timestamp.fromDate(updateData.data_inicio);
      }
      if (updateData.data_fim) {
        updateData.data_fim = Timestamp.fromDate(updateData.data_fim);
      }

      await updateDoc(reservationRef, updateData);
      console.log('Reserva atualizada:', reservationId);
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error);
      // Don't throw error for permission issues - allow local operation to continue
      if (error instanceof Error && error.message.includes('permissions')) {
        console.log('Erro de permissão - continuando com operação local');
        return;
      }
      console.log('Continuando com operação local devido a erro no Firebase');
    }
  },

  // Buscar reservas ativas por equipamento
  async getActiveReservationsByEquipment(equipmentName: string): Promise<EquipmentReservation[]> {
    try {
      // Get all reservations first, then filter locally to avoid Firebase query limitations
      const allReservations = await this.getAllReservations();
      
      // Filter for active reservations of this equipment
      const activeReservations = allReservations.filter(r => 
        r.equipamento === equipmentName && r.status_reserva === 'Ativo'
      );
      
      // Remove duplicates by keeping the most recent reservation for each operator
      const uniqueReservations = new Map<string, EquipmentReservation>();
      
      activeReservations.forEach(reservation => {
        const key = reservation.operador;
        const existing = uniqueReservations.get(key);
        
        // Keep the most recent reservation for each operator
        if (!existing || new Date(reservation.updatedAt) > new Date(existing.updatedAt)) {
          uniqueReservations.set(key, reservation);
        }
      });
      
      return Array.from(uniqueReservations.values());
    } catch (error) {
      console.warn('Erro ao buscar reservas ativas - usando método alternativo:', error);
      
      // Fallback method using simple query
      try {
      const q = query(
        collection(db, RESERVATIONS_COLLECTION), 
        where('equipamento', '==', equipmentName),
        where('status_reserva', '==', 'Ativo'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(convertFirestoreToReservation);
    } catch (error) {
        console.warn('Erro no método alternativo:', error);
      return [];
    }
    }
  },

  // Configurar listener em tempo real para reservas
  setupRealtimeListener(callback: (reservations: EquipmentReservation[]) => void): () => void {
    try {
      console.log('Configurando listener em tempo real para reservas...');
      const q = query(collection(db, RESERVATIONS_COLLECTION), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          try {
            console.log('Reservas atualizadas em tempo real:', snapshot.size);
            const reservations = snapshot.docs.map(convertFirestoreToReservation);
            callback(reservations);
          } catch (error) {
            console.error('Erro ao processar dados do snapshot de reservas:', error);
            callback([]);
          }
        },
        (error) => {
          console.warn('Erro no listener de reservas:', error?.message || error);
          
          if (isPermissionError(error)) {
            console.warn('Firebase: Permissões insuficientes para reservas - continuando em modo local');
          } else {
            console.warn('Firebase: Erro de conexão para reservas - continuando em modo local');
          }
          
          // Em caso de erro, retornar array vazio
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener de reservas:', error?.message || error);
      
      // Retornar função vazia se falhar
      callback([]);
      return () => {};
    }
  }
};