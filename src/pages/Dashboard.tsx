import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../contexts/InventoryContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Calendar,
  Users,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Settings,
  Wrench,
  Truck,
  Activity,
  Fuel,
  Gauge,
  PlayCircle,
  StopCircle,
  UserCheck,
  Building,
  HandHeart,
  X,  
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'; // Adicionando a importação que faltava
import { format, subDays, isAfter, isBefore, addDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../utils/dateUtils';
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Bar,
  Legend,
  BarChart,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  LabelList
} from 'recharts';
import { reservationService } from '../services/reservationService';
import { offlineStorage } from '../services/offlineStorageService';
import { userService } from '../services/userService';

export function Dashboard() {
  const { 
    products, 
    movements, 
    loans, 
    inventorySchedules = [],
    dashboardStats,
    loading 
  } = useInventory();
  const { user, hasRole } = useAuth();
  
  const [reservations, setReservations] = useState<any[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState<any | null>(null);
  const [expandedSchedules, setExpandedSchedules] = useState<string[]>([]);
  const [modalScheduleFilter, setModalScheduleFilter] = useState<'all' | 'completed' | 'pending' | 'in_progress' | 'overdue'>('all');
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });
  const [activePeriod, setActivePeriod] = useState<string>('last30');
  const [isExporting, setIsExporting] = useState(false);
  const [isRankingCollapsed, setIsRankingCollapsed] = useState(true);
  const [isWarehouseCollapsed, setIsWarehouseCollapsed] = useState(true);

  
  // Helper function to determine the status of an activity consistently.
  const getActivityStatus = (activity: any) => {
    if (activity.completed) {
      return 'completed';
    }
    const scheduledDate = activity.scheduledDate ? new Date(activity.scheduledDate) : null;
    const isPastDue = scheduledDate ? scheduledDate < new Date() : false;

    if (activity.scheduleStatus === 'overdue' || isPastDue) {
      return 'overdue';
    }
    if (activity.scheduleStatus === 'in_progress') {
      return 'in_progress';
    }
    return 'pending';
  };
  
  // Carregar reservas de equipamentos
  useEffect(() => {
    const loadReservations = async () => {
      try {
        setLoadingReservations(true);
        
        // Tentar carregar do Firebase primeiro
        if (navigator.onLine) {
          try {
            const firebaseReservations = await reservationService.getAllReservations();
            // Garantir que as datas sejam objetos Date
            const processedFirebaseReservations = firebaseReservations.map(reservation => ({
              ...reservation,
              createdAt: reservation.createdAt instanceof Date ? reservation.createdAt : new Date(reservation.createdAt),
              updatedAt: reservation.updatedAt instanceof Date ? reservation.updatedAt : new Date(reservation.updatedAt),
              data_inicio: reservation.data_inicio instanceof Date ? reservation.data_inicio : new Date(reservation.data_inicio),
              data_fim: reservation.data_fim instanceof Date ? reservation.data_fim : new Date(reservation.data_fim)
            }));
            setReservations(processedFirebaseReservations);
            console.log('Reservas carregadas do Firebase:', firebaseReservations.length);
          } catch (error) {
            console.warn('Erro ao carregar reservas do Firebase - usando dados locais:', error);
            // Fallback para dados locais
            const localReservations = offlineStorage.getCollection('reservations');
            // Garantir que as datas sejam objetos Date
            const processedLocalReservations = localReservations.map(reservation => ({
              ...reservation,
              createdAt: reservation.createdAt instanceof Date ? reservation.createdAt : new Date(reservation.createdAt),
              updatedAt: reservation.updatedAt instanceof Date ? reservation.updatedAt : new Date(reservation.updatedAt),
              data_inicio: reservation.data_inicio instanceof Date ? reservation.data_inicio : new Date(reservation.data_inicio),
              data_fim: reservation.data_fim instanceof Date ? reservation.data_fim : new Date(reservation.data_fim)
            }));
            setReservations(processedLocalReservations);
          }
        } else {
          // Carregar dados locais quando offline
          const localReservations = offlineStorage.getCollection('reservations');
          // Garantir que as datas sejam objetos Date
          const processedLocalReservations = localReservations.map(reservation => ({
            ...reservation,
            createdAt: reservation.createdAt instanceof Date ? reservation.createdAt : new Date(reservation.createdAt),
            updatedAt: reservation.updatedAt instanceof Date ? reservation.updatedAt : new Date(reservation.updatedAt),
            data_inicio: reservation.data_inicio instanceof Date ? reservation.data_inicio : new Date(reservation.data_inicio),
            data_fim: reservation.data_fim instanceof Date ? reservation.data_fim : new Date(reservation.data_fim)
          }));
          setReservations(processedLocalReservations);
          console.log('Reservas carregadas offline:', localReservations.length);
        }
      } catch (error) {
        console.error('Erro ao carregar reservas:', error);
        setReservations([]);
      } finally {
        setLoadingReservations(false);
      }
    };

    loadReservations();
  }, []);

  // Carregar usuários
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await userService.getAllUsers();
        setUsers(userList);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      }
    };
    loadUsers();
  }, []);

  const handlePeriodChange = (period: string) => {
    const today = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (period) {
      case 'today':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case 'thisWeek':
        startDate = startOfWeek(today, { weekStartsOn: 1 });
        endDate = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'thisMonth':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'thisYear':
        startDate = startOfYear(today);
        endDate = endOfYear(today);
        break;
      case 'weekPlusMinus7':
        startDate = subDays(today, 7);
        endDate = addDays(today, 7);
        break;
      case 'last30':
        startDate = subDays(today, 30);
        endDate = today;
        break;
      default:
        startDate = subDays(new Date(), 30);
        endDate = new Date();
    }
    
    setDateRange({ startDate, endDate });
    setActivePeriod(period);
  };


  const filteredInventorySchedules = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return inventorySchedules;
    return inventorySchedules.filter(schedule => {
      if (!schedule.scheduledDate) return false;
      const scheduleDate = new Date(schedule.scheduledDate);
      return isAfter(scheduleDate, dateRange.startDate!) && isBefore(scheduleDate, dateRange.endDate!);
    });
  }, [inventorySchedules, dateRange]);

  const filteredLoans = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return loans;
    return loans.filter(loan => {
      const loanDate = new Date(loan.loanDate);
      return isAfter(loanDate, dateRange.startDate!) && isBefore(loanDate, dateRange.endDate!);
    });
  }, [loans, dateRange]);

  const filteredReservations = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) return reservations;
    return reservations.filter(reservation => {
      const reservationDate = new Date(reservation.data_inicio);
      return isAfter(reservationDate, dateRange.startDate!) && isBefore(reservationDate, dateRange.endDate!);
    });
  }, [reservations, dateRange]);

  const handleExportToPDF = async () => {
    setIsExporting(true);
    const dashboardElement = document.getElementById('dashboard-content');
    if (!dashboardElement) {
      console.error("Elemento do dashboard não encontrado");
      setIsExporting(false);
      return;
    }

    try {
      const canvas = await html2canvas(dashboardElement, {
        scale: 2, // Aumenta a resolução da captura
        useCORS: true,
        logging: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      const width = pdfWidth;
      const height = width / ratio;

      pdf.addImage(imgData, 'PNG', 0, 0, width, height > pdfHeight ? pdfHeight : height);
      pdf.save(`dashboard-sigma-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar para PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToXLSX = (users: any[]) => {
    const dataToExport = filteredInventorySchedules.map(schedule => {
      const activities = schedule.activityStatus?.map(activity => {
        if (activity.completed) {
          const completedBy = activity.completedById ? users.find(u => u.id === activity.completedById)?.name : 'N/A';
          const completedAt = activity.completedAt ? ` em ${safeFormatDate(activity.completedAt, 'dd/MM/yyyy HH:mm')}` : '';          
          const location = activity.location || schedule.location;
          const locationName = location?.name || 'N/A';
          const locationSector = location?.sector || 'N/A';
          const address = location?.address || 'Endereço não disponível';
          const { latitude, longitude } = location || {};
          const mapLink = (latitude && longitude) ? `\nVer no Mapa (${latitude}, ${longitude})` : '';

          return `${activity.text}\nConcluído por ${completedBy}${completedAt}\n${locationName} - ${locationSector}\n${address}${mapLink}`;
        }
        return `${activity.text} (Pendente)`;
      }).join('; ');

      return {
        'Nome': schedule.name,
        'Código': schedule.code,
        'Data Agendada': safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy HH:mm'),
        'Status': schedule.status,
        'Data de Conclusão': schedule.completedAt ? safeFormatDate(schedule.completedAt, 'dd/MM/yyyy HH:mm') : 'N/A',
        'Local': schedule.location?.name,
        'Setor': schedule.location?.sector,
        'Observações': schedule.observations,
        'Atividades': activities,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agendamentos');

    // Trigger download
    XLSX.writeFile(workbook, 'agendamentos.xlsx');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      scheduled: 'Agendado',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      overdue: 'Atrasado',
      pending: 'Pendente',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  // Calculate metrics
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.currentStock * p.salePrice), 0);
  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock).length;
  const outOfStockProducts = products.filter(p => p.currentStock === 0).length;

  // Loans metrics
  const activeLoans = filteredLoans.filter(l => l.status === 'active').length;
  const overdueLoans = filteredLoans.filter(l => {
    if (l.status !== 'active') return false;
    const today = new Date();
    const returnDate = new Date(l.expectedReturnDate);
    return isAfter(today, returnDate);
  }).length;
  const returnedLoans = filteredLoans.filter(l => l.status === 'returned').length;
  const loansExpiringSoon = filteredLoans.filter(l => {
    if (l.status !== 'active') return false;
    const today = new Date();
    const returnDate = new Date(l.expectedReturnDate);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    return isAfter(returnDate, today) && isBefore(returnDate, threeDaysFromNow);
  }).length;

  // Inventory scheduling metrics
  const scheduledInventories = filteredInventorySchedules.filter(s => s.status === 'scheduled').length;
  const inProgressInventories = filteredInventorySchedules.filter(s => s.status === 'in_progress').length;
  const completedInventories = filteredInventorySchedules.filter(s => s.status === 'completed').length;
  const overdueInventories = filteredInventorySchedules.filter(s => s.status === 'overdue').length;
  const totalActivities = filteredInventorySchedules.reduce((acc, s) => acc + (s.activityStatus?.length || 0), 0);

  // Operator/Equipment metrics
  const activeReservations = filteredReservations.filter(r => r.status_reserva === 'Ativo').length;
  const completedReservations = filteredReservations.filter(r => r.status_reserva === 'Finalizado').length;
  const equipmentInUse = filteredReservations.filter(r => 
    r.status_reserva === 'Ativo' && r.status_equipamento === 'Em uso'
  ).length;
  const equipmentAvailable = filteredReservations.filter(r => 
    r.status_reserva === 'Ativo' && r.status_equipamento === 'Disponível'
  ).length;
  const equipmentMaintenance = filteredReservations.filter(r => 
    r.status_reserva === 'Ativo' && r.status_equipamento === 'Manutenção'
  ).length;

  // Recent movements data for chart
  const schedulesByDay = useMemo(() => {
    const byDay: Record<string, { Concluídos: number; Pendentes: number; Atrasados: number; date: string }> = {};
    const today = new Date();

    // Initialize data for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayKey = format(date, 'yyyy-MM-dd');
      byDay[dayKey] = {
        date: format(date, 'dd/MM', { locale: ptBR }),
        Concluídos: 0,
        Pendentes: 0,
        Atrasados: 0,
      };
    }

    filteredInventorySchedules.forEach(schedule => {
      if(!schedule.scheduledDate) return; // guard against invalid date
      const scheduleDate = new Date(schedule.scheduledDate);
      const dayKey = format(scheduleDate, 'yyyy-MM-dd');
      
      if (byDay[dayKey]) { // Only process schedules within the last 7 days
        if (schedule.activityStatus) {
          byDay[dayKey].Concluídos += schedule.activityStatus.filter(a => a.completed).length;
          const notCompleted = schedule.activityStatus.filter(a => !a.completed).length;
          if (notCompleted > 0) {
            if (schedule.status === 'overdue' || (schedule.status === 'in_progress' && new Date(schedule.scheduledDate) < new Date())) {
              byDay[dayKey].Atrasados += notCompleted;
            } else {
              byDay[dayKey].Pendentes += notCompleted;
            }
          }
        }
      }
    });

    const sortedKeys = Object.keys(byDay).sort();
    return sortedKeys.map(key => byDay[key]);
  }, [filteredInventorySchedules]);

  const upcomingSchedulesByDay = useMemo(() => {
    const byDay: Record<string, { Agendados: number; date: string }> = {};
    const today = new Date();

    filteredInventorySchedules
      .filter(schedule => schedule.scheduledDate && isAfter(new Date(schedule.scheduledDate), today))
      .forEach(schedule => {
        const scheduleDate = new Date(schedule.scheduledDate);
        const dayKey = format(scheduleDate, 'yyyy-MM-dd');
        
        if (!byDay[dayKey]) {
          byDay[dayKey] = {
            date: format(scheduleDate, 'dd/MM', { locale: ptBR }),
            Agendados: 0,
          };
        }
        byDay[dayKey].Agendados++;
    });

    const sortedKeys = Object.keys(byDay).sort();
    return sortedKeys.map(key => byDay[key]);
  }, [filteredInventorySchedules]);

  const schedulesByMonth = useMemo(() => {
    const byMonth: Record<string, { Concluídos: number; Pendentes: number; Atrasados: number; date: string }> = {};

    filteredInventorySchedules.forEach(schedule => {
      if(!schedule.scheduledDate) return; // guard against invalid date
      const scheduleDate = new Date(schedule.scheduledDate);
      const monthKey = format(scheduleDate, 'yyyy-MM');
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          date: format(scheduleDate, 'MMM/yy', { locale: ptBR }),
          Concluídos: 0,
          Pendentes: 0,
          Atrasados: 0,
        };
      }

      if (schedule.activityStatus) {
        byMonth[monthKey].Concluídos += schedule.activityStatus.filter(a => a.completed).length;
        const notCompleted = schedule.activityStatus.filter(a => !a.completed).length;
        if (notCompleted > 0) {
          if (schedule.status === 'overdue' || (schedule.status === 'in_progress' && new Date(schedule.scheduledDate) < new Date())) {
            byMonth[monthKey].Atrasados += notCompleted;
          } else {
            byMonth[monthKey].Pendentes += notCompleted;
          }
        }
      }
    });

    const sortedKeys = Object.keys(byMonth).sort();
    return sortedKeys.map(key => byMonth[key]);
  }, [filteredInventorySchedules]);

  // Calculate totals for the period
  const totalConcluidos = schedulesByMonth.reduce((acc, day) => acc + day.Concluídos, 0);
  const totalPendentes = schedulesByMonth.reduce((acc, day) => acc + day.Pendentes, 0);
  const totalAtrasados = schedulesByMonth.reduce((acc, day) => acc + day.Atrasados, 0);



  // Distribution by warehouse
  const warehouseDistribution = Array.from(
    new Set(products.map(p => p.location.warehouse))
  ).map(warehouse => {
    const warehouseProducts = products.filter(p => p.location.warehouse === warehouse);
    const totalStock = warehouseProducts.reduce((sum, p) => sum + p.currentStock, 0);
    const totalValue = warehouseProducts.reduce((sum, p) => sum + (p.currentStock * p.salePrice), 0);
    
    return {
      name: warehouse,
      products: warehouseProducts.length,
      stock: totalStock,
      value: totalValue,
      percentage: totalProducts > 0 ? ((warehouseProducts.length / totalProducts) * 100).toFixed(1) : '0'
    };
  });

  // Collaborator ranking based on completed activities
  const collaboratorRanking = useMemo(() => {
    const userActivities: Record<string, any[]> = {};

    filteredInventorySchedules.forEach(schedule => {
      schedule.activityStatus?.forEach(activity => {
        const activityData = {
          ...activity,
          scheduleName: schedule.name,
          scheduleCode: schedule.code,
          scheduleId: schedule.id,
          scheduleStatus: schedule.status,
          scheduledDate: schedule.scheduledDate,
        };
        schedule.assignedUsers.forEach(userId => {
          if (!userActivities[userId]) {
            userActivities[userId] = [];
          }
          userActivities[userId].push(activityData);
        });
      });
    });

    return Object.entries(userActivities)
      .map(([userId, activities]) => {
        const user = users.find(u => u.id === userId);
        
        const statusCounts = activities.reduce((counts, activity) => {
          const status = getActivityStatus(activity);
          counts[status] = (counts[status] || 0) + 1;
          return counts;
        }, { completed: 0, pending: 0, in_progress: 0, overdue: 0 });

        const lastActivity = activities
          .filter(a => a.completed && a.completedAt)
          .reduce((latest: Date | null, a) => {
            const completedAtDate = new Date(a.completedAt);
            return !latest || completedAtDate > latest ? completedAtDate : latest;
          }, null);

        return {
          userId,
          userName: user?.name || `Usuário ${userId.substring(0, 4)}`,
          avatar: user?.avatar,
          completed: statusCounts.completed,
          pending: statusCounts.pending,
          in_progress: statusCounts.in_progress,
          overdue: statusCounts.overdue,
          lastActivity,
          activities,
        };
      })
      .sort((a, b) => b.overdue - a.overdue || b.completed - a.completed);
  }, [inventorySchedules, users, getActivityStatus]);

  const filteredModalSchedules = useMemo(() => {
    if (!selectedCollaborator) {
      return [];
    }
    if (modalScheduleFilter === 'all') {
      return selectedCollaborator.activities;
    }
    return selectedCollaborator.activities.filter((activity: any) => {
      const status = getActivityStatus(activity);
      return status === modalScheduleFilter;
    });
  }, [selectedCollaborator, modalScheduleFilter]);
  // Stock status distribution
  const stockStatus = [
    { name: 'Estoque Normal', value: products.filter(p => p.currentStock > p.minStock).length, color: '#10B981' },
    { name: 'Estoque Baixo', value: lowStockProducts, color: '#F59E0B' },
    { name: 'Sem Estoque', value: outOfStockProducts, color: '#EF4444' },
  ];

  // Get unique warehouses and categories for filters
  const warehouses = Array.from(new Set(products.map(p => p.location.warehouse)));
  const categories = Array.from(new Set(products.map(p => p.category.name)));

  // Equipment status distribution for operator summary
  const equipmentStatusData = [
    { name: 'Em Uso', value: equipmentInUse, color: '#3B82F6' },
    { name: 'Disponível', value: equipmentAvailable, color: '#10B981' },
    { name: 'Manutenção', value: equipmentMaintenance, color: '#F59E0B' },
  ];

  // Recent reservations for operator summary
  const recentReservations = filteredReservations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

 return (
    <div className="space-y-6" id="dashboard-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Imagem Icone-sigma.jpg adicionada aqui */}
          <img 
            src="/sigma.png"
              alt="sigma copy"
            className="w-20 h-20 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Visão geral do sistema Sigma
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            className="flex items-center space-x-2"
            onClick={handleExportToPDF}
            disabled={isExporting}>
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando PDF...' : 'Exportar PDF'}</span>
          </Button>
          <Button variant="secondary" className="flex items-center space-x-2">
             <RefreshCw className="w-4 h-4" />
             <span>Atualizar</span>
           </Button>
         </div>
       </div>
 
       {/* Date Filter */}
       <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center flex-wrap gap-2">
              <Button size="sm" variant={activePeriod === 'today' ? 'default' : 'outline'} onClick={() => handlePeriodChange('today')}>Hoje</Button>
              <Button size="sm" variant={activePeriod === 'thisWeek' ? 'default' : 'outline'} onClick={() => handlePeriodChange('thisWeek')}>Esta Semana</Button>
              <Button size="sm" variant={activePeriod === 'thisMonth' ? 'default' : 'outline'} onClick={() => handlePeriodChange('thisMonth')}>Este Mês</Button>
              <Button size="sm" variant={activePeriod === 'thisYear' ? 'default' : 'outline'} onClick={() => handlePeriodChange('thisYear')}>Este Ano</Button>
              <Button size="sm" variant={activePeriod === 'weekPlusMinus7' ? 'default' : 'outline'} onClick={() => handlePeriodChange('weekPlusMinus7')}>Semana (+/- 7d)</Button>
              <Button size="sm" variant={activePeriod === 'last30' ? 'default' : 'outline'} onClick={() => handlePeriodChange('last30')}>Últimos 30 dias</Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="startDate" className="text-sm font-medium text-gray-700">De:</label>
                <Input type="date" id="startDate" value={dateRange.startDate ? format(dateRange.startDate, 'yyyy-MM-dd') : ''} onChange={e => { setDateRange(prev => ({ ...prev, startDate: e.target.value ? new Date(e.target.value) : null })); setActivePeriod('custom'); }} />
              </div>
              <div className="flex items-center space-x-2">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700">Até:</label>
                <Input type="date" id="endDate" value={dateRange.endDate ? format(dateRange.endDate, 'yyyy-MM-dd') : ''} onChange={e => { setDateRange(prev => ({ ...prev, endDate: e.target.value ? addDays(new Date(e.target.value), 1) : null })); setActivePeriod('custom'); }} />
              </div>
            </div>
          </div>
        </CardContent>
       </Card>
       {/* <div className="flex items-center justify-end space-x-4 p-4 bg-white rounded-lg shadow-sm">
         </div>
       </div> */}
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Loans Section */}
         <div className="space-y-4">
           <div className="flex items-center space-x-3">
             <div className="bg-purple-100 p-2 rounded-lg">
               <HandHeart className="w-5 h-5 text-purple-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-900">Empréstimos</h2>
               <p className="text-sm text-gray-600">Status dos empréstimos de produtos</p>
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card hover className="bg-blue-100 border-blue-300">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Empréstimos Ativos</p>
                     <p className="text-2xl font-bold text-blue-600">{activeLoans}</p>
                   </div>
                   <TrendingUp className="w-8 h-8 text-blue-600" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-red-100 border-red-300">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Empréstimos Vencidos</p>
                     <p className="text-2xl font-bold text-red-600">{overdueLoans}</p>
                   </div>
                   <AlertTriangle className="w-8 h-8 text-red-600" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-yellow-100 border-yellow-300">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Vencidos em 3 dias</p>
                     <p className="text-2xl font-bold text-yellow-600">{loansExpiringSoon}</p>
                   </div>
                   <Clock className="w-8 h-8 text-yellow-600" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-green-100 border-green-300">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Devolvidos</p>
                     <p className="text-2xl font-bold text-green-600">{returnedLoans}</p>
                   </div>
                   <CheckCircle className="w-8 h-8 text-green-600" />
                 </div>
               </CardContent>
             </Card>
           </div>
         </div>
 
         {/* Inventory Scheduling Section */}
         <div className="space-y-4">
           <div className="flex items-center space-x-3">
             <div className="bg-indigo-100 p-2 rounded-lg">
               <Calendar className="w-5 h-5 text-indigo-600" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-gray-900">Agendamentos</h2>
               <p className="text-sm text-gray-600">Status da programações</p>
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <Card className="flex flex-col items-center justify-center p-4 bg-purple-50 border-purple-200 md:row-span-2">
               <div className="w-24 h-24 rounded-full bg-purple-100 border-4 border-white shadow-md flex flex-col items-center justify-center">
                 <BarChart3 className="w-6 h-6 text-purple-600 mb-1" />
                 <div className="text-2xl font-bold text-purple-700">
                   {totalActivities}
                 </div>
               </div>
               <CardHeader className="text-center p-2">
                 <h3 className="text-sm font-medium text-purple-800">Total de Atividades</h3>
               </CardHeader>
             </Card>
             <Card hover className="bg-gray-100 border-gray-300">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Total de Agendamentos</p>
                     <p className="text-2xl font-bold text-gray-800">{filteredInventorySchedules.length}</p>
                   </div>
                   <Calendar className="w-8 h-8 text-gray-500" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-blue-100 border-blue-300">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Locais Agendados</p>
                     <p className="text-2xl font-bold text-blue-600">{scheduledInventories}</p>
                   </div>
                   <Calendar className="w-8 h-8 text-blue-600" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-yellow-50 border-yellow-200">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Em Andamento</p>
                     <p className="text-2xl font-bold text-yellow-600">{inProgressInventories}</p>
                   </div>
                   <Activity className="w-8 h-8 text-yellow-600" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-green-50 border-green-200">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Locais Concluídos</p>
                     <p className="text-2xl font-bold text-green-600">{completedInventories}</p>
                   </div>
                   <CheckCircle className="w-8 h-8 text-green-600" />
                 </div>
               </CardContent>
             </Card>
             <Card hover className="bg-red-50 border-red-200">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm text-gray-600">Agendamentos Atrasados</p>
                     <p className="text-2xl font-bold text-red-600">{overdueInventories}</p>
                   </div>
                   <AlertTriangle className="w-8 h-8 text-red-600" />
                 </div>
               </CardContent>
             </Card>
           </div>
         </div>
       </div>

      {/* Charts Section */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-cyan-100 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gráficos e Análises</h2>
            <p className="text-sm text-gray-600">Visualizações dos dados do sistema</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movements Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Agendamentos
              </h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpandedChart('movements')}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center p-1 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-700">Concluídos</p>
                <p className="text-xl font-bold text-green-600">{totalConcluidos}</p>
              </div>
              <div className="text-center p-1 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs font-medium text-yellow-700">Pendentes</p>
                <p className="text-xl font-bold text-yellow-600">{totalPendentes}</p>
              </div>
              <div className="text-center p-1 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-700">Atrasados</p>
                <p className="text-xl font-bold text-red-600">{totalAtrasados}</p>
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={schedulesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Concluídos" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    name="Concluídos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Pendentes" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                    name="Pendentes"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Atrasados" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    name="Atrasados"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Schedules Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ArrowRight className="w-5 h-5 mr-2" />
                Próximos Agendamentos
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={upcomingSchedulesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} agendamentos`, 'Agendados']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Agendados"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    name="Agendados"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Warehouse Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Distribuição por Armazém
              </h3>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setExpandedChart('warehouse')}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsWarehouseCollapsed(!isWarehouseCollapsed)}
                  title={isWarehouseCollapsed ? 'Expandir' : 'Recolher'}
                >
                  {isWarehouseCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          {!isWarehouseCollapsed && (
            <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={warehouseDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} produtos`, 'Total']}
                  />
                  <Bar dataKey="products" name="Produtos" barSize={40}>
                    <LabelList dataKey="products" position="insideTop" fill="#fff" fontWeight="bold" />
                    {warehouseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          )}
        </Card>
      </div>

     

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Ranking de Colaboradores
              </h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-green-500 mr-1.5"></div>
                    <span>Concluídas</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-blue-500 mr-1.5"></div>
                    <span>Pendentes</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-yellow-500 mr-1.5"></div>
                    <span>Em Andamento</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-sm bg-red-600 mr-1.5 ring-1 ring-red-700"></div>
                    <span>Atrasadas</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRankingCollapsed(!isRankingCollapsed)}
                  title={isRankingCollapsed ? 'Expandir' : 'Recolher'}
                >
                  {isRankingCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          {!isRankingCollapsed && (
            <CardContent>
              <div className="space-y-4">
                {collaboratorRanking.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhuma atividade de colaborador para exibir.</p>
                  </div>
                )}
                {collaboratorRanking.map((collab) => {
                  const total = collab.completed + collab.pending + collab.in_progress + collab.overdue;
                  const completedPercent = total > 0 ? (collab.completed / total) * 100 : 0;
                  const pendingPercent = total > 0 ? (collab.pending / total) * 100 : 0;
                  const inProgressPercent = total > 0 ? (collab.in_progress / total) * 100 : 0;
                  const overduePercent = total > 0 ? (collab.overdue / total) * 100 : 0;

                  return (
                    <div 
                      key={collab.userId} 
                      className="p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all"
                      onClick={() => setSelectedCollaborator(collab)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {collab.avatar ? (
                            <img src={collab.avatar} alt={collab.userName} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserCheck className="w-5 h-5 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{collab.userName}</p>
                            <p className="text-xs text-gray-500">
                              Última atividade: {collab.lastActivity ? safeFormatDate(collab.lastActivity, 'dd/MM/yyyy') : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end space-x-3">
                            {collab.completed > 0 && (
                              <div className="flex items-center text-green-600" title={`${collab.completed} atividades concluídas`}>
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-lg font-bold ml-1">{collab.completed}</span>
                              </div>
                            )}
                            {collab.overdue > 0 && (
                              <div className="flex items-center text-red-600" title={`${collab.overdue} atividades atrasadas`}>
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-lg font-bold ml-1">{collab.overdue}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Concluídas / Atrasadas</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-5 flex text-xs font-bold text-white overflow-hidden">
                          {overduePercent > 0 && (
                            <div className="bg-red-600 h-5 flex items-center justify-center ring-1 ring-inset ring-red-700" style={{ width: `${overduePercent}%` }} title={`Atrasadas: ${collab.overdue}`}>
                              {collab.overdue}
                            </div>
                          )}
                          {completedPercent > 0 && (
                            <div className="bg-green-500 h-5 flex items-center justify-center" style={{ width: `${completedPercent}%` }} title={`Concluídas: ${collab.completed}`}>
                              {collab.completed}
                            </div>
                          )}
                          {pendingPercent > 0 && (
                            <div className="bg-blue-500 h-5 flex items-center justify-center" style={{ width: `${pendingPercent}%` }} title={`Pendentes: ${collab.pending}`}>
                              {collab.pending}
                            </div>
                          )}
                          {inProgressPercent > 0 && (
                            <div className="bg-yellow-500 h-5 flex items-center justify-center" style={{ width: `${inProgressPercent}%` }} title={`Em Andamento: ${collab.in_progress}`}>
                              {collab.in_progress}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>

      </div>

      {/* Collaborator Details Modal */}
      {selectedCollaborator && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedCollaborator.avatar ? (
                    <img src={selectedCollaborator.avatar} alt={selectedCollaborator.userName} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserCheck className="w-8 h-8 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedCollaborator.userName}</h2>
                    <p className="text-sm text-gray-500">Detalhes das Atividades</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedCollaborator(null);
                  setModalScheduleFilter('all'); // Reset filter on close
                  setExpandedSchedules([]); // Reset expanded schedules on close
                }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => setModalScheduleFilter('completed')}
                  className={`p-4 rounded-lg text-center transition-all ${modalScheduleFilter === 'completed' ? 'bg-green-200 border-2 border-green-400' : 'bg-green-50 border border-green-200 hover:bg-green-100'}`}
                >
                  <p className="text-2xl md:text-3xl font-bold text-green-600">{selectedCollaborator.completed}</p>
                  <p className="text-sm font-medium text-green-800">Concluídas</p>
                </button>
                <button 
                  onClick={() => setModalScheduleFilter('pending')}
                  className={`p-4 rounded-lg text-center transition-all ${modalScheduleFilter === 'pending' ? 'bg-blue-200 border-2 border-blue-400' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'}`}
                >
                  <p className="text-2xl md:text-3xl font-bold text-blue-600">{selectedCollaborator.pending}</p>
                  <p className="text-sm font-medium text-blue-800">Pendentes</p>
                </button>
                <button 
                  onClick={() => setModalScheduleFilter('in_progress')}
                  className={`p-4 rounded-lg text-center transition-all ${modalScheduleFilter === 'in_progress' ? 'bg-yellow-200 border-2 border-yellow-400' : 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'}`}
                >
                  <p className="text-2xl md:text-3xl font-bold text-yellow-600">{selectedCollaborator.in_progress}</p>
                  <p className="text-sm font-medium text-yellow-800">Em Andamento</p>
                </button>
                <button 
                  onClick={() => setModalScheduleFilter('overdue')}
                  className={`p-4 rounded-lg text-center transition-all ${modalScheduleFilter === 'overdue' ? 'bg-red-200 border-2 border-red-400' : 'bg-red-50 border border-red-200 hover:bg-red-100'}`}
                >
                  <p className="text-2xl md:text-3xl font-bold text-red-600">{selectedCollaborator.overdue}</p>
                  <p className="text-sm font-medium text-red-800">Atrasadas</p>
                </button>
              </div>

              {/* Schedule List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Atividades
                    {modalScheduleFilter !== 'all' && (
                      <Badge
                        variant={
                          modalScheduleFilter === 'completed' ? 'success' :
                          modalScheduleFilter === 'pending' ? 'info' :
                          modalScheduleFilter === 'in_progress' ? 'warning' :
                          'danger'
                        }
                        className="ml-2"
                      >
                        {modalScheduleFilter === 'completed' ? 'Concluídas' :
                         modalScheduleFilter === 'pending' ? 'Pendentes' :
                         modalScheduleFilter === 'in_progress' ? 'Em Andamento' :
                         'Atrasadas'}
                      </Badge>
                    )}
                  </h4>
                  {modalScheduleFilter !== 'all' && (
                    <Button variant="ghost" size="sm" onClick={() => setModalScheduleFilter('all')}>
                      <X className="w-3 h-3 mr-1" /> Limpar Filtro
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {filteredModalSchedules.length > 0 ? (
                    filteredModalSchedules.map((activity: any, index: number) => {
                      const isOverdue = new Date(activity.scheduledDate) < new Date() && activity.scheduleStatus !== 'completed';
                      const getStatusInfo = (activity: any) => {
                        if (activity.completed) {
                          return { label: 'Concluída', variant: 'success' as const, icon: CheckCircle };
                        }
                        if (activity.scheduleStatus === 'overdue' || isOverdue) {
                          return { label: 'Atrasada', variant: 'danger' as const, icon: AlertTriangle };
                        }
                        if (activity.scheduleStatus === 'in_progress') {
                          return { label: 'Em Andamento', variant: 'warning' as const, icon: Activity };
                        }
                        // Default to pending
                        return { label: 'Pendente', variant: 'warning' as const, icon: Clock };
                      };
                      const statusInfo = getStatusInfo(activity);

                      return (
                        <div key={`${activity.scheduleId}-${index}`} className="bg-white border rounded-lg p-3">
                          <div 
                            className="flex items-center justify-between p-3 cursor-pointer"
                          >
                            <div>
                              <p className={`font-medium text-gray-900 ${activity.completed ? 'line-through text-gray-500' : ''}`}>{activity.text}</p>
                              <p className="text-sm text-gray-500">
                                Do agendamento: {activity.scheduleName} ({activity.scheduleCode})
                              </p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant={statusInfo.variant} size="sm">
                                <statusInfo.icon className="w-3 h-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p>Nenhuma atividade encontrada para este filtro.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <Button variant="secondary" onClick={() => {
                  setSelectedCollaborator(null);
                  setExpandedSchedules([]); // Reset expanded schedules on close
                }}>
                  Fechar
                </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Equipment Performance Metrics */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Gauge className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Indicadores de Performance</h2>
            <p className="text-sm text-gray-600">Indicadores de eficiência operacional</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Gauge className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taxa de Utilização</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reservations.length > 0 ? Math.round((equipmentInUse / reservations.length) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">Equipamentos em uso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Taxa de Devolução</p>
                <p className="text-2xl font-bold text-green-600">
                  {reservations.length > 0 ? Math.round((completedReservations / reservations.length) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">Equipamentos devolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Wrench className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Eficiência Operacional</p>
                <p className="text-2xl font-bold text-yellow-600">60%</p>
                <p className="text-xs text-gray-500">Desempenho geral</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover className="bg-red-50 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Equipamentos Indisponíveis</p>
                <p className="text-2xl font-bold text-red-600">0%</p>
                <p className="text-xs text-gray-500">Em manutenção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 transition-all duration-200 w-[95vw] h-[95vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-6 h-6 mr-2" />
                {expandedChart === 'movements' ? 'Agendamentos - Visão Expandida' : 'Distribuição por Armazém - Visão Expandida'}
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => setExpandedChart(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-6 h-full flex flex-col">
                <div className="flex-1 min-h-[400px]">
                  <ResponsiveContainer width="100%" height="100%"> {/* Ajustado para 100% de altura */}
                    {expandedChart === 'movements' ? (
                      <LineChart data={schedulesByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          axisLine={{ stroke: '#9ca3af' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }} allowDecimals={false}
                          axisLine={{ stroke: '#9ca3af' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number, name: string) => [
                            `${value} agendamentos`,
                            name
                          ]}
                          labelFormatter={(label: any) => `Data: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="Concluídos" 
                          stroke="#3B82F6" 
                          strokeWidth={3}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                          name="Concluídos"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Pendentes" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                          name="Pendentes"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Atrasados" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                          name="Atrasados"
                        />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={warehouseDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={140}
                          paddingAngle={5}
                          dataKey="products"
                          label={({ name, value, percentage }) => `${name}: ${value} (${percentage}%)`}
                          labelLine={false}
                        >
                          {warehouseDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [`${value} produtos`, 'Quantidade']}
                          labelFormatter={(label: any) => `Armazém: ${label}`}
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value, entry) => `${value} (${entry.payload.products} produtos)`}
                        />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
                
                {/* Additional Details for Expanded View */}
                {expandedChart === 'warehouse' && (
                  <div className="bg-gray-50 rounded-lg p-4 flex-shrink-0">
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-shrink-0">
                        {warehouseDistribution.map((warehouse, index) => (
                          <Card key={warehouse.name} className="border-l-4" style={{ borderLeftColor: COLORS[index % COLORS.length] }}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{warehouse.name}</h4>
                                <Badge variant="info" size="sm">{warehouse.percentage}%</Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Produtos:</span>
                                  <span className="font-medium">{warehouse.products}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Estoque Total:</span>
                                  <span className="font-medium">{warehouse.stock} unidades</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Valor Total:</span>
                                  <span className="font-medium text-green-600">{formatCurrency(warehouse.value)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {expandedChart === 'movements' && (
                  <div className="bg-gray-50 rounded-lg p-4 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900">Informações do Agendamento</h4>
                      <Button onClick={() => handleExportToXLSX(users)} size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar para XLSX
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Agendada</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data de Conclusão</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setor</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Observações</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuários Atribuídos</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atividades</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredInventorySchedules.map((schedule) => (
                            <tr key={schedule.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 text-sm text-gray-900 font-medium">{schedule.name}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">{schedule.code}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">{safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy HH:mm')}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">{translateStatus(schedule.status)}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">{schedule.completedAt ? safeFormatDate(schedule.completedAt, 'dd/MM/yyyy HH:mm') : 'N/A'}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">{schedule.location?.name}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">{schedule.location?.sector}</td>
                              <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">{schedule.observations}</td>
                              <td className="px-4 py-4 text-sm text-gray-500">
                                {schedule.assignedUsers?.map(userId => users.find(u => u.id === userId)?.name).filter(Boolean).join(', ') || 'N/A'}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500 align-top">
                                {schedule.activityStatus?.map((activity, index) => {
                                  const completedBy = activity.completedById ? users.find(u => u.id === activity.completedById)?.name : 'N/A';
                                  const completedAt = activity.completedAt ? ` em ${safeFormatDate(activity.completedAt, 'dd/MM/yyyy HH:mm')}` : '';                                  
                                  const location = activity.location || schedule.location;
                                  const locationName = location?.name || 'N/A';
                                  const locationSector = location?.sector || 'N/A';
                                  const address = location?.address || 'Endereço não disponível';
                                  const { latitude, longitude } = location || {};
                                  const mapLink = (latitude && longitude) ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

                                  return (
                                    <div key={activity.id} className={index > 0 ? "mt-4 pt-4 border-t border-gray-200" : ""}>
                                      <span>{activity.text}</span>
                                      {activity.completed ? (
                                        <>
                                          <span className="text-xs text-gray-500 block">
                                            Concluído por {completedBy}{completedAt}
                                          </span>
                                          <span className="text-xs text-gray-500 block">
                                            {locationName} - {locationSector}
                                          </span>
                                          <span className="text-xs text-gray-500 block">{address}</span>
                                          {mapLink && (
                                            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block">
                                              Ver no Mapa ({latitude}, {longitude})
                                            </a>
                                          )}
                                        </>
                                      ) : (
                                        <span className="text-xs text-yellow-600 block">Pendente</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}