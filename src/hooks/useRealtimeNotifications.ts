import { useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { userService } from '../services/userService';

export function useRealtimeNotifications() {
  const { addToast } = useToast();

  useEffect(() => {
    // Setup listener for real-time changes
    const unsubscribe = userService.setupChangeNotificationListener((change) => {
      switch (change.type) {
        case 'user_added':
          addToast({
            type: 'info',
            title: 'Novo Usuário',
            message: `${change.data.name} foi adicionado ao sistema`,
            duration: 4000
          });
          break;
        
        case 'user_updated':
          addToast({
            type: 'info',
            title: 'Usuário Atualizado',
            message: `Dados de ${change.data.name} foram atualizados`,
            duration: 3000
          });
          break;
        
        case 'user_deleted':
          addToast({
            type: 'warning',
            title: 'Usuário Removido',
            message: 'Um usuário foi removido do sistema',
            duration: 4000
          });
          break;
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [addToast]);
}