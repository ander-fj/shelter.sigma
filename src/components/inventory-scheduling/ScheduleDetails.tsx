import { InventorySchedule, Product, ActivityStatus, User } from '../../types';
import { VALIDATION_WORKFLOW } from '../../types';
import { userService } from '../../services/userService';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CreditCard as Edit, ArrowLeft, MapPin, Package, Users, FileText, Play, CheckCircle, Clock, AlertTriangle, X, BarChart3, Shield, FileCheck, UserCheck, UserX, Globe } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';
import { safeFormatDate } from '../../utils/dateUtils';
import { useUsers } from '../../hooks/useUsers';
import { useInventoryProgress } from './useInventoryProgress';
import { useInventory } from '../../contexts/InventoryContext';

interface ScheduleDetailsProps {
  schedule: InventorySchedule;
  products: Product[];
  availableUsers: User[];
  onEdit: () => void;
  onBack: () => void;
  onStartCounting: () => void;
}

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'scheduled':
      return {
        label: 'Agendado',
        variant: 'info' as const,
        icon: Calendar,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    case 'overdue':
      return {
        label: 'Atrasado',
        variant: 'danger' as const,
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    case 'in_progress':
      return {
        label: 'Em Andamento',
        variant: 'warning' as const,
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      };
    case 'completed':
      return {
        label: 'Concluído',
        variant: 'success' as const,
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    case 'cancelled':
      return {
        label: 'Cancelado',
        variant: 'danger' as const,
        icon: X,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    default:
      return {
        label: 'Desconhecido',
        variant: 'default' as const,
        icon: AlertTriangle,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50'
      };
  }
};

export function ScheduleDetails({ 
  schedule, 
  products, 
  availableUsers = [],
  onEdit, 
  onBack, 
  onStartCounting 
}: ScheduleDetailsProps) {
  const { hasRole, user } = useAuth();
  const { getUserName } = useUsers();
  const { updateInventorySchedule, loading: inventoryLoading } = useInventory();

  const statusInfo = getStatusInfo(schedule.status);
  
  const progress = useInventoryProgress(schedule);

  // Efeito para verificar e corrigir o status do agendamento ao visualizar detalhes
  useEffect(() => {
    if (!inventoryLoading && schedule) {
      // Apenas verifica agendamentos que não estão 'completed' ou 'cancelled', incluindo 'overdue'
      if (schedule.status === 'scheduled' || schedule.status === 'in_progress' || schedule.status === 'overdue') {
        const totalActivities = schedule.activityStatus?.length || 0;
        const completedActivities = schedule.activityStatus?.filter(a => a.completed).length || 0;

        // Se todas as atividades estão completas, mas o status não é 'completed'
        if (totalActivities > 0 && completedActivities === totalActivities && schedule.status !== 'completed') {
          console.log(`Corrigindo status do agendamento em detalhes: ${schedule.code} para 'completed'`);
          const updatedSchedule = { ...schedule, status: 'completed' as const, completedAt: new Date(), updatedAt: new Date() };
          updateInventorySchedule(schedule.id, updatedSchedule);
        } else if (completedActivities > 0 && completedActivities < totalActivities && (schedule.status === 'scheduled' || schedule.status === 'overdue')) {
          // Se algumas atividades estão completas e o status ainda é 'agendado' ou 'atrasado', muda para 'em andamento'
          console.log(`Corrigindo status do agendamento em detalhes: ${schedule.code} para 'in_progress'`);
          const updatedSchedule = { ...schedule, status: 'in_progress' as const, updatedAt: new Date() };
          updateInventorySchedule(schedule.id, updatedSchedule);
        } else if (new Date(schedule.scheduledDate) < new Date() && schedule.status === 'scheduled' && completedActivities === 0) {
          // Se a data agendada já passou e o status ainda é 'agendado', muda para 'atrasado'
          console.log(`Corrigindo status do agendamento em detalhes: ${schedule.code} para 'overdue'`);
          const updatedSchedule = { ...schedule, status: 'overdue' as const, updatedAt: new Date() };
          updateInventorySchedule(schedule.id, updatedSchedule);
        }
      }
    }
  }, [schedule, inventoryLoading, updateInventorySchedule]);

  // Normaliza as atividades para um formato único para renderização (mantido para a lista de atividades)
  const normalizedActivities: ActivityStatus[] = useMemo(() => 
      (Array.isArray(schedule.activityStatus) && schedule.activityStatus.length > 0)
        ? schedule.activityStatus
        : (Array.isArray(schedule.activities))
          ? schedule.activities.map(text => (typeof text === 'string' ? { text, completed: false } : text))
          : [],
    [schedule.activityStatus, schedule.activities]);

  const expectedProducts = useMemo(() => {
    return schedule.expectedProducts.map(expectedProduct => {
      const product = products.find(p => p.id === expectedProduct.productId);
      const counted = schedule.countedProducts.find(c => c.productId === expectedProduct.productId);
      
      return {
        ...expectedProduct,
        product,
        counted,
      };
    });
  }, [schedule.expectedProducts, schedule.countedProducts, products]);

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
            <h1 className="text-2xl font-bold text-gray-900">{schedule.name}</h1>
            <p className="text-gray-600">Código: {schedule.code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {(schedule.status === 'scheduled' || schedule.status === 'in_progress' || schedule.status === 'overdue') && (
            <Button
              onClick={onStartCounting}
              className="flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>Iniciar Atividade</span>
            </Button>
          )}
          {hasRole('admin') && (
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Schedule Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Informações do Agendamento</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-gray-900">{schedule.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Código</label>
                  <p className="text-gray-900 font-mono">{schedule.code}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Data Agendada</label>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">
                      {safeFormatDate(schedule.scheduledDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={statusInfo.variant}>
                      <statusInfo.icon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>
                {schedule.status === 'completed' && schedule.completedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data de Conclusão</label>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <p className="text-gray-900">
                        {safeFormatDate(schedule.completedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Local</label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <p className="text-gray-900">{schedule.location}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Setor</label>
                  <p className="text-gray-900">{schedule.sector}</p>
                </div>
              </div>

              {schedule.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-gray-900">{schedule.notes}</p>
                </div>
              )}

              {normalizedActivities.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Atividades</label>
                  <ul className="mt-2 space-y-2">
                    {normalizedActivities.map((activity, index) => {
                      const { text: activityText, completed: isCompleted, completedBy, completedAt, geolocation, location, enderecoConclusao } = activity as ActivityStatus & { enderecoConclusao?: string };

                      return (
                        <li key={index} className="flex items-center space-x-2">
                          <div className="flex-shrink-0 self-start pt-1">
                            {isCompleted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-yellow-500" />}
                          </div>
                          <div className="flex-grow">
                            <span className={`${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                              {activityText}
                            </span>
                            {isCompleted && (
                              <div className="text-xs text-gray-500 mt-1 space-y-1">
                                <p>
                                  {completedBy && (
                                    <span className="mr-1">Concluído por <strong>{getUserName(completedBy)}</strong></span>
                                  )}
                                  {isCompleted && (activity as any).dataConclusao && (activity as any).horaConclusao ? (
                                    <span>em {(activity as any).dataConclusao} às {(activity as any).horaConclusao}</span>
                                  ) : (
                                    completedAt && <span>em {safeFormatDate(completedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}</span>
                                  )}
                                </p>
                                {location && (
                                  <div className="flex items-center text-gray-500">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    <span>{location}</span>
                                  </div>
                                )}
                                {enderecoConclusao && (
                                  <div className="flex items-center text-gray-500">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    <span>{enderecoConclusao}</span>
                                  </div>
                                )}
                                {geolocation && (
                                  <div className="flex items-center text-blue-600">
                                    <Globe className="w-3 h-3 mr-1" />
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${geolocation.latitude},${geolocation.longitude}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      Ver no Mapa ({geolocation.latitude.toFixed(4)}, {geolocation.longitude.toFixed(4)})
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Progresso
              </h3>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${statusInfo.bgColor} border-2 border-opacity-20 mb-4`}>
                <div className="flex items-center space-x-3">
                  <statusInfo.icon className={`w-6 h-6 ${statusInfo.color}`} />
                  <div>
                    <h4 className={`text-lg font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {progress.totalActivities > 0 
                        ? `${progress.completedActivities}/${progress.totalActivities} atividades`
                        : 'Nenhuma atividade definida'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total de Atividades</span>
                  <span className="font-semibold text-gray-900">{progress.totalActivities}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Atividades Concluídas</span>
                  <span className="font-semibold text-green-600">{progress.completedActivities}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Atividades Pendentes</span>
                  <span className="font-semibold text-yellow-600">{progress.totalActivities - progress.completedActivities}</span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>0%</span>
                    <span>{progress.percentage}%</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        progress.percentage === 100
                          ? 'bg-green-500'
                          : progress.percentage > 50
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Histórico
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Criado por</label>
                <p className="text-sm text-blue-900">{getUserName(schedule.createdBy)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Criado em</label>
                <p className="text-gray-900">
                  {schedule.createdAt ? safeFormatDate(schedule.createdAt, "dd 'de' MMMM 'de' yyyy") : 'Data não disponível'}
                </p>
                <p className="text-sm text-gray-500">
                  {schedule.createdAt ? safeFormatDate(schedule.createdAt, 'HH:mm') : ''}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Última atualização</label>
                <p className="text-gray-900">
                  {schedule.updatedAt ? safeFormatDate(schedule.updatedAt, "dd 'de' MMMM 'de' yyyy") : 'Data não disponível'}
                </p>
                <p className="text-sm text-gray-500">
                  {schedule.updatedAt ? safeFormatDate(schedule.updatedAt, 'HH:mm') : ''}
                </p>
              </div>

              {schedule.completedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Concluído em</label>
                  <p className="text-gray-900">
                    {safeFormatDate(schedule.completedAt, "dd 'de' MMMM 'de' yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {safeFormatDate(schedule.completedAt, 'HH:mm')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Users */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Usuários Atribuídos
              </h3>
            </CardHeader>
            <CardContent>
              {schedule.assignedUsers.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum usuário atribuído</p>
              ) : (
                <div className="space-y-2">
                  {schedule.assignedUsers.map((userId) => {
                    const assignedUser = availableUsers.find(u => u.id === userId);
                    const userName = getUserName(userId);
                    const userRole = schedule.userRoles?.[userId] || 'Apontador';
                    const roleLabel = userRole.charAt(0).toUpperCase() + userRole.slice(1);
                    
                    return (
                      <div key={userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          {assignedUser?.avatar ? (
                            <img
                              src={assignedUser.avatar}
                              alt={userName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{userName}</p>
                            <p className="text-xs text-gray-500">{assignedUser?.email || userId}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="info" size="sm">
                            <Shield className="w-3 h-3 mr-1" />
                            {roleLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}