import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../contexts/InventoryContext';
import { useUsers } from '../hooks/useUsers';
import { InventorySchedule, ActivityStatus } from '../types';
import { ScheduleList } from '../components/inventory-scheduling/ScheduleList';
import { ScheduleForm } from '../components/inventory-scheduling/ScheduleForm';
import { ScheduleDetails } from '../components/inventory-scheduling/ScheduleDetails';
import { CountingInterface } from '../components/inventory-scheduling/CountingInterface';
import { InventoryReports } from '../components/inventory-scheduling/InventoryReports';
import { ActivityExecutionPage } from '../components/inventory-scheduling/ActivityExecutionPage';
import { CountedItemsReport } from './CountedItemsReport';
import SchedulingPageSkeleton from '../components/ui/SchedulingPageSkeleton';
import { useToast } from '../components/ui/Toast';
import { safeFormatDate } from '../utils/dateUtils';

type ViewMode = 'list' | 'form' | 'details' | 'counting' | 'reports' | 'counted-items' | 'activity-execution';

export function InventoryScheduling() {
  const { 
    products, 
    inventorySchedules = [], 
    addInventorySchedule, 
    updateInventorySchedule, 
    deleteInventorySchedule,
    addInventoryCount,
    loading 
  } = useInventory();
  const { users: availableUsers, loading: loadingUsers } = useUsers();
  const { addToast } = useToast();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSchedule, setSelectedSchedule] = useState<InventorySchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSchedulesAdd = async (newSchedulesData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    setIsSubmitting(true);
    try {
      for (const scheduleData of newSchedulesData) {
        await addInventorySchedule(scheduleData);
      }
      setViewMode('list');
      addToast({
        type: 'success',
        title: 'Importação Concluída',
        message: `${newSchedulesData.length} agendamentos foram importados com sucesso!`,
        duration: 5000
      });
    } catch (error) {
      console.error('Erro ao importar agendamentos:', error);
      addToast({
        type: 'error',
        title: 'Erro na Importação',
        message: 'Não foi possível importar os agendamentos. Verifique o arquivo e tente novamente.',
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSchedule = () => {
    setSelectedSchedule(null);
    setViewMode('form');
  };

  const handleEditSchedule = (schedule: InventorySchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('form');
  };

  const handleViewSchedule = (schedule: InventorySchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('details');
  };

  const handleStartActivityExecution = (schedule: InventorySchedule) => {
    setSelectedSchedule(schedule);
    setViewMode('activity-execution');
  };

  const handleExportReportsToXLSX = () => {
    if (inventorySchedules.length === 0) {
      addToast({ type: 'warning', title: 'Nenhum dado para exportar.' });
      return;
    }

    // 1. Planilha de Agendamentos (Geral)
    const scheduleInfoData = inventorySchedules.map(schedule => ({
      'Nome': schedule.name,
      'Código': schedule.code,
      'Data Agendada': safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy HH:mm'),
      'Status': schedule.status,
      'Data de Conclusão': schedule.completedAt ? safeFormatDate(schedule.completedAt, 'dd/MM/yyyy HH:mm') : 'N/A',
      'Local': schedule.location?.name || 'N/A',
      'Setor': schedule.location?.sector || 'N/A',
      'Observações': schedule.observations,
    }));
    const scheduleInfoSheet = XLSX.utils.json_to_sheet(scheduleInfoData);

    // 2. Planilha de Detalhes das Atividades
    const activitiesData = inventorySchedules.flatMap(schedule => 
      schedule.activityStatus?.map(activity => {
        const metadata = (activity.metadata || {}) as any;

        // --- Data Consolidation Logic ---
        const completedById = activity.completedBy || activity.completedById || metadata.completedBy;
        const completedBy = completedById ? availableUsers.find(u => u.id === completedById)?.name : 'N/A';
        
        let completedAt = activity.completedAt || metadata.completedAt;
        if (!completedAt && metadata.dataConclusao && metadata.horaConclusao) {
          // Combina data e hora do metadata se disponível
          const [day, month, year] = metadata.dataConclusao.split('/');
          if (day && month && year) {
            completedAt = new Date(`${year}-${month}-${day}T${metadata.horaConclusao}`);
          }
        }

        const locationData = metadata.location || activity.location || schedule.location;
        const address = metadata.enderecoConclusao || locationData?.address;
        const coordinates = metadata.geolocation || activity.geolocation || locationData;
        const locationName = locationData?.name || metadata.localName;
        const sectorName = locationData?.sector || metadata.sectorName;
        
        return {
          'Agendamento (Nome)': schedule.name,
          'Agendamento (Código)': schedule.code,
          'Atividade': activity.text,
          'Status': activity.completed ? 'Concluído' : 'Pendente',
          'Concluído Por': completedBy,
          'Concluído Em': completedAt ? safeFormatDate(completedAt, 'dd/MM/yyyy HH:mm') : 'N/A',
          'Local da Atividade': locationName || 'N/A',
          'Setor da Atividade': sectorName || 'N/A',
          'Endereço': address || 'N/A',
          'Coordenadas': (coordinates?.latitude && coordinates?.longitude) ? `${coordinates.latitude}, ${coordinates.longitude}` : 'N/A',
        };
      }) || []
    );
    const activitiesSheet = XLSX.utils.json_to_sheet(activitiesData);

    // 3. Planilha de Usuários Atribuídos
    const assignedUsersData = inventorySchedules.flatMap(schedule => 
      schedule.assignedUsers.map(userId => {
        const user = availableUsers.find(u => u.id === userId);
        return {
          'Agendamento (Nome)': schedule.name,
          'Agendamento (Código)': schedule.code,
          'Nome do Usuário': user?.name || 'Usuário não encontrado',
          'Email do Usuário': user?.email || 'N/A',
          'Função': user?.role || 'N/A',
        };
      })
    );
    const assignedUsersSheet = XLSX.utils.json_to_sheet(assignedUsersData);

    // Criar o workbook e adicionar as planilhas
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, scheduleInfoSheet, 'Agendamentos');
    XLSX.utils.book_append_sheet(workbook, activitiesSheet, 'Detalhes das Atividades');
    XLSX.utils.book_append_sheet(workbook, assignedUsersSheet, 'Usuários Atribuídos');

    // Fazer o download do arquivo
    XLSX.writeFile(workbook, `relatorio_agendamentos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const normalizeActivityData = (activity: ActivityStatus): ActivityStatus => {
    if (!activity.completed) {
      return activity;
    }

    const metadata = (activity.metadata || {}) as any;
    const normalizedMetadata = { ...metadata };

    // Centralize completion info
    normalizedMetadata.completedBy = activity.completedBy || activity.completedById || metadata.completedBy;
    normalizedMetadata.completedAt = activity.completedAt || metadata.completedAt;

    if (!normalizedMetadata.completedAt && metadata.dataConclusao && metadata.horaConclusao) {
      const [day, month, year] = metadata.dataConclusao.split('/');
      if (day && month && year) {
        normalizedMetadata.completedAt = new Date(`${year}-${month}-${day}T${metadata.horaConclusao}`);
      }
    }

    // Centralize location info
    normalizedMetadata.location = metadata.location || activity.location;
    normalizedMetadata.geolocation = metadata.geolocation || activity.geolocation;
    normalizedMetadata.enderecoConclusao = metadata.enderecoConclusao || normalizedMetadata.location?.address;

    return { ...activity, metadata: normalizedMetadata };
  };

  const handleSaveActivityProgress = async (scheduleId: string, updatedActivityStatus: ActivityStatus[]) => {
    setIsSubmitting(true);
    try {
      const normalizedActivities = updatedActivityStatus.map(normalizeActivityData);
      await updateInventorySchedule(scheduleId, { activityStatus: normalizedActivities });
    } catch (error) {
      console.error('Erro ao salvar progresso das atividades:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReports = () => {
    handleExportReportsToXLSX();
  };

  const handleViewCountedItems = () => {
    setViewMode('counted-items');
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      deleteInventorySchedule(scheduleId);
    }
  };

  const handleSubmitSchedule = async (scheduleData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true);
    try {
      if (selectedSchedule) {
        await updateInventorySchedule(selectedSchedule.id, scheduleData);
      } else {
        await addInventorySchedule(scheduleData);
      }
      setViewMode('list');
      setSelectedSchedule(null);
      
      // Show success message
      console.log('Agendamento salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedSchedule(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSchedule(null);
  };

  if (loading) {
    return <SchedulingPageSkeleton />;
  }

  if (viewMode === 'form') {
    return (
      <ScheduleForm
        schedule={selectedSchedule || undefined}
        products={products}
        availableUsers={availableUsers}
        onSubmit={handleSubmitSchedule}
        onCancel={handleCancel}
        loading={isSubmitting}
      />
    );
  }

  if (viewMode === 'details' && selectedSchedule) {
    return (
      <ScheduleDetails
        schedule={selectedSchedule}
        products={products}
        availableUsers={availableUsers}
        onEdit={() => setViewMode('form')}
        onBack={handleBackToList}
        onStartCounting={() => handleStartActivityExecution(selectedSchedule)}
      />
    );
  }

  if (viewMode === 'activity-execution' && selectedSchedule) {
    return (
      <ActivityExecutionPage
        schedule={selectedSchedule}
        onSaveProgress={handleSaveActivityProgress}
        onBack={handleBackToList}
        loading={isSubmitting}
      />
    );
  }

  if (viewMode === 'counting' && selectedSchedule) {
    return (
      <CountingInterface
        schedule={selectedSchedule}
        products={products}
        onBack={handleBackToList}
        onComplete={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'reports') {
    return (
      <InventoryReports
        schedules={inventorySchedules}
        products={products}
        onBack={handleBackToList}
      />
    );
  }

  if (viewMode === 'counted-items') {
    return (
      <CountedItemsReport
        onBack={handleBackToList}
      />
    );
  }

  return (
    <ScheduleList
      schedules={inventorySchedules}
      products={products}
      onAdd={handleAddSchedule}
      onSchedulesAdd={handleSchedulesAdd}
      onEdit={handleEditSchedule}
      onView={handleViewSchedule}
      onDelete={handleDeleteSchedule}
      onStartCounting={handleStartActivityExecution}
      onViewReports={handleViewReports}
      onViewCountedItems={handleViewCountedItems}
      loading={loading}
    />
  );
}