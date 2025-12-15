import { useState } from 'react';
import { User, UserRole } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  User as UserIcon, 
  Mail,
  Shield,
  Plus,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Download,
  Calendar,
  UserCheck,
  UserX,
  Save,
  EyeOff,
  Check,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInventory } from '../../contexts/InventoryContext';
import { safeFormatDate } from '../../utils/dateUtils';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onView: (user: User) => void;
  onAdd: () => void;
  loading?: boolean;
}

export function UserList({ 
  users, 
  onEdit, 
  onDelete, 
  onView, 
  onAdd, 
  loading = false 
}: UserListProps) {
  const { saveAllToFirebase } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'role' | 'lastLogin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingPassword, setEditingPassword] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [savedPasswords, setSavedPasswords] = useState<Record<string, boolean>>({});

  const handleSaveUser = async (user: User) => {
    try {
      // Salvar usuário individual no Firebase
      const { userService } = await import('../../services/userService');
      await userService.saveUserToFirebase(user);
      
      console.log('Usuário salvo no Firebase:', user.name);
      
      // Mostrar feedback visual de sucesso
      const button = document.querySelector(`[data-save-user="${user.id}"]`);
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Salvo!';
        button.classList.add('bg-green-600', 'text-white');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-green-600', 'text-white');
        }, 2000);
      }
      
      // Notificar outros usuários sobre a mudança
      console.log('🔄 Usuário salvo - outros usuários serão notificados automaticamente');
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      
      // Mostrar feedback visual de erro
      const button = document.querySelector(`[data-save-user="${user.id}"]`);
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Erro!';
        button.classList.add('bg-red-600', 'text-white');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-red-600', 'text-white');
        }, 2000);
      }
    }
  };
  
  const handleSaveAllUsers = async () => {
    try {
      // Salvar todos os usuários no Firebase
      const { userService } = await import('../../services/userService');
      
      for (const user of sortedUsers) {
        await userService.saveUserToFirebase(user);
      }
      
      console.log('Todos os usuários salvos no Firebase');
      console.log('🔄 Usuários salvos - outros usuários serão notificados automaticamente');
      
      // Mostrar feedback visual de sucesso
      const button = document.querySelector('[data-save-all-users]');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Salvos no Firebase!';
        button.classList.add('bg-green-600', 'text-white');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-green-600', 'text-white');
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao salvar usuários no Firebase:', error);
      
      // Mostrar feedback visual de erro
      const button = document.querySelector('[data-save-all-users]');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Erro ao salvar!';
        button.classList.add('bg-red-600', 'text-white');
        
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('bg-red-600', 'text-white');
        }, 3000);
      }
    }
  };

  const handleEditPassword = (userId: string) => {
    setEditingPassword(userId);
    // Usar senha salva anteriormente ou senha padrão
    setNewPassword(userPasswords[userId] || 'password123');
  };

  const handleSavePassword = async (userId: string) => {
    try {
      // Salvar a nova senha no Firebase
      const { userService } = await import('../../services/userService');
      await userService.updateUserPassword(userId, newPassword);
      
      // Salvar a nova senha no estado local
      setUserPasswords(prev => ({
        ...prev,
        [userId]: newPassword
      }));
      
      // Marcar como salvo
      setSavedPasswords(prev => ({
        ...prev,
        [userId]: true
      }));
      
      console.log(`Senha salva no Firebase para usuário ${userId}:`, newPassword);
      
      setEditingPassword(null);
      setNewPassword('');
      
      // Mostrar feedback visual
      const cell = document.querySelector(`[data-password-cell="${userId}"]`);
      if (cell) {
        cell.classList.add('bg-green-100');
        setTimeout(() => {
          cell.classList.remove('bg-green-100');
        }, 2000);
      }
      
      // Remover indicador de salvo após alguns segundos
      setTimeout(() => {
        setSavedPasswords(prev => ({
          ...prev,
          [userId]: false
        }));
      }, 3000);
      
      // Notificar outros usuários sobre a mudança de senha
      console.log('🔄 Senha atualizada - outros usuários serão notificados automaticamente');
    } catch (error) {
      console.error('Erro ao salvar senha:', error);
      
      // Mostrar feedback de erro
      const cell = document.querySelector(`[data-password-cell="${userId}"]`);
      if (cell) {
        cell.classList.add('bg-red-100');
        setTimeout(() => {
          cell.classList.remove('bg-red-100');
        }, 2000);
      }
    }
  };

  const handleCancelPasswordEdit = () => {
    setEditingPassword(null);
    setNewPassword('');
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPassword(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };
  
  // Função para obter a senha atual do usuário
  const getCurrentPassword = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return userPasswords[userId] || user?.password || 'password123';
  };
  
  // Função para verificar se a senha foi alterada
  const isPasswordChanged = (userId: string) => {
    return userPasswords[userId] && userPasswords[userId] !== 'password123';
  };
  const handleSaveAllUsersOld = () => {
    // Simular salvamento de todos os usuários (função antiga)
    console.log('Salvando todos os usuários:', sortedUsers.length);
    
    // Mostrar feedback visual
    const button = document.querySelector('[data-save-all-users]');
    if (button) {
      const originalText = button.textContent;
      button.textContent = 'Salvos!';
      button.classList.add('bg-green-600', 'text-white');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('bg-green-600', 'text-white');
      }, 2000);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    // Check if user is defined to prevent TypeError
    if (!user) {
      return false;
    }
    
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
        break;
      case 'email':
        aValue = (a.email || '').toLowerCase();
        bValue = (b.email || '').toLowerCase();
        break;
      case 'role':
        aValue = a.role;
        bValue = b.role;
        break;
      case 'lastLogin':
        aValue = (a.lastLogin instanceof Date && !isNaN(a.lastLogin.getTime())) ? a.lastLogin.getTime() : 0;
        bValue = (b.lastLogin instanceof Date && !isNaN(b.lastLogin.getTime())) ? b.lastLogin.getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrador', variant: 'danger' as const, color: 'text-red-600' };
      case 'manager':
        return { label: 'Gerente', variant: 'info' as const, color: 'text-blue-600' };
      case 'operator':
        return { label: 'Operador', variant: 'success' as const, color: 'text-green-600' };
      case 'viewer':
        return { label: 'Visualizador', variant: 'default' as const, color: 'text-gray-600' };
      default:
        return { label: 'Desconhecido', variant: 'default' as const, color: 'text-gray-600' };
    }
  };

  const handleExport = () => {
    const exportData = sortedUsers.map(user => ({
      'Nome': user.name,
      'Email': user.email,
      'Perfil': getRoleInfo(user.role).label,
      'Status': user.isActive ? 'Ativo' : 'Inativo',
      'Último Login': (user.lastLogin instanceof Date && !isNaN(user.lastLogin.getTime())) ? format(user.lastLogin, 'dd/MM/yyyy HH:mm') : 'Nunca',
      'Data de Criação': format(user.createdAt, 'dd/MM/yyyy HH:mm'),
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row];
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Imagem Icone-sigma.jpg adicionada aqui */}
          <img 
            src="/sigma.png" 
            alt="Ícone Sigma" 
            className="w-20 h-20 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-600 mt-1">
              Gerencie os usuários do sistema
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="secondary" 
            onClick={handleExport}
            className="flex items-center space-x-2"
            disabled={sortedUsers.length === 0}
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </Button>
          <Button 
            variant="success" 
            onClick={handleSaveAllUsers}
            data-save-all-users
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white transition-all duration-200"
            disabled={sortedUsers.length === 0}
          >
            <Save className="w-4 h-4" />
            <span>Salvar no Firebase</span>
          </Button>
          <Button onClick={onAdd} className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os perfis</option>
              <option value="admin">Administrador</option>
              <option value="manager">Gerente</option>
              <option value="operator">Operador</option>
              <option value="viewer">Visualizador</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>

            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-600">Ordenar por:</span>
        {(['name', 'email', 'role', 'lastLogin'] as const).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === field 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>
              {field === 'name' && 'Nome'}
              {field === 'email' && 'Email'}
              {field === 'role' && 'Perfil'}
              {field === 'lastLogin' && 'Último Login'}
            </span>
            {sortBy === field && (
              sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
            )}
          </button>
        ))}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Mostrando {sortedUsers.length} de {users.length} usuários
        </p>
      </div>

      {/* Users Grid/List */}
      {sortedUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Tente ajustar os filtros ou adicione um novo usuário.
            </p>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Usuário
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedUsers.map((user) => {
            const roleInfo = getRoleInfo(user.role);
            return (
              <Card key={user.id} hover className="group">
                <CardContent className="p-6">
                  {/* User Avatar */}
                  <div className="flex flex-col items-center mb-4">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-200 group-hover:border-blue-300 transition-colors">
                        <UserIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="mt-3 text-center">
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={roleInfo.variant} size="sm">
                        <Shield className="w-3 h-3 mr-1" />
                        {roleInfo.label}
                      </Badge>
                      <Badge variant={user.isActive ? 'success' : 'danger'} size="sm">
                        {user.isActive ? (
                          <UserCheck className="w-3 h-3 mr-1" />
                        ) : (
                          <UserX className="w-3 h-3 mr-1" />
                        )}
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Criado: {(user.createdAt instanceof Date && !isNaN(user.createdAt.getTime())) ? format(user.createdAt, 'dd/MM/yyyy') : 'Data inválida'}
                      </div>
                      {(user.lastLogin instanceof Date && !isNaN(user.lastLogin.getTime())) && (
                        <div className="flex items-center">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Último login: {format(user.lastLogin, 'dd/MM/yyyy')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveUser(user)}
                      data-save-user={user.id}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 transition-all duration-200"
                      title="Salvar usuário"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(user)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Perfil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Senha Atual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.role);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover mr-3"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                                <UserIcon className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Criado em {safeFormatDate(user.createdAt, 'dd/MM/yyyy') || 'Data inválida'}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={roleInfo.variant} size="sm">
                            <Shield className="w-3 h-3 mr-1" />
                            {roleInfo.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={user.isActive ? 'success' : 'danger'} size="sm">
                            {user.isActive ? (
                              <UserCheck className="w-3 h-3 mr-1" />
                            ) : (
                              <UserX className="w-3 h-3 mr-1" />
                            )}
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div 
                            className="text-sm text-gray-900 font-mono transition-colors duration-200"
                            data-password-cell={user.id}
                          >
                            {editingPassword === user.id ? (
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <input
                                    type={showPassword[user.id] ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nova senha"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => togglePasswordVisibility(user.id)}
                                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                                  >
                                    {showPassword[user.id] ? (
                                      <EyeOff className="w-3 h-3 text-gray-400" />
                                    ) : (
                                      <Eye className="w-3 h-3 text-gray-400" />
                                    )}
                                  </button>
                                </div>
                                <button
                                  onClick={() => handleSavePassword(user.id)}
                                  className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                  title="Salvar senha"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={handleCancelPasswordEdit}
                                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span 
                                  className={`select-none cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors ${
                                    isPasswordChanged(user.id) ? 'bg-blue-50 border border-blue-200' : ''
                                  }`}
                                  onClick={() => handleEditPassword(user.id)}
                                  title="Clique para editar a senha"
                                >
                                  {getCurrentPassword(user.id)}
                                </span>
                                {savedPasswords[user.id] && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 animate-pulse">
                                    <Check className="w-3 h-3 mr-1" />
                                    Salvo
                                  </span>
                                )}
                                {isPasswordChanged(user.id) && !savedPasswords[user.id] && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    <Edit className="w-3 h-3 mr-1" />
                                    Alterado
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLogin && safeFormatDate(user.lastLogin) ? (
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {safeFormatDate(user.lastLogin, 'dd/MM/yyyy HH:mm')}
                            </div>
                          ) : (
                            <span className="text-gray-400">Nunca</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveUser(user)}
                              data-save-user={user.id}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 transition-all duration-200"
                              title="Salvar usuário"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onView(user)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(user)}
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(user.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}