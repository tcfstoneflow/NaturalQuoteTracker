import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, UserCheck, UserX, Key, Eye, EyeOff } from "lucide-react";
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
import type { z } from "zod";

type UserForm = z.infer<typeof insertUserSchema>;

export default function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

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
      return await apiRequest({
        url: `/api/users/${userId}/toggle`,
        method: "PATCH",
        body: { isActive },
      });
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

          {/* Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users?.map((user: any) => (
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
                  
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleUserMutation.mutate({ 
                        userId: user.id, 
                        isActive: !user.isActive 
                      })}
                      disabled={toggleUserMutation.isPending}
                    >
                      {user.isActive ? (
                        <>
                          <UserX size={14} className="mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck size={14} className="mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!users || users.length === 0) && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-primary-custom">No users found</h3>
                  <p className="text-secondary-custom">Get started by adding your first sales representative</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}