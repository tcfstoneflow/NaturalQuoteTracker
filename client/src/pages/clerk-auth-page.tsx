import { SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { Redirect } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClerkAuth } from '@/hooks/useClerkAuth';

export default function ClerkAuthPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { isAuthenticated, isLoading } = useClerkAuth();

  // Show loading state while Clerk loads
  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up authentication...</p>
        </div>
      </div>
    );
  }

  // If user is signed in and synced, redirect to dashboard
  if (isSignedIn && isAuthenticated) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left side - Authentication forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              TCF Supply
            </h1>
            <p className="text-gray-600 mt-2">
              Natural Stone Distribution CRM
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="mt-6">
              <div className="clerk-signin-container">
                <SignIn 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0",
                      headerTitle: "text-xl font-semibold",
                      headerSubtitle: "text-gray-600",
                    }
                  }}
                  redirectUrl="/"
                  fallbackRedirectUrl="/"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-6">
              <div className="clerk-signup-container">
                <SignUp 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "shadow-none border-0 p-0",
                      headerTitle: "text-xl font-semibold", 
                      headerSubtitle: "text-gray-600",
                    }
                  }}
                  redirectUrl="/"
                  fallbackRedirectUrl="/"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero section */}
      <div className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-8">
        <div className="text-white text-center max-w-lg">
          <h2 className="text-4xl font-bold mb-6">
            Streamline Your Stone Business
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Manage inventory, create quotes, and track sales with our comprehensive CRM system designed for natural stone distributors.
          </p>
          <div className="grid grid-cols-1 gap-6 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Inventory Management</h3>
                <p className="text-blue-100 text-sm">Track stone slabs with dimensions and locations</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Quote Generation</h3>
                <p className="text-blue-100 text-sm">Create professional PDF quotes instantly</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Sales Analytics</h3>
                <p className="text-blue-100 text-small">Track performance and revenue trends</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}