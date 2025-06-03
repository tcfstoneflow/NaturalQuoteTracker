import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface ClientFavorite {
  id: number;
  clientEmail: string;
  productId: number;
  notes?: string;
  createdAt: Date;
  product: {
    id: number;
    name: string;
    category: string;
    grade: string;
    imageUrl: string;
    price: string;
    supplier: string;
  };
}

export function useFavorites(clientEmail?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get client favorites
  const { data: favorites = [], isLoading, error } = useQuery<ClientFavorite[]>({
    queryKey: ["/api/favorites", clientEmail],
    enabled: !!clientEmail,
    retry: false,
  });

  // Add favorite mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async ({ clientEmail, productId, notes }: { 
      clientEmail: string; 
      productId: number; 
      notes?: string; 
    }) => {
      const response = await apiRequest("POST", "/api/favorites", {
        clientEmail,
        productId,
        notes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", clientEmail] });
      toast({
        title: "Added to favorites",
        description: "This slab has been saved to your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add favorite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async ({ clientEmail, productId }: { 
      clientEmail: string; 
      productId: number; 
    }) => {
      await apiRequest("DELETE", `/api/favorites/${encodeURIComponent(clientEmail)}/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", clientEmail] });
      toast({
        title: "Removed from favorites",
        description: "This slab has been removed from your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove favorite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if product is favorited
  const isProductFavorited = (productId: number): boolean => {
    return favorites.some(fav => fav.productId === productId);
  };

  // Toggle favorite status
  const toggleFavorite = (productId: number, clientEmail: string, notes?: string) => {
    if (isProductFavorited(productId)) {
      removeFavoriteMutation.mutate({ clientEmail, productId });
    } else {
      addFavoriteMutation.mutate({ clientEmail, productId, notes });
    }
  };

  return {
    favorites,
    isLoading,
    error,
    addFavorite: addFavoriteMutation.mutate,
    removeFavorite: removeFavoriteMutation.mutate,
    toggleFavorite,
    isProductFavorited,
    isAddingFavorite: addFavoriteMutation.isPending,
    isRemovingFavorite: removeFavoriteMutation.isPending,
  };
}

export function useClientEmail() {
  const [clientEmail, setClientEmail] = useState<string>("");

  useEffect(() => {
    // Try to get email from localStorage or session
    const savedEmail = localStorage.getItem("clientEmail") || sessionStorage.getItem("clientEmail");
    if (savedEmail) {
      setClientEmail(savedEmail);
    }
  }, []);

  const saveClientEmail = (email: string, remember = false) => {
    setClientEmail(email);
    if (remember) {
      localStorage.setItem("clientEmail", email);
      sessionStorage.removeItem("clientEmail");
    } else {
      sessionStorage.setItem("clientEmail", email);
      localStorage.removeItem("clientEmail");
    }
  };

  const clearClientEmail = () => {
    setClientEmail("");
    localStorage.removeItem("clientEmail");
    sessionStorage.removeItem("clientEmail");
  };

  return {
    clientEmail,
    saveClientEmail,
    clearClientEmail,
    hasClientEmail: !!clientEmail,
  };
}