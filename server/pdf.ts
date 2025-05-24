import PDFDocument from 'pdfkit';
import { QuoteWithDetails } from '@shared/schema';

export function generateQuotePDF(quote: QuoteWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      let y = 40;

      // Header section
      doc.fontSize(16).text('Texas Counter Fitters', 50, y);
      doc.fontSize(9).text('Natural Stone Distribution | Phone: (555) 123-4567 | Email: quotes@texascounterfitters.com', 50, y + 20);

      // Quote info - right aligned
      doc.fontSize(14).text('QUOTE', 450, y);
      doc.fontSize(9)
        .text(`Quote #: ${quote.quoteNumber}`, 400, y + 20)
        .text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 400, y + 32)
        .text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 400, y + 44);

      y += 70;

      // Client info
      doc.fontSize(10).text('Bill To:', 50, y);
      y += 15;
      doc.fontSize(9)
        .text(quote.client.name, 50, y)
        .text(quote.client.email, 50, y + 12);

      // Project info
      doc.fontSize(10).text(`Project: ${quote.projectName}`, 300, y);

      y += 40;

      // Table header
      doc.fontSize(10).fillColor('black');
      doc.rect(50, y, 500, 18).fillAndStroke('#f0f0f0', '#ccc');
      doc.fillColor('black')
        .text('Item Description', 55, y + 5)
        .text('Qty', 320, y + 5)
        .text('Unit Price', 370, y + 5)
        .text('Total', 480, y + 5);

      y += 20;

      // Line items with images
      quote.lineItems.forEach((item) => {
        const rowHeight = item.product.imageUrl ? 40 : 18;
        
        // Add product image if available
        if (item.product.imageUrl) {
          try {
            // Add a small product image (30x30)
            doc.image(item.product.imageUrl, 55, y, { width: 30, height: 30 });
          } catch (error) {
            // If image fails to load, just continue without it
            console.log('Failed to load product image:', error);
          }
        }
        
        const textY = item.product.imageUrl ? y + 5 : y + 3;
        const textX = item.product.imageUrl ? 90 : 55;
        
        doc.fontSize(9)
          .text(`${item.product.name} - ${item.product.thickness}`, textX, textY)
          .text(item.quantity.toString(), 320, textY)
          .text(`$${item.unitPrice}`, 370, textY)
          .text(`$${item.totalPrice}`, 480, textY);
        
        y += rowHeight;
      });

      y += 20;

      // Totals
      const totalsX = 420;
      doc.fontSize(9)
        .text(`Subtotal: $${quote.subtotal}`, totalsX, y)
        .text(`Tax (${(parseFloat(quote.taxRate) * 100).toFixed(2)}%): $${quote.taxAmount}`, totalsX, y + 12);
      
      doc.fontSize(10).text(`Total: $${quote.totalAmount}`, totalsX, y + 26);

      y += 50;

      // Terms
      doc.fontSize(8)
        .text('Terms: Payment due within 30 days • Prices valid for period specified • Installation/delivery charges may apply', 50, y);

      y += 25;

      // Notes if present
      if (quote.notes && quote.notes.trim()) {
        doc.fontSize(8).text(`Notes: ${quote.notes}`, 50, y);
        y += 20;
      }

      // Simple footer
      doc.fontSize(8).text('Thank you for choosing Texas Counter Fitters!', 50, y);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
