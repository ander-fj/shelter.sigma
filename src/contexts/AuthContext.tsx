import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, PageAccess, DEFAULT_PAGE_ACCESS } from '../types';
import { userService } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  hasPageAccess: (page: keyof PageAccess) => boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('inventory_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Set user immediately for faster loading, then validate in background
        setUser(parsedUser);
        setLoading(false);
        
        // Validate in background without blocking UI
        validateSavedUser(parsedUser).catch(error => {
          console.warn('Background validation failed:', error);
        });
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('inventory_user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Setup realtime listener for current user updates
  useEffect(() => {
    if (user && user.id) {
      const setupUserListener = async () => {
        try {
          console.log('🔄 Configurando listener para usuário atual:', user.name);
          const unsubscribe = userService.setupUserListener(user.id, (updatedUser) => {
            if (updatedUser) {
              console.log('🔄 Dados do usuário atualizados:', updatedUser.name);
              setUser(updatedUser);
              localStorage.setItem('inventory_user', JSON.stringify(updatedUser));
            } else {
              // User was deleted or deactivated
              console.warn('⚠️ Usuário foi removido ou desativado - fazendo logout');
              logout();
            }
          });
          
          setRealtimeUnsubscribe(() => unsubscribe);
        } catch (error) {
          console.error('Erro ao configurar listener do usuário:', error);
        }
      };

      setupUserListener();
    }

    // Cleanup function
    return () => {
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }
    };
  }, [user?.id]);
  const validateSavedUser = async (savedUser: User) => {
    try {
      // Get all users from Firestore to validate the saved user
      const firestoreUsers = await userService.getAllUsers();
      const validUser = firestoreUsers.find(u => 
        u.id === savedUser.id && 
        u.email === savedUser.email && 
        u.isActive
      );

      if (validUser) {
        // Update user data if different from saved version
        if (JSON.stringify(validUser) !== JSON.stringify(savedUser)) {
          setUser(validUser);
          localStorage.setItem('inventory_user', JSON.stringify(validUser));
        }
      } else {
        // User no longer exists or is inactive, remove from localStorage
        console.warn('User no longer valid, logging out');
        localStorage.removeItem('inventory_user');
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao validar usuário salvo:', error);
      // If validation fails, keep the saved user for offline functionality
      // User is already set, no need to set again
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      // Try to validate user credentials with Firebase fallback
      const foundUser = await userService.validateUserCredentials(email, password);

      if (foundUser) {
        // Update last login time
        const updatedUser = { ...foundUser, lastLogin: new Date() };
        
        // Update last login in Firestore
        try {
          await userService.updateLastLogin(foundUser.id);
        } catch (error) {
          console.warn('Não foi possível atualizar último login no Firestore:', error);
        }

        // Save user to localStorage and state
        setUser(updatedUser);
        localStorage.setItem('inventory_user', JSON.stringify(updatedUser));
        
        // Trigger automatic sync after successful login
        console.log('🔄 Usuário logado - iniciando sincronização automática...');
        setTimeout(() => {
          // Import sync service and trigger auto sync
          import('../services/syncService').then(({ syncService }) => {
            if (navigator.onLine) {
              console.log('🌐 Online - iniciando sincronização completa...');
              syncService.autoSync().catch(error => {
                console.warn('⚠️ Erro na sincronização automática:', error);
              });
            } else {
              console.log('📴 Offline - sincronização será executada quando conectar');
            }
          }).catch(error => {
            console.warn('⚠️ Erro ao importar serviço de sincronização:', error);
          });
        }, 1000); // Wait 1 second after login to start sync
        
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (error) {
      console.error('Erro durante login:', error);
      
      // Try local fallback authentication
      try {
        const localUser = userService.validateUserCredentialsLocally(email, password);
        if (localUser) {
          const updatedUser = { ...localUser, lastLogin: new Date() };
          setUser(updatedUser);
          localStorage.setItem('inventory_user', JSON.stringify(updatedUser));
          
          // Also trigger sync for local users when they go online
          console.log('🔄 Login local - sincronização será executada quando conectar');
          
          setLoading(false);
          return true;
        }
      } catch (localError) {
        console.error('Erro na validação local:', localError);
      }
      
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    // Garantir que dados sejam salvos antes do logout
    console.log('🚪 Fazendo logout - verificando persistência de dados...');
    
    // Verificar se há dados no localStorage
    const schedules = localStorage.getItem('inventory_schedules');
    const products = localStorage.getItem('inventory_products');
    const movements = localStorage.getItem('inventory_movements');
    const loans = localStorage.getItem('inventory_loans');
    
    console.log('💾 Dados no localStorage antes do logout:');
    console.log('- Agendamentos:', schedules ? JSON.parse(schedules).length : 0);
    console.log('- Produtos:', products ? JSON.parse(products).length : 0);
    console.log('- Movimentações:', movements ? JSON.parse(movements).length : 0);
    console.log('- Empréstimos:', loans ? JSON.parse(loans).length : 0);
    
    setUser(null);
    localStorage.removeItem('inventory_user');
    
    console.log('✅ Logout concluído - dados mantidos no localStorage');
    
    // Cleanup realtime listener
    if (realtimeUnsubscribe) {
      realtimeUnsubscribe();
      setRealtimeUnsubscribe(null);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  };

  const hasPageAccess = (page: keyof PageAccess): boolean => {
    if (!user) return false;
    
    // Sempre usar pageAccess se disponível, senão usar padrão do role
    const pageAccess = user.pageAccess || DEFAULT_PAGE_ACCESS[user.role];
    
    // Verificar se o usuário tem acesso à página específica
    return pageAccess[page] === true;
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    hasPageAccess,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}