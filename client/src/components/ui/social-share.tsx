import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Share2, 
  Copy, 
  Facebook, 
  Instagram, 
  Twitter, 
  MessageCircle,
  Mail,
  Link,
  Check
} from "lucide-react";
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp, FaPinterest } from "react-icons/fa";

interface SocialShareProps {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: string;
}

export function SocialShare({ url, title, description, imageUrl, price }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareData = {
    title: `${title} | TCF Supply`,
    text: description || `Check out this beautiful ${title} from TCF Supply`,
    url: url,
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(shareData.title);
  const encodedDescription = encodeURIComponent(shareData.text);
  const encodedImage = imageUrl ? encodeURIComponent(imageUrl) : '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Product link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (typeof window !== 'undefined' && navigator?.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled sharing
      }
    } else {
      copyToClipboard();
    }
  };

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedDescription}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&hashtags=naturalstone,countertops,stone`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage}&description=${encodedDescription}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0AView this product: ${encodedUrl}`,
    instagram: `https://www.instagram.com/`, // Instagram doesn't support direct URL sharing, will open app
  };

  const openShareWindow = (url: string, platform: string) => {
    if (platform === 'instagram') {
      // For Instagram, we'll copy the link and show instructions
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
      url,
      `share-${platform}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5" />
          Share This Product
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Native share button for mobile */}
        {typeof window !== 'undefined' && navigator?.share && (
          <Button onClick={handleNativeShare} className="w-full" variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}

        {/* Copy link */}
        <Button onClick={copyToClipboard} variant="outline" className="w-full">
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copied!" : "Copy Link"}
        </Button>

        {/* Social media buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => openShareWindow(shareUrls.facebook, 'facebook')}
            variant="outline"
            className="w-full"
          >
            <FaFacebook className="h-4 w-4 mr-2 text-blue-600" />
            Facebook
          </Button>

          <Button
            onClick={() => openShareWindow(shareUrls.email, 'email')}
            variant="outline"
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>

        {/* Share stats or additional info */}
        <div className="text-xs text-muted-foreground text-center pt-2">
          Share this beautiful {title.toLowerCase()} with friends and family
        </div>
      </CardContent>
    </Card>
  );
}

// Floating share button component
export function FloatingShareButton({ url, title, description, imageUrl }: SocialShareProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 w-64">
          <SocialShare 
            url={url} 
            title={title} 
            description={description} 
            imageUrl={imageUrl} 
          />
        </div>
      )}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full w-12 h-12 shadow-lg"
        size="icon"
      >
        <Share2 className="h-6 w-6" />
      </Button>
    </div>
  );
}