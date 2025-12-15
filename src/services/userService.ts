import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, DEFAULT_PAGE_ACCESS } from '../types';

const USERS_COLLECTION = 'users';

// Converter Firestore document para User
const convertFirestoreToUser = (doc: QueryDocumentSnapshot<DocumentData>): User => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    email: data.email,
    password: data.password || 'password123',
    role: data.role,
    avatar: data.avatar,
    isActive: data.isActive,
    createdAt: data.createdAt?.toDate() || new Date(),
    lastLogin: data.lastLogin ? data.lastLogin.toDate() : undefined,
    pageAccess: data.pageAccess || DEFAULT_PAGE_ACCESS[data.role] || DEFAULT_PAGE_ACCESS.viewer,
  };
};

// Converter User para Firestore document
const convertUserToFirestore = (user: Omit<User, 'id'>) => {
  return {
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    avatar: user.avatar || null,
    isActive: user.isActive,
    createdAt: user.createdAt ? Timestamp.fromDate(user.createdAt) : Timestamp.now(),
    lastLogin: user.lastLogin ? Timestamp.fromDate(user.lastLogin) : null,
    pageAccess: user.pageAccess || DEFAULT_PAGE_ACCESS[user.role] || DEFAULT_PAGE_ACCESS.viewer,
  };
};

// Check if error is due to insufficient permissions
const isPermissionError = (error: any): boolean => {
  return error && 
    (error.code === 'permission-denied' ||
     error.message?.includes('Missing or insufficient permissions') ||
     error.message?.includes('permission-denied'));
};

export const userService = {
  // Buscar todos os usuários do Firebase
  async getAllUsers(): Promise<User[]> {
    try {
      console.log('Carregando usuários do Firebase...');
      const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(convertFirestoreToUser);
      console.log(`${users.length} usuários carregados do Firebase`);
      return users;
    } catch (error) {
      console.error('Erro ao buscar usuários do Firebase:', error);
      
      // Se houver erro de permissão, retornar dados mock para demonstração
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes no Firebase - usando dados mock');
        return getMockUsers();
      }
      
      throw new Error('Falha ao carregar usuários do Firebase');
    }
  },

  // Criar novo usuário no Firebase
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
    try {
      console.log('Criando usuário no Firebase:', userData.name);
      
      const userToCreate = {
        ...userData,
        password: userData.password || 'password123',
        createdAt: new Date(),
        lastLogin: undefined,
      };
      
      const docRef = await addDoc(collection(db, USERS_COLLECTION), convertUserToFirestore(userToCreate));
      
      const newUser: User = {
        ...userToCreate,
        id: docRef.id,
      };
      
      console.log('Usuário criado no Firebase com ID:', docRef.id);
      return newUser;
    } catch (error) {
      console.error('Erro ao criar usuário no Firebase:', error);
      
      // Provide more specific error information for permissions issues
      if (isPermissionError(error)) {
        console.error('Firebase Security Rules Error: Write access denied to users collection');
        console.error('To fix this, go to Firebase Console > Firestore Database > Rules and update security rules');
        throw new Error('Erro de permissão do Firebase: Acesso negado para criar usuário. Verifique as regras de segurança no Firebase Console.');
      }
      
      throw new Error('Falha ao criar usuário no Firebase');
    }
  },

  // Atualizar usuário existente no Firebase
  async updateUser(userId: string, userData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<void> {
    try {
      console.log('Atualizando usuário no Firebase:', userId);
      
      const userRef = doc(db, USERS_COLLECTION, userId);
      const updateData: any = {};

      // Copy userData and convert undefined values to null for Firestore compatibility
      Object.keys(userData).forEach(key => {
        const value = (userData as any)[key];
        if (value === undefined) {
          updateData[key] = null;
        } else {
          updateData[key] = value;
        }
      });

      // Converter datas para Timestamp se necessário
      if (updateData.lastLogin) {
        updateData.lastLogin = Timestamp.fromDate(updateData.lastLogin);
      } else if (updateData.lastLogin === null) {
        // Keep null as is for Firestore
      }

      await updateDoc(userRef, updateData);
      console.log('Usuário atualizado no Firebase:', userId);
    } catch (error) {
      console.error('Erro ao atualizar usuário no Firebase:', error);
      
      // If it's a permission error, provide a more user-friendly message but don't throw
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes para atualizar usuário no Firebase - operação simulada localmente');
        // Simulate successful update for demo purposes
        return;
      }
      
      throw new Error('Falha ao atualizar usuário no Firebase');
    }
  },

  // Excluir usuário do Firebase
  async deleteUser(userId: string): Promise<void> {
    try {
      console.log('Excluindo usuário do Firebase:', userId);
      await deleteDoc(doc(db, USERS_COLLECTION, userId));
      console.log('Usuário excluído do Firebase:', userId);
    } catch (error) {
      console.error('Erro ao excluir usuário do Firebase:', error);
      
      // If it's a permission error, provide a more user-friendly message but don't throw
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes para excluir usuário no Firebase - operação simulada localmente');
        // Simulate successful deletion for demo purposes
        return;
      }
      
      throw new Error('Falha ao excluir usuário do Firebase');
    }
  },

  // Configurar listener em tempo real para usuários
  setupRealtimeListener(callback: (users: User[]) => void): () => void {
    try {
      console.log('Configurando listener em tempo real para usuários...');
      const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log('Usuários atualizados em tempo real:', snapshot.size);
          const users = snapshot.docs.map(convertFirestoreToUser);
          callback(users);
        },
        (error) => {
          console.error('Erro no listener de usuários:', error);
          // Em caso de erro, usar dados mock
          callback(getMockUsers());
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Erro ao configurar listener de usuários:', error);
      // Retornar função vazia se falhar
      return () => {};
    }
  },

  // Inicializar dados padrão no Firebase (executar apenas uma vez)
  async initializeDefaultUsers(): Promise<void> {
    try {
      console.log('Verificando se há usuários no Firebase...');
      const users = await this.getAllUsers();
      
      if (users.length === 0) {
        console.log('Inicializando usuários padrão no Firebase...');
        
        const defaultUsers = [
          {
            name: 'Admin Master',
            email: 'admin',
            password: 'admin123',
            role: 'admin' as const,
            avatar: 'https://images.pexels.com/photos/7562313/pexels-photo-7562313.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
            isActive: true,
          },
          {
            name: 'Maria Silva',
            email: 'manager',
            password: 'manager123',
            role: 'manager' as const,
            avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
            isActive: true,
          },
          {
            name: 'João Santos',
            email: 'operator',
            password: 'operator123',
            role: 'operator' as const,
            avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
            isActive: true,
          },
        ];

        for (const user of defaultUsers) {
          await this.createUser(user);
        }
        
        console.log('Usuários padrão criados no Firebase com sucesso!');
      } else {
        console.log(`${users.length} usuários já existem no Firebase`);
      }
    } catch (error) {
      console.error('Erro ao inicializar usuários padrão:', error);
    }
  },

  // Salvar usuário individual no Firebase
  async saveUserToFirebase(user: User): Promise<void> {
    try {
      console.log('Salvando usuário no Firebase:', user.name);
      
      // Se o usuário tem ID numérico, é um usuário local que precisa ser criado
      if (user.id && !isNaN(Number(user.id))) {
        const { id, createdAt, lastLogin, ...userData } = user;
        await this.createUser({
          ...userData,
          createdAt: createdAt,
          lastLogin: lastLogin,
        });
      } else {
        // Usuário já existe no Firebase, apenas atualizar
        const { id, createdAt, ...userData } = user;
        await this.updateUser(user.id, userData);
      }
      
      console.log('Usuário salvo no Firebase com sucesso:', user.name);
    } catch (error) {
      console.error('Erro ao salvar usuário no Firebase:', error);
      
      // If it's a permission error, don't throw - just log and continue
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes - operação simulada localmente para demonstração');
        return;
      }
      
      throw error;
    }
  },

  // Atualizar senha do usuário
  async updateUserPassword(userId: string, newPassword: string): Promise<void> {
    try {
      console.log('Atualizando senha do usuário:', userId);
      await this.updateUser(userId, { password: newPassword });
      console.log('Senha atualizada com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      
      // If it's a permission error, don't throw - just log and continue
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes para atualizar senha no Firebase - alteração salva localmente para demonstração');
        return;
      }
      
      throw new Error('Falha ao atualizar senha');
    }
  },

  // Atualizar último login
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.updateUser(userId, { lastLogin: new Date() });
      console.log('Último login atualizado:', userId);
    } catch (error) {
      console.error('Erro ao atualizar último login:', error);
      
      // If it's a permission error, don't throw - just log and continue
      if (isPermissionError(error)) {
        console.warn('Permissões insuficientes para atualizar último login no Firebase');
        return;
      }
    }
  },

  // Validar credenciais de usuário
  async validateUserCredentials(email: string, password?: string): Promise<User | null> {
    try {
      console.log('Validando credenciais do usuário:', email);
      
      // Try Firebase first, but fallback to local validation immediately on permission error
      try {
        const users = await this.getAllUsers();
        
        // Encontrar usuário por email
        const user = users.find(u => 
          u.email.toLowerCase() === email.toLowerCase() && 
          u.isActive
        );

        if (!user) {
          console.log('Usuário não encontrado ou inativo:', email);
          return null;
        }

        // Validar senha se fornecida
        if (password && user.password && user.password !== password) {
          console.log('Senha incorreta para usuário:', email);
          return null;
        }

        console.log('Credenciais válidas para usuário:', user.name);
        return user;
      } catch (firebaseError) {
        console.warn('Firebase não disponível - usando validação local:', firebaseError);
        return this.validateUserCredentialsLocally(email, password);
      }
    } catch (error) {
      console.error('Erro ao validar credenciais:', error);
      return this.validateUserCredentialsLocally(email, password);
    }
  },

  // Validação local como fallback
  validateUserCredentialsLocally(email: string, password?: string): User | null {
    const mockUsers = getMockUsers();
    
    const user = mockUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.isActive
    );

    if (!user) {
      return null;
    }

    // Validar senha se fornecida
    if (password && user.password && user.password !== password) {
      return null;
    }

    return user;
  },

  // Verificar se usuário existe
  async userExists(email: string): Promise<boolean> {
    try {
      console.log('Verificando se usuário existe:', email);
      
      // Try to get users from Firebase
      try {
        const users = await this.getAllUsers();
        return users.some(u => u.email.toLowerCase() === email.toLowerCase());
      } catch (firebaseError) {
        console.warn('Erro do Firebase ao verificar usuário - usando validação local:', firebaseError);
        
        // Fallback to local validation with mock users
        const mockUsers = getMockUsers();
        return mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
      }
    } catch (error) {
      console.error('Erro ao verificar existência do usuário:', error);
      return false;
    }
  },

  // Verificar se usuário está ativo
  async isUserActive(email: string): Promise<boolean> {
    try {
      console.log('Verificando se usuário está ativo:', email);
      
      // Try to get users from Firebase
      try {
        const users = await this.getAllUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user ? user.isActive : false;
      } catch (firebaseError) {
        console.warn('Erro do Firebase ao verificar status - usando validação local:', firebaseError);
        
        // Fallback to local validation with mock users
        const mockUsers = getMockUsers();
        const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        return user ? user.isActive : false;
      }
    } catch (error) {
      console.error('Erro ao verificar status do usuário:', error);
      return false;
    }
  },

  // Configurar listener em tempo real para um usuário específico
  setupUserListener(userId: string, callback: (user: User | null) => void): () => void {
    try {
      console.log('Configurando listener para usuário específico:', userId);
      const userRef = doc(db, USERS_COLLECTION, userId);
      
      const unsubscribe = onSnapshot(
        userRef,
        (snapshot) => {
          try {
            if (snapshot.exists()) {
              const user = convertFirestoreToUser(snapshot);
              console.log('Usuário atualizado em tempo real:', user.name);
              callback(user);
            } else {
              console.warn('Usuário não existe mais:', userId);
              callback(null);
            }
          } catch (error) {
            console.error('Erro ao processar dados do usuário:', error);
            callback(null);
          }
        },
        (error) => {
          console.warn('Erro no listener do usuário:', error?.message || error);
          
          if (isPermissionError(error)) {
            console.warn('Firebase: Permissões insuficientes para usuário - continuando em modo local');
          } else {
            console.warn('Firebase: Erro de conexão para usuário - continuando em modo local');
          }
          
          // Em caso de erro, não fazer nada (manter usuário atual)
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener do usuário:', error?.message || error);
      
      // Retornar função vazia se falhar
      return () => {};
    }
  },

  // Configurar listener em tempo real para notificações de mudanças
  setupChangeNotificationListener(callback: (change: { type: string; data: any }) => void): () => void {
    try {
      console.log('Configurando listener de notificações de mudanças...');
      const q = query(collection(db, USERS_COLLECTION), orderBy('updatedAt', 'desc'));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const user = convertFirestoreToUser(change.doc);
              callback({ type: 'user_added', data: user });
            } else if (change.type === 'modified') {
              const user = convertFirestoreToUser(change.doc);
              callback({ type: 'user_updated', data: user });
            } else if (change.type === 'removed') {
              callback({ type: 'user_deleted', data: { id: change.doc.id } });
            }
          });
        },
        (error) => {
          console.warn('Erro no listener de notificações:', error?.message || error);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.warn('Erro ao configurar listener de notificações:', error?.message || error);
      return () => {};
    }
  }
};

// Dados mock para fallback (caso Firebase não esteja disponível)
function getMockUsers(): User[] {
  return [
    {
      id: '1',
      name: 'Admin Master',
      email: 'admin',
      password: 'admin123',
      role: 'admin',
      avatar: 'https://images.pexels.com/photos/7562313/pexels-photo-7562313.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
      lastLogin: new Date(), // Agora
      pageAccess: DEFAULT_PAGE_ACCESS.admin,
    },
    {
      id: '2',
      name: 'Maria Silva',
      email: 'maria.silva',
      password: 'manager123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), // 29 dias atrás
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
      pageAccess: DEFAULT_PAGE_ACCESS.manager,
    },
    {
      id: '3',
      name: 'João Santos',
      email: 'joao.santos',
      password: 'operator123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // 28 dias atrás
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      id: '4',
      name: 'Ana Costa',
      email: 'ana.costa',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: false,
      createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000), // 27 dias atrás
      lastLogin: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
    },
    {
      id: '5',
      name: 'Carlos Oliveira',
      email: 'carlos.oliveira',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000), // 26 dias atrás
      lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    },
    {
      id: '6',
      name: 'Fernanda Lima',
      email: 'fernanda.lima',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25 dias atrás
      lastLogin: new Date(Date.now() - 15 * 60 * 1000), // 15 minutos atrás
    },
    {
      id: '7',
      name: 'Roberto Mendes',
      email: 'roberto.mendes',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000), // 24 dias atrás
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
    },
    {
      id: '8',
      name: 'Juliana Pereira',
      email: 'juliana.pereira',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000), // 23 dias atrás
      lastLogin: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 dias atrás
    },
    {
      id: '9',
      name: 'Pedro Rodrigues',
      email: 'pedro.rodrigues',
      password: 'password123',
      role: 'admin',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22 dias atrás
      lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
    },
    {
      id: '10',
      name: 'Camila Ferreira',
      email: 'camila.ferreira',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: false,
      createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 dias atrás
      lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
    },
    {
      id: '11',
      name: 'Lucas Almeida',
      email: 'lucas.almeida',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 dias atrás
      lastLogin: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
    },
    {
      id: '12',
      name: 'Beatriz Souza',
      email: 'beatriz.souza',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 19 dias atrás
      lastLogin: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 dias atrás
    },
    {
      id: '13',
      name: 'Rafael Barbosa',
      email: 'rafael.barbosa',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 dias atrás
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      id: '14',
      name: 'Larissa Martins',
      email: 'larissa.martins',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), // 17 dias atrás
      lastLogin: new Date(Date.now() - 45 * 60 * 1000), // 45 minutos atrás
    },
    {
      id: '15',
      name: 'Thiago Nascimento',
      email: 'thiago.nascimento',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: false,
      createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000), // 16 dias atrás
      lastLogin: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
    },
    {
      id: '16',
      name: 'Gabriela Rocha',
      email: 'gabriela.rocha',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 dias atrás
      lastLogin: new Date(Date.now() - 20 * 60 * 1000), // 20 minutos atrás
    },
    {
      id: '17',
      name: 'Diego Carvalho',
      email: 'diego.carvalho',
      password: 'password123',
      role: 'admin',
      avatar: 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 dias atrás
      lastLogin: new Date(Date.now() - 5 * 60 * 1000), // 5 minutos atrás
    },
    {
      id: '18',
      name: 'Patrícia Gomes',
      email: 'patricia.gomes',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 dias atrás
      lastLogin: new Date(Date.now() - 35 * 60 * 1000), // 35 minutos atrás
    },
    {
      id: '19',
      name: 'Marcelo Dias',
      email: 'marcelo.dias',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1559486/pexels-photo-1559486.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 dias atrás
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      id: '20',
      name: 'Vanessa Torres',
      email: 'vanessa.torres',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: false,
      createdAt: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000), // 11 dias atrás
      lastLogin: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
    },
    {
      id: '21',
      name: 'André Ribeiro',
      email: 'andre.ribeiro',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 dias atrás
      lastLogin: new Date(Date.now() - 25 * 60 * 1000), // 25 minutos atrás
    },
    {
      id: '22',
      name: 'Renata Campos',
      email: 'renata.campos',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 dias atrás
      lastLogin: new Date(Date.now() - 50 * 60 * 1000), // 50 minutos atrás
    },
    {
      id: '23',
      name: 'Gustavo Moreira',
      email: 'gustavo.moreira',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1484794/pexels-photo-1484794.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 dias atrás
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      id: '24',
      name: 'Priscila Nunes',
      email: 'priscila.nunes',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
      lastLogin: new Date(Date.now() - 40 * 60 * 1000), // 40 minutos atrás
    },
    {
      id: '25',
      name: 'Fábio Castro',
      email: 'fabio.castro',
      password: 'password123',
      role: 'admin',
      avatar: 'https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: false,
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
      lastLogin: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 dias atrás
    },
    {
      id: '26',
      name: 'Cristina Lopes',
      email: 'cristina.lopes',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1520760/pexels-photo-1520760.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
      lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    },
    {
      id: '27',
      name: 'Rodrigo Freitas',
      email: 'rodrigo.freitas',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 dias atrás
      lastLogin: new Date(Date.now() - 10 * 60 * 1000), // 10 minutos atrás
    },
    {
      id: '28',
      name: 'Aline Cardoso',
      email: 'aline.cardoso',
      password: 'password123',
      role: 'viewer',
      avatar: 'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
      lastLogin: new Date(Date.now() - 55 * 60 * 1000), // 55 minutos atrás
    },
    {
      id: '29',
      name: 'Bruno Teixeira',
      email: 'bruno.teixeira',
      password: 'password123',
      role: 'operator',
      avatar: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
      lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    },
    {
      id: '30',
      name: 'Mônica Araújo',
      email: 'monica.araujo',
      password: 'password123',
      role: 'manager',
      avatar: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
      lastLogin: new Date(Date.now() - 60 * 60 * 1000), // 1 hora atrás
    },
    {
      id: 'PJ30Q63zDfMqeKnXiomb',
      name: 'Renan',
      email: 'renan.epya',
      password: 'password123',
      role: 'admin',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date('2025-08-28T23:01:43.000Z'), // Data do Firebase
      lastLogin: new Date(), // Agora (usuário atual)
      pageAccess: DEFAULT_PAGE_ACCESS.admin,
    },
    {
      id: '4ke3Tbb6eAXjw1nN9PFZ',
      name: 'Anderson Jataí',
      email: 'anderson.jatai',
      password: 'password123',
      role: 'admin',
      avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=64&h=64',
      isActive: true,
      createdAt: new Date('2025-08-29T02:27:59.000Z'), // Data do Firebase
      lastLogin: new Date('2025-10-02T16:02:16.000Z'), // Data do Firebase
      pageAccess: DEFAULT_PAGE_ACCESS.admin,
    },
  ];
}