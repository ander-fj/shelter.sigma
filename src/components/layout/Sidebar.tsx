import { NavLink, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  Database,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Archive,
  UserCheck,
  HandHeart,
  Calendar
} from 'lucide-react';
import { Settings as OperatorIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../contexts/InventoryContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useLayout } from '../../contexts/LayoutContext';
import { useState, useEffect, useRef } from 'react';
import { InventorySchedule } from '../../types';

export function Sidebar() {
  const { hasRole, hasPageAccess } = useAuth();
  const { alerts, inventorySchedules = [], isOnline: inventoryOnline } = useInventory();
  const { isOnline, pendingSyncCount } = useOfflineSync();
  const { user } = useAuth();
  const { isCollapsed, setIsCollapsed } = useLayout();
  const location = useLocation();

  const unreadAlerts = alerts.filter(alert => !alert.isRead).length;

  // Audio notification for pending schedules
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previousPendingCount, setPreviousPendingCount] = useState(0);

  // Calculate pending schedules for current user
  const getPendingSchedulesForUser = (): InventorySchedule[] => {
    if (!user) return [];
    
    console.log('🔍 Calculando agendamentos pendentes para usuário:', {
      userId: user.id,
      userName: user.name,
      totalSchedules: inventorySchedules.length
    });
    
    return inventorySchedules.filter(schedule => {
      // Check if user is assigned to this schedule
      const isAssigned = schedule.assignedUsers.includes(user.id);
      console.log(`📋 Verificando agendamento "${schedule.name}":`, {
        isAssigned,
        assignedUsers: schedule.assignedUsers,
        userId: user.id
      });
      
      if (!isAssigned) return false;
      
      // Check if schedule requires action from user
      const requiresAction = 
        schedule.status === 'scheduled' || 
        schedule.status === 'in_progress';
      
      console.log(`📋 Status do agendamento "${schedule.name}":`, {
        status: schedule.status,
        requiresAction
      });
      
      // For in_progress schedules, check if there are products that need counting or validation
      if (schedule.status === 'in_progress') {
        const userRole = schedule.userRoles?.[user.id] || 'Apontador';
        console.log(`👤 Papel do usuário no agendamento "${schedule.name}":`, userRole);
        
        // If user is an Apontador, check for uncounted products
        if (userRole === 'Apontador') {
          const totalProducts = schedule.expectedProducts.length;
          const countedProducts = schedule.countedProducts.length;
          const hasProductsToCount = countedProducts < totalProducts;
          console.log(`📊 Progresso de contagem "${schedule.name}":`, {
            totalProducts,
            countedProducts,
            hasProductsToCount
          });
          return hasProductsToCount;
        }
        
        // If user is a Validador, check for products needing validation
        if (userRole === 'Validador') {
          const productsNeedingValidation = schedule.countedProducts.filter(countedProduct => {
            const validations = countedProduct.validations || [];
            const hasValidatorReview = validations.some(v => 
              v.step === 'Validador_review' && v.status === 'approved'
            );
            return !hasValidatorReview; // Needs validation from Validador
          });
          const needsValidation = productsNeedingValidation.length > 0;
          console.log(`✅ Validação necessária "${schedule.name}":`, {
            productsNeedingValidation: productsNeedingValidation.length,
            needsValidation
          });
          return needsValidation;
        }
      }
      
      return requiresAction;
    });
  };

  const pendingSchedules = getPendingSchedulesForUser();
  const pendingCount = pendingSchedules.length;

  // Initialize audio
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio();
    // Using Web Audio API to generate a simple beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Fade out
    
    // Store the audio context for later use
    audioRef.current = { audioContext, oscillator: null, gainNode } as any;
  }, []);
    
  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'manager'], // Administradores e gerentes podem ver o Dashboard
      page: 'dashboard' as const,
    },
    {
      name: 'Produtos',
      href: '/products',
      icon: Package,
      roles: ['admin', 'manager', 'operator', 'viewer'], // Todos os perfis podem ver produtos
      page: 'products' as const,
    },
    {
      name: 'Movimentações',
      href: '/movements',
      icon: TrendingUp,
      roles: ['admin', 'manager', 'operator', 'viewer'], // Todos os perfis podem ver movimentações
      page: 'movements' as const,
    },
    {
      name: 'Empréstimos',
      href: '/loans',
      icon: HandHeart,
      roles: ['admin', 'manager', 'operator', 'viewer'], // Todos os perfis podem ver empréstimos
      page: 'loans' as const,
    },
    {
      name: 'Agendamentos',
      href: '/inventory-scheduling',
      icon: Calendar,
      roles: ['admin', 'manager', 'operator', 'viewer'], // Todos os perfis podem ver agendamentos
      page: 'inventoryScheduling' as const,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      name: 'Operador',
      href: '/operator',
      icon: OperatorIcon,
      roles: ['admin', 'manager', 'operator', 'viewer'], // Todos os perfis podem acessar
      page: 'operator' as const,
    },
    {
      name: 'Usuários',
      href: '/users',
      icon: Users,
      roles: ['admin'], // Apenas administradores podem ver usuários
      page: 'users' as const,
    },
    {
      name: 'Dados Offline',
      href: '/offline-data',
      icon: Database,
      roles: ['admin'], // Apenas administradores podem ver dados offline
      page: 'settings' as const,
    },
    {
      name: 'Configurações',
      href: '/settings',
      icon: Settings,
      roles: ['admin'], // Apenas administradores podem ver configurações
      page: 'settings' as const,
    }
  ];

  const playNotificationSound = () => {
    if (audioRef.current && audioRef.current.audioContext) {
      const { audioContext } = audioRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  };

  // Monitor pending schedules and play sound when count increases
  useEffect(() => {
    console.log('🔔 Verificando agendamentos pendentes:', {
      userId: user?.id,
      userName: user?.name,
      totalSchedules: inventorySchedules.length,
      pendingCount,
      previousCount: previousPendingCount,
      pendingSchedules: pendingSchedules.map(s => ({ name: s.name, status: s.status, id: s.id }))
    });
    
    // Additional debug for Vercel environment
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel')) {
      console.log('🌐 VERCEL DEBUG - Estado dos agendamentos:', {
        hostname: window.location.hostname,
        totalSchedules: inventorySchedules.length,
        userAssignedSchedules: inventorySchedules.filter(s => user ? s.assignedUsers.includes(user.id) : false).length,
        pendingForUser: pendingCount,
        allSchedules: inventorySchedules.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          assignedUsers: s.assignedUsers,
          userRoles: s.userRoles
        }))
      });
    }
    
    // Log detalhado de cada agendamento
    inventorySchedules.forEach(schedule => {
      const isAssigned = user ? schedule.assignedUsers.includes(user.id) : false;
      const userRole = user ? schedule.userRoles?.[user.id] : null;
      
      console.log(`📋 Agendamento "${schedule.name}":`, {
        id: schedule.id,
        status: schedule.status,
        assignedUsers: schedule.assignedUsers,
        userRoles: schedule.userRoles,
        isUserAssigned: isAssigned,
        userRole: userRole,
        expectedProducts: schedule.expectedProducts.length,
        countedProducts: schedule.countedProducts.length,
        requiresAction: (() => {
          if (!isAssigned) return false;
          
          if (schedule.status === 'scheduled') return true;
          
          if (schedule.status === 'in_progress') {
            if (userRole === 'Apontador') {
              const totalProducts = schedule.expectedProducts.length;
              const countedProducts = schedule.countedProducts.length;
              return countedProducts < totalProducts;
            }
            
            if (userRole === 'Validador') {
              const productsNeedingValidation = schedule.countedProducts.filter(countedProduct => {
                const validations = countedProduct.validations || [];
                const hasValidatorReview = validations.some(v => 
                  v.step === 'Validador_review' && v.status === 'approved'
                );
                return !hasValidatorReview;
              });
              return productsNeedingValidation.length > 0;
            }
          }
          
          return false;
        })()
      });
    });
    
    if (pendingCount > previousPendingCount && previousPendingCount >= 0) {
      console.log('🔊 Tocando som de notificação - novos agendamentos pendentes');
      playNotificationSound();
    }
    
    setPreviousPendingCount(pendingCount);
  }, [pendingCount, previousPendingCount, user?.id]);

  // Helper function to get user display name
  const getUserDisplayName = (userId: string): string => {
    // Map specific user IDs to names
    const userNameMap: Record<string, string> = {
      'PJ30Q63zDfMqeKnXiomb': 'Renan',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos',
      '1': 'Admin Master',
      '2': 'Maria Silva',
      '3': 'João Santos'
    };
    
    return userNameMap[userId] || `Usuário ${userId.substring(0, 8)}`;
  };

  const filteredNavigation = navigation.filter(item => 
    item.roles.some(role => hasRole(role as any)) && hasPageAccess(item.page)
  );

  return (
    <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ${isCollapsed ? 'w-18' : 'w-80'}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {!isCollapsed && (
            <div className="flex flex-col items-center w-full">
              <div
                  className="w-36 h-20 rounded-lg flex items-center justify-center bg-cover bg-center bg-no-repeat shadow-sm border border-gray-100"
                  style={{
                      backgroundImage: `url('/SHELTER.jpg')`,
                      backgroundColor: '#ffffffff'
                  }}
              />
              <div className="text-center mt-2">
                <h2 className="text-lg font-bold text-gray-900"> </h2>
                <p className="text-xs text-gray-400">O futuro é sobre trilhos.</p>
                {/* Offline/Sync Status */}
                <div className="flex items-center space-x-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${inventoryOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {pendingSyncCount > 0 && (
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                      {pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-full relative">
              <div 
                className="w-14 h-8 rounded-lg flex items-center justify-center bg-cover bg-center bg-no-repeat shadow-sm border border-gray-100"
                style={{
                  backgroundImage: `url('/SHELTER.jpg')`,
                  backgroundColor: '#ffffff'
                }}
                title="Shelter - Sistema de Inventário"
              ></div>
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} title={isOnline ? 'Online' : 'Offline'}></div>
              {pendingSyncCount > 0 && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-white font-bold">{pendingSyncCount > 9 ? '9+' : pendingSyncCount}</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0 bg-gray-700/50 border border-gray-600"
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-gray-300" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-gray-300" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 space-y-1 ${isCollapsed ? 'p-2' : 'p-4'}`}>
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`
                  flex items-center rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center px-2 py-3 mx-1' : 'justify-start px-3 py-2'}
                `}
              >
                <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && (
                  <>
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-2 h-2 flex items-center justify-center"></span>
                )}
              </NavLink>
            );
          })}
          
          {/* Collapse/Expand hint */}
          {!isCollapsed && (
            <div className="pt-4 mt-4 border-t border-gray-700">
              {/* Sync Status */}
              {pendingSyncCount > 0 && (
                <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-400/30 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                    <p className="text-xs text-yellow-300 mt-1">
                      {isOnline ? 'Sincronizando automaticamente...' : 'Dados seguros - conecte para sincronizar'}
                    </p>
                  </div>
                  <p className="text-xs text-yellow-400 mt-1">
                    {isOnline ? 'Dados serão sincronizados automaticamente' : 'Conecte-se para sincronizar'}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white hover:bg-gray-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Recolher Menu</span>
                </Button>
              </div>
            </div>
          )}
        </nav>
      </div>
    </div>
  );
}