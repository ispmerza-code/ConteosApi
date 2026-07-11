'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, UserRole } from '@/types/api';
import { authAPI } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { IdUsuarios: number; Contraseña: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función para obtener rol por nivel de usuario
const getRoleByLevel = (nivel: number): string => {
  switch(nivel) {
    case 1: return 'administrador'
    case 2: return 'supervisor'
    case 3: return 'cca'
    case 4: return 'app'
    default: return 'unknown'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          // Calcular rol basado en NivelUsuario
          const userRole = getRoleByLevel(userData.NivelUsuario);
          setRole(userRole as UserRole);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: { IdUsuarios: number; Contraseña: string }) => {
    try {
      const authData: AuthResponse = await authAPI.login({
        IdUsuarios: Number(credentials.IdUsuarios),
        Contraseña: credentials.Contraseña
      });
      
      localStorage.setItem('token', authData.access_token);
      localStorage.setItem('user', JSON.stringify(authData.user_info));
      
      setUser(authData.user_info);
      
      // Calcular rol basado en NivelUsuario
      const userRole = getRoleByLevel(authData.user_info.NivelUsuario);
      setRole(userRole as UserRole);
      
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isLoading,
      isAuthenticated,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
