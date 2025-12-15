import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { 
  Search, 
  Package, 
  MapPin, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Settings,
  Filter,
  X
} from 'lucide-react';

interface EquipmentSelectorProps {
  products: Product[];
  selectedEquipment: Product | null;
  onSelect: (product: Product) => void;
  onClear: () => void;
}

export function EquipmentSelector({ 
  products, 
  selectedEquipment, 
  onSelect, 
  onClear 
}: EquipmentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('available');
  const [locationFilter, setLocationFilter] = useState('');

  // Filter available equipment (active products and available status only)
  const availableEquipment = products.filter(product => 
    product.isActive && 
    product.currentStock > 0 && 
    (!product.operatorStatus || product.operatorStatus === 'Disponível')
  );

  // Apply filters
  const filteredEquipment = availableEquipment.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'available' && (!product.operatorStatus || product.operatorStatus === 'Disponível')) ||
      (statusFilter === 'in_use' && product.operatorStatus === 'Em uso') ||
      (statusFilter === 'maintenance' && product.operatorStatus === 'Manutenção') ||
      (statusFilter === 'reserved' && product.operatorStatus === 'Reservado') ||
      (statusFilter === 'out_of_service' && product.operatorStatus === 'Fora de serviço');
    
    const matchesLocation = 
      !locationFilter || 
      product.location.warehouse.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesLocation;
  });

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
        return { 
          label: 'Disponível', 
          variant: 'success' as const, 
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'Em uso':
        return { 
          label: 'Em uso', 
          variant: 'warning' as const, 
          icon: Clock,
          color: 'text-yellow-600'
        };
      case 'Manutenção':
        return { 
          label: 'Manutenção', 
          variant: 'danger' as const, 
          icon: Settings,
          color: 'text-red-600'
        };
      case 'Reservado':
        return { 
          label: 'Reservado', 
          variant: 'info' as const, 
          icon: Clock,
          color: 'text-blue-600'
        };
      case 'Fora de serviço':
        return { 
          label: 'Fora de serviço', 
          variant: 'default' as const, 
          icon: X,
          color: 'text-gray-600'
        };
      default:
        return { 
          label: 'Disponível', 
          variant: 'success' as const, 
          icon: CheckCircle,
          color: 'text-green-600'
        };
    }
  };

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(
    availableEquipment.map(p => p.location.warehouse)
  )).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Selecionar Equipamento</h2>
          <p className="text-gray-600">Escolha um equipamento para reservar</p>
        </div>
        {selectedEquipment && (
          <Button variant="secondary" onClick={onClear}>
            <X className="w-4 h-4 mr-2" />
            Limpar Seleção
          </Button>
        )}
      </div>

      {/* Selected Equipment */}
      {selectedEquipment && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                {selectedEquipment.images[0] ? (
                  <img
                    src={selectedEquipment.images[0]}
                    alt={selectedEquipment.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 text-lg">{selectedEquipment.name}</h3>
                <p className="text-blue-700">SKU: {selectedEquipment.sku}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      {selectedEquipment.location.warehouse} - {selectedEquipment.location.aisle}{selectedEquipment.location.shelf}
                    </span>
                  </div>
                  <Badge variant={getOperatorStatus(selectedEquipment).variant} size="sm">
                    <getOperatorStatus(selectedEquipment).icon className="w-3 h-3 mr-1" />
                    {getOperatorStatus(selectedEquipment).label}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Buscar equipamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="available">Disponível</option>
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
          </div>
        </CardContent>
      </Card>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhum equipamento encontrado
                </h3>
                <p className="text-gray-600">
                  Tente ajustar os filtros ou verifique se há equipamentos disponíveis.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredEquipment.map((product) => {
            const stockStatus = getStockStatus(product);
            const operatorStatus = getOperatorStatus(product);
            const isSelected = selectedEquipment?.id === product.id;
            
            return (
              <Card 
                key={product.id} 
                hover 
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => onSelect(product)}
              >
                <CardContent className="p-6">
                  {/* Equipment Image */}
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

                  {/* Equipment Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{product.location.warehouse} - {product.location.aisle}{product.location.shelf}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant={operatorStatus.variant} size="sm">
                        <operatorStatus.icon className="w-3 h-3 mr-1" />
                        {operatorStatus.label}
                      </Badge>
                    </div>

                    {product.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-600">
        Mostrando {filteredEquipment.length} de {availableEquipment.length} equipamentos disponíveis
      </div>
    </div>
  );
}