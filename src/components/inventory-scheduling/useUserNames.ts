import { useState, useEffect, useCallback } from 'react';
import { userService } from '../../services/userService.ts';

const userNamesCache: Record<string, string> = {};

export function useUserNames() {
  const [userNames, setUserNames] = useState<Record<string, string>>(userNamesCache);

  useEffect(() => {
    const loadUserNames = async () => {
      try {
        // Se o cache já estiver populado, não busca novamente
        if (Object.keys(userNamesCache).length > 0) {
          return;
        }
        const users = await userService.getAllUsers();
        const namesMap: Record<string, string> = {};
        users.forEach(user => {
          namesMap[user.id] = user.name;
          userNamesCache[user.id] = user.name;
        });
        setUserNames(namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };
    
    loadUserNames();
  }, []);

  const getUserName = useCallback((userId: string | undefined): string => {
    if (!userId) return 'Usuário desconhecido';

    const fallbackNames: Record<string, string> = {
      'PJ30Q63zDfMqeKnXiomb': 'Renan',
      '4ke3Tbb6eAXjw1nN9PFZ': 'Anderson Jataí',
      '1': 'Admin Master',
      'admin': 'Admin Master',
      'manager': 'Maria Silva',
      'operator': 'João Santos'
    };

    return userNames[userId] || fallbackNames[userId] || `Usuário ${userId}`;
  }, [userNames]);

  return { userNames, getUserName };
}