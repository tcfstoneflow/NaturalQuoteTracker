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
  ShoppingCart,
  Layers,
  GitBranch,
  ClipboardList,
  Workflow,
  Folder,
  Truck,
  Building2,
  Shield,
  Bell,
  Check,
  X,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "All Slabs", href: "/all-slabs", icon: Layers },
  { name: "Counter Fixtures", href: "/counter-fixtures", icon: ShoppingCart },
  { name: "Quotes", href: "/quotes", icon: FileText },
  { name: "Showroom Visits", href: "/showroom-visits", icon: Calendar },
  { name: "Reports", href: "/reports", icon: TrendingUp },
  { name: "Pipeline", href: "/pipeline", icon: Workflow },
  { name: "SQL Query Tool", href: "/sql-query", icon: Database },
];

const featureFolderNavigation = [
  { name: "Cart", href: "/cart", icon: ShoppingCart },
  { name: "Sales Dashboard", href: "/sales-dashboard", icon: Target },
  { name: "Sales Leader", href: "/sales-leader", icon: Users, roles: ['sales_leader'] },
  { name: "Marketing KPI Tracking", href: "/marketing-kpi", icon: TrendingUp },
  { name: "Sales KPI Tracking", href: "/sales-kpi", icon: BarChart3 },
  { name: "Supply KPI Tracking", href: "/supply-kpi", icon: Truck },
  { name: "Inventory Tracking", href: "/inventory-tracking", icon: Package },
  { name: "Company KPI Tracking", href: "/company-kpi", icon: Building2 },
];

const adminNavigation = [
  { name: "System Access", href: "/user-management", icon: UserCog },
  { name: "OAuth Accounts", href: "/oauth-accounts", icon: Shield },
  { name: "System Health", href: "/system-health", icon: Activity },
  { name: "Tracking", href: "/feature-folder", icon: Folder },
];

const salesRepNavigation = [
  { name: "My Profile", href: "/sales-rep-profile", icon: User },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { notifications, isConnected, removeNotification, clearNotifications } = useNotifications();

  // Get notifications - pending showroom visits and other alerts
  const { data: pendingVisits } = useQuery({
    queryKey: ["/api/showroom-visits/pending"],
    enabled: !!user?.role && (user.role === 'admin' || user.role === 'sales_rep'),
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["/api/products/low-stock"],
    enabled: !!user?.role,
  });

  // Filter real-time notifications
  const slabNotifications = notifications.filter(n => 
    n.type === 'new_slab_added' || n.type === 'bulk_slabs_added'
  );

  const userNotifications = notifications.filter(n => 
    n.type === 'new_user_created'
  );

  // Calculate total notification count
  const notificationCount = (pendingVisits?.length || 0) + 
                          (lowStockProducts?.length || 0) + 
                          slabNotifications.length + 
                          userNotifications.length;

  // Mark showroom visit as read
  const markAsReadMutation = useMutation({
    mutationFn: (visitId: number) => apiRequest('PATCH', `/api/showroom-visits/${visitId}`, { status: 'contacted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits/pending"] });
    },
  });

  // Mark all showroom visits as read
  const markAllAsReadMutation = useMutation({
    mutationFn: (type: string) => {
      if (type === 'showroom_visit') {
        return Promise.all(
          (pendingVisits || []).map(visit => 
            apiRequest('PATCH', `/api/showroom-visits/${visit.id}`, { status: 'contacted' })
          )
        );
      }
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits/pending"] });
    },
  });
  
  const isAdmin = user?.role === 'admin';
  const isInventorySpecialist = user?.role === 'inventory_specialist';
  const isSalesRep = user?.role === 'sales_rep';
  const isSalesLeader = user?.role === 'sales_leader';
  
  // Filter navigation based on user role
  const getVisibleNavigation = () => {
    if (isAdmin) {
      // Admins see everything in the main navigation
      return navigation;
    } else if (isInventorySpecialist) {
      // Inventory specialists can see dashboard, inventory, all slabs, and reports
      return navigation.filter(item => 
        ['/', '/inventory', '/all-slabs', '/reports'].includes(item.href)
      );
    } else if (isSalesRep) {
      // Sales reps can see dashboard, clients, quotes, showroom visits, and reports
      return navigation.filter(item => 
        ['/', '/clients', '/quotes', '/showroom-visits', '/reports'].includes(item.href)
      );
    } else if (isSalesLeader) {
      // Sales leaders can see dashboard, clients, quotes, showroom visits, AR, reports, and pipeline
      return navigation.filter(item => 
        ['/', '/clients', '/quotes', '/showroom-visits', '/purchase-orders', '/reports', '/pipeline'].includes(item.href)
      );
    }
    return navigation;
  };
  
  const visibleNavigation = getVisibleNavigation();

  return (
    <aside className="w-64 bg-white shadow-lg border-r border-neutral-200 flex flex-col h-screen">
      {/* Logo and Company Name */}
      <div className="p-6 border-b border-neutral-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-8 bg-black rounded flex items-center justify-center px-2">
              <span className="text-white font-bold text-sm">TCF</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-custom">Texas Counter Fitters</h1>
              <p className="text-sm text-secondary-custom">CRM System</p>
            </div>
          </div>
          
          {/* Notifications Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-red text-white text-xs rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b flex justify-between items-center">
                <h4 className="font-semibold text-sm">Notifications</h4>
                {notificationCount > 0 && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {notificationCount} new
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {pendingVisits && pendingVisits.length > 0 && (
                  <>
                    <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-700">Showroom Visit Requests</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => markAllAsReadMutation.mutate('showroom_visit')}
                      >
                        Mark All Read
                      </Button>
                    </div>
                    {pendingVisits.map((visit: any) => (
                      <div key={visit.id} className="p-3 border-b hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{visit.clientName}</p>
                            <p className="text-xs text-gray-600">{visit.email} • {visit.phoneNumber}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Preferred: {new Date(visit.preferredDate).toLocaleDateString()} at {visit.preferredTime}
                            </p>
                            {visit.notes && (
                              <p className="text-xs text-gray-600 mt-1 italic">"{visit.notes}"</p>
                            )}
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => markAsReadMutation.mutate(visit.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => removeNotification(visit.id.toString())}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {lowStockProducts && lowStockProducts.length > 0 && (
                  <>
                    <div className="p-2 border-b bg-gray-50">
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <Package className="h-3 w-3 mr-1" />
                        Low Stock Alerts
                      </span>
                    </div>
                    {lowStockProducts.slice(0, 3).map((product: any) => (
                      <div key={product.id} className="p-3 border-b hover:bg-gray-50">
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-red-600">Stock: {product.quantity}</p>
                      </div>
                    ))}
                  </>
                )}

                {slabNotifications.length > 0 && (
                  <>
                    <div className="p-2 border-b bg-gray-50">
                      <span className="text-xs font-medium text-gray-700">New Slab Updates</span>
                    </div>
                    {slabNotifications.map((notification, index) => (
                      <div key={index} className="p-3 border-b hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            onClick={() => removeNotification(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {userNotifications.length > 0 && (
                  <>
                    <div className="p-2 border-b bg-gray-50">
                      <span className="text-xs font-medium text-gray-700 flex items-center">
                        <UserPlus className="h-3 w-3 mr-1" />
                        New User Notifications
                      </span>
                    </div>
                    {userNotifications.map((notification, index) => (
                      <div key={index} className="p-3 border-b hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notification.title}</p>
                            <p className="text-xs text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            onClick={() => removeNotification(notification.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {notificationCount === 0 && (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                )}
              </div>
              {notificationCount > 0 && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => clearNotifications()}
                  >
                    Clear All Notifications
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 pt-6 overflow-y-auto">
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
          

          
          {/* Admin navigation */}
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
          
          {/* Sales Rep navigation */}
          {isSalesRep && (
            <>
              <li className="pt-4">
                <div className="px-4 py-2">
                  <p className="text-xs font-semibold text-secondary-custom uppercase tracking-wider">
                    Profile
                  </p>
                </div>
              </li>
              {salesRepNavigation.map((item) => {
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
      <div className="p-4 border-t border-neutral-200 flex-shrink-0 mt-auto">
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
