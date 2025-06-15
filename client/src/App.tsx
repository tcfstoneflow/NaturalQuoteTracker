import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { NotificationProvider } from "@/hooks/useNotifications";
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
import AllSlabs from "@/pages/all-slabs";
import ShowroomVisits from "@/pages/showroom-visits";
import SalesDashboard from "@/pages/sales-dashboard";
import CounterFixtures from "@/pages/counter-fixtures";
import Settings from "@/pages/settings";
import SystemHealth from "@/pages/system-health";
import SalesRepManagement from "@/pages/sales-rep-management";
import SalesRepProfile from "@/pages/sales-rep-profile";
import SalesLeaderDashboard from "@/pages/SalesLeaderDashboard";
import WorkflowsPage from "@/pages/WorkflowsPage";
import PurchaseOrders from "@/pages/PurchaseOrders";
import Pipeline from "@/pages/Pipeline";
import FeatureFolder from "@/pages/FeatureFolder";
import Cart from "@/pages/cart";

import Sidebar from "@/components/layout/sidebar";

// Component to handle role-based default routing
function DefaultRoute() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect based on user role
  React.useEffect(() => {
    if (user?.role === 'sales_rep') {
      setLocation('/sales-dashboard');
    } else if (user?.role === 'sales_leader') {
      setLocation('/sales-leader');
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
      <Route path="/sales-rep/:slug" component={SalesRepProfile} />
      
      {/* Admin/Staff routes - require authentication */}
      {isAuthenticated ? (
        <Route path="*">
          {() => (
            <div className="flex h-screen">
              <Sidebar />
              <main className="flex-1 overflow-y-auto">
                <Switch>
                  <Route path="/" component={DefaultRoute} />
                  <Route path="/dashboard" component={Dashboard} />
                  <Route path="/sales-dashboard" component={SalesDashboard} />
                  <Route path="/sales-leader" component={SalesLeaderDashboard} />
                  <Route path="/clients" component={Clients} />
                  <Route path="/pipeline" component={Pipeline} />
                  <Route path="/purchase-orders" component={PurchaseOrders} />
                  <Route path="/feature-folder" component={FeatureFolder} />
                  <Route path="/inventory" component={Inventory} />
                  <Route path="/counter-fixtures" component={CounterFixtures} />
                  <Route path="/quotes" component={Quotes} />
                  <Route path="/cart" component={Cart} />
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
                  <Route path="/all-slabs" component={AllSlabs} />
                  <Route path="/workflows" component={WorkflowsPage} />
                  <Route path="/sales-rep-profile" component={SalesRepManagement} />
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
        <NotificationProvider>
          <Toaster />
          <Router />
        </NotificationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
