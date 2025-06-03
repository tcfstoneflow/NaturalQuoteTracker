import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, X, Mail, ArrowLeft, Calendar } from "lucide-react";
import { useLocation } from "wouter";
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
import { useClientEmail, useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/hooks/use-toast";

const quoteRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  message: z.string().min(1, "Message is required"),
});

const consultationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  projectType: z.string().min(1, "Project type is required"),
  message: z.string().min(1, "Please describe your project"),
});

type QuoteRequestData = z.infer<typeof quoteRequestSchema>;
type ConsultationData = z.infer<typeof consultationSchema>;

export default function ClientFavorites() {
  const [, setLocation] = useLocation();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { clientEmail, hasClientEmail, clearClientEmail } = useClientEmail();
  const { favorites, isLoading, removeFavorite, isRemovingFavorite } = useFavorites(clientEmail);
  const { toast } = useToast();

  const quoteForm = useForm<QuoteRequestData>({
    resolver: zodResolver(quoteRequestSchema),
    defaultValues: {
      name: "",
      email: clientEmail || "",
      phone: "",
      message: "",
    },
  });

  const consultationForm = useForm<ConsultationData>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      name: "",
      email: clientEmail || "",
      phone: "",
      preferredDate: "",
      preferredTime: "",
      projectType: "",
      message: "",
    },
  });

  if (!hasClientEmail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <Heart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>
          <p className="text-gray-600 mb-6">
            Sign in with your email to view and manage your favorite slabs.
          </p>
          <Button onClick={() => setLocation("/public-inventory")}>
            Browse Inventory
          </Button>
        </div>
      </div>
    );
  }

  const handleRemoveFavorite = (productId: number) => {
    removeFavorite({ clientEmail, productId });
  };

  const handleQuoteRequest = (product: any) => {
    setSelectedProduct(product);
    quoteForm.setValue("message", `I'm interested in ${product.name} and would like to request a quote. This is one of my favorite slabs.`);
    setQuoteDialogOpen(true);
  };

  const handleScheduleConsultation = () => {
    const favoritesList = favorites.map(fav => `• ${fav.product.name} (${fav.product.category})`).join('\n');
    consultationForm.setValue("message", 
      `I'd like to schedule a consultation to discuss my project. I have ${favorites.length} favorite slabs I'd like to review:\n\n${favoritesList}\n\nPlease help me select the best materials for my project.`
    );
    setConsultationDialogOpen(true);
  };

  const onQuoteSubmit = async (data: QuoteRequestData) => {
    try {
      await apiRequest("POST", "/api/quote-requests", data);
      toast({
        title: "Quote request sent",
        description: "We'll get back to you soon!",
      });
      setQuoteDialogOpen(false);
      quoteForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send quote request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onConsultationSubmit = async (data: ConsultationData) => {
    try {
      const favoriteProducts = favorites.map(fav => ({
        id: fav.product.id,
        name: fav.product.name,
        category: fav.product.category,
        notes: fav.notes
      }));

      const consultationData = {
        ...data,
        favoriteProducts,
        source: 'favorites_page'
      };

      await apiRequest("POST", "/api/consultations", consultationData);
      toast({
        title: "Consultation scheduled",
        description: "We'll contact you soon to discuss your project and favorites!",
      });
      setConsultationDialogOpen(false);
      consultationForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule consultation. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-48 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/public-inventory")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
            <h1 className="text-3xl font-bold">Your Favorites</h1>
            <p className="text-gray-600 mt-2">
              {favorites.length} favorite{favorites.length !== 1 ? 's' : ''} saved for {clientEmail}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {favorites.length > 0 && (
              <Button 
                onClick={handleScheduleConsultation}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Consultation
              </Button>
            )}
            <Button variant="outline" onClick={clearClientEmail}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
            <p className="text-gray-600 mb-6">
              Start browsing our inventory and save your favorite slabs here.
            </p>
            <Button onClick={() => setLocation("/public-inventory")}>
              Browse Inventory
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  {favorite.product.imageUrl ? (
                    <img 
                      src={favorite.product.imageUrl} 
                      alt={favorite.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={() => handleRemoveFavorite(favorite.productId)}
                    disabled={isRemovingFavorite}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{favorite.product.name}</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <Badge variant="secondary">{favorite.product.category}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Grade:</span>
                      <span>{favorite.product.grade}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Supplier:</span>
                      <span>{favorite.product.supplier}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Price:</span>
                      <span>${favorite.product.price}</span>
                    </div>
                  </div>

                  {favorite.notes && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{favorite.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/product/${favorite.productId}`)}
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleQuoteRequest(favorite.product)}
                      className="flex-1"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quote Request Dialog */}
        <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
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
                        <Input placeholder="your.email@example.com" {...field} />
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
                      <FormLabel>Phone</FormLabel>
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
                  <Button type="submit">
                    Send Request
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Consultation Dialog */}
        <Dialog open={consultationDialogOpen} onOpenChange={setConsultationDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Schedule Consultation</DialogTitle>
              <DialogDescription>
                Let's discuss your project and review your {favorites.length} favorite slabs.
              </DialogDescription>
            </DialogHeader>
            <Form {...consultationForm}>
              <form onSubmit={consultationForm.handleSubmit(onConsultationSubmit)} className="space-y-4">
                <FormField
                  control={consultationForm.control}
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
                  control={consultationForm.control}
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
                  control={consultationForm.control}
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={consultationForm.control}
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
                    control={consultationForm.control}
                    name="preferredTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={consultationForm.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full p-2 border border-gray-300 rounded-md">
                          <option value="">Select project type</option>
                          <option value="Kitchen Countertops">Kitchen Countertops</option>
                          <option value="Bathroom Vanity">Bathroom Vanity</option>
                          <option value="Island">Kitchen Island</option>
                          <option value="Fireplace">Fireplace Surround</option>
                          <option value="Commercial">Commercial Project</option>
                          <option value="Other">Other</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={consultationForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your project and any specific questions..."
                          className="min-h-[120px]"
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
                    onClick={() => setConsultationDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Consultation
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