import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useInventory } from '../contexts/InventoryContext';
import { Button } from '../components/ui/Button';
import { Download, BarChart3, ArrowLeft } from 'lucide-react';
import { safeFormatDate } from '../utils/dateUtils';
import { userService } from '../services/userService';
import { Link } from 'react-router-dom';

export function SchedulesPage() {
  const { inventorySchedules = [] } = useInventory();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await userService.getAllUsers();
        setUsers(userList);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      }
    };
    loadUsers();
  }, []);

  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      scheduled: 'Agendado',
      in_progress: 'Em Andamento',
      completed: 'Concluído',
      overdue: 'Atrasado',
      pending: 'Pendente',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const handleExportAllToXLSX = () => {
    const dataToExport = inventorySchedules.map(schedule => {
      const activities = schedule.activityStatus?.map(activity => {
        if (activity.completed) {
          const completedBy = activity.completedById ? users.find(u => u.id === activity.completedById)?.name : 'N/A';
          const completedAt = activity.completedAt ? ` em ${safeFormatDate(activity.completedAt, 'dd/MM/yyyy HH:mm')}` : '';
          const location = activity.location || schedule.location;
          const locationName = location?.name || 'N/A';
          const locationSector = location?.sector || 'N/A';
          const address = location?.address || 'Endereço não disponível';
          const { latitude, longitude } = location || {};
          const mapLink = (latitude && longitude) ? `\nVer no Mapa (${latitude}, ${longitude})` : '';
          return `${activity.text}\nConcluído por ${completedBy}${completedAt}\n${locationName} - ${locationSector}\n${address}${mapLink}`;
        }
        return `${activity.text} (Pendente)`;
      }).join('; ');

      return {
        'Nome': schedule.name,
        'Código': schedule.code,
        'Data Agendada': safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy HH:mm'),
        'Status': translateStatus(schedule.status),
        'Data de Conclusão': schedule.completedAt ? safeFormatDate(schedule.completedAt, 'dd/MM/yyyy HH:mm') : 'N/A',
        'Local': schedule.location?.name,
        'Setor': schedule.location?.sector,
        'Observações': schedule.observations,
        'Atividades': activities,
        'Usuários Atribuídos': schedule.assignedUsers?.map((userId: string) => users.find(u => u.id === userId)?.name).filter(Boolean).join(', ') || 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Agendamentos');
    XLSX.writeFile(workbook, 'agendamentos_completos.xlsx');
  };

  const handleExportSingleScheduleToXLSX = (schedule: any) => {
    if (!schedule) return;

    const assignedUsers = schedule.assignedUsers?.map((userId: string) => users.find(u => u.id === userId)?.name).filter(Boolean).join(', ') || 'N/A';

    const activities = schedule.activityStatus?.map((activity: any) => {
      if (activity.completed) {
        const completedBy = activity.completedById ? users.find(u => u.id === activity.completedById)?.name : 'N/A';
        const completedAt = activity.completedAt ? ` em ${safeFormatDate(activity.completedAt, 'dd/MM/yyyy HH:mm')}` : '';
        const location = activity.location || schedule.location;
        const locationName = location?.name || 'N/A';
        const locationSector = location?.sector || 'N/A';
        const address = location?.address || 'Endereço não disponível';
        const { latitude, longitude } = location || {};
        const mapLink = (latitude && longitude) ? `\nVer no Mapa (${latitude}, ${longitude})` : '';
        return `${activity.text}\nConcluído por ${completedBy}${completedAt}\n${locationName} - ${locationSector}\n${address}${mapLink}`;
      }
      return `${activity.text} (Pendente)`;
    }).join('; ');

    const dataToExport = [{
      'Código': schedule.code,
      'Data Agendada': safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy HH:mm'),
      'Status': translateStatus(schedule.status),
      'Local': schedule.location?.name,
      'Setor': schedule.location?.sector,
      'Observações': schedule.observations,
      'Atividades': activities,
      'Progresso': `Progresso Agendado ${schedule.activityStatus?.filter((a:any) => a.completed).length || 0}/${schedule.activityStatus?.length || 0} atividades`,
      'Histórico - Criado por': schedule.createdBy || 'N/A',
      'Histórico - Criado em': schedule.createdAt ? safeFormatDate(schedule.createdAt, 'dd/MM/yyyy HH:mm') : 'N/A',
      'Histórico - Última atualização': schedule.updatedAt ? safeFormatDate(schedule.updatedAt, 'dd/MM/yyyy HH:mm') : 'N/A',
      'Usuários Atribuídos': assignedUsers,
    }];

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Informações do Agendamento');
    XLSX.writeFile(workbook, 'Inventario Mensal - Exemplo 9.xlsx');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <Link to="/dashboard">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <BarChart3 className="w-6 h-6 mr-2" />
                        Agendamentos - Visão Expandida
                    </h1>
                    <p className="text-sm text-gray-500">Tabela com todos os agendamentos de inventário.</p>
                </div>
            </div>
          <Button onClick={handleExportAllToXLSX} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Tabela Completa
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data Agendada</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Data de Conclusão</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Local</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Setor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Observações</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Usuários Atribuídos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Ações</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Atividades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventorySchedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">{schedule.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{schedule.code}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{safeFormatDate(schedule.scheduledDate, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{translateStatus(schedule.status)}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{schedule.completedAt ? safeFormatDate(schedule.completedAt, 'dd/MM/yyyy HH:mm') : 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{schedule.location?.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">{schedule.location?.sector}</td>
                    <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">{schedule.observations}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {schedule.assignedUsers?.map(userId => users.find(u => u.id === userId)?.name).filter(Boolean).join(', ') || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <Button variant="ghost" size="sm" onClick={() => handleExportSingleScheduleToXLSX(schedule)} title="Exportar este agendamento para XLSX">
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 align-top">
                      {schedule.activityStatus?.map((activity, index) => {
                        const completedBy = activity.completedById ? users.find(u => u.id === activity.completedById)?.name : 'N/A';
                        const completedAt = activity.completedAt ? ` em ${safeFormatDate(activity.completedAt, 'dd/MM/yyyy HH:mm')}` : '';
                        const location = activity.location || schedule.location;
                        const locationName = location?.name || 'N/A';
                        const locationSector = location?.sector || 'N/A';
                        const address = location?.address || 'Endereço não disponível';
                        const { latitude, longitude } = location || {};
                        const mapLink = (latitude && longitude) ? `https://www.google.com/maps?q=${latitude},${longitude}` : null;

                        return (
                          <div key={activity.id} className={index > 0 ? "mt-4 pt-4 border-t border-gray-200" : ""}>
                            <span>{activity.text}</span>
                            {activity.completed ? (
                              <>
                                <span className="text-xs text-gray-500 block">Concluído por {completedBy}{completedAt}</span>
                                <span className="text-xs text-gray-500 block">{locationName} - {locationSector}</span>
                                <span className="text-xs text-gray-500 block">{address}</span>
                                {mapLink && (
                                  <a href={mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block">
                                    Ver no Mapa ({latitude}, {longitude})
                                  </a>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-yellow-600 block">Pendente</span>
                            )}
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}