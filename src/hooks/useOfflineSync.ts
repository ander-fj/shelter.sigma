import { useEffect, useState } from 'react';
import { syncService, SyncResult } from '../services/syncService';
import { offlineStorage } from '../services/offlineStorageService';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [connectionStable, setConnectionStable] = useState(true);
  const { addToast } = useToast();
  const { user } = useAuth();

  // Monitor online status
  useEffect(() => {
    let connectionCheckTimeout: NodeJS.Timeout;
    let autoSyncTimeout: NodeJS.Timeout;
    
    const handleOnline = () => {
      console.log('🌐 [MOBILE-SYNC] Conexão detectada - verificando estabilidade...');
      setIsOnline(true);
      setConnectionStable(false);
      
      // Verificar estabilidade da conexão antes de sincronizar
      connectionCheckTimeout = setTimeout(() => {
        if (navigator.onLine) {
          console.log('✅ [MOBILE-SYNC] Conexão estável confirmada');
          setConnectionStable(true);
          
          // Aguardar mais um pouco antes de iniciar sincronização automática
          autoSyncTimeout = setTimeout(() => {
            if (navigator.onLine && autoSyncEnabled) {
              console.log('🔄 [MOBILE-SYNC] Iniciando sincronização automática...');
              performAutoSync();
            }
          }, 2000);
        }
      }, 3000); // Aguardar 3 segundos para confirmar estabilidade
    };

    const performAutoSync = async () => {
      try {
        console.log('🔍 [MOBILE-SYNC] Verificando dados para sincronização...');
        
        // Forçar verificação de dados locais
        const pendingCount = offlineStorage.getPendingSyncCount();
        const offlineData = offlineStorage.getOfflineData();
        
        console.log('📊 [MOBILE-SYNC] Estado detalhado ao reconectar:', {
          pendingCount,
          totalOfflineItems: offlineData.products.length + offlineData.movements.length + 
                            offlineData.loans.length + offlineData.schedules.length + 
                            offlineData.users.length + offlineData.reservations.length,
          user: user?.name || 'Usuário não logado'
        });
        
        if (pendingCount > 0) {
          console.log(`🔄 [MOBILE-SYNC] ${pendingCount} itens para sincronizar`);
          
          addToast({
            type: 'info',
            title: '📱 Sincronizando Dados',
            message: `${pendingCount} itens salvos offline sendo sincronizados...`,
            duration: 4000
          });
          
          const result = await syncService.autoSync();
          
          if (result.success && result.totalSynced > 0) {
            console.log('✅ [MOBILE-SYNC] Auto-sincronização concluída');
            addToast({
              type: 'success',
              title: '✅ Dados Sincronizados',
              message: `${result.totalSynced} itens salvos no Firebase`,
              duration: 5000
            });
            setLastSyncTime(new Date());
          } else if (result.errors.length > 0) {
            console.warn('⚠️ [MOBILE-SYNC] Erro na auto-sincronização:', result.errors);
            addToast({
              type: 'warning',
              title: '⚠️ Sincronização Parcial',
              message: 'Alguns dados não puderam ser sincronizados. Dados mantidos offline.',
              duration: 6000
            });
          }
        } else {
          console.log('✅ [MOBILE-SYNC] Nenhum item pendente para sincronização');
        }
      } catch (error) {
        console.error('❌ [MOBILE-SYNC] Erro na sincronização automática:', error);
        addToast({
          type: 'error',
          title: '❌ Erro na Sincronização',
          message: 'Dados mantidos offline. Tente sincronizar manualmente.',
          duration: 6000
        });
      }
    };

    const handleOffline = () => {
      console.log('📴 [MOBILE-SYNC] Conexão perdida - ativando modo offline');
      setIsOnline(false);
      setConnectionStable(false);
      
      // Limpar timeouts pendentes
      if (connectionCheckTimeout) clearTimeout(connectionCheckTimeout);
      if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
      
      // Garantir que dados atuais sejam preservados
      console.log('💾 [MOBILE-SYNC] Preservando dados no modo offline...');
      
      setTimeout(() => {
        try {
          // Verificar dados no localStorage
          const currentProducts = JSON.parse(localStorage.getItem('inventory_products') || '[]');
          const currentMovements = JSON.parse(localStorage.getItem('inventory_movements') || '[]');
          const currentLoans = JSON.parse(localStorage.getItem('inventory_loans') || '[]');
          const currentSchedules = JSON.parse(localStorage.getItem('inventory_schedules') || '[]');
          
          console.log('💾 [MOBILE-SYNC] Estado preservado:', {
            products: currentProducts.length,
            movements: currentMovements.length,
            loans: currentLoans.length,
            schedules: currentSchedules.length
          });
        } catch (error) {
          console.warn('⚠️ [MOBILE-SYNC] Erro ao verificar estado offline:', error);
        }
      }, 1000);
      
      addToast({
        type: 'info',
        title: '📱 Modo Offline Ativo',
        message: 'Continue trabalhando - dados serão salvos localmente',
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connectionCheckTimeout) clearTimeout(connectionCheckTimeout);
      if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
    };
  }, [addToast]);

  // Monitor sync status
  useEffect(() => {
    const updateSyncStatus = () => {
      setIsSyncing(syncService.isSyncInProgress());
      const count = offlineStorage.getPendingSyncCount();
      setPendingSyncCount(count);
      
      // Log para debug mobile
      if (count > 0) {
        console.log(`📱 [MOBILE-SYNC] ${count} itens pendentes para sincronização`);
      }
    };

    // Update initially
    updateSyncStatus();

    // Update every 10 seconds (menos frequente para mobile)
    const interval = setInterval(updateSyncStatus, 10000);

    // Listen for sync results
    const unsubscribe = syncService.addSyncListener((result: SyncResult) => {
      setLastSyncTime(new Date());
      
      if (result.success && result.totalSynced > 0) {
        console.log('📱 [MOBILE-SYNC] Sincronização bem-sucedida:', result.totalSynced);
        addToast({
          type: 'success',
          title: '📱 Dados Salvos na Nuvem',
          message: `${result.totalSynced} itens sincronizados automaticamente`,
          duration: 4000
        });
      } else if (!result.success) {
        console.warn('📱 [MOBILE-SYNC] Erro na sincronização:', result.errors);
        addToast({
          type: 'error',
          title: '📱 Erro na Sincronização',
          message: 'Dados mantidos offline. Tentaremos novamente.',
          duration: 6000
        });
      }
      
      updateSyncStatus();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [addToast]);

  // Manual sync function
  const manualSync = async (): Promise<SyncResult> => {
    if (!isOnline) {
      console.warn('📴 [MOBILE-SYNC] Tentativa de sincronização manual offline');
      addToast({
        type: 'warning',
        title: '📱 Sem Internet',
        message: 'Dados salvos offline. Conecte-se para sincronizar.',
        duration: 4000
      });
      
      return {
        success: false,
        syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
        errors: ['Sem conexão com a internet'],
        totalSynced: 0
      };
    }

    try {
      console.log('🔄 [MOBILE-SYNC] Iniciando sincronização manual');
      addToast({
        type: 'info',
        title: '📱 Sincronizando...',
        message: 'Enviando dados salvos offline...',
        duration: 2000
      });

      return await syncService.syncToFirebase();
    } catch (error) {
      console.error('❌ [SYNC] Erro na sincronização manual:', error);
      addToast({
        type: 'error',
        title: 'Erro na Sincronização',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        duration: 6000
      });
      
      return {
        success: false,
        syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
        totalSynced: 0
      };
    }
  };

  // Force sync all data
  const forceSyncAll = async (): Promise<SyncResult> => {
    if (!isOnline) {
      addToast({
        type: 'warning',
        title: '📱 Sem Internet',
        message: 'Dados salvos offline. Conecte-se para sincronizar.',
        duration: 4000
      });
      
      return {
        success: false,
        syncedItems: { products: 0, movements: 0, loans: 0, schedules: 0, users: 0, reservations: 0 },
        errors: ['Sem conexão com a internet'],
        totalSynced: 0
      };
    }

    addToast({
      type: 'info',
      title: '📱 Sincronização Completa',
      message: 'Enviando todos os dados offline...',
      duration: 2000
    });

    return await syncService.forceSyncAll();
  };

  return {
    isOnline,
    connectionStable,
    isSyncing,
    pendingSyncCount,
    lastSyncTime,
    manualSync,
    forceSyncAll,
    autoSyncEnabled,
    setAutoSyncEnabled
  };
}