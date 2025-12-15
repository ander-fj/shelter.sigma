import { useState, useMemo, useCallback } from 'react';
import { useEffect } from 'react';
import { InventorySchedule, Product, InventoryReport } from '../../types';
import { useInventory } from '../../contexts/InventoryContext';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { useUsers } from '../../hooks/useUsers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  ArrowLeft,
  Search,
  Filter,
  Download,
  BarChart3,
  Calendar,
  MapPin,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InventoryReportsProps {
  schedules: InventorySchedule[];
  products: Product[];
  onBack: () => void;
}

export function InventoryReports({ 
  schedules, 
  products, 
  onBack 
}: InventoryReportsProps) {
  const { getUserName } = useUsers();
  const { updateProduct } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState<InventorySchedule | null>(null);
  const [isAcceptingInventory, setIsAcceptingInventory] = useState(false);

  // Custom hook for managing state with localStorage
  const useLocalStorageState = <T,>(key: string, defaultValue: T): [T, (value: T) => void] => {
    const [state, setState] = useState<T>(() => {
      try {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : defaultValue;
      } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
        return defaultValue;
      }
    });

    useEffect(() => {
      localStorage.setItem(key, JSON.stringify(state));
    }, [key, state]);

    return [state, setState];
  };

  const [acceptedInventories, setAcceptedInventories] = useLocalStorageState<string[]>('accepted_inventories', []);

  const handleExportCountedItemsToExcel = () => {
    if (!selectedSchedule) return;

    const report = generateReport(selectedSchedule);
    
    // Preparar dados dos itens contados para exportação
    const exportData = report.countedItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      const expectedProduct = selectedSchedule.expectedProducts.find(p => p.productId === item.productId);
      
      return {
        'Produto': product?.name || 'Produto não encontrado',
        'SKU': product?.sku || 'N/A',
        'Categoria': product?.category.name || 'N/A',
        'Localização': product ? `${product.location.warehouse} - ${product.location.aisle}${product.location.shelf}${product.location.position ? `-${product.location.position}` : ''}` : 'N/A',
        'Quantidade Esperada': expectedProduct?.expectedQuantity || 0,
        'Unidade': product?.unit || 'UN',
        'Quantidade Contada': item.countedQuantity,
        'Variação': item.variance,
        'Variação (%)': expectedProduct?.expectedQuantity ? ((item.variance / expectedProduct.expectedQuantity) * 100).toFixed(2) + '%' : '0%',
        'Contado Por': getUserName(item.countedBy),
        'Data da Contagem': format(item.countedAt, 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        'Observações': item.notes || '',
        'Valor Unitário (R$)': product?.purchasePrice?.toFixed(2) || '0,00',
        'Valor Total Esperado (R$)': product && expectedProduct ? (expectedProduct.expectedQuantity * product.purchasePrice).toFixed(2) : '0,00',
        'Valor Total Contado (R$)': product ? (item.countedQuantity * product.purchasePrice).toFixed(2) : '0,00',
        'Diferença de Valor (R$)': product ? (item.variance * product.purchasePrice).toFixed(2) : '0,00'
      };
    });

    // Adicionar linha de resumo
    const totalExpected = report.countedItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const expectedProduct = selectedSchedule.expectedProducts.find(p => p.productId === item.productId);
      return sum + (expectedProduct?.expectedQuantity || 0);
    }, 0);

    const totalCounted = report.countedItems.reduce((sum, item) => sum + item.countedQuantity, 0);
    const totalVariance = totalCounted - totalExpected;

    exportData.push({
      'Produto': '--- RESUMO ---',
      'SKU': '',
      'Categoria': '',
      'Localização': '',
      'Quantidade Esperada': totalExpected,
      'Unidade': '',
      'Quantidade Contada': totalCounted,
      'Variação': totalVariance,
      'Variação (%)': totalExpected ? ((totalVariance / totalExpected) * 100).toFixed(2) + '%' : '0%',
      'Contado Por': '',
      'Data da Contagem': '',
      'Observações': `Total de ${report.countedItems.length} itens contados`,
      'Valor Unitário (R$)': '',
      'Valor Total Esperado (R$)': formatCurrency(report.totalExpectedValue).replace('R$', '').trim(),
      'Valor Total Contado (R$)': formatCurrency(report.totalCountedValue).replace('R$', '').trim(),
      'Diferença de Valor (R$)': formatCurrency(Math.abs(report.variance)).replace('R$', '').trim()
    });

    // Converter para CSV (compatível com Excel)
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      // Cabeçalho do relatório
      `Relatório de Inventário - Itens Contados`,
      `Inventário: ${selectedSchedule.name}`,
      `Código: ${selectedSchedule.code}`,
      `Data: ${format(selectedSchedule.scheduledDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      `Local: ${selectedSchedule.location} - ${selectedSchedule.sector}`,
      `Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      '', // Linha em branco
      // Cabeçalhos das colunas
      headers.join(','),
      // Dados
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapar valores que contêm vírgulas ou aspas
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // Criar e baixar arquivo
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_itens_contados_${selectedSchedule.code}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAcceptInventory = async (schedule: InventorySchedule) => {
    if (!window.confirm('Tem certeza que deseja aceitar este inventário? Esta ação irá atualizar os estoques dos produtos e não pode ser desfeita.')) {
      return;
    }

    setIsAcceptingInventory(true);
    try {
      // Aplicar as contagens aos produtos
      for (const countedItem of schedule.countedProducts) {
        const product = products.find(p => p.id === countedItem.productId);
        if (product) {
          // Atualizar o estoque do produto com a quantidade contada
          await updateProduct(product.id, {
            currentStock: countedItem.countedQuantity,
            updatedAt: new Date()
          });
        }
      }

      // Produtos não encontrados (não contados) ficam com estoque 0
      const notFoundProducts = schedule.expectedProducts.filter(expectedProduct => 
        !schedule.countedProducts.find(counted => counted.productId === expectedProduct.productId)
      );

      for (const notFoundProduct of notFoundProducts) {
        const product = products.find(p => p.id === notFoundProduct.productId);
        if (product) {
          await updateProduct(product.id, {
            currentStock: 0,
            updatedAt: new Date()
          });
        }
      }

      alert('Inventário aceito com sucesso! Os estoques dos produtos foram atualizados.');
      
      // Marcar este inventário como aceito
      setAcceptedInventories([...acceptedInventories, schedule.id]);
      
      // Voltar para a lista de relatórios
      setSelectedSchedule(null);
    } catch (error) {
      console.error('Erro ao aceitar inventário:', error);
      alert('Erro ao aceitar inventário. Tente novamente.');
    } finally {
      setIsAcceptingInventory(false);
    }
  };

  const handleExportToPDF = () => {
    if (!selectedSchedule) return;

    const report = generateReport(selectedSchedule);
    
    // Criar conteúdo HTML para o PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Inventário - ${selectedSchedule.code}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
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
            margin: 0;
            font-size: 24px;
          }
          .header p {
            color: #6B7280;
            margin: 5px 0;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 30px 0;
          }
          .summary-card {
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            background: #F9FAFB;
          }
          .summary-card h3 {
            margin: 0 0 10px 0;
            color: #6B7280;
            font-size: 14px;
            font-weight: normal;
          }
          .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            margin: 0;
          }
          .value.blue { color: #3B82F6; }
          .value.green { color: #10B981; }
          .value.red { color: #EF4444; }
          .value.gray { color: #6B7280; }
          .section {
            margin: 40px 0;
          }
          .section h2 {
            color: #1F2937;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .values-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin: 30px 0;
            text-align: center;
          }
          .values-grid .item h3 {
            color: #6B7280;
            margin: 0 0 10px 0;
            font-size: 14px;
          }
          .values-grid .item .amount {
            font-size: 24px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #E5E7EB;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #F9FAFB;
            font-weight: bold;
            color: #374151;
          }
          tr:nth-child(even) {
            background-color: #F9FAFB;
          }
          .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge.success { background: #D1FAE5; color: #065F46; }
          .badge.warning { background: #FEF3C7; color: #92400E; }
          .badge.info { background: #DBEAFE; color: #1E40AF; }
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Inventário</h1>
          <p><strong>${selectedSchedule.name}</strong></p>
          <p>Código: ${selectedSchedule.code}</p>
          <p>Data: ${format(selectedSchedule.scheduledDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
          <p>Local: ${selectedSchedule.location} - ${selectedSchedule.sector}</p>
          <p>Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <h3>Total de Produtos</h3>
            <p class="value blue">${report.totalProducts}</p>
          </div>
          <div class="summary-card">
            <h3>Produtos Contados</h3>
            <p class="value green">${report.countedProducts}</p>
          </div>
          <div class="summary-card">
            <h3>Não Encontrados</h3>
            <p class="value red">${report.notFoundProducts}</p>
          </div>
          <div class="summary-card">
            <h3>% Inventariado</h3>
            <p class="value blue">${report.inventoryPercentage}%</p>
          </div>
        </div>

        <div class="section">
          <h2>Análise de Valores</h2>
          <div class="values-grid">
            <div class="item">
              <h3>Valor Esperado</h3>
              <p class="amount gray">${formatCurrency(report.totalExpectedValue)}</p>
            </div>
            <div class="item">
              <h3>Valor Contado</h3>
              <p class="amount blue">${formatCurrency(report.totalCountedValue)}</p>
            </div>
            <div class="item">
              <h3>Variação</h3>
              <p class="amount ${report.variance >= 0 ? 'green' : 'red'}">${formatCurrency(Math.abs(report.variance))}</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Itens Contados</h2>
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Esperado</th>
                <th>Contado</th>
                <th>Variação</th>
                <th>Contado Por</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${report.countedItems.map(item => {
                const product = products.find(p => p.id === item.productId);
                const expectedProduct = selectedSchedule.expectedProducts.find(p => p.productId === item.productId);
                const badgeClass = item.variance === 0 ? 'success' : item.variance > 0 ? 'info' : 'warning';
                
                return `
                  <tr>
                    <td>${product?.name || 'Produto não encontrado'}</td>
                    <td>${product?.sku || 'N/A'}</td>
                    <td>${expectedProduct?.expectedQuantity || 0} ${product?.unit || 'UN'}</td>
                    <td>${item.countedQuantity} ${product?.unit || 'UN'}</td>
                    <td><span class="badge ${badgeClass}">${item.variance > 0 ? '+' : ''}${item.variance}</span></td>
                    <td>${getUserName(item.countedBy)}</td>
                    <td>${format(item.countedAt, 'dd/MM/yyyy HH:mm')}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${report.notFoundItems.length > 0 ? `
          <div class="section">
            <h2 style="color: #EF4444;">Itens Não Encontrados</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Quantidade Esperada</th>
                  <th>Localização</th>
                </tr>
              </thead>
              <tbody>
                ${report.notFoundItems.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return `
                    <tr>
                      <td>${product?.name || 'Produto não encontrado'}</td>
                      <td>${product?.sku || 'N/A'}</td>
                      <td>${item.expectedQuantity} ${product?.unit || 'UN'}</td>
                      <td>${product?.location.warehouse} - ${product?.location.aisle}${product?.location.shelf}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer">
          <p>Sistema de Gestão de Inventário - Shelter</p>
          <p>Relatório gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
        </div>
      </body>
      </html>
    `;

    // Criar nova janela para impressão/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Aguardar carregamento e abrir diálogo de impressão
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      alert('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.');
    }
  };
  const generateReport = useCallback((schedule: InventorySchedule): InventoryReport => {
    const totalProducts = schedule.expectedProducts.length;
    const countedProducts = schedule.countedProducts.length;
    const notFoundProducts = totalProducts - countedProducts;
    const inventoryPercentage = totalProducts > 0 ? (countedProducts / totalProducts) * 100 : 0;

    // Calculate values
    let totalExpectedValue = 0;
    let totalCountedValue = 0;

    schedule.expectedProducts.forEach(expectedProduct => {
      const product = products.find(p => p.id === expectedProduct.productId);
      if (product) {
        totalExpectedValue += expectedProduct.expectedQuantity * product.purchasePrice;
      }
    });

    schedule.countedProducts.forEach(countedProduct => {
      const product = products.find(p => p.id === countedProduct.productId);
      if (product) {
        totalCountedValue += countedProduct.countedQuantity * product.purchasePrice;
      }
    });

    const variance = totalCountedValue - totalExpectedValue;

    // Get not found items
    const notFoundItems = schedule.expectedProducts.filter(expectedProduct => 
      !schedule.countedProducts.find(counted => counted.productId === expectedProduct.productId)
    );

    return {
      scheduleId: schedule.id,
      totalProducts,
      countedProducts,
      notFoundProducts,
      inventoryPercentage: Math.round(inventoryPercentage),
      totalExpectedValue,
      totalCountedValue,
      variance,
      countedItems: schedule.countedProducts,
      notFoundItems
    };
  }, [products]);

  // Filter schedules
  const filteredSchedules = useMemo(() => schedules.filter(schedule => {
    const matchesSearch = 
      schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      schedule.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || schedule.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const scheduleDate = new Date(schedule.scheduledDate);
      matchesDate = scheduleDate.toDateString() === filterDate.toDateString();
    }

    return matchesSearch && matchesStatus && matchesDate;
  }), [schedules, searchTerm, statusFilter, dateFilter]);

  const completedSchedules = useMemo(() => filteredSchedules.filter(s => s.status === 'completed'), [filteredSchedules]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Concluído', variant: 'success' as const, icon: CheckCircle };
      case 'in_progress':
        return { label: 'Em Andamento', variant: 'warning' as const, icon: BarChart3 };
      case 'scheduled':
        return { label: 'Agendado', variant: 'info' as const, icon: Calendar };
      case 'overdue':
        return { label: 'Atrasado', variant: 'danger' as const, icon: AlertTriangle };
      case 'cancelled':
        return { label: 'Cancelado', variant: 'danger' as const, icon: AlertTriangle };
      default:
        return { label: 'Desconhecido', variant: 'default' as const, icon: AlertTriangle };
    }
  };

  if (selectedSchedule) {
    const report = useMemo(() => generateReport(selectedSchedule), [selectedSchedule, generateReport]);
    const isAlreadyAccepted = useMemo(() => acceptedInventories.includes(selectedSchedule.id), [acceptedInventories, selectedSchedule.id]);
    
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => setSelectedSchedule(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Relatórios
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Relatório de Inventário</h1>
              <p className="text-gray-600">{selectedSchedule.name} - {selectedSchedule.code}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="secondary" 
              onClick={handleExportToPDF}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Relatório (PDF)</span>
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleExportCountedItemsToExcel}
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Exportar Itens Contados (Excel)</span>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Produtos</p>
                  <p className="text-2xl font-bold text-gray-900">{report.totalProducts}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Produtos Contados</p>
                  <p className="text-2xl font-bold text-green-600">{report.countedProducts}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Não Encontrados</p>
                  <p className="text-2xl font-bold text-red-600">{report.notFoundProducts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">% Inventariado</p>
                  <p className="text-2xl font-bold text-blue-600">{report.inventoryPercentage}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Value Analysis */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Análise de Valores</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Valor Esperado</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(report.totalExpectedValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Valor Contado</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(report.totalCountedValue)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Variação</p>
                <div className="flex items-center justify-center space-x-2">
                  {report.variance >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`text-xl font-bold ${report.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(report.variance))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Counted Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Itens Contados</h3>
              {selectedSchedule.status === 'completed' && (
                <div className="flex items-center space-x-3">
                  {isAlreadyAccepted && (
                    <div className="flex items-center space-x-2 text-green-700 bg-green-100 px-3 py-2 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Inventário já aceito - Produtos atualizados</span>
                    </div>
                  )}
                  <Button
                    onClick={() => handleAcceptInventory(selectedSchedule)}
                    loading={isAcceptingInventory}
                    disabled={isAlreadyAccepted || isAcceptingInventory}
                    className={`flex items-center space-x-2 ${
                      isAlreadyAccepted 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{isAlreadyAccepted ? 'Inventário Aceito' : 'Aceitar Inventário'}</span>
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Esperado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variação
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contado Por
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.countedItems.map((item) => {
                    const product = products.find(p => p.id === item.productId);
                    const expectedProduct = selectedSchedule.expectedProducts.find(p => p.productId === item.productId);
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {product?.name || 'Produto não encontrado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            SKU: {product?.sku}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {expectedProduct?.expectedQuantity || 0} {product?.unit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.countedQuantity} {product?.unit}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge 
                            variant={item.variance === 0 ? 'success' : item.variance > 0 ? 'info' : 'warning'}
                            size="sm"
                          >
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getUserName(item.countedBy)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Not Found Items */}
        {report.notFoundItems.length > 0 && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 text-red-600">Itens Não Encontrados</h3>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-red-50 border-b border-red-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">
                        Quantidade Esperada
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">
                        Localização
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.notFoundItems.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      
                      return (
                        <tr key={item.productId} className="hover:bg-red-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {product?.name || 'Produto não encontrado'}
                            </div>
                            <div className="text-sm text-gray-500">
                              SKU: {product?.sku}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.expectedQuantity} {product?.unit}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product?.location.warehouse} - {product?.location.aisle}{product?.location.shelf}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios de Inventário</h1>
            <p className="text-gray-600">Histórico e análise de inventários realizados</p>
          </div>
        </div>
        <Button variant="secondary" className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Exportar Todos</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar inventários..."
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
              <option value="completed">Concluído</option>
              <option value="in_progress">Em Andamento</option>
              <option value="scheduled">Agendado</option>
              <option value="overdue">Atrasado</option>
              <option value="cancelled">Cancelado</option>
            </select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Inventários</p>
                <p className="text-2xl font-bold text-gray-900">{filteredSchedules.length}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-green-600">{completedSchedules.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredSchedules.filter(s => s.status === 'in_progress').length}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredSchedules.length > 0 
                    ? Math.round((completedSchedules.length / filteredSchedules.length) * 100)
                    : 0
                  }%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Value Analysis Section */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Análise de Valores
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-600 mb-2">Valor Total dos Inventários</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(
                  completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.totalExpectedValue;
                  }, 0)
                )}
              </p>
              <p className="text-xs text-blue-600 mt-1">Valor esperado total</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-600 mb-2">Valor Contado</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(
                  completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.totalCountedValue;
                  }, 0)
                )}
              </p>
              <p className="text-xs text-green-600 mt-1">Valor real contado</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-600 mb-2">Variação Total</p>
              <div className="flex items-center justify-center space-x-2">
                {(() => {
                  const totalVariance = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.variance;
                  }, 0);
                  return (
                    <>
                      {totalVariance >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        {formatCurrency(Math.abs(totalVariance))}
                      </p>
                    </>
                  );
                })()}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {(() => {
                  const totalExpected = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.totalExpectedValue;
                  }, 0);
                  const totalVariance = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.variance;
                  }, 0);
                  const percentage = totalExpected > 0 ? ((totalVariance / totalExpected) * 100).toFixed(2) : '0.00';
                  return `${totalVariance >= 0 ? '+' : ''}${percentage}% do esperado`;
                })()}
              </p>
            </div>
          </div>
          
          {/* Detailed Analysis */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Resumo Financeiro</h4>
              <div className="space-y-3">
                {(() => {
                  const totalExpected = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.totalExpectedValue;
                  }, 0);
                  const totalCounted = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.totalCountedValue;
                  }, 0);
                  const totalVariance = totalCounted - totalExpected;
                  const accuracy = totalExpected > 0 ? ((totalCounted / totalExpected) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Precisão do Inventário</span>
                        <span className={`font-semibold ${
                          parseFloat(accuracy) >= 95 ? 'text-green-600' : 
                          parseFloat(accuracy) >= 90 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {accuracy}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total de Inventários</span>
                        <span className="font-semibold text-gray-900">{completedSchedules.length}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Itens Inventariados</span>
                        <span className="font-semibold text-gray-900">
                          {completedSchedules.reduce((total, schedule) => {
                            const report = generateReport(schedule);
                            return total + report.countedProducts;
                          }, 0)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Média por Inventário</span>
                        <span className="font-semibold text-gray-900">
                          {completedSchedules.length > 0 ? 
                            formatCurrency(totalExpected / completedSchedules.length) : 
                            formatCurrency(0)
                          }
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Indicadores de Performance</h4>
              <div className="space-y-3">
                {(() => {
                  const totalProducts = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.totalProducts;
                  }, 0);
                  const totalCounted = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.countedProducts;
                  }, 0);
                  const totalNotFound = completedSchedules.reduce((total, schedule) => {
                    const report = generateReport(schedule);
                    return total + report.notFoundProducts;
                  }, 0);
                  const completionRate = totalProducts > 0 ? ((totalCounted / totalProducts) * 100).toFixed(1) : '0.0';
                  const notFoundRate = totalProducts > 0 ? ((totalNotFound / totalProducts) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Taxa de Conclusão</span>
                        <span className={`font-semibold ${
                          parseFloat(completionRate) >= 95 ? 'text-green-600' : 
                          parseFloat(completionRate) >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {completionRate}%
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Itens Não Encontrados</span>
                        <span className={`font-semibold ${
                          parseFloat(notFoundRate) <= 5 ? 'text-green-600' : 
                          parseFloat(notFoundRate) <= 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {totalNotFound} ({notFoundRate}%)
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Eficiência Geral</span>
                        <span className={`font-semibold ${
                          parseFloat(completionRate) >= 95 && parseFloat(notFoundRate) <= 5 ? 'text-green-600' : 
                          parseFloat(completionRate) >= 80 && parseFloat(notFoundRate) <= 10 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {parseFloat(completionRate) >= 95 && parseFloat(notFoundRate) <= 5 ? 'Excelente' :
                           parseFloat(completionRate) >= 80 && parseFloat(notFoundRate) <= 10 ? 'Boa' : 'Precisa Melhorar'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Último Inventário</span>
                        <span className="font-semibold text-gray-900">
                          {completedSchedules.length > 0 ? 
                            format(
                              new Date(Math.max(...completedSchedules.map(s => s.scheduledDate.getTime()))), 
                              'dd/MM/yyyy'
                            ) : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedules List */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Histórico de Inventários</h3>
        </CardHeader>
        <CardContent>
          {filteredSchedules.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum inventário encontrado
              </h3>
              <p className="text-gray-600">
                Tente ajustar os filtros ou aguarde novos inventários serem realizados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inventário
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Local
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSchedules.map((schedule) => {
                    const statusInfo = getStatusInfo(schedule.status);
                    const report = generateReport(schedule);
                    
                    return (
                      <tr key={schedule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {schedule.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {schedule.code}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(schedule.scheduledDate, "dd/MM/yyyy")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(schedule.scheduledDate, "HH:mm")}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm text-gray-900">{schedule.location}</div>
                              <div className="text-sm text-gray-500">{schedule.sector}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={statusInfo.variant} size="sm">
                            <statusInfo.icon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {report.countedProducts}/{report.totalProducts} ({report.inventoryPercentage}%)
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                report.inventoryPercentage === 100
                                  ? 'bg-green-500'
                                  : report.inventoryPercentage > 50
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${report.inventoryPercentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSchedule(schedule)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Ver Relatório
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}