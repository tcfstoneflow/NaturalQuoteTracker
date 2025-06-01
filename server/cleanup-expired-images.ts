import { storage } from "./storage";

/**
 * Clean up expired AI-generated gallery images
 * These are DALL-E URLs that have time-based tokens and expire
 */
export async function cleanupExpiredGalleryImages(): Promise<void> {
  try {
    // Get all gallery images from all products
    const allProducts = await storage.getProducts();
    const allImages = [];
    
    for (const product of allProducts) {
      const productImages = await storage.getGalleryImages(product.id);
      allImages.push(...productImages);
    }
    
    for (const image of allImages) {
      // Check if this is an expired DALL-E URL
      if (image.imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) {
        try {
          // Test if the image URL is still accessible
          const response = await fetch(image.imageUrl, { method: 'HEAD' });
          if (!response.ok) {
            // URL is expired, remove from gallery
            await storage.deleteGalleryImage(image.id);
            console.log(`Removed expired gallery image: ${image.title}`);
          }
        } catch (error) {
          // Network error, likely expired, remove it
          await storage.deleteGalleryImage(image.id);
          console.log(`Removed inaccessible gallery image: ${image.title}`);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up expired images:', error);
  }
}