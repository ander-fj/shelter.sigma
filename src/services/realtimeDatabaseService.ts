import { 
  ref, 
  set, 
  get, 
  push, 
  update, 
  remove,
  onValue,
  off,
  child,
  DataSnapshot
} from 'firebase/database';
import { realtimeDb } from '../config/firebase';
import { User } from '../types';

export class RealtimeDatabaseService {
  private static instance: RealtimeDatabaseService;

  static getInstance(): RealtimeDatabaseService {
    if (!RealtimeDatabaseService.instance) {
      RealtimeDatabaseService.instance = new RealtimeDatabaseService();
    }
    return RealtimeDatabaseService.instance;
  }

  // Converter User para formato do Realtime Database
  private convertUserToRealtimeFormat(user: User) {
    return {
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      avatar: user.avatar || null,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
      pageAccess: user.pageAccess || null,
    };
  }

  // Converter dados do Realtime Database para User
  private convertRealtimeToUser(id: string, data: any): User {
    return {
      id,
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      avatar: data.avatar,
      isActive: data.isActive,
      createdAt: new Date(data.createdAt),
      lastLogin: data.lastLogin ? new Date(data.lastLogin) : undefined,
      pageAccess: data.pageAccess,
    };
  }

  // Salvar usuário no Realtime Database
  async saveUser(user: User): Promise<void> {
    try {
      const userRef = ref(realtimeDb, `users/${user.id}`);
      const userData = this.convertUserToRealtimeFormat(user);
      
      await set(userRef, userData);
      console.log('✅ Usuário salvo no Realtime Database:', user.name);
    } catch (error) {
      console.error('❌ Erro ao salvar usuário no Realtime Database:', error);
      throw error;
    }
  }

  // Salvar múltiplos usuários
  async saveMultipleUsers(users: User[]): Promise<void> {
    try {
      const updates: Record<string, any> = {};
      
      users.forEach(user => {
        const userData = this.convertUserToRealtimeFormat(user);
        updates[`users/${user.id}`] = userData;
      });

      await update(ref(realtimeDb), updates);
      console.log(`✅ ${users.length} usuários salvos no Realtime Database`);
    } catch (error) {
      console.error('❌ Erro ao salvar usuários no Realtime Database:', error);
      throw error;
    }
  }

  // Buscar todos os usuários
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = ref(realtimeDb, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users: User[] = [];
        
        Object.keys(data).forEach(id => {
          users.push(this.convertRealtimeToUser(id, data[id]));
        });
        
        console.log(`📂 ${users.length} usuários carregados do Realtime Database`);
        return users;
      }
      
      return [];
    } catch (error) {
      console.error('❌ Erro ao buscar usuários do Realtime Database:', error);
      throw error;
    }
  }

  // Buscar usuário por ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = ref(realtimeDb, `users/${userId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        return this.convertRealtimeToUser(userId, snapshot.val());
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // Atualizar usuário
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = ref(realtimeDb, `users/${userId}`);
      const updateData: any = {};
      
      Object.keys(updates).forEach(key => {
        const value = (updates as any)[key];
        if (value instanceof Date) {
          updateData[key] = value.toISOString();
        } else {
          updateData[key] = value;
        }
      });

      await update(userRef, updateData);
      console.log('✅ Usuário atualizado no Realtime Database:', userId);
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  // Excluir usuário
  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = ref(realtimeDb, `users/${userId}`);
      await remove(userRef);
      console.log('✅ Usuário excluído do Realtime Database:', userId);
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      throw error;
    }
  }

  // Configurar listener em tempo real
  setupRealtimeListener(callback: (users: User[]) => void): () => void {
    const usersRef = ref(realtimeDb, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot: DataSnapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const users: User[] = [];
          
          Object.keys(data).forEach(id => {
            users.push(this.convertRealtimeToUser(id, data[id]));
          });
          
          console.log('🔄 Usuários atualizados em tempo real:', users.length);
          callback(users);
        } else {
          callback([]);
        }
      } catch (error) {
        console.error('❌ Erro ao processar dados em tempo real:', error);
        callback([]);
      }
    }, (error) => {
      console.error('❌ Erro no listener do Realtime Database:', error);
      callback([]);
    });

    return () => off(usersRef, 'value', unsubscribe);
  }

  // Migrar usuários do Firestore para Realtime Database
  async migrateUsersFromFirestore(): Promise<void> {
    try {
      console.log('🔄 Iniciando migração de usuários do Firestore para Realtime Database...');
      
      // Importar userService para buscar usuários do Firestore
      const { userService } = await import('./userService');
      
      // Buscar usuários do Firestore
      const firestoreUsers = await userService.getAllUsers();
      console.log(`📂 ${firestoreUsers.length} usuários encontrados no Firestore`);
      
      if (firestoreUsers.length === 0) {
        console.log('ℹ️ Nenhum usuário encontrado no Firestore para migrar');
        return;
      }

      // Salvar no Realtime Database
      await this.saveMultipleUsers(firestoreUsers);
      
      console.log('✅ Migração concluída com sucesso!');
      console.log(`📊 Resumo da migração:`);
      console.log(`   - Usuários migrados: ${firestoreUsers.length}`);
      console.log(`   - Administradores: ${firestoreUsers.filter(u => u.role === 'admin').length}`);
      console.log(`   - Gerentes: ${firestoreUsers.filter(u => u.role === 'manager').length}`);
      console.log(`   - Operadores: ${firestoreUsers.filter(u => u.role === 'operator').length}`);
      console.log(`   - Visualizadores: ${firestoreUsers.filter(u => u.role === 'viewer').length}`);
      console.log(`   - Usuários ativos: ${firestoreUsers.filter(u => u.isActive).length}`);
      
    } catch (error) {
      console.error('❌ Erro durante migração:', error);
      throw error;
    }
  }

  // Migrar usuários locais para Realtime Database
  async migrateLocalUsers(): Promise<void> {
    try {
      console.log('🔄 Iniciando migração de usuários locais para Realtime Database...');
      
      // Buscar usuários do localStorage
      const { offlineStorage } = await import('./offlineStorageService');
      const localUsers = offlineStorage.getCollection('users') as User[];
      
      console.log(`📂 ${localUsers.length} usuários encontrados localmente`);
      
      if (localUsers.length === 0) {
        console.log('ℹ️ Nenhum usuário local encontrado para migrar');
        return;
      }

      // Salvar no Realtime Database
      await this.saveMultipleUsers(localUsers);
      
      console.log('✅ Migração de usuários locais concluída!');
      console.log(`📊 Resumo da migração local:`);
      console.log(`   - Usuários migrados: ${localUsers.length}`);
      
    } catch (error) {
      console.error('❌ Erro durante migração local:', error);
      throw error;
    }
  }

  // Verificar se há dados no Realtime Database
  async hasData(): Promise<boolean> {
    try {
      const usersRef = ref(realtimeDb, 'users');
      const snapshot = await get(usersRef);
      return snapshot.exists() && Object.keys(snapshot.val() || {}).length > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar dados:', error);
      return false;
    }
  }

  // Limpar todos os dados do Realtime Database
  async clearAllData(): Promise<void> {
    try {
      const usersRef = ref(realtimeDb, 'users');
      await remove(usersRef);
      console.log('🧹 Todos os usuários foram removidos do Realtime Database');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      throw error;
    }
  }
}

export const realtimeDatabaseService = RealtimeDatabaseService.getInstance();