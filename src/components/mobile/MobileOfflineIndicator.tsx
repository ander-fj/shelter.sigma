import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  Smartphone, 
  CheckCircle, 
  Clock,
  X,
  RefreshCw,
  Database,
  Info
} from 'lucide-react';

interface MobileOfflineIndicatorProps {
  isOnline: boolean;
  pendingSyncCount: number;
}

export function MobileOfflineIndicator({ isOnline, pendingSyncCount }: MobileOfflineIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastOfflineTime, setLastOfflineTime] = useState<Date | null>(null);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(null);

  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Monitorar mudanças de status
  useEffect(() => {
    if (isOnline) {
      setLastOnlineTime(new Date());
    } else {
      setLastOfflineTime(new Date());
    }
  }, [isOnline]);

  // Auto-hide details after 10 seconds
  useEffect(() => {
    if (showDetails) {
      const timer = setTimeout(() => {
        setShowDetails(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showDetails]);

  // Não mostrar se não for mobile e estiver online sem dados pendentes
  if (!isMobile && isOnline && pendingSyncCount === 0) {
    return null;
  }

  const getStatusInfo = () => {
    if (isOnline) {
      if (pendingSyncCount > 0) {
        return {
          icon: Cloud,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: '📱 Online - Sincronizando',
          message: `${pendingSyncCount} itens sendo sincronizados`,
          badge: 'info' as const
        };
      } else {
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: '📱 Online - Sincronizado',
          message: 'Todos os dados estão na nuvem',
          badge: 'success' as const
        };
      }
    } else {
      return {
        icon: CloudOff,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        title: '📱 Modo Offline',
        message: pendingSyncCount > 0 
          ? `${pendingSyncCount} itens salvos offline`
          : 'Continue trabalhando - dados seguros',
        badge: 'warning' as const
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      {/* Indicador Fixo Mobile */}
      <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${isMobile ? 'block' : 'hidden'}`}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg border-2 ${statusInfo.bgColor} ${statusInfo.borderColor} hover:shadow-xl transition-all duration-200`}
        >
          <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
          <span className={`text-sm font-medium ${statusInfo.color}`}>
            {isOnline ? (pendingSyncCount > 0 ? 'Sync' : 'OK') : 'Offline'}
          </span>
          {pendingSyncCount > 0 && (
            <Badge variant={statusInfo.badge} size="sm">
              {pendingSyncCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Painel de Detalhes */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                    <statusInfo.icon className={`w-6 h-6 ${statusInfo.color}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${statusInfo.color}`}>
                      {statusInfo.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {statusInfo.message}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Status Details */}
              <div className="space-y-4">
                {/* Connection Info */}
                <div className={`p-3 rounded-lg ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      Status da Conexão
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">
                    {isOnline 
                      ? '✅ Conectado à internet'
                      : '❌ Sem conexão - trabalhando offline'
                    }
                  </p>
                  {lastOnlineTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      Última conexão: {lastOnlineTime.toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {/* Data Status */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Dados Locais
                    </span>
                  </div>
                  {pendingSyncCount > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">
                        📱 {pendingSyncCount} itens salvos offline
                      </p>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3 h-3 text-orange-600" />
                        <span className="text-xs text-orange-700">
                          {isOnline ? 'Sincronizando automaticamente...' : 'Aguardando conexão'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-sm text-green-700">
                        Todos os dados sincronizados
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">📱 Modo Mobile Offline</p>
                      <ul className="text-xs space-y-1">
                        <li>• Continue navegando normalmente</li>
                        <li>• Crie produtos e movimentações</li>
                        <li>• Dados salvos automaticamente offline</li>
                        <li>• Sincronização automática ao reconectar</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  Fechar
                </Button>
                {isOnline && pendingSyncCount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      // Trigger manual sync
                      window.dispatchEvent(new CustomEvent('manualSync'));
                      setShowDetails(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Sincronizar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}