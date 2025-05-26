import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Inventory from "@/pages/inventory";
import Quotes from "@/pages/quotes";
import Reports from "@/pages/reports";
import SQLQuery from "@/pages/sql-query";
import UserManagement from "@/pages/user-management";
import SlabManagement from "@/pages/slab-management";
import ShowroomVisits from "@/pages/showroom-visits";
import SalesDashboard from "@/pages/sales-dashboard";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  // Since this is wrapped in SignedIn, user is already authenticated
  return (
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
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Router />
    </TooltipProvider>
  );
}

export default App;
