import { useState, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Eye, Settings } from "lucide-react";

interface RoleSwitcherContextType {
  viewingAs: string;
  setViewingAs: (role: string) => void;
  actualRole: string;
  isDevMode: boolean;
}

const RoleSwitcherContext = createContext<RoleSwitcherContextType | null>(null);

export function useRoleSwitcher() {
  const context = useContext(RoleSwitcherContext);
  if (!context) {
    throw new Error('useRoleSwitcher must be used within a RoleSwitcherProvider');
  }
  return context;
}

interface RoleSwitcherProviderProps {
  children: React.ReactNode;
}

export function RoleSwitcherProvider({ children }: RoleSwitcherProviderProps) {
  const [viewingAs, setViewingAs] = useState<string>('');

  // Get current user to determine actual role
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return null;
      return response.json();
    },
  });

  const actualRole = user?.user?.role || '';
  const isDevMode = actualRole === 'dev';
  
  // Initialize viewingAs to actual role when user data loads
  if (actualRole && !viewingAs) {
    setViewingAs(actualRole);
  }

  return (
    <RoleSwitcherContext.Provider 
      value={{ 
        viewingAs: viewingAs || actualRole, 
        setViewingAs, 
        actualRole, 
        isDevMode 
      }}
    >
      {children}
    </RoleSwitcherContext.Provider>
  );
}

interface RoleSwitcherProps {
  className?: string;
}

export function RoleSwitcher({ className = "" }: RoleSwitcherProps) {
  const { viewingAs, setViewingAs, actualRole, isDevMode } = useRoleSwitcher();

  // Available roles for role switching
  const availableRoles = [
    { value: 'admin', label: 'Administrator', description: 'Full system access' },
    { value: 'sales_rep', label: 'Sales Representative', description: 'Client and quote management' },
    { value: 'inventory_specialist', label: 'Inventory Specialist', description: 'Product and stock management' },
    { value: 'dev', label: 'Developer', description: 'Development and testing mode' }
  ];

  // Only show role switcher for dev users
  if (!isDevMode) {
    return null;
  }

  const currentRoleInfo = availableRoles.find(role => role.value === viewingAs);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline" className="flex items-center gap-1">
        <Eye className="w-3 h-3" />
        Viewing as
      </Badge>
      
      <Select value={viewingAs} onValueChange={setViewingAs}>
        <SelectTrigger className="w-48">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {currentRoleInfo?.label || viewingAs}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableRoles.map((role) => (
            <SelectItem key={role.value} value={role.value}>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{role.label}</span>
                  {role.value === actualRole && (
                    <Badge variant="secondary" className="text-xs">Actual Role</Badge>
                  )}
                </div>
                <span className="text-xs text-gray-500">{role.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {viewingAs !== actualRole && (
        <Badge variant="destructive" className="text-xs">
          Dev Mode
        </Badge>
      )}
    </div>
  );
}

// Hook to get effective role for permissions checking
export function useEffectiveRole() {
  const { viewingAs, actualRole, isDevMode } = useRoleSwitcher();
  
  // For permission checking, always use actual role for security
  // But for UI display logic, use viewingAs role
  return {
    displayRole: viewingAs,
    permissionRole: actualRole,
    isDevMode,
    hasAdminAccess: actualRole === 'admin' || actualRole === 'dev'
  };
}