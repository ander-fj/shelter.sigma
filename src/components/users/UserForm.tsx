import { useState, useEffect } from 'react';
import { User, UserRole, PageAccess, DEFAULT_PAGE_ACCESS } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  User as UserIcon, 
  Upload, 
  X, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  Lock,
  Monitor,
  LayoutDashboard,
  Package,
  TrendingUp,
  HandHeart,
  Users as UsersIcon,
  Building,
  Settings,
  BarChart3,
  CheckCircle
} from 'lucide-react';
import { Settings as OperatorIcon } from 'lucide-react';

interface UserFormProps {
  user?: User;
  onSubmit: (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function UserForm({ 
  user, 
  onSubmit, 
  onCancel, 
  loading = false 
}: UserFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
    avatar: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    pageAccess: DEFAULT_PAGE_ACCESS['viewer'],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || '',
        password: user.password || '',
        confirmPassword: user.password || '',
        isActive: user.isActive,
        pageAccess: user.pageAccess || DEFAULT_PAGE_ACCESS[user.role],
      });
    } else {
      // Para novos usuários, definir acesso padrão baseado no role
      setFormData(prev => ({
        ...prev,
        pageAccess: {
          ...DEFAULT_PAGE_ACCESS[prev.role],
          operator: true, // Force operator access to true
        },
      }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    
    // Atualizar acesso às páginas quando o role mudar
    if (name === 'role') {
      setFormData(prev => ({
        ...prev,
        pageAccess: {
          ...DEFAULT_PAGE_ACCESS[value as UserRole],
          operator: true, // Force operator access to true
        },
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          avatar: imageUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setFormData(prev => ({
      ...prev,
      avatar: ''
    }));
  };

  const handlePageAccessChange = (page: keyof PageAccess, hasAccess: boolean) => {
    setFormData(prev => ({
      ...prev,
      pageAccess: {
        ...prev.pageAccess,
        [page]: hasAccess,
      },
    }));
  };

  const getPageInfo = (page: keyof PageAccess) => {
    const pageInfoMap = {
      dashboard: {
        name: 'Dashboard',
        description: 'Visão geral e estatísticas do sistema',
        icon: LayoutDashboard,
        color: 'text-blue-600',
      },
      products: {
        name: 'Produtos',
        description: 'Gerenciar catálogo de produtos',
        icon: Package,
        color: 'text-green-600',
      },
      movements: {
        name: 'Movimentações',
        description: 'Registrar entradas e saídas de estoque',
        icon: TrendingUp,
        color: 'text-purple-600',
      },
      loans: {
        name: 'Empréstimos',
        description: 'Gerenciar empréstimos de produtos',
        icon: HandHeart,
        color: 'text-pink-600',
      },
      inventoryScheduling: {
        name: 'Agendamentos',
        description: 'Agendar e executar inventários',
        icon: Calendar,
        color: 'text-indigo-600',
      },
      operator: {
        name: 'Operador',
        description: 'Reserva e gerenciamento de equipamentos',
        icon: OperatorIcon,
        color: 'text-purple-600',
      },
      users: {
        name: 'Usuários',
        description: 'Gerenciar usuários do sistema',
        icon: UsersIcon,
        color: 'text-red-600',
      },
      suppliers: {
        name: 'Fornecedores',
        description: 'Gerenciar fornecedores',
        icon: Building,
        color: 'text-yellow-600',
      },
      settings: {
        name: 'Configurações',
        description: 'Configurações do sistema',
        icon: Settings,
        color: 'text-gray-600',
      },
      reports: {
        name: 'Relatórios',
        description: 'Gerar e visualizar relatórios',
        icon: BarChart3,
        color: 'text-orange-600',
      },
    };
    
    return pageInfoMap[page];
  };

  const validateForm = () => {
    // Sem validação - permite gravar com qualquer campo
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = {
      name: formData.name.trim() || 'Usuário sem nome',
      email: formData.email.trim().toLowerCase(),
      password: formData.password.trim() || (user?.password || 'password123'),
      role: formData.role,
      avatar: formData.avatar || undefined,
      isActive: formData.isActive,
      pageAccess: formData.pageAccess,
    };

    onSubmit(userData);
  };

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Administrador',
          description: 'Acesso total ao sistema',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          variant: 'danger' as const
        };
      case 'manager':
        return {
          label: 'Gerente',
          description: 'Gerenciamento de produtos e relatórios',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          variant: 'info' as const
        };
      case 'operator':
        return {
          label: 'Operador',
          description: 'Movimentações e consultas',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          variant: 'success' as const
        };
      case 'viewer':
        return {
          label: 'Visualizador',
          description: 'Apenas visualização',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          variant: 'default' as const
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {user ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <p className="text-gray-600">
                {user ? 'Atualize as informações do usuário' : 'Adicione um novo usuário ao sistema'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Foto do Perfil</h3>
              
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {formData.avatar ? (
                    <div className="relative group">
                      <img
                        src={formData.avatar}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center border-4 border-gray-200">
                      <UserIcon className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <label className="block">
                    <span className="sr-only">Escolher foto do perfil</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG ou JPEG (MAX. 2MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Informações Básicas</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Nome Completo"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                  placeholder="Ex: João Silva"
                  icon={<UserIcon className="w-4 h-4" />}
                />
                
                <Input
                  label="Login"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  placeholder="Ex: joao.silva"
                  icon={<Mail className="w-4 h-4" />}
                />
              </div>
            </div>

            {/* Perfil e Permissões */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Perfil e Permissões
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nível de Acesso
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Visualizador</option>
                    <option value="operator">Operador</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* Role Description */}
                <Card className={`${getRoleInfo(formData.role).bgColor} border-2`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Shield className={`w-5 h-5 ${getRoleInfo(formData.role).color}`} />
                      <div>
                        <h4 className={`font-semibold ${getRoleInfo(formData.role).color}`}>
                          {getRoleInfo(formData.role).label}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {getRoleInfo(formData.role).description}
                        </p>
                      </div>
                      <Badge variant={getRoleInfo(formData.role).variant}>
                        {getRoleInfo(formData.role).label}
                      </Badge>
                    </div>

                    {/* Permissions List */}
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Permissões:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {formData.role === 'admin' && (
                          <>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Gerenciar usuários
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Configurações do sistema
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Todos os relatórios
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Gerenciar produtos
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Movimentações
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Visualizar dados
                            </div>
                          </>
                        )}
                        {formData.role === 'manager' && (
                          <>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Visualizar dashboard
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Relatórios gerenciais
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Gerenciar produtos
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Movimentações
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Visualizar dados
                            </div>
                          </>
                        )}
                        {formData.role === 'operator' && (
                          <>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Movimentações
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Gerenciar produtos
                            </div>
                            <div className="flex items-center text-green-600">
                              <UserCheck className="w-3 h-3 mr-1" />
                              Visualizar dados
                            </div>
                          </>
                        )}
                        {formData.role === 'viewer' && (
                          <div className="flex items-center text-green-600">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Apenas visualização
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Controle de Acesso às Páginas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Acesso às Páginas
              </h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Controle Granular de Acesso</p>
                    <p>Selecione exatamente quais páginas este usuário poderá acessar. As permissões são aplicadas automaticamente baseadas no perfil, mas você pode personalizar conforme necessário.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.keys(formData.pageAccess) as Array<keyof PageAccess>).map((page) => {
                  const pageInfo = getPageInfo(page);
                  const hasAccess = formData.pageAccess[page];
                  
                  return (
                    <Card 
                      key={page} 
                      className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
                        hasAccess 
                          ? 'bg-green-50 border-green-200 shadow-sm' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => handlePageAccessChange(page, !hasAccess)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            hasAccess ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <pageInfo.icon className={`w-5 h-5 ${
                              hasAccess ? pageInfo.color : 'text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-semibold text-sm ${
                                hasAccess ? 'text-gray-900' : 'text-gray-500'
                              }`}>
                                {pageInfo.name}
                              </h4>
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handlePageAccessChange(page, e.target.checked);
                                }}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                            </div>
                            <p className={`text-xs ${
                              hasAccess ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {pageInfo.description}
                            </p>
                            <div className="mt-2">
                              <Badge 
                                variant={hasAccess ? 'success' : 'default'} 
                                size="sm"
                              >
                                {hasAccess ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Permitido
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3 h-3 mr-1" />
                                    Bloqueado
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {/* Force Operador card to always appear */}
                <Card 
                  className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
                    formData.pageAccess.operator 
                      ? 'bg-green-50 border-green-200 shadow-sm' 
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => handlePageAccessChange('operator', !formData.pageAccess.operator)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        formData.pageAccess.operator ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <OperatorIcon className={`w-5 h-5 ${
                          formData.pageAccess.operator ? 'text-purple-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold text-sm ${
                            formData.pageAccess.operator ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            Operador
                          </h4>
                          <input
                            type="checkbox"
                            checked={formData.pageAccess.operator}
                            onChange={(e) => {
                              e.stopPropagation();
                              handlePageAccessChange('operator', e.target.checked);
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          />
                        </div>
                        <p className={`text-xs ${
                          formData.pageAccess.operator ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          Reserva e gerenciamento de equipamentos
                        </p>
                        <div className="mt-2">
                          <Badge 
                            variant={formData.pageAccess.operator ? 'success' : 'default'} 
                            size="sm"
                          >
                            {formData.pageAccess.operator ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Permitido
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Bloqueado
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo de Acesso */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Resumo de Acesso
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total de Páginas:</span>
                      <p className="font-semibold text-gray-900">
                        {Object.keys(formData.pageAccess).length}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Páginas Permitidas:</span>
                      <p className="font-semibold text-green-600">
                        {Object.values(formData.pageAccess).filter(Boolean).length}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Páginas Bloqueadas:</span>
                      <p className="font-semibold text-red-600">
                        {Object.values(formData.pageAccess).filter(access => !access).length}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Nível de Acesso:</span>
                      <p className="font-semibold text-blue-600">
                        {Math.round((Object.values(formData.pageAccess).filter(Boolean).length / Object.keys(formData.pageAccess).length) * 100)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Senha */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {user ? 'Alterar Senha (opcional)' : 'Senha de Acesso'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {user ? 'Nova Senha (opcional)' : 'Senha (opcional)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={user ? 'Deixe em branco para manter a atual' : 'Digite a senha (opcional)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar Senha (opcional)
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Confirme a senha (opcional)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="text-xs text-gray-600">
                    <p className="font-medium mb-1">Informações sobre senha:</p>
                    <ul className="space-y-1">
                      <li>• Senha é opcional para novos usuários</li>
                      <li>• Se não informada, será gerada automaticamente</li>
                      <li>• Recomendado: mínimo de 6 caracteres</li>
                      <li>• Use letras, números e símbolos para maior segurança</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Status da Conta</h3>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Conta ativa
                </label>
                <Badge variant={formData.isActive ? 'success' : 'danger'}>
                  {formData.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                {formData.isActive ? (
                  <p>✓ O usuário poderá fazer login e acessar o sistema</p>
                ) : (
                  <p>⚠️ O usuário não poderá fazer login no sistema</p>
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
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold px-10 py-4 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-500 flex items-center space-x-3 border-0 focus:ring-4 focus:ring-emerald-300 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                <UserIcon className="w-6 h-6 relative z-10" />
                <span className="text-lg relative z-10">{user ? 'Atualizar Usuário' : 'Gravar Usuário'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}