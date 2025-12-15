import { useState, useEffect } from 'react';
import { InventorySchedule, Product, User } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Calendar, 
  MapPin, 
  Package, 
  Users,
  Plus,
  X,
  Search,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { addDays } from 'date-fns';
import { userService } from '../../services/userService';

interface ScheduleFormProps {
  schedule?: InventorySchedule;
  products: Product[];
  availableUsers: User[];
  onSubmit: (scheduleData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ScheduleForm({ 
  schedule, 
  products, 
  availableUsers,
  onSubmit, 
  onCancel, 
  loading = false 
}: ScheduleFormProps) {
  const { user, hasRole } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    scheduledDate: addDays(new Date(), 1).toISOString().slice(0, 16),
    location: '',
    notes: '', // Keep notes as a single string
    activities: [''] as string[], // Garante que sempre haja um campo de atividade inicial
    assignedUsers: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [userFilter, setUserFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Extrair armazéns únicos dos produtos
  const getUniqueWarehouses = () => {
    const warehouses = Array.from(new Set(products.map(p => p.location.warehouse)));
    return warehouses.sort();
  };

  const uniqueWarehouses = getUniqueWarehouses();

  // Check admin access
  if (!hasRole('admin')) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-600 mb-4">
              Apenas administradores podem criar ou editar agendamentos de inventário.
            </p>
            <Button onClick={onCancel}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        code: schedule.code,
        scheduledDate: new Date(schedule.scheduledDate).toISOString().slice(0, 16),
        location: schedule.location,
        notes: schedule.notes || '', // Keep notes as a single string
        activities: Array.isArray(schedule.activityStatus) && schedule.activityStatus.length > 0 
          ? schedule.activityStatus.map(s => s.text) 
          : (Array.isArray(schedule.activities) && schedule.activities.length > 0 ? schedule.activities : ['']),
        assignedUsers: schedule.assignedUsers,
      });
      // Load existing user roles
      if (schedule.userRoles) {
        setUserRoles(schedule.userRoles);
      }
    } else {
      // Generate automatic code for new schedules
      const now = new Date();
      const autoCode = `INV-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, code: autoCode }));
    }
  }, [schedule]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

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

  const handleActivityChange = (index: number, value: string) => {
    const newActivities = [...formData.activities];
    newActivities[index] = value;
    setFormData(prev => ({ ...prev, activities: newActivities }));
  };

  const handleAddActivity = () => {
    setFormData(prev => ({ ...prev, activities: [...prev.activities, ''] }));
  };

  const handleRemoveActivity = (index: number) => {
    const newActivities = formData.activities.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, activities: newActivities }));
  };

  const handleUserAssignment = (userId: string, isAssigned: boolean) => {
    setFormData(prev => ({
      ...prev,
      assignedUsers: isAssigned 
        ? [...prev.assignedUsers, userId]
        : prev.assignedUsers.filter(id => id !== userId)
    }));
  };

  const handleUserRoleChange = (userId: string, role: string) => {
    setUserRoles(prev => ({
      ...prev,
      [userId]: role
    }));
  };

  // Filter users based on search and role
  const filteredUsers = (availableUsers || []).filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(userFilter.toLowerCase()) ||
      user.email.toLowerCase().includes(userFilter.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.code.trim()) newErrors.code = 'Código é obrigatório';
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Data é obrigatória';

    // Validate date is in the future
    if (formData.scheduledDate && new Date(formData.scheduledDate) <= new Date()) {
      newErrors.scheduledDate = 'Data deve ser no futuro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    // Garante que o criador do agendamento esteja na lista de usuários atribuídos
    // e tenha uma função definida, caso seja um novo agendamento.
    const assignedUsersWithCreator = schedule ? formData.assignedUsers : Array.from(new Set([...formData.assignedUsers, user.id]));
    const userRolesWithCreator = { ...userRoles };
    if (!schedule && !userRolesWithCreator[user.id]) {
      userRolesWithCreator[user.id] = 'Apontador'; // Define a função padrão para o criador
    }

    const activityTexts = formData.activities.map(a => a.trim()).filter(a => a);

    // Mapeia as atividades atuais para o novo status, preservando o estado 'completed' se a atividade já existia.
    const existingStatusMap = new Map(
      (schedule?.activityStatus || []).map(s => [s.text, s])
    );

    const finalActivityStatus = activityTexts.map(text => {
      const existing = existingStatusMap.get(text);
      if (existing) {
        return existing; // Preserva o status completo se a atividade não foi alterada
      }
      return { text, completed: false }; // Nova atividade
    });

    const scheduleData: Omit<InventorySchedule, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      code: formData.code.trim(),
      scheduledDate: new Date(formData.scheduledDate),
      location: formData.location.trim(),
      sector: 'Geral',
      status: schedule?.status || 'scheduled', // Mantém o status se estiver editando
      expectedProducts: [],
      countedProducts: schedule?.countedProducts || [],
      createdBy: user.id,
      assignedUsers: assignedUsersWithCreator,
      notes: formData.notes.trim() || undefined,
      // Garante que ambos os campos sejam salvos corretamente
      activities: activityTexts,
      activityStatus: finalActivityStatus,
      completedAt: schedule?.completedAt,
      userRoles: userRolesWithCreator,
    };

    console.log('ScheduleForm: Submitting scheduleData', scheduleData);
    onSubmit(scheduleData);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {schedule ? 'Editar Agendamento' : 'Novo Agendamento de Inventário'}
              </h2>
              <p className="text-gray-600">
                {schedule ? 'Atualize as informações do agendamento' : 'Crie um novo agendamento para contagem de inventário'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome do Inventário *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  placeholder="Ex: Inventário Mensal - Janeiro 2024"
                />
                
                <Input
                  label="Código *"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  error={errors.code}
                  placeholder="Ex: INV-202401-001"
                />
              </div>

              <Input
                label="Data e Hora do Agendamento *"
                name="scheduledDate"
                type="datetime-local"
                value={formData.scheduledDate}
                onChange={handleInputChange}
                error={errors.scheduledDate}
                icon={<Calendar className="w-4 h-4" />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Local *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleSelectChange}
                      className={`w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.location ? 'border-red-500 focus:ring-red-500' : ''
                      }`}
                    >
                      <option value="">Selecione local</option>
                      {uniqueWarehouses.map(warehouse => (
                        <option key={warehouse} value={warehouse}>
                          {warehouse}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.location && (
                    <p className="text-sm text-red-600">{errors.location}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Atividades
                </label>
              <div className="space-y-2">
                  {formData.activities.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        name={`activity-${index}`}
                        value={activity}
                        onChange={(e) => handleActivityChange(index, e.target.value)}
                        className="flex-grow"
                        placeholder={`Atividade #${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveActivity(index)}
                        disabled={formData.activities.length <= 1}
                        className="text-red-500 hover:bg-red-100 disabled:text-gray-400 disabled:hover:bg-transparent"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" onClick={handleAddActivity} className="mt-2 text-sm">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Atividade
                </Button>
              </div>

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
                  placeholder="Instruções especiais, observações importantes..."
                />
              </div>

            {/* User Assignment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Usuários Atribuídos
              </h3>
              
              

              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Input
                      placeholder="Buscar usuários..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      icon={<Search className="w-4 h-4" />}
                      className="flex-1"
                    />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os perfis</option>
                      <option value="admin">Administrador</option>
                      <option value="manager">Gerente</option>
                      <option value="operator">Operador</option>
                      <option value="viewer">Visualizador</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                              type="checkbox"
                              checked={formData.assignedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedUsers: [...new Set([...prev.assignedUsers, ...filteredUsers.map(u => u.id)])]
                                  }));
                                } else {
                                  setFormData(prev => ({
                                    ...prev,
                                    assignedUsers: prev.assignedUsers.filter(id => !filteredUsers.find(u => u.id === id))
                                  }));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Perfil
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Função no Inventário
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => {
                            const isAssigned = formData.assignedUsers.includes(user.id);
                            const getRoleInfo = (role: string) => {
                              switch (role) {
                                case 'admin':
                                  return { label: 'Administrador', variant: 'danger' as const };
                                case 'manager':
                                  return { label: 'Gerente', variant: 'info' as const };
                                case 'operator':
                                  return { label: 'Operador', variant: 'success' as const };
                                case 'viewer':
                                  return { label: 'Visualizador', variant: 'default' as const };
                                default:
                                  return { label: 'Desconhecido', variant: 'default' as const };
                              }
                            };
                            
                            const roleInfo = getRoleInfo(user.role);
                            
                            return (
                              <tr 
                                key={user.id} 
                                className={`hover:bg-gray-50 ${isAssigned ? 'bg-blue-50' : ''}`}
                              >
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => handleUserAssignment(user.id, e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {user.avatar ? (
                                      <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover mr-3"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                        <Users className="w-4 h-4 text-gray-400" />
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {user.name}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {user.email}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <Badge variant={roleInfo.variant} size="sm">
                                    {roleInfo.label}
                                  </Badge>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {isAssigned ? (
                                    <select
                                      value={userRoles[user.id] || 'Apontador'}
                                      onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                                      className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="Apontador">Apontador</option>
                                      <option value="Validador">Validador</option>
                                    </select>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center py-8">
                              <div className="flex flex-col items-center text-gray-500">
                                <Search className="w-10 h-10 mb-2" />
                                <span className="font-medium">Nenhum usuário encontrado</span>
                                <span className="text-sm">Tente ajustar seus filtros de busca.</span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Users Summary */}
              {formData.assignedUsers.length > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-green-900 mb-3">Usuários Selecionados</h4>
                    <div className="space-y-2">
                      {formData.assignedUsers.map(userId => {
                        const user = availableUsers.find(u => u.id === userId);
                        const role = userRoles[userId] || 'Apontador';
                        return user ? (
                          <div key={userId} className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                            <div className="flex items-center space-x-2">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Users className="w-3 h-3 text-gray-400" />
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900">{user.name}</span>
                            </div>
                            <Badge variant="info" size="sm">
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
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
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {schedule ? 'Atualizar Agendamento' : 'Criar Agendamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}