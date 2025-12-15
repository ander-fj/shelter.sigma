import { Bell, Search, User, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../contexts/InventoryContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const { loading } = useInventory();
  const { isOnline, lastSyncTime, pendingSyncCount, manualSync, isSyncing } = useOfflineSync();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleManualSync = async () => {
    try {
      await manualSync();
    } catch (error) {
      console.error('Erro na sincronização manual:', error);
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar produtos, SKU..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Connection Status and Sync */}
          <div className="flex items-center space-x-3">
            {/* Connection Indicator */}
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            
            {/* Sync Status */}
            {(loading || isSyncing) && (
              <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600" />
            )}
            
            {/* Pending Sync Count */}
            {pendingSyncCount > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSyncDetails(!showSyncDetails)}
                  className="flex items-center space-x-1 px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-xs hover:bg-yellow-800/50 transition-colors font-medium"
                  title={`${pendingSyncCount} itens aguardando sincronização`}
                >
                  <span>📱</span>
                  <span>{pendingSyncCount}</span>
                  <span>pendente{pendingSyncCount > 1 ? 's' : ''}</span>
                </button>
                
                {/* Sync Details Dropdown */}
                {showSyncDetails && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4">
                      <h4 className="font-medium text-gray-900 mb-2">📱 Dados Offline</h4>
                      <p className="text-sm text-gray-600 mb-3">
                        {pendingSyncCount} itens salvos offline aguardando sincronização
                      </p>
                      <div className="space-y-2">
                        <button
                          onClick={handleManualSync}
                          disabled={!isOnline || isSyncing}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSyncing ? '📱 Sincronizando...' : '📱 Sincronizar Agora'}
                        </button>
                        <button
                          onClick={() => setShowSyncDetails(false)}
                          className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Manual Sync Button */}
            {isOnline && pendingSyncCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="text-xs text-blue-400 hover:text-blue-300 hover:bg-gray-700 px-2 py-1 rounded transition-colors font-medium"
                title="Sincronizar dados pendentes"
              >
                {isSyncing ? '📱 Sync...' : '📱 Sync'}
              </button>
            )}
          </div>

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="text-xs text-gray-400">
              Última sync: {format(lastSyncTime, 'HH:mm', { locale: ptBR })}
            </div>
          )}

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center space-x-2">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-200">{user?.name}</p>
                </div>
              </div>
            </button>

            {/* User dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                <div className="py-1">
                  <a 
                    href="/settings"
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Configurações
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/50"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Click outside to close sync details */}
      {showSyncDetails && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSyncDetails(false)}
        />
      )}
    </header>
  );
}