import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, MapPin, Filter, Edit2, Trash2, XCircle, Plus, Pencil, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { ImageUpload } from "@/components/ui/image-upload";

interface Slab {
  id: number;
  bundleId: string;
  slabNumber: string;
  length: number | null;
  width: number | null;
  status: string;
  location: string | null;
  notes: string | null;
  barcode: string | null;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  description: string | null;
  supplier: string;
  category: string;
  grade: string;
  thickness: string;
  finish: string;
  price: string;
  unit: string;
  stockQuantity: number;
  slabLength: string | null;
  slabWidth: string | null;
  location: string | null;
  imageUrl: string | null;
  bundleId: string | null;
  barcodes: string[] | null;
  createdAt: string;
}

const statusColors = {
  available: "bg-green-100 text-green-800 border-green-200",
  sold: "bg-red-100 text-red-800 border-red-200",
  reserved: "bg-yellow-100 text-yellow-800 border-yellow-200",
  delivered: "bg-blue-100 text-blue-800 border-blue-200",
  damaged: "bg-gray-100 text-gray-800 border-gray-200",
};

const CATEGORIES = [
  "Granite",
  "Marble", 
  "Quartz",
  "Quartzite",
  "Travertine",
  "Limestone",
  "Sandstone",
  "Slate",
  "Onyx",
  "Other"
];

const GRADES = ["Premium", "Standard", "Commercial", "Builder"];
const FINISH_OPTIONS = ["Polished", "Honed", "Leathered", "Brushed", "Flamed"];
const UNITS = ["sq ft", "lin ft", "slab", "piece"];

export default function AllSlabs() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  
  // Bundle management state
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    bundleId: "",
    name: "",
    description: "",
    supplier: "",
    category: "",
    grade: "",
    thickness: "",
    finish: "",
    price: "",
    unit: "sq ft",
    stockQuantity: "",
    slabLength: "",
    slabWidth: "",
    location: "",
    imageUrl: "",
    seoTitle: "",
    seoDescription: "",
    seoUrl: "",
    metaKeywords: "",
    socialTitle: "",
    socialDescription: "",
    socialImage: ""
  });

  // Fetch all slabs across all products
  const { data: slabsData = [], isLoading, error } = useQuery({
    queryKey: ['/api/slabs/all'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/slabs/all');
      return Array.isArray(response) ? response : [];
    },
  });

  // Fetch products for bundles section
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products');
      return Array.isArray(response) ? response : [];
    },
  });

  // Ensure slabs is always an array
  const slabs = Array.isArray(slabsData) ? slabsData as Slab[] : [];

  const deleteSlabMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/slabs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/slabs/all'] });
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

  // Bundle mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/products', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Bundle created successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bundle",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Bundle updated successfully",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bundle",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Bundle deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bundle",
        variant: "destructive",
      });
    },
  });

  const handleDeleteSlab = (id: number, slabNumber: string) => {
    if (confirm(`Are you sure you want to delete slab #${slabNumber}?`)) {
      deleteSlabMutation.mutate(id);
    }
  };

  // Bundle handlers
  const handleSubmit = () => {
    const productData = {
      bundleId: formData.bundleId,
      name: formData.name,
      description: formData.description,
      supplier: formData.supplier,
      category: formData.category,
      grade: formData.grade,
      thickness: formData.thickness,
      finish: formData.finish,
      price: formData.price,
      unit: formData.unit,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      slabLength: formData.slabLength || null,
      slabWidth: formData.slabWidth || null,
      location: formData.location || null,
      imageUrl: formData.imageUrl || null,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setEditingProduct(null);
    setFormData({
      bundleId: "",
      name: "",
      description: "",
      supplier: "",
      category: "",
      grade: "",
      thickness: "",
      finish: "",
      price: "",
      unit: "sq ft",
      stockQuantity: "",
      slabLength: "",
      slabWidth: "",
      location: "",
      imageUrl: "",
      seoTitle: "",
      seoDescription: "",
      seoUrl: "",
      metaKeywords: "",
      socialTitle: "",
      socialDescription: "",
      socialImage: ""
    });
  };

  // Filter slabs based on search and filters
  const filteredSlabs = slabs.filter((slab: Slab) => {
    const matchesSearch = !searchTerm || 
      slab.slabNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slab.bundleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (slab.barcode && slab.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (slab.location && slab.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || slab.status?.toLowerCase() === statusFilter;
    const matchesLocation = locationFilter === "all" || slab.location === locationFilter;
    
    return matchesSearch && matchesStatus && matchesLocation;
  });

  // Get unique locations for filter
  const uniqueLocations = Array.from(new Set(slabs.map((slab: Slab) => slab.location).filter(Boolean))) as string[];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-lg font-medium">Loading all slabs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Failed to load slabs</p>
          <p className="text-sm text-muted-foreground mb-4">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Slabs</h1>
        <p className="text-muted-foreground">
          View and manage all slabs across all products
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {slabs.filter((s: Slab) => s.status?.toLowerCase() === 'available').length}
            </div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {slabs.filter((s: Slab) => s.status?.toLowerCase() === 'sold').length}
            </div>
            <p className="text-sm text-muted-foreground">Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {slabs.filter((s: Slab) => s.status?.toLowerCase() === 'reserved').length}
            </div>
            <p className="text-sm text-muted-foreground">Reserved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {slabs.length}
            </div>
            <p className="text-sm text-muted-foreground">Total Slabs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by slab number, bundle ID, barcode, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[150px]">
                <MapPin className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location || ""}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          Showing {filteredSlabs.length} of {slabs.length} slabs
        </p>
      </div>

      {/* Slabs Grid */}
      {filteredSlabs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {slabs.length === 0 ? "No slabs found" : "No slabs match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {slabs.length === 0 
                ? "Import slabs using the CSV bulk import tool" 
                : "Try adjusting your search or filter criteria"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSlabs.map((slab: Slab) => {
            const statusColor = statusColors[slab.status?.toLowerCase() as keyof typeof statusColors] || statusColors.available;
            
            return (
              <Card key={slab.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">#{slab.slabNumber}</CardTitle>
                    <Badge className={statusColor}>
                      {slab.status || 'Available'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Bundle: {slab.bundleId}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {slab.length && slab.width && (
                    <div className="text-sm">
                      <p className="font-medium">Dimensions</p>
                      <p className="text-muted-foreground">
                        {slab.length}" × {slab.width}" 
                        <span className="ml-1 text-primary">
                          ({((slab.length * slab.width) / 144).toFixed(1)} sq ft)
                        </span>
                      </p>
                    </div>
                  )}
                  
                  {slab.location && (
                    <div className="text-sm">
                      <p className="font-medium flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        Location
                      </p>
                      <p className="text-muted-foreground">{slab.location}</p>
                    </div>
                  )}
                  
                  {slab.barcode && (
                    <div className="text-sm">
                      <p className="font-medium">Barcode</p>
                      <p className="text-muted-foreground font-mono text-xs">{slab.barcode}</p>
                    </div>
                  )}
                  
                  {slab.notes && (
                    <div className="text-sm">
                      <p className="font-medium">Notes</p>
                      <p className="text-muted-foreground">{slab.notes}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteSlab(slab.id, slab.slabNumber)}
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

      {/* Materials Section */}
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Materials</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
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
                    {editingProduct ? "Update bundle information" : "Create a new stone slab bundle"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bundleId">Bundle ID</Label>
                      <Input
                        id="bundleId"
                        value={formData.bundleId}
                        onChange={(e) => setFormData({...formData, bundleId: e.target.value})}
                        placeholder="e.g., GT-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., Black Galaxy Granite"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Bundle description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="supplier">Supplier</Label>
                      <Input
                        id="supplier"
                        value={formData.supplier}
                        onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                        placeholder="e.g., Stone Inc."
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="grade">Grade</Label>
                      <Select value={formData.grade} onValueChange={(value) => setFormData({...formData, grade: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADES.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="thickness">Thickness</Label>
                      <Input
                        id="thickness"
                        value={formData.thickness}
                        onChange={(e) => setFormData({...formData, thickness: e.target.value})}
                        placeholder="e.g., 3cm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="finish">Finish</Label>
                      <Select value={formData.finish} onValueChange={(value) => setFormData({...formData, finish: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select finish" />
                        </SelectTrigger>
                        <SelectContent>
                          {FINISH_OPTIONS.map((finish) => (
                            <SelectItem key={finish} value={finish}>
                              {finish}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        placeholder="e.g., 45.99"
                      />
                    </div>
                    <div>
                      <Label htmlFor="unit">Unit</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stockQuantity">Stock Quantity</Label>
                      <Input
                        id="stockQuantity"
                        value={formData.stockQuantity}
                        onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
                        placeholder="e.g., 50"
                        type="number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="slabLength">Slab Length</Label>
                      <Input
                        id="slabLength"
                        value={formData.slabLength}
                        onChange={(e) => setFormData({...formData, slabLength: e.target.value})}
                        placeholder="e.g., 120"
                      />
                    </div>
                    <div>
                      <Label htmlFor="slabWidth">Slab Width</Label>
                      <Input
                        id="slabWidth"
                        value={formData.slabWidth}
                        onChange={(e) => setFormData({...formData, slabWidth: e.target.value})}
                        placeholder="e.g., 60"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g., Warehouse A, Section 3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="imageUrl">Image</Label>
                    <ImageUpload
                      value={formData.imageUrl}
                      onChange={(url) => setFormData({...formData, imageUrl: url})}
                      className="w-full"
                      uploadEndpoint="/api/products/upload-image"
                      uploadFieldName="productImage"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleCloseModal}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingProduct ? "Update" : "Create"} Bundle
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bundle ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(products) && products.map((product: Product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Badge variant="outline">{product.bundleId}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.supplier}</TableCell>
                  <TableCell>{product.grade}</TableCell>
                  <TableCell>
                    <Badge variant="default">
                      Available
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.slabLength && product.slabWidth 
                      ? `${((parseInt(product.slabLength) * parseInt(product.slabWidth)) / 144).toFixed(1)} sq ft`
                      : `${product.stockQuantity} ${product.unit}`
                    }
                  </TableCell>
                  <TableCell>{product.location || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            bundleId: product.bundleId || "",
                            name: product.name,
                            description: product.description || "",
                            supplier: product.supplier,
                            category: product.category,
                            grade: product.grade,
                            thickness: product.thickness,
                            finish: product.finish,
                            price: product.price,
                            unit: product.unit,
                            stockQuantity: product.stockQuantity.toString(),
                            slabLength: product.slabLength || "",
                            slabWidth: product.slabWidth || "",
                            location: product.location || "",
                            imageUrl: product.imageUrl || "",
                            seoTitle: "",
                            seoDescription: "",
                            seoUrl: "",
                            metaKeywords: "",
                            socialTitle: "",
                            socialDescription: "",
                            socialImage: ""
                          });
                          setIsOpen(true);
                        }}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/slab-management/${product.id}`)}
                      >
                        <Settings size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this bundle?")) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}