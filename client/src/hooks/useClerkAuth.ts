import { useUser, useAuth as useClerkAuthBase } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useClerkAuth() {
  // Check if Clerk is available
  const hasClerk = typeof window !== 'undefined' && window.Clerk;
  
  if (!hasClerk) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      logout: () => {},
      isLoggingOut: false,
      clerkAvailable: false,
    };
  }

  const { isSignedIn, isLoaded, user } = useUser();
  const { signOut } = useClerkAuthBase();
  const queryClient = useQueryClient();

  // Query to sync Clerk user with our backend
  const { data: backendUser, isLoading: isBackendLoading } = useQuery({
    queryKey: ['/api/clerk/user'],
    queryFn: async () => {
      if (!isSignedIn || !user) return null;
      
      try {
        const response = await apiRequest('POST', '/api/clerk/sync-user', {
          clerkUserId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username || user.emailAddresses[0]?.emailAddress?.split('@')[0],
        });
        return response.json();
      } catch (error) {
        console.error('Failed to sync user with backend:', error);
        return null;
      }
    },
    enabled: isSignedIn && !!user,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (signOut) {
        await signOut();
      }
      queryClient.clear();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/clerk/user'], null);
    },
  });

  return {
    user: backendUser,
    isAuthenticated: isSignedIn && !!backendUser,
    isLoading: !isLoaded || (isSignedIn && isBackendLoading),
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    clerkAvailable: true,
  };
}