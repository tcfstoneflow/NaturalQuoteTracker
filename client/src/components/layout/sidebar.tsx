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
  Calendar,
  Target,
  Activity,
  ShoppingCart
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Sales Dashboard", href: "/sales-dashboard", icon: Target },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Counter Fixtures", href: "/counter-fixtures", icon: ShoppingCart },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Showroom Visits", href: "/showroom-visits", icon: Calendar },
  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "SQL Query Tool", href: "/sql-query", icon: Database },
];

const adminNavigation = [
  { name: "User Management", href: "/user-management", icon: UserCog },
  { name: "System Health", href: "/system-health", icon: Activity },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const isAdmin = user?.role === 'admin' || user?.role === 'dev';
  const isInventorySpecialist = user?.role === 'inventory_specialist';
  const isSalesRep = user?.role === 'sales_rep';
  
  // Filter navigation based on user role
  const getVisibleNavigation = () => {
    if (isAdmin) {
      // Admins and devs see everything except sales dashboard (they have main dashboard)
      return navigation.filter(item => item.href !== '/sales-dashboard');
    } else if (isInventorySpecialist) {
      // Inventory specialists can see dashboard, inventory, and reports
      return navigation.filter(item => 
        ['/', '/inventory', '/reports', '/sql-query'].includes(item.href)
      );
    } else if (isSalesRep) {
      // Sales reps can see sales dashboard, clients, quotes, and showroom visits (no main dashboard or reports)
      return navigation.filter(item => 
        ['/sales-dashboard', '/clients', '/quotes', '/showroom-visits'].includes(item.href)
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
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-medium">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
                  : user?.username?.charAt(0)?.toUpperCase() || 'U'
                }
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-custom truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.username || 'User'
              }
            </p>
            <p className="text-xs text-secondary-custom truncate">
              {user?.role === 'admin' ? 'Administrator' :
               user?.role === 'sales_rep' ? 'Sales Representative' :
               user?.role === 'inventory_specialist' ? 'Inventory Specialist' :
               user?.role === 'sales_manager' ? 'Sales Manager' : 'User'}
            </p>
          </div>
          <Link href="/settings" className="text-secondary-custom hover:text-primary">
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
