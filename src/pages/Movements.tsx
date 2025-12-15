import { useState } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { StockMovement } from '../types';
import { MovementList } from '../components/movements/MovementList';
import { MovementForm } from '../components/movements/MovementForm';

type ViewMode = 'list' | 'form';

export function Movements() {
  const { 
    products, 
    movements, 
    addMovement,
    addProduct,
    loading 
  } = useInventory();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddMovement = () => {
    setViewMode('form');
  };

  const handleCreateProduct = () => {
    // Redirect to product creation with pre-filled data for equipment
    window.location.href = '/products?mode=create&type=equipment';
  };
  const handleSubmitMovement = async (movementData: Omit<StockMovement, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      await addMovement(movementData);
      setViewMode('list');
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
  };

  if (viewMode === 'form') {
    return (
      <MovementForm
        products={products}
        onSubmit={handleSubmitMovement}
        onCancel={handleCancel}
        onCreateProduct={handleCreateProduct}
        loading={isSubmitting}
      />
    );
  }

  return (
    <MovementList
      movements={movements}
      products={products}
      onAdd={handleAddMovement}
      loading={loading}
    />
  );
}