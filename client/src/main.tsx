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
  console.warn("Clerk publishable key not found - Clerk authentication will be disabled");
}

createRoot(document.getElementById("root")!).render(
  PUBLISHABLE_KEY ? (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      navigate={(to) => window.location.href = to}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  ) : (
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  )
);
