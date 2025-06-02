import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, Check } from "lucide-react";
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
  };

  const openShareWindow = (shareUrl: string, platform: string) => {
    if (platform === 'instagram') {
      copyToClipboard();
      toast({
        title: "Instagram sharing",
        description: "Link copied! Paste it in your Instagram story or bio.",
      });
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
        
        <DropdownMenuItem onClick={() => openShareWindow(shareUrls.instagram, 'instagram')}>
          <FaInstagram className="h-4 w-4 mr-2 text-pink-600" />
          Instagram
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => openShareWindow(shareUrls.twitter, 'twitter')}>
          <FaTwitter className="h-4 w-4 mr-2 text-blue-400" />
          Twitter
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => openShareWindow(shareUrls.whatsapp, 'whatsapp')}>
          <FaWhatsapp className="h-4 w-4 mr-2 text-green-600" />
          WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}