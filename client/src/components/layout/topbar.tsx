import { useState } from "react";
import { Search, Plus, LogOut, User, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary-custom">{title}</h1>
          {subtitle && <p className="text-sm text-secondary-custom mt-1">{subtitle}</p>}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          {onSearch && (
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-custom" size={16} />
            </form>
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
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Link href="/settings">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings size={16} className="mr-2" />
                  Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="cursor-pointer text-red-600"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Quote Builder Modal */}
      <QuoteBuilderModal 
        isOpen={isQuoteBuilderOpen} 
        onClose={() => setIsQuoteBuilderOpen(false)} 
      />
    </>
  );
}