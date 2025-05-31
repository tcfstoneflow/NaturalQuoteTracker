import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Package, Ruler, MapPin, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Lightbox } from "@/components/ui/lightbox";

export default function ProductDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState("");
  const [lightboxTitle, setLightboxTitle] = useState("");

  const { data: product, isLoading } = useQuery({
    queryKey: ["/api/public/products", id],
    queryFn: () => fetch(`/api/public/products/${id}`).then(res => res.json()),
    enabled: !!id,
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
                    <span className="text-gray-600">Thickness:</span>
                    <div className="font-medium">{product.thickness}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Price per sq ft:</span>
                    <div className="font-medium">${product.pricePerSqFt}</div>
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

            {/* Action Button */}
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6">
              Request Quote for {product.name}
            </Button>
          </div>
        </div>

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