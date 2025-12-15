export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
  pageAccess?: PageAccess;
}

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface PageAccess {
  dashboard: boolean;
  products: boolean;
  movements: boolean;
  loans: boolean;
  inventoryScheduling: boolean;
  operator: boolean;
  users: boolean;
  suppliers: boolean;
  settings: boolean;
  reports: boolean;
}

export const DEFAULT_PAGE_ACCESS: Record<UserRole, PageAccess> = {
  admin: {
    dashboard: true,
    products: true,
    movements: true,
    loans: true,
    inventoryScheduling: true,
    operator: true,
    users: true,
    suppliers: true,
    settings: true,
    reports: true,
  },
  manager: {
    dashboard: true,
    products: true,
    movements: true,
    loans: true,
    inventoryScheduling: true,
    operator: true,
    users: false,
    suppliers: true,
    settings: false,
    reports: true,
  },
  operator: {
    dashboard: false,
    products: true,
    movements: true,
    loans: true,
    inventoryScheduling: true,
    operator: true,
    users: false,
    suppliers: false,
    settings: false,
    reports: false,
  },
  viewer: {
    dashboard: false,
    products: true,
    movements: true,
    loans: true,
    inventoryScheduling: true,
    operator: true,
    users: false,
    suppliers: false,
    settings: false,
    reports: false,
  },
};

export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode?: string;
  category: Category;
  subcategory: ProductSubcategory;
  supplier: Supplier;
  purchasePrice: number;
  salePrice: number;
  unit: string;
  location: Location;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  batch?: string;
  expiryDate?: Date;
  images: string[];
  isActive: boolean;
  operatorStatus?: 'Disponível' | 'Em uso' | 'Manutenção' | 'Reservado' | 'Fora de serviço';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductSubcategory {
  id: string;
  name: string;
  type: 'novo' | 'reemprego' | 'sucata';
  description?: string;
  color: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
}

export interface Location {
  id: string;
  warehouse: string;
  aisle: string;
  shelf: string;
  position?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  batch?: string;
  userId: string;
  createdAt: Date;
  notes?: string;
  price?: number;
  newLocation?: {
    warehouse: string;
    aisle: string;
    shelf: string;
    position?: string;
  };
  transferData?: {
    fromWarehouse: string;
    toWarehouse: string;
    transferStatus: 'pending' | 'in_transit' | 'received' | 'rejected';
    sentBy: string;
    sentAt: Date;
    receivedBy?: string;
    receivedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    trackingCode?: string;
    expectedDeliveryDate?: Date;
    actualDeliveryDate?: Date;
    transportNotes?: string;
  };
  obra?: string;
  notaFiscal?: string;
  attachments?: string[];
  approvalStatus?: ApprovalStatus;
  classifications?: MovementClassification[];
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
}

export type MovementType = 'entry' | 'exit' | 'transfer' | 'adjustment';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface MovementClassification {
  type: 'reemprego' | 'sucata';
  quantity: number;
  notes?: string;
}

export interface StockAlert {
  id: string;
  productId: string;
  type: AlertType;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export type AlertType = 'low_stock' | 'expiry_warning' | 'expired' | 'out_of_stock';

export interface DashboardStats {
  totalProducts: number;
  totalValue: number;
  lowStockAlerts: number;
  expiryAlerts: number;
  recentMovements: StockMovement[];
  topCategories: { category: string; count: number; value: number }[];
  stockTrend: { date: string; value: number }[];
  activeLoans: number;
  overdueLoans: number;
  returnedLoans: number;
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  filters: Record<string, any>;
  data: any[];
  generatedBy: string;
  generatedAt: Date;
}

export type ReportType = 'stock_levels' | 'movements' | 'categories' | 'suppliers' | 'expiry' | 'audit';

// Loan types
export interface Loan {
  id: string;
  productId: string;
  borrowerName: string;
  borrowerEmail?: string;
  borrowerPhone?: string;
  quantity: number;
  loanDate: Date;
  expectedReturnDate: Date;
  actualReturnDate?: Date;
  status: LoanStatus;
  notes?: string;
  extensions: LoanExtension[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LoanStatus = 'active' | 'returned' | 'overdue' | 'cancelled';

export interface LoanExtension {
  id: string;
  previousReturnDate: Date;
  newReturnDate: Date;
  reason: string;
  extendedBy: string;
  extendedAt: Date;
}

// Inventory Context Type
export interface InventoryContextType {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  movements: StockMovement[];
  loans: Loan[];
  inventorySchedules?: InventorySchedule[];
  alerts: StockAlert[];
  dashboardStats: DashboardStats;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (categoryData: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  addSupplier: (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>;
  addMovement: (movementData: Omit<StockMovement, 'id' | 'createdAt'>) => Promise<StockMovement>;
  addLoan: (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Loan>;
  updateLoan: (id: string, updates: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  extendLoan: (id: string, newDueDate: Date) => Promise<void>;
  returnLoan: (id: string) => Promise<void>;
  addInventorySchedule?: (scheduleData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<InventorySchedule>;
  updateInventorySchedule?: (id: string, updates: Partial<InventorySchedule>) => Promise<void>;
  deleteInventorySchedule?: (id: string) => Promise<void>;
  addInventoryCount?: (scheduleId: string, count: Omit<InventoryCount, 'id'>) => Promise<InventoryCount>;
  updateMovement?: (id: string, updates: Partial<StockMovement>) => Promise<void>;
  markAlertAsRead: (alertId: string) => void;
  loading: boolean;
  saveAllToFirebase: () => Promise<void>;
  syncFromFirebase: () => Promise<void>;
  isOnline: boolean;
  lastSyncTime: Date | null;
  clearAllOfflineData?: () => void;
}

export interface ActivityStatus {
  text: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  dataConclusao?: string;
  horaConclusao?: string;
  enderecoConclusao?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
}



// Inventory Scheduling types

export interface InventorySchedule {

  id: string;

  name: string;

  code: string;

  scheduledDate: Date;

  location: string;

  sector: string;

  status: InventoryStatus;

  expectedProducts: InventoryProduct[];

  countedProducts: InventoryCount[];

  createdBy: string;

  assignedUsers: string[];

  userRoles?: Record<string, string>; // Map of userId to their role in this inventory

  notes?: string;

  createdAt: Date;

  updatedAt: Date;

  completedAt?: Date;

  activities: string[];

  activityStatus: ActivityStatus[];

}

export type InventoryStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface InventoryProduct {
  productId: string;
  expectedQuantity: number;
  currentStock: number;
  priority: 'high' | 'medium' | 'low';
}

export interface InventoryCount {
  id: string;
  productId: string;
  countedQuantity: number;
  countedBy: string;
  countedAt: Date;
  notes?: string;
  variance: number; // Diferença entre esperado e contado
  validations: InventoryValidation[];
  status: InventoryCountStatus;
  metadata?: {
    location?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    userAgent?: string;
    timestamp?: string;
    sessionId?: string;
    deviceInfo?: {
      platform: string;
      language: string;
      timezone: string;
    };
  };
}

export type InventoryCountStatus = 'pending' | 'counted' | 'validated' | 'approved' | 'rejected';

export interface InventoryValidation {
  id: string;
  step: ValidationStep;
  validatedBy: string;
  validatedAt: Date;
  status: 'approved' | 'rejected';
  notes?: string;
  requiredRole: UserRole;
}

export type ValidationStep = 'counting' | 'Validador_review';

export const VALIDATION_WORKFLOW: Record<ValidationStep, {
  name: string;
  description: string;
  requiredFunction: string;
  nextStep?: ValidationStep;
}> = {
  counting: {
    name: 'Contagem',
    description: 'Contagem inicial do produto',
    requiredFunction: 'Apontador',
    nextStep: 'Validador_review'
  },
  Validador_review: {
    name: 'Revisão do Validador',
    description: 'Validação da contagem pelo Validador',
    requiredFunction: 'Validador',
  }
}

export interface InventoryReport {
  scheduleId: string;
  totalProducts: number;
  countedProducts: number;
  notFoundProducts: number;
  inventoryPercentage: number;
  totalExpectedValue: number;
  totalCountedValue: number;
  variance: number;
  countedItems: InventoryCount[];
  notFoundItems: InventoryProduct[];
}

// Equipment Reservation types
export interface EquipmentReservation {
  id: string;
  operador: string;
  equipamento: string;
  nivel_oleo: 'Baixo' | 'Médio' | 'Alto';
  nivel_combustivel: 'Baixo' | 'Médio' | 'Alto';
  nivel_poligrama: 'Baixo' | 'Médio' | 'Alto';
  status_equipamento: 'Em uso' | 'Disponível' | 'Manutenção';
  observacoes?: string;
  motivo_reserva?: string;
  data_inicio?: Date;
  motivo_finalizacao?: string;
  data_fim?: Date;
  status_reserva: 'Ativo' | 'Finalizado';
  createdAt: Date;
  updatedAt: Date;
}