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
  User
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "SQL Query Tool", href: "/sql-query", icon: Database },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-neutral-200 flex flex-col">
      {/* Logo and Company Name */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Mountain className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary-custom">StoneFlow</h1>
            <p className="text-sm text-secondary-custom">CRM System</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 pt-6">
        <ul className="space-y-2 px-4">
          {navigation.map((item) => {
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
