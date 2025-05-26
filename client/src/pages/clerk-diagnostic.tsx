import { useEffect, useState } from 'react';

export default function ClerkDiagnostic() {
  const [diagnostics, setDiagnostics] = useState({
    publishableKey: '',
    currentDomain: '',
    clerkLoaded: false,
    error: null as string | null
  });

  useEffect(() => {
    const runDiagnostics = () => {
      const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      const currentDomain = window.location.hostname;
      const fullDomain = window.location.host;
      
      setDiagnostics({
        publishableKey: publishableKey ? 'Set ✓' : 'Missing ✗',
        currentDomain: fullDomain,
        clerkLoaded: !!(window as any).Clerk,
        error: null
      });
    };

    runDiagnostics();
    
    // Listen for Clerk errors
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('Clerk')) {
        setDiagnostics(prev => ({
          ...prev,
          error: event.message
        }));
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Clerk Configuration Diagnostic</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Publishable Key:</span>
              <span className={diagnostics.publishableKey.includes('✓') ? 'text-green-600' : 'text-red-600'}>
                {diagnostics.publishableKey}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Current Domain:</span>
              <span className="text-blue-600 font-mono">{diagnostics.currentDomain}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Clerk Loaded:</span>
              <span className={diagnostics.clerkLoaded ? 'text-green-600' : 'text-red-600'}>
                {diagnostics.clerkLoaded ? 'Yes ✓' : 'No ✗'}
              </span>
            </div>
          </div>
        </div>

        {diagnostics.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Details</h3>
            <p className="text-red-700 font-mono text-sm">{diagnostics.error}</p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Troubleshooting Steps</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">1. Domain Configuration</h4>
              <p className="text-blue-700 mb-2">Add this domain to your Clerk dashboard:</p>
              <div className="p-3 bg-blue-100 rounded border">
                <code className="text-sm font-mono text-blue-900 select-all">
                  {diagnostics.currentDomain}
                </code>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">2. Additional Clerk Settings to Check</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
                <li>In Clerk Dashboard → Settings → "Developer Settings"</li>
                <li>Ensure "Production Instance" is enabled if this is production</li>
                <li>Check "Allowed redirect origins" includes your domain</li>
                <li>Verify "Home URL" matches your domain</li>
                <li>Make sure "Sign-in URL" and "Sign-up URL" are correct</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-800 mb-2">3. Common Issues</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
                <li>Wait 5-10 minutes after adding domain for changes to propagate</li>
                <li>Clear browser cache and hard refresh</li>
                <li>Check if you're using development vs production keys</li>
                <li>Ensure API keys match the correct Clerk instance</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to CRM
          </a>
        </div>
      </div>
    </div>
  );
}