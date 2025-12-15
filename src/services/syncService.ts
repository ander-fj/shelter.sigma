import { offlineStorage } from './offlineStorageService';
import { productService } from './productService';
import { movementService } from './movementService';
import { loanService } from './loanService';
import { inventoryScheduleService } from './inventoryScheduleService';
import { userService } from './userService';
import { reservationService } from './reservationService';

export interface SyncResult {
  success: boolean;
  syncedItems: {
    products: number;
    movements: number;
    loans: number;
    schedules: number;
    users: number;
    reservations: number;
  };
  errors: string[];
  totalSynced: number;
}

export class SyncService {
  private static instance: SyncService;
  private isSyncing = false;
  private syncListeners: ((result: SyncResult) => void)[] = [];

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Add sync listener
  addSyncListener(callback: (result: SyncResult) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
    };
  }

  // Notify sync listeners
  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('Erro ao notificar listener de sincronização:', error);
      }
    });
  }

  // Check if currently syncing
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // Sync all pending data to Firebase
  async syncToFirebase(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('⏳ Sincronização já em andamento...');
      return {
        success: false,
        syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
        errors: ['Sincronização já em andamento'],
        totalSynced: 0
      };
    }

    if (!navigator.onLine) {
      console.log('📴 Sem conexão - sincronização adiada');
      return {
        success: false,
        syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
        errors: ['Sem conexão com a internet'],
        totalSynced: 0
      };
    }

    this.isSyncing = true;
    console.log('🔄 Iniciando sincronização com Firebase...');

    const result: SyncResult = {
      success: true,
      syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
      errors: [],
      totalSynced: 0
    };

    try {
      // Sync in order with error handling for each collection
      try {
        result.syncedItems.products = await this.syncProducts();
      } catch (error) {
        console.error('❌ Erro ao sincronizar produtos:', error);
        result.errors.push(`Produtos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      try {
        result.syncedItems.movements = await this.syncMovements();
      } catch (error) {
        console.error('❌ Erro ao sincronizar movimentações:', error);
        result.errors.push(`Movimentações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      try {
        result.syncedItems.loans = await this.syncLoans();
      } catch (error) {
        console.error('❌ Erro ao sincronizar empréstimos:', error);
        result.errors.push(`Empréstimos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      try {
        result.syncedItems.schedules = await this.syncSchedules();
      } catch (error) {
        console.error('❌ Erro ao sincronizar agendamentos:', error);
        result.errors.push(`Agendamentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      try {
        result.syncedItems.users = await this.syncUsers();
      } catch (error) {
        console.error('❌ Erro ao sincronizar usuários:', error);
        result.errors.push(`Usuários: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
      
      try {
        result.syncedItems.reservations = await this.syncReservations();
      } catch (error) {
        console.error('❌ Erro ao sincronizar reservas:', error);
        result.errors.push(`Reservas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      result.totalSynced = Object.values(result.syncedItems).reduce((sum, count) => sum + count, 0);

      // Mark as failed if there were errors but still some items synced
      if (result.errors.length > 0 && result.totalSynced === 0) {
        result.success = false;
      }

      if (result.totalSynced > 0) {
        console.log(`✅ Sincronização concluída: ${result.totalSynced} itens sincronizados`);
        if (result.errors.length > 0) {
          console.warn(`⚠️ Sincronização parcial: ${result.errors.length} erros encontrados`);
        }
      } else {
        console.log('ℹ️ Nenhum item pendente para sincronização');
      }

    } catch (error) {
      console.error('❌ Erro durante sincronização:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners(result);
    }

    return result;
  }

  // Sync products to Firebase
  private async syncProducts(): Promise<number> {
    const pendingProducts = offlineStorage.getSyncQueue('products');
    
    // Remove duplicates from sync queue
    const uniquePendingProducts = pendingProducts.filter((product, index, array) => 
      array.findIndex(p => p.sku === product.sku) === index
    );
    
    let syncedCount = 0;

    for (const product of uniquePendingProducts) {
      try {
        const { _offlineCreated, _offlineTimestamp, _syncStatus, id, createdAt, updatedAt, ...productData } = product;
        
        if (_offlineCreated) {
          // Create new product in Firebase
          await productService.createProduct(productData);
          console.log('✅ Produto criado no Firebase:', product.name);
        } else {
          // Update existing product in Firebase
          await productService.updateProduct(id, productData);
          console.log('✅ Produto atualizado no Firebase:', product.name);
        }
        
        offlineStorage.markAsSynced('products', product.id);
        syncedCount++;
      } catch (error) {
        console.error('❌ Erro ao sincronizar produto:', product.name, error);
      }
    }

    return syncedCount;
  }

  // Sync movements to Firebase
  private async syncMovements(): Promise<number> {
    const pendingMovements = offlineStorage.getSyncQueue('movements');
    
    // Remove duplicates from sync queue
    const uniquePendingMovements = pendingMovements.filter((movement, index, array) => 
      array.findIndex(m => m.id === movement.id) === index
    );
    
    let syncedCount = 0;

    for (const movement of uniquePendingMovements) {
      try {
        const { _offlineCreated, _offlineTimestamp, _syncStatus, id, createdAt, ...movementData } = movement;
        
        if (_offlineCreated) {
          await movementService.createMovement(movementData);
          console.log('✅ Movimentação criada no Firebase:', movement.reason);
        } else {
          await movementService.updateMovement(id, movementData);
          console.log('✅ Movimentação atualizada no Firebase:', movement.reason);
        }
        
        offlineStorage.markAsSynced('movements', movement.id);
        syncedCount++;
      } catch (error) {
        console.error('❌ Erro ao sincronizar movimentação:', movement.reason, error);
      }
    }

    return syncedCount;
  }

  // Sync loans to Firebase
  private async syncLoans(): Promise<number> {
    const pendingLoans = offlineStorage.getSyncQueue('loans');
    let syncedCount = 0;

    for (const loan of pendingLoans) {
      try {
        const { _offlineCreated, _offlineTimestamp, _syncStatus, id, createdAt, updatedAt, ...loanData } = loan;
        
        if (_offlineCreated) {
          await loanService.createLoan(loanData);
          console.log('✅ Empréstimo criado no Firebase:', loan.borrowerName);
        } else {
          await loanService.updateLoan(id, loanData);
          console.log('✅ Empréstimo atualizado no Firebase:', loan.borrowerName);
        }
        
        offlineStorage.markAsSynced('loans', loan.id);
        syncedCount++;
      } catch (error) {
        console.error('❌ Erro ao sincronizar empréstimo:', loan.borrowerName, error);
      }
    }

    return syncedCount;
  }

  // Sync schedules to Firebase
  private async syncSchedules(): Promise<number> {
    const pendingSchedules = offlineStorage.getSyncQueue('schedules');
    console.log('🔄 [SYNC] Iniciando sincronização de agendamentos:', {
      totalPending: pendingSchedules.length,
      schedules: pendingSchedules.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        hasCountedProducts: s.countedProducts?.length || 0,
        isLocalId: s.id?.startsWith('local_') || !isNaN(Number(s.id))
      }))
    });
    
    // Remove duplicates from sync queue
    const uniquePendingSchedules = pendingSchedules.filter((schedule, index, array) => 
      array.findIndex(s => s.code === schedule.code) === index
    );
    
    console.log('🔄 [SYNC] Agendamentos únicos para sincronizar:', uniquePendingSchedules.length);
    
    let syncedCount = 0;

    for (const schedule of uniquePendingSchedules) {
      try {
        console.log('🔄 [SYNC] Processando agendamento:', {
          id: schedule.id,
          name: schedule.name,
          status: schedule.status,
          countedProducts: schedule.countedProducts?.length || 0,
          isOfflineCreated: schedule._offlineCreated
        });
        
        const { _offlineCreated, _offlineTimestamp, _syncStatus, id, createdAt, updatedAt, ...scheduleData } = schedule;
        
        // Convert date strings to Date objects with proper validation
        const convertedScheduleData = {
          ...scheduleData,
          scheduledDate: scheduleData.scheduledDate instanceof Date ? 
            scheduleData.scheduledDate : 
            new Date(scheduleData.scheduledDate || Date.now()),
          completedAt: scheduleData.completedAt ? 
            (scheduleData.completedAt instanceof Date ? 
              scheduleData.completedAt : 
              new Date(scheduleData.completedAt)) : 
            undefined,
          countedProducts: (scheduleData.countedProducts || []).map((count: any) => ({
            ...count,
            countedAt: count.countedAt instanceof Date ? 
              count.countedAt : 
              new Date(count.countedAt || Date.now()),
            validations: (count.validations || []).map((validation: any) => ({
              ...validation,
              validatedAt: validation.validatedAt instanceof Date ? 
                validation.validatedAt : 
                new Date(validation.validatedAt || Date.now())
            }))
          }))
        };
        
        if (_offlineCreated) {
          console.log('🆕 [SYNC] Criando novo agendamento no Firebase:', schedule.name);
          await inventoryScheduleService.createSchedule(convertedScheduleData);
          console.log('✅ Agendamento criado no Firebase:', schedule.name);
        } else {
          console.log('✏️ [SYNC] Atualizando agendamento existente no Firebase:', schedule.name);
          await inventoryScheduleService.updateSchedule(id, convertedScheduleData);
          console.log('✅ Agendamento atualizado no Firebase:', schedule.name);
        }
        
        offlineStorage.markAsSynced('schedules', schedule.id);
        syncedCount++;
      } catch (error) {
        console.error('❌ [SYNC] Erro ao sincronizar agendamento:', {
          name: schedule.name,
          id: schedule.id,
          error: error.message,
          code: error.code
        });
        
        // Mark as synced even if failed to avoid infinite loops
        console.warn('Agendamento não pôde ser sincronizado - marcando como sincronizado para evitar loops');
        offlineStorage.markAsSynced('schedules', schedule.id);
      }
    }

    console.log('✅ [SYNC] Sincronização de agendamentos concluída:', {
      syncedCount,
      totalPending: pendingSchedules.length
    });
    
    return syncedCount;
  }

  // Sync users to Firebase
  private async syncUsers(): Promise<number> {
    const pendingUsers = offlineStorage.getSyncQueue('users');
    let syncedCount = 0;

    for (const user of pendingUsers) {
      try {
        const { _offlineCreated, _offlineTimestamp, _syncStatus, id, createdAt, lastLogin, ...userData } = user;
        
        if (_offlineCreated) {
          await userService.createUser(userData);
          console.log('✅ Usuário criado no Firebase:', user.name);
        } else {
          await userService.updateUser(id, userData);
          console.log('✅ Usuário atualizado no Firebase:', user.name);
        }
        
        offlineStorage.markAsSynced('users', user.id);
        syncedCount++;
      } catch (error) {
        console.error('❌ Erro ao sincronizar usuário:', user.name, error);
      }
    }

    return syncedCount;
  }

  // Sync reservations to Firebase
  private async syncReservations(): Promise<number> {
    const pendingReservations = offlineStorage.getSyncQueue('reservations');
    let syncedCount = 0;

    for (const reservation of pendingReservations) {
      try {
        const { _offlineCreated, _offlineTimestamp, _syncStatus, id, createdAt, updatedAt, ...reservationData } = reservation;
        
        if (_offlineCreated) {
          await reservationService.createReservation(reservationData);
          console.log('✅ Reserva criada no Firebase:', reservation.operador);
        } else {
          await reservationService.updateReservation(id, reservationData);
          console.log('✅ Reserva atualizada no Firebase:', reservation.operador);
        }
        
        offlineStorage.markAsSynced('reservations', reservation.id);
        syncedCount++;
      } catch (error) {
        console.error('❌ Erro ao sincronizar reserva:', reservation.operador, error);
      }
    }

    return syncedCount;
  }

  // Auto-sync when connection is restored
  async autoSync(): Promise<void> {
    if (!navigator.onLine || this.isSyncing) {
      console.log('🚫 [AUTO-SYNC] Cancelado:', {
        isOnline: navigator.onLine,
        isSyncing: this.isSyncing
      });
      return;
    }

    // Forçar verificação de itens locais antes de verificar pending count
    console.log('🔍 [AUTO-SYNC] Verificando dados locais...');
    const offlineData = offlineStorage.getOfflineData();
    
    // Log detalhado do estado atual
    console.log('📊 [AUTO-SYNC] Estado detalhado dos dados:', {
      totalProducts: offlineData.products.length,
      totalMovements: offlineData.movements.length,
      totalLoans: offlineData.loans.length,
      totalSchedules: offlineData.schedules.length,
      totalUsers: offlineData.users.length,
      totalReservations: offlineData.reservations.length,
      pendingSchedules: offlineData.pendingSync.schedules.length,
      schedulesWithCounts: offlineData.pendingSync.schedules.filter(s => s.countedProducts?.length > 0).length,
      allSchedules: offlineData.schedules.length,
      allSchedulesWithCounts: offlineData.schedules.filter(s => s.countedProducts?.length > 0).length,
      schedulesInProgress: offlineData.schedules.filter(s => s.status === 'in_progress').length,
      schedulesCompleted: offlineData.schedules.filter(s => s.status === 'completed').length
    });
    
    // Log específico dos agendamentos com contagens
    offlineData.schedules
      .filter(s => s.countedProducts?.length > 0)
      .forEach(schedule => {
        console.log(`📋 [AUTO-SYNC] Agendamento com contagens:`, {
          id: schedule.id,
          name: schedule.name,
          status: schedule.status,
          countedProducts: schedule.countedProducts.length,
          isInPendingSync: offlineData.pendingSync.schedules.some(ps => ps.id === schedule.id),
          isLocalId: schedule.id?.toString().startsWith('local_') || !isNaN(Number(schedule.id))
        });
      });
    
    // Obter pending count (que agora verifica e adiciona itens automaticamente)
    const pendingCount = offlineStorage.getPendingSyncCount();
    
    console.log('🔄 [AUTO-SYNC] Contagem final de itens pendentes:', {
      pendingCount,
      afterAutoDetection: true
    });
    
    if (pendingCount === 0) {
      console.log('ℹ️ [AUTO-SYNC] Nenhum item para sincronizar');
      return;
    }

    console.log(`🔄 [AUTO-SYNC] Iniciando sincronização: ${pendingCount} itens pendentes`);
    
    try {
      const result = await this.syncToFirebase();
      if (result.success && result.totalSynced > 0) {
        console.log(`✅ [AUTO-SYNC] Concluída: ${result.totalSynced} itens sincronizados`, {
          syncedItems: result.syncedItems
        });
        
        // Limpar itens sincronizados do localStorage
        Object.entries(result.syncedItems).forEach(([collection, count]) => {
          if (count > 0) {
            console.log(`🧹 [AUTO-SYNC] Limpando fila: ${collection} (${count} itens)`);
            offlineStorage.clearSyncQueue(collection as keyof typeof result.syncedItems);
          }
        });
        
        // Forçar atualização da UI
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('syncCompleted', { detail: result }));
        }, 1000);
      } else if (result.totalSynced === 0) {
        console.log('ℹ️ [AUTO-SYNC] Nenhum item foi sincronizado');
      }
    } catch (error) {
      console.error('❌ [AUTO-SYNC] Erro:', error);
    }
  }

  // Force sync all local data to Firebase
  async forceSyncAll(): Promise<SyncResult> {
    if (!navigator.onLine) {
      return {
        success: false,
        syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
        errors: ['Sem conexão com a internet'],
        totalSynced: 0
      };
    }

    console.log('🔄 Iniciando sincronização forçada de todos os dados...');
    
    const data = offlineStorage.getOfflineData();
    const result: SyncResult = {
      success: true,
      syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
      errors: [],
      totalSynced: 0
    };

    try {
      // Add all local data to sync queue if not already there
      data.products.forEach(product => {
        // Only add to sync queue if it's a local item and not already synced
        const isLocalItem = product.id && (product.id.startsWith('local_') || !isNaN(Number(product.id)));
        const needsSync = !product._syncStatus || product._syncStatus === 'failed' || product._syncStatus === 'pending';
        
        if (isLocalItem && needsSync) {
          offlineStorage.addToSyncQueue('products', product);
        }
      });

      data.movements.forEach(movement => {
        const isLocalItem = movement.id && (movement.id.startsWith('local_') || !isNaN(Number(movement.id)));
        const needsSync = !movement._syncStatus || movement._syncStatus === 'failed' || movement._syncStatus === 'pending';
        
        if (isLocalItem && needsSync) {
          offlineStorage.addToSyncQueue('movements', movement);
        }
      });

      data.loans.forEach(loan => {
        const isLocalItem = loan.id && (loan.id.startsWith('local_') || !isNaN(Number(loan.id)));
        const needsSync = !loan._syncStatus || loan._syncStatus === 'failed' || loan._syncStatus === 'pending';
        
        if (isLocalItem && needsSync) {
          offlineStorage.addToSyncQueue('loans', loan);
        }
      });

      data.schedules.forEach(schedule => {
        const isLocalItem = schedule.id && (schedule.id.startsWith('local_') || !isNaN(Number(schedule.id)));
        const needsSync = !schedule._syncStatus || schedule._syncStatus === 'failed' || schedule._syncStatus === 'pending';
        
        if (isLocalItem && needsSync) {
          offlineStorage.addToSyncQueue('schedules', schedule);
        }
      });

      data.users.forEach(user => {
        if (!user._syncStatus || user._syncStatus === 'failed') {
          offlineStorage.addToSyncQueue('users', user);
        }
      });

      data.reservations.forEach(reservation => {
        if (!reservation._syncStatus || reservation._syncStatus === 'failed') {
          offlineStorage.addToSyncQueue('reservations', reservation);
        }
      });

      // Now sync everything
      return await this.syncToFirebase();

    } catch (error) {
      console.error('❌ Erro na sincronização forçada:', error);
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
      return result;
    }
  }
}

export const syncService = SyncService.getInstance();