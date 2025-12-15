import { useState } from 'react';
import { User, UserRole } from '../../types';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { 
  User as UserIcon, 
  Edit, 
  Mail, 
  Shield, 
  Calendar, 
  Clock,
  ArrowLeft,
  UserCheck,
  UserX,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeFormatDate } from '../../utils/dateUtils';

interface UserDetailsProps {
  user: User;
  onEdit: () => void;
  onBack: () => void;
}

export function UserDetails({ user, onEdit, onBack }: UserDetailsProps) {
  const [showPasswordInfo, setShowPasswordInfo] = useState(false);

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrador',
          description: 'Acesso total ao sistema, incluindo gerenciamento de usuários e configurações',
          variant: 'danger' as const,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          permissions: [
            'Gerenciar usuários',
            'Configurações do sistema',
            'Todos os relatórios',
            'Gerenciar produtos',
            'Movimentações de estoque',
            'Visualizar todos os dados'
          ]
        };
      case 'manager':
        return {
          label: 'Gerente',
          description: 'Gerenciamento de produtos, relatórios e operações do inventário',
          variant: 'info' as const,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          permissions: [
            'Visualizar dashboard',
            'Relatórios gerenciais',
            'Gerenciar produtos',
            'Movimentações de estoque',
            'Visualizar dados do inventário'
          ]
        };
      case 'operator':
        return {
          label: 'Operador',
          description: 'Operações de movimentação e gerenciamento básico de produtos',
          variant: 'success' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          permissions: [
            'Movimentações de estoque',
            'Gerenciar produtos',
            'Visualizar dados básicos'
          ]
        };
      case 'viewer':
        return {
          label: 'Visualizador',
          description: 'Apenas visualização de dados, sem permissões de edição',
          variant: 'default' as const,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          permissions: [
            'Visualizar produtos',
            'Visualizar relatórios básicos'
          ]
        };
    }
  };

  const roleInfo = getRoleInfo(user.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <Button onClick={onEdit}>
          <Edit className="w-4 h-4 mr-2" />
          Editar Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Informações do Perfil</h3>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Basic Info */}
              <div className="flex items-center space-x-6">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-4 border-gray-200">
                    <UserIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-3">
                    <Badge variant={roleInfo.variant}>
                      <Shield className="w-3 h-3 mr-1" />
                      {roleInfo.label}
                    </Badge>
                    <Badge variant={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? (
                        <UserCheck className="w-3 h-3 mr-1" />
                      ) : (
                        <UserX className="w-3 h-3 mr-1" />
                      )}
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role and Permissions */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Perfil e Permissões
              </h3>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${roleInfo.bgColor} border-2 border-opacity-20`}>
                <div className="flex items-center space-x-3 mb-3">
                  <Shield className={`w-6 h-6 ${roleInfo.color}`} />
                  <div>
                    <h4 className={`text-lg font-semibold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {roleInfo.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Permissões do usuário:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {roleInfo.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">{permission}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Status da Conta</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border-2 ${
                  user.isActive 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    {user.isActive ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <h4 className={`font-semibold ${
                        user.isActive ? 'text-green-900' : 'text-red-900'
                      }`}>
                        Conta {user.isActive ? 'Ativa' : 'Inativa'}
                      </h4>
                      <p className={`text-sm ${
                        user.isActive ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {user.isActive 
                          ? 'O usuário pode fazer login e acessar o sistema normalmente'
                          : 'O usuário não pode fazer login no sistema'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {user.lastLogin && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="w-6 h-6 text-blue-600" />
                      <div>
                        <h4 className="font-semibold text-blue-900">Último Acesso</h4>
                        <p className="text-sm text-blue-700">
                          {safeFormatDate(user.lastLogin, "dd 'de' MMMM 'de' yyyy 'às' HH:mm")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Informações Rápidas</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Perfil</span>
                  <Badge variant={roleInfo.variant} size="sm">
                    {roleInfo.label}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <Badge variant={user.isActive ? 'success' : 'danger'} size="sm">
                    {user.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Último Login</span>
                  <span className="text-sm text-gray-900">
                    {user.lastLogin 
                      ? format(user.lastLogin, 'dd/MM/yyyy')
                      : 'Nunca'
                    }
                  </span>
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
                <label className="text-sm font-medium text-gray-500">Conta criada em</label>
                <p className="text-gray-900">
                  {user.createdAt ? safeFormatDate(user.createdAt, "dd 'de' MMMM 'de' yyyy") : 'Data não disponível'}
                </p>
                <p className="text-sm text-gray-500">
                  {user.createdAt ? safeFormatDate(user.createdAt, 'HH:mm') : ''}
                </p>
              </div>
              
              {user.lastLogin && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Último acesso</label>
                  <p className="text-gray-900">
                    {safeFormatDate(user.lastLogin, "dd 'de' MMMM 'de' yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    {safeFormatDate(user.lastLogin, 'HH:mm')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">Senha configurada</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700">Email verificado</span>
              </div>

              {user.isActive ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Acesso liberado</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-700">Acesso bloqueado</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}