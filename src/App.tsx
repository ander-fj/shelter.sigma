import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InventoryProvider } from './contexts/InventoryContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './components/ui/Toast';
import { useOfflineSync } from './hooks/useOfflineSync';
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications';
import { MobileOfflineIndicator } from './components/mobile/MobileOfflineIndicator';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Movements } from './pages/Movements';
import { Loans } from './pages/Loans';
import { InventoryScheduling } from './pages/InventoryScheduling';
import { Operator } from './pages/Operator';
import { Users } from './pages/Users';
import { OfflineData } from './pages/OfflineData';
import { Settings } from './pages/Settings';
import { Card, CardContent } from './components/ui/Card';
import { AlertTriangle } from 'lucide-react';

function AuthenticatedAppContent() {
  const { hasPageAccess, hasRole } = useAuth();
  useRealtimeNotifications();
  const { isOnline, pendingSyncCount } = useOfflineSync(); // Initialize offline sync
  
  // Auto-sync on app start if online
  useEffect(() => {
    const initializeSync = async () => {
      if (navigator.onLine) {
        console.log('🚀 App iniciado - verificando sincronização...');
        try {
          const { syncService } = await import('./services/syncService');
          const { offlineStorage } = await import('./services/offlineStorageService');
          
          const pendingCount = offlineStorage.getPendingSyncCount();
          if (pendingCount > 0) {
            console.log(`🔄 ${pendingCount} itens pendentes - iniciando sincronização...`);
            await syncService.autoSync();
          } else {
            console.log('✅ Nenhum item pendente para sincronização');
          }
        } catch (error) {
          console.warn('⚠️ Erro na verificação inicial de sincronização:', error);
        }
      }
    };
    
    // Wait a bit for the app to fully load before syncing
    const timer = setTimeout(initializeSync, 2000);
    return () => clearTimeout(timer);
  }, []);
  
  // Componente para páginas sem acesso
  const AccessDenied = ({ pageName }: { pageName: string }) => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md mx-auto">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar a página de {pageName}.
          </p>
          <p className="text-sm text-gray-500">
            Entre em contato com o administrador para solicitar acesso.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Layout>
      <MobileOfflineIndicator isOnline={isOnline} pendingSyncCount={pendingSyncCount} />
      <Routes>
        <Route 
          path="/" 
          element={hasPageAccess('dashboard') ? <Dashboard /> : <AccessDenied pageName="Dashboard" />} 
        />
        <Route 
          path="/products" 
          element={hasPageAccess('products') ? <Products /> : <AccessDenied pageName="Produtos" />} 
        />
        <Route 
          path="/movements" 
          element={hasPageAccess('movements') ? <Movements /> : <AccessDenied pageName="Movimentações" />} 
        />
        <Route 
          path="/loans" 
          element={hasPageAccess('loans') ? <Loans /> : <AccessDenied pageName="Empréstimos" />} 
        />
        <Route 
          path="/inventory-scheduling" 
          element={hasPageAccess('inventoryScheduling') ? <InventoryScheduling /> : <AccessDenied pageName="Agendamentos" />} 
        />
        <Route 
          path="/operator" 
          element={hasPageAccess('operator') ? <Operator /> : <AccessDenied pageName="Operador" />} 
        />
        <Route 
          path="/users" 
          element={hasPageAccess('users') ? <Users /> : <AccessDenied pageName="Usuários" />} 
        />
        <Route 
          path="/offline-data" 
          element={hasRole('admin') ? <OfflineData /> : <AccessDenied pageName="Dados Offline" />} 
        />
        <Route 
          path="/settings" 
          element={hasRole('admin') ? <Settings /> : <AccessDenied pageName="Configurações" />} 
        />
        <Route path="/suppliers" element={<div className="p-8 text-center text-gray-500">Página de Fornecedores em desenvolvimento</div>} />
      </Routes>
    </Layout>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Carregando Sistema</h2>
          <p className="text-gray-500">Aguarde um momento...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <AuthenticatedAppContent />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <InventoryProvider>
            <AppContent />
          </InventoryProvider>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}

export default App;