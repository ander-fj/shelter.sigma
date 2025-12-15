import { useState } from 'react';
import { Loan, Product, LoanExtension } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { 
  HandHeart, 
  Edit, 
  ArrowLeft,
  User,
  Package,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  FileText,
  Mail,
  Phone,
  Plus
} from 'lucide-react';
import { format, isAfter, addDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../../utils/dateUtils';

interface LoanDetailsProps {
  loan: Loan;
  products: Product[];
  onEdit: () => void;
  onBack: () => void;
  onExtend: (loanId: string, newReturnDate: Date, reason: string) => void;
  onReturn: (loanId: string) => void;
}

export function LoanDetails({ 
  loan, 
  products, 
  onEdit, 
  onBack, 
  onExtend, 
  onReturn 
}: LoanDetailsProps) {
  const [showExtendForm, setShowExtendForm] = useState(false);
  const [extensionData, setExtensionData] = useState({
    days: '7',
    reason: ''
  });

  const product = products.find(p => p.id === loan.productId);
  
  const getLoanStatusInfo = () => {
    const today = new Date();
    const returnDate = new Date(loan.expectedReturnDate);
    
    if (loan.status === 'returned') {
      return {
        label: 'Devolvido',
        variant: 'success' as const,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }
    
    if (loan.status === 'cancelled') {
      return {
        label: 'Cancelado',
        variant: 'default' as const,
        icon: AlertTriangle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
      };
    }
    
    if (isAfter(today, returnDate)) {
      const daysOverdue = differenceInDays(today, returnDate);
      return {
        label: `Atrasado (${daysOverdue} dias)`,
        variant: 'danger' as const,
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    }
    
    const daysUntilReturn = differenceInDays(returnDate, today);
    if (daysUntilReturn <= 3) {
      return {
        label: `Vence em ${daysUntilReturn} dias`,
        variant: 'warning' as const,
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      };
    }
    
    return {
      label: 'Ativo',
      variant: 'success' as const,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    };
  };

  const statusInfo = getLoanStatusInfo();

  const handleExtend = () => {
    if (!extensionData.days || !extensionData.reason.trim()) {
      alert('Preencha todos os campos para prorrogar');
      return;
    }

    const newDate = addDays(new Date(loan.expectedReturnDate), parseInt(extensionData.days));
    onExtend(loan.id, newDate, extensionData.reason.trim());
    setShowExtendForm(false);
    setExtensionData({ days: '7', reason: '' });
  };

  const handleReturn = () => {
    if (window.confirm('Confirmar devolução deste empréstimo?')) {
      onReturn(loan.id);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">
              Empréstimo - {loan.borrowerName}
            </h1>
            <p className="text-gray-600">{product?.name || 'Produto não encontrado'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {loan.status === 'active' && (
            <>
              <Button
                variant="success"
                onClick={handleReturn}
                className="flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Devolver</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowExtendForm(true)}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Prorrogar</span>
              </Button>
            </>
          )}
          <Button onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Produto Emprestado
              </h3>
            </CardHeader>
            <CardContent>
              {product ? (
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
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
                      <span className="text-sm text-gray-500">SKU: {product.sku}</span>
                      <span className="text-sm text-gray-500">
                        Quantidade: {loan.quantity} {product.unit}
                      </span>
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

          {/* Borrower Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Informações do Solicitante
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nome</label>
                <p className="text-gray-900 text-lg">{loan.borrowerName}</p>
              </div>
              
              {loan.borrowerEmail && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{loan.borrowerEmail}</p>
                  </div>
                </div>
              )}
              
              {loan.borrowerPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefone</label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{loan.borrowerPhone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extensions History */}
          {loan.extensions.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Histórico de Prorrogações
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loan.extensions.map((extension, index) => (
                    <div key={extension.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="info" size="sm">
                          Prorrogação #{index + 1}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {safeFormatDate(extension.extendedAt, "dd/MM/yyyy 'às' HH:mm")}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Data anterior: </span>
                          <span className="text-gray-900">
                            {safeFormatDate(extension.previousReturnDate, "dd/MM/yyyy")}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Nova data: </span>
                          <span className="text-gray-900">
                            {safeFormatDate(extension.newReturnDate, "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-600 text-sm">Motivo: </span>
                        <span className="text-gray-900 text-sm">{extension.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {loan.notes && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Observações
                </h3>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900">{loan.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Status do Empréstimo</h3>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${statusInfo.bgColor} border-2 border-opacity-20`}>
                <div className="flex items-center space-x-3">
                  <statusInfo.icon className={`w-6 h-6 ${statusInfo.color}`} />
                  <div>
                    <h4 className={`text-lg font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </h4>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Datas
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Empréstimo</label>
                <p className="text-gray-900">
                  {loan.loanDate ? safeFormatDate(loan.loanDate, "dd 'de' MMMM 'de' yyyy") : 'Data não disponível'}
                </p>
                <p className="text-sm text-gray-500">
                  {loan.loanDate ? safeFormatDate(loan.loanDate, 'HH:mm') : ''}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Data de Retorno Prevista</label>
                <p className="text-gray-900">
                  {loan.expectedReturnDate ? safeFormatDate(loan.expectedReturnDate, "dd 'de' MMMM 'de' yyyy") : 'Data não disponível'}
                </p>
              </div>
              
              {loan.actualReturnDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Data de Devolução</label>
                  <p className="text-gray-900">
                    {safeFormatDate(loan.actualReturnDate, "dd 'de' MMMM 'de' yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {safeFormatDate(loan.actualReturnDate, 'HH:mm')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extend Form */}
          {showExtendForm && loan.status === 'active' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Prorrogar Empréstimo
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Dias para prorrogar"
                  type="number"
                  min="1"
                  max="365"
                  value={extensionData.days}
                  onChange={(e) => setExtensionData(prev => ({ ...prev, days: e.target.value }))}
                />
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo da prorrogação
                  </label>
                  <textarea
                    value={extensionData.reason}
                    onChange={(e) => setExtensionData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Descreva o motivo da prorrogação..."
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleExtend}
                    size="sm"
                    className="flex-1"
                  >
                    Prorrogar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setShowExtendForm(false)}
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Resumo</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Quantidade</span>
                <span className="font-semibold text-gray-900">
                  {loan.quantity} {product?.unit || 'UN'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Prorrogações</span>
                <span className="font-semibold text-gray-900">
                  {loan.extensions.length}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Dias de empréstimo</span>
                <span className="font-semibold text-gray-900">
                  {differenceInDays(
                    loan.actualReturnDate || new Date(), 
                    loan.loanDate
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}