import { useState } from "react";
import { Search, Bell, Plus, LogOut, User } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import QuoteBuilderModal from "@/components/quotes/quote-builder-modal";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
}

export default function TopBar({ title, subtitle, onSearch }: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuoteBuilderOpen, setIsQuoteBuilderOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
            <Button 
              onClick={() => setIsQuoteBuilderOpen(true)}
              className="bg-accent-orange hover:bg-accent-orange text-white"
            >
              <Plus size={16} className="mr-2" />
              New Quote
            </Button>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-red text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>

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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="text-secondary-custom hover:text-error-red"
              >
                <LogOut size={16} className="mr-1" />
                {logoutMutation.isPending ? "Signing out..." : "Logout"}
              </Button>
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
