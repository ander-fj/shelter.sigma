import { useState } from 'react';
import { Product } from '../../types';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  ChevronDown,
  Package, 
  X,
  MapPin,
  Hash,
  AlertTriangle,
  CheckCircle,
  Search
} from 'lucide-react';

interface SingleProductSelectorProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelect: (product: Product) => void;
  onClear: () => void;
}

export function SingleProductSelector({ 
  products, 
  selectedProduct, 
  onSelect, 
  onClear
}: SingleProductSelectorProps) {
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
    onSelect(product);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onClear();
    setSearchTerm('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <Package className="w-5 h-5 mr-2" />
        Produto
      </h3>

      {/* Dropdown Container */}
      <div className="relative">
        {/* Dropdown Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            {selectedProduct ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0]}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedProduct.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    SKU: {selectedProduct.sku} • Estoque: {selectedProduct.currentStock} {selectedProduct.unit}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Selecionar Produto</p>
                  <p className="text-xs text-gray-400">Clique para escolher um produto</p>
                </div>
              </div>
            )}
            <div className="flex items-center space-x-2">
              {selectedProduct && (
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
                  placeholder="Buscar produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Products List */}
            <div className="max-h-80 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="py-1">
                  {filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const isSelected = selectedProduct?.id === product.id;
                    
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
                                    Estoque: {product.currentStock} {product.unit}
                                  </span>
                                  <span className="text-xs text-gray-400">•</span>
                                  <span className="text-xs text-gray-500">
                                    {product.category.name}
                                  </span>
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

      {/* Selected Product Details */}
      {selectedProduct && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {selectedProduct.images[0] && (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-12 h-12 rounded-lg object-cover border-2 border-blue-200"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{selectedProduct.name}</h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <Hash className="w-3 h-3 text-gray-500" />
                      <span className="text-sm text-gray-600">SKU: {selectedProduct.sku}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {selectedProduct.location.warehouse} - {selectedProduct.location.aisle}{selectedProduct.location.shelf}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 mt-2">
                    <div className="flex items-center space-x-1">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        Estoque: {selectedProduct.currentStock} {selectedProduct.unit}
                      </span>
                    </div>
                    <Badge 
                      variant={getStockStatus(selectedProduct).variant}
                      size="sm"
                    >
                      {getStockStatus(selectedProduct).label}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="w-4 h-4" />
              </Button>
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