import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Package, Ruler, MapPin, Calendar, Eye, Home, Bath, ChefHat, Wand2, Palette, Mail, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Lightbox } from "@/components/ui/lightbox";
import { SocialShare, CollapsibleShare } from "@/components/ui/social-share";
import { FavoriteButton } from "@/components/ui/favorite-button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const quoteRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  message: z.string().min(1, "Message is required"),
});

type QuoteRequestData = z.infer<typeof quoteRequestSchema>;

// Helper function to render markdown bold formatting with enhanced styling
function renderDescriptionWithBold(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lineIndex) => {
    if (line.trim() === '') {
      return <br key={`br-${lineIndex}`} />;
    }
    
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const renderedLine = parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index} className="font-bold text-gray-900 text-lg leading-relaxed">{boldText}</strong>;
      }
      return part;
    });
    
    return <div key={`line-${lineIndex}`} className="mt-[-2px] mb-[-2px]">{renderedLine}</div>;
  });
}

export default function ProductDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [similarProductsOffset, setSimilarProductsOffset] = useState(0);
  const [slabsExpanded, setSlabsExpanded] = useState(false);
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/public/products", id],
    queryFn: () => fetch(`/api/public/products/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  // Fetch gallery images
  const { data: galleryImages = [] } = useQuery({
    queryKey: ["/api/public/products", id, "gallery"],
    queryFn: () => fetch(`/api/public/products/${id}/gallery`).then(res => res.json()),
    enabled: !!id,
  });

  // Set page title when product loads
  useEffect(() => {
    if (product?.name) {
      document.title = `${product.name} - ${product.category} | TCF Supply`;
    } else {
      document.title = "Product Details | TCF Supply";
    }
    
    // Cleanup: restore default title when component unmounts
    return () => {
      document.title = "TCF Supply";
    };
  }, [product]);

  // Update quote message when product data changes
  useEffect(() => {
    if (product) {
      quoteForm.setValue('message', getProductContextualMessage());
    }
  }, [product]);

  // Fetch similar products using tag-based matching
  const { data: similarProducts = [] } = useQuery({
    queryKey: ["/api/products", id, "similar"],
    queryFn: () => fetch(`/api/products/${id}/similar?limit=12`).then(res => res.json()),
    enabled: !!id,
  });

  const itemsPerPage = 4; // Show 4 products at a time with wider cards
  const visibleProducts = similarProducts.slice(similarProductsOffset, similarProductsOffset + itemsPerPage);
  const canGoNext = similarProductsOffset + itemsPerPage < similarProducts.length;
  const canGoPrev = similarProductsOffset > 0;

  const handleNext = () => {
    if (canGoNext) {
      setSimilarProductsOffset(prev => prev + itemsPerPage);
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      setSimilarProductsOffset(prev => prev - itemsPerPage);
    }
  };

  // Python-based render mutation
  const pythonRenderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/products/${id}/generate-python-render`);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Render response:', data);
      toast({
        title: "Python Render Generated",
        description: "Your countertop visualization has been created successfully!",
      });
      if (data.renderUrl) {
        console.log('Opening lightbox with URL:', data.renderUrl);
        openLightbox(data.renderUrl, `${product.name} - Python Render`);
      } else {
        console.error('No renderUrl in response:', data);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Render Failed",
        description: error.message || "Failed to generate Python render",
        variant: "destructive",
      });
    },
  });

  // Function to generate context-aware message based on product category
  const getProductContextualMessage = () => {
    if (!product) return "I'm interested in getting a quote for this slab. Could you please provide pricing and availability.";
    
    return `I'm interested in getting a quote for ${product.name}. Could you please provide pricing and availability.`;
  };

  // Quote request form
  const quoteForm = useForm<QuoteRequestData>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: getProductContextualMessage(),
    },
  });

  const quoteRequestMutation = useMutation({
    mutationFn: async (data: QuoteRequestData) => {
      const response = await apiRequest("POST", "/api/public/quote-request", {
        ...data,
        productId: id,
        productName: product?.name,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Request Sent",
        description: "We'll get back to you within 24 hours with pricing information.",
      });
      setQuoteDialogOpen(false);
      quoteForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Request",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onQuoteSubmit = (data: QuoteRequestData) => {
    quoteRequestMutation.mutate(data);
  };

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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Button onClick={() => setLocation("/public-inventory")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  const availableSlabs = product.slabs?.filter((slab: any) => slab.status === 'available') || [];

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="outline" 
          onClick={() => setLocation("/public-inventory")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image and Gallery */}
          <div className="space-y-6">
            <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg overflow-hidden">
              {product.imageUrl ? (
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => openLightbox(product.imageUrl, `${product.name} - ${product.category}`)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>

            {/* Installation Gallery - moved here */}
            {galleryImages.length > 0 && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {galleryImages.slice(0, 4).map((image: any) => (
                    <div 
                      key={image.id}
                      className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden rounded-lg cursor-pointer hover:shadow-lg transition-shadow duration-300"
                      onClick={() => openLightbox(image.imageUrl, image.title || 'Gallery Image')}
                    >
                      <img 
                        src={image.imageUrl} 
                        alt={image.title}
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
                

              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-lg text-gray-600 mb-3">
                {product.category} • {product.grade} Grade • {product.finish} • {product.thickness}
              </p>
              <div className="inline-block bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 mb-4">
                {product.location || 'Location not specified'}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border border-gray-200 p-4 rounded-lg mt-[4px] mb-[4px]">
                <div className="text-gray-700 leading-relaxed">
                  {renderDescriptionWithBold(product.description)}
                </div>
              </div>
            )}

            {/* Available Slabs */}
            {availableSlabs.length > 0 && (
              <div>
                <Collapsible open={slabsExpanded} onOpenChange={setSlabsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between mb-4 text-lg font-semibold h-auto py-3"
                    >
                      Available Slabs ({availableSlabs.length})
                      {slabsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {availableSlabs.map((slab: any) => (
                      <Card key={slab.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <h3 className="font-semibold">Slab #{slab.slabNumber}</h3>
                              <Badge variant="outline">{slab.status}</Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              {slab.length && slab.width && (
                                <div className="flex items-center gap-2">
                                  <Ruler className="h-4 w-4" />
                                  <span>{slab.length}" × {slab.width}"</span>
                                </div>
                              )}
                              
                              {slab.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{slab.location}</span>
                                </div>
                              )}
                              
                              {slab.reservedDate && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Reserved: {new Date(slab.reservedDate).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                            
                            {slab.notes && (
                              <p className="text-sm text-gray-600 italic">{slab.notes}</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6">
                    <Mail className="h-5 w-5 mr-2" />
                    Request Quote for {product.name}
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Request Quote</DialogTitle>
                </DialogHeader>
                <Form {...quoteForm}>
                  <form onSubmit={quoteForm.handleSubmit(onQuoteSubmit)} className="space-y-4">
                    <FormField
                      control={quoteForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={quoteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={quoteForm.control}
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
                      control={quoteForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your project..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setQuoteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={quoteRequestMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {quoteRequestMutation.isPending ? "Sending..." : "Send Request"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Social Sharing - Collapsed */}
            <CollapsibleShare
              url={window.location.href}
              title={product.name}
              description={`${product.category} from ${product.supplier} - ${product.grade} grade with ${product.finish} finish`}
              imageUrl={product.imageUrl || undefined}
              price={`$${product.price}`}
            />
            
            <FavoriteButton 
              productId={product.id}
              productName={product.name}
              className="w-full"
              variant="outline"
              size="default"
            />
          </div>
        </div>
      </div>
    </div>

      {/* Similar Products Section - Full Width */}
      {similarProducts.length > 0 && (
        <div className="w-full mt-16 border-t pt-12 bg-gray-50">
          <div className="w-full px-8">
            <div className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900">
                Similar Products
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="p-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="p-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {visibleProducts.map((similarProduct: any) => (
                <Card 
                  key={similarProduct.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                  onClick={() => setLocation(`/product/${similarProduct.id}`)}
                >
                  <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    {similarProduct.imageUrl ? (
                      <img 
                        src={similarProduct.imageUrl} 
                        alt={similarProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary">
                        {similarProduct.stockQuantity || 0} slabs
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{similarProduct.name}</h3>
                    
                    <div className="text-sm mb-3">
                      <span className="text-gray-600">{similarProduct.category}</span>
                    </div>
                    
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/product/${similarProduct.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}