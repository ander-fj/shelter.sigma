import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Product, 
  Category, 
  Supplier, 
  StockMovement, 
  StockAlert, 
  DashboardStats, 
  Loan,
  InventorySchedule,
  InventoryCount,
  InventoryContextType,
  EquipmentReservation
} from '../types';
import { productService } from '../services/productService';
import { movementService } from '../services/movementService';
import { loanService } from '../services/loanService';
import { inventoryScheduleService } from '../services/inventoryScheduleService';
import { reservationService } from '../services/reservationService';
import { categoryService } from '../services/categoryService';
import { supplierService } from '../services/supplierService';
import { offlineStorage } from '../services/offlineStorageService';
import { useToast } from '../components/ui/Toast';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { addToast } = useToast();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [inventorySchedules, setInventorySchedules] = useState<InventorySchedule[]>([]);
  const [reservations, setReservations] = useState<EquipmentReservation[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [realtimeUnsubscribes, setRealtimeUnsubscribes] = useState<(() => void)[]>([]);

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

  // Load data on mount
  useEffect(() => {
    console.log('🚀 [CONTEXT] Inicializando carregamento de dados...');
    loadAllData();
    
    // Cleanup function
    return () => {
      // Cleanup all realtime listeners
      realtimeUnsubscribes.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Erro ao limpar listener:', error);
        }
      });
    };
  }, []);

  const loadAllData = async () => {
    try {
      console.log('📂 [CONTEXT] Carregando todos os dados...');
      setLoading(true);
      
      // Load from offline storage first for immediate display
      console.log('💾 [CONTEXT] Carregando dados do armazenamento offline...');
      const offlineData = offlineStorage.getOfflineData();
      
      if (offlineData.products.length > 0) {
        setProducts(offlineData.products);
        console.log('📂 Produtos carregados offline:', offlineData.products.length);
      } else {
        console.log('📂 [CONTEXT] Nenhum produto offline encontrado');
      }
      
      if (offlineData.movements.length > 0) {
        setMovements(offlineData.movements);
        console.log('📂 Movimentações carregadas offline:', offlineData.movements.length);
      } else {
        console.log('📂 [CONTEXT] Nenhuma movimentação offline encontrada');
      }
      
      if (offlineData.loans.length > 0) {
        setLoans(offlineData.loans);
        console.log('📂 Empréstimos carregados offline:', offlineData.loans.length);
      } else {
        console.log('📂 [CONTEXT] Nenhum empréstimo offline encontrado');
      }
      
      if (offlineData.schedules.length > 0) {
        setInventorySchedules(offlineData.schedules);
        console.log('📂 Agendamentos carregados offline:', offlineData.schedules.length);
      } else {
        console.log('📂 [CONTEXT] Nenhum agendamento offline encontrado');
      }
      
      if (offlineData.reservations.length > 0) {
        setReservations(offlineData.reservations);
        console.log('📂 Reservas carregadas offline:', offlineData.reservations.length);
      } else {
        console.log('📂 [CONTEXT] Nenhuma reserva offline encontrada');
      }

      // Load categories and suppliers (mock data)
      console.log('📂 [CONTEXT] Carregando categorias e fornecedores mock');
      setCategories(getMockCategories());
      setSuppliers(getMockSuppliers());

      if (isOnline) {
        console.log('🌐 [CONTEXT] Online - configurando listeners em tempo real');
        // Setup realtime listeners if online
        setupRealtimeListeners();
      } else {
        console.log('📴 [CONTEXT] Offline - pulando listeners em tempo real');
      }
      
      // Generate alerts
      console.log('🔔 [CONTEXT] Gerando alertas');
      generateAlerts();
      
    } catch (error) {
      console.error('❌ [CONTEXT] Erro ao carregar dados:', error);
    } finally {
      console.log('✅ [CONTEXT] Carregamento de dados finalizado');
      setLoading(false);
    }
  };

  const setupRealtimeListeners = () => {
    try {
      const unsubscribes: (() => void)[] = [];

      // Products listener
      const productUnsubscribe = productService.setupRealtimeListener((fetchedProducts) => {
        setProducts(fetchedProducts);
        offlineStorage.saveCollection('products', fetchedProducts);
      });
      unsubscribes.push(productUnsubscribe);

      // Movements listener
      const movementUnsubscribe = movementService.setupRealtimeListener((fetchedMovements) => {
        setMovements(fetchedMovements);
        offlineStorage.saveCollection('movements', fetchedMovements);
      });
      unsubscribes.push(movementUnsubscribe);

      // Loans listener
      const loanUnsubscribe = loanService.setupRealtimeListener((fetchedLoans) => {
        setLoans(fetchedLoans);
        offlineStorage.saveCollection('loans', fetchedLoans);
      });
      unsubscribes.push(loanUnsubscribe);

      // Schedules listener
      const scheduleUnsubscribe = inventoryScheduleService.setupRealtimeListener((fetchedSchedules) => {
        setInventorySchedules(fetchedSchedules);
        offlineStorage.saveCollection('schedules', fetchedSchedules);
      });
      unsubscribes.push(scheduleUnsubscribe);

      // Reservations listener
      const reservationUnsubscribe = reservationService.setupRealtimeListener((fetchedReservations) => {
        setReservations(fetchedReservations);
        offlineStorage.saveCollection('reservations', fetchedReservations);
      });
      unsubscribes.push(reservationUnsubscribe);

      setRealtimeUnsubscribes(unsubscribes);
    } catch (error) {
      console.error('Erro ao configurar listeners:', error);
    }
  };

  // Product functions
  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    try {
      console.log('📦 [MOBILE-CONTEXT] Adicionando produto:', productData.name, 'Online:', isOnline);
      
      const newProduct: Product = {
        ...productData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
        _offlineCreated: !isOnline, // Marcar se foi criado offline
      };

      // Update state immediately
      console.log('🔄 [MOBILE-CONTEXT] Atualizando estado imediatamente');
      setProducts(prev => [...prev, newProduct]);
      
      // Save to offline storage
      const updatedProducts = [...products, newProduct];
      console.log('💾 [MOBILE-CONTEXT] Salvando offline:', updatedProducts.length, 'produtos');
      offlineStorage.saveCollection('products', updatedProducts);

      // Try to save to Firebase if online
      if (isOnline) {
        console.log('🌐 [MOBILE-CONTEXT] Online - salvando no Firebase');
        try {
          const firebaseId = await productService.createProduct(productData);
          // Update with Firebase ID
          const productWithFirebaseId = { ...newProduct, id: firebaseId };
          setProducts(prev => prev.map(p => p.id === newProduct.id ? productWithFirebaseId : p));
          offlineStorage.saveCollection('products', products.map(p => p.id === newProduct.id ? productWithFirebaseId : p));
          console.log('✅ [MOBILE-CONTEXT] Produto salvo no Firebase:', firebaseId);
        } catch (error) {
          console.warn('⚠️ [MOBILE-CONTEXT] Firebase indisponível - mantendo offline');
          offlineStorage.addToSyncQueue('products', newProduct);
          addToast({
            type: 'info',
            title: '📱 Produto Salvo Offline',
            message: 'Será sincronizado quando conectar',
            duration: 3000
          });
        }
      } else {
        console.log('📴 [MOBILE-CONTEXT] Offline - salvando localmente');
        offlineStorage.addToSyncQueue('products', newProduct);
        addToast({
          type: 'success',
          title: '📱 Produto Salvo Offline',
          message: 'Dados seguros - sincronizará quando conectar',
          duration: 3000
        });
      }

      console.log('✅ [MOBILE-CONTEXT] Produto adicionado:', newProduct.name);
      return newProduct;
    } catch (error) {
      console.error('❌ [MOBILE-CONTEXT] Erro ao adicionar produto:', error);
      addToast({
        type: 'error',
        title: '❌ Erro ao Salvar',
        message: 'Não foi possível salvar o produto. Tente novamente.',
        duration: 5000
      });
      throw error;
    }
  };

  const addCategory = async (categoryData: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
    try {
      console.log('📁 [CONTEXT] Adicionando categoria:', categoryData.name);

      const newCategory: Category = {
        ...categoryData,
        id: `cat_${Date.now()}`,
        createdAt: new Date()
      };

      // Update state immediately
      setCategories(prev => [...prev, newCategory]);

      // Save to offline storage
      const updatedCategories = [...categories, newCategory];
      offlineStorage.saveCollection('categories', updatedCategories);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          const savedCategory = await categoryService.addCategory(categoryData);
          // Update with Firebase ID
          setCategories(prev => prev.map(c =>
            c.id === newCategory.id ? savedCategory : c
          ));
          addToast({
            type: 'success',
            title: '✅ Categoria Criada',
            message: `Categoria "${savedCategory.name}" adicionada com sucesso!`,
            duration: 3000
          });
          return savedCategory;
        } catch (error) {
          console.warn('⚠️ [CONTEXT] Firebase indisponível - mantendo offline');
        }
      }

      addToast({
        type: 'success',
        title: '📱 Categoria Salva Offline',
        message: 'Sincronizará quando conectar',
        duration: 3000
      });

      return newCategory;
    } catch (error) {
      console.error('❌ [CONTEXT] Erro ao adicionar categoria:', error);
      addToast({
        type: 'error',
        title: '❌ Erro',
        message: 'Não foi possível salvar a categoria',
        duration: 5000
      });
      throw error;
    }
  };

  const addSupplier = async (supplierData: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> => {
    try {
      console.log('🏢 [CONTEXT] Adicionando fornecedor:', supplierData.name);

      const newSupplier: Supplier = {
        ...supplierData,
        id: `sup_${Date.now()}`,
        createdAt: new Date()
      };

      // Update state immediately
      setSuppliers(prev => [...prev, newSupplier]);

      // Save to offline storage
      const updatedSuppliers = [...suppliers, newSupplier];
      offlineStorage.saveCollection('suppliers', updatedSuppliers);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          const savedSupplier = await supplierService.addSupplier(supplierData);
          // Update with Firebase ID
          setSuppliers(prev => prev.map(s =>
            s.id === newSupplier.id ? savedSupplier : s
          ));
          addToast({
            type: 'success',
            title: '✅ Fornecedor Criado',
            message: `Fornecedor "${savedSupplier.name}" adicionado com sucesso!`,
            duration: 3000
          });
          return savedSupplier;
        } catch (error) {
          console.warn('⚠️ [CONTEXT] Firebase indisponível - mantendo offline');
        }
      }

      addToast({
        type: 'success',
        title: '📱 Fornecedor Salvo Offline',
        message: 'Sincronizará quando conectar',
        duration: 3000
      });

      return newSupplier;
    } catch (error) {
      console.error('❌ [CONTEXT] Erro ao adicionar fornecedor:', error);
      addToast({
        type: 'error',
        title: '❌ Erro',
        message: 'Não foi possível salvar o fornecedor',
        duration: 5000
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    try {
      console.log('🔄 [MOBILE-CONTEXT] Atualizando produto:', id, 'Online:', isOnline);
      
      // Update state immediately
      setProducts(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      ));

      // Save to offline storage
      const updatedProducts = products.map(p => 
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      );
      offlineStorage.saveCollection('products', updatedProducts);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          await productService.updateProduct(id, updates);
          console.log('✅ [MOBILE-CONTEXT] Produto atualizado no Firebase');
        } catch (error) {
          console.warn('⚠️ [MOBILE-CONTEXT] Firebase indisponível - mantendo offline');
          const updatedProduct = products.find(p => p.id === id);
          if (updatedProduct) {
            offlineStorage.addToSyncQueue('products', { ...updatedProduct, ...updates });
          }
        }
      } else {
        console.log('📴 [MOBILE-CONTEXT] Offline - adicionando à fila');
        const updatedProduct = products.find(p => p.id === id);
        if (updatedProduct) {
          offlineStorage.addToSyncQueue('products', { ...updatedProduct, ...updates });
        }
      }
    } catch (error) {
      console.error('❌ [MOBILE-CONTEXT] Erro ao atualizar produto:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    try {
      console.log('🗑️ [MOBILE-CONTEXT] Excluindo produto:', id, 'Online:', isOnline);
      
      // Update state immediately
      setProducts(prev => prev.filter(p => p.id !== id));
      
      // Save to offline storage
      const updatedProducts = products.filter(p => p.id !== id);
      offlineStorage.saveCollection('products', updatedProducts);

      // Try to delete from Firebase if online
      if (isOnline) {
        try {
          await productService.deleteProduct(id);
        } catch (error) {
          console.warn('Erro ao excluir do Firebase:', error);
        }
      }
    } catch (error) {
      console.error('❌ [MOBILE-CONTEXT] Erro ao excluir produto:', error);
      throw error;
    }
  };

  // Movement functions
  const addMovement = async (movementData: Omit<StockMovement, 'id' | 'createdAt'>): Promise<StockMovement> => {
    try {
      console.log('📈 [MOBILE-CONTEXT] Adicionando movimentação:', movementData.type, movementData.reason, 'Online:', isOnline);
      
      const newMovement: StockMovement = {
        ...movementData,
        id: Date.now().toString(),
        createdAt: new Date(),
        _offlineCreated: !isOnline,
      };

      // Update product stock
      console.log('📦 [MOBILE-CONTEXT] Atualizando estoque imediatamente');
      const updatedProducts = products.map(product => {
        if (product.id === movementData.productId) {
          return {
            ...product,
            currentStock: movementData.newStock,
            updatedAt: new Date()
          };
        }
        return product;
      });

      // Update state
      console.log('🔄 [MOBILE-CONTEXT] Estado atualizado');
      setProducts(updatedProducts);
      setMovements(prev => [...prev, newMovement]);
      
      // Save to offline storage
      console.log('💾 [MOBILE-CONTEXT] Salvando offline');
      offlineStorage.saveCollection('products', updatedProducts);
      offlineStorage.saveCollection('movements', [...movements, newMovement]);

      // Try to save to Firebase if online
      if (isOnline) {
        console.log('🌐 [MOBILE-CONTEXT] Online - salvando no Firebase');
        try {
          const firebaseId = await movementService.createMovement(movementData);
          const movementWithFirebaseId = { ...newMovement, id: firebaseId };
          setMovements(prev => prev.map(m => m.id === newMovement.id ? movementWithFirebaseId : m));
          
          // Also update product in Firebase
          await productService.updateProduct(movementData.productId, {
            currentStock: movementData.newStock,
            updatedAt: new Date()
          });
          console.log('✅ [MOBILE-CONTEXT] Movimentação salva no Firebase');
          addToast({
            type: 'success',
            title: '✅ Movimentação Salva',
            message: 'Dados salvos na nuvem com sucesso',
            duration: 3000
          });
        } catch (error) {
          console.warn('⚠️ [MOBILE-CONTEXT] Firebase indisponível - mantendo offline');
          offlineStorage.addToSyncQueue('movements', newMovement);
          
          // Also queue product update
          const updatedProduct = updatedProducts.find(p => p.id === movementData.productId);
          if (updatedProduct) {
            offlineStorage.addToSyncQueue('products', updatedProduct);
          }
          addToast({
            type: 'info',
            title: '📱 Movimentação Salva Offline',
            message: 'Será sincronizada quando conectar',
            duration: 3000
          });
        }
      } else {
        console.log('📴 [MOBILE-CONTEXT] Offline - salvando localmente');
        offlineStorage.addToSyncQueue('movements', newMovement);
        const updatedProduct = updatedProducts.find(p => p.id === movementData.productId);
        if (updatedProduct) {
          offlineStorage.addToSyncQueue('products', updatedProduct);
        }
        addToast({
          type: 'success',
          title: '📱 Movimentação Salva Offline',
          message: 'Estoque atualizado - sincronizará quando conectar',
          duration: 4000
        });
      }

      console.log('✅ [MOBILE-CONTEXT] Movimentação concluída');
      return newMovement;
    } catch (error) {
      console.error('❌ [MOBILE-CONTEXT] Erro ao adicionar movimentação:', error);
      addToast({
        type: 'error',
        title: '❌ Erro na Movimentação',
        message: 'Não foi possível registrar a movimentação',
        duration: 5000
      });
      throw error;
    }
  };

  const updateMovement = async (id: string, updates: Partial<StockMovement>): Promise<void> => {
    try {
      console.log('🔄 [MOBILE-CONTEXT] Atualizando movimento:', id, 'Online:', isOnline);
      
      // Update movement in state
      setMovements(prev => prev.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ));

      // Save to offline storage
      const updatedMovements = movements.map(m => 
        m.id === id ? { ...m, ...updates } : m
      );
      offlineStorage.saveCollection('movements', updatedMovements);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          await movementService.updateMovement(id, updates);
          console.log('✅ [MOBILE-CONTEXT] Movimento atualizado no Firebase');
        } catch (error) {
          console.warn('⚠️ [MOBILE-CONTEXT] Firebase indisponível - mantendo offline');
          const updatedMovement = movements.find(m => m.id === id);
          if (updatedMovement) {
            offlineStorage.addToSyncQueue('movements', { ...updatedMovement, ...updates });
          }
        }
      } else {
        console.log('📴 [MOBILE-CONTEXT] Offline - salvando localmente');
        const updatedMovement = movements.find(m => m.id === id);
        if (updatedMovement) {
          offlineStorage.addToSyncQueue('movements', { ...updatedMovement, ...updates });
        }
      }
    } catch (error) {
      console.error('❌ [MOBILE-CONTEXT] Erro ao atualizar movimento:', error);
      throw error;
    }
  };

  // Loan functions
  const addLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Loan> => {
    try {
      const newLoan: Loan = {
        ...loanData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update product stock (subtract loaned quantity)
      const updatedProducts = products.map(product => {
        if (product.id === loanData.productId) {
          return {
            ...product,
            currentStock: product.currentStock - loanData.quantity,
            updatedAt: new Date()
          };
        }
        return product;
      });

      // Update state
      setProducts(updatedProducts);
      setLoans(prev => [...prev, newLoan]);
      
      // Save to offline storage
      offlineStorage.saveCollection('products', updatedProducts);
      offlineStorage.saveCollection('loans', [...loans, newLoan]);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          const firebaseId = await loanService.createLoan(loanData);
          const loanWithFirebaseId = { ...newLoan, id: firebaseId };
          setLoans(prev => prev.map(l => l.id === newLoan.id ? loanWithFirebaseId : l));
          
          // Also update product in Firebase
          await productService.updateProduct(loanData.productId, {
            currentStock: updatedProducts.find(p => p.id === loanData.productId)?.currentStock || 0,
            updatedAt: new Date()
          });
        } catch (error) {
          console.warn('Erro ao salvar empréstimo no Firebase - adicionando à fila:', error);
          offlineStorage.addToSyncQueue('loans', newLoan);
          
          const updatedProduct = updatedProducts.find(p => p.id === loanData.productId);
          if (updatedProduct) {
            offlineStorage.addToSyncQueue('products', updatedProduct);
          }
        }
      } else {
        offlineStorage.addToSyncQueue('loans', newLoan);
        const updatedProduct = updatedProducts.find(p => p.id === loanData.productId);
        if (updatedProduct) {
          offlineStorage.addToSyncQueue('products', updatedProduct);
        }
      }

      return newLoan;
    } catch (error) {
      console.error('Erro ao adicionar empréstimo:', error);
      throw error;
    }
  };

  const updateLoan = async (id: string, updates: Partial<Loan>): Promise<void> => {
    try {
      // Update state immediately
      setLoans(prev => prev.map(l => 
        l.id === id ? { ...l, ...updates, updatedAt: new Date() } : l
      ));

      // Save to offline storage
      const updatedLoans = loans.map(l => 
        l.id === id ? { ...l, ...updates, updatedAt: new Date() } : l
      );
      offlineStorage.saveCollection('loans', updatedLoans);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          await loanService.updateLoan(id, updates);
        } catch (error) {
          console.warn('Erro ao atualizar empréstimo no Firebase - adicionando à fila:', error);
          const updatedLoan = loans.find(l => l.id === id);
          if (updatedLoan) {
            offlineStorage.addToSyncQueue('loans', { ...updatedLoan, ...updates });
          }
        }
      } else {
        const updatedLoan = loans.find(l => l.id === id);
        if (updatedLoan) {
          offlineStorage.addToSyncQueue('loans', { ...updatedLoan, ...updates });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar empréstimo:', error);
      throw error;
    }
  };

  const deleteLoan = async (id: string): Promise<void> => {
    try {
      const loan = loans.find(l => l.id === id);
      if (!loan) return;

      // Restore product stock if loan is active
      if (loan.status === 'active') {
        const updatedProducts = products.map(product => {
          if (product.id === loan.productId) {
            return {
              ...product,
              currentStock: product.currentStock + loan.quantity,
              updatedAt: new Date()
            };
          }
          return product;
        });
        setProducts(updatedProducts);
        offlineStorage.saveCollection('products', updatedProducts);
      }

      // Update state
      setLoans(prev => prev.filter(l => l.id !== id));
      
      // Save to offline storage
      const updatedLoans = loans.filter(l => l.id !== id);
      offlineStorage.saveCollection('loans', updatedLoans);

      // Try to delete from Firebase if online
      if (isOnline) {
        try {
          await loanService.deleteLoan(id);
        } catch (error) {
          console.warn('Erro ao excluir empréstimo do Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao excluir empréstimo:', error);
      throw error;
    }
  };

  const extendLoan = async (id: string, newReturnDate: Date, reason?: string): Promise<void> => {
    try {
      const loan = loans.find(l => l.id === id);
      if (!loan) return;

      const extension = {
        id: Date.now().toString(),
        previousReturnDate: loan.expectedReturnDate,
        newReturnDate,
        reason: reason || 'Prorrogação solicitada',
        extendedBy: 'current_user', // Should be actual user ID
        extendedAt: new Date(),
      };

      const updates = {
        expectedReturnDate: newReturnDate,
        extensions: [...loan.extensions, extension],
        updatedAt: new Date(),
      };

      await updateLoan(id, updates);
    } catch (error) {
      console.error('Erro ao prorrogar empréstimo:', error);
      throw error;
    }
  };

  const returnLoan = async (id: string): Promise<void> => {
    try {
      const loan = loans.find(l => l.id === id);
      if (!loan) return;

      // Restore product stock
      const updatedProducts = products.map(product => {
        if (product.id === loan.productId) {
          return {
            ...product,
            currentStock: product.currentStock + loan.quantity,
            updatedAt: new Date()
          };
        }
        return product;
      });

      setProducts(updatedProducts);
      offlineStorage.saveCollection('products', updatedProducts);

      // Update loan status
      const updates = {
        status: 'returned' as const,
        actualReturnDate: new Date(),
        updatedAt: new Date(),
      };

      await updateLoan(id, updates);
    } catch (error) {
      console.error('Erro ao devolver empréstimo:', error);
      throw error;
    }
  };

  // Inventory Schedule functions
  const addInventorySchedule = async (scheduleData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventorySchedule> => {
    try {
      const newSchedule: InventorySchedule = {
        ...scheduleData,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update state immediately
      setInventorySchedules(prev => [...prev, newSchedule]);
      
      // Save to offline storage
      const updatedSchedules = [...inventorySchedules, newSchedule];
      offlineStorage.saveCollection('schedules', updatedSchedules);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          const firebaseId = await inventoryScheduleService.createSchedule(scheduleData);
          const scheduleWithFirebaseId = { ...newSchedule, id: firebaseId };
          setInventorySchedules(prev => prev.map(s => s.id === newSchedule.id ? scheduleWithFirebaseId : s));
          offlineStorage.saveCollection('schedules', inventorySchedules.map(s => s.id === newSchedule.id ? scheduleWithFirebaseId : s));
        } catch (error) {
          console.warn('Erro ao salvar agendamento no Firebase - adicionando à fila:', error);
          offlineStorage.addToSyncQueue('schedules', newSchedule);
        }
      } else {
        offlineStorage.addToSyncQueue('schedules', newSchedule);
      }

      return newSchedule;
    } catch (error) {
      console.error('Erro ao adicionar agendamento:', error);
      throw error;
    }
  };

  const updateInventorySchedule = async (id: string, updates: Partial<InventorySchedule>): Promise<void> => {
    try {
      // Update state immediately
      setInventorySchedules(prev => prev.map(s => 
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      ));

      // Save to offline storage
      const updatedSchedules = inventorySchedules.map(s => 
        s.id === id ? { ...s, ...updates, updatedAt: new Date() } : s
      );
      offlineStorage.saveCollection('schedules', updatedSchedules);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          await inventoryScheduleService.updateSchedule(id, updates);
        } catch (error) {
          console.warn('Erro ao atualizar agendamento no Firebase - adicionando à fila:', error);
          const updatedSchedule = inventorySchedules.find(s => s.id === id);
          if (updatedSchedule) {
            offlineStorage.addToSyncQueue('schedules', { ...updatedSchedule, ...updates });
          }
        }
      } else {
        const updatedSchedule = inventorySchedules.find(s => s.id === id);
        if (updatedSchedule) {
          offlineStorage.addToSyncQueue('schedules', { ...updatedSchedule, ...updates });
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      throw error;
    }
  };

  const deleteInventorySchedule = async (id: string): Promise<void> => {
    try {
      // Update state immediately
      setInventorySchedules(prev => prev.filter(s => s.id !== id));
      
      // Save to offline storage
      const updatedSchedules = inventorySchedules.filter(s => s.id !== id);
      offlineStorage.saveCollection('schedules', updatedSchedules);

      // Try to delete from Firebase if online
      if (isOnline) {
        try {
          await inventoryScheduleService.deleteSchedule(id);
        } catch (error) {
          console.warn('Erro ao excluir agendamento do Firebase:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      throw error;
    }
  };

  const addInventoryCount = async (scheduleId: string, count: Omit<InventoryCount, 'id'>): Promise<InventoryCount> => {
    try {
      const newCount: InventoryCount = {
        ...count,
        id: Date.now().toString(),
      };

      // Update schedule with new count
      const updatedSchedules = inventorySchedules.map(schedule => {
        if (schedule.id === scheduleId) {
          const updatedCountedProducts = [...schedule.countedProducts];
          
          // Check if product was already counted
          const existingIndex = updatedCountedProducts.findIndex(c => c.productId === count.productId);
          
          if (existingIndex !== -1) {
            // Update existing count
            updatedCountedProducts[existingIndex] = newCount;
          } else {
            // Add new count
            updatedCountedProducts.push(newCount);
          }

          return {
            ...schedule,
            countedProducts: updatedCountedProducts,
            updatedAt: new Date(),
          };
        }
        return schedule;
      });

      // Update state
      setInventorySchedules(updatedSchedules);
      
      // Save to offline storage
      offlineStorage.saveCollection('schedules', updatedSchedules);

      // Try to save to Firebase if online
      if (isOnline) {
        try {
          const scheduleToUpdate = updatedSchedules.find(s => s.id === scheduleId);
          if (scheduleToUpdate) {
            await inventoryScheduleService.updateSchedule(scheduleId, {
              countedProducts: scheduleToUpdate.countedProducts,
              updatedAt: new Date()
            });
          }
        } catch (error) {
          console.warn('Erro ao salvar contagem no Firebase - adicionando à fila:', error);
          const scheduleToSync = updatedSchedules.find(s => s.id === scheduleId);
          if (scheduleToSync) {
            offlineStorage.addToSyncQueue('schedules', scheduleToSync);
          }
        }
      } else {
        const scheduleToSync = updatedSchedules.find(s => s.id === scheduleId);
        if (scheduleToSync) {
          offlineStorage.addToSyncQueue('schedules', scheduleToSync);
        }
      }

      return newCount;
    } catch (error) {
      console.error('Erro ao adicionar contagem:', error);
      throw error;
    }
  };

  // Alert functions
  const markAlertAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ));
  };

  // Generate alerts based on current data
  const generateAlerts = () => {
    const newAlerts: StockAlert[] = [];

    products.forEach(product => {
      // Low stock alert
      if (product.currentStock <= product.minStock && product.currentStock > 0) {
        newAlerts.push({
          id: `low_stock_${product.id}`,
          productId: product.id,
          type: 'low_stock',
          message: `Estoque baixo: ${product.name} (${product.currentStock} ${product.unit})`,
          isRead: false,
          createdAt: new Date(),
        });
      }

      // Out of stock alert
      if (product.currentStock === 0) {
        newAlerts.push({
          id: `out_of_stock_${product.id}`,
          productId: product.id,
          type: 'out_of_stock',
          message: `Produto em falta: ${product.name}`,
          isRead: false,
          createdAt: new Date(),
        });
      }

      // Expiry alerts
      if (product.expiryDate) {
        const daysUntilExpiry = Math.ceil(
          (product.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry <= 0) {
          newAlerts.push({
            id: `expired_${product.id}`,
            productId: product.id,
            type: 'expired',
            message: `Produto vencido: ${product.name}`,
            isRead: false,
            createdAt: new Date(),
          });
        } else if (daysUntilExpiry <= 7) {
          newAlerts.push({
            id: `expiry_warning_${product.id}`,
            productId: product.id,
            type: 'expiry_warning',
            message: `Produto vence em ${daysUntilExpiry} dias: ${product.name}`,
            isRead: false,
            createdAt: new Date(),
          });
        }
      }
    });

    setAlerts(newAlerts);
  };

  // Calculate dashboard stats
  const calculateDashboardStats = (): DashboardStats => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, product) => 
      sum + (product.currentStock * product.purchasePrice), 0
    );
    
    const lowStockAlerts = alerts.filter(alert => 
      alert.type === 'low_stock' && !alert.isRead
    ).length;
    
    const expiryAlerts = alerts.filter(alert => 
      (alert.type === 'expiry_warning' || alert.type === 'expired') && !alert.isRead
    ).length;

    const recentMovements = movements
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const topCategories = categories.map(category => {
      const categoryProducts = products.filter(p => p.category.id === category.id);
      return {
        category: category.name,
        count: categoryProducts.length,
        value: categoryProducts.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0)
      };
    }).sort((a, b) => b.value - a.value).slice(0, 5);

    const activeLoans = loans.filter(l => l.status === 'active').length;
    const overdueLoans = loans.filter(l => 
      l.status === 'active' && new Date() > new Date(l.expectedReturnDate)
    ).length;
    const returnedLoans = loans.filter(l => l.status === 'returned').length;

    return {
      totalProducts,
      totalValue,
      lowStockAlerts,
      expiryAlerts,
      recentMovements,
      topCategories,
      stockTrend: [], // Would need historical data
      activeLoans,
      overdueLoans,
      returnedLoans,
    };
  };

  const dashboardStats = calculateDashboardStats();

  // Save all data to Firebase
  const saveAllToFirebase = async (): Promise<void> => {
    if (!isOnline) {
      throw new Error('Sem conexão com a internet');
    }

    try {
      console.log('🔄 Salvando todos os dados no Firebase...');
      
      // Save products
      for (const product of products) {
        try {
          if (product.id && !isNaN(Number(product.id))) {
            // Local product, create in Firebase
            await productService.createProduct(product);
          } else {
            // Firebase product, update
            await productService.updateProduct(product.id, product);
          }
        } catch (error) {
          console.warn('Erro ao salvar produto:', product.name, error);
        }
      }

      // Save movements
      for (const movement of movements) {
        try {
          if (movement.id && !isNaN(Number(movement.id))) {
            // Local movement, create in Firebase
            await movementService.createMovement(movement);
          } else {
            // Firebase movement, update
            await movementService.updateMovement(movement.id, movement);
          }
        } catch (error) {
          console.warn('Erro ao salvar movimentação:', movement.reason, error);
        }
      }

      // Save loans
      for (const loan of loans) {
        try {
          if (loan.id && !isNaN(Number(loan.id))) {
            // Local loan, create in Firebase
            await loanService.createLoan(loan);
          } else {
            // Firebase loan, update
            await loanService.updateLoan(loan.id, loan);
          }
        } catch (error) {
          console.warn('Erro ao salvar empréstimo:', loan.borrowerName, error);
        }
      }

      // Save schedules
      for (const schedule of inventorySchedules) {
        try {
          if (schedule.id && !isNaN(Number(schedule.id))) {
            // Local schedule, create in Firebase
            await inventoryScheduleService.createSchedule(schedule);
          } else {
            // Firebase schedule, update
            await inventoryScheduleService.updateSchedule(schedule.id, schedule);
          }
        } catch (error) {
          console.warn('Erro ao salvar agendamento:', schedule.name, error);
        }
      }

      console.log('✅ Todos os dados salvos no Firebase');
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Erro ao salvar dados no Firebase:', error);
      throw error;
    }
  };

  // Sync from Firebase
  const syncFromFirebase = async (): Promise<void> => {
    if (!isOnline) {
      throw new Error('Sem conexão com a internet');
    }

    try {
      console.log('🔄 Sincronizando dados do Firebase...');
      
      // This would typically be handled by the realtime listeners
      // but we can force a refresh here
      await loadAllData();
      
      setLastSyncTime(new Date());
      console.log('✅ Dados sincronizados do Firebase');
    } catch (error) {
      console.error('Erro ao sincronizar dados do Firebase:', error);
      throw error;
    }
  };

  // Clear all offline data
  const clearAllOfflineData = () => {
    try {
      console.log('🧹 Limpando todos os dados offline...');
      
      // Clear state
      setProducts([]);
      setMovements([]);
      setLoans([]);
      setInventorySchedules([]);
      setReservations([]);
      setAlerts([]);
      
      // Clear offline storage
      offlineStorage.clearAllData();
      
      // Clear specific localStorage keys
      const keysToRemove = [
        'inventory_products',
        'inventory_movements', 
        'inventory_loans',
        'inventory_schedules',
        'inventory_reservations'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('✅ Dados offline limpos');
      
      // Cleanup realtime listeners
      realtimeUnsubscribes.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Erro ao limpar listener:', error);
        }
      });
      setRealtimeUnsubscribes([]);
      
      // Reload page to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao limpar dados offline:', error);
      throw error;
    }
  };

  const value: InventoryContextType = {
    products,
    categories,
    suppliers,
    movements,
    loans,
    inventorySchedules,
    alerts,
    dashboardStats,
    addProduct,
    updateProduct,
    deleteProduct,
    addCategory,
    addSupplier,
    addMovement,
    updateMovement,
    addLoan,
    updateLoan,
    deleteLoan,
    extendLoan,
    returnLoan,
    addInventorySchedule,
    updateInventorySchedule,
    deleteInventorySchedule,
    addInventoryCount,
    markAlertAsRead,
    loading,
    saveAllToFirebase,
    syncFromFirebase,
    isOnline,
    lastSyncTime,
    clearAllOfflineData,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}

// Mock data functions
function getMockCategories(): Category[] {
  return [
    {
      id: '1',
      name: 'Material de Escritório',
      description: 'Suprimentos e materiais de escritório',
      color: '#F59E0B',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Consumo',
      description: 'Materiais de consumo e descartáveis',
      color: '#10B981',
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Ativos',
      description: 'Ativos e patrimônio da empresa',
      color: '#3B82F6',
      createdAt: new Date(),
    },
    {
      id: '4',
      name: 'Equipamentos Pequeno',
      description: 'Equipamentos de pequeno porte',
      color: '#8B5CF6',
      createdAt: new Date(),
    },
  ];
}

function getMockSuppliers(): Supplier[] {
  return [
    {
      id: '1',
      name: 'Secontaf Consultoria Ltda',
      contact: 'Anderson Jatai',
      email: 'contato@secontaf.com.br',
      phone: '(11) 93936-4247',
      address: 'Rua das Tecnologias, 123 - São Paulo, SP',
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Cartepillar',
      contact: 'Maria Santos',
      email: 'vendas@carterpillar.com',
      phone: '(11) 88888-8888',
      address: 'Av. dos Móveis, 456 - São Paulo, SP',
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Mineradora Ouro',
      contact: 'Carlos Oliveira',
      email: 'pedidos@mineradouraouro.com',
      phone: '(11) 77777-7777',
      address: 'Rua do Comércio, 789 - São Paulo, SP',
      createdAt: new Date(),
    },
  ];
}