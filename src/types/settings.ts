export interface ThemeSettings {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    size: 'small' | 'medium' | 'large';
    weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  };
  layout: {
    borderRadius: 'none' | 'small' | 'medium' | 'large';
    spacing: 'compact' | 'normal' | 'comfortable';
    shadows: 'none' | 'subtle' | 'medium' | 'strong';
  };
  sidebar: {
    style: 'minimal' | 'modern' | 'classic';
    position: 'left' | 'right';
    width: 'narrow' | 'normal' | 'wide';
  };
  background: {
    type: 'color' | 'image' | 'gradient';
    image?: string;
    imageOpacity: number;
    overlayColor: string;
    overlayOpacity: number;
    position: 'center' | 'top' | 'bottom' | 'left' | 'right';
    size: 'cover' | 'contain' | 'auto';
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  };
}

export interface AppSettings {
  theme: ThemeSettings;
  customLogo?: string;
  companyName: string;
  systemName: string;
  language: 'pt-BR' | 'en-US' | 'es-ES';
  dateFormat: 'dd/MM/yyyy' | 'MM/dd/yyyy' | 'yyyy-MM-dd';
  currency: 'BRL' | 'USD' | 'EUR';
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    notificationEmail?: string;
    emailTypes?: {
      lateLoans: boolean;
      pendingSchedules: boolean;
      lowStock: boolean;
      pendingApprovals: boolean;
      expiredReservations: boolean;
    };
  };
  features: {
    darkMode: boolean;
    animations: boolean;
    autoSave: boolean;
    offlineMode: boolean;
  };
}

export const DEFAULT_THEMES: ThemeSettings[] = [
  {
    id: 'default',
    name: 'Padrão MRS-SIGMA',
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      accent: '#10B981',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#111827',
      textSecondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    fonts: {
      primary: 'Inter, system-ui, sans-serif',
      secondary: 'JetBrains Mono, monospace',
      size: 'medium',
      weight: 'normal',
    },
    layout: {
      borderRadius: 'medium',
      spacing: 'normal',
      shadows: 'medium',
    },
    sidebar: {
      style: 'modern',
      position: 'left',
      width: 'normal',
    },
    background: {
      type: 'color',
      imageOpacity: 80,
      overlayColor: '#000000',
      overlayOpacity: 20,
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
    },
  },
  {
    id: 'dark',
    name: 'Modo Escuro',
    colors: {
      primary: '#60A5FA',
      secondary: '#9CA3AF',
      accent: '#34D399',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
    },
    fonts: {
      primary: 'Inter, system-ui, sans-serif',
      secondary: 'JetBrains Mono, monospace',
      size: 'medium',
      weight: 'normal',
    },
    layout: {
      borderRadius: 'medium',
      spacing: 'normal',
      shadows: 'strong',
    },
    sidebar: {
      style: 'modern',
      position: 'left',
      width: 'normal',
    },
    background: {
      type: 'color',
      imageOpacity: 80,
      overlayColor: '#000000',
      overlayOpacity: 30,
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
    },
  },
  {
    id: 'corporate',
    name: 'Corporativo',
    colors: {
      primary: '#1E40AF',
      secondary: '#64748B',
      accent: '#059669',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#475569',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      info: '#1E40AF',
    },
    fonts: {
      primary: 'system-ui, -apple-system, sans-serif',
      secondary: 'Consolas, monospace',
      size: 'medium',
      weight: 'medium',
    },
    layout: {
      borderRadius: 'small',
      spacing: 'compact',
      shadows: 'subtle',
    },
    sidebar: {
      style: 'classic',
      position: 'left',
      width: 'narrow',
    },
    background: {
      type: 'color',
      imageOpacity: 80,
      overlayColor: '#000000',
      overlayOpacity: 20,
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
    },
  },
  {
    id: 'modern',
    name: 'Moderno',
    colors: {
      primary: '#8B5CF6',
      secondary: '#6B7280',
      accent: '#06B6D4',
      background: '#FAFAFA',
      surface: '#FFFFFF',
      text: '#18181B',
      textSecondary: '#71717A',
      success: '#22C55E',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#8B5CF6',
    },
    fonts: {
      primary: 'Poppins, system-ui, sans-serif',
      secondary: 'Fira Code, monospace',
      size: 'medium',
      weight: 'normal',
    },
    layout: {
      borderRadius: 'large',
      spacing: 'comfortable',
      shadows: 'medium',
    },
    sidebar: {
      style: 'minimal',
      position: 'left',
      width: 'wide',
    },
    background: {
      type: 'color',
      imageOpacity: 85,
      overlayColor: '#000000',
      overlayOpacity: 15,
      position: 'center',
      size: 'cover',
      repeat: 'no-repeat',
    },
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: DEFAULT_THEMES[0],
  companyName: 'MRS Logística',
  systemName: 'MRS-SIGMA',
  language: 'pt-BR',
  dateFormat: 'dd/MM/yyyy',
  currency: 'BRL',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    notificationEmail: '',
    emailTypes: {
      lateLoans: true,
      pendingSchedules: true,
      lowStock: true,
      pendingApprovals: true,
      expiredReservations: true,
    },
  },
  features: {
    darkMode: false,
    animations: true,
    autoSave: true,
    offlineMode: true,
  },
};