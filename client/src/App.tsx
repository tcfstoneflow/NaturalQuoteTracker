import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Inventory from "@/pages/inventory";
import Quotes from "@/pages/quotes";
import Reports from "@/pages/reports";
import SQLQuery from "@/pages/sql-query";
import UserManagement from "@/pages/user-management";
import Login from "@/pages/login";
import PublicInventory from "@/pages/public-inventory";
import ProductDetails from "@/pages/product-details";
import SlabManagement from "@/pages/slab-management";
import ShowroomVisits from "@/pages/showroom-visits";
import SalesDashboard from "@/pages/sales-dashboard";
import Settings from "@/pages/settings";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes - accessible without authentication */}
      <Route path="/public-inventory" component={PublicInventory} />
      <Route path="/product/:id" component={ProductDetails} />
      
      {/* Admin/Staff routes - require authentication */}
      {isAuthenticated ? (
        <Route path="*">
          {() => (
            <div className="flex h-screen overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-hidden">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/sales-dashboard" component={SalesDashboard} />
                  <Route path="/clients" component={Clients} />
                  <Route path="/inventory" component={Inventory} />
                  <Route path="/quotes" component={Quotes} />
                  <Route path="/reports" component={Reports} />
                  <Route path="/sql-query" component={SQLQuery} />
                  <Route path="/user-management" component={UserManagement} />
                  <Route path="/showroom-visits" component={ShowroomVisits} />
                  <Route path="/slab-management/:productId" component={SlabManagement} />
                  <Route path="/settings" component={Settings} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          )}
        </Route>
      ) : (
        <Route path="*" component={Login} />
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
