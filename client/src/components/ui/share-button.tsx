import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check, Mail } from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp } from "react-icons/fa";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  price?: string;
}

export function ShareButton({ url, title, description, price }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(`${title} | TCF Supply`);
  const encodedDescription = encodeURIComponent(
    description || `Check out this beautiful ${title} from TCF Supply${price ? ` - Starting at ${price}/sqft` : ''}`
  );

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Product link copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=naturalstone,countertops,stone`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    instagram: url, // For Instagram, we'll just copy the link
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0AView this product: ${encodedUrl}`,
  };

  const openShareWindow = (shareUrl: string, platform: string) => {
    if (platform === 'instagram') {
      // Copy link to clipboard and provide instructions
      copyToClipboard();
      toast({
        title: "Instagram Sharing",
        description: "Link copied! Open Instagram and paste the link in your story, post, or bio.",
      });
      
      // Try to open Instagram app on mobile, fallback to web
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
        // Try to open Instagram app
        window.location.href = 'instagram://';
        
        // Fallback to Instagram web after a delay
        setTimeout(() => {
          window.open('https://www.instagram.com/', '_blank');
        }, 1500);
      } else {
        // Desktop - open Instagram web
        window.open('https://www.instagram.com/', '_blank');
      }
      return;
    }

    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
      shareUrl,
      `share-${platform}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyToClipboard}>
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => openShareWindow(shareUrls.facebook, 'facebook')}>
          <FaFacebook className="h-4 w-4 mr-2 text-blue-600" />
          Facebook
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => openShareWindow(shareUrls.email, 'email')}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}