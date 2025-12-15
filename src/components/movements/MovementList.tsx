
import { Fragment, useState, useEffect } from 'react';
import { StockMovement, Product, MovementClassification } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ApprovalModal } from './ApprovalModal';
import { TransferReceiveModal } from './TransferReceiveModal';
import { MovementDetailsModal } from './MovementDetailsModal';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../contexts/InventoryContext';
import { Search, Filter, Plus, TrendingUp, TrendingDown, Package, Calendar, User, FileText, Download, CheckCircle, XCircle, Clock, AlertTriangle, Truck, ArrowUpDown, RotateCcw, Eye, CreditCard as Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../../utils/dateUtils';
import { userService } from '../../services/userService';

interface MovementListProps {
  movements: StockMovement[];
  products: Product[];
  onAdd: () => void;
  loading?: boolean;
}

export function MovementList({ 
  movements, 
  products, 
  onAdd, 
  loading = false 
}: MovementListProps) {
  const { hasRole, user } = useAuth();
  const { updateMovement } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});

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
        namesMap['xhRq1kFYtq7XkVbWeOsw'] = 'Anderson Jataí';
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

  // Filter movements
  const filteredMovements = movements.filter(movement => {
    const product = products.find(p => p.id === movement.productId);
    const matchesSearch = 
      movement.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || movement.type === typeFilter;

    let matchesDate = true;
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const movementDate = new Date(movement.createdAt);
      matchesDate = movementDate.toDateString() === filterDate.toDateString();
    }

    const matchesApproval = 
      approvalFilter === 'all' ||
      (approvalFilter === 'pending' && (!movement.approvalStatus || movement.approvalStatus === 'pending')) ||
      (approvalFilter === 'approved' && movement.approvalStatus === 'approved') ||
      (approvalFilter === 'rejected' && movement.approvalStatus === 'rejected');

    return matchesSearch && matchesType && matchesDate && matchesApproval;
  });

  // Sort movements by date (newest first)
  const sortedMovements = [...filteredMovements].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Agrupar por data (apenas para suporte ao recolher por data)
  const groupedMovements = sortedMovements.reduce((groups, movement) => {
    const dateKey = safeFormatDate(movement.createdAt, "dd/MM/yyyy");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(movement);
    return groups;
  }, {} as Record<string, StockMovement[]>);

  const getMovementTypeInfo = (movement: StockMovement) => {
    console.log('🔍 [MOVEMENT-LIST] Analisando movimento:', {
      id: movement.id,
      type: movement.type,
      reason: movement.reason,
      hasTransferData: !!movement.transferData,
      transferStatus: movement.transferData?.transferStatus || 'NO_TRANSFER_DATA',
      approvalStatus: movement.approvalStatus || 'NO_APPROVAL_STATUS',
      fromWarehouse: movement.transferData?.fromWarehouse,
      toWarehouse: movement.transferData?.toWarehouse,
      trackingCode: movement.transferData?.trackingCode
    });

    // TRANSFERÊNCIAS - Prioridade máxima
    if (movement.type === 'transfer') {
      console.log('🚚 [TRANSFER] Processando transferência:', movement.id);

      if (!movement.transferData) {
        console.warn('⚠️ [TRANSFER] TransferData não encontrado para transferência:', movement.id);
        return {
          label: '🚚 Transferência (Dados Incompletos)',
          variant: 'warning' as const,
          icon: AlertTriangle,
          color: 'text-yellow-600',
          showReceiveButton: false
        };

  // Iniciar todas as datas recolhidas por padrão
  useEffect(() => {
    const initialCollapsed: Record<string, boolean> = {};
    Object.keys(groupedMovements).forEach(date => {
      initialCollapsed[date] = true;
    });
    setCollapsedDates(initialCollapsed);
  }, [movements]);
      }

      const status = movement.transferData.transferStatus;
      console.log('🚚 [TRANSFER] Status encontrado:', status);

      switch (status) {
        case 'pending':
          console.log('✅ [TRANSFER] Retornando status PENDING');
          return {
            label: '🚚 Aguardando Recebimento',
            variant: 'warning' as const,
            icon: Truck,
            color: 'text-yellow-600',
            showReceiveButton: true
          };
        case 'in_transit':
          return {
            label: '🚛 Em Trânsito',
            variant: 'info' as const,
            icon: Truck,
            color: 'text-blue-600',
            showReceiveButton: true
          };
        case 'received':
          return {
            label: '✅ Recebido',
            variant: 'success' as const,
            icon: CheckCircle,
            color: 'text-green-600',
            showReceiveButton: false
          };
        case 'rejected':
          return {
            label: '❌ Rejeitado',
            variant: 'danger' as const,
            icon: XCircle,
            color: 'text-red-600',
            showReceiveButton: false
          };
        default:
          return {
            label: '🚚 Transferência',
            variant: 'info' as const,
            icon: Truck,
            color: 'text-blue-600',
            showReceiveButton: true
          };
      }
    }

    // OUTROS TIPOS DE MOVIMENTO
    switch (movement.type) {
      case 'entry':
        if (movement.approvalStatus === 'approved') {
          return {
            label: '✅ Entrada Aprovada',
            variant: 'success' as const,
            icon: TrendingUp,
            color: 'text-green-600',
            showReceiveButton: false
          };
        } else if (movement.approvalStatus === 'rejected') {
          return {
            label: '❌ Entrada Rejeitada',
            variant: 'danger' as const,
            icon: XCircle,
            color: 'text-red-600',
            showReceiveButton: false
          };
        } else {
          return {
            label: '⏳ Entrada Pendente',
            variant: 'warning' as const,
            icon: Clock,
            color: 'text-yellow-600',
            showReceiveButton: false
          };
        }
      case 'exit':
        return {
          label: '📤 Saída',
          variant: 'info' as const,
          icon: TrendingDown,
          color: 'text-blue-600',
          showReceiveButton: false
        };
      case 'adjustment':
        return {
          label: '🔧 Ajuste',
          variant: 'default' as const,
          icon: RotateCcw,
          color: 'text-gray-600',
          showReceiveButton: false
        };
      default:
        return {
          label: '❓ Desconhecido',
          variant: 'default' as const,
          icon: AlertTriangle,
          color: 'text-gray-600',
          showReceiveButton: false
        };
    }
  };

  const handleApprove = (movement: StockMovement) => {
    setSelectedMovement(movement);
    setShowApprovalModal(true);
  };

  const handleReceive = (movement: StockMovement) => {
    console.log('🚚 Abrindo modal de recebimento para:', movement.id);
    console.log('🔍 Dados completos do movimento:', movement);
    console.log('🔍 TransferData:', movement.transferData);
    setSelectedMovement(movement);
    setShowReceiveModal(true);
    console.log('🔍 Estado após setShowReceiveModal(true):', { showReceiveModal: true });
  };

  const handleViewDetails = (movement: StockMovement) => {
    setSelectedMovement(movement);
    setShowDetailsModal(true);
  };

  const handleApprovalSubmit = async (classifications: MovementClassification[], notes: string) => {
    if (!selectedMovement || !user) return;

    try {
      const updates = {
        approvalStatus: 'approved' as const,
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNotes: notes,
        classifications: classifications
      };

      await updateMovement(selectedMovement.id, updates);
      console.log('✅ Movimentação aprovada com classificações:', classifications);

      setShowApprovalModal(false);
      setSelectedMovement(null);
    } catch (error) {
      console.error('Erro ao aprovar movimentação:', error);
      alert('Erro ao aprovar movimentação. Tente novamente.');
    }
  };

  const handleApprovalReject = async (notes: string) => {
    if (!selectedMovement || !user) return;

    try {
      const updates = {
        approvalStatus: 'rejected' as const,
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNotes: notes
      };

      await updateMovement(selectedMovement.id, updates);
      console.log('❌ Movimentação rejeitada:', notes);

      setShowApprovalModal(false);
      setSelectedMovement(null);
    } catch (error) {
      console.error('Erro ao rejeitar movimentação:', error);
      alert('Erro ao rejeitar movimentação. Tente novamente.');
    }
  };

  const handleReceiveSubmit = async (data: {
    status: 'received' | 'rejected';
    notes?: string;
    rejectionReason?: string;
  }) => {
    if (!selectedMovement || !user) return;

    try {
      console.log('🚚 [RECEIVE] Processando recebimento:', {
        movementId: selectedMovement.id,
        action: data.status,
        hasOriginalTransferData: !!selectedMovement.transferData
      });

      // Se foi recebido, verificar e atualizar produto no armazém de destino
      if (data.status === 'received') {
        await handleProductTransferLogic(selectedMovement);
      }

      // Create transferData if missing (for old transfers)
      const transferData = selectedMovement.transferData || {
        fromWarehouse: 'Origem não especificada',
        toWarehouse: 'Destino não especificado',
        transferStatus: 'pending',
        sentBy: selectedMovement.userId,
        sentAt: selectedMovement.createdAt,
        trackingCode: `TRF-${selectedMovement.id.substring(0, 8)}`,
        receivedBy: undefined,
        receivedAt: undefined,
        rejectedBy: undefined,
        rejectedAt: undefined,
        rejectionReason: undefined,
        expectedDeliveryDate: undefined,
        actualDeliveryDate: undefined,
        transportNotes: undefined
      };

      const updates: any = {
        transferData: {
          ...transferData,
          transferStatus: data.status,
          receivedBy: user.id,
          receivedAt: new Date(),
          rejectedBy: data.status === 'rejected' ? user.id : undefined,
          rejectedAt: data.status === 'rejected' ? new Date() : undefined,
          rejectionReason: data.rejectionReason,
          actualDeliveryDate: new Date()
        }
      };


      await updateMovement(selectedMovement.id, updates);
      console.log(`🚚 Transferência ${data.status === 'received' ? 'recebida' : 'rejeitada'}`);

      setShowReceiveModal(false);
      setSelectedMovement(null);
    } catch (error) {
      console.error('Erro ao processar recebimento:', error);
      alert('Erro ao processar recebimento. Tente novamente.');
    }
  };

  // Função para lidar com a lógica de transferência de produtos
  const handleProductTransferLogic = async (movement: StockMovement) => {
    try {
      const transferData = movement.transferData;
      if (!transferData) {
        console.warn('⚠️ Dados de transferência não encontrados');
        return;
      }

      const sourceProduct = products.find(p => p.id === movement.productId);
      if (!sourceProduct) {
        console.warn('⚠️ Produto de origem não encontrado');
        return;
      }

      console.log('🔍 Verificando produto no armazém de destino:', {
        productName: sourceProduct.name,
        sku: sourceProduct.sku,
        destinationWarehouse: transferData.toWarehouse,
        quantityToTransfer: movement.quantity
      });

      // Verificar se já existe produto com mesmo SKU no armazém de destino
      const existingProductInDestination = products.find(p => 
        p.sku === sourceProduct.sku && 
        p.location.warehouse === transferData.toWarehouse
      );

      if (existingProductInDestination) {
        // Produto já existe no destino - somar quantidades
        console.log('✅ Produto já existe no destino - somando quantidades:', {
          existingStock: existingProductInDestination.currentStock,
          transferQuantity: movement.quantity,
          newStock: existingProductInDestination.currentStock + movement.quantity
        });

        const { updateProduct } = await import('../../contexts/InventoryContext');
        // Atualizar produto existente no destino
        await updateProduct(existingProductInDestination.id, {
          currentStock: existingProductInDestination.currentStock + movement.quantity,
          updatedAt: new Date()
        });

        console.log('✅ Estoque atualizado no produto existente');
      } else {
        // Produto não existe no destino - criar novo produto
        console.log('🆕 Produto não existe no destino - criando novo produto:', {
          originalLocation: sourceProduct.location,
          newWarehouse: transferData.toWarehouse,
          quantity: movement.quantity
        });

        const { addProduct } = await import('../../contexts/InventoryContext');

        // Criar novo produto no armazém de destino
        const newProductData = {
          ...sourceProduct,
          location: {
            ...sourceProduct.location,
            warehouse: transferData.toWarehouse,
            id: `${transferData.toWarehouse}-${sourceProduct.location.aisle}-${sourceProduct.location.shelf}-${sourceProduct.location.position || ''}`
          },
          currentStock: movement.quantity,
          sku: `${sourceProduct.sku}-${transferData.toWarehouse}`, // SKU único para o novo armazém
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Remove campos que não devem ser copiados
        delete (newProductData as any).id;
        delete (newProductData as any).createdAt;
        delete (newProductData as any).updatedAt;

        await addProduct(newProductData);
        console.log('✅ Novo produto criado no armazém de destino');
      }

      console.log('🎉 Lógica de transferência concluída com sucesso');
    } catch (error) {
      console.error('❌ Erro na lógica de transferência:', error);
      throw error;
    }
  };
  const handleExport = () => {
    const exportData = sortedMovements.map(movement => {
      const product = products.find(p => p.id === movement.productId);
      const typeInfo = getMovementTypeInfo(movement);

      return {
        'Data': safeFormatDate(movement.createdAt, 'dd/MM/yyyy HH:mm'),
        'Tipo': movement.type === 'entry' ? 'Entrada' : 
                movement.type === 'exit' ? 'Saída' : 
                movement.type === 'transfer' ? 'Transferência' : 'Ajuste',
        'Produto': product?.name || 'Produto não encontrado',
        'SKU': product?.sku || 'N/A',
        'Quantidade': movement.quantity,
        'Unidade': product?.unit || 'UN',
        'Motivo': movement.reason,
        'Status': typeInfo.label,
        'Estoque Anterior': movement.previousStock,
        'Estoque Novo': movement.newStock,
        'Usuário': `Usuário ${movement.userId}`,
        'Observações': movement.notes || '',
        'Obra': movement.obra || '',
        'Nota Fiscal': movement.notaFiscal || ''
      };
    });

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
    link.setAttribute('download', `movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-74">
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
            <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
            <p className="text-gray-600 mt-1">
              Registre e acompanhe movimentações de estoque
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            onClick={handleExport}
            className="flex items-center space-x-2"
            disabled={sortedMovements.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
          <Button onClick={onAdd} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nova Movimentação</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar movimentações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="entry">Entradas</option>
              <option value="exit">Saídas</option>
              <option value="transfer">Transferências</option>
              <option value="adjustment">Ajustes</option>
            </select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as aprovações</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovadas</option>
              <option value="rejected">Rejeitadas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {sortedMovements.length} de {movements.length} movimentações
        </p>
      </div>


      {/* Botões Expandir/Recolher tudo */}
      <div className="flex justify-end space-x-2 mb-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const expanded: Record<string, boolean> = {};
            Object.keys(groupedMovements).forEach(date => expanded[date] = false);
            setCollapsedDates(expanded);
          }}
        >
          🔽 Expandir tudo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const collapsed: Record<string, boolean> = {};
            Object.keys(groupedMovements).forEach(date => collapsed[date] = true);
            setCollapsedDates(collapsed);
          }}
        >
          🔼 Recolher tudo
        </Button>
      </div>

      {/* Movements List */}
      {sortedMovements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma movimentação encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar os filtros ou registre uma nova movimentação.
            </p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Movimentação
            </Button>
          </CardContent>
        </Card>
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
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enviado/Recebido
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedMovements).map(([date, movementsByDate]) => {
                    return (
                      <Fragment key={date}>
                        <tr
                          className="bg-gray-100 cursor-pointer"
                          onClick={() =>
                            setCollapsedDates(prev => ({
                              ...prev,
                              [date]: !prev[date],
                            }))
                          }
                        >
                          <td colSpan={9} className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                            <div className="flex items-center justify-between">
                              <span>{date} ({movementsByDate.length} atividades)</span>
                              <span>{collapsedDates?.[date] ? "➕ Mostrar" : "➖ Recolher"}</span>
                            </div>
                          </td>
                        </tr>

                        {!collapsedDates?.[date] &&
                          movementsByDate.map((movement) => {
                            const product = products.find(p => p.id === movement.productId);
                            const typeInfo = getMovementTypeInfo(movement);
                            
                            console.log('🎯 RENDERIZANDO MOVIMENTO:', {
                              id: movement.id,
                              type: movement.type,
                              typeInfo: typeInfo,
                              showReceiveButton: typeInfo.showReceiveButton
                            });
                            
                            return (
                              <tr key={movement.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gray-100 rounded-lg mr-3 overflow-hidden">
                                      {product?.images[0] ? (
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
                                        {product?.name || 'Produto não encontrado'}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        SKU: {product?.sku || 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-2">
                                    <typeInfo.icon className={`w-4 h-4 ${typeInfo.color}`} />
                                    <span className="text-sm text-gray-900 capitalize">
                                      {movement.type === 'entry' ? 'Entrada' : 
                                       movement.type === 'exit' ? 'Saída' : 
                                       movement.type === 'transfer' ? 'Transferência' : 'Ajuste'}
                                    </span>
                                  </div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {movement.type === 'exit' ? '-' : '+'}{movement.quantity} {product?.unit || 'UN'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {movement.previousStock} → {movement.newStock}
                                  </div>
                                </td>
                                
                                <td className="px-6 py-4">
                                  <div className="text-sm text-gray-900 max-w-xs truncate">
                                    {movement.reason}
                                  </div>
                                  {movement.transferData && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {movement.transferData.fromWarehouse} → {movement.transferData.toWarehouse}
                                    </div>
                                  )}
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={typeInfo.variant} size="sm">
                                    <typeInfo.icon className="w-3 h-3 mr-1" />
                                    {typeInfo.label}
                                  </Badge>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {safeFormatDate(movement.createdAt, "dd/MM/yyyy")}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {safeFormatDate(movement.createdAt, "HH:mm")}
                                  </div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <User className="w-4 h-4 text-gray-400 mr-2" />
                                    <div className="text-sm text-gray-900">
                                      {getUserName(movement.userId)}
                                    </div>
                                  </div>
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {movement.type === 'transfer' ? (
                                    <div className="text-sm">
                                      {movement.transferData ? (
                                        <div className="space-y-1">
                                          <div className="flex items-center text-blue-900">
                                            <span className="font-medium">
                                              {getUserName(movement.transferData.sentBy)}
                                            </span>
                                            <span className="mx-1 text-gray-400">/</span>
                                            <span className={movement.transferData.receivedBy ? 'text-green-900 font-medium' : 'text-yellow-600'}>
                                              {movement.transferData.receivedBy ? getUserName(movement.transferData.receivedBy) : 'Aguardando'}
                                            </span>
                                          </div>
                                          {movement.transferData.receivedBy && (
                                            <Badge variant="success" size="sm">
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Recebido
                                            </Badge>
                                          )}
                                          {movement.transferData.transferStatus === 'pending' && (
                                            <Badge variant="warning" size="sm">
                                              <Clock className="w-3 h-3 mr-1" />
                                              Pendente
                                            </Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-gray-500">
                                          {getUserName(movement.userId)}/Aguardando
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                                
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end space-x-2">
                                    {/* Debug detalhado */}
                                    {(() => {
                                      console.log('🔍 [DEBUG COMPLETO] Movimento:', {
                                        id: movement.id,
                                        type: movement.type,
                                        transferData: movement.transferData,
                                        transferStatus: movement.transferData?.transferStatus,
                                        hasTransferData: !!movement.transferData,
                                        isTransfer: movement.type === 'transfer',
                                        isPending: movement.transferData?.transferStatus === 'pending',
                                        shouldShowButton: movement.type === 'transfer' && movement.transferData?.transferStatus === 'pending',
                                        allKeys: Object.keys(movement),
                                        transferDataKeys: movement.transferData ? Object.keys(movement.transferData) : 'NO_TRANSFER_DATA'
                                      });
                                      return null;
                                    })()}
                                    
                                    {/* BOTÃO RECEBER - FORÇADO PARA TRANSFERÊNCIAS */}
                                    {movement.type === 'transfer' && (
                                      <Button
                                        variant="success"
                                        size="sm"
                                        onClick={() => {
                                          console.log('🚚 Clicou em Receber para movimento:', movement.id);
                                          handleReceive(movement);
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                      >
                                        <Truck className="w-4 h-4 mr-1" />
                                        Receber
                                      </Button>
                                    )}
                                    
                                    {/* Botão Aprovar para Entradas */}
                                    {movement.type === 'entry' && 
                                     (!movement.approvalStatus || movement.approvalStatus === 'pending') && 
                                     hasRole('admin') && (
                                      <Button
                                        variant="warning"
                                        size="sm"
                                        onClick={() => handleApprove(movement)}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Aprovar
                                      </Button>
                                    )}
                                    
                                    {/* Botão Editar (apenas admin) */}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewDetails(movement)}
                                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    
                                    {/* Botão Editar (apenas admin) - removido por enquanto */}
                                    {false && hasRole('admin') && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleViewDetails(movement)}
                                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedMovement && (
        <ApprovalModal
          movement={selectedMovement}
          product={products.find(p => p.id === selectedMovement.productId)}
          onApprove={handleApprovalSubmit}
          onReject={handleApprovalReject}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedMovement(null);
          }}
        />
      )}

      {/* Transfer Receive Modal */}
      {showReceiveModal && selectedMovement && selectedMovement.type === 'transfer' && (
        <TransferReceiveModal
          movement={selectedMovement}
          product={products.find(p => p.id === selectedMovement.productId)}
          onReceive={handleReceiveSubmit}
          onClose={() => {
            console.log('🚪 Fechando modal de recebimento');
            setShowReceiveModal(false);
            setSelectedMovement(null);
          }}
        />
      )}

      {/* Movement Details Modal */}
      {showDetailsModal && selectedMovement && (
        <MovementDetailsModal
          movement={selectedMovement}
          product={products.find(p => p.id === selectedMovement.productId)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMovement(null);
          }}
        />
      )}
      
    </div>
  );
}
