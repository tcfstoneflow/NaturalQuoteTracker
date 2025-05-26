import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from '@clerk/clerk-react';
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key - Please add VITE_CLERK_PUBLISHABLE_KEY to your environment variables");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={PUBLISHABLE_KEY}
    navigate={(to) => window.location.href = to}
    appearance={{
      baseTheme: undefined,
      variables: {
        colorPrimary: "#2563eb",
      }
    }}
    allowedRedirectOrigins={[
      window.location.origin,
      `https://${window.location.hostname}`,
      `http://${window.location.hostname}`,
    ]}
  >
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </ClerkProvider>
);
