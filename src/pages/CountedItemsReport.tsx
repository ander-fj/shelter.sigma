import { useState, useEffect } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { InventorySchedule, Product, InventoryCount } from '../types';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  ArrowLeft,
  Download,
  Search,
  Filter,
  Calendar,
  Package,
  User,
  MapPin,
  BarChart3,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  Printer,
  Clock,
  Building,
  Hash,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { userService } from '../services/userService';
import { safeFormatDate } from '../utils/dateUtils';

// Helper function to safely format dates

interface CountedItemsReportProps {
  onBack: () => void;
}

export function CountedItemsReport({ onBack }: CountedItemsReportProps) {
  const { inventorySchedules = [], products } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [varianceFilter, setVarianceFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Carregar nomes dos usuários
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(user => {
          namesMap[user.id] = user.name;
          namesMap[user.email] = user.name;
        });
        setUserNames(namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };
    
    loadUserNames();
  }, []);

  const getUserName = (userId: string) => {
    if (userNames[userId]) {
      return userNames[userId];
    }
    
    const fallbackNames: Record<string, string> = {
      'PJ30Q63zDfMqeKnXiomb': 'Renan',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      '1': 'Admin Master',
      '2': 'Maria Silva',
      '3': 'João Santos',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos'
    };
    
    return fallbackNames[userId] || `Usuário ${userId}`;
  };

  // Obter todos os itens contados de todos os inventários
  const getAllCountedItems = () => {
    const allCountedItems: Array<{
      schedule: InventorySchedule;
      product: Product | undefined;
      count: InventoryCount;
      expectedQuantity: number;
      variance: number;
      variancePercentage: number;
      valueVariance: number;
    }> = [];

    inventorySchedules
      .filter(schedule => schedule.status === 'completed' && schedule.countedProducts.length > 0)
      .forEach(schedule => {
        schedule.countedProducts.forEach(count => {
          const product = products.find(p => p.id === count.productId);
          const expectedProduct = schedule.expectedProducts.find(p => p.productId === count.productId);
          const expectedQuantity = expectedProduct?.expectedQuantity || 0;
          const variance = count.countedQuantity - expectedQuantity;
          const variancePercentage = expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0;
          const valueVariance = product ? variance * product.purchasePrice : 0;

          allCountedItems.push({
            schedule,
            product,
            count,
            expectedQuantity,
            variance,
            variancePercentage,
            valueVariance
          });
        });
      });

    return allCountedItems;
  };

  const allCountedItems = getAllCountedItems();

  // Filtrar itens
  const filteredItems = allCountedItems.filter(item => {
    const matchesSearch = 
      item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.schedule.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSchedule = !scheduleFilter || item.schedule.id === scheduleFilter;
    const matchesLocation = !locationFilter || item.schedule.location.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesUser = !userFilter || getUserName(item.count.countedBy).toLowerCase().includes(userFilter.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const countDate = new Date(item.count.countedAt);
      matchesDate = countDate.toDateString() === filterDate.toDateString();
    }

    let matchesVariance = true;
    if (varianceFilter !== 'all') {
      if (varianceFilter === 'positive') matchesVariance = item.variance > 0;
      else if (varianceFilter === 'negative') matchesVariance = item.variance < 0;
      else if (varianceFilter === 'zero') matchesVariance = item.variance === 0;
    }

    return matchesSearch && matchesSchedule && matchesLocation && matchesDate && matchesVariance && matchesUser;
  });

  // Ordenar por data de contagem (mais recente primeiro)
  const sortedItems = [...filteredItems].sort((a, b) => 
    new Date(b.count.countedAt).getTime() - new Date(a.count.countedAt).getTime()
  );

  // Obter inventários únicos para filtro
  const uniqueSchedules = Array.from(new Set(
    inventorySchedules
      .filter(s => s.status === 'completed' && s.countedProducts.length > 0)
      .map(s => ({ id: s.id, name: s.name, code: s.code }))
  ));

  // Obter locais únicos
  const uniqueLocations = Array.from(new Set(
    inventorySchedules.map(s => s.location)
  ));

  // Obter usuários únicos que fizeram contagens
  const uniqueCounters = Array.from(new Set(
    allCountedItems.map(item => item.count.countedBy)
  )).map(userId => ({
    id: userId,
    name: getUserName(userId)
  }));

  // Calcular estatísticas
  const stats = {
    totalItems: allCountedItems.length,
    totalSchedules: uniqueSchedules.length,
    positiveVariance: allCountedItems.filter(item => item.variance > 0).length,
    negativeVariance: allCountedItems.filter(item => item.variance < 0).length,
    exactCount: allCountedItems.filter(item => item.variance === 0).length,
    totalExpectedValue: allCountedItems.reduce((sum, item) => 
      sum + (item.expectedQuantity * (item.product?.purchasePrice || 0)), 0),
    totalCountedValue: allCountedItems.reduce((sum, item) => 
      sum + (item.count.countedQuantity * (item.product?.purchasePrice || 0)), 0),
    totalValueVariance: allCountedItems.reduce((sum, item) => sum + item.valueVariance, 0)
  };

  const handleExportAll = () => {
    if (allCountedItems.length === 0) {
      alert('Nenhum item contado encontrado para exportar.');
      return;
    }

    const exportData = allCountedItems.map(item => ({
      'Inventário': item.schedule.name,
      'Código do Inventário': item.schedule.code,
      'Data do Inventário': format(item.schedule.scheduledDate, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Local': item.schedule.location,
      'Setor': item.schedule.sector,
      'Produto': item.product?.name || 'Produto não encontrado',
      'SKU': item.product?.sku || 'N/A',
      'Categoria': item.product?.category?.name || 'N/A',
      'Localização Produto': item.product ? 
        `${item.product.location.warehouse} - ${item.product.location.aisle}${item.product.location.shelf}${item.product.location.position ? `-${item.product.location.position}` : ''}` : 'N/A',
      'Quantidade Esperada': item.expectedQuantity,
      'Unidade': item.product?.unit || 'UN',
      'Quantidade Contada': item.count.countedQuantity,
      'Variação': item.variance,
      'Variação (%)': item.variancePercentage.toFixed(2) + '%',
      'Contado Por': getUserName(item.count.countedBy),
      'Data da Contagem': safeFormatDate(item.count.countedAt, 'dd/MM/yyyy HH:mm'),
      'Validador': item.count.validations && item.count.validations.length > 0 ? 
        item.count.validations
          .filter(v => v.status === 'approved')
          .map(v => `${getUserName(v.validatedBy)} (${v.step === 'counting' ? 'Contador' : v.step === 'Validador_review' ? 'Validador' : v.step})`)
          .join('; ') : 'Sem validação',
      'Data da Validação': item.count.validations && item.count.validations.length > 0 ? 
        item.count.validations
          .filter(v => v.status === 'approved')
          .map(v => safeFormatDate(v.validatedAt, 'dd/MM/yyyy HH:mm'))
          .join('; ') : 'N/A',
      'Observações': item.count.notes || '',
      'Valor Unitário (R$)': item.product?.purchasePrice?.toFixed(2) || '0,00',
      'Valor Total Esperado (R$)': item.product ? (item.expectedQuantity * item.product.purchasePrice).toFixed(2) : '0,00',
      'Valor Total Contado (R$)': item.product ? (item.count.countedQuantity * item.product.purchasePrice).toFixed(2) : '0,00',
      'Diferença de Valor (R$)': item.valueVariance.toFixed(2),
      'Status': item.count.status === 'approved' ? 'Aprovado' : 
                item.count.status === 'rejected' ? 'Rejeitado' : 
                item.count.status === 'validated' ? 'Validado' : 'Contado',
      'Localização da Contagem': item.count.metadata?.location?.address || 'Não disponível',
      'Coordenadas': item.count.metadata?.location ? 
        `${item.count.metadata.location.latitude.toFixed(6)}, ${item.count.metadata.location.longitude.toFixed(6)}` : 'N/A',
      'Dispositivo': item.count.metadata?.deviceInfo?.platform || 'N/A',
      'Navegador': item.count.metadata?.userAgent?.split(' ')[0] || 'N/A'
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      `Relatório Completo de Itens Contados`,
      `Total de Itens: ${allCountedItems.length}`,
      `Total de Inventários: ${stats.totalSchedules}`,
      `Período: ${allCountedItems.length > 0 ? format(new Date(Math.min(...allCountedItems.map(i => i.count.countedAt.getTime()))), 'dd/MM/yyyy') : ''} a ${allCountedItems.length > 0 ? format(new Date(Math.max(...allCountedItems.map(i => i.count.countedAt.getTime()))), 'dd/MM/yyyy') : ''}`,
      `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      `Valor Total Esperado: R$ ${stats.totalExpectedValue.toFixed(2)}`,
      `Valor Total Contado: R$ ${stats.totalCountedValue.toFixed(2)}`,
      `Diferença de Valor: R$ ${stats.totalValueVariance.toFixed(2)}`,
      '',
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_completo_itens_contados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportFiltered = () => {
    if (sortedItems.length === 0) {
      alert('Nenhum item para exportar com os filtros aplicados.');
      return;
    }

    const exportData = sortedItems.map(item => ({
      'Inventário': item.schedule.name,
      'Código do Inventário': item.schedule.code,
      'Data do Inventário': format(item.schedule.scheduledDate, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      'Local': item.schedule.location,
      'Setor': item.schedule.sector,
      'Produto': item.product?.name || 'Produto não encontrado',
      'SKU': item.product?.sku || 'N/A',
      'Categoria': item.product?.category?.name || 'N/A',
      'Localização Produto': item.product ? 
        `${item.product.location.warehouse} - ${item.product.location.aisle}${item.product.location.shelf}${item.product.location.position ? `-${item.product.location.position}` : ''}` : 'N/A',
      'Quantidade Esperada': item.expectedQuantity,
      'Unidade': item.product?.unit || 'UN',
      'Quantidade Contada': item.count.countedQuantity,
      'Variação': item.variance,
      'Variação (%)': item.variancePercentage.toFixed(2) + '%',
      'Contado Por': getUserName(item.count.countedBy),
       'Data da Contagem': safeFormatDate(item.count.countedAt, 'dd/MM/yyyy HH:mm'),
       'Validador': item.count.validations && item.count.validations.length > 0 ? 
         item.count.validations
           .filter(v => v.status === 'approved')
           .map(v => `${getUserName(v.validatedBy)} (${v.step === 'counting' ? 'Contador' : v.step === 'Validador_review' ? 'Validador' : v.step})`)
           .join('; ') : 'Sem validação',
       'Data da Validação': item.count.validations && item.count.validations.length > 0 ? 
         item.count.validations
           .filter(v => v.status === 'approved')
           .map(v => safeFormatDate(v.validatedAt, 'dd/MM/yyyy HH:mm'))
           .join('; ') : 'N/A',
       'Observações': item.count.notes || '',
      'Valor Unitário (R$)': item.product?.purchasePrice?.toFixed(2) || '0,00',
      'Valor Total Esperado (R$)': item.product ? (item.expectedQuantity * item.product.purchasePrice).toFixed(2) : '0,00',
      'Valor Total Contado (R$)': item.product ? (item.count.countedQuantity * item.product.purchasePrice).toFixed(2) : '0,00',
      'Diferença de Valor (R$)': item.valueVariance.toFixed(2),
      'Status': item.count.status === 'approved' ? 'Aprovado' : 
                item.count.status === 'rejected' ? 'Rejeitado' : 
                item.count.status === 'validated' ? 'Validado' : 'Contado',
      'Localização da Contagem': item.count.metadata?.location?.address || 'Não disponível',
      'Coordenadas': item.count.metadata?.location ? 
        `${item.count.metadata.location.latitude.toFixed(6)}, ${item.count.metadata.location.longitude.toFixed(6)}` : 'N/A'
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      `Relatório Filtrado de Itens Contados`,
      `Total de Itens: ${sortedItems.length}`,
      `Filtros Aplicados: ${searchTerm || scheduleFilter || locationFilter || dateFilter || varianceFilter !== 'all' || userFilter ? 'Sim' : 'Não'}`,
      `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      '',
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `itens_contados_filtrados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) return <Badge variant="success" size="sm"><CheckCircle className="w-3 h-3 mr-1" />Exato</Badge>;
    if (variance > 0) return <Badge variant="info" size="sm"><TrendingUp className="w-3 h-3 mr-1" />+{variance}</Badge>;
    return <Badge variant="warning" size="sm"><TrendingDown className="w-3 h-3 mr-1" />{variance}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePrintReport = () => {
    // Create a printable version of the report
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Bloqueador de pop-up detectado. Permita pop-ups para gerar o relatório.');
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Completo de Itens Contados</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              font-size: 12px;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #3B82F6;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #1F2937; 
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .header p { 
              color: #6B7280; 
              margin: 5px 0;
            }
            .stats { 
              display: grid; 
              grid-template-columns: repeat(6, 1fr); 
              gap: 15px; 
              margin-bottom: 30px;
            }
            .stat-card { 
              background: #F9FAFB; 
              padding: 15px; 
              border-radius: 8px; 
              text-align: center;
              border: 1px solid #E5E7EB;
            }
            .stat-card h3 { 
              margin: 0 0 5px 0; 
              font-size: 18px; 
              font-weight: bold;
            }
            .stat-card p { 
              margin: 0; 
              color: #6B7280; 
              font-size: 11px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px;
              font-size: 10px;
            }
            th, td { 
              border: 1px solid #E5E7EB; 
              padding: 8px; 
              text-align: left;
            }
            th { 
              background-color: #F3F4F6; 
              font-weight: bold;
              color: #374151;
            }
            tr:nth-child(even) { 
              background-color: #F9FAFB; 
            }
            .positive { color: #059669; font-weight: bold; }
            .negative { color: #DC2626; font-weight: bold; }
            .zero { color: #059669; font-weight: bold; }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #6B7280;
              font-size: 10px;
              border-top: 1px solid #E5E7EB;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📋 Relatório Completo de Itens Contados</h1>
            <p><strong>MRS-SIGMA</strong> - Sistema Integrado de Gestão de Materiais e Ativos</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Total de itens analisados: <strong>${stats.totalItems}</strong> | Inventários: <strong>${stats.totalSchedules}</strong></p>
          </div>

          <div class="stats">
            <div class="stat-card">
              <h3>${stats.totalItems}</h3>
              <p>Total de Itens</p>
            </div>
            <div class="stat-card">
              <h3>${stats.totalSchedules}</h3>
              <p>Inventários</p>
            </div>
            <div class="stat-card">
              <h3 class="positive">${stats.exactCount}</h3>
              <p>Contagens Exatas</p>
            </div>
            <div class="stat-card">
              <h3 class="positive">${stats.positiveVariance}</h3>
              <p>Sobras (+)</p>
            </div>
            <div class="stat-card">
              <h3 class="negative">${stats.negativeVariance}</h3>
              <p>Faltas (-)</p>
            </div>
            <div class="stat-card">
              <h3 class="${getVarianceColor(stats.totalValueVariance).replace('text-', '')}">${formatCurrency(stats.totalValueVariance)}</h3>
              <p>Diferença Valor</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Inventário</th>
                <th>Local</th>
                <th>Esperado</th>
                <th>Contado</th>
                <th>Variação</th>
                <th>Valor Unit.</th>
                <th>Responsável</th>
                <th>Data Contagem</th>
              </tr>
            </thead>
            <tbody>
              ${sortedItems.map(item => `
                <tr>
                  <td>${item.product?.name || 'Produto não encontrado'}</td>
                  <td>${item.product?.sku || 'N/A'}</td>
                  <td>${item.schedule.name}</td>
                  <td>${item.schedule.location} - ${item.schedule.sector}</td>
                  <td>${item.expectedQuantity} ${item.product?.unit || 'UN'}</td>
                  <td>${item.count.countedQuantity} ${item.product?.unit || 'UN'}</td>
                  <td class="${item.variance === 0 ? 'zero' : item.variance > 0 ? 'positive' : 'negative'}">
                    ${item.variance > 0 ? '+' : ''}${item.variance} (${item.variancePercentage.toFixed(1)}%)
                  </td>
                  <td>${formatCurrency(item.product?.purchasePrice || 0)}</td>
                  <td>${getUserName(item.count.countedBy)}</td>
                  <td>${safeFormatDate(item.count.countedAt, 'dd/MM/yyyy HH:mm')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Resumo Financeiro:</strong></p>
            <p>Valor Total Esperado: <strong>${formatCurrency(stats.totalExpectedValue)}</strong> | 
               Valor Total Contado: <strong>${formatCurrency(stats.totalCountedValue)}</strong> | 
               Diferença: <strong>${formatCurrency(stats.totalValueVariance)}</strong></p>
            <p>Relatório gerado pelo sistema MRS-SIGMA em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório Completo de Itens Contados</h1>
            <p className="text-gray-600">Visualize todos os itens contados nos inventários concluídos</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            onClick={handlePrintReport}
            className="flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Itens</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inventários</p>
                <p className="text-xl font-bold text-purple-900">{stats.totalSchedules}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Contagens Exatas</p>
                <p className="text-xl font-bold text-green-600">{stats.exactCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Sobras</p>
                <p className="text-xl font-bold text-blue-600">{stats.positiveVariance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Faltas</p>
                <p className="text-xl font-bold text-red-600">{stats.negativeVariance}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <BarChart3 className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Diferença Valor</p>
                <p className={`text-lg font-bold ${getVarianceColor(stats.totalValueVariance)}`}>
                  {formatCurrency(stats.totalValueVariance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os inventários</option>
              {uniqueSchedules.map(schedule => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.name}
                </option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os locais</option>
              {uniqueLocations.map(location => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os usuários</option>
              {uniqueCounters.map(counter => (
                <option key={counter.id} value={counter.name}>
                  {counter.name}
                </option>
              ))}
            </select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            <select
              value={varianceFilter}
              onChange={(e) => setVarianceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as variações</option>
              <option value="zero">Contagens exatas</option>
              <option value="positive">Sobras (+)</option>
              <option value="negative">Faltas (-)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {sortedItems.length} de {allCountedItems.length} itens contados
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Items Display */}
      {sortedItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum item contado encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar os filtros ou aguarde a conclusão de inventários.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedItems.map((item, index) => (
            <Card key={`${item.schedule.id}-${item.count.id}-${index}`} hover className="group">
              <CardContent className="p-6">
                {/* Product Header */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {item.product?.images[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {item.product?.name || 'Produto não encontrado'}
                    </h3>
                    <p className="text-sm text-gray-600">SKU: {item.product?.sku || 'N/A'}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getVarianceBadge(item.variance)}
                    </div>
                  </div>
                </div>

                {/* Inventory Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{item.schedule.name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{item.schedule.location} - {item.schedule.sector}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    <span>{getUserName(item.count.countedBy)}</span>
                  </div>
                </div>

                {/* Counting Data */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Esperado</p>
                    <p className="text-lg font-bold text-gray-900">
                      {item.expectedQuantity}
                    </p>
                    <p className="text-xs text-gray-500">{item.product?.unit}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">Contado</p>
                    <p className="text-lg font-bold text-blue-900">
                      {item.count.countedQuantity}
                    </p>
                    <p className="text-xs text-blue-500">{item.product?.unit}</p>
                  </div>
                </div>

                {/* Variance */}
                <div className="text-center p-3 bg-gray-100 rounded-lg mb-4">
                  <p className="text-xs text-gray-600">Variação</p>
                  <p className={`text-xl font-bold ${getVarianceColor(item.variance)}`}>
                    {item.variance > 0 ? '+' : ''}{item.variance}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.variancePercentage.toFixed(1)}%
                  </p>
                </div>

                {/* Timestamp */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Contado em {safeFormatDate(item.count.countedAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Itens Contados
              </h3>
              <Button 
                variant="success" 
                onClick={handleExportFiltered}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={sortedItems.length === 0}
              >
                <Download className="w-4 h-4" />
                <span>Exportar Tabela para Excel</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inventário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Local
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Esperado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endereço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedItems.map((item, index) => (
                    <tr key={`${item.schedule.id}-${item.count.id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg mr-3 overflow-hidden">
                            {item.product?.images[0] ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.product?.name || 'Produto não encontrado'}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {item.product?.sku || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.product?.category?.name || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.schedule.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.schedule.code}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.schedule.location}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.schedule.sector}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.expectedQuantity} {item.product?.unit || 'UN'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.count.countedQuantity} {item.product?.unit || 'UN'}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          {getVarianceBadge(item.variance)}
                          <span className={`text-xs ${getVarianceColor(item.variance)}`}>
                            ({item.variancePercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(item.product?.purchasePrice || 0)}
                        </div>
                        <div className={`text-xs font-medium ${getVarianceColor(item.valueVariance)}`}>
                          Dif: {formatCurrency(item.valueVariance)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900">
                            {getUserName(item.count.countedBy)}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {item.count.validations && item.count.validations.length > 0 ? (
                            item.count.validations
                              .filter(v => v.status === 'approved')
                              .map((validation, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <div className="flex items-center space-x-1">
                                    <Shield className="w-3 h-3 text-green-600" />
                                    <span className="text-sm text-gray-900">
                                      {getUserName(validation.validatedBy)}
                                    </span>
                                  </div>
                                  <Badge variant="success" size="sm">
                                    {validation.step === 'counting' ? 'Contador' : 
                                     validation.step === 'Validador_review' ? 'Validador' : 
                                     validation.step}
                                  </Badge>
                                </div>
                              ))
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-500">Sem validação</span>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="text-sm text-gray-900 max-w-xs">
                            {item.count.metadata?.location?.address ? (
                              <div className="text-sm text-gray-900" title={`Coordenadas: ${item.count.metadata.location.latitude?.toFixed(6)}, ${item.count.metadata.location.longitude?.toFixed(6)}`}>
                                {item.count.metadata.location.address}
                              </div>
                            ) : item.count.metadata?.location?.latitude && item.count.metadata?.location?.longitude ? (
                              <div className="text-sm text-gray-900">
                                {item.count.metadata.location.latitude.toFixed(6)}, {item.count.metadata.location.longitude.toFixed(6)}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">
                                Não disponível
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(item.count.countedAt, "dd/MM/yyyy")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(item.count.countedAt, "HH:mm")}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Value Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <h3 className="text-lg font-semibold text-purple-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Resumo Financeiro dos Itens Filtrados
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-purple-600 font-medium">Valor Esperado</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(sortedItems.reduce((sum, item) => 
                  sum + (item.expectedQuantity * (item.product?.purchasePrice || 0)), 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600 font-medium">Valor Contado</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(sortedItems.reduce((sum, item) => 
                  sum + (item.count.countedQuantity * (item.product?.purchasePrice || 0)), 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600 font-medium">Diferença de Valor</p>
              <p className={`text-2xl font-bold ${getVarianceColor(sortedItems.reduce((sum, item) => sum + item.valueVariance, 0))}`}>
                {formatCurrency(sortedItems.reduce((sum, item) => sum + item.valueVariance, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600 font-medium">Itens Filtrados</p>
              <p className="text-2xl font-bold text-purple-900">
                {sortedItems.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}