import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Package, Ruler, MapPin, Eye, Calendar, Phone, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Lightbox } from "@/components/ui/lightbox";
import { ShareButton } from "@/components/ui/share-button";

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  preferredDate: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function PublicInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [productsWithSlabs, setProductsWithSlabs] = useState<any[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");
  
  // Advanced filtering states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [finishFilter, setFinishFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Handle URL parameters for category filtering and load recently viewed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      setCategoryFilter(categoryParam);
      setActiveTab(categoryParam);
    }
    
    // Load recently viewed products from localStorage
    const recentlyViewedData = localStorage.getItem('recentlyViewed');
    if (recentlyViewedData) {
      setRecentlyViewed(JSON.parse(recentlyViewedData));
    }
  }, []);

  // Function to add product to recently viewed
  const addToRecentlyViewed = (product: any) => {
    const currentViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const filtered = currentViewed.filter((p: any) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 6); // Keep only 6 most recent
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    setRecentlyViewed(updated);
  };

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

  // Fetch all slabs in a single query
  const { data: allSlabs = [] } = useQuery({
    queryKey: ["/api/public/slabs"],
    queryFn: () => fetch(`/api/public/slabs`).then(res => res.json()),
  });

  // Combine products with their slabs
  useEffect(() => {
    if (products && allSlabs) {
      const combined = products.map((product: any) => ({
        ...product,
        slabs: allSlabs.filter((slab: any) => slab.bundleId === product.bundleId),
      }));
      setProductsWithSlabs(combined);
    }
  }, [products, allSlabs]);

  // Calculate slab area
  const calculateSlabArea = (length: number, width: number) => {
    if (!length || !width) return 0;
    return ((length * width) / 144).toFixed(1);
  };

  // Enhanced filtering with price range, dimensions, and finish
  const filteredProducts = productsWithSlabs.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.bundleId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeTab === "all" || product.category === activeTab;
    
    const price = parseFloat(product.price) || 0;
    const matchesPrice = price >= priceRange[0] && price <= priceRange[1];
    
    const matchesDimension = dimensionFilter === "all" || 
      (dimensionFilter === "2cm" && product.thickness === "2cm") ||
      (dimensionFilter === "3cm" && product.thickness === "3cm") ||
      (dimensionFilter === "large" && product.slabLength && parseFloat(product.slabLength) > 100) ||
      (dimensionFilter === "medium" && product.slabLength && parseFloat(product.slabLength) <= 100 && parseFloat(product.slabLength) > 80) ||
      (dimensionFilter === "small" && product.slabLength && parseFloat(product.slabLength) <= 80);
    
    const matchesFinish = finishFilter === "all" || product.finish === finishFilter;
    
    return matchesSearch && matchesCategory && matchesPrice && matchesDimension && matchesFinish;
  });

  const sortedProducts = [...filteredProducts].sort((a: any, b: any) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "category":
        return (a.category || "").localeCompare(b.category || "");
      case "slabs":
        const aSlabs = a.slabs?.filter((slab: any) => slab.status === 'available').length || 0;
        const bSlabs = b.slabs?.filter((slab: any) => slab.status === 'available').length || 0;
        return bSlabs - aSlabs;
      default:
        return 0;
    }
  });

  // Get unique categories
  const categories = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)));

  const openLightbox = (imageSrc: string, title: string) => {
    setLightboxImage(imageSrc);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImage("");
    setLightboxTitle("");
  };

  // Submit contact form
  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/showroom-visits", {
        clientName: data.name,
        email: data.email,
        phone: data.phone,
        preferredDate: data.preferredDate || null,
        notes: data.message,
        status: "pending"
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Thank you for your interest! We'll contact you soon.",
      });
      contactForm.reset();
      setContactDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/showroom-visits"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onContactSubmit = (data: ContactFormData) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Premium Natural Stone Collection
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our exquisite selection of granite, marble, and quartz slabs. Each piece is carefully selected for quality and beauty.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search stones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Navigation Tabs */}
          <div className="flex justify-center mb-6">
            <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 ${activeTab === "all" ? "bg-white shadow-sm" : ""}`}
              >
                All Stones
              </Button>
              {categories.map((category: string) => (
                <Button
                  key={category}
                  variant={activeTab === category ? "default" : "ghost"}
                  onClick={() => setActiveTab(category)}
                  className={`px-4 py-2 capitalize ${activeTab === category ? "bg-white shadow-sm" : ""}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-gray-700">Advanced Filters</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Range ($/sqft)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                    className="w-20"
                  />
                  <span className="self-center">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Slab Thickness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slab Thickness
                </label>
                <Select value={dimensionFilter} onValueChange={setDimensionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Thickness" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Thickness</SelectItem>
                    <SelectItem value="2cm">2cm Thickness</SelectItem>
                    <SelectItem value="3cm">3cm Thickness</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Finish Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Finish
                </label>
                <Select value={finishFilter} onValueChange={setFinishFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Finishes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Finishes</SelectItem>
                    <SelectItem value="Polished">Polished</SelectItem>
                    <SelectItem value="Leather">Leather</SelectItem>
                    <SelectItem value="Brushed">Brushed</SelectItem>
                    <SelectItem value="Matte">Matte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="slabs">Most Slabs</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
              <Package className="h-4 w-4" />
              <span>{filteredProducts.reduce((total: number, product: any) => 
                total + (product.slabs?.filter((slab: any) => slab.status === 'available').length || 0), 0
              )} slabs available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8">
        {productsLoading ? (
          <div className="text-center py-12">
            <div className="text-lg">Loading inventory...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProducts.map((product: any) => (
              <Card 
                key={product.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  addToRecentlyViewed(product);
                  setLocation(`/product/${product.id}`);
                }}
              >
                {/* Image */}
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLightbox(product.imageUrl, `${product.name} - ${product.category}`);
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 right-3 pointer-events-none">
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
                      <CardTitle className="text-xl mb-1">{product.name}</CardTitle>
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
                        <span className="text-gray-600">Supplier:</span>
                        <div className="font-medium">{product.supplier}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Finish:</span>
                        <div className="font-medium">{product.finish}</div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Available Slabs:</span>
                        <div className="font-semibold">
                          {product.slabs?.filter((slab: any) => slab.status === 'available').length || product.stockQuantity || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4">
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setContactDialogOpen(true);
                        }}
                      >
                        Request Quote
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/product/${product.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <ShareButton
                        url={`${window.location.origin}/product/${product.id}`}
                        title={product.name}
                        description={`${product.category} from ${product.supplier} - ${product.grade} grade with ${product.finish} finish`}
                        price={`$${product.price}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Recently Viewed Products */}
        {recentlyViewed.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recently Viewed</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {recentlyViewed.map((product: any) => (
                <Card 
                  key={`recent-${product.id}`}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setLocation(`/product/${product.id}`)}
                >
                  <div className="h-24 bg-gradient-to-br from-gray-200 to-gray-300">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-gray-600 capitalize">{product.category}</p>
                    <p className="text-xs font-semibold text-blue-600">${product.price}/sqft</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Contact Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Quote</DialogTitle>
              <DialogDescription>
                Fill out this form and we'll get back to you with pricing information.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
                <FormField
                  control={contactForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your full name" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} />
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
                      <FormLabel>Phone</FormLabel>
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
                      <FormLabel>Preferred Contact Date (Optional)</FormLabel>
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
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your project and any specific requirements..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setContactDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="flex-1"
                  >
                    {contactMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Need Help Finding the Perfect Stone?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our stone experts are here to help you choose the ideal material for your project. 
            Get personalized recommendations and professional installation guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => setContactDialogOpen(true)}>
              <Phone className="h-4 w-4 mr-2" />
              Schedule Consultation
            </Button>
            <Button variant="outline" size="lg">
              <Mail className="h-4 w-4 mr-2" />
              Email Questions
            </Button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          isOpen={lightboxOpen}
          imageSrc={lightboxImage}
          imageTitle={lightboxTitle}
          onClose={closeLightbox}
        />
      )}
    </div>
  );
}