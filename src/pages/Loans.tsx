import { useState } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { Loan } from '../types';
import { LoanList } from '../components/loans/LoanList';
import { LoanForm } from '../components/loans/LoanForm';
import { LoanDetails } from '../components/loans/LoanDetails';

type ViewMode = 'list' | 'form' | 'details';

export function Loans() {
  const { 
    products, 
    loans, 
    addLoan, 
    updateLoan, 
    deleteLoan,
    extendLoan,
    returnLoan,
    loading 
  } = useInventory();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddLoan = () => {
    setSelectedLoan(null);
    setViewMode('form');
  };

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setViewMode('form');
  };

  const handleViewLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setViewMode('details');
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este empréstimo?')) {
      deleteLoan(loanId);
    }
  };

  const handleSubmitLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (selectedLoan) {
        await updateLoan(selectedLoan.id, loanData);
      } else {
        await addLoan(loanData);
      }
      setViewMode('list');
      setSelectedLoan(null);
    } catch (error) {
      console.error('Erro ao salvar empréstimo:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExtendLoan = async (loanId: string, newReturnDate: Date, reason: string) => {
    try {
      await extendLoan(loanId, newReturnDate, reason);
    } catch (error) {
      console.error('Erro ao prorrogar empréstimo:', error);
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    try {
      await returnLoan(loanId);
    } catch (error) {
      console.error('Erro ao devolver empréstimo:', error);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedLoan(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedLoan(null);
  };

  if (viewMode === 'form') {
    return (
      <LoanForm
        loan={selectedLoan || undefined}
        products={products}
        onSubmit={handleSubmitLoan}
        onCancel={handleCancel}
        loading={isSubmitting}
      />
    );
  }

  if (viewMode === 'details' && selectedLoan) {
    return (
      <LoanDetails
        loan={selectedLoan}
        products={products}
        onEdit={() => setViewMode('form')}
        onBack={handleBackToList}
        onExtend={handleExtendLoan}
        onReturn={handleReturnLoan}
      />
    );
  }

  return (
    <LoanList
      loans={loans}
      products={products}
      onAdd={handleAddLoan}
      onEdit={handleEditLoan}
      onView={handleViewLoan}
      onDelete={handleDeleteLoan}
      onExtend={handleExtendLoan}
      onReturn={handleReturnLoan}
      loading={loading}
    />
  );
}