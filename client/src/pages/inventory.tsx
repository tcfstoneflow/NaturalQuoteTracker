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
  bundleId: string;
  name: string;
  description?: string;
  supplier?: string;
  category?: string;
  grade?: string;
  thickness?: number;
  finish?: string;
  price?: number;
  unit?: string;
  stockQuantity?: number;
  slabLength?: number;
  slabWidth?: number;
  location?: string;
  imageUrl?: string;
  barcodes?: string[];
}

const CATEGORY_OPTIONS = [
  "Granite", "Marble", "Quartz", "Quartzite", "Limestone", "Travertine", "Onyx", "Slate", "Other"
];

const GRADE_OPTIONS = ["A", "B", "C", "Commercial", "Premium"];
const FINISH_OPTIONS = ["Polished", "Honed", "Brushed", "Flamed", "Bush Hammered", "Antiqued"];
const UNIT_OPTIONS = ["sq ft", "sq m", "slab", "piece"];

export default function Inventory() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  // State management
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortField, setSortField] = useState<keyof Product>("bundleId");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form state for add/edit
  const [formData, setFormData] = useState<Partial<Product>>({
    bundleId: "",
    name: "",
    description: "",
    supplier: "",
    category: "",
    grade: "",
    thickness: undefined,
    finish: "",
    price: undefined,
    unit: "sq ft",
    stockQuantity: undefined,
    slabLength: undefined,
    slabWidth: undefined,
    location: "",
    imageUrl: "",
    barcodes: []
  });

  // Fetch products
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Add product mutation
  const addMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Product added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Product> }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsEditDialogOpen(false);
      setSelectedProduct(null);
      resetForm();
      toast({ title: "Success", description: "Product updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // CSV Export
  const handleExport = () => {
    if (!products.length) {
      toast({ title: "No Data", description: "No products to export" });
      return;
    }

    const headers = [
      "id", "bundleId", "name", "description", "supplier", "category",
      "grade", "thickness", "finish", "price", "unit", "stockQuantity",
      "slabLength", "slabWidth", "location", "imageUrl", "barcodes"
    ];

    const csvData = products.map(product => [
      product.id,
      product.bundleId,
      product.name,
      product.description || "",
      product.supplier || "",
      product.category || "",
      product.grade || "",
      product.thickness || "",
      product.finish || "",
      product.price || "",
      product.unit || "",
      product.stockQuantity || "",
      product.slabLength || "",
      product.slabWidth || "",
      product.location || "",
      product.imageUrl || "",
      (product.barcodes || []).join(";")
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_bundles_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: "CSV file downloaded successfully" });
  };

  // CSV Import
  const handleCsvFile = async (file: File, clearInput: () => void) => {
    try {
      toast({ title: "Importing…", description: "Processing your CSV file." });

      const csvText = await file.text();

      // Parse CSV with Papa
      const { data: rows, errors } = Papa.parse<Record<string, any>>(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim().replace(/"/g, ""),
        dynamicTyping: true
      });

      if (errors.length) {
        throw new Error(`CSV parse error: ${errors[0].message}`);
      }
      if (!rows.length) throw new Error("CSV contained no data rows");

      // Validate headers match expected
      const expectedHeaders = [
        "id", "bundleId", "name", "description", "supplier", "category",
        "grade", "thickness", "finish", "price", "unit", "stockQuantity",
        "slabLength", "slabWidth", "location", "imageUrl", "barcodes"
      ];
      const headers = Object.keys(rows[0]);
      if (headers.length !== expectedHeaders.length ||
          !expectedHeaders.every((h, i) => h === headers[i])) {
        throw new Error("CSV header mismatch – please export, edit, and re-import.");
      }

      let success = 0, fail = 0;

      for (const row of rows) {
        if (!row.id) { fail++; continue; }

        // Sanitise numeric fields
        ["price", "stockQuantity", "slabLength", "slabWidth"].forEach(f => {
          if (row[f] === "") row[f] = null;
        });

        try {
          const res = await fetch(`/api/products/${row.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(row)
          });

          if (res.ok) success++; else fail++;
        } catch {
          fail++;
        }

        // tiny pause to avoid server flood
        await new Promise(r => setTimeout(r, 60));
      }

      toast({
        title: "Import complete",
        description: `Updated ${success} bundle${success !== 1 ? "s" : ""}${fail ? `, ${fail} failed` : ""}.`
      });

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsBulkOpen(false);
    } catch (err: any) {
      toast({
        title: "Import error",
        description: err.message ?? "Failed to import CSV.",
        variant: "destructive"
      });
    } finally {
      clearInput();
    }
  };

  // Helper functions
  const resetForm = () => {
    setFormData({
      bundleId: "",
      name: "",
      description: "",
      supplier: "",
      category: "",
      grade: "",
      thickness: undefined,
      finish: "",
      price: undefined,
      unit: "sq ft",
      stockQuantity: undefined,
      slabLength: undefined,
      slabWidth: undefined,
      location: "",
      imageUrl: "",
      barcodes: []
    });
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData(product);
    setIsEditDialogOpen(true);
  };

  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.bundleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === "all" || product.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

  const SortIcon = ({ field }: { field: keyof Product }) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Inventory Management" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsBulkOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </Button>
            
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORY_OPTIONS.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
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
            <CardTitle className="flex items-center justify-between">
              <span>Products ({filteredAndSortedProducts.length})</span>
              {isLoading && <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("bundleId")}>
                      <div className="flex items-center gap-2">
                        Bundle ID <SortIcon field="bundleId" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-2">
                        Name <SortIcon field="name" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                      <div className="flex items-center gap-2">
                        Category <SortIcon field="category" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("price")}>
                      <div className="flex items-center gap-2">
                        Price <SortIcon field="price" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort("stockQuantity")}>
                      <div className="flex items-center gap-2">
                        Stock <SortIcon field="stockQuantity" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.bundleId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.category && (
                          <Badge variant="outline">{product.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.price && typeof product.price === 'number' && (
                          <span className="font-medium">
                            ${product.price.toFixed(2)} {product.unit && `/${product.unit}`}
                          </span>
                        )}
                        {product.price && typeof product.price === 'string' && (
                          <span className="font-medium">
                            ${parseFloat(product.price).toFixed(2)} {product.unit && `/${product.unit}`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.stockQuantity !== undefined && (
                          <Badge variant={product.stockQuantity > 0 ? "default" : "destructive"}>
                            {product.stockQuantity}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredAndSortedProducts.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
                  <p className="text-gray-500">
                    {searchTerm || filterCategory !== "all" 
                      ? "Try adjusting your search or filters"
                      : "Get started by adding your first product"
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Import Dialog */}
        <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Import Products</DialogTitle>
              <DialogDescription>
                Import products from a CSV file. Make sure to use the exact format from our export feature.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Import Instructions:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• First export your current data to get the correct CSV format</li>
                  <li>• Make your changes in the exported file</li>
                  <li>• Import the modified file back here</li>
                  <li>• File must be named: inventory_bundles_YYYY-MM-DD.csv</li>
                </ul>
              </div>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Click to upload CSV file
                  </div>
                  <div className="text-sm text-gray-500">
                    Supports files up to 10MB
                  </div>
                </Label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const expectedPattern = /^inventory_bundles_\d{4}-\d{2}-\d{2}\.csv$/;
                    if (!expectedPattern.test(file.name)) {
                      toast({
                        title: "Invalid file",
                        description: "Please import a CSV exported from this system.",
                        variant: "destructive"
                      });
                      e.target.value = "";
                      return;
                    }
                    handleCsvFile(file, () => { e.target.value = ""; });
                  }}
                  className="hidden"
                  id="csv-upload"
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Product Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bundleId">Bundle ID *</Label>
                <Input
                  id="bundleId"
                  value={formData.bundleId || ""}
                  onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
                  placeholder="e.g., BDL-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier || ""}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={formData.stockQuantity || ""}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addMutation.mutate(formData)}
                disabled={!formData.bundleId || !formData.name || addMutation.isPending}
              >
                {addMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-bundleId">Bundle ID *</Label>
                <Input
                  id="edit-bundleId"
                  value={formData.bundleId || ""}
                  onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
                  placeholder="e.g., BDL-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Product name"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Input
                  id="edit-supplier"
                  value={formData.supplier || ""}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-stockQuantity">Stock Quantity</Label>
                <Input
                  id="edit-stockQuantity"
                  type="number"
                  value={formData.stockQuantity || ""}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || undefined })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedProduct && updateMutation.mutate({ id: selectedProduct.id, data: formData })}
                disabled={!formData.bundleId || !formData.name || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}