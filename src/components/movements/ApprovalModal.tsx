import { useState, useRef, useEffect } from 'react';
import { StockMovement, Product, MovementClassification } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { ImageViewerModal } from './ImageViewerModal';
import { 
  X, 
  Package, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Minus,
  AlertTriangle,
  Recycle,
  Trash2,
  RotateCcw,
  FileText,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Upload,
  Eye,
  DollarSign,
  Building,
  MapPin,
  Truck,
  Hash,
  Info,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApprovalModalProps {
  movement: StockMovement;
  product: Product | undefined;
  onApprove: (classifications: MovementClassification[], notes: string, attachments?: string[]) => void;
  onReject: (notes: string, attachments?: string[]) => void;
  onClose: () => void;
}

export function ApprovalModal({ 
  movement, 
  product, 
  onApprove, 
  onReject, 
  onClose 
}: ApprovalModalProps) {
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [reempregoQuantity, setReempregoQuantity] = useState(0);
  const [sucataQuantity, setSucataQuantity] = useState(0);
  const [reempregoNotes, setReempregoNotes] = useState('');
  const [sucataNotes, setSucataNotes] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para anexos
  const [attachments, setAttachments] = useState<string[]>(movement.attachments || []);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Estados para o modal de visualização de imagem
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{url: string, alt: string}>({url: '', alt: ''});

  const totalQuantity = movement.quantity;
  
  // Detecção do tipo compra (case insensitive)
  const isCompraType = movement.reason?.toLowerCase() === 'compra';

  // Load user names
  useEffect(() => {
    const loadUserNames = async () => {
      try {
        const { userService } = await import('../../services/userService');
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(u => {
          namesMap[u.id] = u.name;
          namesMap[u.email] = u.name;
        });
        
        // Add specific mappings
        namesMap['PJ30Q63zDfMqeKnXiomb'] = 'Renan';
        namesMap['xhRq1kFYtq7XkVbWeOsw'] = 'Anderson Jataí';
        namesMap['4ke3Tbb6eAXjw1nN9PFZ'] = 'Anderson Jataí';
        namesMap['admin'] = 'Admin Master';
        namesMap['manager'] = 'Maria Silva';
        namesMap['operator'] = 'João Santos';
        
        setUserNames(namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };
    
    loadUserNames();
  }, []);

  // Helper function to get user name
  const getUserName = (userId: string): string => {
    if (userNames[userId]) {
      return userNames[userId];
    }
    
    // Fallback names
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
    
    return fallbackNames[userId] || `Usuário ${userId.substring(0, 8)}`;
  };

  // Função para formatar valores em BRL
  const formatBRL = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter o tipo de movimentação em português
  const getMovementTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'entry': 'Entrada',
      'exit': 'Saída', 
      'transfer': 'Transferência',
      'adjustment': 'Ajuste'
    };
    return types[type] || type;
  };

  useEffect(() => {
    // Initialize with existing classifications if any
    if (movement.classifications && movement.classifications.length > 0) {
      movement.classifications.forEach(classification => {
        if (classification.type === 'reemprego') {
          setReempregoQuantity(classification.quantity);
          setReempregoNotes(classification.notes || '');
        } else if (classification.type === 'sucata') {
          setSucataQuantity(classification.quantity);
          setSucataNotes(classification.notes || '');
        }
      });
    }
  }, [movement]);

  // Função para abrir o modal de visualização de imagem
  const handleImageClick = (imageUrl: string, imageAlt: string) => {
    setSelectedImage({ url: imageUrl, alt: imageAlt });
    setImageViewerOpen(true);
  };

  // Função para fechar o modal de visualização
  const handleCloseImageViewer = () => {
    setImageViewerOpen(false);
    setSelectedImage({ url: '', alt: '' });
  };

  // Função para upload de arquivos
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

        // Convert to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;
        newAttachments.push(base64);
      }

      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Erro ao fazer upload dos arquivos:', error);
      alert('Erro ao fazer upload dos arquivos. Tente novamente.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Função para remover anexo
  const removeAttachment = (index: number) => {
    setAttachments((prev: any) => {
      const a = Array.isArray(prev) ? [...prev] : [];
      a.splice(index, 1);
      return a;
    });
  };

  const handleReempregoChange = (value: number) => {
    const newValue = Math.max(0, Math.min(value, totalQuantity));
    setReempregoQuantity(newValue);
    
    // Auto-adjust sucata if total would exceed movement quantity
    const remaining = totalQuantity - newValue;
    if (sucataQuantity > remaining) {
      setSucataQuantity(remaining);
    }
  };

  const handleSucataChange = (value: number) => {
    const newValue = Math.max(0, Math.min(value, totalQuantity));
    setSucataQuantity(newValue);
    
    // Auto-adjust reemprego if total would exceed movement quantity
    const remaining = totalQuantity - newValue;
    if (reempregoQuantity > remaining) {
      setReempregoQuantity(remaining);
    }
  };

  const handleAllReemprego = () => {
    setReempregoQuantity(totalQuantity);
    setSucataQuantity(0);
  };

  const handleAllSucata = () => {
    setSucataQuantity(totalQuantity);
    setReempregoQuantity(0);
  };

  const handleSplitHalf = () => {
    const half = Math.floor(totalQuantity / 2);
    setReempregoQuantity(half);
    setSucataQuantity(totalQuantity - half);
  };

  const validateQuantities = () => {
    // Se for tipo compra, não precisa validar quantidades de classificação
    if (isCompraType) {
      return true;
    }

    const newErrors: string[] = [];
    const total = reempregoQuantity + sucataQuantity;
    
    if (total === 0) {
      newErrors.push('Deve classificar pelo menos uma quantidade');
    }
    
    if (total > totalQuantity) {
      newErrors.push(`Total classificado (${total}) não pode exceder quantidade da movimentação (${totalQuantity})`);
    }
    
    if (total < totalQuantity) {
      newErrors.push(`Total classificado (${total}) deve ser igual à quantidade da movimentação (${totalQuantity})`);
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleApprove = () => {
    if (!validateQuantities()) return;

    setLoading(true);
    const classifications: MovementClassification[] = [];
    
    // Se não for tipo compra, incluir classificações
    if (!isCompraType) {
      if (reempregoQuantity > 0) {
        classifications.push({
          type: 'reemprego',
          quantity: reempregoQuantity,
          notes: reempregoNotes.trim() || undefined
        });
      }
      
      if (sucataQuantity > 0) {
        classifications.push({
          type: 'sucata',
          quantity: sucataQuantity,
          notes: sucataNotes.trim() || undefined
        });
      }
    }

    onApprove(classifications, approvalNotes.trim(), attachments);
    
    // Fechar modal e atualizar página após 2 segundos
    setTimeout(() => {
      setLoading(false);
      onClose();
      // Atualizar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }, 1000);
  };

  const handleReject = () => {
    if (!approvalNotes.trim()) {
      setErrors(['Motivo da rejeição é obrigatório']);
      return;
    }
    setLoading(true);
    onReject(approvalNotes.trim(), attachments);
    
    // Fechar modal e atualizar página após 2 segundos
    setTimeout(() => {
      setLoading(false);
      onClose();
      // Atualizar página após 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }, 1000);
  };

  const isBalanced = isCompraType || (reempregoQuantity + sucataQuantity) === totalQuantity;
  const totalClassified = reempregoQuantity + sucataQuantity;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Aprovação de Movimentação</h2>
                  <p className="text-sm text-gray-600">
                    {isCompraType 
                      ? 'Aprove ou rejeite esta movimentação de compra'
                      : 'Classifique os materiais como Reemprego ou Sucata'
                    }
                  </p>
                  <div className="mt-2">
                    <p className="text-lg font-bold text-gray-900">
                      {getUserName(movement.userId)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Usuário responsável
                    </p>
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* SEÇÃO NOVA: Detalhes Completos da Movimentação */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                  <Info className="w-5 h-5 mr-2" />
                  Detalhes Completos da Movimentação
                </h3>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">Tipo de Movimentação</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-900">{getMovementTypeLabel(movement.type)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">Motivo</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="success" size="sm">{movement.reason}</Badge>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">Quantidade</label>
                    <p className="text-lg font-bold text-blue-900 mt-2">
                      {movement.quantity} {product?.unit || 'UN'}
                    </p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">Data</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-900">
                        {format(movement.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informações do Produto */}
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <label className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-3 block">Produto</label>
                  <div className="flex items-center space-x-4">
                    {product?.images && product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover border-2 border-blue-200"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 text-lg">
                        {product?.name || 'Produto não encontrado'}
                      </h4>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-1">
                          <Hash className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-700">SKU: {product?.sku || 'N/A'}</span>
                        </div>
                        {product?.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-700">
                              {product.location.warehouse} - {product.location.aisle}{product.location.shelf}
                              {product.location.position && `-${product.location.position}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-blue-700">
                          Estoque Anterior: {movement.previousStock} {product?.unit || 'UN'}
                        </span>
                        <span className="text-sm text-blue-700">→</span>
                        <span className="text-sm font-semibold text-blue-900">
                          Novo Estoque: {movement.newStock} {product?.unit || 'UN'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informações Específicas por Tipo */}
                {/* Preço para Compras - SEMPRE MOSTRAR PARA COMPRAS */}
                {isCompraType && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <label className="text-xs font-medium text-green-600 uppercase tracking-wide mb-3 block">Informações de Compra</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-700">Preço Unitário</p>
                          <p className="text-lg font-bold text-green-900">
                            {movement.price && movement.price > 0 ? formatBRL(movement.price) : formatBRL(product?.purchasePrice || 0)}
                          </p>
                          {(!movement.price || movement.price === 0) && product?.purchasePrice && (
                            <p className="text-xs text-blue-600">💡 Usando preço cadastrado do produto</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Package className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-700">Quantidade</p>
                          <p className="text-lg font-bold text-green-900">{movement.quantity}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm text-green-700">Valor Total</p>
                          <p className="text-xl font-bold text-green-900">
                            {movement.price && movement.price > 0 ? 
                              formatBRL(movement.price * movement.quantity) : 
                              formatBRL((product?.purchasePrice || 0) * movement.quantity)}
                          </p>
                          {(!movement.price || movement.price === 0) && product?.purchasePrice && (
                            <p className="text-xs text-blue-600">💡 Calculado com preço do produto</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nota Fiscal */}
                {movement.notaFiscal && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2 block">Nota Fiscal</label>
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">{movement.notaFiscal}</span>
                    </div>
                  </div>
                )}

                {/* Obra */}
                {movement.obra && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <label className="text-xs font-medium text-yellow-600 uppercase tracking-wide mb-2 block">Obra</label>
                    <div className="flex items-center space-x-2">
                      <Building className="w-5 h-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-900">{movement.obra}</span>
                    </div>
                  </div>
                )}

                {/* Informações de Transferência */}
                {movement.transferData && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <label className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-3 block">Dados da Transferência</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-600">Origem</p>
                          <p className="font-semibold text-purple-900">{movement.transferData.fromWarehouse}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Building className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-600">Destino</p>
                          <p className="font-semibold text-purple-900">{movement.transferData.toWarehouse}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Truck className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-purple-600">Código de Rastreamento</p>
                          <p className="font-semibold text-purple-900">{movement.transferData.trackingCode}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={movement.transferData.transferStatus === 'pending' ? 'warning' : 'success'}>
                          {movement.transferData.transferStatus === 'pending' ? 'Pendente' : 
                           movement.transferData.transferStatus === 'sent' ? 'Enviado' : 
                           movement.transferData.transferStatus === 'received' ? 'Recebido' : 'Rejeitado'}
                        </Badge>
                      </div>
                    </div>
                    
                    {movement.transferData.expectedDeliveryDate && (
                      <div className="mt-3 flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-700">
                          Entrega Esperada: {format(new Date(movement.transferData.expectedDeliveryDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    
                    {movement.transferData.transportNotes && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Observações do Transporte</p>
                        <p className="text-sm text-purple-900 mt-1">{movement.transferData.transportNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Lote */}
                {movement.batch && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">Lote</label>
                    <div className="flex items-center space-x-2">
                      <Hash className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-900">{movement.batch}</span>
                    </div>
                  </div>
                )}

                {/* Observações */}
                {movement.notes && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">Observações</label>
                    <p className="text-sm text-gray-900">{movement.notes}</p>
                  </div>
                )}

                {/* Usuário que criou */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">Solicitado por</label>
                  <div className="flex items-center space-x-2">
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">{getUserName(movement.userId)}</span>
                  </div>
                </div>

                {/* Dados Financeiros Detalhados */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <label className="text-xs font-medium text-green-600 uppercase tracking-wide">Preço Unitário</label>
                    <p className="text-lg font-bold text-green-900 mt-2">
                      {movement.price && movement.price > 0 ? 
                        formatBRL(movement.price) : 
                        product ? formatBRL(product.purchasePrice) : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {movement.price && movement.price > 0 ? 
                        '💰 Preço informado na movimentação' : 
                        '📋 Preço cadastrado do produto'}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wide">Quantidade</label>
                    <p className="text-lg font-bold text-blue-900 mt-2">
                      {movement.quantity} {product?.unit || 'UN'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {movement.type === 'entry' ? '📈 Entrada' : 
                       movement.type === 'exit' ? '📉 Saída' : 
                       movement.type === 'transfer' ? '🚚 Transferência' : '🔧 Ajuste'}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <label className="text-xs font-medium text-purple-600 uppercase tracking-wide">Valor Total</label>
                    <p className="text-lg font-bold text-purple-900 mt-2">
                      {formatBRL(movement.quantity * (movement.price || product?.purchasePrice || 0))}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      💵 Valor da movimentação
                    </p>
                  </div>
                </div>

                {/* Informações do Produto Detalhadas */}
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <label className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-3 block">Informações Completas do Produto</label>
                  {product ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-indigo-700 font-medium">Nome:</p>
                        <p className="text-indigo-900 font-semibold">{product.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-700 font-medium">SKU:</p>
                        <p className="text-indigo-900 font-mono">{product.sku}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-700 font-medium">Categoria:</p>
                        <p className="text-indigo-900">{product.category.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-700 font-medium">Fornecedor:</p>
                        <p className="text-indigo-900">{product.supplier.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-700 font-medium">Localização:</p>
                        <p className="text-indigo-900">
                          {product.location.warehouse} - {product.location.aisle}{product.location.shelf}
                          {product.location.position && `-${product.location.position}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-indigo-700 font-medium">Preço Cadastrado:</p>
                        <p className="text-indigo-900 font-semibold">{formatBRL(product.purchasePrice)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-indigo-700">Produto não encontrado</p>
                  )}
                </div>

                {/* Impacto no Estoque */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3 block">Impacto no Estoque</label>
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
                </div>

                {/* ID da Movimentação */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2 block">ID da Movimentação</label>
                  <p className="text-sm font-mono text-gray-900">{movement.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Anexos Existentes */}
            {movement.attachments && movement.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Anexos da Movimentação
                  </h3>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Quantity Classification - OCULTO PARA TIPO COMPRA */}
            {!isCompraType && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Classificação de Quantidades</h3>
                  <p className="text-gray-600">Divida a quantidade total entre Reemprego e Sucata</p>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-center space-x-4">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleAllReemprego}
                    className="flex items-center space-x-2"
                  >
                    <Recycle className="w-4 h-4" />
                    <span>Tudo Reemprego</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSplitHalf}
                    className="flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Dividir Meio a Meio</span>
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleAllSucata}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Tudo Sucata</span>
                  </Button>
                </div>

                {/* Classification Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Reemprego */}
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Recycle className="w-5 h-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-900">Reemprego</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReempregoChange(reempregoQuantity - 1)}
                          disabled={reempregoQuantity <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          value={reempregoQuantity}
                          onChange={(e) => handleReempregoChange(parseInt(e.target.value) || 0)}
                          className="text-center"
                          min="0"
                          max={totalQuantity}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReempregoChange(reempregoQuantity + 1)}
                          disabled={reempregoQuantity >= totalQuantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <textarea
                        placeholder="Observações sobre reemprego (opcional)"
                        value={reempregoNotes}
                        onChange={(e) => setReempregoNotes(e.target.value)}
                        className="w-full p-2 border border-green-300 rounded-md resize-none"
                        rows={3}
                      />
                    </CardContent>
                  </Card>

                  {/* Sucata */}
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-semibold text-red-900">Sucata</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSucataChange(sucataQuantity - 1)}
                          disabled={sucataQuantity <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          value={sucataQuantity}
                          onChange={(e) => handleSucataChange(parseInt(e.target.value) || 0)}
                          className="text-center"
                          min="0"
                          max={totalQuantity}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSucataChange(sucataQuantity + 1)}
                          disabled={sucataQuantity >= totalQuantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <textarea
                        placeholder="Observações sobre sucata (opcional)"
                        value={sucataNotes}
                        onChange={(e) => setSucataNotes(e.target.value)}
                        className="w-full p-2 border border-red-300 rounded-md resize-none"
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Summary */}
                <Card className={`border-2 ${isBalanced ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {isBalanced ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        )}
                        <span className={`font-semibold ${isBalanced ? 'text-green-900' : 'text-yellow-900'}`}>
                          Total Classificado: {totalClassified} / {totalQuantity}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Reemprego: {reempregoQuantity} | Sucata: {sucataQuantity}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Additional Attachments */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Anexos Adicionais
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploadingFile ? 'Enviando...' : 'Adicionar Anexos'}</span>
                  </Button>
                  <span className="text-sm text-gray-500">
                    Máximo 5MB por arquivo. Formatos: JPG, PNG, PDF, DOC, DOCX
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {attachments.map((attachment, index) => (
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
                          <div className="flex space-x-2">
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
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-white p-2 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                              title="Remover Anexo"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Notes */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">Observações da Aprovação</h3>
              </CardHeader>
              <CardContent>
                <textarea
                  placeholder="Adicione observações sobre a aprovação ou motivo da rejeição..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md resize-none"
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Errors */}
            {errors.length > 0 && (
              <Card className="border-red-300 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">Erros encontrados:</span>
                  </div>
                  <ul className="mt-2 text-red-700 text-sm list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <XCircle className="w-4 h-4" />
                <span>{loading ? 'Rejeitando...' : 'Rejeitar'}</span>
              </Button>
              <Button
                variant="success"
                onClick={handleApprove}
                disabled={loading || (!isCompraType && !isBalanced)}
                className="flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{loading ? 'Aprovando...' : 'Aprovar'}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Viewer Modal */}
      {imageViewerOpen && (
        <ImageViewerModal
          imageUrl={selectedImage.url}
          imageAlt={selectedImage.alt}
          onClose={handleCloseImageViewer}
        />
      )}
    </>
  );
}