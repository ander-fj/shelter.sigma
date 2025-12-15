import { useState, useEffect } from 'react';
import { InventorySchedule, ActivityStatus } from '../../types';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, CheckCircle, Clock, ListChecks } from 'lucide-react';
import { safeFormatDate } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { useUserNames } from './useUserNames';

interface ActivityExecutionPageProps {
  schedule: InventorySchedule;
  onSaveProgress: (scheduleId: string, updatedActivityStatus: ActivityStatus[]) => void;
  onBack: () => void;
  loading?: boolean;
}

export function ActivityExecutionPage({
  schedule,
  onSaveProgress,
  onBack,
  loading = false,
}: ActivityExecutionPageProps) {
  const { user } = useAuth();
  const { getUserName } = useUserNames();
  const [currentActivityStatus, setCurrentActivityStatus] = useState<ActivityStatus[]>(
    schedule.activityStatus || []
  );

  useEffect(() => {
    // Garante que mesmo agendamentos antigos sem `activityStatus` funcionem,
    // e que a lista seja sempre populada corretamente.
    const initialStatus = Array.isArray(schedule.activityStatus) && schedule.activityStatus.length > 0
      ? schedule.activityStatus
      : (schedule.activities || []).map((text: string) => ({ text, completed: false }));
    setCurrentActivityStatus(initialStatus);
  }, [schedule]);

  const handleActivityToggle = (originalIndex: number) => {
    if (!user) return;

    const isChecked = !currentActivityStatus[originalIndex].completed;

    const updateActivityState = (updatedActivity: Partial<ActivityStatus>) => {
      const updatedStatus = currentActivityStatus.map((activity, i) =>
        i === originalIndex ? { ...activity, ...updatedActivity } : activity
      );
      setCurrentActivityStatus(updatedStatus);
    };

    const commonUpdate: Partial<ActivityStatus> = {
      completed: isChecked,
      completedBy: isChecked ? user.id : undefined,
      completedAt: isChecked ? new Date() : undefined,
      dataConclusao: isChecked ? format(new Date(), 'dd/MM/yyyy') : undefined,
      horaConclusao: isChecked ? format(new Date(), 'HH:mm') : undefined,
      location: isChecked ? `${schedule.location} - ${schedule.sector}` : undefined,
      geolocation: undefined,
      enderecoConclusao: undefined,
    };

    if (isChecked) {
      const getAddressFromCoords = async (latitude: number, longitude: number) => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!response.ok) throw new Error('API request failed');
          const data = await response.json();
          const { road, house_number, suburb, city, state } = data.address;
          const parts = [
            road ? `${road}${house_number ? `, ${house_number}` : ''}` : null,
            suburb,
            city,
            state
          ].filter(Boolean);
          return parts.join(' - ');
        } catch (error) {
          console.error("Erro na geocodificação reversa:", error);
          return "Endereço não disponível";
        }
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const address = await getAddressFromCoords(latitude, longitude);
            updateActivityState({
              ...commonUpdate,
              geolocation: { latitude, longitude },
              enderecoConclusao: address,
            });
          },
          (error) => {
            console.error("Erro ao obter geolocalização:", error);
            updateActivityState({ ...commonUpdate, enderecoConclusao: "Localização não autorizada" });
          }
        );
      } else {
        updateActivityState({ ...commonUpdate, enderecoConclusao: "Geolocalização não suportada" });
      }
    } else {
      updateActivityState(commonUpdate);
    }
  };

  const handleSave = () => {
    onSaveProgress(schedule.id, currentActivityStatus);
  };

  const completedActivitiesCount = currentActivityStatus.filter(
    (activity) => activity.completed
  ).length;
  const totalActivities = currentActivityStatus.length;
  const progressPercentage =
    totalActivities > 0 ? (completedActivitiesCount / totalActivities) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Detalhes
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Execução de Atividades</h1>
            <p className="text-gray-600">Agendamento: {schedule.name} ({schedule.code})</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          Salvar Progresso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ListChecks className="w-5 h-5 mr-2" />
            Lista de Atividades
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span className="font-medium">{completedActivitiesCount}/{totalActivities} atividades concluídas</span>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalActivities === 0 ? (
            <div className="text-center p-4 text-gray-500">
              Nenhuma atividade definida para este agendamento.
            </div>
          ) : (
            <div className="space-y-3">
              {currentActivityStatus.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 border border-gray-200 rounded-lg bg-white shadow-sm"
                >
                  <Checkbox
                    id={`activity-${index}`}
                    checked={activity.completed}
                    onCheckedChange={() => handleActivityToggle(index)}
                    className="mr-3"
                  />
                  <label
                    htmlFor={`activity-${index}`}
                    className={`flex-1 cursor-pointer ${activity.completed ? 'text-gray-500' : 'text-gray-900'}`}
                  >
                    <span className={activity.completed ? 'line-through' : ''}>
                      {activity.text}
                    </span>
                    {(activity as ActivityStatus & { enderecoConclusao?: string }).completed && (
                      <p className="text-xs text-gray-500 mt-1">
                        Concluído
                        {activity.completedBy && ` por ${getUserName(activity.completedBy)}`}
                        {(activity as any).dataConclusao && (activity as any).horaConclusao && ` em: ${(activity as any).dataConclusao} às ${(activity as any).horaConclusao}`}
                        {/* Adiciona o endereço ao final do texto de conclusão, conforme solicitado */}
                        {(activity as any).enderecoConclusao &&
                          ` – ${(activity as any).enderecoConclusao}`}
                      </p>
                    )}
                  </label>
                  {activity.completed ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="w-5 h-5 mr-1" />
                      <span className="text-sm font-medium">Concluído</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
