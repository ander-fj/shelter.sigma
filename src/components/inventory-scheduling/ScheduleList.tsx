import { useState, useEffect } from 'react';
import { InventorySchedule, Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext'; 
import { useInventory } from '../../contexts/InventoryContext';
import { Search, Filter, CreditCard as Edit, Trash2, Eye, Calendar, MapPin, Users, Plus, Download, BarChart3, Play, CheckCircle, Clock, AlertTriangle, X, Save, Cloud, UploadCloud, ChevronDown, FileUp, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userService } from '../../services/userService';
import { useInventoryProgress } from './useInventoryProgress';
import { safeFormatDate } from '../../utils/dateUtils';


interface ScheduleListProps {
  schedules: InventorySchedule[];
  products: Product[];
  onSchedulesAdd: (newSchedules: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onAdd: () => void;
  onEdit: (schedule: InventorySchedule) => void;
  onView: (schedule: InventorySchedule) => void;
  onDelete: (scheduleId: string) => void;
  onStartCounting: (schedule: InventorySchedule) => void;
  onViewReports: () => void;
  onViewCountedItems: () => void;
  loading?: boolean;
}

export function ScheduleList({ 
  schedules, 
  products, 
  onSchedulesAdd,
  onAdd, 
  onEdit, 
  onView, 
  onDelete,
  onStartCounting,
  onViewReports,
  onViewCountedItems,
  loading = false 
}: ScheduleListProps) {
  const { hasRole } = useAuth();
  const { user, loading: authLoading } = useAuth();
  const { saveAllToFirebase, isOnline, updateInventorySchedule } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);
  const [saveFirebaseMessage, setSaveFirebaseMessage] = useState('Gravar no Firebase');
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [saveFirebaseVariant, setSaveFirebaseVariant] = useState<'success' | 'danger' | 'default'>('success');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Efeito para verificar e corrigir o status dos agendamentos
  useEffect(() => {
    if (!loading && !authLoading && schedules.length > 0) {
      schedules.forEach(async (schedule) => {
        // Apenas verifica agendamentos que não estão 'completed' ou 'cancelled', incluindo 'overdue'
        if (schedule.status === 'scheduled' || schedule.status === 'in_progress' || schedule.status === 'overdue') {
          const totalActivities = schedule.activityStatus?.length || 0;
          const completedActivities = schedule.activityStatus?.filter(a => a.completed).length || 0;

          // Se todas as atividades estão completas, mas o status não é 'completed'
          if (totalActivities > 0 && completedActivities === totalActivities && schedule.status !== 'completed') {
            console.log(`Corrigindo status do agendamento na lista: ${schedule.code} para 'completed'`);
            const updatedSchedule = { ...schedule, status: 'completed' as const, completedAt: new Date(), updatedAt: new Date() };
            await updateInventorySchedule(schedule.id, updatedSchedule);
          } else if (completedActivities > 0 && completedActivities < totalActivities && (schedule.status === 'scheduled' || schedule.status === 'overdue')) {
            // Se algumas atividades estão completas e o status ainda é 'agendado' ou 'atrasado', muda para 'em andamento'
            console.log(`Corrigindo status do agendamento na lista: ${schedule.code} para 'in_progress'`);
            const updatedSchedule = { ...schedule, status: 'in_progress' as const, updatedAt: new Date() };
            await updateInventorySchedule(schedule.id, updatedSchedule);
          } else if (new Date(schedule.scheduledDate) < new Date() && schedule.status === 'scheduled' && completedActivities === 0) {
            // Se a data agendada já passou e o status ainda é 'agendado', muda para 'atrasado'
            console.log(`Corrigindo status do agendamento na lista: ${schedule.code} para 'overdue'`);
            const updatedSchedule = { ...schedule, status: 'overdue' as const, updatedAt: new Date() };
            await updateInventorySchedule(schedule.id, updatedSchedule);
          }
        }
      });
    }
  }, [schedules, loading, authLoading, updateInventorySchedule]);
  // Carregar nomes dos usuários
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(user => { namesMap[user.id] = user.name; });
        setUserNames(namesMap);
        setAvailableUsers(users);
      } catch (error) { console.error('Erro ao carregar nomes dos usuários:', error); }
    };
    loadUserNames();
  }, []);

  const handleDownloadTemplate = () => {
    const headers = [
      "nome", 
      "codigo", 
      "dataagendada (dd/mm/aaaa hh:mm)", 
      "local", 
      "setor",
      "observacoes",
      "usuario",
      "atividades"
    ];

    const exampleData = [
      "Inventário Mensal - Exemplo",
      "INV-EXEMPLO-001",
      "31/12/2025 08:00",
      "Armazém Principal",
      "Bloco A",
      "Contagem de todos os itens da prateleira A.",
      "Nome Operador Um",
      "Verificar validade dos produtos;Organizar prateleiras;Limpar área de contagem"
    ];

    const csvContent = [headers.join(';'), exampleData.join(';')].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_agendamento_inventario.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsvRow = (row: string, delimiter = ';'): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const handleUploadSchedules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') return;

      const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        alert("Arquivo CSV vazio ou inválido.");
        return;
      }

      const headers = lines[0].split(';').map(h => h.trim());
      const expectedHeaders = ["nome", "codigo", "dataagendada (dd/mm/aaaa hh:mm)", "local", "setor", "observacoes", "usuario", "atividades"]
          .map(h => h.toLowerCase().trim());

      const receivedHeaders = headers.map(h => h.toLowerCase().trim());
      
      // Simple header validation
      const missingHeaders = expectedHeaders.filter(h => !receivedHeaders.includes(h));

      if (missingHeaders.length > 0) {
        alert(`Cabeçalho do CSV inválido. Esperado: ${expectedHeaders.join('; ')}`);
        return;
      }

      const newSchedules: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      const dataRows = lines.slice(1);

      for (const row of dataRows) {
        const values = parseCsvRow(row);
        if (values.length < expectedHeaders.length) {
            console.warn(`Linha do CSV ignorada por ter poucas colunas: "${row}"`);
            continue;
        }
        const [name, code, scheduledDateStr, location, sector, notes, usersStr, activitiesStr] = values;

        // Parse Date
        let scheduledDate = new Date(); // Default to now
        if (scheduledDateStr) {
          const parts = scheduledDateStr.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
          if (parts) {
            const [, day, month, year, hours, minutes] = parts;
            scheduledDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
          } else {
            console.warn(`Formato de data inválido para a linha: "${row}". Usando data atual.`);
          }
        }
        
        // Find user IDs and create roles
        const userNameToAssign = usersStr ? usersStr.trim() : '';
        const assignedUsers: string[] = [];
        const userRoles: Record<string, string> = {};

        const foundUser = availableUsers.find(u => u.name.toLowerCase() === userNameToAssign.toLowerCase());
        if (foundUser) {
          assignedUsers.push(foundUser.id);
          userRoles[foundUser.id] = 'Apontador';
        } else if (userNameToAssign) {
          console.warn(`Usuário "${userNameToAssign}" não encontrado. Será ignorado.`);
        }

        // Parse activities
        const activitiesText = activitiesStr 
          ? activitiesStr.includes(';')
            ? activitiesStr.split(';').map(activity => activity.trim())
            : activitiesStr.split(',').map(activity => activity.trim())
          : [];
        const activityStatus = activitiesText.map(text => ({
          text,
          completed: false,
        }));

        newSchedules.push({
          name, code, scheduledDate, location, sector, notes, assignedUsers, userRoles, 
          activities: activitiesText, // Mantém a lista de textos original
          activityStatus, // Adiciona o status inicializado
          status: 'scheduled',
          expectedProducts: [],
          countedProducts: [], // Garante que a propriedade exista
          createdBy: user?.id || 'csv_import',
        });
      }
      onSchedulesAdd(newSchedules);
      alert(`${newSchedules.length} agendamentos importados com sucesso!`);
    };
    reader.readAsText(file, 'UTF-8'); // Especifica a codificação UTF-8 para ler o arquivo
  };
  const handleExportAllCountedItems = () => {
    // Filtrar apenas inventários concluídos com itens contados
    const completedSchedules = schedules.filter(s => s.status === 'completed' && s.countedProducts.length > 0);
    
    if (completedSchedules.length === 0) {
      alert('Nenhum inventário concluído com itens contados encontrado.');
      return;
    }

    // Preparar dados para exportação
    const exportData: any[] = [];
    
    completedSchedules.forEach(schedule => {
      schedule.countedProducts.forEach(countedItem => {
        const product = products.find(p => p.id === countedItem.productId);
        const expectedProduct = schedule.expectedProducts.find(p => p.productId === countedItem.productId);
        
        exportData.push({
          'Inventário': schedule.name,
          'Código do Inventário': schedule.code,
          'Setor': schedule.sector,
          'Produto': product?.name || 'Produto não encontrado',
          'SKU': product?.sku || 'N/A',
          'Localização': product ? `${product.location.warehouse} - ${product.location.aisle}${product.location.shelf}${product.location.position ? `-${product.location.position}` : ''}` : 'N/A',
          'Unidade': product?.unit || 'UN',
          'Quantidade Contada': countedItem.countedQuantity,
          'Variação': countedItem.variance,
          'Variação (%)': expectedProduct?.expectedQuantity ? ((countedItem.variance / expectedProduct.expectedQuantity) * 100).toFixed(2) + '%' : '0%',
          'Contado Por': getUserName(countedItem.countedBy),
          'Data da Contagem': safeFormatDate(countedItem.countedAt, 'dd/MM/yyyy HH:mm'),
          'Observações': countedItem.notes || '',
          'Valor Unitário (R$)': product?.purchasePrice?.toFixed(2) || '0,00',
          'Valor Total Esperado (R$)': product && expectedProduct ? (expectedProduct.expectedQuantity * product.purchasePrice).toFixed(2) : '0,00',
          'Valor Total Contado (R$)': product ? (countedItem.countedQuantity * product.purchasePrice).toFixed(2) : '0,00',
          'Diferença de Valor (R$)': product ? (countedItem.variance * product.purchasePrice).toFixed(2) : '0,00',
          'Status do Inventário': 'Concluído',
          'Data de Conclusão': schedule.completedAt ? safeFormatDate(schedule.completedAt, 'dd/MM/yyyy HH:mm') : 'N/A'
        });
      });
    });

    // Adicionar linha de resumo geral
    const totalItems = exportData.length;
    const totalExpected = exportData.reduce((sum, item) => sum + (parseFloat(item['Quantidade Esperada']) || 0), 0);
    const totalCounted = exportData.reduce((sum, item) => sum + (parseFloat(item['Quantidade Contada']) || 0), 0);
    const totalVariance = totalCounted - totalExpected;
    const totalExpectedValue = exportData.reduce((sum, item) => sum + (parseFloat(item['Valor Total Esperado (R$)']) || 0), 0);
    const totalCountedValue = exportData.reduce((sum, item) => sum + (parseFloat(item['Valor Total Contado (R$)']) || 0), 0);
    const totalValueVariance = totalCountedValue - totalExpectedValue;

    exportData.push({
      'Inventário': '--- RESUMO GERAL ---',
      'Código do Inventário': `${completedSchedules.length} inventários`,
      'Local': '',
      'Setor': '',
      'Produto': `${totalItems} itens contados`,
      'SKU': '',
      'Localização': '',
      'Unidade': '',
      'Quantidade Contada': totalCounted,
      'Variação': totalVariance,
      'Variação (%)': totalExpected ? ((totalVariance / totalExpected) * 100).toFixed(2) + '%' : '0%',
      'Contado Por': '',
      'Data da Contagem': '',
      'Observações': `Resumo de ${completedSchedules.length} inventários concluídos`, // Fixed typo
      'Valor Unitário (R$)': '',
      'Valor Total Esperado (R$)': totalExpectedValue.toFixed(2),
      'Valor Total Contado (R$)': totalCountedValue.toFixed(2),
      'Diferença de Valor (R$)': totalValueVariance.toFixed(2),
      'Status do Inventário': '',
      'Data de Conclusão': format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })
    });

    // Converter para CSV (compatível com Excel)
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      // Cabeçalho do relatório
      `Relatório Consolidado - Todos os Itens Contados`,
      `Total de Inventários: ${completedSchedules.length}`,
      `Total de Itens: ${totalItems}`,
      `Período: ${completedSchedules.length > 0 ? safeFormatDate(new Date(Math.min(...completedSchedules.map(s => s.scheduledDate.getTime()))), 'dd/MM/yyyy') : ''} a ${completedSchedules.length > 0 ? safeFormatDate(new Date(Math.max(...completedSchedules.map(s => s.scheduledDate.getTime()))), 'dd/MM/yyyy') : ''}`,
      `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      '', // Linha em branco
      // Cabeçalhos das colunas
      headers.join(';'),
      // Dados
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapar valores que contêm ponto e vírgula ou aspas
          return typeof value === 'string' && (value.includes(';') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(';')
      )
    ].join('\n');

    // Criar e baixar arquivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `todos_itens_contados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`Exportados ${totalItems} itens de ${completedSchedules.length} inventários concluídos`);
  };

  const getUserName = (userId: string): string => {
    if (userNames[userId]) {
      return userNames[userId];
    }
    
    // Fallback para nomes conhecidos
    const fallbackNames: Record<string, string> = {
      '1': 'Admin Master',
      'PJ30Q63zDfMqeKnXiomb': 'Renan',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos'
    };
    
    return fallbackNames[userId] || `Usuário ${userId}`;
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'operator':
        return 'Operador';
      case 'viewer':
        return 'Visualizador';
      default:
        return 'Usuário';
    }
  };

  const handleSaveToFirebase = async () => {
    if (!isOnline) {
      alert('Sem conexão com a internet. Verifique sua conexão e tente novamente.');
      return;
    }

    setIsSavingToFirebase(true);
    try {
      await saveAllToFirebase();
      
      // Mostrar feedback visual de sucesso
      setSaveFirebaseMessage('Salvo no Firebase!');
      setSaveFirebaseVariant('success');
      
      setTimeout(() => {
        setSaveFirebaseMessage('Gravar no Firebase');
        setSaveFirebaseVariant('success');
      }, 3000);
      
      console.log('Todos os dados foram salvos no Firebase com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar no Firebase:', error);
      alert('Erro ao salvar dados no Firebase. Tente novamente.');
      
      // Mostrar feedback visual de erro
      setSaveFirebaseMessage('Erro ao salvar!');
      setSaveFirebaseVariant('danger');
      
      setTimeout(() => {
        setSaveFirebaseMessage('Gravar no Firebase');
        setSaveFirebaseVariant('success');
      }, 3000);
    } finally {
      setIsSavingToFirebase(false);
    }
  };
  // Filter schedules
  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = 
      schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.sector.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    const matchesLocation = !locationFilter || schedule.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    // Check user access permissions
    const hasAccess = hasRole('admin') || (user && schedule.assignedUsers.includes(user.id));

    return matchesSearch && matchesStatus && matchesLocation && hasAccess;
  });

  // Sort schedules by date (newest first)
  const sortedSchedules = [...filteredSchedules].sort((a, b) => 
    new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          label: 'Agendado',
          variant: 'info' as const,
          icon: Calendar,
          color: 'text-blue-600'
        };
      case 'in_progress':
        return {
          label: 'Em Andamento',
          variant: 'warning' as const,
          icon: Clock,
          color: 'text-yellow-600'
        };
      case 'completed':
        return {
          label: 'Concluído',
          variant: 'success' as const,
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'overdue':
        return {
          label: 'Atrasado',
          variant: 'danger' as const,
          icon: AlertTriangle,
          color: 'text-red-600'
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          variant: 'danger' as const,
          icon: X,
          color: 'text-red-600'
        };
      default:
        return {
          label: 'Desconhecido',
          variant: 'default' as const,
          icon: AlertTriangle,
          color: 'text-gray-600'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Imagem Icone-sigma.jpg adicionada aqui */}
          <img 
            src="/sigma.png"
            alt="Ícone Sigma" 
            className="w-20 h-20 object-contain"
          />
          <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamento de Inventário / Solicitações</h1>
          <p className="text-gray-600 mt-1">
            Gerencie agendamentos dos inventários e solicitações
          </p>
        </div>
       </div>
          <div className="flex items-center space-x-3">
          {hasRole('admin') && (
            <Button 
              variant="secondary" 
              onClick={onViewReports}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Relatórios</span>
            </Button>
          )}
          {hasRole('admin') && (
            <div className="relative inline-block text-left">
              <div>
                <Button
                  variant="secondary"
                  onClick={() => setIsImportExportOpen(!isImportExportOpen)}
                  className="flex items-center space-x-2"
                >
                  <span>Importar/Exportar</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              {isImportExportOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                    <button
                      onClick={() => { handleDownloadTemplate(); setIsImportExportOpen(false); }}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Baixar Template de Agendamentos
                    </button>
                    <label
                      htmlFor="upload-schedules-input"
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      role="menuitem"
                    >
                      <FileUp className="w-4 h-4 mr-2" />
                      Importar Agendamentos
                      <input
                        id="upload-schedules-input"
                        type="file"
                        accept=".csv"
                        onChange={handleUploadSchedules}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
          <Button variant="secondary" className="hidden flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => onViewCountedItems()}
            className="flex items-center space-x-2"
            disabled={schedules.filter(s => s.status === 'completed' && s.countedProducts.length > 0).length === 0}
          >
            <Eye className="w-4 h-4" />
            <span>Ver Todos os Itens</span>
          </Button>
          {hasRole('admin') && (
            <Button onClick={onAdd} className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </Button>
          )}
        </div>
      </div>

      {/* Access Control Message */}
      {!hasRole('admin') && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Acesso de Visualização
                </p>
                <p className="text-sm text-blue-700">
                  Você pode visualizar agendamentos e participar das contagens, mas apenas administradores podem criar novos agendamentos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Firebase Connection Status */}
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar agendamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="scheduled">Agendado</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluído</option>
              <option value="overdue">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <Input
              placeholder="Filtrar por local..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              icon={<MapPin className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{sortedSchedules.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Agendados</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {sortedSchedules.filter(s => s.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Em Andamento</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {sortedSchedules.filter(s => s.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Concluídos</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {sortedSchedules.filter(s => s.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Atrasados</h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {sortedSchedules.filter(s => s.status === 'overdue').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {sortedSchedules.length} de {schedules.length} agendamentos
        </p>
      </div>

      {/* Schedules List */}
      {sortedSchedules.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              {hasRole('admin') 
                ? 'Tente ajustar os filtros ou crie um novo agendamento.'
                : 'Não há agendamentos disponíveis no momento.'
              }
            </p>
            {hasRole('admin') && (
              <Button onClick={onAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Agendamento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {sortedSchedules.map((schedule) => {
            const getCardClassName = (status: string) => {
              switch (status) {
                case 'scheduled':
                  return 'border-blue-500 bg-blue-100';
                case 'in_progress':
                  return 'border-yellow-500 bg-yellow-50';
                case 'completed':
                  return 'border-green-500 bg-green-50';
                case 'overdue':
                  return 'border-red-500 bg-red-50';
                case 'cancelled':
                  return 'border-gray-400 bg-gray-50';
                default:
                  return 'border-gray-200';
              }
            };
            const cardClassName = getCardClassName(schedule.status);
            return (
              <Card key={schedule.id} hover className={`group border-l-4 ${cardClassName}`}>
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 ">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">{schedule.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">Código: {schedule.code}</p>
                      <ScheduleStatusBadge schedule={schedule} />
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{safeFormatDate(schedule.scheduledDate, "dd/MM/yyyy 'às' HH:mm")}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{schedule.location} - {schedule.sector}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="flex items-center mr-2">
                        {schedule.assignedUsers.length === 0 ? (
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                            <Users className="w-3 h-3 text-gray-400" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-200">
                            {availableUsers.find(u => u.id === schedule.assignedUsers[0])?.avatar ? (
                              <img
                                src={availableUsers.find(u => u.id === schedule.assignedUsers[0])?.avatar}
                                alt={getUserName(schedule.assignedUsers[0])}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center border border-gray-200">
                                <Users className="w-3 h-3 text-gray-400" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <span>
                        {schedule.assignedUsers.length === 0 
                          ? 'Nenhum usuário atribuído'
                          : getUserName(schedule.assignedUsers[0])
                        }
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <ScheduleProgress schedule={schedule} />

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(schedule)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      {hasRole('admin') && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(schedule)}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(schedule.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {(schedule.status === 'scheduled' || schedule.status === 'overdue') && (
                      <Button
                        size="sm"
                        onClick={() => onStartCounting(schedule)}
                        className="flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Iniciar</span>
                      </Button>
                    )}
                    {schedule.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => onStartCounting(schedule)}
                        variant="success"
                        className="flex items-center space-x-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Concluir</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Componente para o Status Badge
function ScheduleStatusBadge({ schedule }: { schedule: InventorySchedule }) {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'overdue': return { label: 'Atrasado', variant: 'danger' as const, icon: AlertTriangle };
      case 'scheduled': return { label: 'Agendado', variant: 'info' as const, icon: Calendar };
      case 'in_progress': return { label: 'Em Andamento', variant: 'warning' as const, icon: Clock };
      case 'completed': return { label: 'Concluído', variant: 'success' as const, icon: CheckCircle };
      case 'cancelled': return { label: 'Cancelado', variant: 'danger' as const, icon: X };
      default: return { label: 'Desconhecido', variant: 'default' as const, icon: AlertTriangle };
    }
  };

  const statusInfo = getStatusInfo(schedule.status);
  return (
    <Badge variant={statusInfo.variant} size="sm">
      <statusInfo.icon className="w-3 h-3 mr-1" />
      {statusInfo.label}
    </Badge>
  );
}

// Componente para a Barra de Progresso
function ScheduleProgress({ schedule }: { schedule: InventorySchedule }) {
  const progress = useInventoryProgress(schedule);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-600">Progresso</span>
        <span className="font-medium text-gray-900">
          {progress.completedActivities}/{progress.totalActivities} ({progress.percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            progress.percentage === 100 ? 'bg-green-500' : progress.percentage > 50 ? 'bg-blue-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
}