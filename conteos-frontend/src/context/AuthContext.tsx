'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse, UserRole, Sucursal } from '@/types/api';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedSucursal: Sucursal | null;
  login: (credentials: { IdUsuarios: number; Contraseña: string }) => Promise<User>;
  logout: () => void;
  selectSucursal: (sucursal: Sucursal) => void;
  clearSucursal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Función para obtener rol por nivel de usuario
const getRoleByLevel = (nivel: number): string => {
  switch(nivel) {
    case 1: return 'administrador'
    case 2: return 'supervisor'
    case 3: return 'cca'
    case 4: return 'app'
    case 7: return 'admin_cctv'
    case 8: return 'supervision_cctv'
    default: return 'administrador'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSucursal, setSelectedSucursal] = useState<Sucursal | null>(null);

  const isAuthenticated = !!user;

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const savedSucursal = localStorage.getItem('selectedSucursal');

      if (token && savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          const userRole = getRoleByLevel(userData.NivelUsuario);
          setRole(userRole as UserRole);
          if (savedSucursal) {
            setSelectedSucursal(JSON.parse(savedSucursal));
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('selectedSucursal');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials: { IdUsuarios: number; Contraseña: string }): Promise<User> => {
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

      return authData.user_info;
    } catch (error: any) {
      // Mejora mensaje para errores de red / certificado
      const networkMessage = 'Error de red al contactar el servidor. Verifica la URL de la API y el certificado TLS (ERR_CERT_AUTHORITY_INVALID) en la consola del navegador.'
      const detail = error?.response?.data?.detail
      if (!detail && (error?.message === 'Network Error' || /CERT/.test(String(error)))) {
        throw new Error(networkMessage)
      }

      throw new Error(detail || error.message || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedSucursal');
    setUser(null);
    setRole(null);
    setSelectedSucursal(null);
    router.push('/login');
  };

  const selectSucursal = (sucursal: Sucursal) => {
    setSelectedSucursal(sucursal);
    localStorage.setItem('selectedSucursal', JSON.stringify(sucursal));
  };

  const clearSucursal = () => {
    setSelectedSucursal(null);
    localStorage.removeItem('selectedSucursal');
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      isLoading,
      isAuthenticated,
      selectedSucursal,
      login,
      logout,
      selectSucursal,
      clearSucursal,
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
