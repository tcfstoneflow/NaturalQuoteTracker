import { useState } from "react";
import { Search, Bell, Plus, LogOut, User, Settings, Check, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import QuoteBuilderModal from "@/components/quotes/quote-builder-modal";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  hideNewQuoteButton?: boolean;
}

export default function TopBar({ title, subtitle, onSearch, hideNewQuoteButton }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get notifications - pending showroom visits and other alerts
  const { data: pendingVisits } = useQuery({
    queryKey: ["/api/showroom-visits/pending"],
    enabled: !!user?.user?.role && (user.user.role === 'admin' || user.user.role === 'sales_rep'),
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["/api/products/low-stock"],
    enabled: !!user?.user?.role,
  });

  const notificationCount = (pendingVisits?.length || 0) + (lowStockProducts?.length || 0);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Please try again",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async ({ type, referenceId }: { type: string; referenceId?: number }) => {
      return await apiRequest("POST", "/api/notifications/mark-read", { type, referenceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/low-stock"] });
      toast({
        title: "Marked as read",
        description: "Notification has been marked as read",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async (type: string) => {
      return await apiRequest("POST", "/api/notifications/mark-all-read", { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/low-stock"] });
      toast({
        title: "All notifications marked as read",
        description: "All notifications of this type have been cleared",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read",
      });
    },
  });

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <>
      <header className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary-custom">{title}</h2>
            {subtitle && (
              <p className="text-secondary-custom">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {/* Search Bar */}
            {onSearch && (
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search clients, products..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-4 py-2 w-80"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-custom" size={16} />
              </div>
            )}
            
            {/* Quick Actions */}
            {!hideNewQuoteButton && (
              <Button 
                onClick={() => setIsQuoteBuilderOpen(true)}
                className="bg-accent-orange hover:bg-accent-orange text-white"
              >
                <Plus size={16} className="mr-2" />
                New Quote
              </Button>
            )}
            
            {/* Notifications */}
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
                          disabled={markAllAsReadMutation.isPending}
                        >
                          <Check size={12} className="mr-1" />
                          Mark All Read
                        </Button>
                      </div>
                      {pendingVisits.map((visit: any) => (
                        <div key={visit.id} className="p-3 border-b hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">New Showroom Visit Request</div>
                              <div className="text-xs text-gray-600">
                                {visit.name} ({visit.email}) wants to visit on {new Date(visit.requestedDate).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={() => markAsReadMutation.mutate({ type: 'showroom_visit', referenceId: visit.id })}
                              disabled={markAsReadMutation.isPending}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {lowStockProducts && lowStockProducts.length > 0 && (
                    <>
                      <div className="p-2 border-b bg-gray-50 flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">Low Stock Alerts</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => markAllAsReadMutation.mutate('low_stock')}
                          disabled={markAllAsReadMutation.isPending}
                        >
                          <Check size={12} className="mr-1" />
                          Mark All Read
                        </Button>
                      </div>
                      {lowStockProducts.map((product: any) => (
                        <div key={product.id} className="p-3 border-b hover:bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">Low Stock Alert</div>
                              <div className="text-xs text-gray-600">
                                {product.name} - Only {product.stockQuantity} slabs remaining
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 ml-2"
                              onClick={() => markAsReadMutation.mutate({ type: 'low_stock', referenceId: product.id })}
                              disabled={markAsReadMutation.isPending}
                            >
                              <X size={12} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {notificationCount === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No new notifications
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-3 border-l border-neutral-200 pl-4">
              <div className="flex items-center space-x-2">
                <User size={16} className="text-secondary-custom" />
                <span className="text-sm font-medium text-primary-custom">
                  {user?.user?.firstName} {user?.user?.lastName}
                </span>
                <span className="text-xs bg-accent-blue text-white px-2 py-1 rounded-full">
                  {user?.user?.role === 'admin' ? 'Admin' : 'Sales Rep'}
                </span>
              </div>
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-secondary-custom hover:text-primary"
                >
                  <Settings size={16} className="mr-1" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <QuoteBuilderModal 
        isOpen={isQuoteBuilderOpen}
        onClose={() => setIsQuoteBuilderOpen(false)}
      />
    </>
  );
}
