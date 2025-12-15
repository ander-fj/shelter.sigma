import { useState } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { Product } from '../types';
import { ProductList } from '../components/products/ProductList';
import { ProductForm } from '../components/products/ProductForm';
import { ProductDetails } from '../components/products/ProductDetails';

type ViewMode = 'list' | 'form' | 'details';

export function Products() {
  const { 
    products, 
    categories, 
    suppliers, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    loading 
  } = useInventory();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setViewMode('form');
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('form');
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('details');
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      deleteProduct(productId);
    }
  };

  const handleSubmitProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (selectedProduct) {
        await updateProduct(selectedProduct.id, productData);
      } else {
        await addProduct(productData);
      }
      setViewMode('list');
      setSelectedProduct(null);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportProducts = async (importedProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    setIsSubmitting(true);
    try {
      for (const productData of importedProducts) {
        await addProduct(productData);
      }
      console.log(`${importedProducts.length} produtos importados com sucesso!`);
    } catch (error) {
      console.error('Erro ao importar produtos:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedProduct(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedProduct(null);
  };

  if (viewMode === 'form') {
    return (
      <ProductForm
        product={selectedProduct || undefined}
        products={products}
        categories={categories}
        suppliers={suppliers}
        onSubmit={handleSubmitProduct}
        onCancel={handleCancel}
        loading={isSubmitting}
      />
    );
  }

  if (viewMode === 'details' && selectedProduct) {
    return (
      <ProductDetails
        product={selectedProduct}
        onEdit={() => setViewMode('form')}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <ProductList
      products={products}
      categories={categories}
      suppliers={suppliers}
      onAdd={handleAddProduct}
      onEdit={handleEditProduct}
      onView={handleViewProduct}
      onDelete={handleDeleteProduct}
      onImport={handleImportProducts}
      loading={loading}
    />
  );
}