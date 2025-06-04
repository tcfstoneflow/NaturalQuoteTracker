import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLogin: string;
  avatarUrl?: string;
}

interface AuthResponse {
  user: AuthUser;
}

export function useAuth() {
  const { data: authData, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    user: authData?.user,
    isLoading,
    isAuthenticated: !!authData?.user && !error,
    error,
  };
}