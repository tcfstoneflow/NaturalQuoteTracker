import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSlabSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit2, Trash2, Package, CheckCircle, XCircle, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Slab, ProductWithSlabs, InsertSlab } from "@shared/schema";
import { z } from "zod";

interface SlabManagementProps {
  productId: string;
}

const statusColors = {
  available: "bg-green-100 text-green-800 border-green-200",
  sold: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  delivered: "bg-blue-100 text-blue-800 border-blue-200",
};

const statusIcons = {
  available: CheckCircle,
  sold: XCircle,
  delivered: Truck,
};

export default function SlabManagement() {
  const [, setLocation] = useLocation();
  const [editingSlab, setEditingSlab] = useState<Slab | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get product ID from URL params
  const productId = window.location.pathname.split('/').pop();

  const { data: productWithSlabs, isLoading, error } = useQuery({
    queryKey: ['/api/products', productId, 'with-slabs'],
    queryFn: () => apiRequest('GET', `/api/products/${productId}/with-slabs`).then(res => res.json()),
    enabled: !!productId,
  });

  const addSlabForm = useForm<InsertSlab>({
    resolver: zodResolver(insertSlabSchema),
    defaultValues: {
      bundleId: productWithSlabs?.bundleId || '',
      slabNumber: '',
      length: null,
      width: null,
      status: 'Available',
      location: '',
      notes: '',
    },
  });

  const editSlabForm = useForm<InsertSlab>({
    resolver: zodResolver(insertSlabSchema),
    defaultValues: {
      bundleId: '',
      slabNumber: '',
      length: null,
      width: null,
      status: 'Available',
      location: '',
      notes: '',
    },
  });

  const createSlabMutation = useMutation({
    mutationFn: (data: InsertSlab) => apiRequest('POST', `/api/slabs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      setIsAddDialogOpen(false);
      addSlabForm.reset();
      toast({
        title: "Success",
        description: "Slab added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add slab",
        variant: "destructive",
      });
    },
  });

  const updateSlabMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSlab> }) => 
      apiRequest('PATCH', `/api/slabs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      setIsEditDialogOpen(false);
      setEditingSlab(null);
      toast({
        title: "Success",
        description: "Slab updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update slab",
        variant: "destructive",
      });
    },
  });

  const deleteSlabMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/slabs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      toast({
        title: "Success",
        description: "Slab deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete slab",
        variant: "destructive",
      });
    },
  });

  const handleAddSlab = (data: InsertSlab) => {
    createSlabMutation.mutate({
      ...data,
      bundleId: productWithSlabs?.bundleId || '',
    });
  };

  const handleEditSlab = (data: InsertSlab) => {
    if (editingSlab) {
      updateSlabMutation.mutate({
        id: editingSlab.id,
        data,
      });
    }
  };

  const openEditDialog = (slab: Slab) => {
    setEditingSlab(slab);
    editSlabForm.reset({
      bundleId: slab.bundleId,
      slabNumber: slab.slabNumber,
      length: slab.length,
      width: slab.width,
      status: slab.status || 'Available',
      location: slab.location || '',
      notes: slab.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteSlab = (id: number) => {
    if (confirm('Are you sure you want to delete this slab?')) {
      deleteSlabMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-lg font-medium">Loading slab management...</p>
        </div>
      </div>
    );
  }

  if (error || !productWithSlabs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Failed to load product data</p>
          <Button onClick={() => setLocation('/inventory')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  const slabs = productWithSlabs.slabs || [];
  const availableSlabs = slabs.filter(slab => slab.status?.toLowerCase() === 'available').length;
  const soldSlabs = slabs.filter(slab => slab.status?.toLowerCase() === 'sold').length;
  const deliveredSlabs = slabs.filter(slab => slab.status?.toLowerCase() === 'delivered').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation('/inventory')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{productWithSlabs.name}</h1>
              <p className="text-muted-foreground">
                Bundle ID: {productWithSlabs.bundleId} | {productWithSlabs.supplier}
              </p>
            </div>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Slab
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Slab</DialogTitle>
                <DialogDescription>
                  Add a new slab to this bundle
                </DialogDescription>
              </DialogHeader>
              <Form {...addSlabForm}>
                <form onSubmit={addSlabForm.handleSubmit(handleAddSlab)} className="space-y-4">
                  <FormField
                    control={addSlabForm.control}
                    name="slabNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slab Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., S001" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addSlabForm.control}
                      name="length"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Length (inches)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={addSlabForm.control}
                      name="width"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Width (inches)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={addSlabForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Warehouse A, Row 3" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addSlabForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any additional notes..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createSlabMutation.isPending}>
                      {createSlabMutation.isPending ? "Adding..." : "Add Slab"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Slabs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{slabs.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{availableSlabs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sold</CardTitle>
              <XCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{soldSlabs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <Truck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{deliveredSlabs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Slabs Grid */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Individual Slabs</h2>
          
          {slabs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No slabs found</h3>
                <p className="text-sm text-muted-foreground mb-4">Add slabs to this bundle to start tracking them</p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Slab
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[600px] overflow-y-auto">
              {slabs.map((slab) => {
                const StatusIcon = statusIcons[slab.status?.toLowerCase() as keyof typeof statusIcons] || Package;
                const statusColor = statusColors[slab.status?.toLowerCase() as keyof typeof statusColors] || statusColors.available;
                
                return (
                  <Card key={slab.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{slab.slabNumber}</CardTitle>
                        <Badge className={statusColor}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {slab.status || 'Available'}
                        </Badge>
                      </div>
                      {slab.barcode && (
                        <CardDescription className="text-xs font-mono">
                          {slab.barcode}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {(slab.length && slab.width) && (
                        <p className="text-sm">
                          <strong>Dimensions:</strong> {slab.length}" × {slab.width}"
                          <br />
                          <span className="text-muted-foreground">
                            ({((slab.length * slab.width) / 144).toFixed(2)} sq ft)
                          </span>
                        </p>
                      )}
                      
                      {slab.location && (
                        <p className="text-sm">
                          <strong>Location:</strong> {slab.location}
                        </p>
                      )}
                      
                      {slab.notes && (
                        <p className="text-sm text-muted-foreground">
                          {slab.notes}
                        </p>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(slab)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSlab(slab.id)}
                          className="flex-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Slab Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Slab</DialogTitle>
              <DialogDescription>
                Update slab information
              </DialogDescription>
            </DialogHeader>
            <Form {...editSlabForm}>
              <form onSubmit={editSlabForm.handleSubmit(handleEditSlab)} className="space-y-4">
                <FormField
                  control={editSlabForm.control}
                  name="slabNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slab Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editSlabForm.control}
                    name="length"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length (inches)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editSlabForm.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (inches)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editSlabForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Sold">Sold</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editSlabForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editSlabForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={updateSlabMutation.isPending}>
                    {updateSlabMutation.isPending ? "Updating..." : "Update Slab"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}