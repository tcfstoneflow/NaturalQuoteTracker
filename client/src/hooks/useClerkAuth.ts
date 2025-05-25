import { useUser, useAuth as useClerkAuthBase } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useClerkAuth() {
  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerkAuthBase();
  const queryClient = useQueryClient();

  // Query to sync Clerk user with our backend
  const { data: backendUser, isLoading: isBackendLoading } = useQuery({
    queryKey: ['/api/clerk/user'],
    queryFn: async () => {
      if (!isSignedIn || !user) return null;
      
      const response = await apiRequest('POST', '/api/clerk/sync-user', {
        clerkUserId: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username || user.emailAddresses[0]?.emailAddress,
      });
      return response.json();
    },
    enabled: isSignedIn && !!user,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
      queryClient.clear();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/clerk/user'], null);
    },
  });

  return {
    user: backendUser,
    isAuthenticated: isSignedIn && !!backendUser,
    isLoading: !isLoaded || isBackendLoading,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
}