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
import { Plus, Package, Pencil, Trash2, Search, Filter, ExternalLink, Settings } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import TopBar from "@/components/layout/topbar";
import { ImageUpload } from "@/components/ui/image-upload";

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
  wholesalePrice: string | null;
  unit: string;
  stockQuantity: number;
  slabLength: string | null;
  slabWidth: string | null;
  location: string | null;
  stage: string;
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

const STAGES = [
  "Active",
  "Hold",
  "Sold"
];

const GRADES = ["Premium", "Standard", "Commercial"];
const FINISH_OPTIONS = ["Polished", "Leather", "Brushed", "Matte"];
const UNITS = ["sq ft", "linear ft", "slab"];

export default function Inventory() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stoneNameFilter, setStoneNameFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [tagSearchQuery, setTagSearchQuery] = useState("");
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
    wholesalePrice: "",
    unit: "sq ft",
    stockQuantity: "",
    slabLength: "",
    slabWidth: "",
    location: "",
    stage: "Active",
    imageUrl: "",
    seoTitle: "",
    seoDescription: "",
    seoUrl: "",
    metaKeywords: "",
    socialTitle: "",
    socialDescription: "",
    socialImage: ""
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Filter products based on search and filters
  const filteredProducts = (products as Product[])?.filter((product) => {
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.bundleId && product.bundleId.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesStoneName = stoneNameFilter === "all" || product.name === stoneNameFilter;
    const matchesGrade = gradeFilter === "all" || product.grade === gradeFilter;
    const matchesLocation = locationFilter === "all" || product.location === locationFilter;
    const matchesStage = stageFilter === "all" || product.stage === stageFilter;
    const matchesSupplier = supplierFilter === "all" || product.supplier === supplierFilter;

    return matchesSearch && matchesCategory && matchesStoneName && matchesGrade && matchesLocation && matchesStage && matchesSupplier;
  }) || [];

  // Get unique values for filters
  const uniqueSuppliers = [...new Set((products as Product[])?.map(p => p.supplier) || [])];
  const uniqueGrades = [...new Set((products as Product[])?.map(p => p.grade) || [])];
  const uniqueStoneNames = [...new Set((products as Product[])?.map(p => p.name) || [])];
  const uniqueLocations = [...new Set((products as Product[])?.map(p => p.location).filter(Boolean) || [])];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create bundle");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle created successfully" });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create bundle", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/products/${editingProduct?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update bundle");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle updated successfully" });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update bundle", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete bundle");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle deleted successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to delete bundle",
        variant: "destructive" 
      });
    },
  });

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
      updateMutation.mutate(productData);
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
      wholesalePrice: "",
      unit: "sq ft",
      stockQuantity: "",
      slabLength: "",
      slabWidth: "",
      location: "",
      stage: "Active",
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <TopBar 
        title="Inventory Management" 
        subtitle="Manage stone slab bundles and inventory tracking"
        onSearch={setSearchQuery}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bundles, suppliers, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
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

          <Select value={stoneNameFilter} onValueChange={setStoneNameFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Stone Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stone Names</SelectItem>
              {uniqueStoneNames.sort().map((stoneName) => (
                <SelectItem key={stoneName} value={stoneName}>
                  {stoneName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {uniqueGrades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.sort().map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {uniqueSuppliers.map((supplier) => (
                <SelectItem key={supplier} value={supplier}>
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setStoneNameFilter("all");
              setGradeFilter("all");
              setLocationFilter("all");
              setStageFilter("all");
              setSupplierFilter("all");
              setStockFilter("all");
              setPriceRangeFilter("all");
              setTagFilter("all");
              setTagSearchQuery("");
              setSortBy("name");
              setSortDirection("asc");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredProducts.length} of {(products as Product[])?.length || 0} bundles
          {filteredProducts.length > 0 && (
            <span className="ml-4 font-medium text-primary-custom">
              Total Stock: {filteredProducts.reduce((sum, product) => sum + product.stockQuantity, 0)} units
            </span>
          )}
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

                  <div className="grid grid-cols-4 gap-4">
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
                      <Label htmlFor="wholesalePrice">Wholesale Price</Label>
                      <Input
                        id="wholesalePrice"
                        value={formData.wholesalePrice}
                        onChange={(e) => setFormData({...formData, wholesalePrice: e.target.value})}
                        placeholder="e.g., 35.99"
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
                    <Label htmlFor="stage">Stage</Label>
                    <Select value={formData.stage} onValueChange={(value) => setFormData({...formData, stage: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          {STAGES.map((stage) => {
            const stageProducts = filteredProducts.filter(product => product.stage === stage);
            
            return (
              <div key={stage} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {stage} Bundles
                    <Badge variant={stage === "Active" ? "default" : stage === "Hold" ? "secondary" : "outline"}>
                      {stageProducts.length}
                    </Badge>
                  </h3>
                </div>
                
                {stageProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bundle ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stageProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <Badge variant="outline">{product.bundleId}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell>{product.supplier}</TableCell>
                          <TableCell>{product.grade}</TableCell>
                          <TableCell>
                            <Badge variant={product.stockQuantity > 10 ? "default" : "destructive"}>
                              {product.stockQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell>${product.price}/{product.unit}</TableCell>
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
                                    wholesalePrice: product.wholesalePrice || "",
                                    unit: product.unit,
                                    stockQuantity: product.stockQuantity.toString(),
                                    slabLength: product.slabLength || "",
                                    slabWidth: product.slabWidth || "",
                                    location: product.location || "",
                                    stage: product.stage,
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
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No {stage.toLowerCase()} bundles found
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}