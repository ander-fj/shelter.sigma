import { useState, useEffect } from 'react';
import { Loan, Product } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { SingleProductSelector } from '../common/SingleProductSelector';
import { 
  HandHeart, 
  User, 
  Calendar,
  FileText,
  Package,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { addDays } from 'date-fns';

interface LoanFormProps {
  loan?: Loan;
  products: Product[];
  onSubmit: (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function LoanForm({ 
  loan, 
  products, 
  onSubmit, 
  onCancel, 
  loading = false 
}: LoanFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    productId: '',
    borrowerName: '',
    borrowerEmail: '',
    borrowerPhone: '',
    quantity: '',
    loanDate: new Date().toISOString().split('T')[0],
    expectedReturnDate: addDays(new Date(), 7).toISOString().split('T')[0],
    notes: '',
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loan) {
      setFormData({
        productId: loan.productId,
        borrowerName: loan.borrowerName,
        borrowerEmail: loan.borrowerEmail || '',
        borrowerPhone: loan.borrowerPhone || '',
        quantity: loan.quantity.toString(),
        loanDate: loan.loanDate.toISOString().split('T')[0],
        expectedReturnDate: loan.expectedReturnDate.toISOString().split('T')[0],
        notes: loan.notes || '',
      });
      
      const product = products.find(p => p.id === loan.productId);
      setSelectedProduct(product || null);
    }
  }, [loan, products]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleProductSelect = (product: Product) => {
    setFormData(prev => ({ ...prev, productId: product.id }));
    setSelectedProduct(product);
  };

  const handleProductClear = () => {
    setFormData(prev => ({ ...prev, productId: '' }));
    setSelectedProduct(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) newErrors.productId = 'Produto é obrigatório';
    if (!formData.borrowerName.trim()) newErrors.borrowerName = 'Nome do solicitante é obrigatório';
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero';
    }
    if (!formData.loanDate) newErrors.loanDate = 'Data de empréstimo é obrigatória';
    if (!formData.expectedReturnDate) newErrors.expectedReturnDate = 'Data de retorno é obrigatória';

    // Validate quantity against available stock
    if (selectedProduct && formData.quantity) {
      const quantity = parseInt(formData.quantity);
      if (quantity > selectedProduct.currentStock) {
        newErrors.quantity = 'Quantidade não pode ser maior que o estoque disponível';
      }
    }

    // Validate dates
    if (formData.loanDate && formData.expectedReturnDate) {
      const loanDate = new Date(formData.loanDate);
      const returnDate = new Date(formData.expectedReturnDate);
      if (returnDate <= loanDate) {
        newErrors.expectedReturnDate = 'Data de retorno deve ser posterior à data de empréstimo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    const loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'> = {
      productId: formData.productId,
      borrowerName: formData.borrowerName.trim(),
      borrowerEmail: formData.borrowerEmail.trim() || undefined,
      borrowerPhone: formData.borrowerPhone.trim() || undefined,
      quantity: parseInt(formData.quantity),
      loanDate: new Date(formData.loanDate),
      expectedReturnDate: new Date(formData.expectedReturnDate),
      actualReturnDate: loan?.actualReturnDate,
      status: loan?.status || 'active',
      notes: formData.notes.trim() || undefined,
      extensions: loan?.extensions || [],
      createdBy: user.id,
    };

    onSubmit(loanData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <HandHeart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {loan ? 'Editar Empréstimo' : 'Novo Empréstimo'}
              </h2>
              <p className="text-gray-600">
                {loan ? 'Atualize as informações do empréstimo' : 'Registre um novo empréstimo de produto'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Product Selection */}
            <SingleProductSelector
              products={products.filter(p => p.isActive && p.currentStock > 0)}
              selectedProduct={selectedProduct}
              onSelect={handleProductSelect}
              onClear={handleProductClear}
            />
            {errors.productId && (
              <p className="text-sm text-red-600 mt-1">{errors.productId}</p>
            )}

            {/* Borrower Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Informações do Solicitante
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo *"
                  name="borrowerName"
                  value={formData.borrowerName}
                  onChange={handleInputChange}
                  error={errors.borrowerName}
                  placeholder="Ex: João Silva"
                  icon={<User className="w-4 h-4" />}
                />
                
                <Input
                  label="Email"
                  name="borrowerEmail"
                  type="email"
                  value={formData.borrowerEmail}
                  onChange={handleInputChange}
                  placeholder="Ex: joao@empresa.com"
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>

              <Input
                label="Telefone"
                name="borrowerPhone"
                value={formData.borrowerPhone}
                onChange={handleInputChange}
                placeholder="Ex: (11) 99999-9999"
                icon={<Phone className="w-4 h-4" />}
              />
            </div>

            {/* Loan Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Detalhes do Empréstimo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Quantidade *"
                  name="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct?.currentStock || 999}
                  value={formData.quantity}
                  onChange={handleInputChange}
                  error={errors.quantity}
                  placeholder="0"
                />
                
                <Input
                  label="Data de Empréstimo *"
                  name="loanDate"
                  type="date"
                  value={formData.loanDate}
                  onChange={handleInputChange}
                  error={errors.loanDate}
                  icon={<Calendar className="w-4 h-4" />}
                />
                
                <Input
                  label="Data de Retorno Prevista *"
                  name="expectedReturnDate"
                  type="date"
                  value={formData.expectedReturnDate}
                  onChange={handleInputChange}
                  error={errors.expectedReturnDate}
                  icon={<Calendar className="w-4 h-4" />}
                />
              </div>

              {/* Stock Warning */}
              {selectedProduct && formData.quantity && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Estoque disponível: {selectedProduct.currentStock} {selectedProduct.unit}
                    </span>
                  </div>
                  {parseInt(formData.quantity) > selectedProduct.currentStock && (
                    <div className="mt-2 text-sm text-red-600">
                      ⚠️ Quantidade solicitada excede o estoque disponível
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais sobre o empréstimo..."
                />
              </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Responsável: {user?.name}</span>
                <Calendar className="w-4 h-4 ml-4" />
                <span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={loading}
                disabled={loading || !selectedProduct}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {loan ? 'Atualizar Empréstimo' : 'Registrar Empréstimo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}