import { useState, useEffect } from 'react';
import { InventorySchedule, Product, ActivityStatus } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { useInventory } from '../../contexts/InventoryContext';
import { 
  Package, 
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  Save,
  BarChart3,
  User,
  Calendar,
  MapPin,
  ClipboardList,
  ClipboardCheck,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../../utils/dateUtils';
import { useUserNames } from './useUserNames';

interface CountingInterfaceProps {
  schedule: InventorySchedule;
  products: Product[];
  onBack: () => void;
  onComplete: () => void;
}

export function CountingInterface({ 
  schedule, 
  products, 
  onBack, 
  onComplete 
}: CountingInterfaceProps) {
  const { user } = useAuth();
  const { updateInventorySchedule } = useInventory();
  const { getUserName } = useUserNames();
  const [searchTerm, setSearchTerm] = useState('');
  const [activityStatus, setActivityStatus] = useState<ActivityStatus[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize counting data with current counts
  useEffect(() => {
    // Usa activityStatus como a fonte da verdade para as atividades.
    console.log('CountingInterface: Schedule received', schedule);
    // Garante que mesmo agendamentos antigos sem `activityStatus` funcionem.
    const initialStatus = Array.isArray(schedule.activityStatus) && schedule.activityStatus.length > 0
      ? schedule.activityStatus
      : (schedule.activities || []).map((text: string) => ({ text, completed: false }));
    
    setActivityStatus(initialStatus);
  }, [schedule]);

  const filteredActivities = activityStatus.filter(activity =>
    activity.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveActivity = async (updatedActivityStatus: ActivityStatus[]) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const totalActivities = updatedActivityStatus.length;
      const completedActivities = updatedActivityStatus.filter(a => a.completed).length;
      const isComplete = totalActivities > 0 && completedActivities === totalActivities;

      const scheduleUpdate = {
        ...schedule,
        activityStatus: updatedActivityStatus,
        status: isComplete ? 'completed' as const : 'in_progress' as const,
        completedAt: isComplete ? new Date() : schedule.completedAt,
        updatedAt: new Date()
      };

      await updateInventorySchedule(schedule.id, scheduleUpdate);

      if (isComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Erro ao salvar atividades:', error);
      // Reverter o estado local em caso de erro para manter a consistência
      setActivityStatus(schedule.activityStatus || []);
      alert('Erro ao salvar a atividade. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const getProgress = () => {
    const totalActivities = activityStatus.length;
    const completedActivities = activityStatus.filter(a => a.completed).length;
    const percentage = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0;
    
    return {
      total: totalActivities,
      completed: completedActivities,
      percentage: Math.round(percentage)
    };
  };

  const handleActivityToggle = (index: number, isChecked: boolean) => {
    if (!user) return;

    const updatedStatus = [...activityStatus];
    const activity = updatedStatus[index];
    const commonUpdate = {
      ...activity,
      completed: isChecked,
      completedBy: isChecked ? user.id : undefined,
      completedAt: isChecked ? new Date() : undefined,
      enderecoConclusao: isChecked ? `${schedule.location} - ${schedule.sector}` : undefined,
      geolocation: undefined, // Reset geolocation by default
    };

    if (isChecked) {
      // Função para realizar a geocodificação reversa e obter o endereço.
      const getAddressFromCoords = async (latitude: number, longitude: number) => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}` );
          if (!response.ok) throw new Error('Falha na resposta da API de geocodificação');
          
          const data = await response.json();
          const { road, house_number, suburb, city, state } = data.address;
          
          // Monta o endereço no formato desejado.
          const parts = [
            road ? `${road}${house_number ? `, ${house_number}` : ''}` : null,
            suburb,
            city,
            state
          ].filter(Boolean); // Remove partes nulas ou vazias

          return parts.join(' - ');

        } catch (error) {
          console.error("Erro na geocodificação reversa:", error);
          return "Endereço não disponível"; // Retorna um valor padrão em caso de erro na API.
        }
      };

      // Verifica se a geolocalização está disponível no navegador.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Converte as coordenadas em endereço.
            const address = await getAddressFromCoords(latitude, longitude);

            // Atualiza o objeto da atividade com todos os novos dados.
            updatedStatus[index] = {
              ...commonUpdate,
              geolocation: { latitude, longitude } as { latitude: number; longitude: number },
              // Campos obrigatórios conforme a solicitação
              dataConclusao: format(new Date(), 'dd/MM/yyyy'),
              horaConclusao: format(new Date(), 'HH:mm'),
              enderecoConclusao: address,
            };

            setActivityStatus(updatedStatus);
            handleSaveActivity(updatedStatus);
          },
          (error) => {
            console.error("Erro ao obter geolocalização:", error);
            alert('Não foi possível obter a sua localização. A atividade será salva sem o endereço.');
            
            // Em caso de erro (ex: permissão negada), salva com os dados possíveis.
            updatedStatus[index] = {
              ...commonUpdate,
              dataConclusao: format(new Date(), 'dd/MM/yyyy'),
              horaConclusao: format(new Date(), 'HH:mm'),
              enderecoConclusao: "Localização não autorizada",
            };

            setActivityStatus(updatedStatus);
            handleSaveActivity(updatedStatus);
          }
        );
      } else {
        alert('Geolocalização não é suportada por este navegador.');
        // Se o navegador não suportar geolocalização.
        updatedStatus[index] = {
          ...commonUpdate,
          dataConclusao: format(new Date(), 'dd/MM/yyyy'),
          horaConclusao: format(new Date(), 'HH:mm'),
          enderecoConclusao: "Geolocalização não suportada",
        };
        setActivityStatus(updatedStatus);
        handleSaveActivity(updatedStatus);
      }
    } else {
      // Ao desmarcar, limpa os campos relacionados à conclusão.
      updatedStatus[index] = commonUpdate;
      setActivityStatus(updatedStatus);
      handleSaveActivity(updatedStatus);
    }
  };

  const progress = getProgress();

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
            <h1 className="text-2xl font-bold text-gray-900">Controle de Atividades</h1>
            <p className="text-gray-600">{schedule.name} - {schedule.code}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isSaving ? (
            <Badge variant="warning" size="md">
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </Badge>
          ) : (
            <Badge variant="success" size="md">
              <CheckCircle className="w-4 h-4 mr-2" />
              Salvo
            </Badge>
          )}
        </div>
      </div>

      {/* Schedule Information Panel */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <h3 className="text-lg font-semibold text-blue-900 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Informações do Agendamento
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm uppercase tracking-wide">Identificação</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-600 font-medium">Nome:</span>
                  <p className="text-sm text-blue-900 font-semibold">{schedule.name}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Código:</span>
                  <p className="text-sm text-blue-900 font-mono">{schedule.code}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Status:</span>
                  <Badge variant={schedule.status === 'completed' ? 'success' : schedule.status === 'in_progress' ? 'warning' : 'info'} size="sm">
                    {schedule.status === 'scheduled' && 'Agendado'}
                    {schedule.status === 'in_progress' && 'Em Andamento'}
                    {schedule.status === 'completed' && 'Concluído'}
                    {schedule.status === 'cancelled' && 'Cancelado'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm uppercase tracking-wide">Localização e Datas</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-600 font-medium">Armazém:</span>
                  <p className="text-sm text-blue-900 font-semibold">{schedule.location}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Setor:</span>
                  <p className="text-sm text-blue-900">{schedule.sector}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Data Agendada:</span>
                  <p className="text-sm text-blue-900">{safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy')}</p>
                  <p className="text-xs text-blue-700">{safeFormatDate(schedule.scheduledDate, 'HH:mm')}</p>
                </div>
              </div>
            </div>

            {/* Progress Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm uppercase tracking-wide">Progresso</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-600 font-medium">Total de Atividades:</span>
                  <p className="text-sm text-blue-900 font-semibold">{progress.total}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Atividades Concluídas:</span>
                  <p className="text-sm text-green-700 font-semibold">{progress.completed}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Atividades Pendentes:</span>
                  <p className="text-sm text-yellow-700 font-semibold">{progress.total - progress.completed}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Percentual:</span>
                  <p className="text-sm text-blue-900 font-semibold">{progress.percentage}%</p>
                </div>
              </div>
            </div>

            {/* Responsible Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-blue-800 text-sm uppercase tracking-wide">Responsáveis</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-blue-600 font-medium">Criado por:</span>
                  <p className="text-sm text-blue-900">{getUserName(schedule.createdBy)}</p>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Usuários Atribuídos:</span>
                  <div className="space-y-1">
                    {schedule.assignedUsers.length > 0 ? (
                      schedule.assignedUsers.slice(0, 3).map((userId, index) => (
                        <p key={index} className="text-sm text-blue-900">
                          • {getUserName(userId)}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-blue-700 italic">Nenhum usuário atribuído</p>
                    )}
                    {schedule.assignedUsers.length > 3 && (
                      <p className="text-xs text-blue-600">
                        +{schedule.assignedUsers.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-blue-600 font-medium">Data de Criação:</span>
                  <p className="text-sm text-blue-900">{format(schedule.createdAt, 'dd/MM/yyyy')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="mt-6 pt-4 border-t border-blue-200">
            <h4 className="font-medium text-blue-800 text-sm uppercase tracking-wide mb-2">Atividades</h4>
            {/* INÍCIO DA ALTERAÇÃO 1 */}
            <ul className="space-y-2 text-sm text-blue-900">
                {activityStatus.map((activity, index) => (
                    <li key={index} className={`flex items-start ${activity.completed ? 'text-gray-500' : ''}`}>
                        {activity.completed ? (
                            <CheckCircle className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-green-500" />
                        ) : (
                            <Clock className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-gray-300" />
                        )}
                        <div>
                            <span className={activity.completed ? 'line-through' : ''}>{activity.text}</span>
                            {activity.completed && activity.completedBy && (
                              <p className="font-normal text-xs text-gray-400">
                                Concluído por <strong>{getUserName(activity.completedBy)}</strong>
                                {activity.dataConclusao && activity.horaConclusao && ` em: ${activity.dataConclusao} às ${activity.horaConclusao}`}
                                {/* Adiciona o endereço ao final do texto de conclusão, se existir */}
                                {activity.enderecoConclusao && ` – ${activity.enderecoConclusao}`}
                              </p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {/* FIM DA ALTERAÇÃO 1 */}
            {schedule.status === 'completed' && schedule.completedAt && (
                <div className="mt-4 text-sm text-green-700 font-semibold flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Concluído em: {safeFormatDate(schedule.completedAt, "dd/MM/yyyy 'às' HH:mm")}</span>
                </div>
            )}
          </div>

          {/* Notes */}
          {schedule.notes && (
            <div className="mt-6 pt-4 border-t border-blue-200">
              <h4 className="font-medium text-blue-800 text-sm uppercase tracking-wide mb-2">Observações</h4>
              <p className="text-sm text-blue-900 bg-white p-3 rounded-lg border border-blue-200">
                {schedule.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso das Atividades</span>
            <span className="text-sm text-gray-600">{progress.percentage}% concluído</span>
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
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Buscar atividades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Lista de Atividades
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>Responsável: {user?.name}</span>
              <Calendar className="w-4 h-4 ml-4" />
              <span>{safeFormatDate(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <Card key={index} className={`border-2 ${activity.completed ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={!!activity.completed}
                      onChange={(e) => handleActivityToggle(index, e.target.checked)}
                      className="w-6 h-6 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      className={`flex-1 text-lg cursor-pointer ${activity.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}
                      onClick={() => handleActivityToggle(index, !activity.completed)}
                    >
                      {activity.text}
                    </label>
                  </div>
                  {activity.completed ? (
                      <div className="text-right">
                          <Badge variant="success" size="sm" className="flex items-center space-x-1">
                              <ClipboardCheck className="w-3 h-3" />
                              <span>Concluído</span>
                          </Badge>
                          {activity.geolocation && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1 justify-end">
                                  <Globe className="w-3 h-3" />
                                  <a href={`https://www.google.com/maps/search/?api=1&query=${activity.geolocation.latitude},${activity.geolocation.longitude}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                      Ver no Mapa
                                  </a>
                              </div>
                           )}
                      </div>
                  ) : (
                      <Badge variant="warning" size="sm" className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pendente</span>
                      </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredActivities.length === 0 && (
              <div className="text-center py-10">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700">Nenhuma atividade encontrada</h4>
                <p className="text-gray-500">Tente limpar a busca ou adicione atividades ao agendamento.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
