import { useState, useEffect } from 'react';
import { Product, Category, Supplier } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ExcelImport } from './ExcelImport';
import { StockCorrectionModal } from './StockCorrectionModal';
import { useInventory } from '../../contexts/InventoryContext';
import { Search, Filter, CreditCard as Edit, Trash2, Eye, Package, MapPin, Plus, Download, Upload, Grid2x2 as Grid, List, Import as SortAsc, Dessert as SortDesc, AlertTriangle, CheckCircle, DollarSign, BarChart3, RefreshCw, Calculator, FileSpreadsheet, Save, Cloud } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductListProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onView: (product: Product) => void;
  onDelete: (productId: string) => void;
  onImport: (products: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  loading?: boolean;
}

export function ProductList({ 
  products, 
  categories, 
  suppliers, 
  onAdd, 
  onEdit, 
  onView, 
  onDelete, 
  onImport,
  loading = false 
}: ProductListProps) {
  const { movements, saveAllToFirebase, isOnline } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'stock' | 'value'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showStockCorrection, setShowStockCorrection] = useState(false);
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);
  const [saveFirebaseMessage, setSaveFirebaseMessage] = useState('Gravar no Firebase');
  const [saveFirebaseVariant, setSaveFirebaseVariant] = useState<'success' | 'danger' | 'default'>('success');

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

  const handleProductsUpdated = () => {
    // Forçar recarregamento da página para mostrar os dados atualizados
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category.id === selectedCategory;
    const matchesSupplier = !selectedSupplier || product.supplier.id === selectedSupplier;
    
    const matchesStock = 
      stockFilter === 'all' ||
      (stockFilter === 'low' && product.currentStock <= product.minStock) ||
      (stockFilter === 'out' && product.currentStock === 0) ||
      (stockFilter === 'normal' && product.currentStock > product.minStock);
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && product.isActive) ||
      (statusFilter === 'inactive' && !product.isActive);

    return matchesSearch && matchesCategory && matchesSupplier && matchesStock && matchesStatus;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'sku':
        aValue = a.sku.toLowerCase();
        bValue = b.sku.toLowerCase();
        break;
      case 'stock':
        aValue = a.currentStock;
        bValue = b.currentStock;
        break;
      case 'value':
        aValue = a.currentStock * a.purchasePrice;
        bValue = b.currentStock * b.purchasePrice;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) return { 
      label: 'Sem Estoque', 
      variant: 'danger' as const, 
      icon: AlertTriangle 
    };
    if (product.currentStock <= product.minStock) return { 
      label: 'Estoque Baixo', 
      variant: 'warning' as const, 
      icon: AlertTriangle 
    };
    return { 
      label: 'Normal', 
      variant: 'success' as const, 
      icon: CheckCircle 
    };
  };

  const getOperatorStatus = (product: Product) => {
    const status = product.operatorStatus || 'Disponível';
    
    switch (status) {
      case 'Disponível':
        return { label: 'Disponível', variant: 'success' as const, color: 'text-green-600' };
      case 'Em uso':
        return { label: 'Em uso', variant: 'warning' as const, color: 'text-yellow-600' };
      case 'Manutenção':
        return { label: 'Manutenção', variant: 'danger' as const, color: 'text-red-600' };
      case 'Reservado':
        return { label: 'Reservado', variant: 'info' as const, color: 'text-blue-600' };
      case 'Fora de serviço':
        return { label: 'Fora de serviço', variant: 'default' as const, color: 'text-gray-600' };
      default:
        return { label: 'Disponível', variant: 'success' as const, color: 'text-green-600' };
    }
  };

  const handleExport = () => {
    const exportData = sortedProducts.map(product => ({
      'Nome': product.name,
      'SKU': product.sku,
      'Descrição': product.description,
      'Categoria': product.category.name,
      'Fornecedor': product.supplier.name,
      'Preço de Compra': product.purchasePrice.toFixed(2),
      'Preço de Venda': product.salePrice.toFixed(2),
      'Unidade': product.unit,
      'Estoque Atual': product.currentStock,
      'Estoque Mínimo': product.minStock,
      'Estoque Máximo': product.maxStock || '',
      'Localização': `${product.location.warehouse} - ${product.location.aisle}${product.location.shelf}${product.location.position ? `-${product.location.position}` : ''}`,
      'Status': product.isActive ? 'Ativo' : 'Inativo',
      'Status Operacional': product.operatorStatus || 'Disponível',
      'Valor Total': (product.currentStock * product.purchasePrice).toFixed(2),
      'Data de Criação': format(product.createdAt, 'dd/MM/yyyy HH:mm'),
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
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
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <img 
            src="/sigma.png" 
            alt="Ícone Sigma" 
            className="w-20 h-20 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-600 mt-1">
              Gerencie o catálogo de produtos e equipamentos
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={handleExport}
            className="flex items-center space-x-2"
            disabled={sortedProducts.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowExcelImport(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importar Excel</span>
          </Button>
          <Button 
            variant="success" 
            onClick={handleSaveToFirebase}
            loading={isSavingToFirebase}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
            disabled={!isOnline}
          >
            <Cloud className="w-4 h-4" />
            <span>{saveFirebaseMessage}</span>
          </Button>
          <Button onClick={onAdd} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </Button>
        </div>
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as categorias</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os fornecedores</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os estoques</option>
              <option value="low">Estoque baixo</option>
              <option value="out">Sem estoque</option>
              <option value="normal">Estoque normal</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">Ordenar por:</span>
        {(['name', 'sku', 'stock', 'value'] as const).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === field 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>
              {field === 'name' && 'Nome'}
              {field === 'sku' && 'SKU'}
              {field === 'stock' && 'Estoque'}
              {field === 'value' && 'Valor'}
            </span>
            {sortBy === field && (
              sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
            )}
          </button>
        ))}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {sortedProducts.length} de {products.length} produtos
        </p>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Valor total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            sortedProducts.reduce((sum, product) => sum + (product.currentStock * product.purchasePrice), 0)
          )}</span>
        </div>
      </div>

      {/* Products Grid/List */}
      {sortedProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar os filtros ou adicione um novo produto.
            </p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            const operatorStatus = getOperatorStatus(product);
            
            return (
              <Card key={product.id} hover className="group">
                <CardContent className="p-6">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{product.location.warehouse} - {product.location.aisle}{product.location.shelf}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant={stockStatus.variant} size="sm">
                        <stockStatus.icon className="w-3 h-3 mr-1" />
                        {stockStatus.label}
                      </Badge>
                      <Badge variant={operatorStatus.variant} size="sm">
                        {operatorStatus.label}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Estoque:</span>
                        <span className="font-medium text-gray-900">
                          {product.currentStock} {product.unit}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Valor:</span>
                        <span className="font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            product.currentStock * product.purchasePrice
                          )}
                        </span>
                      </div>
                    </div>

                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(product)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(product.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Localização
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const operatorStatus = getOperatorStatus(product);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg mr-3 overflow-hidden">
                              {product.images[0] ? (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
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
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.supplier.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {product.sku}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {product.currentStock} {product.unit}
                            </span>
                            <Badge variant={stockStatus.variant} size="sm">
                              <stockStatus.icon className="w-3 h-3 mr-1" />
                              {stockStatus.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            Min: {product.minStock} {product.unit}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.location.warehouse}
                          </div>
                          <div className="text-sm text-gray-500">
                            {product.location.aisle}{product.location.shelf}
                            {product.location.position && `-${product.location.position}`}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <Badge variant={product.isActive ? 'success' : 'danger'} size="sm">
                              {product.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant={operatorStatus.variant} size="sm">
                              {operatorStatus.label}
                            </Badge>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              product.currentStock * product.purchasePrice
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            Unit: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.purchasePrice)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(product)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(product)}
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(product.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Excel Import Modal */}
      {showExcelImport && (
        <ExcelImport
          categories={categories}
          suppliers={suppliers}
          onImport={onImport}
          onClose={() => setShowExcelImport(false)}
        />
      )}

      {/* Stock Correction Modal */}
      {showStockCorrection && (
        <StockCorrectionModal
          products={products}
          movements={movements}
          onClose={() => setShowStockCorrection(false)}
          onProductsUpdated={handleProductsUpdated}
        />
      )}
    </div>
  );
}