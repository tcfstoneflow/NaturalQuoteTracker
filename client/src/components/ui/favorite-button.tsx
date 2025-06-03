import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useClientEmail, useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/hooks/use-toast";

interface FavoriteButtonProps {
  productId: number;
  productName: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function FavoriteButton({ 
  productId, 
  productName, 
  className, 
  variant = "outline", 
  size = "default" 
}: FavoriteButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  const { clientEmail, saveClientEmail, hasClientEmail } = useClientEmail();
  const { toggleFavorite, isProductFavorited, isAddingFavorite, isRemovingFavorite } = useFavorites(clientEmail);
  const { toast } = useToast();

  const isFavorited = hasClientEmail && isProductFavorited(productId);
  const isLoading = isAddingFavorite || isRemovingFavorite;

  const handleFavoriteClick = () => {
    if (hasClientEmail) {
      toggleFavorite(productId, clientEmail, notes);
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to save favorites",
        variant: "destructive",
      });
      return;
    }

    // Save client email
    saveClientEmail(email.trim(), rememberMe);

    // Add to favorites with optional notes
    toggleFavorite(productId, email.trim(), notes.trim() || undefined);

    // Close dialog and reset form
    setIsDialogOpen(false);
    setEmail("");
    setName("");
    setNotes("");
    setRememberMe(false);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleFavoriteClick}
        disabled={isLoading}
      >
        <Heart 
          className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''} ${size === "icon" ? "" : "mr-2"}`} 
        />
        {size !== "icon" && (isFavorited ? "Favorited" : "Save Favorite")}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Save {productName} to Favorites</DialogTitle>
              <DialogDescription>
                Enter your contact information to save this slab to your favorites. 
                We'll use this to help with your consultation.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why do you like this slab? Any specific project details..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="remember" className="text-sm">
                  Remember me for future visits
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save to Favorites"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}