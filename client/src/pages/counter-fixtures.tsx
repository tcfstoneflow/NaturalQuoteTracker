import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye, Globe, ShoppingCart, Package, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CounterFixtures() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<any>(null);
  const [viewingFixture, setViewingFixture] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    supplier: "",
    grade: "standard",
    thickness: "",
    finish: "",
    price: "",
    ecommercePrice: "",
    unit: "each",
    stockQuantity: "",
    location: "",
    ecommerceDescription: "",
    specifications: {
      material: "",
      color: "",
      style: "",
      installation: "",
    },
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
    weight: "",
    shippingClass: "standard",
    minOrderQuantity: "1",
    maxOrderQuantity: "",
    leadTime: "",
    isEcommerceEnabled: false,
    displayOnline: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch counter fixtures (products with category = "counter_fixtures")
  const { data: fixtures, isLoading } = useQuery({
    queryKey: ['/api/products', { category: 'counter_fixtures', search: searchQuery }],
    queryFn: () => fetch(`/api/products?category=counter_fixtures&search=${searchQuery || ''}`).then(res => res.json()),
  });

  const createFixtureMutation = useMutation({
    mutationFn: async (fixtureData: any) => {
      const response = await apiRequest('POST', '/api/products', {
        ...fixtureData,
        category: 'counter_fixtures',
        specifications: JSON.stringify(fixtureData.specifications),
        dimensions: JSON.stringify(fixtureData.dimensions),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Counter fixture created successfully",
      });
      handleCloseCreateModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateFixtureMutation = useMutation({
    mutationFn: async ({ id, ...fixtureData }: any) => {
      const response = await apiRequest('PATCH', `/api/products/${id}`, {
        ...fixtureData,
        specifications: JSON.stringify(fixtureData.specifications),
        dimensions: JSON.stringify(fixtureData.dimensions),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Counter fixture updated successfully",
      });
      handleCloseCreateModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFixtureMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Counter fixture deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenCreateModal = () => {
    setEditingFixture(null);
    setFormData({
      name: "",
      supplier: "",
      grade: "standard",
      thickness: "",
      finish: "",
      price: "",
      ecommercePrice: "",
      unit: "each",
      stockQuantity: "",
      location: "",
      ecommerceDescription: "",
      specifications: {
        material: "",
        color: "",
        style: "",
        installation: "",
      },
      dimensions: {
        length: "",
        width: "",
        height: "",
      },
      weight: "",
      shippingClass: "standard",
      minOrderQuantity: "1",
      maxOrderQuantity: "",
      leadTime: "",
      isEcommerceEnabled: false,
      displayOnline: false,
    });
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingFixture(null);
  };

  const handleEditFixture = (fixture: any) => {
    setEditingFixture(fixture);
    setFormData({
      name: fixture.name || "",
      supplier: fixture.supplier || "",
      grade: fixture.grade || "standard",
      thickness: fixture.thickness || "",
      finish: fixture.finish || "",
      price: fixture.price || "",
      ecommercePrice: fixture.ecommercePrice || "",
      unit: fixture.unit || "each",
      stockQuantity: fixture.stockQuantity?.toString() || "",
      location: fixture.location || "",
      ecommerceDescription: fixture.ecommerceDescription || "",
      specifications: fixture.specifications ? (typeof fixture.specifications === 'string' ? JSON.parse(fixture.specifications) : fixture.specifications) : {
        material: "",
        color: "",
        style: "",
        installation: "",
      },
      dimensions: fixture.dimensions ? (typeof fixture.dimensions === 'string' ? JSON.parse(fixture.dimensions) : fixture.dimensions) : {
        length: "",
        width: "",
        height: "",
      },
      weight: fixture.weight || "",
      shippingClass: fixture.shippingClass || "standard",
      minOrderQuantity: fixture.minOrderQuantity?.toString() || "1",
      maxOrderQuantity: fixture.maxOrderQuantity?.toString() || "",
      leadTime: fixture.leadTime?.toString() || "",
      isEcommerceEnabled: fixture.isEcommerceEnabled || false,
      displayOnline: fixture.displayOnline || false,
    });
    setIsCreateModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingFixture) {
      updateFixtureMutation.mutate({
        id: editingFixture.id,
        ...formData,
      });
    } else {
      createFixtureMutation.mutate(formData);
    }
  };

  const handleViewFixture = (fixture: any) => {
    setViewingFixture(fixture);
    setIsViewModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Counter Fixtures" subtitle="Manage counter fixtures with e-commerce capabilities" hideNewQuoteButton={true} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Loading counter fixtures...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Counter Fixtures" 
        subtitle="Manage counter fixtures with e-commerce capabilities"
        onSearch={setSearchQuery}
        hideNewQuoteButton={true}
      />
      
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Fixtures</p>
                  <p className="text-2xl font-bold">{fixtures?.length || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Online Products</p>
                  <p className="text-2xl font-bold">
                    {fixtures?.filter((f: any) => f.displayOnline).length || 0}
                  </p>
                </div>
                <Globe className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Stock</p>
                  <p className="text-2xl font-bold">
                    {fixtures?.filter((f: any) => f.stockQuantity < 5).length || 0}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Price</p>
                  <p className="text-2xl font-bold">
                    ${fixtures?.length > 0 ? 
                      (fixtures.reduce((sum: number, f: any) => sum + parseFloat(f.ecommercePrice || f.price || 0), 0) / fixtures.length).toFixed(0) 
                      : 0}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Counter Fixtures Inventory</CardTitle>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateModal} className="bg-primary hover:bg-primary-dark">
                  <Plus size={16} className="mr-2" />
                  Add Counter Fixture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingFixture ? "Edit Counter Fixture" : "Add Counter Fixture"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier">Supplier *</Label>
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="grade">Grade</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="economy">Economy</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="finish">Finish</Label>
                      <Input
                        id="finish"
                        value={formData.finish}
                        onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Wholesale Price *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ecommercePrice">Online Price</Label>
                      <Input
                        id="ecommercePrice"
                        type="number"
                        step="0.01"
                        value={formData.ecommercePrice}
                        onChange={(e) => setFormData({ ...formData, ecommercePrice: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="each">Each</SelectItem>
                          <SelectItem value="set">Set</SelectItem>
                          <SelectItem value="pair">Pair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Storage Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* E-commerce Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">E-commerce Settings</h3>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="isEcommerceEnabled"
                          checked={formData.isEcommerceEnabled}
                          onCheckedChange={(checked) => setFormData({ ...formData, isEcommerceEnabled: checked as boolean })}
                        />
                        <Label htmlFor="isEcommerceEnabled">Enable E-commerce</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="displayOnline"
                          checked={formData.displayOnline}
                          onCheckedChange={(checked) => setFormData({ ...formData, displayOnline: checked as boolean })}
                        />
                        <Label htmlFor="displayOnline">Display Online</Label>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="ecommerceDescription">Product Description</Label>
                      <Textarea
                        id="ecommerceDescription"
                        value={formData.ecommerceDescription}
                        onChange={(e) => setFormData({ ...formData, ecommerceDescription: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Specifications */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="material">Material</Label>
                        <Input
                          id="material"
                          value={formData.specifications.material}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            specifications: { ...formData.specifications, material: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Input
                          id="color"
                          value={formData.specifications.color}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            specifications: { ...formData.specifications, color: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="style">Style</Label>
                        <Input
                          id="style"
                          value={formData.specifications.style}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            specifications: { ...formData.specifications, style: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="installation">Installation</Label>
                        <Input
                          id="installation"
                          value={formData.specifications.installation}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            specifications: { ...formData.specifications, installation: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dimensions and Shipping */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Dimensions & Shipping</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="length">Length (inches)</Label>
                        <Input
                          id="length"
                          type="number"
                          step="0.1"
                          value={formData.dimensions.length}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            dimensions: { ...formData.dimensions, length: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="width">Width (inches)</Label>
                        <Input
                          id="width"
                          type="number"
                          step="0.1"
                          value={formData.dimensions.width}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            dimensions: { ...formData.dimensions, width: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="height">Height (inches)</Label>
                        <Input
                          id="height"
                          type="number"
                          step="0.1"
                          value={formData.dimensions.height}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            dimensions: { ...formData.dimensions, height: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="weight">Weight (lbs)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="shippingClass">Shipping Class</Label>
                        <Select value={formData.shippingClass} onValueChange={(value) => setFormData({ ...formData, shippingClass: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="oversized">Oversized</SelectItem>
                            <SelectItem value="freight">Freight</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="minOrderQuantity">Min Order Qty</Label>
                        <Input
                          id="minOrderQuantity"
                          type="number"
                          value={formData.minOrderQuantity}
                          onChange={(e) => setFormData({ ...formData, minOrderQuantity: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="leadTime">Lead Time (days)</Label>
                        <Input
                          id="leadTime"
                          type="number"
                          value={formData.leadTime}
                          onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCloseCreateModal}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createFixtureMutation.isPending || updateFixtureMutation.isPending}
                    >
                      {editingFixture ? "Update Fixture" : "Create Fixture"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            {fixtures?.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No counter fixtures found</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first counter fixture.</p>
                <Button onClick={handleOpenCreateModal}>
                  <Plus size={16} className="mr-2" />
                  Add Counter Fixture
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Online Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixtures?.map((fixture: any) => (
                    <TableRow key={fixture.id}>
                      <TableCell className="font-medium">{fixture.name}</TableCell>
                      <TableCell>{fixture.supplier}</TableCell>
                      <TableCell>
                        <Badge variant={fixture.grade === 'premium' ? 'default' : 'secondary'}>
                          {fixture.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>${parseFloat(fixture.price || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {fixture.ecommercePrice ? `$${parseFloat(fixture.ecommercePrice).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={fixture.stockQuantity < 5 ? 'destructive' : 'outline'}>
                          {fixture.stockQuantity} {fixture.unit}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {fixture.isEcommerceEnabled && (
                            <Badge variant="outline" className="text-blue-600">
                              <ShoppingCart size={12} className="mr-1" />
                              E-com
                            </Badge>
                          )}
                          {fixture.displayOnline && (
                            <Badge variant="outline" className="text-green-600">
                              <Globe size={12} className="mr-1" />
                              Online
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewFixture(fixture)}>
                            <Eye size={16} />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditFixture(fixture)}>
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteFixtureMutation.mutate(fixture.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Fixture Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingFixture?.name}</DialogTitle>
          </DialogHeader>
          {viewingFixture && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Basic Information</h3>
                  <p><strong>Supplier:</strong> {viewingFixture.supplier}</p>
                  <p><strong>Grade:</strong> {viewingFixture.grade}</p>
                  <p><strong>Finish:</strong> {viewingFixture.finish}</p>
                  <p><strong>Unit:</strong> {viewingFixture.unit}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Pricing & Inventory</h3>
                  <p><strong>Wholesale Price:</strong> ${parseFloat(viewingFixture.price || 0).toFixed(2)}</p>
                  {viewingFixture.ecommercePrice && (
                    <p><strong>Online Price:</strong> ${parseFloat(viewingFixture.ecommercePrice).toFixed(2)}</p>
                  )}
                  <p><strong>Stock:</strong> {viewingFixture.stockQuantity} {viewingFixture.unit}</p>
                  <p><strong>Location:</strong> {viewingFixture.location || 'Not specified'}</p>
                </div>
              </div>
              
              {viewingFixture.ecommerceDescription && (
                <div>
                  <h3 className="font-semibold">Description</h3>
                  <p className="text-gray-600">{viewingFixture.ecommerceDescription}</p>
                </div>
              )}
              
              {viewingFixture.specifications && (
                <div>
                  <h3 className="font-semibold">Specifications</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(typeof viewingFixture.specifications === 'string' ? 
                      JSON.parse(viewingFixture.specifications) : viewingFixture.specifications
                    ).map(([key, value]: [string, any]) => (
                      value && <p key={key}><strong>{key}:</strong> {value}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                {viewingFixture.isEcommerceEnabled && (
                  <Badge className="bg-blue-100 text-blue-800">E-commerce Enabled</Badge>
                )}
                {viewingFixture.displayOnline && (
                  <Badge className="bg-green-100 text-green-800">Online Display</Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}