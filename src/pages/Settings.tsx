import { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ThemeSettings, DEFAULT_THEMES } from '../types/settings';
import { Settings as SettingsIcon, Palette, Monitor, Globe, Bell, Shield, Download, Upload, RotateCcw, Save, Eye, EyeOff, Image, Droplets, Layers, Mountain, Sunrise, Sunset, ArrowLeft, Check, X, AlertTriangle, Info, Zap, Brain as Train } from 'lucide-react';

export function Settings() {
  const { hasRole } = useAuth();
  const { 
    settings, 
    updateSettings, 
    updateTheme, 
    resetToDefaults, 
    exportSettings, 
    importSettings,
    applyTheme 
  } = useSettings();
  
  const [activeTab, setActiveTab] = useState('theme');
  const [previewTheme, setPreviewTheme] = useState<ThemeSettings | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [importData, setImportData] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  // Check admin access
  if (!hasRole('admin')) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-600 mb-4">
              Apenas administradores podem acessar as configurações do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleThemePreview = (theme: ThemeSettings) => {
    setPreviewTheme(theme);
    setIsPreviewMode(true);
    applyTheme(theme);
  };

  const handleConfirmTheme = () => {
    if (previewTheme) {
      updateTheme(previewTheme);
      setIsPreviewMode(false);
      setPreviewTheme(null);
    }
  };

  const handleCancelPreview = () => {
    setIsPreviewMode(false);
    setPreviewTheme(null);
    applyTheme(settings.theme);
  };

  const handleCustomThemeChange = (property: string, value: any) => {
    const currentTheme = previewTheme || settings.theme;
    const updatedTheme = { ...currentTheme };
    
    // Handle nested properties
    if (property.includes('.')) {
      const [parent, child] = property.split('.');
      updatedTheme[parent as keyof ThemeSettings] = {
        ...updatedTheme[parent as keyof ThemeSettings],
        [child]: value
      } as any;
    } else {
      (updatedTheme as any)[property] = value;
    }
    
    handleThemePreview(updatedTheme);
  };

  const handleBackgroundImageSelect = (imageUrl: string) => {
    const currentTheme = previewTheme || settings.theme;
    const updatedTheme = {
      ...currentTheme,
      background: {
        ...currentTheme.background,
        type: 'image' as const,
        image: imageUrl,
        imageOpacity: 80,
        overlayColor: '#000000',
        overlayOpacity: 20
      }
    };
    console.log('🚂 Aplicando imagem do trem:', updatedTheme.background);
    handleThemePreview(updatedTheme);
  };

  const handleExport = () => {
    const data = exportSettings();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `configuracoes_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (importData.trim()) {
      const success = importSettings(importData);
      if (success) {
        setShowImportModal(false);
        setImportData('');
        alert('Configurações importadas com sucesso!');
      } else {
        alert('Erro ao importar configurações. Verifique o formato do arquivo.');
      }
    }
  };

  const tabs = [
    { id: 'theme', label: 'Tema', icon: Palette },
    { id: 'background', label: 'Plano de Fundo', icon: Image },
    { id: 'system', label: 'Sistema', icon: Monitor },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'backup', label: 'Backup', icon: Download },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="/sigma.png" 
            alt="Ícone Sigma" 
            className="w-20 h-20 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
            <p className="text-gray-600 mt-1">
              Personalize a aparência e comportamento do sistema
            </p>
          </div>
        </div>
        {isPreviewMode && (
          <div className="flex items-center space-x-3">
            <Badge variant="warning" className="animate-pulse">
              <Eye className="w-3 h-3 mr-1" />
              Modo Prévia
            </Badge>
            <Button
              variant="success"
              onClick={handleConfirmTheme}
              className="flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelPreview}
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Cancelar</span>
            </Button>
          </div>
        )}
      </div>

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <Card className="bg-yellow-50 border-yellow-200 border-2">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-900">Modo de Prévia Ativo</p>
                <p className="text-sm text-yellow-700">
                  As alterações são temporárias. Confirme para salvar ou cancele para reverter.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="space-y-6">
              {/* Custom Theme Editor */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Palette className="w-5 h-5 mr-2" />
                    Personalização de Cores
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em qualquer cor para personalizá-la. As mudanças são aplicadas em tempo real.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Colors */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                      <Droplets className="w-4 h-4 mr-2" />
                      Paleta de Cores do Sistema
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries((previewTheme || settings.theme).colors).map(([key, value]) => (
                        <div key={key} className="space-y-2 group">
                          <label className="block text-sm font-medium text-gray-700 capitalize">
                            {key === 'primary' && '🎨 Cor Principal'}
                            {key === 'secondary' && '🔘 Cor Secundária'}
                            {key === 'accent' && '✨ Cor de Destaque'}
                            {key === 'background' && '🖼️ Fundo'}
                            {key === 'surface' && '📄 Superfície'}
                            {key === 'text' && '📝 Texto'}
                            {key === 'textSecondary' && '📝 Texto Secundário'}
                            {key === 'success' && '✅ Sucesso'}
                            {key === 'warning' && '⚠️ Aviso'}
                            {key === 'error' && '❌ Erro'}
                            {key === 'info' && 'ℹ️ Informação'}
                          </label>
                          <div className="flex items-center space-x-3 p-2 bg-white rounded-lg border border-gray-200 group-hover:border-blue-300 transition-colors">
                            <input
                              type="color"
                              value={value}
                              onChange={(e) => handleCustomThemeChange(`colors.${key}`, e.target.value)}
                              className="w-12 h-12 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors shadow-sm"
                              title={`Clique para alterar a cor ${key}`}
                            />
                            <div className="flex-1">
                              <div 
                                className="w-full h-6 rounded border border-gray-200 shadow-inner"
                                style={{ backgroundColor: value }}
                                title={`Prévia da cor ${key}`}
                              />
                              <span className="text-xs text-gray-600 font-mono mt-1 block">{value}</span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {key === 'primary' && 'Botões principais, links e elementos de destaque'}
                            {key === 'secondary' && 'Elementos secundários e bordas'}
                            {key === 'accent' && 'Elementos de ênfase e call-to-action'}
                            {key === 'background' && 'Cor de fundo principal da aplicação'}
                            {key === 'surface' && 'Fundo de cards e modais'}
                            {key === 'text' && 'Cor principal do texto'}
                            {key === 'textSecondary' && 'Cor de texto secundário e legendas'}
                            {key === 'success' && 'Mensagens de sucesso e confirmação'}
                            {key === 'warning' && 'Alertas e avisos importantes'}
                            {key === 'error' && 'Mensagens de erro e validação'}
                            {key === 'info' && 'Informações e dicas'}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Color Presets */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-3">🎨 Paletas Rápidas</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                          onClick={() => {
                            const blueTheme = { ...settings.theme };
                            blueTheme.colors.primary = '#3B82F6';
                            blueTheme.colors.accent = '#10B981';
                            handleThemePreview(blueTheme);
                          }}
                          className="p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-colors text-center"
                        >
                          <div className="flex space-x-1 justify-center mb-2">
                            <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                          </div>
                          <span className="text-xs text-gray-700">Azul & Verde</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const purpleTheme = { ...settings.theme };
                            purpleTheme.colors.primary = '#8B5CF6';
                            purpleTheme.colors.accent = '#EC4899';
                            handleThemePreview(purpleTheme);
                          }}
                          className="p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-500 transition-colors text-center"
                        >
                          <div className="flex space-x-1 justify-center mb-2">
                            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                            <div className="w-4 h-4 rounded-full bg-pink-500"></div>
                          </div>
                          <span className="text-xs text-gray-700">Roxo & Rosa</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const orangeTheme = { ...settings.theme };
                            orangeTheme.colors.primary = '#F97316';
                            orangeTheme.colors.accent = '#EAB308';
                            handleThemePreview(orangeTheme);
                          }}
                          className="p-3 bg-white rounded-lg border border-gray-200 hover:border-orange-500 transition-colors text-center"
                        >
                          <div className="flex space-x-1 justify-center mb-2">
                            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                          </div>
                          <span className="text-xs text-gray-700">Laranja & Amarelo</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            const redTheme = { ...settings.theme };
                            redTheme.colors.primary = '#DC2626';
                            redTheme.colors.accent = '#7C3AED';
                            handleThemePreview(redTheme);
                          }}
                          className="p-3 bg-white rounded-lg border border-gray-200 hover:border-red-500 transition-colors text-center"
                        >
                          <div className="flex space-x-1 justify-center mb-2">
                            <div className="w-4 h-4 rounded-full bg-red-600"></div>
                            <div className="w-4 h-4 rounded-full bg-violet-600"></div>
                          </div>
                          <span className="text-xs text-gray-700">Vermelho & Violeta</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Typography */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Tipografia</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Tamanho da Fonte
                        </label>
                        <select
                          value={(previewTheme || settings.theme).fonts.size}
                          onChange={(e) => handleCustomThemeChange('fonts.size', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="small">Pequeno</option>
                          <option value="medium">Médio</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Peso da Fonte
                        </label>
                        <select
                          value={(previewTheme || settings.theme).fonts.weight}
                          onChange={(e) => handleCustomThemeChange('fonts.weight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="light">Leve</option>
                          <option value="normal">Normal</option>
                          <option value="medium">Médio</option>
                          <option value="semibold">Semi-negrito</option>
                          <option value="bold">Negrito</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Layout */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Layout</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Bordas Arredondadas
                        </label>
                        <select
                          value={(previewTheme || settings.theme).layout.borderRadius}
                          onChange={(e) => handleCustomThemeChange('layout.borderRadius', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="small">Pequena</option>
                          <option value="medium">Média</option>
                          <option value="large">Grande</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Espaçamento
                        </label>
                        <select
                          value={(previewTheme || settings.theme).layout.spacing}
                          onChange={(e) => handleCustomThemeChange('layout.spacing', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="compact">Compacto</option>
                          <option value="normal">Normal</option>
                          <option value="comfortable">Confortável</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Sombras
                        </label>
                        <select
                          value={(previewTheme || settings.theme).layout.shadows}
                          onChange={(e) => handleCustomThemeChange('layout.shadows', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Nenhuma</option>
                          <option value="subtle">Sutil</option>
                          <option value="medium">Média</option>
                          <option value="strong">Forte</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Background Tab */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Image className="w-5 h-5 mr-2" />
                    Tipo de Plano de Fundo
                  </h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { value: 'color', label: 'Cor Sólida', icon: Droplets },
                      { value: 'image', label: 'Imagem', icon: Image },
                      { value: 'gradient', label: 'Gradiente', icon: Layers }
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => handleCustomThemeChange('background.type', type.value)}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                          (previewTheme || settings.theme).background.type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <type.icon className={`w-8 h-8 mx-auto mb-2 ${
                          (previewTheme || settings.theme).background.type === type.value ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                        <p className={`font-medium ${
                          (previewTheme || settings.theme).background.type === type.value ? 'text-blue-900' : 'text-gray-700'
                        }`}>
                          {type.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Background Image Options */}
              {(previewTheme || settings.theme).background.type === 'image' && (
                <>
                  {/* Quick Background Options */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-gray-900">Opções Rápidas</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                          onClick={() => handleBackgroundImageSelect('/TREM.jpeg')}
                          className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                            (previewTheme || settings.theme).background.image === '/TREM.jpeg' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-blue-500'
                          }`}
                        >
                          <div className="aspect-video bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                            <img 
                              src="/TREM.jpeg" 
                              alt="Trem MRS" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center" style={{display: 'none'}}>
                              <Train className="w-8 h-8 text-white" />
                            </div>
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium text-gray-900">Trem MRS</p>
                            <p className="text-xs text-gray-600">Imagem oficial</p>
                          </div>
                          {(previewTheme || settings.theme).background.image === '/TREM.jpeg' && (
                            <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>

                        <button
                          onClick={() => handleBackgroundImageSelect('https://images.pexels.com/photos/531880/pexels-photo-531880.jpeg')}
                          className="group relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200"
                        >
                          <div className="aspect-video bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                            <Mountain className="w-8 h-8 text-white" />
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium text-gray-900">Paisagem</p>
                            <p className="text-xs text-gray-600">Montanhas</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleBackgroundImageSelect('https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg')}
                          className="group relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200"
                        >
                          <div className="aspect-video bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                            <Sunrise className="w-8 h-8 text-white" />
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium text-gray-900">Nascer do Sol</p>
                            <p className="text-xs text-gray-600">Céu colorido</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleBackgroundImageSelect('https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg')}
                          className="group relative overflow-hidden rounded-lg border-2 border-gray-200 hover:border-blue-500 transition-all duration-200"
                        >
                          <div className="aspect-video bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <Sunset className="w-8 h-8 text-white" />
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium text-gray-900">Pôr do Sol</p>
                            <p className="text-xs text-gray-600">Céu noturno</p>
                          </div>
                        </button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Custom Image URL */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-gray-900">Imagem Personalizada</h3>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input
                        label="URL da Imagem"
                        value={(previewTheme || settings.theme).background.image || ''}
                        onChange={(e) => handleCustomThemeChange('background.image', e.target.value)}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </CardContent>
                  </Card>

                  {/* Image Settings */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-gray-900">Configurações da Imagem</h3>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Image Opacity */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Transparência da Imagem: {(previewTheme || settings.theme).background.imageOpacity}%
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={(previewTheme || settings.theme).background.imageOpacity}
                          onChange={(e) => handleCustomThemeChange('background.imageOpacity', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>10% (Muito transparente)</span>
                          <span>100% (Opaco)</span>
                        </div>
                      </div>

                      {/* Overlay Settings */}
                      <div className="space-y-4">
                        <h5 className="font-medium text-gray-800">Sobreposição para Legibilidade</h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Cor da Sobreposição
                            </label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="color"
                                value={(previewTheme || settings.theme).background.overlayColor}
                                onChange={(e) => handleCustomThemeChange('background.overlayColor', e.target.value)}
                                className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                              />
                              <span className="text-sm text-gray-600 font-mono">
                                {(previewTheme || settings.theme).background.overlayColor}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Opacidade da Sobreposição: {(previewTheme || settings.theme).background.overlayOpacity}%
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="80"
                              value={(previewTheme || settings.theme).background.overlayOpacity}
                              onChange={(e) => handleCustomThemeChange('background.overlayOpacity', parseInt(e.target.value))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Position and Size */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Posição
                          </label>
                          <select
                            value={(previewTheme || settings.theme).background.position}
                            onChange={(e) => handleCustomThemeChange('background.position', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="center">Centro</option>
                            <option value="top">Topo</option>
                            <option value="bottom">Inferior</option>
                            <option value="left">Esquerda</option>
                            <option value="right">Direita</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Tamanho
                          </label>
                          <select
                            value={(previewTheme || settings.theme).background.size}
                            onChange={(e) => handleCustomThemeChange('background.size', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="cover">Cobrir</option>
                            <option value="contain">Conter</option>
                            <option value="auto">Automático</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Repetição
                          </label>
                          <select
                            value={(previewTheme || settings.theme).background.repeat}
                            onChange={(e) => handleCustomThemeChange('background.repeat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="no-repeat">Não repetir</option>
                            <option value="repeat">Repetir</option>
                            <option value="repeat-x">Horizontal</option>
                            <option value="repeat-y">Vertical</option>
                          </select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Monitor className="w-5 h-5 mr-2" />
                    Configurações do Sistema
                  </h3>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Nome da Empresa"
                      value={settings.companyName}
                      onChange={(e) => updateSettings({ companyName: e.target.value })}
                      placeholder="Nome da sua empresa"
                    />
                    
                    <Input
                      label="Nome do Sistema"
                      value={settings.systemName}
                      onChange={(e) => updateSettings({ systemName: e.target.value })}
                      placeholder="Nome do sistema"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Idioma
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSettings({ language: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Formato de Data
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => updateSettings({ dateFormat: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="dd/MM/yyyy">DD/MM/AAAA</option>
                        <option value="MM/dd/yyyy">MM/DD/AAAA</option>
                        <option value="yyyy-MM-dd">AAAA-MM-DD</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Moeda
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSettings({ currency: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="BRL">Real (R$)</option>
                        <option value="USD">Dólar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900">Recursos</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(settings.features).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {key === 'darkMode' && 'Modo Escuro'}
                            {key === 'animations' && 'Animações'}
                            {key === 'autoSave' && 'Salvamento Automático'}
                            {key === 'offlineMode' && 'Modo Offline'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {key === 'darkMode' && 'Alternar automaticamente entre temas claro e escuro'}
                            {key === 'animations' && 'Habilitar animações e transições suaves'}
                            {key === 'autoSave' && 'Salvar alterações automaticamente'}
                            {key === 'offlineMode' && 'Permitir uso offline do sistema'}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => updateSettings({
                            features: { ...settings.features, [key]: e.target.checked }
                          })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Bell className="w-5 h-5 mr-2" />
                  Configurações de Notificações
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(settings.notifications).map(([key, value]) => {
                    if (key === 'notificationEmail') return null;

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {key === 'enabled' && 'Notificações Habilitadas'}
                              {key === 'sound' && 'Som das Notificações'}
                              {key === 'desktop' && 'Notificações na Área de Trabalho'}
                              {key === 'email' && 'Notificações por Email'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {key === 'enabled' && 'Habilitar todas as notificações do sistema'}
                              {key === 'sound' && 'Reproduzir som quando receber notificações'}
                              {key === 'desktop' && 'Mostrar notificações na área de trabalho'}
                              {key === 'email' && 'Enviar notificações importantes por email'}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={value as boolean}
                            onChange={(e) => updateSettings({
                              notifications: { ...settings.notifications, [key]: e.target.checked }
                            })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        </div>

                        {key === 'email' && settings.notifications.email && (
                          <div className="mt-3 ml-0 space-y-4">
                            <div>
                              <Input
                                type="email"
                                value={settings.notifications.notificationEmail || ''}
                                onChange={(e) => updateSettings({
                                  notifications: { ...settings.notifications, notificationEmail: e.target.value }
                                })}
                                placeholder="seu.email@exemplo.com"
                                className="max-w-md"
                              />
                            </div>

                            <div className="border-t pt-3 space-y-3">
                              <p className="text-sm font-medium text-gray-700">Tipos de notificações por e-mail:</p>

                              <div className="space-y-2">
                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications.emailTypes?.lateLoans ?? true}
                                    onChange={(e) => updateSettings({
                                      notifications: {
                                        ...settings.notifications,
                                        emailTypes: {
                                          ...settings.notifications.emailTypes,
                                          lateLoans: e.target.checked,
                                          pendingSchedules: settings.notifications.emailTypes?.pendingSchedules ?? true,
                                          lowStock: settings.notifications.emailTypes?.lowStock ?? true,
                                          pendingApprovals: settings.notifications.emailTypes?.pendingApprovals ?? true,
                                          expiredReservations: settings.notifications.emailTypes?.expiredReservations ?? true,
                                        }
                                      }
                                    })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Empréstimos atrasados</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications.emailTypes?.pendingSchedules ?? true}
                                    onChange={(e) => updateSettings({
                                      notifications: {
                                        ...settings.notifications,
                                        emailTypes: {
                                          ...settings.notifications.emailTypes,
                                          lateLoans: settings.notifications.emailTypes?.lateLoans ?? true,
                                          pendingSchedules: e.target.checked,
                                          lowStock: settings.notifications.emailTypes?.lowStock ?? true,
                                          pendingApprovals: settings.notifications.emailTypes?.pendingApprovals ?? true,
                                          expiredReservations: settings.notifications.emailTypes?.expiredReservations ?? true,
                                        }
                                      }
                                    })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Agendamentos não realizados</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications.emailTypes?.lowStock ?? true}
                                    onChange={(e) => updateSettings({
                                      notifications: {
                                        ...settings.notifications,
                                        emailTypes: {
                                          ...settings.notifications.emailTypes,
                                          lateLoans: settings.notifications.emailTypes?.lateLoans ?? true,
                                          pendingSchedules: settings.notifications.emailTypes?.pendingSchedules ?? true,
                                          lowStock: e.target.checked,
                                          pendingApprovals: settings.notifications.emailTypes?.pendingApprovals ?? true,
                                          expiredReservations: settings.notifications.emailTypes?.expiredReservations ?? true,
                                        }
                                      }
                                    })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Estoque baixo</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications.emailTypes?.pendingApprovals ?? true}
                                    onChange={(e) => updateSettings({
                                      notifications: {
                                        ...settings.notifications,
                                        emailTypes: {
                                          ...settings.notifications.emailTypes,
                                          lateLoans: settings.notifications.emailTypes?.lateLoans ?? true,
                                          pendingSchedules: settings.notifications.emailTypes?.pendingSchedules ?? true,
                                          lowStock: settings.notifications.emailTypes?.lowStock ?? true,
                                          pendingApprovals: e.target.checked,
                                          expiredReservations: settings.notifications.emailTypes?.expiredReservations ?? true,
                                        }
                                      }
                                    })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Aprovações pendentes</span>
                                </label>

                                <label className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={settings.notifications.emailTypes?.expiredReservations ?? true}
                                    onChange={(e) => updateSettings({
                                      notifications: {
                                        ...settings.notifications,
                                        emailTypes: {
                                          ...settings.notifications.emailTypes,
                                          lateLoans: settings.notifications.emailTypes?.lateLoans ?? true,
                                          pendingSchedules: settings.notifications.emailTypes?.pendingSchedules ?? true,
                                          lowStock: settings.notifications.emailTypes?.lowStock ?? true,
                                          pendingApprovals: settings.notifications.emailTypes?.pendingApprovals ?? true,
                                          expiredReservations: e.target.checked,
                                        }
                                      }
                                    })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">Reservas expiradas</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Backup Tab */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Download className="w-5 h-5 mr-2" />
                    Backup e Restauração
                  </h3>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Exportar Configurações</h4>
                      <p className="text-sm text-gray-600">
                        Baixe um arquivo com todas as suas configurações personalizadas
                      </p>
                      <Button
                        onClick={handleExport}
                        className="w-full flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Exportar Configurações</span>
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Importar Configurações</h4>
                      <p className="text-sm text-gray-600">
                        Restaure configurações de um arquivo de backup
                      </p>
                      <Button
                        onClick={() => setShowImportModal(true)}
                        variant="secondary"
                        className="w-full flex items-center justify-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Importar Configurações</span>
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 text-red-600">Zona de Perigo</h4>
                      <p className="text-sm text-gray-600">
                        Restaurar todas as configurações para os valores padrão do sistema
                      </p>
                      <Button
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja restaurar todas as configurações para os valores padrão? Esta ação não pode ser desfeita.')) {
                            resetToDefaults();
                          }
                        }}
                        variant="danger"
                        className="flex items-center space-x-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Restaurar Padrões</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Importar Configurações
                </h3>
                <Button variant="ghost" onClick={() => setShowImportModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Cole o conteúdo do arquivo de configurações
                </label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Cole aqui o JSON das configurações..."
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowImportModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  className="flex-1"
                  disabled={!importData.trim()}
                >
                  Importar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}