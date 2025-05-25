import { useUser, useAuth as useClerkAuthCore } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email: string;
  role?: string;
}

export function useClerkAuth() {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { isSignedIn, getToken } = useClerkAuthCore();

  // Get additional user data from our backend
  const { data: backendUser, isLoading: backendLoading } = useQuery({
    queryKey: ['/api/clerk/user', clerkUser?.id],
    queryFn: async () => {
      if (!clerkUser?.id) return null;
      
      const token = await getToken();
      const response = await fetch('/api/clerk/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      return response.json();
    },
    enabled: !!clerkUser?.id && isSignedIn,
  });

  const user: ClerkUser | null = clerkUser ? {
    id: clerkUser.id,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
    email: clerkUser.primaryEmailAddress?.emailAddress || '',
    role: backendUser?.role || 'sales_rep',
  } : null;

  return {
    user,
    isLoading: !userLoaded || backendLoading,
    isAuthenticated: isSignedIn && !!user,
    getToken,
  };
}