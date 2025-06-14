import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Package, Ruler, MapPin, Globe2, Eye, Calendar, Phone, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  preferredDate: z.string().min(1, "Please select a preferred date"),
  message: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function PublicInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [productsWithSlabs, setProductsWithSlabs] = useState<any[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedSlab, setSelectedSlab] = useState<any>(null);
  const [isSlabDetailsOpen, setIsSlabDetailsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      preferredDate: "",
      message: "",
    },
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch slabs for each product
  const slabQueries = products.map((product: any) => 
    useQuery({
      queryKey: ["/api/public/slabs", product.bundleId],
      queryFn: () => fetch(`/api/public/slabs?bundleId=${encodeURIComponent(product.bundleId || '')}`).then(res => res.json()),
      enabled: !!product.bundleId,
    })
  );

  useEffect(() => {
    const productsWithSlabData = products.map((product: any, index: number) => {
      const slabData = slabQueries[index]?.data || [];
      console.log(`Product ${product.name} slabs:`, slabData);
      return {
        ...product,
        slabs: slabData
      };
    });
    setProductsWithSlabs(productsWithSlabData);
  }, [products, ...slabQueries.map(q => q.data)]);

  // Removed pricing calculations for public page security

  // Filter and sort products
  const filteredProducts = productsWithSlabs.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.material?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "category":
        return (a.category || "").localeCompare(b.category || "");
      case "stock":
        const aStock = a.slabs?.filter((s: any) => s.status === 'available').length || a.stockQuantity || 0;
        const bStock = b.slabs?.filter((s: any) => s.status === 'available').length || b.stockQuantity || 0;
        return bStock - aStock;
      default:
        return 0;
    }
  });

  // Get unique categories
  const categories = [...new Set(products.map((p: any) => p.category).filter(Boolean))];

  const submitContactForm = async (data: ContactFormData) => {
    try {
      const response = await apiRequest("POST", "/api/showroom-visits", {
        ...data,
        type: "general_inquiry",
        status: "pending"
      });
      
      toast({
        title: "Request Submitted",
        description: "We'll contact you soon to schedule your visit.",
      });
      
      contactForm.reset();
      setContactDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Premium Natural Stone Collection
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Discover our extensive selection of premium granite, marble, and quartz slabs. 
              Browse available inventory and request quotes for your project.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search stones by name, material, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="stock">Stock Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Available Stone Bundles ({sortedProducts.length})
          </h2>
        </div>

        {/* Product Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-300"></div>
                <CardHeader>
                  <div className="h-4 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 rounded"></div>
                    <div className="h-3 bg-gray-300 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stones found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProducts.map((product: any) => (
              <Card 
                key={product.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Product card clicked!', product.id, product.name);
                  setSelectedProduct(product);
                  setIsProductDetailsOpen(true);
                }}
              >
                {/* Image */}
                <div className="aspect-[3/2] bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3">
                    <Badge variant={
                      (product.slabs?.filter((slab: any) => slab.status === 'available').length || product.stockQuantity || 0) > 5 ? "default" : "secondary"
                    }>
                      {product.slabs?.filter((slab: any) => slab.status === 'available').length || product.stockQuantity || 0} slabs
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-xl">{product.name}</CardTitle>
                        {product.slabs && product.slabs.length > 0 && product.slabs[0].productionLocation && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            <Globe2 className="h-3 w-3 mr-1" />
                            {product.slabs[0].productionLocation}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="space-y-1">
                        <div className="capitalize">
                          {product.category} • {product.grade} Grade
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                            ID: {product.bundleId || 'N/A'}
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Ruler className="h-4 w-4 mr-2" />
                      Thickness: {product.thickness}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Material:</span>
                        <div className="font-medium">{product.material}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Color:</span>
                        <div className="font-medium">{product.color}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Finish:</span>
                        <div className="font-medium">{product.finish}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Available Slabs:</span>
                        <div className="font-semibold">
                          {product.slabs?.filter((slab: any) => slab.status === 'available').length || product.stockQuantity || 0}
                        </div>
                      </div>
                      {product.slabs && product.slabs.length > 0 && product.slabs[0].productionLocation && (
                        <div className="col-span-2">
                          <span className="text-gray-600">Origin:</span>
                          <div className="font-medium flex items-center">
                            <Globe2 className="h-3 w-3 mr-1" />
                            {product.slabs[0].productionLocation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Product Details Modal */}
        <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {selectedProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Bundle ID: {selectedProduct?.bundleId} | Category: {selectedProduct?.category}
              </DialogDescription>
            </DialogHeader>

            {selectedProduct && (
              <div className="space-y-6">
                {/* Product Image */}
                {selectedProduct.imageUrl && (
                  <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Product Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Material:</span>
                        <span>{selectedProduct.material}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Color:</span>
                        <span>{selectedProduct.color}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Finish:</span>
                        <span>{selectedProduct.finish}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Thickness:</span>
                        <span>{selectedProduct.thickness}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Slab Specifications</h3>
                    <div className="space-y-2 text-sm">
                      {selectedProduct.slabLength && selectedProduct.slabWidth && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Slab Length:</span>
                            <span>{selectedProduct.slabLength}"</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Slab Width:</span>
                            <span>{selectedProduct.slabWidth}"</span>
                          </div>

                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available Slabs:</span>
                        <span className="font-semibold">
                          {selectedProduct.slabs?.filter((slab: any) => slab.status === 'available').length || selectedProduct.stockQuantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Slabs */}
                {selectedProduct.slabs && Array.isArray(selectedProduct.slabs) && selectedProduct.slabs.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Individual Slabs Available</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                      {selectedProduct.slabs
                        .filter((slab: any) => slab.status === 'available')
                        .map((slab: any) => (
                          <div 
                            key={slab.id} 
                            className="cursor-pointer hover:shadow-lg hover:bg-blue-50 transition-all duration-200 border-2 border-gray-200 hover:border-blue-300 rounded-lg bg-white p-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSlab({ ...slab, product: selectedProduct });
                              setIsSlabDetailsOpen(true);
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium text-sm">#{slab.slabNumber}</div>
                              <Badge variant="secondary" className="text-xs">
                                Available
                              </Badge>
                            </div>
                            
                            {(slab.length && slab.width) && (
                              <div className="text-xs text-gray-600 mb-1">
                                {slab.length}" × {slab.width}"
                              </div>
                            )}
                            
                            <div className="space-y-1">
                              {slab.location && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Storage: {slab.location}
                                </div>
                              )}
                              {slab.productionLocation && (
                                <div className="flex items-center text-xs text-gray-600">
                                  <Globe2 className="h-3 w-3 mr-1" />
                                  Origin: {slab.productionLocation}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      toast({
                        title: "Quote Request",
                        description: `Quote request initiated for ${selectedProduct.name}`,
                      });
                    }}
                  >
                    Request Quote for This Bundle
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setContactDialogOpen(true)}
                  >
                    Contact Us
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Need Help Finding the Perfect Stone?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our stone experts are here to help you choose the ideal material for your project. 
            Contact us for personalized recommendations and pricing.
          </p>
          <Button size="lg" onClick={() => setContactDialogOpen(true)}>
            <Phone className="h-4 w-4 mr-2" />
            Schedule a Consultation
          </Button>
        </div>

        {/* Contact Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule a Consultation</DialogTitle>
              <DialogDescription>
                Let us help you find the perfect stone for your project.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(submitContactForm)} className="space-y-4">
                <FormField
                  control={contactForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={contactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={contactForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={contactForm.control}
                  name="preferredDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={contactForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your project..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    Submit Request
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)}>
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