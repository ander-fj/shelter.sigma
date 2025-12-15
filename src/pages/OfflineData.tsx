import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useInventory } from '../contexts/InventoryContext';
import { offlineStorage } from '../services/offlineStorageService';
import { syncService, SyncResult } from '../services/syncService';
import { useToast } from '../components/ui/Toast';
import { 
  Database,
  Cloud,
  CloudOff,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  Package,
  TrendingUp,
  HandHeart,
  Calendar,
  Users,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  HardDrive,
  Wifi,
  WifiOff,
  Save,
  Eye,
  X,
  Info,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../utils/dateUtils';

interface OfflineDataStats {
  products: number;
  movements: number;
  loans: number;
  schedules: number;
  users: number;
  reservations: number;
  total: number;
}

interface PendingSyncStats {
  products: number;
  movements: number;
  loans: number;
  schedules: number;
  users: number;
  reservations: number;
  total: number;
}

export function OfflineData() {
  const { hasRole, user } = useAuth();
  const { clearAllOfflineData } = useInventory();
  const { addToast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineStats, setOfflineStats] = useState<OfflineDataStats>({
    products: 0,
    movements: 0,
    loans: 0,
    schedules: 0,
    users: 0,
    reservations: 0,
    total: 0
  });
  const [pendingStats, setPendingStats] = useState<PendingSyncStats>({
    products: 0,
    movements: 0,
    loans: 0,
    schedules: 0,
    users: 0,
    reservations: 0,
    total: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null);
  const [showDataPreview, setShowDataPreview] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline data statistics
  useEffect(() => {
    const loadStats = () => {
      const data = offlineStorage.getOfflineData();
      
      const offlineStats: OfflineDataStats = {
        products: data.products.length,
        movements: data.movements.length,
        loans: data.loans.length,
        schedules: data.schedules.length,
        users: data.users.length,
        reservations: data.reservations.length,
        total: data.products.length + data.movements.length + data.loans.length + 
               data.schedules.length + data.users.length + data.reservations.length
      };

      const pendingStats: PendingSyncStats = {
        products: data.pendingSync.products.length,
        movements: data.pendingSync.movements.length,
        loans: data.pendingSync.loans.length,
        schedules: data.pendingSync.schedules.length,
        users: data.pendingSync.users.length,
        reservations: data.pendingSync.reservations.length,
        total: Object.values(data.pendingSync).reduce((sum, queue) => sum + queue.length, 0)
      };

      setOfflineStats(offlineStats);
      setPendingStats(pendingStats);
    };

    loadStats();
    
    // Refresh stats every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncAll = async () => {
    if (!isOnline) {
      addToast({
        type: 'warning',
        title: 'Sem Conexão',
        message: 'Conecte-se à internet para sincronizar os dados',
        duration: 4000
      });
      return;
    }

    // Forçar verificação de dados locais antes de sincronizar
    console.log('🔍 [SYNC] Forçando verificação de dados locais...');
    const actualPendingCount = offlineStorage.getPendingSyncCount();
    
    console.log('📊 [SYNC] Contagem real de itens pendentes:', {
      displayedPending: pendingStats.total,
      actualPending: actualPendingCount,
      offlineTotal: offlineStats.total
    });
    
    if (actualPendingCount === 0 && offlineStats.total === 0) {
      addToast({
        type: 'info',
        title: 'Nenhum Dado Pendente',
        message: 'Todos os dados já estão sincronizados',
        duration: 3000
      });
      return;
    }
    
    setIsSyncing(true);
    setSyncResults(null);

    try {
      addToast({
        type: 'info',
        title: 'Sincronização Iniciada',
        message: `Sincronizando ${actualPendingCount || offlineStats.total} itens...`,
        duration: 3000
      });

      // Se não há itens na fila mas há dados offline, forçar sincronização completa
      const result = actualPendingCount > 0 ? 
        await syncService.syncToFirebase() : 
        await syncService.forceSyncAll();
        
      setSyncResults(result);
      setLastSyncTime(new Date());

      if (result.success && result.totalSynced > 0) {
        // Clear synced data from localStorage after successful sync
        console.log('🧹 Limpando dados sincronizados do localStorage...');
        
        // Clear sync queues for successfully synced items
        Object.entries(result.syncedItems).forEach(([collection, count]) => {
          if (count > 0) {
            console.log(`🗑️ Limpando fila de sincronização: ${collection} (${count} itens)`);
            offlineStorage.clearSyncQueue(collection as keyof typeof result.syncedItems);
          }
        });
        
        // Forçar recarregamento das estatísticas
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
        addToast({
          type: 'success',
          title: 'Sincronização Concluída',
          message: `${result.totalSynced} itens sincronizados e removidos do localStorage`,
          duration: 5000
        });
      } else if (result.totalSynced === 0) {
        addToast({
          type: 'info',
          title: 'Nenhum Dado Pendente',
          message: 'Todos os dados já estão sincronizados',
          duration: 3000
        });
      } else {
        addToast({
          type: 'error',
          title: 'Erro na Sincronização',
          message: result.errors[0] || 'Erro desconhecido',
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      addToast({
        type: 'error',
        title: 'Erro na Sincronização',
        message: 'Falha ao sincronizar dados. Tente novamente.',
        duration: 6000
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncCollection = async (collection: keyof typeof pendingStats) => {
    if (!isOnline) {
      addToast({
        type: 'warning',
        title: 'Sem Conexão',
        message: 'Conecte-se à internet para sincronizar',
        duration: 4000
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncService.syncToFirebase();
      
      if (result.success && result.syncedItems[collection] > 0) {
        addToast({
          type: 'success',
          title: 'Sincronização Concluída',
          message: `${result.syncedItems[collection]} ${collection} sincronizados`,
          duration: 4000
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erro na Sincronização',
        message: 'Falha ao sincronizar dados',
        duration: 4000
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOfflineData = () => {
    if (window.confirm('🚨 LIMPAR TODOS OS DADOS OFFLINE?\n\nEsta ação remove todos os dados locais e recarrega a página.\n\nContinuar?')) {
      // Use the context function that properly handles listeners
      if (clearAllOfflineData) {
        clearAllOfflineData();
      } else {
        // Fallback direct clearing
        console.log('🧹 Limpeza direta do localStorage...');
        
        // Clear specific keys
        const keysToRemove = [
          'inventory_products',
          'inventory_movements',
          'inventory_loans', 
          'inventory_schedules',
          'inventory_offline_data',
          'inventory_sync_queue',
          'inventory_users',
          'inventory_reservations'
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removido: ${key}`);
        });
        
        // Force reload
        setTimeout(() => {
          window.location.href = window.location.href;
        }, 500);
      }
    }
  };

  const handleForceClearAll = () => {
    try {
      console.log('🚨 LIMPEZA FORÇADA - Removendo todos os dados offline...');
      
      // 1. Clear offline storage service
      offlineStorage.forceClearAll();
      
      // 2. Clear all localStorage keys manually
      const allKeys = Object.keys(localStorage);
      console.log('🔍 Todas as chaves no localStorage:', allKeys);
      
      allKeys.forEach(key => {
        if (key.startsWith('inventory_') && key !== 'inventory_user') {
          console.log('🗑️ Removendo chave:', key);
          localStorage.removeItem(key);
        }
      });
      
      // 3. Clear sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('inventory_')) {
          console.log('🗑️ Removendo do session:', key);
          sessionStorage.removeItem(key);
        }
      });
      
      // 4. Clear React state immediately
      setOfflineStats({
        products: 0,
        movements: 0,
        loans: 0,
        schedules: 0,
        users: 0,
        reservations: 0,
        total: 0
      });
      
      setPendingStats({
        products: 0,
        movements: 0,
        loans: 0,
        schedules: 0,
        users: 0,
        reservations: 0,
        total: 0
      });
      
      setSyncResults(null);
      setLastSyncTime(null);
      
      // 5. Show success message
      addToast({
        type: 'success',
        title: '✅ Limpeza Concluída',
        message: 'Todos os dados offline foram removidos permanentemente',
        duration: 3000
      });
      
      // 6. Force page reload to ensure clean state
      setTimeout(() => {
        console.log('🔄 Recarregando página para estado completamente limpo...');
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro na limpeza forçada:', error);
      addToast({
        type: 'error',
        title: 'Erro na Limpeza',
        message: 'Erro ao limpar dados. Recarregue a página manualmente.',
        duration: 5000
      });
    }
  };

  const handleClearAllData = () => {
    if (window.confirm('🚨 LIMPAR TODOS OS DADOS?\n\nEsta ação remove:\n✅ Dados locais (localStorage)\n✅ Dados do Firebase (nuvem)\n\nContinuar?')) {
      clearFirebaseAndLocalData();
    }
  };

  const clearFirebaseAndLocalData = async () => {
    try {
      console.log('🚨 INICIANDO LIMPEZA COMPLETA - FIREBASE + LOCAL');
      
      addToast({
        type: 'info',
        title: 'Limpeza Iniciada',
        message: 'Removendo dados do Firebase e localStorage...',
        duration: 3000
      });

      // 1. Clear Firebase data if online
      if (isOnline) {
        console.log('🔥 Limpando dados do Firebase...');
        
        try {
          // Import Firebase services
          const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../config/firebase');
          
          // Delete all collections
          const collections = ['products', 'movements', 'loans', 'inventory_schedules', 'users', 'reservas'];
          
          for (const collectionName of collections) {
            try {
              console.log(`🗑️ Deletando coleção: ${collectionName}`);
              const querySnapshot = await getDocs(collection(db, collectionName));
              
              const deletePromises = querySnapshot.docs.map(document => 
                deleteDoc(doc(db, collectionName, document.id))
              );
              
              await Promise.all(deletePromises);
              console.log(`✅ Coleção ${collectionName} deletada: ${querySnapshot.size} documentos`);
            } catch (error) {
              console.warn(`⚠️ Erro ao deletar coleção ${collectionName}:`, error);
            }
          }
          
          console.log('✅ Dados do Firebase removidos');
        } catch (error) {
          console.error('❌ Erro ao limpar Firebase:', error);
        }
      }

      // 2. Clear all localStorage
      console.log('🧹 Limpando localStorage...');
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('inventory_') && key !== 'inventory_user') {
          localStorage.removeItem(key);
          console.log(`🗑️ Removido: ${key}`);
        }
      });

      // 3. Clear sessionStorage
      console.log('🧹 Limpando sessionStorage...');
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('inventory_')) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removido do session: ${key}`);
        }
      });

      // 4. Clear offline storage service
      offlineStorage.forceClearAll();

      addToast({
        type: 'success',
        title: 'Limpeza Concluída',
        message: 'Dados removidos do Firebase e localStorage. Recarregando...',
        duration: 2000
      });

      // 5. Force complete reload
      setTimeout(() => {
        console.log('🔄 Recarregando página...');
        window.location.replace(window.location.href);
      }, 2000);

    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      addToast({
        type: 'error',
        title: 'Erro na Limpeza',
        message: 'Erro ao limpar dados. Tente novamente.',
        duration: 5000
      });
    }
  };

  const handleExportData = () => {
    try {
      const data = offlineStorage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_offline_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
      link.click();
      URL.revokeObjectURL(url);

      addToast({
        type: 'success',
        title: 'Backup Criado',
        message: 'Dados offline exportados com sucesso',
        duration: 4000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erro no Backup',
        message: 'Falha ao exportar dados offline',
        duration: 4000
      });
    }
  };

  const handlePreviewData = (collection: string) => {
    const data = offlineStorage.getOfflineData();
    const collectionData = data[collection as keyof typeof data] as any[];
    
    if (Array.isArray(collectionData)) {
      setPreviewData(collectionData.slice(0, 10)); // Show first 10 items
      setShowDataPreview(collection);
    }
  };

  const getCollectionIcon = (collection: string) => {
    switch (collection) {
      case 'products': return Package;
      case 'movements': return TrendingUp;
      case 'loans': return HandHeart;
      case 'schedules': return Calendar;
      case 'users': return Users;
      case 'reservations': return Settings;
      default: return FileText;
    }
  };

  const getCollectionLabel = (collection: string) => {
    switch (collection) {
      case 'products': return 'Produtos';
      case 'movements': return 'Movimentações';
      case 'loans': return 'Empréstimos';
      case 'schedules': return 'Agendamentos';
      case 'users': return 'Usuários';
      case 'reservations': return 'Reservas';
      default: return collection;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageSize = () => {
    try {
      const data = offlineStorage.exportData();
      return formatBytes(new Blob([data]).size);
    } catch {
      return 'N/A';
    }
  };

  // Check admin access
  if (!hasRole('admin')) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-600 mb-4">
              Apenas administradores podem acessar o gerenciamento de dados offline.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="w-8 h-8 mr-3" />
            Gerenciamento de Dados Offline
          </h1>
          <p className="text-gray-600 mt-1">
            Visualize e sincronize dados armazenados localmente
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <Card className={`border-2 ${isOnline ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
              {isOnline ? (
                <Cloud className="w-8 h-8 text-green-600" />
              ) : (
                <CloudOff className="w-8 h-8 text-red-600" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${isOnline ? 'text-green-900' : 'text-red-900'}`}>
                {isOnline ? 'Conectado ao Firebase' : 'Modo Offline Ativo'}
              </h3>
              <p className={`text-sm ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline 
                  ? 'Dados podem ser sincronizados com o Firebase em tempo real'
                  : 'Dados estão sendo salvos localmente. Conecte-se para sincronizar.'
                }
              </p>
              {lastSyncTime && (
                <p className="text-xs text-gray-600 mt-1">
                  Última sincronização: {safeFormatDate(lastSyncTime, 'dd/MM/yyyy HH:mm:ss')}
                </p>
              )}
            </div>
            {isOnline && pendingStats.total > 0 && (
              <Button
                onClick={handleSyncAll}
                loading={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Sincronizar Tudo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Itens</p>
                <p className="text-2xl font-bold text-gray-900">{offlineStats.total}</p>
                <p className="text-xs text-gray-500">Armazenados localmente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingStats.total}</p>
                <p className="text-xs text-gray-500">Aguardando sincronização</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Tamanho</p>
                <p className="text-2xl font-bold text-purple-600">{getStorageSize()}</p>
                <p className="text-xs text-gray-500">Espaço utilizado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                {isOnline ? (
                  <Wifi className="w-6 h-6 text-green-600" />
                ) : (
                  <WifiOff className="w-6 h-6 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-2xl font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </p>
                <p className="text-xs text-gray-500">
                  {isOnline ? 'Pronto para sync' : 'Modo local'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Results */}
      {syncResults && (
        <Card className={`border-2 ${syncResults.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardHeader>
            <h3 className={`text-lg font-semibold flex items-center ${
              syncResults.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {syncResults.success ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 mr-2" />
              )}
              Resultado da Última Sincronização
            </h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
              {Object.entries(syncResults.syncedItems).map(([collection, count]) => (
                <div key={collection} className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{count}</p>
                  <p className="text-xs text-gray-600">{getCollectionLabel(collection)}</p>
                </div>
              ))}
            </div>
            
            {syncResults.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Erros:</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {syncResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Offline Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <HardDrive className="w-5 h-5 mr-2" />
                Dados Armazenados Localmente
              </h3>
              <Badge variant="info" size="sm">
                {offlineStats.total} itens
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(offlineStats).filter(([key]) => key !== 'total').map(([collection, count]) => {
                const Icon = getCollectionIcon(collection);
                return (
                  <div key={collection} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getCollectionLabel(collection)}</p>
                        <p className="text-sm text-gray-600">{count} registros</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {count > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreviewData(collection)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Badge variant="default" size="sm">
                        {count}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pending Sync Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Dados Pendentes para Sincronização
              </h3>
              <Badge variant="warning" size="sm">
                {pendingStats.total} pendentes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(pendingStats).filter(([key]) => key !== 'total').map(([collection, count]) => {
                const Icon = getCollectionIcon(collection);
                return (
                  <div key={collection} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-yellow-100 p-2 rounded-lg">
                        <Icon className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getCollectionLabel(collection)}</p>
                        <p className="text-sm text-yellow-700">{count} aguardando sync</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {count > 0 && isOnline && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSyncAll()}
                          disabled={isSyncing}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Upload className="w-3 h-3 mr-1" />
                          Sync
                        </Button>
                      )}
                      <Badge variant={count > 0 ? 'warning' : 'success'} size="sm">
                        {count}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Ações de Gerenciamento
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={handleSyncAll}
              disabled={!isOnline || isSyncing || pendingStats.total === 0}
              loading={isSyncing}
              className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white h-16"
            >
              <Upload className="w-5 h-5" />
              <div className="text-center">
                <p className="font-medium">Sincronizar Pendentes</p>
                <p className="text-xs opacity-90">{pendingStats.total} itens</p>
              </div>
            </Button>

            <Button
              onClick={handleExportData}
              variant="secondary"
              className="flex items-center justify-center space-x-2 h-16"
            >
              <Download className="w-5 h-5" />
              <div className="text-center">
                <p className="font-medium">Exportar Backup</p>
                <p className="text-xs text-gray-600">Arquivo JSON</p>
              </div>
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="flex items-center justify-center space-x-2 h-16"
            >
              <RefreshCw className="w-5 h-5" />
              <div className="text-center">
                <p className="font-medium">Recarregar Dados</p>
                <p className="text-xs text-gray-600">Atualizar página</p>
              </div>
            </Button>

            <Button
              onClick={handleClearOfflineData}
              variant="danger"
              className="flex items-center justify-center space-x-2 h-16 bg-red-600 hover:bg-red-700 text-white font-bold border-2 border-red-400"
            >
              <Trash2 className="w-5 h-5" />
              <div className="text-center">
                <p className="font-bold">🧹 LIMPAR DADOS</p>
                <p className="text-xs opacity-90">Remove offline</p>
              </div>
            </Button>
            
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <h3 className="text-lg font-semibold text-blue-900 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            Como Funciona o Sistema Offline
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-3">Quando Offline:</h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Todos os dados são salvos localmente no navegador</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Sistema funciona normalmente sem internet</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Dados são adicionados à fila de sincronização</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Nenhum dado é perdido</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-3">Quando Online:</h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Dados são salvos diretamente no Firebase</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Sincronização automática dos dados offline</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Atualizações em tempo real entre usuários</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span>Backup automático na nuvem</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Preview Modal */}
      {showDataPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Prévia: {getCollectionLabel(showDataPreview)}
                </h3>
                <Button variant="ghost" onClick={() => setShowDataPreview(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nome/Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Data de Criação
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                          {item.id?.toString().substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.name || item.borrowerName || item.operador || item.reason || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.createdAt ? safeFormatDate(item.createdAt, 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={item._offlineCreated ? 'warning' : 'success'} size="sm">
                            {item._offlineCreated ? 'Offline' : 'Sincronizado'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}