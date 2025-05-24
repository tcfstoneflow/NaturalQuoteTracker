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

  // Auto-create slabs mutation
  const autoCreateSlabsMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest('POST', `/api/products/${productId}/auto-create-slabs`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      queryClient.refetchQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      toast({
        title: "Slabs Created",
        description: "Individual slabs have been automatically created based on stock quantity.",
      });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || "Failed to create slabs automatically.";
      toast({
        title: message.includes("already exist") ? "Slabs Already Created" : "Error",
        description: message.includes("already exist") ? "Slabs have already been created for this bundle." : message,
        variant: message.includes("already exist") ? "default" : "destructive",
      });
    },
  });

  const generateBarcodesMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/slabs/generate-barcodes'),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      queryClient.refetchQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      toast({
        title: "Barcodes Generated",
        description: response.message || "Barcodes have been generated for all slabs.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate barcodes.",
        variant: "destructive",
      });
    },
  });

  const addSlabForm = useForm<InsertSlab>({
    resolver: zodResolver(insertSlabSchema),
    defaultValues: {
      bundleId: productWithSlabs?.bundleId || '',
      slabNumber: '',
      status: 'available',
      length: null,
      width: null,
      barcode: '',
      location: '',
      notes: '',
    },
  });

  const editSlabForm = useForm<InsertSlab>({
    resolver: zodResolver(insertSlabSchema),
    defaultValues: {
      bundleId: '',
      slabNumber: '',
      status: 'available',
      length: null,
      width: null,
      barcode: '',
      location: '',
      notes: '',
    },
  });

  const createSlabMutation = useMutation({
    mutationFn: (data: InsertSlab) => apiRequest(`/api/slabs`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      setIsAddDialogOpen(false);
      addSlabForm.reset();
      toast({ title: "Success", description: "Slab added successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSlabMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSlab> }) => 
      apiRequest(`/api/slabs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      setIsEditDialogOpen(false);
      setEditingSlab(null);
      editSlabForm.reset();
      toast({ title: "Success", description: "Slab updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSlabStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      apiRequest('PATCH', `/api/slabs/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      toast({ title: "Success", description: "Slab status updated!" });
    },
  });

  const deleteSlabMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/slabs/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products', productId, 'with-slabs'] });
      toast({ title: "Success", description: "Slab deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      status: slab.status,
      length: slab.length,
      width: slab.width,
      barcode: slab.barcode || '',
      location: slab.location || '',
      notes: slab.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleStatusChange = (slabId: number, newStatus: string) => {
    updateSlabStatusMutation.mutate({ id: slabId, status: newStatus });
  };

  const handleDeleteSlab = (slabId: number) => {
    if (confirm('Are you sure you want to delete this slab?')) {
      deleteSlabMutation.mutate(slabId);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
        <div className="text-center py-12">Loading slab information...</div>
      </div>
    );
  }

  if (!productWithSlabs) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
        <div className="text-center py-12">Bundle not found</div>
      </div>
    );
  }

  const availableSlabs = productWithSlabs.slabs?.filter(slab => slab.status === 'available').length || 0;
  const soldSlabs = productWithSlabs.slabs?.filter(slab => slab.status === 'sold').length || 0;
  const deliveredSlabs = productWithSlabs.slabs?.filter(slab => slab.status === 'delivered').length || 0;

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation('/inventory')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Slab Management</h1>
            <p className="text-muted-foreground">Manage individual slabs for {productWithSlabs.name}</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Bundle Information */}
          <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bundle ID</p>
              <p className="text-lg font-semibold">{productWithSlabs.bundleId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bundle Name</p>
              <p className="text-lg font-semibold">{productWithSlabs.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supplier</p>
              <p className="text-lg font-semibold">{productWithSlabs.supplier}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Slabs</p>
              <p className="text-lg font-semibold">{productWithSlabs.slabs?.length || 0}</p>
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <Badge className={statusColors.available}>
              Available: {availableSlabs}
            </Badge>
            <Badge className={statusColors.sold}>
              Sold: {soldSlabs}
            </Badge>
            <Badge className={statusColors.delivered}>
              Delivered: {deliveredSlabs}
            </Badge>
          </div>
        </CardContent>
      </Card>

          {/* Add Slab Button */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Individual Slabs</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => generateBarcodesMutation.mutate()}
            disabled={generateBarcodesMutation.isPending}
          >
            {generateBarcodesMutation.isPending ? "Generating..." : "Generate Barcodes"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => addSlabForm.reset({ bundleId: productWithSlabs.bundleId })}>
                <Plus className="h-4 w-4 mr-2" />
                Add Slab
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Slab</DialogTitle>
                <DialogDescription>
                  Add a new slab to bundle {productWithSlabs.bundleId}
                </DialogDescription>
              </DialogHeader>
            <Form {...addSlabForm}>
              <form onSubmit={addSlabForm.handleSubmit(handleAddSlab)} className="space-y-4">
                <FormField
                  control={addSlabForm.control}
                  name="slabNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slab Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., S001, 1, A-1" {...field} />
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
                            type="number" 
                            step="0.01"
                            placeholder="120.5"
                            {...field}
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
                            type="number" 
                            step="0.01"
                            placeholder="72.0"
                            {...field}
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
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Scan or enter barcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addSlabForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Storage Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Warehouse A, Row 3, Slot 5" {...field} />
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
                        <Textarea placeholder="Any additional notes about this slab" {...field} />
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

      {/* Slabs Grid */}
      {(!productWithSlabs.slabs || productWithSlabs.slabs.length === 0) ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No slabs yet</h3>
            <p className="text-muted-foreground mb-4">
              This bundle has {productWithSlabs.stockQuantity} slabs. You can automatically create individual slab records or add them manually.
            </p>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={() => autoCreateSlabsMutation.mutate(productId!)}
                disabled={autoCreateSlabsMutation.isPending}
              >
                {autoCreateSlabsMutation.isPending ? "Creating..." : `Auto-Create ${productWithSlabs.stockQuantity} Slabs`}
              </Button>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[calc(100vh-500px)] overflow-y-auto pr-2">
          {productWithSlabs.slabs?.map((slab) => {
            const StatusIcon = statusIcons[slab.status as keyof typeof statusIcons];
            return (
              <Card key={slab.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{slab.slabNumber}</CardTitle>
                    <Badge className={statusColors[slab.status as keyof typeof statusColors]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {slab.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(slab.length || slab.width) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Dimensions</p>
                      <p className="text-sm">
                        {slab.length ? `${slab.length}"` : '?'} × {slab.width ? `${slab.width}"` : '?'}
                        {slab.length && slab.width && (
                          <span className="text-muted-foreground ml-2">
                            ({((Number(slab.length) * Number(slab.width)) / 144).toFixed(1)} sq ft)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {slab.barcode && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Barcode</p>
                      <p className="text-sm font-mono">{slab.barcode}</p>
                    </div>
                  )}
                  
                  {slab.location && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="text-sm">{slab.location}</p>
                    </div>
                  )}
                  
                  {slab.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Notes</p>
                      <p className="text-sm">{slab.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3">
                    <Select
                      value={slab.status}
                      onValueChange={(value) => handleStatusChange(slab.id, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(slab)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSlab(slab.id)}
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
                    <FormLabel>Slab Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., S001, 1, A-1" {...field} />
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
                          type="number" 
                          step="0.01"
                          {...field}
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
                          type="number" 
                          step="0.01"
                          {...field}
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
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                      <Input {...field} />
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
                      <Textarea {...field} />
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
    </div>
  );
}