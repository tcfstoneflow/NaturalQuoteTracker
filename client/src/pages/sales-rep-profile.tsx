import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Mail, Phone, User, MapPin, Star, ImageIcon, CalendarPlus, Globe2 } from "lucide-react";
import { format } from "date-fns";

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

type AppointmentForm = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  appointmentDate: string;
  appointmentType: string;
  notes: string;
};

export default function SalesRepProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isProductDetailsOpen, setIsProductDetailsOpen] = useState(false);
  const [selectedPortfolioImage, setSelectedPortfolioImage] = useState<any>(null);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    appointmentDate: "",
    appointmentType: "consultation",
    notes: "",
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

  const bookAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await fetch("/api/sales-rep-appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appointmentData),
      });
      if (!response.ok) throw new Error("Failed to book appointment");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Appointment Requested",
        description: "Your appointment request has been submitted. We'll contact you soon to confirm.",
      });
      setIsBookingOpen(false);
      setAppointmentForm({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        appointmentDate: "",
        appointmentType: "consultation",
        notes: "",
      });
    },
    onError: () => {
      toast({
        title: "Booking Failed",
        description: "Failed to submit appointment request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleBookAppointment = () => {
    if (!profileData?.profile) return;
    
    const appointmentData = {
      salesRepId: profileData.profile.userId,
      ...appointmentForm,
      appointmentDate: new Date(appointmentForm.appointmentDate).toISOString(),
    };
    
    bookAppointmentMutation.mutate(appointmentData);
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
                {profile.yearsExperience && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    <span>{profile.yearsExperience} years experience</span>
                  </div>
                )}
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

            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="whitespace-nowrap">
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Book Appointment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Book an Appointment</DialogTitle>
                  <DialogDescription>
                    Schedule a consultation with our sales representative
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Your Name</Label>
                    <Input
                      id="clientName"
                      value={appointmentForm.clientName}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={appointmentForm.clientEmail}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="clientPhone">Phone Number</Label>
                    <Input
                      id="clientPhone"
                      value={appointmentForm.clientPhone}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="appointmentDate">Preferred Date & Time</Label>
                    <Input
                      id="appointmentDate"
                      type="datetime-local"
                      value={appointmentForm.appointmentDate}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="appointmentType">Appointment Type</Label>
                    <Select
                      value={appointmentForm.appointmentType}
                      onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, appointmentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="showroom_visit">Showroom Visit</SelectItem>
                        <SelectItem value="site_visit">Site Visit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={appointmentForm.notes}
                      onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Tell us about your project or any specific requirements..."
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleBookAppointment}
                    disabled={!appointmentForm.clientName || !appointmentForm.clientEmail || !appointmentForm.appointmentDate || bookAppointmentMutation.isPending}
                    className="w-full"
                  >
                    {bookAppointmentMutation.isPending ? "Booking..." : "Submit Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${profile.phone}`} className="text-blue-600 hover:underline">
                      {profile.phone}
                    </a>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                      {profile.email}
                    </a>
                  </div>
                )}
                <Button 
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Consultation
                </Button>
              </CardContent>
            </Card>

            {profile.specialties && profile.specialties.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Specialties</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {profile.specialties.map((specialty, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-sm">{specialty}</span>
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
                  onClick={() => setIsBookingOpen(true)}
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
                          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm font-medium">{product}</span>
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
                          setIsPortfolioModalOpen(false);
                          setIsBookingOpen(true);
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
    </div>
  );
}