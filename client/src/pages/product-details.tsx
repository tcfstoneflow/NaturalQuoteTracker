import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Package, Ruler, MapPin, Calendar, Eye, Home, Bath, ChefHat, Wand2, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Lightbox } from "@/components/ui/lightbox";
import { SocialShare } from "@/components/ui/social-share";

export default function ProductDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");
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

  // Fetch similar products (same category)
  const { data: allProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    enabled: !!product?.category,
  });

  const similarProducts = allProducts
    .filter((p: any) => p.category === product?.category && p.id !== product?.id)
    .slice(0, 3);

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
          {/* Product Image */}
          <div className="space-y-4">
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
            
            {product.imageUrl && (
              <p className="text-sm text-gray-600 text-center">
                Click image to view full size
              </p>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-lg text-gray-600 mb-4">
                {product.category} • {product.grade} Grade
              </p>
              
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono bg-gray-100 px-3 py-1 rounded text-sm">
                  ID: {product.bundleId}
                </span>
                <Badge variant={availableSlabs.length > 5 ? "default" : "secondary"}>
                  {availableSlabs.length} slabs available
                </Badge>
              </div>
            </div>

            {/* Product Specifications */}
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Supplier:</span>
                    <div className="font-medium">{product.supplier}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <div className="font-medium capitalize">{product.category}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Grade:</span>
                    <div className="font-medium">{product.grade} Grade</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Finish:</span>
                    <div className="font-medium">{product.finish}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Thickness:</span>
                    <div className="font-medium">{product.thickness}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Price per sq ft:</span>
                    <div className="font-medium">${product.price}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <div className="font-medium">{product.location || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {product.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{product.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Social Sharing */}
            <SocialShare
              url={window.location.href}
              title={product.name}
              description={`${product.category} from ${product.supplier} - ${product.grade} grade with ${product.finish} finish`}
              imageUrl={product.imageUrl || undefined}
              price={`$${product.price}`}
            />

            {/* Action Button */}
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6">
              Request Quote for {product.name}
            </Button>
          </div>
        </div>

        {/* Installation Gallery */}
        {galleryImages.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">See {product.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {galleryImages.map((image: any) => (
                <div 
                  key={image.id}
                  className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden rounded-lg cursor-pointer hover:shadow-lg transition-shadow duration-300"
                  onClick={() => openLightbox(image.imageUrl)}
                >
                  <img 
                    src={image.imageUrl} 
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Click any image to view full size. See how {product.name} transforms spaces with its natural beauty.
              </p>
            </div>
          </div>
        )}

        {/* Available Slabs */}
        {availableSlabs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Available Slabs ({availableSlabs.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </div>
        )}

        {/* Similar Products Section */}
        {similarProducts.length > 0 && (
          <div className="mt-16 border-t pt-12">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Similar {product?.category} Products
              </h2>
              <Button 
                variant="outline"
                onClick={() => setLocation(`/public-inventory?category=${product?.category}`)}
              >
                View All {product?.category}
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarProducts.map((similarProduct: any) => (
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
                    <p className="text-sm text-gray-600 mb-3">
                      {similarProduct.supplier} • {similarProduct.finish}
                    </p>
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">ID: {similarProduct.bundleId}</span>
                      <span className="font-medium">${similarProduct.price}/sq ft</span>
                    </div>
                    
                    <Button 
                      className="w-full mt-4"
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
            
            {allProducts.filter((p: any) => p.category === product?.category && p.id !== product?.id).length > 3 && (
              <div className="text-center mt-8">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => setLocation(`/public-inventory?category=${product?.category}`)}
                >
                  View {allProducts.filter((p: any) => p.category === product?.category && p.id !== product?.id).length - 3} More {product?.category} Products
                </Button>
              </div>
            )}
          </div>
        )}
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