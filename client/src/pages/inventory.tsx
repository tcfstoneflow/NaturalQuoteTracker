import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Pencil, Trash2, Search, Filter, ExternalLink } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import TopBar from "@/components/layout/topbar";
import { ImageUpload } from "@/components/ui/image-upload";

interface Product {
  id: number;
  name: string;
  supplier: string;
  category: string;
  grade: string;
  thickness: string;
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

const GRADES = ["Premium", "Standard", "Commercial"];
const UNITS = ["sq ft", "linear ft", "slab"];

export default function Inventory() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    name: "",
    supplier: "",
    category: "",
    grade: "",
    thickness: "",
    price: "",
    unit: "sq ft",
    stockQuantity: "",
    slabLength: "",
    slabWidth: "",
    location: "",
    imageUrl: ""
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create bundle");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle created successfully" });
      handleCloseModal();
    },
    onError: () => {
      toast({ title: "Failed to create bundle", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/products/${editingProduct?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update bundle");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle updated successfully" });
      handleCloseModal();
    },
    onError: () => {
      toast({ title: "Failed to update bundle", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete bundle");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete bundle", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure all required fields are provided
    if (!formData.name || !formData.supplier || !formData.category || !formData.grade || !formData.thickness) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    
    const submitData = {
      name: formData.name.trim(),
      supplier: formData.supplier.trim(),
      category: formData.category,
      grade: formData.grade,
      thickness: formData.thickness.trim(),
      price: parseFloat(formData.price) || 0,
      unit: formData.unit || "sq ft",
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      slabLength: formData.slabLength ? parseFloat(formData.slabLength) : null,
      slabWidth: formData.slabWidth ? parseFloat(formData.slabWidth) : null,
      location: formData.location.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
    };

    if (editingProduct) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      supplier: product.supplier,
      category: product.category,
      grade: product.grade,
      thickness: product.thickness,
      price: product.price,
      unit: product.unit,
      stockQuantity: product.stockQuantity.toString(),
      slabLength: product.slabLength || "",
      slabWidth: product.slabWidth || "",
      location: product.location || "",
      imageUrl: product.imageUrl || ""
    });
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      supplier: "",
      category: "",
      grade: "",
      thickness: "",
      price: "",
      unit: "sq ft",
      stockQuantity: "",
      slabLength: "",
      slabWidth: "",
      location: "",
      imageUrl: ""
    });
  };

  const filteredProducts = products?.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.bundleId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      <TopBar 
        title="Inventory Management" 
        subtitle="Manage stone slab bundles and inventory tracking"
        onSearch={setSearchQuery}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bundles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex space-x-2">
          <Button asChild variant="outline">
            <Link href="/public-inventory">
              <ExternalLink size={16} className="mr-2" />
              View Public Inventory
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stone Slab Bundles</CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={16} className="mr-2" />
                Add Bundle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      required
                      placeholder="e.g. Stone Source LLC"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                  <div>
                    <Label htmlFor="grade">Grade</Label>
                    <Select value={formData.grade} onValueChange={(value) => setFormData({ ...formData, grade: value })}>
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
                      onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                      placeholder="e.g. 3cm, 2cm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price per {formData.unit} *</Label>
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
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="stockQuantity">Slab Count *</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      value={formData.stockQuantity}
                      onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                      required
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
                      placeholder="120"
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
                  <div className="md:col-span-2">
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
                  <TableHead>Image</TableHead>
                  <TableHead>Bundle ID</TableHead>
                  <TableHead>Bundle Name</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Thickness</TableHead>
                  <TableHead>Price/{" "}Unit</TableHead>
                  <TableHead>Slab Count</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product: Product) => {
                  const getProductImage = (category: string) => {
                    const images = {
                      marble: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=60&h=60&fit=crop",
                      granite: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=60&h=60&fit=crop",
                      travertine: "https://images.unsplash.com/photo-1615971677499-5467cbab01dc?w=60&h=60&fit=crop",
                      quartz: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=60&h=60&fit=crop",
                    };
                    return images[category as keyof typeof images] || images.marble;
                  };

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <img 
                          src={product.imageUrl || getProductImage(product.category.toLowerCase())}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover border"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getProductImage(product.category.toLowerCase());
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {product.bundleId || `B${product.id.toString().padStart(4, '0')}`}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell>{product.grade}</TableCell>
                      <TableCell>{product.thickness}</TableCell>
                      <TableCell>${product.price}/{product.unit}</TableCell>
                      <TableCell>
                        <span className={product.stockQuantity <= 5 ? "text-red-600 font-medium" : ""}>
                          {product.stockQuantity}
                        </span>
                      </TableCell>
                      <TableCell>{product.location || "Not specified"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteMutation.mutate(product.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={14} />
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
  );
}