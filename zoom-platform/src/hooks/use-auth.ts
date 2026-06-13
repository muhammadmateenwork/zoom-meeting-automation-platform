import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  );
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    }
  });

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    queryClient.clear();
    setLocation('/login');
  };

  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError]);

  return {
    user,
    token,
    isLoading: isLoading && !!token,
    login,
    logout,
    isAuthenticated: !!token && !!user
  };
}
