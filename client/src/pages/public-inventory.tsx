import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Link } from "wouter";
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
import { Search, Filter, Package, Ruler, MapPin, Eye, Calendar, Phone, Mail, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Lightbox } from "@/components/ui/lightbox";
import { ShareButton } from "@/components/ui/share-button";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { useClientEmail } from "@/hooks/use-favorites";

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone number is required"),
  message: z.string().min(1, "Message is required"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function PublicInventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [productsWithSlabs, setProductsWithSlabs] = useState<any[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedProductForQuote, setSelectedProductForQuote] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");
  
  // Removed pricing filters for public page security
  const [dimensionFilter, setDimensionFilter] = useState("all");
  const [finishFilter, setFinishFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { hasClientEmail } = useClientEmail();

  // Update quote message when selected product changes
  useEffect(() => {
    contactForm.setValue('message', getContextualMessage());
  }, [selectedProductForQuote]);

  // Function to add product to recently viewed
  const addToRecentlyViewed = (product: any) => {
    const currentViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    const filtered = currentViewed.filter((p: any) => p.id !== product.id);
    const updated = [product, ...filtered].slice(0, 6); // Keep only 6 most recent
    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
    setRecentlyViewed(updated);
  };

  // Function to generate context-aware message based on selected product
  const getContextualMessage = () => {
    if (selectedProductForQuote) {
      return `I'm interested in getting a quote for ${selectedProductForQuote.name}. Could you please provide pricing and availability.`;
    }
    
    // Fallback message when no specific product is selected
    return "I'm interested in getting a quote for your stone slabs. Could you please provide pricing and availability.";
  };

  const contactForm = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: getContextualMessage(),
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

  // Fetch all tags for filtering
  const { data: allTags = [] } = useQuery({
    queryKey: ["/api/public/tags"],
  });

  // Fetch product tags for filtering
  const { data: allProductTags = [] } = useQuery({
    queryKey: ["/api/public/product-tags"],
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

  // Handle URL parameters for category filtering and product redirects
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const productParam = urlParams.get('product');
    
    if (categoryParam) {
      setCategoryFilter(categoryParam);
      setActiveTab(categoryParam);
    }
    
    // Handle product parameter - redirect to product page
    if (productParam && products && Array.isArray(products)) {
      // Try to find product by name or ID
      const product = products.find((p: any) => 
        p.name === productParam || 
        p.id?.toString() === productParam ||
        p.bundleId === productParam
      );
      
      if (product) {
        // Redirect to the correct product page
        setLocation(`/product/${product.id}`);
        return;
      }
    }
  }, [products, setLocation]);

  // Load recently viewed products from localStorage on mount
  useEffect(() => {
    const recentlyViewedData = localStorage.getItem('recentlyViewed');
    if (recentlyViewedData) {
      setRecentlyViewed(JSON.parse(recentlyViewedData));
    }
  }, []);

  // Calculate slab area
  // Removed pricing calculations for public page security

  // Enhanced filtering with price range, dimensions, finish, and tags
  const filteredProducts = productsWithSlabs.filter((product: any) => {
    // Enhanced search that includes product info and tags
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.bundleId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         // Search through product tags
                         (allProductTags || []).some((pt: any) => 
                           pt.productId === product.id && 
                           pt.tag.name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesCategory = activeTab === "all" || product.category === activeTab;
    
    const matchesDimension = dimensionFilter === "all" || 
      (dimensionFilter === "2cm" && product.thickness === "2cm") ||
      (dimensionFilter === "3cm" && product.thickness === "3cm");
    
    const matchesFinish = finishFilter === "all" || product.finish === finishFilter;
    
    // Tag filtering by dropdown selection
    const matchesTag = tagFilter === "all" || 
      (allProductTags || []).some((pt: any) => 
        pt.productId === product.id && 
        pt.tag.id.toString() === tagFilter
      );
    
    return matchesSearch && matchesCategory && matchesDimension && matchesFinish && matchesTag;
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
      const response = await apiRequest("POST", "/api/public/quote-request", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        message: data.message
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
          <div className="flex justify-between items-start mb-6">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Premium Natural Stone Collection
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Discover our exquisite selection of granite, marble, and quartz slabs. Each piece is carefully selected for quality and beauty.
              </p>
            </div>
            {hasClientEmail && (
              <Button 
                variant="outline" 
                onClick={() => setLocation("/favorites")}
                className="flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                My Favorites
              </Button>
            )}
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
                className={`px-4 py-2 ${activeTab === "all" ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-700 hover:text-gray-900"}`}
              >
                All Stones
              </Button>
              {categories.map((category: string) => (
                <Button
                  key={category}
                  variant={activeTab === category ? "default" : "ghost"}
                  onClick={() => setActiveTab(category)}
                  className={`px-4 py-2 capitalize ${activeTab === category ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-700 hover:text-gray-900"}`}
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Tag Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {(allTags || []).map((tag: any) => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        {tag.name}
                      </SelectItem>
                    ))}
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
                <div className="aspect-[3/2] bg-gradient-to-br from-gray-200 to-gray-300 relative">
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
                  
                  <div className="absolute top-3 right-3 pointer-events-none z-10 flex flex-col gap-2">
                    <Badge 
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                    >
                      {product.slabs?.filter((slab: any) => slab.status === 'available' || slab.status === 'Available').length || product.stockQuantity || 0} slabs
                    </Badge>
                    {/* Location pills - show unique locations from available slabs */}
                    {product.slabs && Array.isArray(product.slabs) && (
                      <div className="flex flex-col gap-1">
                        {Array.from(new Set(
                          product.slabs
                            .filter((slab: any) => 
                              (slab.status?.toLowerCase() === 'available') && 
                              slab.location && 
                              String(slab.location).trim() !== ''
                            )
                            .map((slab: any) => String(slab.location).trim())
                        )).slice(0, 3).map((location: any, index: number) => (
                          <Badge 
                            key={index}
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 border border-gray-300 text-xs shadow-sm"
                          >
                            {location}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{product.name}</CardTitle>
                      {product.aiHeadline && (
                        <p className="text-sm mb-2 text-[#030303]">{product.aiHeadline}</p>
                      )}
                      <CardDescription className="space-y-1">
                        <div className="capitalize">
                          {product.category} • {product.grade} Grade • {product.thickness}
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
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
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4 mt-[0px] mb-[0px]">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProductForQuote(product);
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
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton
                        productId={product.id}
                        productName={product.name}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      />
                      <ShareButton
                        url={`${window.location.origin}/product/${product.id}`}
                        title={product.name}
                        description={`${product.category} - ${product.grade} grade with ${product.finish} finish`}

                        size="sm"
                        className="flex-1"
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
            
            {selectedProductForQuote && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Product of Interest:</p>
                <Link href={`/product/${selectedProductForQuote.id}`}>
                  <span className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer">
                    {selectedProductForQuote.name}
                  </span>
                </Link>
              </div>
            )}
            
            <Form {...contactForm}>
              <form onSubmit={contactForm.handleSubmit((data) => contactMutation.mutate(data))} className="space-y-4">
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
            <Button size="lg" onClick={() => {
              setSelectedProductForQuote(null);
              setContactDialogOpen(true);
            }}>
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