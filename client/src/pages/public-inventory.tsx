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
import { Search, Filter, Package, Ruler, MapPin, Eye, Calendar, Phone, Mail } from "lucide-react";
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

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Contact form submission
  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      // Simple success simulation for now - in production this would go to a real endpoint
      console.log("Showroom visit request:", data);
      
      // Simulate a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { 
        success: true, 
        message: "Your showroom visit request has been submitted successfully!" 
      };
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted!",
        description: "We'll contact you soon to schedule your showroom visit.",
      });
      contactForm.reset();
      setContactDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onContactSubmit = (data: ContactFormData) => {
    contactMutation.mutate(data);
  };

  // Fetch slab details for each product
  useEffect(() => {
    if (products && products.length > 0) {
      const fetchSlabDetails = async () => {
        try {
          const productsWithSlabData = await Promise.all(
            products.map(async (product: any) => {
              try {
                const slabsResponse = await fetch(`/api/slabs?bundleId=${product.bundleId}`)
                  .then(res => res.json());
                return {
                  ...product,
                  slabs: slabsResponse || []
                };
              } catch (error) {
                console.error(`Error fetching slabs for product ${product.id}:`, error);
                return {
                  ...product,
                  slabs: []
                };
              }
            })
          );
          setProductsWithSlabs(productsWithSlabData);
        } catch (error) {
          console.error('Error fetching slab details:', error);
          setProductsWithSlabs(products);
        }
      };

      fetchSlabDetails();
    }
  }, [products]);

  const filteredProducts = (productsWithSlabs.length > 0 ? productsWithSlabs : products || [])?.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.grade.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    const inStock = product.stockQuantity > 0;
    return matchesSearch && matchesCategory && inStock;
  }) || [];

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "stock":
        return b.stockQuantity - a.stockQuantity;
      case "category":
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  const categories = [...new Set(products?.map((p: any) => p.category) || [])];

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(price));
  };

  const calculateSlabArea = (length: string | null, width: string | null) => {
    if (!length || !width) return null;
    const lengthFt = parseFloat(length) / 12; // Convert inches to feet
    const widthFt = parseFloat(width) / 12;   // Convert inches to feet
    return (lengthFt * widthFt).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading our premium stone collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Premium Natural Stone Collection
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our exquisite selection of granite, marble, and quartz slabs. 
              Each piece is carefully selected for quality and beauty.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search stones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="stock">Stock Quantity</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center text-sm text-gray-600">
              <Package className="h-4 w-4 mr-1" />
              {sortedProducts.reduce((total, product) => {
                return total + (product.slabs && Array.isArray(product.slabs) ? 
                  product.slabs.filter((slab: any) => slab.status === 'available').length : 
                  product.stockQuantity);
              }, 0)} slabs available
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {sortedProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stones found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedProducts.map((product: any) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                {/* Image Placeholder */}
                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Image Coming Soon</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Stock Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={
                      (product.slabs && Array.isArray(product.slabs) ? 
                        product.slabs.filter((slab: any) => slab.status === 'available').length : 
                        product.stockQuantity) > 5 ? "default" : "secondary"
                    }>
                      {product.slabs && Array.isArray(product.slabs) ? 
                        product.slabs.filter((slab: any) => slab.status === 'available').length : 
                        product.stockQuantity
                      } slabs
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
                  {/* Specifications */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Ruler className="h-4 w-4 mr-2" />
                      Thickness: {product.thickness}
                    </div>
                    
                    {product.slabLength && product.slabWidth && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Ruler className="h-4 w-4 mr-2" />
                        Dimensions: {product.slabLength}" × {product.slabWidth}"
                        {calculateSlabArea(product.slabLength, product.slabWidth) && (
                          <span className="ml-2 text-primary font-medium">
                            ({calculateSlabArea(product.slabLength, product.slabWidth)} sq ft)
                          </span>
                        )}
                      </div>
                    )}

                    {product.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        Location: {product.location}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button className="flex-1" size="sm">
                      Request Quote
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{product.name}</DialogTitle>
                          <DialogDescription>
                            Complete details for this stone bundle
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Image */}
                          <div className="space-y-4">
                            {product.imageUrl ? (
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                                <Package className="h-16 w-16 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-2">Bundle Information</h3>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Bundle ID:</span>
                                  <span className="font-mono">{product.bundleId || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Category:</span>
                                  <span className="capitalize">{product.category}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Grade:</span>
                                  <span>{product.grade} Grade</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Thickness:</span>
                                  <span>{product.thickness}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Available Slabs:</span>
                                  <span className="font-semibold">
                                    {product.slabs && Array.isArray(product.slabs) ? 
                                      product.slabs.filter((slab: any) => slab.status === 'available').length : 
                                      product.stockQuantity
                                    }
                                  </span>
                                </div>
                              </div>
                            </div>

                            {product.slabLength && product.slabWidth && (
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Slab Dimensions</h3>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Length:</span>
                                    <span>{product.slabLength}"</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Width:</span>
                                    <span>{product.slabWidth}"</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Area per Slab:</span>
                                    <span className="font-semibold">
                                      {calculateSlabArea(product.slabLength, product.slabWidth)} sq ft
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {product.slabs && Array.isArray(product.slabs) && product.slabs.length > 0 && (
                              <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Warehouse Locations</h3>
                                <div className="space-y-1">
                                  {product.slabs
                                    .filter((slab: any) => slab.status === 'available')
                                    .reduce((locations: string[], slab: any) => {
                                      if (slab.location && !locations.includes(slab.location)) {
                                        locations.push(slab.location);
                                      }
                                      return locations;
                                    }, [])
                                    .map((location: string) => (
                                      <div key={location} className="flex items-center text-sm text-gray-600">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        {location}
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            <div className="pt-4 border-t">
                              <Button className="w-full">
                                Request Quote for This Bundle
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="bg-white rounded-lg shadow-sm border p-8 mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Need Help Finding the Perfect Stone?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Our stone experts are here to help you choose the ideal material for your project. 
            Contact us for personalized recommendations and pricing.
          </p>
          <div className="flex justify-center">
            <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="px-8">
                  <Calendar className="h-5 w-5 mr-2" />
                  Schedule Showroom Visit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Schedule Your Showroom Visit</DialogTitle>
                  <DialogDescription>
                    Let us know when you'd like to visit our showroom to see our stone collection in person.
                  </DialogDescription>
                </DialogHeader>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
                    <FormField
                      control={contactForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
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
                            <Input type="email" placeholder="john@example.com" {...field} />
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
                            <Input type="tel" placeholder="(555) 123-4567" {...field} />
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
                          <FormLabel>Preferred Visit Date</FormLabel>
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
                          <FormLabel>Additional Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your project or any specific stones you're interested in..."
                              className="resize-none"
                              rows={3}
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
                        className="flex-1"
                        onClick={() => setContactDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={contactMutation.isPending}
                      >
                        {contactMutation.isPending ? "Submitting..." : "Schedule Visit"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Texas Counter Fitters</h3>
            <p className="text-gray-400">
              Quality natural stone for discerning professionals and homeowners
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}