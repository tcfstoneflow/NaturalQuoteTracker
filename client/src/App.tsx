import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
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
import ClientFavorites from "@/pages/client-favorites";
import SlabManagement from "@/pages/slab-management";
import ShowroomVisits from "@/pages/showroom-visits";
import SalesDashboard from "@/pages/sales-dashboard";
import CounterFixtures from "@/pages/counter-fixtures";
import Settings from "@/pages/settings";
import SystemHealth from "@/pages/system-health";
import Sidebar from "@/components/layout/sidebar";
import { RoleSwitcherProvider } from "@/components/layout/role-switcher";

// Component to handle role-based default routing
function DefaultRoute() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect sales reps to sales dashboard, others to main dashboard
  React.useEffect(() => {
    if (user?.role === 'sales_rep') {
      setLocation('/sales-dashboard');
    } else {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);
  
  return null;
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

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
      <Route path="/favorites" component={ClientFavorites} />
      
      {/* Admin/Staff routes - require authentication */}
      {isAuthenticated ? (
        <Route path="*">
          {() => (
            <RoleSwitcherProvider>
              <div className="flex h-screen">
                <Sidebar />
                <main className="flex-1 overflow-y-auto">
                  <Switch>
                    <Route path="/" component={DefaultRoute} />
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/sales-dashboard" component={SalesDashboard} />
                  <Route path="/clients" component={Clients} />
                  <Route path="/inventory" component={Inventory} />
                  <Route path="/counter-fixtures" component={CounterFixtures} />
                  <Route path="/quotes" component={Quotes} />
                  <Route path="/reports">
                    {() => {
                      // Protect reports page from sales reps
                      if (user?.role === 'sales_rep') {
                        return <NotFound />;
                      }
                      return <Reports />;
                    }}
                  </Route>
                  <Route path="/sql-query" component={SQLQuery} />
                  <Route path="/user-management" component={UserManagement} />
                  <Route path="/showroom-visits" component={ShowroomVisits} />
                  <Route path="/slab-management/:productId" component={SlabManagement} />
                  <Route path="/settings" component={Settings} />
                  <Route path="/system-health" component={SystemHealth} />
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
