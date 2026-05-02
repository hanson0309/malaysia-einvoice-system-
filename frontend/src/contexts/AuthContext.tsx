import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../lib/api';

interface User {
  id: string;
  email: string;
  tenantId: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    company_name: string;
    company_registration_no: string;
    tin_number: string;
    business_activity_code: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    state_code: string;
    country_code: string;
    email: string;
    phone: string;
    password: string;
    sst_registration_no?: string;
  }) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      const { token, refreshToken, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      setToken(token);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: {
    company_name: string;
    company_registration_no: string;
    tin_number: string;
    business_activity_code: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    state_code: string;
    country_code: string;
    email: string;
    phone: string;
    password: string;
    sst_registration_no?: string;
  }) => {
    try {
      const response = await authApi.register(data);
      const { access_token, refresh_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      setToken(access_token);
      setUser(user);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
