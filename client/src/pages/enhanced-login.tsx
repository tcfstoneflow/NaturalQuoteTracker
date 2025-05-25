import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Shield, Mail, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Form schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

interface LoginResponse {
  user?: any;
  message?: string;
  requiresMFA?: boolean;
  error?: string;
  lockoutUntil?: string;
}

export default function EnhancedLogin() {
  const [currentView, setCurrentView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Get reset token from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get('token');
  
  React.useEffect(() => {
    if (resetToken) {
      setCurrentView('reset');
    }
  }, [resetToken]);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      mfaCode: '',
    },
  });

  const forgotForm = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: resetToken || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await apiRequest('POST', '/api/auth/enhanced-login', data);
      const result: LoginResponse = await response.json();
      
      if (result.requiresMFA) {
        setRequiresMFA(true);
        setMessage({ type: 'info', text: result.message || 'Security code sent to your email' });
      } else if (result.user) {
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        // Redirect to dashboard
        setTimeout(() => window.location.href = '/', 1500);
      } else if (result.error) {
        setMessage({ type: 'error', text: result.error });
        if (result.lockoutUntil) {
          const lockoutTime = new Date(result.lockoutUntil).toLocaleString();
          setMessage({ type: 'error', text: `Account locked until ${lockoutTime}` });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await apiRequest('POST', '/api/auth/forgot-password', data);
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password reset email sent! Check your inbox.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send reset email' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to send reset email' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (data: ResetPasswordForm) => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      const response = await apiRequest('POST', '/api/auth/reset-password', {
        token: data.token,
        newPassword: data.newPassword,
      });
      const result = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password reset successful! You can now log in.' });
        setTimeout(() => setCurrentView('login'), 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to reset password' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to reset password' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          type="text"
          placeholder="Enter your username"
          {...loginForm.register('username')}
          className="h-11"
        />
        {loginForm.formState.errors.username && (
          <p className="text-sm text-red-600">{loginForm.formState.errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...loginForm.register('password')}
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {loginForm.formState.errors.password && (
          <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
        )}
      </div>

      {requiresMFA && (
        <div className="space-y-2">
          <Label htmlFor="mfaCode">Security Code</Label>
          <Input
            id="mfaCode"
            type="text"
            placeholder="Enter 6-digit code from email"
            {...loginForm.register('mfaCode')}
            className="h-11"
            maxLength={6}
          />
          <p className="text-sm text-gray-600">Check your email for the security code</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {requiresMFA ? 'Verifying...' : 'Signing in...'}
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            {requiresMFA ? 'Verify & Sign In' : 'Sign In'}
          </>
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setCurrentView('forgot')}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Forgot your password?
        </button>
      </div>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={forgotForm.handleSubmit(handleForgotPassword)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="Enter your email address"
          {...forgotForm.register('email')}
          className="h-11"
        />
        {forgotForm.formState.errors.email && (
          <p className="text-sm text-red-600">{forgotForm.formState.errors.email.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Reset Email...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Reset Email
          </>
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setCurrentView('login')}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );

  const renderResetPasswordForm = () => (
    <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new password (min 8 characters)"
            {...resetForm.register('newPassword')}
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {resetForm.formState.errors.newPassword && (
          <p className="text-sm text-red-600">{resetForm.formState.errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm your new password"
          {...resetForm.register('confirmPassword')}
          className="h-11"
        />
        {resetForm.formState.errors.confirmPassword && (
          <p className="text-sm text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-11"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resetting Password...
          </>
        ) : (
          <>
            <Shield className="mr-2 h-4 w-4" />
            Reset Password
          </>
        )}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setCurrentView('login')}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Back to Sign In
        </button>
      </div>
    </form>
  );

  const getCardTitle = () => {
    switch (currentView) {
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
      default: return 'Sign In to TCF';
    }
  };

  const getCardDescription = () => {
    switch (currentView) {
      case 'forgot': return 'Enter your email to receive a password reset link';
      case 'reset': return 'Create a new secure password for your account';
      default: return 'Welcome back to Texas Counter Fitters CRM';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              {getCardTitle()}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {getCardDescription()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {message && (
              <Alert className={`${
                message.type === 'error' ? 'border-red-200 bg-red-50' :
                message.type === 'success' ? 'border-green-200 bg-green-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                {message.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Shield className="h-4 w-4 text-blue-600" />
                )}
                <AlertDescription className={`${
                  message.type === 'error' ? 'text-red-700' :
                  message.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }`}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {currentView === 'login' && renderLoginForm()}
            {currentView === 'forgot' && renderForgotPasswordForm()}
            {currentView === 'reset' && renderResetPasswordForm()}

            <Separator />
            
            <div className="text-center text-sm text-gray-500">
              <p>© 2024 Texas Counter Fitters</p>
              <p>Secure CRM System</p>
            </div>
          </CardContent>
        </Card>

        {/* Security Features Display */}
        <div className="mt-6 text-center">
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-1" />
              <span>Multi-Factor Auth</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-4 h-4 mr-1" />
              <span>Account Protection</span>
            </div>
            <div className="flex items-center">
              <Mail className="w-4 h-4 mr-1" />
              <span>Email Recovery</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}