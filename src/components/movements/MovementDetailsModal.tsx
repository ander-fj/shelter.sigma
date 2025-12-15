import React, { useState, useEffect } from 'react';
import { StockMovement, Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  X,
  Package,
  TrendingUp,
  TrendingDown,
  Truck,
  RotateCcw,
  Calendar,
  MapPin,
  User,
  FileText,
  Hash,
  Building,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Paperclip,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../../utils/dateUtils';
import { userService } from '../../services/userService';

interface MovementDetailsModalProps {
  movement: StockMovement;
  product: Product | undefined;
  onClose: () => void;
}

export function MovementDetailsModal({
  movement,
  product,
  onClose
}: MovementDetailsModalProps) {
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);

  // Carregar nomes dos usuários
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(u => {
          namesMap[u.id] = u.name;
          namesMap[u.email] = u.name;
        });
        
        // Adicionar mapeamentos específicos conhecidos
        namesMap['PJ30Q63zDfMqeKnXiomb'] = 'Renan';
        namesMap['4ke3Tbb6eAXjw1nN9PFZ'] = 'Anderson Jataí';
        namesMap['admin'] = 'Admin Master';
        namesMap['manager'] = 'Maria Silva';
        namesMap['operator'] = 'João Santos';

        setUserNames(namesMap);
        console.log('👥 Nomes de usuários carregados:', namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };

    loadUserNames();
  }, []);

  // Função para obter nome do usuário
  const getUserName = (userId: string): string => {
    console.log('🔍 Buscando nome para ID:', userId);

    if (userNames[userId]) {
      console.log('✅ Nome encontrado:', userNames[userId]);
      return userNames[userId];
    }

    // Fallback para IDs conhecidos
    const fallbackNames: Record<string, string> = {
      'PJ30Q63zDfMqeKnXiomb': 'Renan',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos',
      '1': 'Admin Master',
      '2': 'Maria Silva',
      '3': 'João Santos'
    };

    const fallbackName = fallbackNames[userId];
    if (fallbackName) {
      console.log('✅ Nome fallback encontrado:', fallbackName);
      return fallbackName;
    }

    console.log('❌ Nome não encontrado, usando padrão para:', userId);
    return `Usuário ${userId.substring(0, 8)}`;
  };

  const getMovementTypeInfo = () => {
    switch (movement.type) {
      case 'entry':
        return {
          label: 'Entrada de Estoque',
          icon: TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'exit':
        return {
          label: 'Saída de Estoque',
          icon: TrendingDown,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'transfer':
        return {
          label: 'Transferência entre Armazéns',
          icon: Truck,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'adjustment':
        return {
          label: 'Ajuste de Estoque',
          icon: RotateCcw,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        };
      default:
        return {
          label: 'Movimentação',
          icon: Package,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getApprovalStatusInfo = () => {
    if (!movement.approvalStatus) {
      return {
        label: 'Sem Aprovação',
        variant: 'default' as const,
        icon: Clock,
        color: 'text-gray-600'
      };
    }

    switch (movement.approvalStatus) {
      case 'pending':
        return {
          label: 'Aguardando Aprovação',
          variant: 'warning' as const,
          icon: Clock,
          color: 'text-yellow-600'
        };
      case 'approved':
        return {
          label: 'Aprovado',
          variant: 'success' as const,
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'rejected':
        return {
          label: 'Rejeitado',
          variant: 'danger' as const,
          icon: XCircle,
          color: 'text-red-600'
        };
      default:
        return {
          label: 'Status Desconhecido',
          variant: 'default' as const,
          icon: AlertTriangle,
          color: 'text-gray-600'
        };
    }
  };

  const getTransferStatusInfo = () => {
    if (!movement.transferData) {
      return {
        label: 'Dados de Transferência Não Disponíveis',
        variant: 'warning' as const,
        icon: AlertTriangle,
        color: 'text-yellow-600'
      };
    }

    switch (movement.transferData.transferStatus) {
      case 'pending':
        return {
          label: 'Aguardando Recebimento',
          variant: 'warning' as const,
          icon: Clock,
          color: 'text-yellow-600'
        };
      case 'in_transit':
        return {
          label: 'Em Trânsito',
          variant: 'info' as const,
          icon: Truck,
          color: 'text-blue-600'
        };
      case 'received':
        return {
          label: 'Recebido',
          variant: 'success' as const,
          icon: CheckCircle,
          color: 'text-green-600'
        };
      case 'rejected':
        return {
          label: 'Rejeitado',
          variant: 'danger' as const,
          icon: XCircle,
          color: 'text-red-600'
        };
      default:
        return {
          label: 'Status Desconhecido',
          variant: 'default' as const,
          icon: AlertTriangle,
          color: 'text-gray-600'
        };
    }
  };

  const typeInfo = getMovementTypeInfo();
  const approvalInfo = getApprovalStatusInfo();
  const transferInfo = getTransferStatusInfo();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${typeInfo.bgColor}`}>
                <typeInfo.icon className={`w-6 h-6 ${typeInfo.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes da Movimentação</h2>
                <p className="text-gray-600">{typeInfo.label}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Complete Movement Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">Preço Unitário</label>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {movement.price ? formatCurrency(movement.price) : 
                 product ? formatCurrency(product.purchasePrice) : 'R$ 0,00'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {movement.price ? 'Preço informado' : 'Preço cadastrado'}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <label className="text-xs font-medium text-green-600 uppercase tracking-wide">Quantidade</label>
              <p className="text-lg font-bold text-green-900 mt-1">
                {movement.quantity} {product?.unit || 'UN'}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {movement.type === 'entry' ? 'Entrada' : movement.type === 'exit' ? 'Saída' : 'Movimentação'}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <label className="text-xs font-medium text-purple-600 uppercase tracking-wide">Valor Total</label>
              <p className="text-lg font-bold text-purple-900 mt-1">
                {formatCurrency(movement.quantity * (movement.price || product?.purchasePrice || 0))}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Valor da movimentação
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Responsável</label>
              <div className="flex items-center space-x-2 mt-2">
                <User className="w-5 h-5 text-gray-600" />
                <p className="text-lg font-bold text-gray-900">
                  {getUserName(movement.userId)}
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                ID do usuário
              </p>
            </div>
          </div>

          {/* Additional Movement Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {movement.obra && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <label className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Obra</label>
                <p className="text-sm font-semibold text-yellow-900 mt-1">{movement.obra}</p>
              </div>
            )}
            
            {movement.notaFiscal && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <label className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Nota Fiscal</label>
                <p className="text-sm font-mono text-indigo-900 mt-1">{movement.notaFiscal}</p>
              </div>
            )}
            
            {movement.batch && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <label className="text-xs font-medium text-orange-600 uppercase tracking-wide">Lote</label>
                <p className="text-sm font-semibold text-orange-900 mt-1">{movement.batch}</p>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Data/Hora</label>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {safeFormatDate(movement.createdAt, 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Product Information */}
          <Card className={`${typeInfo.bgColor} ${typeInfo.borderColor} border-2`}>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Produto
              </h3>
            </CardHeader>
            <CardContent>
              {product ? (
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-white rounded-lg overflow-hidden border-2 border-gray-200">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{product.name}</h4>
                    <p className="text-gray-600">{product.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-1">
                        <Hash className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">SKU: {product.sku}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {product.location.warehouse} - {product.location.aisle}{product.location.shelf}
                        </span>
                      </div>
                      <Badge variant="info" size="sm">
                        {product.category.name}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Produto não encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Movement Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Informações Básicas
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Tipo</label>
                    <div className="flex items-center space-x-2">
                      <typeInfo.icon className={`w-4 h-4 ${typeInfo.color}`} />
                      <p className="text-gray-900 capitalize">
                        {movement.type === 'entry' ? 'Entrada' : 
                         movement.type === 'exit' ? 'Saída' : 
                         movement.type === 'transfer' ? 'Transferência' : 'Ajuste'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quantidade</label>
                    <p className="text-gray-900 font-semibold">
                      {movement.type === 'exit' ? '-' : '+'}{movement.quantity} {product?.unit || 'UN'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Motivo</label>
                  <p className="text-gray-900">{movement.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estoque Anterior</label>
                    <p className="text-gray-900">{movement.previousStock} {product?.unit || 'UN'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Estoque Atual</label>
                    <p className="text-gray-900 font-semibold">{movement.newStock} {product?.unit || 'UN'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Data e Hora</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {safeFormatDate(movement.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Responsável</label>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{getUserName(movement.userId)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Informações Adicionais
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {movement.obra && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Obra</label>
                    <p className="text-gray-900">{movement.obra}</p>
                  </div>
                )}

                {movement.notaFiscal && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nota Fiscal</label>
                    <p className="text-gray-900 font-mono">{movement.notaFiscal}</p>
                  </div>
                )}

                {movement.batch && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Lote</label>
                    <p className="text-gray-900">{movement.batch}</p>
                  </div>
                )}

                {movement.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Observações</label>
                    <p className="text-gray-900">{movement.notes}</p>
                  </div>
                )}

                {/* Approval Status */}
                {movement.approvalStatus && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status de Aprovação</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={approvalInfo.variant} size="sm">
                        <approvalInfo.icon className="w-3 h-3 mr-1" />
                        {approvalInfo.label}
                      </Badge>
                    </div>
                    
                    {movement.approvedBy && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>Aprovado por: {getUserName(movement.approvedBy)}</p>
                        {movement.approvedAt && (
                          <p>Em: {safeFormatDate(movement.approvedAt, 'dd/MM/yyyy HH:mm')}</p>
                        )}
                      </div>
                    )}
                    
                    {movement.approvalNotes && (
                      <div className="mt-2 p-3 bg-gray-100 rounded-lg">
                        <p className="text-sm text-gray-700">{movement.approvalNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Classifications */}
                {movement.classifications && movement.classifications.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Classificações</label>
                    <div className="space-y-2 mt-2">
                      {movement.classifications.map((classification, index) => (
                        <div key={index} className="p-3 bg-gray-100 rounded-lg">
                          <div className="flex items-center justify-between">
                            <Badge 
                              variant={classification.type === 'reemprego' ? 'success' : 'warning'} 
                              size="sm"
                            >
                              {classification.type === 'reemprego' ? 'Reemprego' : 'Sucata'}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900">
                              {classification.quantity} {product?.unit || 'UN'}
                            </span>
                          </div>
                          {classification.notes && (
                            <p className="text-sm text-gray-600 mt-2">{classification.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transfer Information */}
          {movement.type === 'transfer' && (
            <Card className="bg-blue-50 border-blue-200 border-2">
              <CardHeader>
                <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                  <Truck className="w-5 h-5 mr-2" />
                  Informações da Transferência
                </h3>
              </CardHeader>
              <CardContent>
                {movement.transferData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-blue-700">Armazém de Origem</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Building className="w-4 h-4 text-blue-600" />
                          <p className="text-blue-900 font-semibold">{movement.transferData.fromWarehouse}</p>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-blue-700">Armazém de Destino</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Building className="w-4 h-4 text-blue-600" />
                          <p className="text-blue-900 font-semibold">{movement.transferData.toWarehouse}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-blue-700">Status da Transferência</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={transferInfo.variant} size="sm">
                            <transferInfo.icon className="w-3 h-3 mr-1" />
                            {transferInfo.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-blue-700">Código de Rastreamento</label>
                        <p className="text-blue-900 font-mono bg-white px-2 py-1 rounded border border-blue-200 mt-1">
                          {movement.transferData.trackingCode}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-blue-700">Enviado por</label>
                        <p className="text-blue-900">{getUserName(movement.transferData.sentBy)}</p>
                        <p className="text-sm text-blue-700">
                          {safeFormatDate(movement.transferData.sentAt, 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                      
                      {movement.transferData.receivedBy && (
                        <div>
                          <label className="text-sm font-medium text-blue-700">Recebido por</label>
                          <p className="text-blue-900">{getUserName(movement.transferData.receivedBy)}</p>
                          {movement.transferData.receivedAt && (
                            <p className="text-sm text-blue-700">
                              {safeFormatDate(movement.transferData.receivedAt, 'dd/MM/yyyy HH:mm')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {movement.transferData.expectedDeliveryDate && (
                      <div>
                        <label className="text-sm font-medium text-blue-700">Data de Entrega Prevista</label>
                        <p className="text-blue-900">
                          {safeFormatDate(movement.transferData.expectedDeliveryDate, 'dd/MM/yyyy')}
                        </p>
                      </div>
                    )}

                    {movement.transferData.transportNotes && (
                      <div>
                        <label className="text-sm font-medium text-blue-700">Observações do Transporte</label>
                        <div className="mt-1 p-3 bg-white rounded-lg border border-blue-200">
                          <p className="text-blue-900">{movement.transferData.transportNotes}</p>
                        </div>
                      </div>
                    )}

                    {movement.transferData.rejectionReason && (
                      <div>
                        <label className="text-sm font-medium text-red-700">Motivo da Rejeição</label>
                        <div className="mt-1 p-3 bg-red-100 rounded-lg border border-red-200">
                          <p className="text-red-900">{movement.transferData.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <p className="text-yellow-700 font-medium">Dados de transferência não disponíveis</p>
                    <p className="text-sm text-yellow-600 mt-1">
                      Esta transferência pode ter sido criada antes da implementação completa do sistema.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Financial Information */}
          {product && (
            <Card className="bg-green-50 border-green-200 border-2">
              <CardHeader>
                <h3 className="text-lg font-semibold text-green-900 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Informações Financeiras
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">Valor Unitário</p>
                    <p className="text-xl font-bold text-green-900">
                      {formatCurrency(product.purchasePrice)}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">Quantidade</p>
                    <p className="text-xl font-bold text-green-900">
                      {movement.quantity} {product.unit}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">Valor Total</p>
                    <p className="text-xl font-bold text-green-900">
                      {formatCurrency(movement.quantity * product.purchasePrice)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock Impact */}
          <Card className="bg-gray-50 border-gray-200 border-2">
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Impacto no Estoque
              </h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center space-x-8">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Estoque Anterior</p>
                  <p className="text-2xl font-bold text-gray-900">{movement.previousStock}</p>
                  <p className="text-xs text-gray-500">{product?.unit || 'UN'}</p>
                </div>
                
                <div className="flex items-center">
                  {movement.type === 'entry' ? (
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  ) : movement.type === 'exit' ? (
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  ) : movement.type === 'transfer' ? (
                    <Truck className="w-8 h-8 text-blue-600" />
                  ) : (
                    <RotateCcw className="w-8 h-8 text-purple-600" />
                  )}
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600">Estoque Atual</p>
                  <p className="text-2xl font-bold text-gray-900">{movement.newStock}</p>
                  <p className="text-xs text-gray-500">{product?.unit || 'UN'}</p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600">
                  Variação:
                  <span className={`font-semibold ml-1 ${
                    movement.newStock > movement.previousStock ? 'text-green-600' :
                    movement.newStock < movement.previousStock ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {movement.newStock > movement.previousStock ? '+' : ''}
                    {movement.newStock - movement.previousStock} {product?.unit || 'UN'}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {movement.attachments && movement.attachments.length > 0 && (
            <Card className="bg-indigo-50 border-indigo-200 border-2">
              <CardHeader>
                <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
                  <Paperclip className="w-5 h-5 mr-2" />
                  Anexos ({movement.attachments.length})
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {movement.attachments.map((attachment, index) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment);
                    const isPdf = /\.pdf$/i.test(attachment);

                    return (
                      <div
                        key={index}
                        className="relative group rounded-lg overflow-hidden shadow-md border-2 border-indigo-200 bg-white"
                      >
                        {isImage ? (
                          <div className="aspect-square relative">
                            <img
                              src={attachment}
                              alt={`Anexo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex space-x-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setSelectedAttachment(attachment)}
                                  className="bg-white hover:bg-gray-100"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => window.open(attachment, '_blank')}
                                  className="bg-white hover:bg-gray-100"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-square flex flex-col items-center justify-center p-4 bg-indigo-100">
                            <FileText className="w-12 h-12 text-indigo-600 mb-2" />
                            <p className="text-xs text-indigo-900 text-center truncate w-full">
                              {isPdf ? 'PDF' : 'Arquivo'} #{index + 1}
                            </p>
                            <div className="flex space-x-2 mt-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => window.open(attachment, '_blank')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Abrir
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {selectedAttachment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedAttachment(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <Button
              variant="ghost"
              onClick={() => setSelectedAttachment(null)}
              className="absolute top-4 right-4 bg-white hover:bg-gray-100 z-10"
            >
              <X className="w-5 h-5" />
            </Button>
            <img
              src={selectedAttachment}
              alt="Anexo"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}