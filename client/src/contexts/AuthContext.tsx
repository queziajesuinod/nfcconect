import { createContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  active: boolean | null;
  username: string | null;
  telefone: string | null;
  cpf: string | null;
  endereco: string | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Query para obter usuário atual
  const { data: currentUser, isLoading: isFetching } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  // Mutation para logout
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setUser(null);
    },
  });

  // Atualizar usuário quando dados são carregados
  useEffect(() => {
    if (!isFetching) {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    }
  }, [currentUser, isFetching]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // Redirecionar para home após logout
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
