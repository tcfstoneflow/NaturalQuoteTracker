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
import { Plus, Package, Pencil, Trash2, Search, Filter, ExternalLink, Settings, X, Upload, Sparkles, Palette, ArrowUpDown, ArrowUp, ArrowDown, Wand2, Copy, Download } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import TopBar from "@/components/layout/topbar";
import { ImageUpload } from "@/components/ui/image-upload";
import Papa from "papaparse";

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
  leadTime: number | null;
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
const FINISH_OPTIONS = ["Polished", "Leather", "Brushed", "Matte"];
const UNITS = ["sq ft", "linear ft", "slab"];

export default function Inventory() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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
    imageUrl: ""
  });

  // Fetch products
  const { data: products = [], isLoading, refetch } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch tags
  const { data: tags = [] } = useQuery({
    queryKey: ["/api/public/tags"],
  });

  // Create/Update product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsOpen(false);
      setEditingProduct(null);
      resetForm();
      toast({
        title: "Success",
        description: editingProduct ? "Product updated successfully" : "Product created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // CSV Import function
  const handleCsvFile = async (file: File, clearInput: () => void) => {
    try {
      toast({ title: "Importing...", description: "Processing your CSV file." });

      const csvText = await file.text();

      // Parse CSV with Papa
      const { data: rows, errors } = Papa.parse<Record<string, any>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().replace(/"/g, ""),
        dynamicTyping: true
      });

      if (errors.length) {
        throw new Error(`CSV parse error: ${errors[0].message}`);
      }
      if (!rows.length) throw new Error("CSV contained no data rows");

      // Validate headers
      const expectedHeaders = [
        "id", "bundleId", "name", "description", "supplier", "category",
        "grade", "thickness", "finish", "price", "unit", "stockQuantity",
        "slabLength", "slabWidth", "location", "imageUrl", "leadTime"
      ];

      const csvHeaders = Object.keys(rows[0]);
      const missingHeaders = expectedHeaders.filter(h => !csvHeaders.includes(h));
      
      if (missingHeaders.length) {
        throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
      }

      // Send to backend
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await fetch("/api/admin/bulk-import", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import CSV");
      }

      const result = await response.json();
      
      toast({
        title: "Import Complete",
        description: `Imported ${result.imported} products, ${result.failed} failed`
      });

      clearInput();
      refetch();
      setIsBulkOpen(false);

    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
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
      imageUrl: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      leadTime: null
    };

    createProductMutation.mutate(productData);
  };

  const handleEdit = (product: Product) => {
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
      imageUrl: product.imageUrl || ""
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteProductMutation.mutate(id);
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesGrade = gradeFilter === "all" || product.grade === gradeFilter;
      const matchesSupplier = supplierFilter === "all" || product.supplier === supplierFilter;
      
      const matchesStock = stockFilter === "all" || 
                          (stockFilter === "in-stock" && product.stockQuantity > 0) ||
                          (stockFilter === "low-stock" && product.stockQuantity > 0 && product.stockQuantity <= 10) ||
                          (stockFilter === "out-of-stock" && product.stockQuantity === 0);

      const price = parseFloat(product.price);
      const matchesPrice = priceRangeFilter === "all" ||
                          (priceRangeFilter === "under-50" && price < 50) ||
                          (priceRangeFilter === "50-100" && price >= 50 && price <= 100) ||
                          (priceRangeFilter === "over-100" && price > 100);

      return matchesSearch && matchesCategory && matchesGrade && matchesSupplier && matchesStock && matchesPrice;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof Product];
      let bValue: any = b[sortBy as keyof Product];
      
      if (sortBy === "price") {
        aValue = parseFloat(aValue);
        bValue = parseFloat(bValue);
      }
      
      if (sortBy === "stockQuantity") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Get unique suppliers for filter
  const uniqueSuppliers = [...new Set(products.map(p => p.supplier))];

  return (
    <div className="space-y-6">
      <TopBar />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Manage your stone products and inventory</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsBulkOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          
          <Button
            onClick={() => {
              resetForm();
              setEditingProduct(null);
              setIsOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {GRADES.map(grade => (
                    <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {uniqueSuppliers.map(supplier => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products ({filteredAndSortedProducts.length})
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="sort">Sort by:</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="stockQuantity">Stock</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              >
                {sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.bundleId && `Bundle: ${product.bundleId}`}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>${parseFloat(product.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.stockQuantity === 0 
                            ? 'bg-red-100 text-red-800' 
                            : product.stockQuantity <= 10 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {product.stockQuantity} {product.unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Product Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product information" : "Add a new product to your inventory"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bundleId">Bundle ID</Label>
                <Input
                  id="bundleId"
                  value={formData.bundleId}
                  onChange={(e) => setFormData({...formData, bundleId: e.target.value})}
                  placeholder="e.g., BR001"
                />
              </div>
              
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Carrara White Marble"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Product description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier *</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="Supplier name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade">Grade *</Label>
                <Select value={formData.grade} onValueChange={(value) => setFormData({...formData, grade: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map(grade => (
                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="finish">Finish *</Label>
                <Select value={formData.finish} onValueChange={(value) => setFormData({...formData, finish: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select finish" />
                  </SelectTrigger>
                  <SelectContent>
                    {FINISH_OPTIONS.map(finish => (
                      <SelectItem key={finish} value={finish}>{finish}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="unit">Unit *</Label>
                <Select value={formData.unit} onValueChange={(value) => setFormData({...formData, unit: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="thickness">Thickness</Label>
                <Input
                  id="thickness"
                  value={formData.thickness}
                  onChange={(e) => setFormData({...formData, thickness: e.target.value})}
                  placeholder="e.g., 2cm"
                />
              </div>
              
              <div>
                <Label htmlFor="slabLength">Slab Length</Label>
                <Input
                  id="slabLength"
                  value={formData.slabLength}
                  onChange={(e) => setFormData({...formData, slabLength: e.target.value})}
                  placeholder="e.g., 120cm"
                />
              </div>
              
              <div>
                <Label htmlFor="slabWidth">Slab Width</Label>
                <Input
                  id="slabWidth"
                  value={formData.slabWidth}
                  onChange={(e) => setFormData({...formData, slabWidth: e.target.value})}
                  placeholder="e.g., 60cm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Storage location"
              />
            </div>

            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={formData.imageUrl}
                onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                placeholder="Product image URL"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Import Products</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import multiple products at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>CSV File Format</Label>
              <p className="text-sm text-muted-foreground">
                Required columns: id, bundleId, name, description, supplier, category, grade, thickness, finish, price, unit, stockQuantity, slabLength, slabWidth, location, imageUrl, leadTime
              </p>
            </div>
            
            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleCsvFile(file, () => {
                      e.target.value = '';
                    });
                  }
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}