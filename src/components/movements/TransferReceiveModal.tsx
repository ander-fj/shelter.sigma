import { useState, useEffect, useRef } from 'react';
import { StockMovement, Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../contexts/InventoryContext';
import { userService } from '../../services/userService';
import { ImageViewerModal } from './ImageViewerModal'; // Import do novo componente
import {
  X,
  Package,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  MapPin,
  User,
  FileText,
  AlertTriangle,
  Clock,
  Upload,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../../utils/dateUtils';

interface TransferReceiveModalProps {
  movement: StockMovement;
  product: Product | undefined;
  onReceive: (data: {
    status: 'received' | 'rejected';
    notes?: string;
    rejectionReason?: string;
    attachments?: string[];
  }) => void;
  onClose: () => void;
}

export function TransferReceiveModal({
  movement,
  product,
  onReceive,
  onClose
}: TransferReceiveModalProps) {
  const { user } = useAuth();
  const { products, addProduct, updateProduct } = useInventory();
  const [action, setAction] = useState<'receive' | 'reject' | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<string[]>(movement.attachments || []);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Estados para o modal de visualização de imagem
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, alt: string}>({url: '', alt: ''});

  // Load user names
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(u => {
          namesMap[u.id] = u.name;
        });
        setUserNames(namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };

    loadUserNames();
  }, []);

  // Função para abrir o modal de visualização de imagem
  const handleImageClick = (imageUrl: string, imageAlt: string) => {
    setSelectedImage({ url: imageUrl, alt: imageAlt });
    setImageViewerOpen(true);
  };

  // Função para lidar com a lógica de transferência de produtos
  const handleProductTransferLogic = async (movement: StockMovement, transferData: any) => {
    try {
      console.log('🚚 [TRANSFER] Iniciando lógica de transferência:', {
        movementId: movement.id,
        productId: movement.productId,
        quantity: movement.quantity,
        fromWarehouse: transferData.fromWarehouse,
        toWarehouse: transferData.toWarehouse
      });

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

        // Criar novo produto no armazém de destino
        const newProductData = {
          name: sourceProduct.name,
          description: sourceProduct.description,
          sku: sourceProduct.sku, // Manter mesmo SKU
          barcode: sourceProduct.barcode,
          category: sourceProduct.category,
          subcategory: sourceProduct.subcategory,
          supplier: sourceProduct.supplier,
          purchasePrice: sourceProduct.purchasePrice,
          salePrice: sourceProduct.salePrice,
          unit: sourceProduct.unit,
          location: {
            id: `${transferData.toWarehouse}-${sourceProduct.location.aisle}-${sourceProduct.location.shelf}-${sourceProduct.location.position || ''}`,
            warehouse: transferData.toWarehouse,
            aisle: sourceProduct.location.aisle,
            shelf: sourceProduct.location.shelf,
            position: sourceProduct.location.position
          },
          currentStock: movement.quantity, // Quantidade transferida
          minStock: sourceProduct.minStock,
          maxStock: sourceProduct.maxStock,
          batch: sourceProduct.batch,
          expiryDate: sourceProduct.expiryDate,
          images: sourceProduct.images,
          isActive: sourceProduct.isActive,
          operatorStatus: sourceProduct.operatorStatus
        };

        await addProduct(newProductData);
        console.log('✅ Novo produto criado no armazém de destino:', {
          name: newProductData.name,
          warehouse: newProductData.location.warehouse,
          stock: newProductData.currentStock
        });
      }

      console.log('🎉 Lógica de transferência concluída com sucesso');
    } catch (error) {
      console.error('❌ Erro na lógica de transferência:', error);
      throw error;
    }
  };

  // Helper function to get user name
  const getUserName = (userId: string): string => {
    console.log('🔍 [DEBUG] Getting user name for ID:', userId);
    console.log('🔍 [DEBUG] Available userNames:', userNames);

    if (userNames[userId]) {
      console.log('✅ [DEBUG] Found in userNames:', userNames[userId]);
      return userNames[userId];
    }

    // Fallback names for known user IDs
    const fallbackNames: Record<string, string> = {
      'PJ30Q63zDfMqeKnXiomb': 'Renan',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos',
      '1': 'Admin Master'
    };

    const fallbackName = fallbackNames[userId];
    if (fallbackName) {
      console.log('✅ [DEBUG] Found in fallback:', fallbackName);
      return fallbackName;
    }

    console.log('❌ [DEBUG] No name found, using default for:', userId);
    return `Usuário ${userId.substring(0, 8)}`;
  };

  // Função completa para lidar com a lógica de transferência
  const handleCompleteTransferLogic = async (movement: StockMovement, transferData: any) => {
    try {
      console.log('🚚 [COMPLETE-TRANSFER] Iniciando transferência completa:', {
        movementId: movement.id,
        productId: movement.productId,
        quantity: movement.quantity,
        fromWarehouse: transferData.fromWarehouse,
        toWarehouse: transferData.toWarehouse
      });

      // 1. Encontrar produto de origem
      const sourceProduct = products.find(p => p.id === movement.productId);
      if (!sourceProduct) {
        throw new Error('Produto de origem não encontrado');
      }

      console.log('📦 [COMPLETE-TRANSFER] Produto de origem encontrado:', {
        name: sourceProduct.name,
        sku: sourceProduct.sku,
        currentStock: sourceProduct.currentStock,
        warehouse: sourceProduct.location.warehouse
      });

      // 2. Verificar se produto já existe no armazém de destino
      const existingProductInDestination = products.find(p =>
        p.sku === sourceProduct.sku &&
        p.location.warehouse === transferData.toWarehouse
      );

      if (existingProductInDestination) {
        // 3a. Produto já existe no destino - somar quantidades
        console.log('✅ [COMPLETE-TRANSFER] Produto já existe no destino - somando quantidades:', {
          existingId: existingProductInDestination.id,
          existingStock: existingProductInDestination.currentStock,
          transferQuantity: movement.quantity,
          newStock: existingProductInDestination.currentStock + movement.quantity
        });

        await updateProduct(existingProductInDestination.id, {
          currentStock: existingProductInDestination.currentStock + movement.quantity,
          updatedAt: new Date()
        });

        console.log('✅ [COMPLETE-TRANSFER] Estoque atualizado no produto existente');
      } else {
        // 3b. Produto não existe no destino - criar novo produto
        console.log('🆕 [COMPLETE-TRANSFER] Produto não existe no destino - criando novo:', {
          originalLocation: sourceProduct.location,
          newWarehouse: transferData.toWarehouse,
          quantity: movement.quantity
        });

        // Criar novo produto no armazém de destino com os mesmos dados
        const newProductData = {
          name: sourceProduct.name,
          description: sourceProduct.description,
          sku: sourceProduct.sku, // Manter mesmo SKU
          barcode: sourceProduct.barcode,
          category: sourceProduct.category,
          subcategory: sourceProduct.subcategory,
          supplier: sourceProduct.supplier,
          purchasePrice: sourceProduct.purchasePrice,
          salePrice: sourceProduct.salePrice,
          unit: sourceProduct.unit,
          location: {
            id: `${transferData.toWarehouse}-${sourceProduct.location.aisle}-${sourceProduct.location.shelf}-${sourceProduct.location.position || ''}`,
            warehouse: transferData.toWarehouse, // Novo armazém
            aisle: sourceProduct.location.aisle,
            shelf: sourceProduct.location.shelf,
            position: sourceProduct.location.position
          },
          currentStock: movement.quantity, // Quantidade transferida
          minStock: sourceProduct.minStock,
          maxStock: sourceProduct.maxStock,
          batch: sourceProduct.batch,
          expiryDate: sourceProduct.expiryDate,
          images: sourceProduct.images,
          isActive: sourceProduct.isActive,
          operatorStatus: sourceProduct.operatorStatus
        };

        console.log('🆕 [COMPLETE-TRANSFER] Dados do novo produto:', {
          name: newProductData.name,
          sku: newProductData.sku,
          warehouse: newProductData.location.warehouse,
          stock: newProductData.currentStock,
          location: newProductData.location
        });

        await addProduct(newProductData);
        console.log('✅ [COMPLETE-TRANSFER] Novo produto criado no armazém de destino');
      }

      // 4. Subtrair quantidade do produto de origem (já foi feito na movimentação original)
      console.log('ℹ️ [COMPLETE-TRANSFER] Quantidade já foi subtraída do produto origem na movimentação original');
      console.log('📊 [COMPLETE-TRANSFER] Estoque origem após transferência:', {
        productName: sourceProduct.name,
        originalStock: movement.previousStock,
        newStock: movement.newStock,
        quantityTransferred: movement.quantity
      });

      console.log('🎉 [COMPLETE-TRANSFER] Transferência completa finalizada com sucesso!');

    } catch (error) {
      console.error('❌ [COMPLETE-TRANSFER] Erro na transferência:', error);
      throw error;
    }
  };

  // Firebase upload function - UPDATED FOR FIREBASE
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    try {
      const newAttachments: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`Arquivo ${file.name} é muito grande. Máximo 5MB.`);
          continue;
        }

        // TODO: Implement Firebase Storage upload
        // const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
        // const uploadTask = uploadBytes(storageRef, file);
        // const downloadURL = await getDownloadURL(uploadTask.ref);
        // newAttachments.push(downloadURL);

        // For now, convert to base64 as fallback
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve) => {
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.readAsDataURL(file);
        });

        newAttachments.push(fileData);
      }

      setAttachments((prev: any) => ([...prev, ...newAttachments]));
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      alert('Erro ao fazer upload do arquivo. Tente novamente.');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev: any) => {
      const a = Array.isArray(prev) ? [...prev] : [];
      a.splice(index, 1);
      return a;
    });
  };

  // Create fallback transferData if missing
  const transferData = movement.transferData || {
    fromWarehouse: 'Origem não especificada',
    toWarehouse: 'Destino não especificado',
    transferStatus: 'pending',
    sentBy: movement.userId,
    sentAt: movement.createdAt,
    trackingCode: `TRF-${movement.id.substring(0, 8)}`,
    receivedBy: undefined,
    receivedAt: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
    expectedDeliveryDate: undefined,
    actualDeliveryDate: undefined,
    transportNotes: undefined
  };

  console.log('🚚 [MODAL] TransferData usado:', {
    original: movement.transferData,
    fallback: !movement.transferData,
    final: transferData
  });

  const handleConfirm = async () => {
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Motivo da rejeição é obrigatório');
      return;
    }

    setLoading(true);

    console.log('🚚 [MODAL] Confirmando recebimento:', {
      action,
      movementId: movement.id,
      hasOriginalTransferData: !!movement.transferData,
      usingFallback: !movement.transferData
    });

    // Se foi recebido, executar lógica de transferência ANTES de atualizar o movimento
    if (action === 'receive') {
      try {
        console.log('🚚 [TRANSFER] Iniciando lógica completa de transferência...');
        await handleCompleteTransferLogic(movement, transferData);
        console.log('✅ [TRANSFER] Lógica de transferência concluída com sucesso');
      } catch (error) {
        console.error('❌ [TRANSFER] Erro na lógica de transferência:', error);
        setLoading(false);
        alert('Erro ao processar transferência: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
        return;
      }
    }

    onReceive({
      status: action as 'received' | 'rejected',
      notes: notes.trim() || undefined,
      rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Aguardando Recebimento',
          variant: 'warning' as const,
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50'
        };
      case 'in_transit':
        return {
          label: 'Em Trânsito',
          variant: 'info' as const,
          icon: Truck,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50'
        };
      case 'received':
        return {
          label: 'Recebido',
          variant: 'success' as const,
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50'
        };
      case 'rejected':
        return {
          label: 'Rejeitado',
          variant: 'destructive' as const,
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50'
        };
      default:
        return {
          label: 'Status Desconhecido',
          variant: 'secondary' as const,
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50'
        };
    }
  };

  const statusInfo = getStatusInfo(transferData.transferStatus);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Receber Transferência</h2>
              <p className="text-sm text-gray-600 mt-1">
                Confirme o recebimento dos produtos transferidos
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Transfer Information */}
            <Card className="bg-blue-50 border-blue-200 border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Informações da Transferência
                  </h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    ✅ Como Validar o Recebimento
                  </h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>📦 <strong>Verifique</strong> se os produtos chegaram em boas condições</p>
                    <p>🔢 <strong>Confirme</strong> as quantidades recebidas</p>
                    <p>📝 <strong>Adicione</strong> observações e anexos, se necessário</p>
                    <p>✅ <strong>Confirme</strong> o recebimento ou ❌ <strong>Rejeite</strong> a transferência</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Código de Rastreamento</label>
                    <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-mono text-gray-900">{transferData.trackingCode}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Status</label>
                    <Badge variant={statusInfo.variant} className="mt-1">
                      <statusInfo.icon className={`w-3 h-3 mr-1 ${statusInfo.color}`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Armazém de Origem</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{transferData.fromWarehouse}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Armazém de Destino</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{transferData.toWarehouse}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Enviado Por</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{getUserName(transferData.sentBy)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Data de Envio</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">
                        {safeFormatDate(transferData.sentAt, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>

                {transferData.expectedDeliveryDate && (
                  <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">
                        Entrega prevista: {safeFormatDate(transferData.expectedDeliveryDate, 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                )}

                {transferData.transportNotes && (
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <FileText className="w-4 h-4 text-gray-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">Observações do Transporte:</p>
                        <p className="text-sm text-gray-700 mt-1">{transferData.transportNotes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movement Details */}
            <Card className="bg-gray-50 border-gray-200 border-2">
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Detalhes da Movimentação
                </h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Motivo</label>
                    <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{movement.reason}</p>
                    </div>
                  </div>

                  {movement.obra && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Obra</label>
                      <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{movement.obra}</p>
                      </div>
                    </div>
                  )}

                  {movement.notaFiscal && (
                    <div>
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nota Fiscal</label>
                      <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm font-mono text-gray-900">{movement.notaFiscal}</p>
                      </div>
                    </div>
                  )}

                  {movement.notes && (
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Observações</label>
                      <div className="mt-1 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-900">{movement.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Product Information */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Produto a Receber
                </h3>
              </CardHeader>
              <CardContent>
                {product ? (
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      {product.images && product.images[0] ? (
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
                      <p className="text-gray-600">SKU: {product.sku}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-gray-500">
                          Quantidade: {movement.quantity} {product.unit}
                        </span>
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

            {/* Attachments Section - MODIFICADO PARA USAR O MODAL */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Anexos da Movimentação
                </h3>
              </CardHeader>
              <CardContent>
                {movement.attachments && movement.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {movement.attachments.map((attachment, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden shadow-md">
                        {attachment.startsWith('data:image') ? (
                          <img src={attachment} alt={`Anexo ${index + 1}`} className="w-full h-32 object-cover" />
                        ) : (
                          <div className="w-full h-32 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
                            <FileText className="w-8 h-8" />
                            <span className="ml-2">Documento</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {attachment.startsWith('data:image') ? (
                            <button
                              onClick={() => handleImageClick(attachment, `Anexo ${index + 1}`)}
                              className="text-white p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                              title="Visualizar Imagem"
                            >
                              <Eye className="w-5 h-5" />
                            </button>
                          ) : (
                            <a
                              href={attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white p-2 rounded-full bg-blue-600 hover:bg-blue-700"
                              title="Visualizar Anexo"
                            >
                              <Eye className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Nenhum anexo nesta movimentação.</p>
                )}

                {/* New Attachments Upload Section */}
                <div className="mt-6 space-y-4">
                  <h4 className="text-md font-semibold text-gray-900 flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Novos Anexos (Opcional)
                  </h4>

                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="file-upload-modal"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                        </p>
                        <p className="text-xs text-gray-500">
                          PDF, JPG, PNG, DOC, XLS (MAX. 5MB cada)
                        </p>
                      </div>
                      <input
                        id="file-upload-modal"
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                      />
                    </label>
                  </div>

                  {uploadingFile && (
                    <div className="flex items-center space-x-2 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                      <Upload className="w-5 h-5 text-blue-600 animate-pulse" />
                      <p className="text-sm font-medium text-blue-800">Enviando arquivo...</p>
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Anexos a serem enviados com o recebimento:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border border-gray-200 rounded-md bg-white text-sm"
                          >
                            <span className="truncate">
                              {attachment.startsWith('data:image') ? `Imagem ${index + 1}` : `Documento ${index + 1}`}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Selection */}
            {(transferData.transferStatus === 'pending' || transferData.transferStatus === 'in_transit') && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Confirmar Recebimento da Transferência
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Escolha uma das opções abaixo para processar esta transferência
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button
                      onClick={() => setAction('receive')}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 text-center hover:shadow-lg ${
                        action === 'receive'
                          ? 'border-green-500 bg-green-50 shadow-md transform scale-105'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50 hover:scale-102'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          action === 'receive' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <CheckCircle className={`w-8 h-8 ${action === 'receive' ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${action === 'receive' ? 'text-green-900' : 'text-gray-900'}`}>
                            Confirmar Recebimento
                          </p>
                          <p className={`text-sm mt-2 ${action === 'receive' ? 'text-green-700' : 'text-gray-600'}`}>
                            Produtos recebidos em boas condições
                          </p>
                          <div className="mt-3 space-y-1 text-xs text-left">
                            <p className={action === 'receive' ? 'text-green-600' : 'text-gray-500'}>
                              ✅ Estoque será atualizado automaticamente
                            </p>
                            <p className={action === 'receive' ? 'text-green-600' : 'text-gray-500'}>
                              ✅ Status mudará para "Recebido"
                            </p>
                            <p className={action === 'receive' ? 'text-green-600' : 'text-gray-500'}>
                              ✅ Histórico será registrado
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setAction('reject')}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 text-center hover:shadow-lg ${
                        action === 'reject'
                          ? 'border-red-500 bg-red-50 shadow-md transform scale-105'
                          : 'border-gray-200 hover:border-red-300 hover:bg-red-50 hover:scale-102'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-3">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                          action === 'reject' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <XCircle className={`w-8 h-8 ${action === 'reject' ? 'text-red-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${action === 'reject' ? 'text-red-900' : 'text-gray-900'}`}>
                            Rejeitar Transferência
                          </p>
                          <p className={`text-sm mt-2 ${action === 'reject' ? 'text-red-700' : 'text-gray-600'}`}>
                            Produtos com problemas ou não recebidos
                          </p>
                          <div className="mt-3 space-y-1 text-xs text-left">
                            <p className={action === 'reject' ? 'text-red-600' : 'text-gray-500'}>
                              ❌ Transferência será cancelada
                            </p>
                            <p className={action === 'reject' ? 'text-red-600' : 'text-gray-500'}>
                              🔄 Estoque de origem será restaurado
                            </p>
                            <p className={action === 'reject' ? 'text-red-600' : 'text-gray-500'}>
                              📝 Motivo da rejeição será registrado
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Notes Section */}
                  {action && (
                    <div className="mt-6 space-y-4">
                      {action === 'reject' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Motivo da Rejeição *
                          </label>
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Descreva o motivo da rejeição (ex: produtos danificados, quantidade incorreta, etc.)"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                            rows={3}
                            required
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Observações Adicionais (Opcional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Adicione observações sobre o recebimento, condições dos produtos, etc."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {action && (
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAction(null);
                          setNotes('');
                          setRejectionReason('');
                        }}
                        disabled={loading}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleConfirm}
                        disabled={loading || (action === 'reject' && !rejectionReason.trim())}
                        className={`${
                          action === 'receive'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        } text-white`}
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Processando...</span>
                          </div>
                        ) : (
                          <>
                            {action === 'receive' ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Confirmar Recebimento
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Rejeitar Transferência
                              </>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status Information for completed transfers */}
            {transferData.transferStatus === 'received' && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Transferência Recebida</h3>
                      <p className="text-green-700">
                        Esta transferência já foi recebida em {safeFormatDate(transferData.receivedAt, 'dd/MM/yyyy HH:mm')}
                        {transferData.receivedBy && ` por ${getUserName(transferData.receivedBy)}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {transferData.transferStatus === 'rejected' && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <XCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-900">Transferência Rejeitada</h3>
                      <p className="text-red-700">
                        Esta transferência foi rejeitada em {safeFormatDate(transferData.rejectedAt, 'dd/MM/yyyy HH:mm')}
                        {transferData.rejectedBy && ` por ${getUserName(transferData.rejectedBy)}`}
                      </p>
                      {transferData.rejectionReason && (
                        <p className="text-red-600 mt-2 font-medium">
                          Motivo: {transferData.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Visualização de Imagem */}
      <ImageViewerModal
        isOpen={imageViewerOpen}
        imageUrl={selectedImage.url}
        imageAlt={selectedImage.alt}
        onClose={() => setImageViewerOpen(false)}
      />
    </>
  );
}
