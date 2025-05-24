import PDFDocument from 'pdfkit';
import { QuoteWithDetails } from '@shared/schema';

// Smart image processing utilities
function isValidImageUrl(url: string): boolean {
  if (!url || url.trim() === '') return false;
  
  // Check for data URLs (base64 images)
  if (url.startsWith('data:image/')) return true;
  
  // Check for HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Validate common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const urlLower = url.toLowerCase();
    return imageExtensions.some(ext => urlLower.includes(ext)) || 
           urlLower.includes('image') || 
           urlLower.includes('photo');
  }
  
  return false;
}

function getOptimalImageSize(hasMultipleItems: boolean): { width: number, height: number } {
  // Adjust image size based on quote complexity
  if (hasMultipleItems) {
    return { width: 20, height: 20 }; // Smaller for multiple items
  }
  return { width: 30, height: 30 }; // Larger for fewer items
}

export function generateQuotePDF(quote: QuoteWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 30,
        size: [612, 792], // Letter size in points
        layout: 'portrait'
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Keep all Y positions low to ensure single page
      doc.fontSize(12).text('Texas Counter Fitters', 50, 50);
      doc.fontSize(7).text('Natural Stone Distribution | (555) 123-4567', 50, 65);

      doc.fontSize(10).text('QUOTE', 450, 50);
      doc.fontSize(7).text(`#${quote.quoteNumber}`, 450, 65);
      doc.text(`${new Date(quote.createdAt).toLocaleDateString()}`, 450, 75);

      // Client - very compact
      doc.fontSize(8).text(`To: ${quote.client.name} | ${quote.client.email}`, 50, 100);
      doc.text(`Project: ${quote.projectName}`, 50, 115);

      // Table - start at 140
      doc.fontSize(7);
      doc.text('Item', 50, 140);
      doc.text('Qty', 250, 140);
      doc.text('Price', 300, 140);
      doc.text('Total', 380, 140);
      doc.moveTo(50, 150).lineTo(450, 150).stroke();

      let y = 160;
      const hasMultipleItems = quote.lineItems.length > 2;
      
      quote.lineItems.forEach((item) => {
        const imageUrl = item.product.imageUrl;
        const hasValidImage = imageUrl && isValidImageUrl(imageUrl);
        const imageSize = getOptimalImageSize(hasMultipleItems);
        const rowHeight = hasValidImage ? Math.max(imageSize.height + 10, 25) : 12;
        
        // Smart image embedding with validation
        if (hasValidImage && imageUrl) {
          try {
            // Embed product image with optimal sizing
            doc.image(imageUrl, 50, y, { 
              width: imageSize.width, 
              height: imageSize.height,
              fit: [imageSize.width, imageSize.height]
            });
          } catch (error) {
            console.log('Smart image embedding failed for:', item.product.name, error);
            // Continue gracefully without image
          }
        }
        
        // Dynamic text positioning based on image presence and size
        const textX = hasValidImage ? 50 + imageSize.width + 5 : 50;
        const textY = hasValidImage ? y + Math.floor(imageSize.height / 4) : y;
        const textWidth = hasValidImage ? 190 - imageSize.width - 5 : 190;
        
        doc.text(`${item.product.name} - ${item.product.thickness}`, textX, textY, { width: textWidth });
        doc.text(item.quantity, 250, textY);
        doc.text(`$${item.unitPrice}`, 300, textY);
        doc.text(`$${item.totalPrice}`, 380, textY);
        
        y += rowHeight;
      });

      y += 10;
      doc.text(`Subtotal: $${quote.subtotal}`, 300, y);
      doc.text(`Tax: $${quote.taxAmount}`, 300, y + 10);
      doc.fontSize(8).text(`Total: $${quote.totalAmount}`, 300, y + 22);

      y += 40;
      doc.fontSize(6).text('Terms: Payment due 30 days. Thank you for your business!', 50, y);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
