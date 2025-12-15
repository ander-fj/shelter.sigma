import { useState } from 'react';
import { Loan, Product } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  HandHeart, 
  Calendar,
  User,
  Package,
  Plus,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoanListProps {
  loans: Loan[];
  products: Product[];
  onAdd: () => void;
  onEdit: (loan: Loan) => void;
  onView: (loan: Loan) => void;
  onDelete: (loanId: string) => void;
  onExtend: (loanId: string, newReturnDate: Date, reason: string) => void;
  onReturn: (loanId: string) => void;
  loading?: boolean;
}

export function LoanList({ 
  loans, 
  products, 
  onAdd, 
  onEdit, 
  onView, 
  onDelete,
  onExtend,
  onReturn,
  loading = false 
}: LoanListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Filter loans
  const filteredLoans = loans.filter(loan => {
    const product = products.find(p => p.id === loan.productId);
    const matchesSearch = 
      loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const loanDate = new Date(loan.loanDate);
      matchesDate = loanDate.toDateString() === filterDate.toDateString();
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Sort loans by date (newest first)
  const sortedLoans = [...filteredLoans].sort((a, b) => 
    new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime()
  );

  const getLoanStatusInfo = (loan: Loan) => {
    const today = new Date();
    const returnDate = new Date(loan.expectedReturnDate);
    
    if (loan.status === 'returned') {
      return {
        label: 'Devolvido',
        variant: 'success' as const,
        icon: CheckCircle,
        color: 'text-green-600'
      };
    }
    
    if (loan.status === 'cancelled') {
      return {
        label: 'Cancelado',
        variant: 'default' as const,
        icon: AlertTriangle,
        color: 'text-gray-600'
      };
    }
    
    if (isAfter(today, returnDate)) {
      return {
        label: 'Atrasado',
        variant: 'danger' as const,
        icon: AlertTriangle,
        color: 'text-red-600'
      };
    }
    
    if (isBefore(today, addDays(returnDate, -3))) {
      return {
        label: 'Ativo',
        variant: 'success' as const,
        icon: Clock,
        color: 'text-green-600'
      };
    }
    
    return {
      label: 'Vence em breve',
      variant: 'warning' as const,
      icon: Clock,
      color: 'text-yellow-600'
    };
  };

  const handleQuickReturn = (loan: Loan) => {
    if (window.confirm(`Confirmar devolução do empréstimo de ${loan.borrowerName}?`)) {
      onReturn(loan.id);
    }
  };

  const handleQuickExtend = (loan: Loan) => {
    const days = prompt('Quantos dias prorrogar?', '7');
    if (days && !isNaN(Number(days))) {
      const newDate = addDays(new Date(loan.expectedReturnDate), Number(days));
      const reason = prompt('Motivo da prorrogação:', 'Solicitação do usuário') || 'Prorrogação';
      onExtend(loan.id, newDate, reason);
    }
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
          {/* Imagem Icone-sigma.jpg adicionada aqui */}
          <img 
            src="/sigma.png" 
            alt="Ícone Sigma" 
            className="w-20 h-20 object-contain"
          />
          <div>
          <h1 className="text-2xl font-bold text-gray-900">Empréstimos</h1>
          <p className="text-gray-600 mt-1">
            Gerencie empréstimos de produtos
          </p>
        </div>
       </div>   
        <div className="flex items-center space-x-3">
          <Button variant="secondary" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
          <Button onClick={onAdd} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Novo Empréstimo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar empréstimos..."
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
              <option value="active">Ativos</option>
              <option value="overdue">Atrasados</option>
              <option value="returned">Devolvidos</option>
              <option value="cancelled">Cancelados</option>
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

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {sortedLoans.length} de {loans.length} empréstimos
        </p>
      </div>

      {/* Loans List */}
      {sortedLoans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <HandHeart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum empréstimo encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar os filtros ou registre um novo empréstimo.
            </p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Empréstimo
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
                      Solicitante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Empréstimo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Retorno
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedLoans.map((loan) => {
                    const product = products.find(p => p.id === loan.productId);
                    const statusInfo = getLoanStatusInfo(loan);
                    
                    return (
                      <tr key={loan.id} className="hover:bg-gray-50">
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
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {loan.borrowerName}
                              </div>
                              {loan.borrowerEmail && (
                                <div className="text-sm text-gray-500">
                                  {loan.borrowerEmail}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {loan.quantity} {product?.unit || 'UN'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(loan.loanDate, "dd/MM/yyyy")}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(loan.loanDate, "HH:mm")}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {format(loan.expectedReturnDate, "dd/MM/yyyy")}
                          </div>
                          {loan.extensions.length > 0 && (
                            <div className="text-xs text-blue-600">
                              Prorrogado {loan.extensions.length}x
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusInfo.variant} size="sm">
                            <statusInfo.icon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            {loan.status === 'active' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickReturn(loan)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Devolver"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickExtend(loan)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title="Prorrogar"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(loan)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(loan)}
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(loan.id)}
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
    </div>
  );
}