import { SignIn, SignUp } from '@clerk/clerk-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ClerkAuth() {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full space-y-8">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Auth form */}
          <div className="bg-white p-8 rounded-lg shadow-md">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                {showSignUp ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {showSignUp ? 'Join our CRM system' : 'Sign in to your account'}
              </p>
            </div>

            {showSignUp ? (
              <SignUp 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0",
                  }
                }}
              />
            ) : (
              <SignIn 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0",
                  }
                }}
              />
            )}

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setShowSignUp(!showSignUp)}
                className="text-sm"
              >
                {showSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </Button>
            </div>
          </div>

          {/* Right side - Hero section */}
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Texas Counter Fitters
              <span className="block text-blue-600">CRM System</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-lg text-gray-500 sm:text-xl md:mt-5 md:max-w-3xl">
              Streamline your natural stone distribution business with our comprehensive CRM solution. 
              Manage clients, track inventory, and generate professional quotes with ease.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex items-center text-gray-600">
                <div className="flex-shrink-0 w-5 h-5 text-green-500">✓</div>
                <span className="ml-3">Client and quote management</span>
              </div>
              <div className="flex items-center text-gray-600">
                <div className="flex-shrink-0 w-5 h-5 text-green-500">✓</div>
                <span className="ml-3">Inventory tracking with images</span>
              </div>
              <div className="flex items-center text-gray-600">
                <div className="flex-shrink-0 w-5 h-5 text-green-500">✓</div>
                <span className="ml-3">Professional PDF quotes</span>
              </div>
              <div className="flex items-center text-gray-600">
                <div className="flex-shrink-0 w-5 h-5 text-green-500">✓</div>
                <span className="ml-3">Role-based access control</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}