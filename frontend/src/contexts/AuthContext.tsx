import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import apiClient from '../utils/api-client';
import { setTokens, removeTokens, isAuthenticated as checkAuthenticated } from '../utils/auth.utils';

interface User {
  user_id: number;
  email: string;
  wedding_date?: string;
  has_taste_profile?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, weddingDate?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      if (checkAuthenticated()) {
        try {
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Failed to fetch user:', error);
          removeTokens();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, refresh_token, user: userData } = response.data;

      // Save tokens
      setTokens(access_token, refresh_token);

      // Update state
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, weddingDate?: string) => {
    try {
      const response = await apiClient.post('/auth/signup', {
        email,
        password,
        wedding_date: weddingDate,
      });
      const { access_token, refresh_token, user: userData } = response.data;

      // Save tokens
      setTokens(access_token, refresh_token);

      // Update state
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = () => {
    removeTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
