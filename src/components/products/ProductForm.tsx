import { useState, useEffect } from 'react';
import { Product, Category, Supplier } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  Package, 
  Upload, 
  X, 
  MapPin, 
  DollarSign, 
  Hash, 
  FileText,
  Building,
  Tag,
  Calendar,
  BarChart3,
  Plus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../contexts/InventoryContext';

interface ProductFormProps {
  product?: Product;
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  onSubmit: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ProductForm({
  product,
  products,
  categories,
  suppliers,
  onSubmit,
  onCancel,
  loading = false
}: ProductFormProps) {
  const { hasRole } = useAuth();
  const { addCategory, addSupplier } = useInventory();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    categoryId: '',
    subcategoryType: 'novo' as 'novo' | 'reemprego' | 'sucata',
    supplierId: '',
    purchasePrice: '',
    salePrice: '',
    unit: 'UN',
    warehouse: '',
    aisle: '',
    shelf: '',
    position: '',
    currentStock: '',
    minStock: '',
    maxStock: '',
    batch: '',
    expiryDate: '',
    images: [] as string[],
    isActive: true,
    operatorStatus: 'Disponível' as 'Disponível' | 'Em uso' | 'Manutenção' | 'Reservado' | 'Fora de serviço',
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleCreateNewCategory = async () => {
    if (!newCategoryData.name.trim()) return;

    try {
      const newCategory = await addCategory({
        name: newCategoryData.name.trim(),
        description: newCategoryData.description.trim() || undefined,
        color: newCategoryData.color
      });

      // Select the new category
      setFormData(prev => ({ ...prev, categoryId: newCategory.id }));

      // Reset form and close modal
      setNewCategoryData({ name: '', description: '', color: '#3B82F6' });
      setShowNewCategoryForm(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    }
  };

  const handleCreateNewSupplier = async () => {
    if (!newSupplierData.name.trim() || !newSupplierData.contact.trim()) return;

    try {
      const newSupplier = await addSupplier({
        name: newSupplierData.name.trim(),
        contact: newSupplierData.contact.trim(),
        email: newSupplierData.email.trim() || undefined,
        phone: newSupplierData.phone.trim() || undefined,
        address: newSupplierData.address.trim() || undefined
      });

      // Select the new supplier
      setFormData(prev => ({ ...prev, supplierId: newSupplier.id }));

      // Reset form and close modal
      setNewSupplierData({ name: '', contact: '', email: '', phone: '', address: '' });
      setShowNewSupplierForm(false);
    } catch (error) {
      console.error('Erro ao criar fornecedor:', error);
    }
  };

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode || '',
        categoryId: product.category.id,
        subcategoryType: product.subcategory?.type || 'novo',
        supplierId: product.supplier.id,
        purchasePrice: product.purchasePrice.toString(),
        salePrice: product.salePrice.toString(),
        unit: product.unit,
        warehouse: product.location.warehouse,
        aisle: product.location.aisle,
        shelf: product.location.shelf,
        position: product.location.position || '',
        currentStock: product.currentStock.toString(),
        minStock: product.minStock.toString(),
        maxStock: product.maxStock?.toString() || '',
        batch: product.batch || '',
        expiryDate: product.expiryDate ? product.expiryDate.toISOString().split('T')[0] : '',
        images: product.images,
        isActive: product.isActive,
        operatorStatus: product.operatorStatus || 'Disponível',
      });
    }
  }, [product]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setImagePreview(imageUrl);
        setFormData(prev => ({
          ...prev,
          images: [imageUrl, ...prev.images.slice(0, 4)] // Limit to 5 images
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    // Sem validação - permite gravar com qualquer campo
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Check if product with same SKU already exists
    const existingProduct = products?.find(p => 
      p.sku.toLowerCase() === formData.sku.trim().toLowerCase() && 
      p.id !== product?.id // Exclude current product when editing
    );
    
    if (existingProduct && !product) {
      // If product exists and we're creating new, show confirmation
      const shouldMerge = window.confirm(
        `Já existe um produto com SKU "${formData.sku}":\n\n` +
        `Produto existente: ${existingProduct.name}\n` +
        `Estoque atual: ${existingProduct.currentStock} ${existingProduct.unit}\n\n` +
        `Deseja SOMAR o estoque informado (${formData.currentStock}) ao produto existente?\n\n` +
        `Novo estoque será: ${existingProduct.currentStock + parseInt(formData.currentStock || '0')} ${existingProduct.unit}`
      );
      
      if (shouldMerge) {
        // Update existing product by adding stock
        const newStock = existingProduct.currentStock + parseInt(formData.currentStock || '0');
        const updatedProduct = {
          ...existingProduct,
          currentStock: newStock,
          // Update other fields if provided
          name: formData.name.trim() || existingProduct.name,
          description: formData.description.trim() || existingProduct.description,
          purchasePrice: parseFloat(formData.purchasePrice) || existingProduct.purchasePrice,
          salePrice: parseFloat(formData.salePrice) || existingProduct.salePrice,
          minStock: parseInt(formData.minStock) || existingProduct.minStock,
          maxStock: formData.maxStock ? parseInt(formData.maxStock) : existingProduct.maxStock,
          updatedAt: new Date()
        };
        
        onSubmit(updatedProduct);
        return;
      } else {
        // User chose not to merge, stop the process
        return;
      }
    }

    // Use default values if not selected
    const selectedCategory = categories.find(c => c.id === formData.categoryId) || categories[0];
    const selectedSupplier = suppliers.find(s => s.id === formData.supplierId) || suppliers[0];
    // Create subcategory based on type
    const getSubcategoryInfo = (type: 'novo' | 'reemprego' | 'sucata') => {
      switch (type) {
        case 'novo':
          return {
            id: 'sub_novo',
            name: 'Novo',
            type: 'novo' as const,
            description: 'Produto novo, sem uso anterior',
            color: '#10B981'
          };
        case 'reemprego':
          return {
            id: 'sub_reemprego',
            name: 'Reemprego',
            type: 'reemprego' as const,
            description: 'Material reutilizado em boas condições',
            color: '#3B82F6'
          };
        case 'sucata':
          return {
            id: 'sub_sucata',
            name: 'Sucata',
            type: 'sucata' as const,
            description: 'Material para descarte ou reciclagem',
            color: '#EF4444'
          };
      }
    };

    const subcategory = {
      ...getSubcategoryInfo(formData.subcategoryType),
      createdAt: new Date()
    };
    const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim() || 'Produto sem nome',
      description: formData.description.trim() || '',
      sku: formData.sku.trim().toUpperCase() || `PROD-${Date.now()}`,
      barcode: formData.barcode.trim() || null,
      category: selectedCategory,
      subcategory,
      supplier: selectedSupplier,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      salePrice: parseFloat(formData.salePrice) || 0,
      unit: formData.unit,
      location: {
        id: `${formData.warehouse || 'Principal'}-${formData.aisle || 'A'}-${formData.shelf || '01'}-${formData.position}`,
        warehouse: formData.warehouse.trim() || 'Principal',
        aisle: formData.aisle.trim() || 'A',
        shelf: formData.shelf.trim() || '01',
        position: formData.position.trim() || null,
      },
      currentStock: parseInt(formData.currentStock) || 0,
      minStock: parseInt(formData.minStock) || 0,
      maxStock: formData.maxStock ? parseInt(formData.maxStock) : null,
      batch: formData.batch.trim() || null,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
      images: formData.images,
      isActive: formData.isActive,
      operatorStatus: formData.operatorStatus,
    };

    onSubmit(productData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {product ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <p className="text-gray-600">
                {product ? 'Atualize as informações do produto' : 'Adicione um novo produto ao inventário'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Produto"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  placeholder="Ex: iPhone 15 Pro"
                />
                
                <Input
                  label="SKU"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  error={errors.sku}
                  placeholder="Ex: IPH15PRO128"
                  icon={<Hash className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Categoria *
                  </label>
                  <div>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.categoryId ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.categoryId && (
                    <p className="text-sm text-red-600">{errors.categoryId}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Fornecedor *
                  </label>
                  <div className="flex space-x-2">
                    <select
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={handleInputChange}
                      className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.supplierId ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                    >
                      <option value="">Selecione um fornecedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowNewSupplierForm(true)}
                      className="px-3 py-2 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo</span>
                    </Button>
                  </div>
                  {errors.supplierId && (
                    <p className="text-sm text-red-600">{errors.supplierId}</p>
                  )}
                </div>
              </div>
              {/* Subcategory Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Material *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['novo', 'reemprego', 'sucata'] as const).map((type) => {
                    const isSelected = formData.subcategoryType === type;
                    const typeInfo = {
                      novo: {
                        label: 'Novo',
                        description: 'Material novo, sem uso anterior',
                        color: 'text-green-600',
                        bgColor: 'bg-green-50',
                        borderColor: 'border-green-200',
                        icon: '🆕'
                      },
                      reemprego: {
                        label: 'Reemprego',
                        description: 'Material reutilizado em boas condições',
                        color: 'text-blue-600',
                        bgColor: 'bg-blue-50',
                        borderColor: 'border-blue-200',
                        icon: '♻️'
                      },
                      sucata: {
                        label: 'Sucata',
                        description: 'Material para descarte ou reciclagem',
                        color: 'text-red-600',
                        bgColor: 'bg-red-50',
                        borderColor: 'border-red-200',
                        icon: '🗑️'
                      }
                    }[type];
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, subcategoryType: type }))}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                          isSelected
                            ? `${typeInfo.borderColor} ${typeInfo.bgColor} border-opacity-100`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <div>
                            <p className={`font-medium ${isSelected ? typeInfo.color : 'text-gray-900'}`}>
                              {typeInfo.label}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {typeInfo.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição detalhada do produto..."
                />
              </div>

              <Input
                label="Código de Barras"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                placeholder="Ex: 1234567890123"
                icon={<BarChart3 className="w-4 h-4" />}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Quantidade *"
                  name="currentStock"
                  type="number"
                  min="0"
                  value={formData.currentStock}
                  onChange={handleInputChange}
                  error={errors.currentStock}
                  placeholder="0"
                />
                
                <Input
                  label="Estoque Mínimo *"
                  name="minStock"
                  type="number"
                  min="0"
                  value={formData.minStock}
                  onChange={handleInputChange}
                  error={errors.minStock}
                  placeholder="0"
                />
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Unidade *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilograma (KG)</option>
                    <option value="G">Grama (G)</option>
                    <option value="L">Litro (L)</option>
                    <option value="ML">Mililitro (ML)</option>
                    <option value="M">Metro (M)</option>
                    <option value="CM">Centímetro (CM)</option>
                    <option value="M²">Metro Quadrado (M²)</option>
                    <option value="M³">Metro Cúbico (M³)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="PC">Peça (PC)</option>
                    <option value="PAR">Par (PAR)</option>
                    <option value="DZ">Dúzia (DZ)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            {hasRole('admin') && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Preços
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Preço de Compra"
                  name="purchasePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={handleInputChange}
                  error={errors.purchasePrice}
                  placeholder="0,00"
                  icon={<DollarSign className="w-4 h-4" />}
                />
                
                <Input
                  label="Preço de Venda"
                  name="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salePrice}
                  onChange={handleInputChange}
                  error={errors.salePrice}
                  placeholder="0,00"
                  icon={<DollarSign className="w-4 h-4" />}
                />
              </div>
            </div>
            )}

            {/* Location */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Localização
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  label="Armazém"
                  name="warehouse"
                  value={formData.warehouse}
                  onChange={handleInputChange}
                  error={errors.warehouse}
                  placeholder="Ex: Principal"
                  icon={<Building className="w-4 h-4" />}
                />
                
                <Input
                  label="Corredor"
                  name="aisle"
                  value={formData.aisle}
                  onChange={handleInputChange}
                  error={errors.aisle}
                  placeholder="Ex: A"
                />
                
                <Input
                  label="Prateleira"
                  name="shelf"
                  value={formData.shelf}
                  onChange={handleInputChange}
                  error={errors.shelf}
                  placeholder="Ex: 01"
                />
                
                <Input
                  label="Posição"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Ex: 01"
                />
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Upload className="w-5 h-5 mr-2" />
                Imagens do Produto
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-500" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clique para enviar</span> ou arraste e solte
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG ou JPEG (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Produto ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Status</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Status Operacional
                  </label>
                  <select
                    name="operatorStatus"
                    value={formData.operatorStatus || 'Disponível'}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Disponível">Disponível</option>
                    {hasRole('admin') && (
                      <>
                        <option value="Em uso">Em uso</option>
                        <option value="Manutenção">Manutenção</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Fora de serviço">Fora de serviço</option>
                      </>
                    )}
                  </select>
                  <p className="text-xs text-gray-500">
                    {hasRole('admin') 
                      ? 'Administradores podem definir todos os status. Status "Em uso" e "Disponível" são gerenciados pela página Operador.'
                      : 'Status será atualizado automaticamente pela página Operador'
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Produto Ativo
                  </label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Produto ativo
                </label>
                <Badge variant={formData.isActive ? 'success' : 'danger'}>
                  {formData.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
                </div>
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
                disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-500 flex items-center space-x-3 border-0 focus:ring-4 focus:ring-emerald-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                <Package className="w-6 h-6 relative z-10" />
                <span className="text-lg relative z-10">{product ? 'Atualizar Produto' : 'Gravar Produto'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* New Category Modal */}
      {showNewCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Nova Categoria
                </h3>
                <Button variant="ghost" onClick={() => setShowNewCategoryForm(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nome da Categoria *"
                value={newCategoryData.name}
                onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Eletrônicos"
              />
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  value={newCategoryData.description}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição da categoria..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cor
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={newCategoryData.color}
                    onChange={(e) => setNewCategoryData(prev => ({ ...prev, color: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-300"
                    style={{ backgroundColor: newCategoryData.color }}
                  />
                  <span className="text-sm text-gray-600">{newCategoryData.color}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowNewCategoryForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateNewCategory}
                  className="flex-1"
                  disabled={!newCategoryData.name.trim()}
                >
                  Criar Categoria
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Supplier Modal */}
      {showNewSupplierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Novo Fornecedor
                </h3>
                <Button variant="ghost" onClick={() => setShowNewSupplierForm(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nome do Fornecedor *"
                value={newSupplierData.name}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Apple Inc."
              />
              
              <Input
                label="Contato Principal *"
                value={newSupplierData.contact}
                onChange={(e) => setNewSupplierData(prev => ({ ...prev, contact: e.target.value }))}
                placeholder="Ex: João Silva"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={newSupplierData.email}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
                
                <Input
                  label="Telefone"
                  value={newSupplierData.phone}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Endereço
                </label>
                <textarea
                  value={newSupplierData.address}
                  onChange={(e) => setNewSupplierData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Endereço completo do fornecedor..."
                />
              </div>
              
              <div className="flex items-center space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowNewSupplierForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateNewSupplier}
                  className="flex-1"
                  disabled={!newSupplierData.name.trim() || !newSupplierData.contact.trim()}
                >
                  Criar Fornecedor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}