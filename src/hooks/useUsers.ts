import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { User } from '../types';

const usersCache: User[] = [];
const userNamesCache: Record<string, string> = {};

export function useUsers() {
  const [users, setUsers] = useState<User[]>(usersCache);
  const [userNames, setUserNames] = useState<Record<string, string>>(userNamesCache);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        if (usersCache.length > 0) {
            setUsers(usersCache);
            setUserNames(userNamesCache);
            return;
        }
        const fetchedUsers = await userService.getAllUsers();
        // Clear cache before pushing new users
        usersCache.length = 0;
        usersCache.push(...fetchedUsers);

        const namesMap: Record<string, string> = {};
        fetchedUsers.forEach(user => {
          namesMap[user.id] = user.name;
          userNamesCache[user.id] = user.name;
        });
        setUsers(fetchedUsers);
        setUserNames(namesMap);
      } catch (error) {
        console.error('Erro ao carregar nomes dos usuários:', error);
      }
    };
    
    loadUsers();
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

  return { users, getUserName };
}
