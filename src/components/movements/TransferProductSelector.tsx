import { useState } from 'react';
import { Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { 
  ChevronDown,
  Package, 
  X,
  MapPin,
  Hash,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  Building,
  Truck,
  ArrowRight,
  Warehouse
} from 'lucide-react';

interface TransferProductSelectorProps {
  products: Product[];
  selectedProducts: Product[];
  onSelect: (product: Product) => void;
  onRemove: (productId: string) => void;
  onClear: () => void;
  onCreateNew?: () => void;
  quantities: Record<string, string>;
  onQuantityChange: (productId: string, quantity: string) => void;
  isTransfer?: boolean;
  sourceWarehouse?: string;
  destinationWarehouse?: string;
  showWarehouseInfo?: boolean;
  onWarehouseChange?: (warehouse: string) => void;
}

export function TransferProductSelector({ 
  products, 
  selectedProducts = [], 
  onSelect, 
  onRemove,
  onClear,
  onCreateNew,
  quantities,
  onQuantityChange,
  isTransfer = false,
  sourceWarehouse = '',
  destinationWarehouse = '',
  showWarehouseInfo = false,
  onWarehouseChange
}: TransferProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleProductSelect = (product: Product) => {
    // Check if product is already selected
    if (!selectedProducts.find(p => p.id === product.id)) {
      onSelect(product);
    }
    setSearchTerm('');
  };

  const handleClear = () => {
    onClear();
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Calculate total products and value for transfer
  const getTotalQuantity = () => {
    return selectedProducts.reduce((total, product) => {
      return total + parseInt(quantities[product.id] || '0');
    }, 0);
  };

  const getTotalValue = () => {
    return selectedProducts.reduce((total, product) => {
      const quantity = parseInt(quantities[product.id] || '0');
      return total + (quantity * product.purchasePrice);
    }, 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Package className="w-5 h-5 mr-2" />
          {isTransfer ? 'Produtos para Transferência' : 'Equipamentos'}
        </h3>
        
        {isTransfer && sourceWarehouse && destinationWarehouse && (
          <div className="flex items-center space-x-2 text-sm">
            <div className="flex items-center space-x-1 bg-blue-100 px-2 py-1 rounded">
              <Building className="w-3 h-3 text-blue-600" />
              <span className="text-blue-800 font-medium">{sourceWarehouse}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center space-x-1 bg-green-100 px-2 py-1 rounded">
              <Building className="w-3 h-3 text-green-600" />
              <span className="text-green-800 font-medium">{destinationWarehouse}</span>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Info */}
      {isTransfer && sourceWarehouse && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Warehouse className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Selecionando produtos do armazém: <strong>{sourceWarehouse}</strong>
                </p>
                <p className="text-xs text-blue-700">
                  {products.length} produtos disponíveis para transferência
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dropdown Container */}
      <div className="relative">
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            {selectedProducts.length > 0 ? (
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''} selecionado{selectedProducts.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedProducts.slice(0, 2).map(p => p.name).join(', ')}
                    {selectedProducts.length > 2 && ` e mais ${selectedProducts.length - 2}`}
                  </p>
                  {isTransfer && (
                    <p className="text-xs text-blue-600 font-medium">
                      Total: {getTotalQuantity()} itens • Valor: R$ {getTotalValue().toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {isTransfer ? 'Selecionar Produtos para Transferir' : 'Selecionar Equipamento'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isTransfer && sourceWarehouse 
                      ? `Produtos disponíveis em ${sourceWarehouse}`
                      : 'Clique para escolher produtos'
                    }
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {selectedProducts.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={isTransfer ? "Buscar produtos para transferir..." : "Buscar equipamento..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Create New Equipment Button */}
            {onCreateNew && !isTransfer && (
              <div className="p-3 border-b border-gray-200 bg-blue-50">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Adicionar Novo Equipamento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Package className="w-4 h-4" />
                    <span className="font-medium">Adicionar Equipamento Existente</span>
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-2 text-center">
                  Cadastre um novo equipamento ou selecione um existente da lista.
                </p>
              </div>
            )}

            {/* Products List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">
                    {isTransfer && sourceWarehouse 
                      ? `Nenhum produto encontrado em ${sourceWarehouse}`
                      : 'Nenhum equipamento encontrado'
                    }
                  </p>
                  {onCreateNew && !isTransfer && (
                    <button
                      type="button"
                      onClick={handleCreateNew}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Cadastrar novo equipamento
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const isSelected = selectedProducts.find(p => p.id === product.id);
                    const maxTransferQuantity = product.currentStock;
                    
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0 ${
                          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Product Image */}
                          <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
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

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {product.name}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Hash className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {product.sku}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <MapPin className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {product.location.warehouse}-{product.location.aisle}{product.location.shelf}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-600">
                                    Disponível: {product.currentStock} {product.unit}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">
                                    {product.category.name}
                                  </span>
                                  {isTransfer && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-blue-600 font-medium">
                                        Max: {maxTransferQuantity}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="ml-3 flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                  {isSelected && (
                                    <Badge variant="success" size="sm">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Selecionado
                                    </Badge>
                                  )}
                                  <Badge variant={stockStatus.variant} size="sm">
                                    <stockStatus.icon className="w-3 h-3 mr-1" />
                                    {stockStatus.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Products Details */}
      {selectedProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              {isTransfer ? 'Produtos Selecionados para Transferência' : 'Equipamentos Selecionados'} ({selectedProducts.length})
            </h4>
            {isTransfer && selectedProducts.length > 0 && (
              <div className="text-sm text-blue-600 font-medium">
                Total: {getTotalQuantity()} itens • Valor: R$ {getTotalValue().toFixed(2)}
              </div>
            )}
          </div>
          
          {selectedProducts.map((product) => (
            <Card key={product.id} className={`${isTransfer ? 'bg-blue-50 border-blue-200' : 'bg-blue-50 border-blue-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{product.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Hash className="w-3 h-3 text-gray-500" />
                          <span className="text-sm text-gray-600">SKU: {product.sku}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {product.location.warehouse} - {product.location.aisle}{product.location.shelf}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <Package className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            Disponível: {product.currentStock} {product.unit}
                          </span>
                        </div>
                        <Badge 
                          variant={getStockStatus(product).variant}
                          size="sm"
                        >
                          {getStockStatus(product).label}
                        </Badge>
                      </div>
                      
                      {/* Individual Quantity Input */}
                      <div className="mt-3 flex items-center space-x-3">
                        <label className="text-sm font-medium text-gray-700 min-w-[80px]">
                          {isTransfer ? 'Qtd. Transferir:' : 'Quantidade:'}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={quantities[product.id] || '1'}
                            onChange={(e) => onQuantityChange(product.id, e.target.value)}
                            max={product.currentStock}
                            min="1"
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="1"
                          />
                          <span className="text-sm text-gray-600 min-w-[2rem]">
                            {product.unit}
                          </span>
                          <span className="text-xs text-gray-500">
                            (máx: {product.currentStock})
                          </span>
                        </div>
                      </div>

                      {/* Transfer Value Info */}
                      {isTransfer && quantities[product.id] && (
                        <div className="mt-2 text-xs text-blue-600">
                          Valor da transferência: R$ {(parseInt(quantities[product.id]) * product.purchasePrice).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(product.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add More Products Button */}
      {selectedProducts.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <Button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isTransfer ? 'Adicionar Mais Produtos à Transferência' : 'Adicionar Mais Equipamentos'}
                </span>
              </Button>
              <p className="text-xs text-blue-700 mt-2">
                {isTransfer 
                  ? `Adicione mais produtos do ${sourceWarehouse} para transferir em lote`
                  : 'Clique para adicionar mais equipamentos à mesma movimentação'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer Summary */}
      {isTransfer && selectedProducts.length > 0 && sourceWarehouse && destinationWarehouse && (
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-blue-600" />
              Resumo da Transferência
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Produtos</p>
                <p className="text-xl font-bold text-blue-600">{selectedProducts.length}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Quantidade Total</p>
                <p className="text-xl font-bold text-purple-600">{getTotalQuantity()}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-xl font-bold text-green-600">R$ {getTotalValue().toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Rota</p>
                <p className="text-sm font-bold text-gray-900">
                  {sourceWarehouse} → {destinationWarehouse}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}