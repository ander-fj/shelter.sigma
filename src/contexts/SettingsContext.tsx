import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS, DEFAULT_THEMES, ThemeSettings } from '../types/settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  updateTheme: (theme: ThemeSettings) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  applyTheme: (theme: ThemeSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Deep merge function for theme objects
  const deepMergeTheme = useCallback((defaultTheme: ThemeSettings, savedTheme: Partial<ThemeSettings>): ThemeSettings => {
    return {
      ...defaultTheme,
      ...savedTheme,
      colors: { ...defaultTheme.colors, ...(savedTheme.colors || {}) },
      fonts: { ...defaultTheme.fonts, ...(savedTheme.fonts || {}) },
      layout: { ...defaultTheme.layout, ...(savedTheme.layout || {}) },
      background: { ...defaultTheme.background, ...(savedTheme.background || {}) },
    };
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const mergedTheme = deepMergeTheme(DEFAULT_SETTINGS.theme, parsed.theme || {});
        const newSettings = { 
          ...DEFAULT_SETTINGS, 
          ...parsed,
          theme: mergedTheme
        };
        setSettings(newSettings);
        
        // Apply theme immediately
        applyTheme(mergedTheme);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    }
  }, [deepMergeTheme]);

  // Apply theme to document
  const applyTheme = (theme: ThemeSettings) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--color-success', theme.colors.success);
    root.style.setProperty('--color-warning', theme.colors.warning);
    root.style.setProperty('--color-error', theme.colors.error);
    root.style.setProperty('--color-info', theme.colors.info);
    
    // Apply font settings
    root.style.setProperty('--font-primary', theme.fonts.primary);
    root.style.setProperty('--font-secondary', theme.fonts.secondary);
    
    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--font-size-base', fontSizes[theme.fonts.size]);
    
    // Apply font weight
    const fontWeights = {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    };
    root.style.setProperty('--font-weight-base', fontWeights[theme.fonts.weight]);
    
    // Apply border radius
    const borderRadii = {
      none: '0px',
      small: '4px',
      medium: '8px',
      large: '16px',
    };
    root.style.setProperty('--border-radius', borderRadii[theme.layout.borderRadius]);
    
    // Apply spacing
    const spacings = {
      compact: '0.75rem',
      normal: '1rem',
      comfortable: '1.5rem',
    };
    root.style.setProperty('--spacing-base', spacings[theme.layout.spacing]);
    
    // Apply shadows
    const shadows = {
      none: 'none',
      subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      strong: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    };
    root.style.setProperty('--shadow', shadows[theme.layout.shadows]);
    
    // Apply background settings
    console.log('🎨 Aplicando configurações de background:', {
      type: theme.background.type,
      image: theme.background.image,
      imageOpacity: theme.background.imageOpacity,
      overlayColor: theme.background.overlayColor,
      overlayOpacity: theme.background.overlayOpacity
    });
    
    if (theme.background.type === 'image' && theme.background.image) {
      console.log('🖼️ Aplicando imagem de fundo:', theme.background.image);
      
      // Set CSS variables
      root.style.setProperty('--background-image', `url(${theme.background.image})`);
      root.style.setProperty('--background-overlay-color', theme.background.overlayColor);
      root.style.setProperty('--background-overlay-opacity', (theme.background.overlayOpacity / 100).toString());
      root.style.setProperty('--background-position', theme.background.position);
      root.style.setProperty('--background-size', theme.background.size);
      root.style.setProperty('--background-repeat', theme.background.repeat);
      
      // Apply opacity to body background
      document.body.style.opacity = (theme.background.imageOpacity / 100).toString();
      
      // Add class to body
      document.body.classList.add('has-background-image');
      console.log('✅ Classe has-background-image adicionada ao body');
      
      console.log('🔄 CSS Variables aplicadas:', {
        backgroundImage: root.style.getPropertyValue('--background-image'),
        overlayColor: root.style.getPropertyValue('--background-overlay-color'),
        overlayOpacity: root.style.getPropertyValue('--background-overlay-opacity'),
        hasClass: document.body.classList.contains('has-background-image'),
        bodyOpacity: document.body.style.opacity
      });
    } else {
      console.log('🚫 Removendo imagem de fundo');
      root.style.removeProperty('--background-image');
      root.style.removeProperty('--background-overlay-color');
      root.style.removeProperty('--background-overlay-opacity');
      root.style.removeProperty('--background-position');
      root.style.removeProperty('--background-size');
      root.style.removeProperty('--background-repeat');
      document.body.style.opacity = '';
      document.body.classList.remove('has-background-image');
      console.log('✅ Classe has-background-image removida do body');
    }
    
    // Apply dark mode class
    if (theme.id === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      
      // Save to localStorage with error handling
      try {
        localStorage.setItem('app_settings', JSON.stringify(newSettings));
        console.log('✅ Configurações salvas no localStorage');
      } catch (storageError) {
        console.error('❌ Erro ao salvar configurações no localStorage:', storageError);
        // Continue without throwing - settings are still applied in memory
      }
      
      // Apply theme if it was updated
      if (updates.theme) {
        try {
          applyTheme(newSettings.theme);
          console.log('✅ Tema aplicado com sucesso');
        } catch (themeError) {
          console.error('❌ Erro ao aplicar tema:', themeError);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar configurações:', error);
      // Don't throw - allow UI to continue working
    }
  };

  const updateTheme = (theme: ThemeSettings) => {
    updateSettings({ theme });
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('app_settings');
    applyTheme(DEFAULT_SETTINGS.theme);
  };

  const exportSettings = () => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (settingsJson: string): boolean => {
    try {
      const imported = JSON.parse(settingsJson);
      const newSettings = { ...DEFAULT_SETTINGS, ...imported };
      setSettings(newSettings);
      localStorage.setItem('app_settings', JSON.stringify(newSettings));
      applyTheme(newSettings.theme);
      return true;
    } catch (error) {
      console.error('Erro ao importar configurações:', error);
      return false;
    }
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    updateTheme,
    resetToDefaults,
    exportSettings,
    importSettings,
    applyTheme,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}