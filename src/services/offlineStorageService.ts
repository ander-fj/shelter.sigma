interface OfflineData {
  products: any[];
  movements: any[];
  loans: any[];
  schedules: any[];
  users: any[];
  reservations: any[];
  lastModified: number;
  pendingSync: {
    products: any[];
    movements: any[];
    loans: any[];
    schedules: any[];
    users: any[];
    reservations: any[];
  };
}

export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private readonly STORAGE_KEY = 'inventory_offline_data';
  private readonly SYNC_QUEUE_KEY = 'inventory_sync_queue';

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  // Get all offline data
  getOfflineData(): OfflineData {
    try {
      console.log('📂 [STORAGE] Carregando dados offline...');
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsedData = JSON.parse(data);
        console.log('✅ [STORAGE] Dados carregados:', {
          products: parsedData.products?.length || 0,
          movements: parsedData.movements?.length || 0,
          loans: parsedData.loans?.length || 0,
          schedules: parsedData.schedules?.length || 0,
          users: parsedData.users?.length || 0,
          reservations: parsedData.reservations?.length || 0
        });
        return parsedData;
      }
      console.log('📂 [STORAGE] Nenhum dado offline encontrado - criando estrutura vazia');
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao carregar dados offline:', error);
    }

    return {
      products: [],
      movements: [],
      loans: [],
      schedules: [],
      users: [],
      reservations: [],
      lastModified: Date.now(),
      pendingSync: {
        products: [],
        movements: [],
        loans: [],
        schedules: [],
        users: [],
        reservations: []
      }
    };
  }

  // Save all offline data
  saveOfflineData(data: Partial<OfflineData>): void {
    try {
      console.log('💾 [MOBILE-STORAGE] Iniciando salvamento offline...');
      const currentData = this.getOfflineData();
      const updatedData = {
        ...currentData,
        ...data,
        lastModified: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData));
      console.log('✅ [MOBILE-STORAGE] Dados salvos offline:', Object.keys(data));
      
      // Verificar se realmente foi salvo
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        throw new Error('Falha ao verificar dados salvos');
      }
      
      console.log('✅ [MOBILE-STORAGE] Verificação: dados confirmados no localStorage');
      
      // Notificar sobre salvamento bem-sucedido em mobile
      if (this.isMobileDevice()) {
        console.log('📱 [MOBILE-STORAGE] Dados salvos com sucesso no dispositivo móvel');
      }
    } catch (error) {
      console.error('❌ [MOBILE-STORAGE] Erro ao salvar dados offline:', error);
      
      // Tentar salvar cada coleção individualmente como fallback
      try {
        console.log('🆘 [MOBILE-STORAGE] Tentando salvamento individual...');
        Object.entries(data).forEach(([key, value]) => {
          if (key !== 'lastModified' && key !== 'pendingSync') {
            localStorage.setItem(`inventory_${key}`, JSON.stringify(value));
            console.log(`💾 [MOBILE-STORAGE] Fallback: ${key} salvo individualmente`);
          }
        });
        console.log('✅ [MOBILE-STORAGE] Salvamento individual bem-sucedido');
      } catch (fallbackError) {
        console.error('❌ [MOBILE-STORAGE] Erro crítico no fallback:', fallbackError);
        
        // Mostrar alerta específico para mobile
        if (this.isMobileDevice()) {
          alert('📱 Erro ao salvar dados offline.\n\nPossíveis soluções:\n• Libere espaço no dispositivo\n• Feche outras abas do navegador\n• Reinicie o aplicativo');
        } else {
          alert('Erro crítico ao salvar dados offline. Verifique o espaço de armazenamento do navegador.');
        }
      }
    }
  }

  // Detectar se é dispositivo móvel
  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
           window.innerWidth <= 768;
  }

  // Add item to sync queue
  addToSyncQueue(collection: keyof OfflineData['pendingSync'], item: any): void {
    try {
      console.log(`📝 [MOBILE-STORAGE] Adicionando à fila [${collection}]:`, {
        id: item.id,
        name: item.name || item.borrowerName || item.operador || 'Item sem nome',
        isMobile: this.isMobileDevice()
      });
      
      // Validate item before adding
      if (!item || typeof item !== 'object') {
        console.warn('⚠️ [MOBILE-STORAGE] Item inválido:', item);
        return;
      }

      const data = this.getOfflineData();
      
      // Verificar duplicatas com lógica melhorada
      const existingIndex = data.pendingSync[collection].findIndex(existing => 
        existing.id === item.id || 
        (collection === 'products' && existing.sku === item.sku) ||
        (collection === 'schedules' && (existing.code === item.code || existing.id === item.id))
      );
      
      if (existingIndex !== -1) {
        console.log(`🔄 [MOBILE-STORAGE] Atualizando item [${collection}]:`, {
          id: item.id,
          name: item.name || item.borrowerName || item.operador,
          status: item.status,
          isMobile: this.isMobileDevice()
        });
        
        // Preservar dados importantes do item existente
        const existingItem = data.pendingSync[collection][existingIndex];
        
        // Ensure dates are properly handled
        const processedItem = this.processItemDates(item);
        
        data.pendingSync[collection][existingIndex] = {
          ...existingItem, // Preservar dados existentes
          ...processedItem,
          _offlineCreated: existingItem._offlineCreated || item._offlineCreated || false,
          _offlineTimestamp: Date.now(),
          _syncStatus: 'pending',
          _lastUpdate: Date.now(),
          // Preservar contagens se existirem
          countedProducts: item.countedProducts || existingItem.countedProducts || []
        };
      } else {
        console.log(`📝 [MOBILE-STORAGE] Novo item [${collection}]:`, {
          id: item.id,
          name: item.name || item.borrowerName || item.operador,
          hasCountedProducts: item.countedProducts?.length || 0,
          status: item.status
        });
        
        // Determinar se é criação offline
        const isOfflineCreated = item.id && (item.id.toString().startsWith('local_') || !isNaN(Number(item.id)));
        
        // Process dates properly
        const processedItem = this.processItemDates(item);
        
        const itemWithMetadata = {
          ...processedItem,
          _offlineCreated: isOfflineCreated,
          _offlineTimestamp: Date.now(),
          _syncStatus: 'pending',
          _lastUpdate: Date.now()
        };

        data.pendingSync[collection].push(itemWithMetadata);
      }
      
      this.saveOfflineData(data);
      
      // Log status da fila
      const totalPending = Object.values(data.pendingSync).reduce((sum, queue) => sum + queue.length, 0);
      console.log(`📊 [MOBILE-STORAGE] Fila atualizada: ${totalPending} itens pendentes`);
      
      // Verificar se foi realmente salvo
      const verification = this.getOfflineData();
      const verificationCount = Object.values(verification.pendingSync).reduce((sum, queue) => sum + queue.length, 0);
      console.log(`✅ [MOBILE-STORAGE] Verificação: ${verificationCount} itens na fila`);
      
    } catch (error) {
      console.error('❌ [MOBILE-STORAGE] Erro ao adicionar à fila:', error);
      // Don't throw error - continue operation
    }
  }

  // Process item dates to ensure they are valid Date objects
  private processItemDates(item: any): any {
    const processedItem = { ...item };
    
    // Common date fields to process
    const dateFields = ['createdAt', 'updatedAt', 'scheduledDate', 'completedAt', 'countedAt', 'validatedAt'];
    
    dateFields.forEach(field => {
      if (processedItem[field]) {
        try {
          if (typeof processedItem[field] === 'string') {
            processedItem[field] = new Date(processedItem[field]);
          } else if (processedItem[field] && typeof processedItem[field].toDate === 'function') {
            // Firebase Timestamp
            processedItem[field] = processedItem[field].toDate();
          }
          
          // Validate date
          if (processedItem[field] && isNaN(processedItem[field].getTime())) {
            console.warn(`⚠️ [STORAGE] Data inválida para campo ${field}:`, item[field]);
            processedItem[field] = new Date();
          }
        } catch (error) {
          console.warn(`⚠️ [STORAGE] Erro ao processar data ${field}:`, error);
          processedItem[field] = new Date();
        }
      }
    });
    
    // Process nested date fields (like in countedProducts)
    if (processedItem.countedProducts && Array.isArray(processedItem.countedProducts)) {
      processedItem.countedProducts = processedItem.countedProducts.map((count: any) => ({
        ...count,
        countedAt: this.processDate(count.countedAt),
        validations: (count.validations || []).map((validation: any) => ({
          ...validation,
          validatedAt: this.processDate(validation.validatedAt)
        }))
      }));
    }
    
    return processedItem;
  }

  // Helper to process individual dates
  private processDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    try {
      if (dateValue instanceof Date) {
        return isNaN(dateValue.getTime()) ? new Date() : dateValue;
      }
      
      if (typeof dateValue === 'string') {
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      
      if (dateValue && typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
      }
      
      return new Date(dateValue);
    } catch (error) {
      console.warn('⚠️ [STORAGE] Erro ao processar data:', error);
      return new Date();
    }
  }

  // Get sync queue for a collection
  getSyncQueue(collection: keyof OfflineData['pendingSync']): any[] {
    const data = this.getOfflineData();
    return data.pendingSync[collection] || [];
  }

  // Clear sync queue for a collection
  clearSyncQueue(collection: keyof OfflineData['pendingSync']): void {
    const data = this.getOfflineData();
    data.pendingSync[collection] = [];
    this.saveOfflineData(data);
    console.log(`🧹 Fila de sincronização limpa [${collection}]`);
  }

  // Clear all sync queues
  clearAllSyncQueues(): void {
    const data = this.getOfflineData();
    Object.keys(data.pendingSync).forEach(collection => {
      data.pendingSync[collection as keyof OfflineData['pendingSync']] = [];
    });
    this.saveOfflineData(data);
    console.log('🧹 Todas as filas de sincronização foram limpas');
  }
  // Check if item exists in collection (by ID or unique identifier)
  itemExistsInCollection(collection: keyof Omit<OfflineData, 'lastModified' | 'pendingSync'>, item: any): boolean {
    const data = this.getOfflineData();
    const collectionData = data[collection] || [];
    
    // Check by ID first
    if (item.id && collectionData.find((existing: any) => existing.id === item.id)) {
      return true;
    }
    
    // Check by unique identifiers
    if (collection === 'products' && item.sku) {
      return collectionData.some((existing: any) => existing.sku === item.sku);
    }
    if (collection === 'schedules' && item.code) {
      return collectionData.some((existing: any) => existing.code === item.code);
    }
    
    return false;
  }

  // Mark item as synced
  markAsSynced(collection: keyof OfflineData['pendingSync'], itemId: string): void {
    const data = this.getOfflineData();
    data.pendingSync[collection] = data.pendingSync[collection].filter(
      item => item.id !== itemId
    );
    this.saveOfflineData(data);
  }

  // Get pending sync count
  getPendingSyncCount(): number {
    const data = this.getOfflineData();
    const pendingCount = Object.values(data.pendingSync).reduce(
      (total, queue) => total + queue.length, 
      0
    );
    
    // Se não há itens pendentes, verificar se há dados locais que precisam ser sincronizados
    if (pendingCount === 0) {
      const localItemsNeedingSync = this.getLocalItemsNeedingSync();
      if (localItemsNeedingSync > 0) {
        console.log(`🔍 [STORAGE] Detectados ${localItemsNeedingSync} itens locais que precisam de sincronização`);
        this.addLocalItemsToSyncQueue();
        return this.getPendingSyncCount(); // Recalcular após adicionar à fila
      }
    }
    
    return pendingCount;
  }

  // Verificar quantos itens locais precisam de sincronização
  private getLocalItemsNeedingSync(): number {
    const data = this.getOfflineData();
    let count = 0;
    
    // Verificar produtos locais
    count += data.products.filter(item => 
      this.isLocalItem(item) && !this.isAlreadyInSyncQueue('products', item)
    ).length;
    
    // Verificar movimentações locais
    count += data.movements.filter(item => 
      this.isLocalItem(item) && !this.isAlreadyInSyncQueue('movements', item)
    ).length;
    
    // Verificar empréstimos locais
    count += data.loans.filter(item => 
      this.isLocalItem(item) && !this.isAlreadyInSyncQueue('loans', item)
    ).length;
    
    // Verificar apenas agendamentos locais (não re-sincronizar agendamentos do Firebase)
    count += data.schedules.filter(item => 
      this.isLocalItem(item) && !this.isAlreadyInSyncQueue('schedules', item)
    ).length;
    
    // Verificar usuários locais
    count += data.users.filter(item => 
      this.isLocalItem(item) && !this.isAlreadyInSyncQueue('users', item)
    ).length;
    
    // Verificar reservas locais
    count += data.reservations.filter(item => 
      this.isLocalItem(item) && !this.isAlreadyInSyncQueue('reservations', item)
    ).length;
    
    return count;
  }

  // Verificar se item é local (criado offline)
  private isLocalItem(item: any): boolean {
    // Item é considerado local apenas se foi criado offline
    return item._offlineCreated === true || 
           (item.id && item.id.toString().startsWith('local_'));
  }

  // Verificar se item já está na fila de sincronização
  private isAlreadyInSyncQueue(collection: keyof OfflineData['pendingSync'], item: any): boolean {
    const data = this.getOfflineData();
    return data.pendingSync[collection].some(queueItem => 
      queueItem.id === item.id || 
      (collection === 'products' && queueItem.sku === item.sku) ||
      (collection === 'schedules' && queueItem.code === item.code)
    );
  }

  // Adicionar itens locais à fila de sincronização
  private addLocalItemsToSyncQueue(): void {
    const data = this.getOfflineData();
    let addedCount = 0;
    
    console.log('🔍 [STORAGE] Verificando itens locais para adicionar à fila...');
    
    // Adicionar produtos locais
    data.products.forEach(item => {
      if (this.isLocalItem(item) && !this.isAlreadyInSyncQueue('products', item)) {
        this.addToSyncQueue('products', item);
        addedCount++;
      }
    });
    
    // Adicionar movimentações locais
    data.movements.forEach(item => {
      if (this.isLocalItem(item) && !this.isAlreadyInSyncQueue('movements', item)) {
        this.addToSyncQueue('movements', item);
        addedCount++;
      }
    });
    
    // Adicionar empréstimos locais
    data.loans.forEach(item => {
      if (this.isLocalItem(item) && !this.isAlreadyInSyncQueue('loans', item)) {
        this.addToSyncQueue('loans', item);
        addedCount++;
      }
    });
    
    // Adicionar agendamentos locais ou com contagens
    data.schedules.forEach(item => {
      const needsSync = (this.isLocalItem(item) || item.countedProducts?.length > 0) && 
                       !this.isAlreadyInSyncQueue('schedules', item);
      if (needsSync) {
        console.log(`📝 [STORAGE] Adicionando agendamento à fila:`, {
          id: item.id,
          name: item.name,
          status: item.status,
          countedProducts: item.countedProducts?.length || 0,
          isLocal: this.isLocalItem(item)
        });
        this.addToSyncQueue('schedules', item);
        addedCount++;
      }
    });
    
    // Adicionar usuários locais
    data.users.forEach(item => {
      if (this.isLocalItem(item) && !this.isAlreadyInSyncQueue('users', item)) {
        this.addToSyncQueue('users', item);
        addedCount++;
      }
    });
    
    // Adicionar reservas locais
    data.reservations.forEach(item => {
      if (this.isLocalItem(item) && !this.isAlreadyInSyncQueue('reservations', item)) {
        this.addToSyncQueue('reservations', item);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      console.log(`✅ [STORAGE] ${addedCount} itens locais adicionados à fila de sincronização`);
    }
  }

  // Save specific collection data
  saveCollection(collection: keyof Omit<OfflineData, 'lastModified' | 'pendingSync'>, items: any[]): void {
    try {
      const data = this.getOfflineData();
      
      // Remover duplicatas com lógica aprimorada
      const uniqueItems = this.removeDuplicates(items, collection);
      
      console.log(`💾 [MOBILE-STORAGE] Salvando [${collection}]:`, {
        originalCount: items.length,
        uniqueCount: uniqueItems.length,
        timestamp: new Date().toLocaleTimeString()
      });
      
      data[collection] = uniqueItems;
      this.saveOfflineData(data);
      
      // Salvar também no localStorage específico (backup)
      try {
        localStorage.setItem(`inventory_${collection}`, JSON.stringify(uniqueItems));
        console.log(`💾 [MOBILE-STORAGE] Backup ${collection}: ${uniqueItems.length} itens`);
        
        // Verificar se foi realmente salvo
        const verification = localStorage.getItem(`inventory_${collection}`);
        if (!verification) {
          throw new Error('Falha na verificação do salvamento');
        }
        
        console.log(`✅ [MOBILE-STORAGE] ${collection} confirmado no localStorage`);
      } catch (error) {
        console.error(`❌ [MOBILE-STORAGE] Erro crítico ao salvar ${collection}:`, error);
        
        // Tentar salvar item por item como último recurso
        try {
          uniqueItems.forEach((item, index) => {
            localStorage.setItem(`inventory_${collection}_${index}`, JSON.stringify(item));
          });
          localStorage.setItem(`inventory_${collection}_count`, uniqueItems.length.toString());
          console.log(`🆘 [MOBILE-STORAGE] ${collection} salvo item por item`);
        } catch (itemError) {
          console.error(`🚨 [MOBILE-STORAGE] Falha total ao salvar ${collection}:`, itemError);
          alert(`Erro crítico: Não foi possível salvar ${collection}. Verifique o espaço de armazenamento.`);
        }
      }
    } catch (error) {
      console.error(`❌ [MOBILE-STORAGE] Erro ao salvar coleção ${collection}:`, error);
      alert(`Erro ao salvar dados offline. Verifique o espaço de armazenamento do navegador.`);
    }
  }

  // Helper method to remove duplicates based on collection type
  private removeDuplicates(items: any[], collection: keyof Omit<OfflineData, 'lastModified' | 'pendingSync'>): any[] {
    if (collection === 'reservations') {
      // For reservations, keep the latest reservation for each operator-equipment combination
      const uniqueReservations = new Map<string, any>();
      
      items.forEach(item => {
        const key = `${item.operador}-${item.equipamento}`;
        const existing = uniqueReservations.get(key);
        
        // Keep the most recent reservation (by updatedAt or createdAt)
        const itemDate = new Date(item.updatedAt || item.createdAt);
        const existingDate = existing ? new Date(existing.updatedAt || existing.createdAt) : new Date(0);
        
        if (!existing || itemDate > existingDate) {
          uniqueReservations.set(key, item);
        }
      });
      
      return Array.from(uniqueReservations.values());
    }
    
    // For other collections, use existing logic
    return items.filter((item, index, array) => {
      // For products, use SKU as unique identifier
      if (collection === 'products') {
        return array.findIndex(p => p.sku === item.sku) === index;
      }
      // For schedules, use code as unique identifier
      if (collection === 'schedules') {
        return array.findIndex(s => s.code === item.code) === index;
      }
      // For others, use ID
      return array.findIndex(i => i.id === item.id) === index;
    });
  }

  // Get specific collection data
  getCollection(collection: keyof Omit<OfflineData, 'lastModified' | 'pendingSync'>): any[] {
    const data = this.getOfflineData();
    return data[collection] || [];
  }

  // Clear all offline data
  clearAllData(): void {
    try {
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      console.log('🔍 Todas as chaves no localStorage:', allKeys);
      
      // Remove all inventory-related keys except user session
      allKeys.forEach(key => {
        if (key.startsWith('inventory_') && key !== 'inventory_user') {
          console.log('🗑️ Removendo chave:', key);
          localStorage.removeItem(key);
        }
      });
      
      // Force clear main storage keys
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.SYNC_QUEUE_KEY);
      
      console.log('🧹 Todos os dados offline foram limpos');
      
      // Verify clearing worked
      const remainingKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('inventory_') && key !== 'inventory_user'
      );
      console.log('📋 Chaves restantes após limpeza:', remainingKeys);
      
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
    }
  }

  // Force clear everything including browser cache
  forceClearAll(): void {
    try {
      console.log('🚨 LIMPEZA FORÇADA INICIADA');
      
      // Clear all localStorage
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('inventory_') && key !== 'inventory_user') {
          localStorage.removeItem(key);
          console.log('🗑️ Removido:', key);
        }
      });
      
      // Clear sessionStorage as well
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('inventory_')) {
          sessionStorage.removeItem(key);
          console.log('🗑️ Removido do session:', key);
        }
      });
      
      // Reset internal data structure
      const emptyData: OfflineData = {
        products: [],
        movements: [],
        loans: [],
        schedules: [],
        users: [],
        reservations: [],
        lastModified: Date.now(),
        pendingSync: {
          products: [],
          movements: [],
          loans: [],
          schedules: [],
          users: [],
          reservations: []
        }
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(emptyData));
      
      console.log('✅ LIMPEZA FORÇADA CONCLUÍDA');
      
    } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
    }
  }

  // Export data for backup
  exportData(): string {
    const data = this.getOfflineData();
    return JSON.stringify(data, null, 2);
  }

  // Import data from backup
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      this.saveOfflineData(data);
      console.log('✅ Dados importados com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return false;
    }
  }
}

export const offlineStorage = OfflineStorageService.getInstance();
