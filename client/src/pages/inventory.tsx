import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { productsApi } from "@/lib/api";
import { Plus, Edit, Trash2, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const calculateTotalSquareFeet = (product: any) => {
    if (product.slabLength && product.slabWidth && product.stockQuantity) {
      const lengthInches = parseFloat(product.slabLength);
      const widthInches = parseFloat(product.slabWidth);
      const quantity = parseFloat(product.stockQuantity);
      // Convert inches to feet and calculate square footage
      const lengthFeet = lengthInches / 12;
      const widthFeet = widthInches / 12;
      return (lengthFeet * widthFeet * quantity).toFixed(1);
    }
    return "N/A";
  };
  const [formData, setFormData] = useState({
    name: "",
    supplier: "",
    category: "",
    grade: "",
    thickness: "",
    price: "",
    unit: "sqft",
    stockQuantity: "",
    slabLength: "",
    slabWidth: "",
    location: "",
    imageUrl: "",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: productsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-products'] });
      toast({
        title: "Success",
        description: "Bundle created successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => productsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-products'] });
      toast({
        title: "Success",
        description: "Bundle updated successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/top-products'] });
      toast({
        title: "Success",
        description: "Bundle deleted successfully",
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
    setEditingProduct(null);
    setFormData({
      name: "",
      supplier: "",
      category: "",
      grade: "",
      thickness: "",
      price: "",
      unit: "sqft",
      stockQuantity: "",
      slabLength: "",
      slabWidth: "",
      location: "",
      imageUrl: "",
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      supplier: product.supplier || "",
      category: product.category || "",
      grade: product.grade || "",
      thickness: product.thickness || "",
      price: product.price || "",
      unit: product.unit || "sqft",
      stockQuantity: product.stockQuantity?.toString() || "",
      slabLength: product.slabLength || "",
      slabWidth: product.slabWidth || "",
      location: product.location || "",
      imageUrl: product.imageUrl || "",
    });
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionData = {
      ...formData,
      price: formData.price,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      slabLength: formData.slabLength || null,
      slabWidth: formData.slabWidth || null,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: submissionData });
    } else {
      createMutation.mutate(submissionData);
    }
  };

  const handleDelete = (productId: number) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(productId);
    }
  };

  const filteredProducts = Array.isArray(products) ? products.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) : [];

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800" };
    if (stock <= 10) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" };
    return { label: "In Stock", color: "bg-green-100 text-green-800" };
  };

  const getProductImage = (category: string, imageUrl?: string) => {
    if (imageUrl) return imageUrl;
    
    const images = {
      marble: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=100&h=100&fit=crop",
      granite: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=100&h=100&fit=crop",
      travertine: "https://images.unsplash.com/photo-1615971677499-5467cbab01dc?w=100&h=100&fit=crop",
      quartz: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop",
    };
    return images[category as keyof typeof images] || images.marble;
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar 
        title="Inventory" 
        subtitle="Manage your natural stone products and stock levels"
        onSearch={setSearchQuery}
      />
      
      <div className="flex-1 overflow-y-auto p-6 bg-neutral-50-custom">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Bundle Inventory</CardTitle>
              <div className="flex space-x-4 mt-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="marble">Marble</SelectItem>
                    <SelectItem value="granite">Granite</SelectItem>
                    <SelectItem value="quartz">Quartz</SelectItem>
                    <SelectItem value="travertine">Travertine</SelectItem>
                    <SelectItem value="porcelain">Porcelain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateModal} className="bg-primary hover:bg-primary-dark">
                  <Plus size={16} className="mr-2" />
                  Add Bundle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Edit Bundle" : "Add New Bundle"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct ? "Update bundle information and inventory details." : "Create a new stone slab bundle with supplier and inventory information."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Bundle Name *</Label>
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
                        placeholder="Enter supplier/quarry name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="marble">Marble</SelectItem>
                          <SelectItem value="granite">Granite</SelectItem>
                          <SelectItem value="quartz">Quartz</SelectItem>
                          <SelectItem value="travertine">Travertine</SelectItem>
                          <SelectItem value="porcelain">Porcelain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="grade">Grade *</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="economy">Economy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="thickness">Thickness *</Label>
                      <Select value={formData.thickness} onValueChange={(value) => setFormData({ ...formData, thickness: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select thickness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2cm">2cm</SelectItem>
                          <SelectItem value="3cm">3cm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="price">Price per Unit *</Label>
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
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sqft">Square Foot</SelectItem>
                          <SelectItem value="slab">Slab</SelectItem>
                          <SelectItem value="piece">Piece</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stockQuantity">Stock Quantity (Slabs)</Label>
                      <Input
                        id="stockQuantity"
                        type="number"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="slabLength">Slab Length (inches)</Label>
                      <Input
                        id="slabLength"
                        type="number"
                        step="0.25"
                        value={formData.slabLength}
                        onChange={(e) => setFormData({ ...formData, slabLength: e.target.value })}
                        placeholder="126"
                      />
                    </div>
                    <div>
                      <Label htmlFor="slabWidth">Slab Width (inches)</Label>
                      <Input
                        id="slabWidth"
                        type="number"
                        step="0.25"
                        value={formData.slabWidth}
                        onChange={(e) => setFormData({ ...formData, slabWidth: e.target.value })}
                        placeholder="66"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor="image">Product Image</Label>
                      <ImageUpload
                        value={formData.imageUrl}
                        onChange={(value) => setFormData({ ...formData, imageUrl: value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Storage Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. Warehouse A, Section 3"
                    />
                  </div>
                  <div className="flex space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCloseModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingProduct ? "Update Bundle" : "Create Bundle"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading bundles...</div>
            ) : !filteredProducts || filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bundles found</h3>
                <p className="text-gray-500">
                  {searchQuery || categoryFilter !== "all" 
                    ? "Try adjusting your search or filter criteria." 
                    : "Get started by adding your first bundle."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bundle ID</TableHead>
                    <TableHead>Bundle Name</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Grade & Thickness</TableHead>
                    <TableHead>Price ($/sqft)</TableHead>
                    <TableHead>Stock (Slabs)</TableHead>
                    <TableHead>Total Sqft</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: any) => {
                    const stockStatus = getStockStatus(product.stockQuantity);
                    
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {product.bundleId || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <img 
                              src={getProductImage(product.category, product.imageUrl)}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-primary-custom">{product.name}</p>
                              {product.barcodes && product.barcodes.length > 0 && (
                                <p className="text-xs text-secondary-custom">
                                  {product.barcodes.length} barcode{product.barcodes.length !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {product.supplier || 'Unknown'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="capitalize font-medium">{product.grade} Grade</p>
                            <p className="text-secondary-custom">{product.thickness}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            ${parseFloat(product.price).toFixed(0)}/{product.unit}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div>
                              <span className="font-medium">{product.stockQuantity}</span>
                              {product.slabLength && product.slabWidth && (
                                <p className="text-xs text-secondary-custom">
                                  {product.slabLength}" × {product.slabWidth}"
                                </p>
                              )}
                            </div>
                            {product.stockQuantity <= 10 && product.stockQuantity > 0 && (
                              <AlertTriangle size={16} className="text-warning-orange" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {calculateTotalSquareFeet(product)} sqft
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${stockStatus.color} border-0`}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(product)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(product.id)}
                              className="text-error-red hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
