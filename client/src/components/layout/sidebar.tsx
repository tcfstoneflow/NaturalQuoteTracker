import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Users, 
  Package, 
  FileText, 
  TrendingUp, 
  Database,
  Mountain,
  Settings,
  User,
  UserCog,
  ExternalLink,
  Calendar
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Showroom Visits", href: "/showroom-visits", icon: Calendar },
  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "SQL Query Tool", href: "/sql-query", icon: Database },
];

const adminNavigation = [
  { name: "User Management", href: "/user-management", icon: UserCog },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isAdmin = user?.user?.role === 'admin';
  const isInventorySpecialist = user?.user?.role === 'inventory_specialist';
  const isSalesRep = user?.user?.role === 'sales_rep';
  
  // Filter navigation based on user role
  const getVisibleNavigation = () => {
    if (isAdmin) {
      return navigation; // Admins see everything
    } else if (isInventorySpecialist) {
      // Inventory specialists can see dashboard, inventory, and reports
      return navigation.filter(item => 
        ['/', '/inventory', '/reports', '/sql-query'].includes(item.href)
      );
    } else if (isSalesRep) {
      // Sales reps can see dashboard, clients, quotes, showroom visits, and reports
      return navigation.filter(item => 
        ['/', '/clients', '/quotes', '/showroom-visits', '/reports'].includes(item.href)
      );
    }
    return navigation;
  };
  
  const visibleNavigation = getVisibleNavigation();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-neutral-200 flex flex-col">
      {/* Logo and Company Name */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-8 bg-black rounded flex items-center justify-center px-2">
            <span className="text-white font-bold text-sm">TCF</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-custom">Texas Counter Fitters</h1>
            <p className="text-sm text-secondary-custom">CRM System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 pt-6">
        <ul className="space-y-2 px-4">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? "text-primary bg-blue-50"
                      : "text-secondary-custom hover:text-primary hover:bg-neutral-100"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
          
          {/* Admin-only navigation */}
          {isAdmin && (
            <>
              <li className="pt-4">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-secondary-custom uppercase tracking-wider">
                    Administration
                  </p>
                </div>
              </li>
              {adminNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                        isActive
                          ? "text-primary bg-blue-50"
                          : "text-secondary-custom hover:text-primary hover:bg-neutral-100"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </>
          )}
          
          {/* Client Page Quick Access */}
          <li className="mt-6 pt-4 border-t border-neutral-200">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-secondary-custom uppercase tracking-wider">
                Client Access
              </p>
            </div>
            <button
              onClick={() => window.open('/public-inventory', '_blank')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-secondary-custom hover:text-primary hover:bg-neutral-100"
            >
              <ExternalLink size={18} />
              <span>View Client Inventory</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center">
            <User className="text-secondary-custom" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-custom truncate">Sarah Johnson</p>
            <p className="text-xs text-secondary-custom truncate">Sales Manager</p>
          </div>
          <button className="text-secondary-custom hover:text-primary">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
