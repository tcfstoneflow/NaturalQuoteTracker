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
import { Plus, Package, Pencil, Trash2, Search, Filter, ExternalLink, Settings, X, Upload, Sparkles, Palette } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import TopBar from "@/components/layout/topbar";
import { ImageUpload } from "@/components/ui/image-upload";

interface Product {
  id: number;
  name: string;
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    bundleId: "",
    name: "",
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

  const [galleryImages, setGalleryImages] = useState<Array<{
    id?: number;
    url: string;
    title: string;
    description: string;
    installationType: string;
    isAiGenerated: boolean;
  }>>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);

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
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create bundle");
      }
      return response.json();
    },
    onSuccess: async (newProduct) => {
      // Handle gallery images separately for new products
      if (galleryImages.length > 0) {
        for (const image of galleryImages) {
          if (image.url && image.url.startsWith('data:')) {
            try {
              await fetch(`/api/products/${newProduct.id}/gallery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: image.url,
                  title: image.title || 'Gallery Image',
                  description: image.description || null,
                  installationType: image.installationType || 'general',
                  isAiGenerated: image.isAiGenerated || false
                })
              });
            } catch (error) {
              console.error('Failed to save gallery image:', error);
            }
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Bundle created successfully" });
      handleCloseModal();
    },
    onError: (error: any) => {
      console.error("Bundle creation error:", error);
      toast({ 
        title: "Failed to create bundle", 
        description: error.message || "Please check all required fields",
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
      if (!response.ok) throw new Error("Failed to update bundle");
      return response.json();
    },
    onSuccess: async (updatedProduct) => {
      // Delete gallery images that were marked for deletion
      for (const imageId of deletedImageIds) {
        try {
          await fetch(`/api/gallery/${imageId}`, {
            method: "DELETE",
          });
        } catch (error) {
          console.error('Failed to delete gallery image:', error);
        }
      }
      
      // Handle gallery images separately
      if (galleryImages.length > 0) {
        for (const image of galleryImages) {
          if (image.url && image.url.startsWith('data:')) {
            try {
              await fetch(`/api/products/${updatedProduct.id}/gallery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: image.url,
                  title: image.title || 'Gallery Image',
                  description: image.description || null,
                  installationType: image.installationType || 'general',
                  isAiGenerated: image.isAiGenerated || false
                })
              });
            } catch (error) {
              console.error('Failed to save gallery image:', error);
            }
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: [`/api/public/products/${updatedProduct.id}/gallery`] });
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
    if (!formData.bundleId || !formData.name || !formData.supplier || !formData.category || !formData.finish) {
      toast({ title: "Please fill in all required fields including Bundle ID", variant: "destructive" });
      return;
    }
    
    const submitData = {
      bundleId: formData.bundleId.trim(),
      name: formData.name.trim(),
      supplier: formData.supplier.trim(),
      category: formData.category,
      grade: formData.grade,
      thickness: formData.thickness.trim(),
      finish: formData.finish,
      price: parseFloat(formData.price) || 0,
      unit: formData.unit || "sq ft",
      stockQuantity: parseInt(formData.stockQuantity) || 0,
      slabLength: formData.slabLength ? parseFloat(formData.slabLength) : null,
      slabWidth: formData.slabWidth ? parseFloat(formData.slabWidth) : null,
      location: formData.location.trim() || null,
      imageUrl: formData.imageUrl.trim() || null,
    };

    console.log("Frontend submitting data:", JSON.stringify(submitData, null, 2));

    if (editingProduct) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      bundleId: product.bundleId,
      name: product.name,
      supplier: product.supplier,
      category: product.category,
      grade: product.grade,
      thickness: product.thickness,
      finish: product.finish || "Polished",
      price: product.price,
      unit: product.unit,
      stockQuantity: product.stockQuantity.toString(),
      slabLength: product.slabLength || "",
      slabWidth: product.slabWidth || "",
      location: product.location || "",
      imageUrl: product.imageUrl || ""
    });
    
    // Load existing gallery images
    try {
      const response = await fetch(`/api/public/products/${product.id}/gallery`);
      if (response.ok) {
        const existingImages = await response.json();
        setGalleryImages(existingImages.map((img: any) => ({
          id: img.id,
          url: img.imageUrl,
          title: img.title || '',
          description: img.description || '',
          installationType: img.installationType || 'general',
          isAiGenerated: img.isAiGenerated || false
        })));
      } else {
        setGalleryImages([]);
      }
    } catch (error) {
      console.error('Failed to load gallery images:', error);
      setGalleryImages([]);
    }
    
    // Reset deleted images tracking
    setDeletedImageIds([]);
    
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setEditingProduct(null);
    setFormData({
      bundleId: "",
      name: "",
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
    setGalleryImages([]);
  };

  // Get unique values for dynamic filters
  const uniqueSuppliers = Array.from(new Set(products?.map((p: Product) => p.supplier) || []));
  const uniqueGrades = Array.from(new Set(products?.map((p: Product) => p.grade) || []));

  const filteredProducts = products?.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.bundleId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const matchesGrade = gradeFilter === "all" || product.grade === gradeFilter;
    const matchesSupplier = supplierFilter === "all" || product.supplier === supplierFilter;
    
    // Stock level filtering
    const matchesStock = (() => {
      switch (stockFilter) {
        case "low": return product.stockQuantity <= 5;
        case "medium": return product.stockQuantity > 5 && product.stockQuantity <= 20;
        case "high": return product.stockQuantity > 20;
        default: return true;
      }
    })();

    // Price range filtering
    const price = parseFloat(product.price);
    const matchesPriceRange = (() => {
      switch (priceRangeFilter) {
        case "low": return price < 50;
        case "medium": return price >= 50 && price <= 100;
        case "high": return price > 100;
        default: return true;
      }
    })();

    return matchesSearch && matchesCategory && matchesGrade && matchesSupplier && matchesStock && matchesPriceRange;
  });

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

          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="low">Low (5 or less)</SelectItem>
              <SelectItem value="medium">Medium (6-20)</SelectItem>
              <SelectItem value="high">High (20+)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="low">Under $50</SelectItem>
              <SelectItem value="medium">$50-$100</SelectItem>
              <SelectItem value="high">Over $100</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setGradeFilter("all");
              setSupplierFilter("all");
              setStockFilter("all");
              setPriceRangeFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredProducts?.length || 0} of {products?.length || 0} bundles
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
                    <Label htmlFor="bundleId">Bundle ID *</Label>
                    <Input
                      id="bundleId"
                      value={formData.bundleId}
                      onChange={(e) => setFormData({ ...formData, bundleId: e.target.value })}
                      required
                      placeholder="e.g. BDL-0001, GRANITE-001"
                      disabled={!!editingProduct}
                    />
                    {editingProduct && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Bundle ID cannot be changed after creation
                      </p>
                    )}
                  </div>
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
                    <Label htmlFor="finish">Finish *</Label>
                    <Select value={formData.finish} onValueChange={(value) => setFormData({ ...formData, finish: value })}>
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

                {/* Visualization Tools Section */}
                {formData.imageUrl && (
                  <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Visualization Tools
                    </Label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-3">
                        Generate realistic countertop visualizations using this slab
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/products/${editingProduct.id}/generate-render`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                            });
                            
                            if (response.ok) {
                              toast({
                                title: "AI Render Started",
                                description: "Generating kitchen countertop render in background. Check gallery in a few moments.",
                              });
                            } else {
                              const error = await response.json();
                              toast({
                                title: "AI Render Failed",
                                description: error.error || "Failed to start AI render generation",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            toast({
                              title: "AI Render Failed",
                              description: "Failed to start AI render generation",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Kitchen Render
                      </Button>
                    </div>
                  </div>
                )}

                {/* Gallery Images Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Gallery Images</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setGalleryImages([...galleryImages, { 
                        url: '', 
                        title: '', 
                        description: '', 
                        installationType: 'kitchen', 
                        isAiGenerated: false 
                      }])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Gallery Image
                    </Button>
                  </div>
                  
                  {galleryImages.map((image, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Gallery Image {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const imageToDelete = galleryImages[index];
                            // If image has an ID, track it for deletion from database
                            if (imageToDelete.id) {
                              setDeletedImageIds([...deletedImageIds, imageToDelete.id]);
                            }
                            // Remove from local state
                            setGalleryImages(galleryImages.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div>
                        <Label>Upload Image</Label>
                        <ImageUpload
                          value={image.url}
                          onChange={(value) => {
                            const newImages = [...galleryImages];
                            newImages[index].url = value;
                            setGalleryImages(newImages);
                          }}
                          className="mt-2"
                        />
                      </div>

                      {image.url && (
                        <div>
                          <Label>Preview</Label>
                          <img 
                            src={image.url} 
                            alt={image.title}
                            className="w-full h-32 object-cover rounded-md mt-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {galleryImages.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">No gallery images added yet</p>
                      <p className="text-sm text-gray-400">Click "Add Gallery Image" to showcase this stone in real installations</p>
                    </div>
                  )}
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
                  <TableHead>Finish</TableHead>
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
                          className="w-12 h-12 rounded-lg object-cover border cursor-pointer hover:scale-105 transition-transform duration-200 hover:shadow-lg"
                          onClick={() => handleEdit(product)}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getProductImage(product.category.toLowerCase());
                          }}
                          title={`Click to edit ${product.name}`}
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
                      <TableCell>{product.finish}</TableCell>
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
                            onClick={() => setLocation(`/slab-management/${product.id}`)}
                            title="Manage individual slabs"
                          >
                            <Settings size={14} />
                          </Button>
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