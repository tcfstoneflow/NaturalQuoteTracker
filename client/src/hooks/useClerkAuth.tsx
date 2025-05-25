import { useUser, useAuth } from '@clerk/clerk-react';

export function useClerkAuth() {
  const { user, isLoaded } = useUser();
  const { isSignedIn, signOut } = useAuth();

  // Map Clerk user to our app's user format
  const appUser = user ? {
    id: user.id,
    username: user.username || user.emailAddresses[0]?.emailAddress || '',
    email: user.emailAddresses[0]?.emailAddress || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.publicMetadata?.role as string || 'sales',
    isActive: true
  } : null;

  return {
    user: appUser,
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn && !!user,
    logout: signOut
  };
}