import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Globe, Heart, ImageIcon, Calendar, Plus, Trash2, Edit, ExternalLink, Copy, Upload } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Type definitions for API responses
type SalesRepProfile = {
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
};

type Product = {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  price: string;
  description: string | null;
};

type SalesRepFavoriteSlab = {
  id: number;
  salesRepId: number;
  productId: number;
  displayOrder: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  product: Product;
};

type SalesRepPortfolioImage = {
  id: number;
  salesRepId: number;
  imageUrl: string;
  title: string | null;
  description: string | null;
  projectType: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
};

type SalesRepAppointment = {
  id: number;
  salesRepId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  appointmentDate: string;
  appointmentType: string;
  status: string;
  notes: string | null;
  reminderSent: boolean;
  createdAt: string;
};

const profileSchema = z.object({
  urlSlug: z.string().min(3, "URL slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  title: z.string().max(100, "Title must be 100 characters or less").optional(),
  yearsExperience: z.number().min(0).max(50).optional(),
  specialties: z.array(z.string()).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  profileImageUrl: z.string().optional(),
  isPublic: z.boolean(),
});

const favoriteSlabSchema = z.object({
  productId: z.number(),
  notes: z.string().optional(),
});

const portfolioImageSchema = z.object({
  imageUrl: z.string().url("Please enter a valid image URL"),
  title: z.string().optional(),
  description: z.string().optional(),
  projectType: z.string().optional(),
});

export default function SalesRepManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newSpecialty, setNewSpecialty] = useState("");
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [isAddingPortfolioImage, setIsAddingPortfolioImage] = useState(false);
  const [editingPortfolioImage, setEditingPortfolioImage] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading: profileLoading } = useQuery<SalesRepProfile>({
    queryKey: ['/api/sales-rep-profile'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: favorites, isLoading: favoritesLoading } = useQuery<SalesRepFavoriteSlab[]>({
    queryKey: ['/api/sales-rep-favorites'],
  });

  const { data: portfolioImages, isLoading: portfolioLoading } = useQuery<SalesRepPortfolioImage[]>({
    queryKey: ['/api/sales-rep-portfolio'],
  });

  const { data: appointments } = useQuery<SalesRepAppointment[]>({
    queryKey: ['/api/sales-rep-appointments'],
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      urlSlug: "",
      bio: "",
      title: "",
      yearsExperience: 0,
      specialties: [],
      phone: "",
      email: "",
      profileImageUrl: "",
      isPublic: false,
    },
  });

  const favoriteForm = useForm<z.infer<typeof favoriteSlabSchema>>({
    resolver: zodResolver(favoriteSlabSchema),
    defaultValues: {
      productId: 0,
      notes: "",
    },
  });

  const portfolioForm = useForm<z.infer<typeof portfolioImageSchema>>({
    resolver: zodResolver(portfolioImageSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      description: "",
      projectType: "",
    },
  });

  const editPortfolioForm = useForm<z.infer<typeof portfolioImageSchema>>({
    resolver: zodResolver(portfolioImageSchema),
    defaultValues: {
      imageUrl: "",
      title: "",
      description: "",
      projectType: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        urlSlug: profile.urlSlug || "",
        bio: profile.bio || "",
        title: profile.title || "",
        yearsExperience: profile.yearsExperience || 0,
        specialties: profile.specialties || [],
        phone: profile.phone || "",
        email: profile.email || "",
        profileImageUrl: profile.profileImageUrl || "",
        isPublic: profile.isPublic || false,
      });
    }
  }, [profile, profileForm]);

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      return fetch("/api/sales-rep-profile/upload-image", {
        method: "POST",
        body: formData,
      }).then(res => res.json());
    },
    onSuccess: (data) => {
      profileForm.setValue('profileImageUrl', data.imageUrl);
      toast({
        title: "Image uploaded",
        description: "Your profile image has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createOrUpdateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const method = profile ? 'PUT' : 'POST';
      const response = await fetch('/api/sales-rep-profile', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep-profile'] });
      toast({
        title: "Profile Updated",
        description: "Your sales rep profile has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (data: z.infer<typeof favoriteSlabSchema>) => {
      const response = await fetch('/api/sales-rep-favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep-favorites'] });
      setIsAddingFavorite(false);
      favoriteForm.reset();
      toast({
        title: "Favorite Added",
        description: "Slab added to your favorites successfully.",
      });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/sales-rep-favorites/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove favorite');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep-favorites'] });
      toast({
        title: "Favorite Removed",
        description: "Slab removed from your favorites.",
      });
    },
  });

  const addPortfolioImageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof portfolioImageSchema>) => {
      const response = await fetch('/api/sales-rep-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add portfolio image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep-portfolio'] });
      setIsAddingPortfolioImage(false);
      portfolioForm.reset();
      toast({
        title: "Portfolio Updated",
        description: "Image added to your portfolio successfully.",
      });
    },
  });

  const removePortfolioImageMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const response = await fetch(`/api/sales-rep-portfolio/${imageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove portfolio image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep-portfolio'] });
      toast({
        title: "Portfolio Updated",
        description: "Image removed from your portfolio.",
      });
    },
  });

  const editPortfolioImageMutation = useMutation({
    mutationFn: async (data: z.infer<typeof portfolioImageSchema> & { id: number }) => {
      const response = await fetch(`/api/sales-rep-portfolio/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: data.imageUrl,
          title: data.title,
          description: data.description,
          projectType: data.projectType,
        }),
      });
      if (!response.ok) throw new Error('Failed to update portfolio image');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-rep-portfolio'] });
      setEditingPortfolioImage(null);
      editPortfolioForm.reset();
      toast({
        title: "Portfolio Updated",
        description: "Image details updated successfully.",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate(file);
    }
  };

  const onSubmitProfile = (data: z.infer<typeof profileSchema>) => {
    createOrUpdateProfileMutation.mutate(data);
  };

  const onSubmitFavorite = (data: z.infer<typeof favoriteSlabSchema>) => {
    addFavoriteMutation.mutate(data);
  };

  const onSubmitPortfolioImage = (data: z.infer<typeof portfolioImageSchema>) => {
    addPortfolioImageMutation.mutate(data);
  };

  const onSubmitEditPortfolioImage = (data: z.infer<typeof portfolioImageSchema>) => {
    if (editingPortfolioImage) {
      editPortfolioImageMutation.mutate({
        ...data,
        id: editingPortfolioImage.id,
      });
    }
  };

  const handleEditPortfolioImage = (image: any) => {
    setEditingPortfolioImage(image);
    editPortfolioForm.reset({
      imageUrl: image.imageUrl || "",
      title: image.title || "",
      description: image.description || "",
      projectType: image.projectType || "",
    });
  };

  const addSpecialty = () => {
    if (newSpecialty.trim()) {
      const currentSpecialties = profileForm.getValues('specialties') || [];
      if (!currentSpecialties.includes(newSpecialty.trim())) {
        profileForm.setValue('specialties', [...currentSpecialties, newSpecialty.trim()]);
        setNewSpecialty("");
      }
    }
  };

  const removeSpecialty = (specialty: string) => {
    const currentSpecialties = profileForm.getValues('specialties') || [];
    profileForm.setValue('specialties', currentSpecialties.filter(s => s !== specialty));
  };

  const copyProfileUrl = () => {
    const url = `${window.location.origin}/sales-rep/${profileForm.getValues('urlSlug')}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL Copied",
      description: "Profile URL copied to clipboard.",
    });
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Rep Profile</h1>
          <p className="text-gray-600">Manage your public profile and showcase your expertise</p>
        </div>
        {profile?.isPublic && profile?.urlSlug && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={copyProfileUrl}
              className="flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Profile URL
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(`/sales-rep/${profile.urlSlug}`, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View Public Profile
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile Settings</TabsTrigger>
          <TabsTrigger value="favorites">My Favorite Slabs</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio Gallery</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Create your public sales representative profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="urlSlug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile URL</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                /sales-rep/
                              </span>
                              <Input
                                {...field}
                                className="rounded-l-none"
                                placeholder="your-name"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            This will be your unique profile URL. Use lowercase letters, numbers, and hyphens only.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Senior Sales Representative" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="your.email@company.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
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
                      control={profileForm.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min="0"
                              max="50"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="profileImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Image</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <div className="flex items-center gap-4">
                                {field.value && (
                                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                                    <img 
                                      src={field.value} 
                                      alt="Profile preview" 
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadImageMutation.isPending}
                                    className="w-full"
                                  >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {uploadImageMutation.isPending ? "Uploading..." : "Upload Photo"}
                                  </Button>
                                </div>
                              </div>
                              {field.value && (
                                <Input 
                                  {...field} 
                                  placeholder="Image URL will appear here after upload" 
                                  readOnly
                                  className="text-sm text-gray-500"
                                />
                              )}
                            </div>
                          </FormControl>
                          <FormDescription>
                            Upload a professional headshot (JPEG, PNG, or WebP, max 5MB)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Tell potential clients about your experience, expertise, and approach to helping them find the perfect stone for their project..."
                          />
                        </FormControl>
                        <FormDescription>
                          {field.value?.length || 0}/500 characters
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <Label>Specialties</Label>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          placeholder="e.g., Kitchen Countertops, Bathroom Vanities"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                        />
                        <Button type="button" onClick={addSpecialty} variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(profileForm.watch('specialties') || []).map((specialty, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {specialty}
                            <button
                              type="button"
                              onClick={() => removeSpecialty(specialty)}
                              className="ml-1 hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="isPublic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Make Profile Public
                          </FormLabel>
                          <FormDescription>
                            Allow clients to view your profile and book appointments
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createOrUpdateProfileMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    {createOrUpdateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  My Favorite Slabs
                </div>
                <Dialog open={isAddingFavorite} onOpenChange={setIsAddingFavorite}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Favorite
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Favorite Slab</DialogTitle>
                      <DialogDescription>
                        Select a product to add to your favorites showcase
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...favoriteForm}>
                      <form onSubmit={favoriteForm.handleSubmit(onSubmitFavorite)} className="space-y-4">
                        <FormField
                          control={favoriteForm.control}
                          name="productId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Product</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((product: any) => (
                                    <SelectItem key={product.id} value={product.id.toString()}>
                                      {product.name} - {product.category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={favoriteForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Personal Note (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Why do you recommend this slab? What makes it special?"
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" disabled={addFavoriteMutation.isPending} className="w-full">
                          {addFavoriteMutation.isPending ? "Adding..." : "Add to Favorites"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Showcase your recommended slabs to potential clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {favoritesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : favorites && favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((favorite) => (
                    <div key={favorite.id} className="border rounded-lg overflow-hidden">
                      <div className="aspect-video bg-gray-100">
                        {favorite.product.imageUrl ? (
                          <img 
                            src={favorite.product.imageUrl} 
                            alt={favorite.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold">{favorite.product.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{favorite.product.category}</p>
                        {favorite.notes && (
                          <p className="text-sm text-gray-700 italic mb-3">"{favorite.notes}"</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFavoriteMutation.mutate(favorite.productId)}
                          disabled={removeFavoriteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No favorite slabs added yet</p>
                  <p className="text-sm text-gray-500">Add your recommended products to showcase to clients</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Portfolio Gallery
                </div>
                <Dialog open={isAddingPortfolioImage} onOpenChange={setIsAddingPortfolioImage}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Image
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Portfolio Image</DialogTitle>
                      <DialogDescription>
                        Add a project image to showcase your work
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...portfolioForm}>
                      <form onSubmit={portfolioForm.handleSubmit(onSubmitPortfolioImage)} className="space-y-4">
                        <FormField
                          control={portfolioForm.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Image</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  <Input {...field} placeholder="https://example.com/project-image.jpg" />
                                  <div className="text-center">
                                    <span className="text-sm text-gray-500">or</span>
                                  </div>
                                  <div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const url = URL.createObjectURL(file);
                                          field.onChange(url);
                                        }
                                      }}
                                      className="hidden"
                                      ref={fileInputRef}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => fileInputRef.current?.click()}
                                      className="w-full"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      Upload Image File
                                    </Button>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={portfolioForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Kitchen Renovation Project" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={portfolioForm.control}
                          name="projectType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Project Type (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select project type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="kitchen">Kitchen</SelectItem>
                                  <SelectItem value="bathroom">Bathroom</SelectItem>
                                  <SelectItem value="commercial">Commercial</SelectItem>
                                  <SelectItem value="outdoor">Outdoor</SelectItem>
                                  <SelectItem value="fireplace">Fireplace</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={portfolioForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description (Optional)</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Describe the project, materials used, or special features..."
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" disabled={addPortfolioImageMutation.isPending} className="w-full">
                          {addPortfolioImageMutation.isPending ? "Adding..." : "Add to Portfolio"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>
                Showcase your completed projects and installations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {portfolioLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : portfolioImages && portfolioImages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portfolioImages.map((image) => (
                    <div key={image.id} className="border rounded-lg overflow-hidden">
                      <div className="aspect-square bg-gray-100">
                        <img 
                          src={image.imageUrl} 
                          alt={image.title || "Portfolio image"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        {image.title && (
                          <h3 className="font-semibold mb-1">{image.title}</h3>
                        )}
                        {image.projectType && (
                          <Badge variant="outline" className="mb-2">{image.projectType}</Badge>
                        )}
                        {image.description && (
                          <p className="text-sm text-gray-700 mb-3">{image.description}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPortfolioImage(image)}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePortfolioImageMutation.mutate(image.id)}
                            disabled={removePortfolioImageMutation.isPending}
                            className="flex-1"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No portfolio images added yet</p>
                  <p className="text-sm text-gray-500">Add project photos to showcase your work</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Portfolio Image Dialog */}
          <Dialog open={!!editingPortfolioImage} onOpenChange={() => setEditingPortfolioImage(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Portfolio Image</DialogTitle>
                <DialogDescription>
                  Update the details for this portfolio image
                </DialogDescription>
              </DialogHeader>
              <Form {...editPortfolioForm}>
                <form onSubmit={editPortfolioForm.handleSubmit(onSubmitEditPortfolioImage)} className="space-y-4">
                  <FormField
                    control={editPortfolioForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                            <div className="text-center">
                              <span className="text-sm text-gray-500">or</span>
                            </div>
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    field.onChange(url);
                                  }
                                }}
                                className="hidden"
                                ref={editFileInputRef}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => editFileInputRef.current?.click()}
                                className="w-full"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Upload Image File
                              </Button>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPortfolioForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Modern Kitchen Transformation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPortfolioForm.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type (Optional)</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kitchen">Kitchen</SelectItem>
                              <SelectItem value="bathroom">Bathroom</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                              <SelectItem value="outdoor">Outdoor</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editPortfolioForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the project, materials used, or special features..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setEditingPortfolioImage(null)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={editPortfolioImageMutation.isPending} 
                      className="flex-1"
                    >
                      {editPortfolioImageMutation.isPending ? "Updating..." : "Update Image"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Appointment Requests
              </CardTitle>
              <CardDescription>
                Manage client appointment requests from your public profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appointments && appointments.length > 0 ? (
                <div className="space-y-4">
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{appointment.clientName}</h3>
                          <p className="text-sm text-gray-600">{appointment.clientEmail}</p>
                          {appointment.clientPhone && (
                            <p className="text-sm text-gray-600">{appointment.clientPhone}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>📅 {new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                            <span>🕒 {new Date(appointment.appointmentDate).toLocaleTimeString()}</span>
                            <Badge variant={
                              appointment.status === 'pending' ? 'secondary' :
                              appointment.status === 'confirmed' ? 'default' :
                              appointment.status === 'completed' ? 'default' : 'destructive'
                            }>
                              {appointment.status}
                            </Badge>
                          </div>
                          {appointment.notes && (
                            <p className="text-sm mt-2 p-2 bg-gray-50 rounded">{appointment.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No appointment requests yet</p>
                  <p className="text-sm text-gray-500">Clients can book appointments through your public profile</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}