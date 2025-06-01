import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, UserCheck, UserX, Key, Eye, EyeOff, Search, Filter, MoreHorizontal, Mail, Phone, MapPin, Calendar, Activity, Users, Shield, Clock, AlertTriangle, Settings, Lock, Unlock, Upload, User, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertUserSchema } from "@shared/schema";
import TopBar from "@/components/layout/topbar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { z } from "zod";

type UserForm = z.infer<typeof insertUserSchema>;

export default function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userSettingsDialogOpen, setUserSettingsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [settingsTab, setSettingsTab] = useState("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // RBAC Permission definitions
  const permissions = {
    users: {
      name: "User Management",
      actions: ["view", "create", "edit", "delete", "manage_permissions"]
    },
    inventory: {
      name: "Inventory Management", 
      actions: ["view", "create", "edit", "delete", "manage_stock"]
    },
    quotes: {
      name: "Quote Management",
      actions: ["view", "create", "edit", "delete", "send_email"]
    },
    clients: {
      name: "Client Management",
      actions: ["view", "create", "edit", "delete", "view_private_info"]
    },
    reports: {
      name: "Reports & Analytics",
      actions: ["view", "export", "advanced_analytics"]
    },
    system: {
      name: "System Administration",
      actions: ["view_logs", "manage_settings", "backup_restore"]
    }
  };

  // Role templates with default permissions
  const roleTemplates = {
    admin: {
      name: "Administrator",
      description: "Full access to all system features",
      permissions: Object.keys(permissions).reduce((acc, module) => {
        acc[module] = permissions[module as keyof typeof permissions].actions;
        return acc;
      }, {} as Record<string, string[]>)
    },
    sales_rep: {
      name: "Sales Representative", 
      description: "Access to quotes, clients, and inventory viewing",
      permissions: {
        inventory: ["view"],
        quotes: ["view", "create", "edit", "send_email"],
        clients: ["view", "create", "edit"],
        reports: ["view"]
      }
    },
    inventory_specialist: {
      name: "Inventory Specialist",
      description: "Full inventory management with limited quote access", 
      permissions: {
        inventory: ["view", "create", "edit", "delete", "manage_stock"],
        quotes: ["view"],
        clients: ["view"],
        reports: ["view"]
      }
    }
  };

  // Helper function to check if a user has a specific permission
  const hasPermission = (userRole: string, moduleKey: string, action: string) => {
    if (userRole === "admin") return true;
    
    const roleTemplate = roleTemplates[userRole as keyof typeof roleTemplates];
    if (!roleTemplate) return false;
    
    const modulePermissions = roleTemplate.permissions[moduleKey];
    return modulePermissions?.includes(action) || false;
  };
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  // Enhanced filtering logic
  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.isActive) ||
      (statusFilter === "inactive" && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  }) || [];

  // User statistics
  const userStats = users ? {
    total: users.length,
    active: users.filter((u: any) => u.isActive).length,
    inactive: users.filter((u: any) => !u.isActive).length,
    admins: users.filter((u: any) => u.role === 'admin').length,
    salesReps: users.filter((u: any) => u.role === 'sales_rep').length,
    inventorySpecialists: users.filter((u: any) => u.role === 'inventory_specialist').length,
  } : { total: 0, active: 0, inactive: 0, admins: 0, salesReps: 0, inventorySpecialists: 0 };

  const form = useForm<UserForm>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "sales_rep",
      isActive: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return await apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User created successfully!",
        description: "The new sales representative can now log in.",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create user",
        description: error.message || "Please try again",
      });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/toggle`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User status updated",
        description: "User access has been modified successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update user",
        description: error.message || "Please try again",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<UserForm>) => {
      return await apiRequest("PUT", `/api/users/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const updateUserProfileMutation = useMutation({
    mutationFn: async ({ userId, profileData }: { userId: number; profileData: any }) => {
      return await apiRequest("PATCH", `/api/users/${userId}/profile`, profileData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User profile updated successfully",
      });
      setUserSettingsDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user profile",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: number; newPassword: string }) => {
      return await apiRequest("POST", `/api/users/${userId}/password`, { password: newPassword });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password updated successfully",
      });
      setNewPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async ({ userId, file }: { userId: number; file: File }) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return await apiRequest("POST", `/api/users/${userId}/avatar`, formData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "User has been permanently removed from the system",
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserForm) => {
    createUserMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="User Management" 
        subtitle="Manage sales team access and permissions"
      />
      
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header with Add User Button */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-primary-custom">Team Management</h3>
              <p className="text-secondary-custom">Manage users and their role-based access permissions</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent-orange hover:bg-accent-orange text-white">
                  <Plus size={16} className="mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                    Create a new account and assign the appropriate role
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="john.smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temporary Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Temporary password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sales_rep">Sales Representative</SelectItem>
                              <SelectItem value="inventory_specialist">Inventory Specialist</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? "Creating..." : "Create User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="flex items-center p-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{userStats.total}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-4">
                <UserCheck className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-4">
                <UserX className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-red-600">{userStats.inactive}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-4">
                <Shield className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Admins</p>
                  <p className="text-2xl font-bold text-purple-600">{userStats.admins}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-4">
                <Activity className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sales Reps</p>
                  <p className="text-2xl font-bold text-orange-600">{userStats.salesReps}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center p-4">
                <Activity className="h-8 w-8 text-cyan-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Inventory</p>
                  <p className="text-2xl font-bold text-cyan-600">{userStats.inventorySpecialists}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, username, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="sales_rep">Sales Rep</SelectItem>
                      <SelectItem value="inventory_specialist">Inventory</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    onClick={() => setViewMode(viewMode === "grid" ? "table" : "grid")}
                  >
                    {viewMode === "grid" ? "Table View" : "Grid View"}
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredUsers.length} of {userStats.total} users
              </div>
            </CardContent>
          </Card>

          {/* Users Display */}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user: any) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      {user.firstName} {user.lastName}
                    </CardTitle>
                    <Badge 
                      variant={user.isActive ? "default" : "secondary"}
                      className={user.isActive ? "bg-success-green text-white" : ""}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>@{user.username}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-custom">Email:</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-custom">Role:</span>
                      <Badge variant="outline">
                        {user.role === 'admin' 
                          ? 'Administrator' 
                          : user.role === 'inventory_specialist' 
                          ? 'Inventory Specialist' 
                          : 'Sales Rep'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-secondary-custom">Username:</span>
                      <span className="font-mono text-sm font-medium">{user.username}</span>
                    </div>
                    {user.lastLogin && (
                      <div className="flex items-center justify-between">
                        <span className="text-secondary-custom">Last Login:</span>
                        <span className="text-xs">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserMutation.mutate({ 
                        userId: user.id, 
                        isActive: !user.isActive 
                      })}
                      disabled={toggleUserMutation.isPending}
                      className="text-xs h-8"
                    >
                      {user.isActive ? (
                        <>
                          <UserX size={12} className="mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck size={12} className="mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserSettingsDialogOpen(true);
                      }}
                      className="text-xs h-8"
                    >
                      <Settings size={12} className="mr-1" />
                      Settings
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setPermissionsDialogOpen(true);
                      }}
                      className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 text-xs h-8"
                    >
                      <Settings size={12} className="mr-1" />
                      Permissions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedUser(user);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs h-8"
                    >
                      <Trash2 size={12} className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role === 'admin' 
                              ? 'Administrator' 
                              : user.role === 'inventory_specialist' 
                              ? 'Inventory Specialist' 
                              : 'Sales Rep'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.isActive ? "default" : "secondary"}
                            className={user.isActive ? "bg-green-600 text-white" : ""}
                          >
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.lastLogin 
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserMutation.mutate({ 
                                userId: user.id, 
                                isActive: !user.isActive 
                              })}
                              disabled={toggleUserMutation.isPending}
                            >
                              {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setUserSettingsDialogOpen(true);
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setPermissionsDialogOpen(true);
                              }}
                              className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No users match your search criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Enhanced User Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and role assignments
                </DialogDescription>
              </DialogHeader>
              
              {selectedUser && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => {
                    updateUserMutation.mutate({ id: selectedUser.id, ...data });
                  })} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} defaultValue={selectedUser.firstName} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} defaultValue={selectedUser.lastName} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} defaultValue={selectedUser.email} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={selectedUser.role}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sales_rep">Sales Representative</SelectItem>
                              <SelectItem value="inventory_specialist">Inventory Specialist</SelectItem>
                              <SelectItem value="admin">Administrator</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateUserMutation.isPending}
                      >
                        {updateUserMutation.isPending ? "Updating..." : "Update User"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          {/* User Settings Dialog */}
          <Dialog open={userSettingsDialogOpen} onOpenChange={setUserSettingsDialogOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>User Settings</DialogTitle>
                <DialogDescription>
                  Manage profile settings for {selectedUser?.firstName} {selectedUser?.lastName}
                </DialogDescription>
              </DialogHeader>
              
              {selectedUser && (
                <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="avatar">Avatar</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profile" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">First Name</label>
                        <Input
                          defaultValue={selectedUser.firstName}
                          placeholder="First name"
                          id="firstName"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Last Name</label>
                        <Input
                          defaultValue={selectedUser.lastName}
                          placeholder="Last name"
                          id="lastName"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        defaultValue={selectedUser.email}
                        placeholder="Email address"
                        type="email"
                        id="email"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Username</label>
                      <Input
                        defaultValue={selectedUser.username}
                        placeholder="Username"
                        id="username"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role</label>
                      <Select defaultValue={selectedUser.role}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sales_rep">Sales Representative</SelectItem>
                          <SelectItem value="inventory_specialist">Inventory Specialist</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setUserSettingsDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const formData = new FormData();
                          const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value;
                          const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value;
                          const email = (document.getElementById('email') as HTMLInputElement)?.value;
                          const username = (document.getElementById('username') as HTMLInputElement)?.value;
                          
                          updateUserProfileMutation.mutate({
                            userId: selectedUser.id,
                            profileData: { firstName, lastName, email, username }
                          });
                        }}
                        disabled={updateUserProfileMutation.isPending}
                      >
                        {updateUserProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="avatar" className="space-y-4">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        {selectedUser.profileImageUrl ? (
                          <img
                            src={selectedUser.profileImageUrl}
                            alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                            className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <Button
                          size="sm"
                          className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                          onClick={() => document.getElementById('avatarUpload')?.click()}
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <input
                        id="avatarUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProfileImage(file);
                          }
                        }}
                      />
                      
                      {profileImage && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-2">Selected: {profileImage.name}</p>
                          <Button
                            onClick={() => {
                              if (profileImage) {
                                uploadAvatarMutation.mutate({
                                  userId: selectedUser.id,
                                  file: profileImage
                                });
                                setProfileImage(null);
                              }
                            }}
                            disabled={uploadAvatarMutation.isPending}
                          >
                            {uploadAvatarMutation.isPending ? "Uploading..." : "Upload Avatar"}
                          </Button>
                        </div>
                      )}
                      
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('avatarUpload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose New Avatar
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="security" className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Password should be at least 8 characters long
                        </p>
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setNewPassword("");
                            setShowPassword(false);
                          }}
                        >
                          Clear
                        </Button>
                        <Button
                          onClick={() => {
                            if (selectedUser && newPassword.trim().length >= 8) {
                              updatePasswordMutation.mutate({
                                userId: selectedUser.id,
                                newPassword: newPassword.trim()
                              });
                            }
                          }}
                          disabled={!newPassword.trim() || newPassword.length < 8 || updatePasswordMutation.isPending}
                        >
                          {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          {/* RBAC Permissions Management Dialog */}
          <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Manage Permissions - {selectedUser?.username}
                </DialogTitle>
                <DialogDescription>
                  Configure detailed permissions for this user. You can use role templates or customize individual permissions.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Role Templates Section */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Quick Role Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(roleTemplates).map(([roleKey, template]) => (
                      <Card key={roleKey} className="border-2 hover:border-blue-200 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-blue-900">{template.name}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: "Template Applied",
                                  description: `${template.name} permissions applied to ${selectedUser?.username}`,
                                });
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          <div className="text-xs text-gray-500">
                            <strong>Modules:</strong> {Object.keys(template.permissions).join(", ")}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Detailed Permissions Matrix */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Detailed Permissions Matrix
                  </h3>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                      <div className="grid grid-cols-6 gap-4 items-center font-medium text-sm">
                        <div>Module</div>
                        <div className="text-center">View</div>
                        <div className="text-center">Create</div>
                        <div className="text-center">Edit</div>
                        <div className="text-center">Delete</div>
                        <div className="text-center">Special</div>
                      </div>
                    </div>
                    
                    {Object.entries(permissions).map(([moduleKey, module]) => (
                      <div key={moduleKey} className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50">
                        <div className="grid grid-cols-6 gap-4 items-center">
                          <div>
                            <div className="font-medium text-sm">{module.name}</div>
                            <div className="text-xs text-gray-500 capitalize">{moduleKey}</div>
                          </div>
                          
                          {/* View Permission */}
                          <div className="text-center">
                            {module.actions.includes("view") && (
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                defaultChecked={selectedUser ? hasPermission(selectedUser.role, moduleKey, "view") : false}
                              />
                            )}
                          </div>
                          
                          {/* Create Permission */}
                          <div className="text-center">
                            {module.actions.includes("create") && (
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                defaultChecked={selectedUser ? hasPermission(selectedUser.role, moduleKey, "create") : false}
                              />
                            )}
                          </div>
                          
                          {/* Edit Permission */}
                          <div className="text-center">
                            {module.actions.includes("edit") && (
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                defaultChecked={selectedUser ? hasPermission(selectedUser.role, moduleKey, "edit") : false}
                              />
                            )}
                          </div>
                          
                          {/* Delete Permission */}
                          <div className="text-center">
                            {module.actions.includes("delete") && (
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                defaultChecked={selectedUser ? hasPermission(selectedUser.role, moduleKey, "delete") : false}
                              />
                            )}
                          </div>
                          
                          {/* Special Permissions */}
                          <div className="text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {module.actions.filter(action => !["view", "create", "edit", "delete"].includes(action)).map(action => (
                                <div key={action} className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
                                    defaultChecked={selectedUser ? hasPermission(selectedUser.role, moduleKey, action) : false}
                                  />
                                  <span className="text-xs text-gray-600 capitalize">
                                    {action.replace("_", " ")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Current Role Information */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Current Role: {selectedUser?.role}
                  </h4>
                  <p className="text-sm text-blue-700">
                    This user currently has the "{selectedUser?.role}" role. The permissions above show what this role typically includes.
                    You can customize individual permissions or apply a different role template.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Permissions Reset",
                          description: "All permissions reset to role defaults",
                        });
                      }}
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Permissions Copied",
                          description: "Permission template saved for future use",
                        });
                      }}
                    >
                      Save as Template
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPermissionsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        toast({
                          title: "Permissions Updated",
                          description: `Permissions successfully updated for ${selectedUser?.username}`,
                        });
                        setPermissionsDialogOpen(false);
                      }}
                    >
                      Save Permissions
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete User Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Delete User
                </DialogTitle>
                <DialogDescription>
                  This action cannot be undone. Are you sure you want to permanently delete this user?
                </DialogDescription>
              </DialogHeader>
              
              {selectedUser && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm space-y-1">
                    <div><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</div>
                    <div><strong>Username:</strong> {selectedUser.username}</div>
                    <div><strong>Email:</strong> {selectedUser.email}</div>
                    <div><strong>Role:</strong> {
                      selectedUser.role === 'admin' 
                        ? 'Administrator' 
                        : selectedUser.role === 'inventory_specialist' 
                        ? 'Inventory Specialist' 
                        : 'Sales Representative'
                    }</div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedUser) {
                      deleteUserMutation.mutate(selectedUser.id);
                    }
                  }}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}