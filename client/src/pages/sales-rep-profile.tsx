import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Mail, Phone, User, MapPin, Star, ImageIcon, Globe2 } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Client consultation form schema
const consultationSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters"),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientPhone: z.string().min(10, "Please enter a valid phone number"),
  projectType: z.string().min(1, "Please select a project type"),
  projectDescription: z.string().min(10, "Please provide project details (at least 10 characters)"),
  budget: z.string().optional(),
  timeline: z.string().optional(),
  preferredContactMethod: z.string().min(1, "Please select a preferred contact method"),
});

type ConsultationFormData = z.infer<typeof consultationSchema>;

type SalesRepProfileData = {
  profile: {
    id: number;
    userId: number;
    urlSlug: string;
    bio: string | null;
    title: string | null;
    yearsExperience: number | null;
    specialties: string[] | null;
    phone: string | null;
    email: string | null;
    profileImageUrl: string | null;
    isPublic: boolean;
    customization: any;
    createdAt: string;
    updatedAt: string;
    userName: string;
  };
  favoriteSlabs: Array<{
    id: number;
    salesRepId: number;
    productId: number;
    displayOrder: number;
    notes: string | null;
    isActive: boolean;
    createdAt: string;
    product: {
      id: number;
      name: string;
      category: string;
      imageUrl: string | null;
      price: string;
      description: string | null;
    };
  }>;
  portfolioImages: Array<{
    id: number;
    salesRepId: number;
    imageUrl: string;
    title: string | null;
    description: string | null;
    projectType: string | null;
    productsUsed: string[] | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
  }>;
};



export default function SalesRepProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [selectedPortfolioImage, setSelectedPortfolioImage] = useState<any>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [consultationContext, setConsultationContext] = useState<string>("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const consultationForm = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      projectType: "",
      projectDescription: "",
      budget: "",
      timeline: "",
      preferredContactMethod: "",
    },
  });

  const { data: profileData, isLoading } = useQuery<SalesRepProfileData>({
    queryKey: [`/api/public/sales-rep/${slug}`],
    enabled: !!slug,
  });

  // Fetch slabs for selected product
  const { data: productSlabs = [] } = useQuery({
    queryKey: ["/api/public/slabs", selectedProduct?.bundleId],
    queryFn: () => 
      fetch(`/api/public/slabs?bundleId=${encodeURIComponent(selectedProduct?.bundleId || '')}`).then(res => res.json()),
    enabled: !!selectedProduct?.bundleId,
  });

  // Fetch all products for linking
  const { data: allProducts } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => fetch('/api/products').then(res => res.json()),
  });

  // Submit consultation request
  const submitConsultationMutation = useMutation({
    mutationFn: async (data: ConsultationFormData) => {
      const response = await fetch('/api/client-consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          salesRepId: profile.id,
          context: consultationContext,
        }),
      });
      if (!response.ok) throw new Error('Failed to submit consultation request');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Consultation Request Submitted",
        description: "Your consultation request has been sent successfully. The sales representative will contact you soon.",
      });
      setIsConsultationModalOpen(false);
      consultationForm.reset();
      setConsultationContext("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit consultation request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const openConsultationModal = (context: string = "") => {
    setConsultationContext(context);
    setIsConsultationModalOpen(true);
  };

  const onSubmitConsultation = (data: ConsultationFormData) => {
    submitConsultationMutation.mutate(data);
  };





  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData?.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
          <p className="text-gray-600">The sales representative profile you're looking for doesn't exist or is not public.</p>
        </div>
      </div>
    );
  }

  const { profile, favoriteSlabs, portfolioImages } = profileData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {profile.profileImageUrl ? (
                <img 
                  src={profile.profileImageUrl} 
                  alt={`Profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 md:w-16 md:h-16 text-gray-400" />
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {profile.userName}
              </h1>
              {profile.title && (
                <p className="text-xl text-gray-600 mb-4">{profile.title}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                {profile.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${profile.phone}`} className="hover:text-blue-600 transition-colors">
                      {profile.phone}
                    </a>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <a href={`mailto:${profile.email}`} className="hover:text-blue-600 transition-colors">
                      {profile.email}
                    </a>
                  </div>
                )}
              </div>

              {profile.specialties && profile.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

              {profile.bio && (
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              )}
            </div>

            <Button 
              size="lg" 
              className="whitespace-nowrap"
              onClick={() => {
                const subject = `Consultation Request from ${profile.userName}`;
                const body = `Hi ${profile.userName},\n\nI'm interested in discussing a natural stone project and would like to schedule a consultation.\n\nThank you!`;
                window.open(`mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact {profile.userName}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* My Favorite Slabs */}
            {favoriteSlabs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    My Favorite Slabs
                  </CardTitle>
                  <CardDescription>
                    Handpicked selections that I recommend for your project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {favoriteSlabs.map((favorite) => (
                      <div 
                        key={favorite.id} 
                        className="group border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(favorite.product);
                          setIsProductDetailsOpen(true);
                        }}
                      >
                        <div className="aspect-video bg-gray-100 overflow-hidden">
                          {favorite.product.imageUrl ? (
                            <img 
                              src={favorite.product.imageUrl} 
                              alt={favorite.product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-1">{favorite.product.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{favorite.product.category}</p>
                          {favorite.notes && (
                            <p className="text-sm text-gray-700 italic">"{favorite.notes}"</p>
                          )}
                          <p className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view details
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Portfolio Gallery */}
          {portfolioImages.length > 0 && (
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Portfolio Gallery
                  </CardTitle>
                  <CardDescription>
                    Recent projects and installations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {portfolioImages.map((image) => (
                      <div 
                        key={image.id} 
                        className="group border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        onClick={() => {
                          setSelectedPortfolioImage(image);
                          setIsPortfolioModalOpen(true);
                        }}
                      >
                        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                          <img 
                            src={image.imageUrl} 
                            alt={image.title || "Portfolio image"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        {(image.title || image.description || image.projectType || (image.productsUsed && image.productsUsed.length > 0)) && (
                          <div className="p-6">
                            {image.title && (
                              <h4 className="font-semibold text-gray-900 mb-2 text-lg">{image.title}</h4>
                            )}
                            {image.projectType && (
                              <Badge variant="outline" className="mb-3 text-sm px-3 py-1">{image.projectType}</Badge>
                            )}
                            {image.description && (
                              <p className="text-gray-600 leading-relaxed mb-3">{image.description}</p>
                            )}
                            {image.productsUsed && image.productsUsed.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Products Used:</p>
                                <div className="flex flex-wrap gap-2">
                                  {image.productsUsed.map((product, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {product}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Specialties Section */}
          {profile.specialties && profile.specialties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specialties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {profile.specialties.map((specialty, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm font-medium">{specialty}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>


      </div>

      {/* Product Details Modal */}
      <Dialog open={isProductDetailsOpen} onOpenChange={setIsProductDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedProduct?.category} • {selectedProduct?.supplier}
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
                      <span>{selectedProduct.material || selectedProduct.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Grade:</span>
                      <span>{selectedProduct.grade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Finish:</span>
                      <span>{selectedProduct.finish}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Thickness:</span>
                      <span>{selectedProduct.thickness}</span>
                    </div>
                    {selectedProduct.description && (
                      <div className="pt-2">
                        <span className="text-gray-600">Description:</span>
                        <p className="text-sm mt-1" 
                           dangerouslySetInnerHTML={{
                             __html: selectedProduct.description
                               .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                               .replace(/\*(.*?)\*/g, '<em>$1</em>')
                           }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Availability</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bundle ID:</span>
                      <span>{selectedProduct.bundleId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available Slabs:</span>
                      <span className="font-semibold">
                        {productSlabs?.filter((slab: any) => slab.status === 'available').length || selectedProduct.stockQuantity || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Slabs */}
              {productSlabs && Array.isArray(productSlabs) && productSlabs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Individual Slabs Available</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                    {productSlabs
                      .filter((slab: any) => slab.status === 'available')
                      .map((slab: any) => (
                        <div 
                          key={slab.id} 
                          className="border-2 border-gray-200 rounded-lg bg-white p-3"
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
                    const subject = `Consultation Request - ${selectedProduct.name}`;
                    const body = `Hi ${profile.userName},\n\nI'm interested in the ${selectedProduct.name} and would like to schedule a consultation to discuss this product.\n\nThank you!`;
                    window.open(`mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                  }}
                >
                  Schedule Consultation
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const subject = `Interest in ${selectedProduct.name}`;
                    const body = `Hello ${profile.userName},\n\nI'm interested in learning more about the ${selectedProduct.name} from your recommendations.\n\nPlease contact me to discuss details.\n\nThank you!`;
                    window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  }}
                >
                  Contact About This Slab
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Portfolio Image Modal */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={setIsPortfolioModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedPortfolioImage?.title || "Portfolio Project"}
            </DialogTitle>
            <DialogDescription>
              Project details and information
            </DialogDescription>
          </DialogHeader>
          
          {selectedPortfolioImage && (
            <div className="space-y-6">
              {/* Main Image */}
              <div className="aspect-[16/10] bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={selectedPortfolioImage.imageUrl} 
                  alt={selectedPortfolioImage.title || "Portfolio image"}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {selectedPortfolioImage.title && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Project Title</h3>
                      <p className="text-gray-700">{selectedPortfolioImage.title}</p>
                    </div>
                  )}
                  
                  {selectedPortfolioImage.projectType && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Project Type</h3>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {selectedPortfolioImage.projectType}
                      </Badge>
                    </div>
                  )}
                  
                  {selectedPortfolioImage.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-700 leading-relaxed">{selectedPortfolioImage.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedPortfolioImage.productsUsed && selectedPortfolioImage.productsUsed.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Products Used in This Project</h3>
                      <div className="space-y-2">
                        {selectedPortfolioImage.productsUsed.map((product, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                              // Find the product by name and open its page
                              const foundProduct = allProducts?.find((p: any) => p.name === product);
                              if (foundProduct) {
                                window.open(`/inventory?product=${foundProduct.id}`, '_blank');
                              } else {
                                // Fallback: search for the product name in inventory
                                window.open(`/inventory?search=${encodeURIComponent(product)}`, '_blank');
                              }
                            }}
                          >
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-800">{product}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Interested in This Project?</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Contact {profile.userName} to discuss similar projects or get more details about the materials used.
                    </p>
                    <div className="space-y-2">
                      <Button 
                        className="w-full"
                        onClick={() => {
                          const context = `Portfolio Project${selectedPortfolioImage.title ? `: ${selectedPortfolioImage.title}` : ''}`;
                          setIsPortfolioModalOpen(false);
                          openConsultationModal(context);
                        }}
                      >
                        Schedule Consultation
                      </Button>
                      {profile.email && (
                        <Button 
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const subject = `Interest in Portfolio Project${selectedPortfolioImage.title ? `: ${selectedPortfolioImage.title}` : ''}`;
                            const body = `Hello ${profile.userName},\n\nI'm interested in learning more about one of your portfolio projects${selectedPortfolioImage.title ? ` - "${selectedPortfolioImage.title}"` : ''}.\n\nI'd like to discuss creating something similar for my space.\n\nPlease contact me to discuss details.\n\nThank you!`;
                            window.location.href = `mailto:${profile.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          }}
                        >
                          Email About This Project
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Footer */}
      <div className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Ready to Work Together?</h2>
            <p className="text-gray-300">Contact {profile.userName} to discuss your project</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {profile.phone && (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="font-semibold">Call Direct</h3>
                <a 
                  href={`tel:${profile.phone}`} 
                  className="text-blue-400 hover:text-blue-300 transition-colors block"
                >
                  {profile.phone}
                </a>
              </div>
            )}
            
            {profile.email && (
              <div className="space-y-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-semibold">Send Email</h3>
                <a 
                  href={`mailto:${profile.email}`} 
                  className="text-blue-400 hover:text-blue-300 transition-colors block"
                >
                  {profile.email}
                </a>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-semibold">Schedule Meeting</h3>
              <Button 
                onClick={() => openConsultationModal("General consultation request")}
                variant="outline"
                className="bg-transparent border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white"
              >
                Book Consultation
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Client Consultation Modal */}
      <Dialog open={isConsultationModalOpen} onOpenChange={setIsConsultationModalOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Schedule Consultation</DialogTitle>
            <DialogDescription>
              Let's connect you with {profile.userName} for your natural stone project.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...consultationForm}>
            <form onSubmit={consultationForm.handleSubmit(onSubmitConsultation)} className="space-y-4">
              {consultationContext && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <strong>Interest:</strong> {consultationContext}
                </div>
              )}
              
              <FormField
                control={consultationForm.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter your full name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={consultationForm.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="your.email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={consultationForm.control}
                name="clientPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(555) 123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={consultationForm.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kitchen">Kitchen Countertops</SelectItem>
                        <SelectItem value="bathroom">Bathroom Vanity</SelectItem>
                        <SelectItem value="fireplace">Fireplace Surround</SelectItem>
                        <SelectItem value="flooring">Flooring</SelectItem>
                        <SelectItem value="outdoor">Outdoor/Patio</SelectItem>
                        <SelectItem value="commercial">Commercial Project</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={consultationForm.control}
                name="projectDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Tell us about your project - dimensions, style preferences, timeline, etc."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={consultationForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Range (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. $5,000-$10,000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={consultationForm.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeline (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 2-3 months" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={consultationForm.control}
                name="preferredContactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How should we contact you?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="text">Text Message</SelectItem>
                        <SelectItem value="either">Either Phone or Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsConsultationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitConsultationMutation.isPending}
                >
                  {submitConsultationMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}