import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LayoutProvider } from '../../contexts/LayoutContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useEffect } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { settings, applyTheme } = useSettings();

  // Apply theme on mount and when settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme, applyTheme]);

  return (
    <LayoutProvider>
      <div className="min-h-screen themed-bg flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6 themed-text">
            {children}
          </main>
        </div>
      </div>
    </LayoutProvider>
  );
}