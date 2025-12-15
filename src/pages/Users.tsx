import { useState, useEffect } from 'react';
import { User } from '../types';
import { UserList } from '../components/users/UserList';
import { UserForm } from '../components/users/UserForm';
import { UserDetails } from '../components/users/UserDetails';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { offlineStorage } from '../services/offlineStorageService';
import { useOfflineSync } from '../hooks/useOfflineSync';

type ViewMode = 'list' | 'form' | 'details';

export function Users() {
  const { hasRole } = useAuth();
  const { isOnline } = useOfflineSync();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState<(() => void) | null>(null);

  // Load users from Firestore when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        
        // Load from offline storage first
        const offlineUsers = offlineStorage.getCollection('users');
        if (offlineUsers.length > 0) {
          setUsers(offlineUsers);
          console.log('📂 Usuários carregados offline:', offlineUsers.length);
        }
        
        if (isOnline) {
          // Configure real-time listener if online
          const unsubscribe = userService.setupRealtimeListener((fetchedUsers) => {
            // Merge Firebase users with local-only users
            const localUsers = offlineUsers.filter(u => 
              !fetchedUsers.find(fu => fu.email === u.email)
            );
            const mergedUsers = [...fetchedUsers, ...localUsers];
            setUsers(mergedUsers);
            
            // Save merged data to offline storage
            offlineStorage.saveCollection('users', mergedUsers);
            setLoadingUsers(false);
          });
          
          setRealtimeUnsubscribe(() => unsubscribe);
          
          // Initialize default users if necessary
          await userService.initializeDefaultUsers();
        } else {
          setLoadingUsers(false);
        }
        
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        setLoadingUsers(false);
      }
    };

    loadUsers();

    // Cleanup function
    return () => {
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }
    };
  }, []);

  // Cleanup realtime listener when component unmounts
  useEffect(() => {
    return () => {
      if (realtimeUnsubscribe) {
        realtimeUnsubscribe();
      }
    };
  }, [realtimeUnsubscribe]);
  // Check if user has admin role
  if (!hasRole('admin')) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
        <p className="text-gray-600">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const handleAddUser = () => {
    setSelectedUser(null);
    setViewMode('form');
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setViewMode('form');
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setViewMode('details');
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await userService.deleteUser(userId);
        // O listener em tempo real atualizará automaticamente a lista
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  };

  const handleSubmitUser = async (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => {
    setIsSubmitting(true);
    try {
      // Verificar se já existe um usuário com o mesmo email (apenas para novos usuários)
      if (!selectedUser) {
        const existingUserExists = users.some(u => u.email.toLowerCase() === userData.email.toLowerCase());
        if (existingUserExists) {
          alert('Já existe um usuário com este login. Escolha outro login.');
          setIsSubmitting(false);
          return;
        }
      }

      if (selectedUser) {
        // Update existing user locally
        const updatedUser = { ...selectedUser, ...userData };
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
        
        // Save to Firebase if online, otherwise add to sync queue
        if (isOnline) {
          try {
            await userService.updateUser(selectedUser.id, userData);
            console.log('✅ Usuário atualizado no Firebase:', userData.name);
          } catch (error) {
            console.warn('❌ Erro ao atualizar no Firebase - adicionando à fila de sincronização:', error);
            offlineStorage.addToSyncQueue('users', updatedUser);
          }
        } else {
          console.log('📴 Offline - usuário adicionado à fila de sincronização:', userData.name);
          offlineStorage.addToSyncQueue('users', updatedUser);
        }
      } else {
        // Create new user locally
        const newUser: User = {
          ...userData,
          id: Date.now().toString(),
          createdAt: new Date(),
          lastLogin: undefined
        };
        
        setUsers(prev => [...prev, newUser]);
        
        // Save to Firebase if online, otherwise add to sync queue
        if (isOnline) {
          try {
            const firebaseUser = await userService.createUser(userData);
            // Update local user with Firebase ID
            setUsers(prev => prev.map(u => 
              u.id === newUser.id ? { ...u, id: firebaseUser.id } : u
            ));
            console.log('✅ Usuário criado no Firebase:', userData.name);
          } catch (error) {
            console.warn('❌ Erro ao criar no Firebase - adicionando à fila de sincronização:', error);
            offlineStorage.addToSyncQueue('users', newUser);
          }
        } else {
          console.log('📴 Offline - usuário adicionado à fila de sincronização:', userData.name);
          offlineStorage.addToSyncQueue('users', newUser);
        }
      }
      
      setViewMode('list');
      setSelectedUser(null);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('Erro ao salvar usuário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedUser(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedUser(null);
  };

  if (viewMode === 'form') {
    return (
      <UserForm
        user={selectedUser || undefined}
        onSubmit={handleSubmitUser}
        onCancel={handleCancel}
        loading={isSubmitting}
      />
    );
  }

  if (viewMode === 'details' && selectedUser) {
    return (
      <UserDetails
        user={selectedUser}
        onEdit={() => setViewMode('form')}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <UserList
      users={users}
      onAdd={handleAddUser}
      onEdit={handleEditUser}
      onView={handleViewUser}
      onDelete={handleDeleteUser}
      loading={loadingUsers}
    />
  );
}