import PDFDocument from 'pdfkit';
import { QuoteWithDetails } from '@shared/schema';

export function generateQuotePDF(quote: QuoteWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a single page document with fixed height
      const doc = new PDFDocument({ 
        margin: 40, 
        size: 'A4',
        autoFirstPage: false
      });
      
      // Add single page
      doc.addPage();
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // All content positioned absolutely to prevent page overflow
      let currentY = 50;

      // Header
      doc.fontSize(14).text('Texas Counter Fitters', 50, currentY);
      doc.fontSize(8).text('Natural Stone Distribution | (555) 123-4567 | quotes@texascounterfitters.com', 50, currentY + 18);

      // Quote number - right side
      doc.fontSize(12).text('QUOTE', 420, currentY);
      doc.fontSize(8).text(`#${quote.quoteNumber}`, 420, currentY + 18);
      doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 420, currentY + 30);

      currentY += 60;

      // Client info
      doc.fontSize(9).text(`Bill To: ${quote.client.name}`, 50, currentY);
      doc.fontSize(8).text(quote.client.email, 50, currentY + 12);
      doc.fontSize(9).text(`Project: ${quote.projectName}`, 280, currentY);

      currentY += 40;

      // Items table header
      doc.fontSize(8).text('Item', 50, currentY);
      doc.text('Qty', 280, currentY);
      doc.text('Price', 330, currentY);
      doc.text('Total', 400, currentY);
      
      // Line under header
      doc.moveTo(50, currentY + 12).lineTo(450, currentY + 12).stroke();
      currentY += 20;

      // Line items
      quote.lineItems.forEach((item) => {
        doc.fontSize(8)
          .text(`${item.product.name} - ${item.product.thickness}`, 50, currentY, { width: 220 })
          .text(item.quantity, 280, currentY)
          .text(`$${item.unitPrice}`, 330, currentY)
          .text(`$${item.totalPrice}`, 400, currentY);
        currentY += 16;
      });

      currentY += 20;

      // Totals
      doc.fontSize(8)
        .text(`Subtotal: $${quote.subtotal}`, 350, currentY)
        .text(`Tax: $${quote.taxAmount}`, 350, currentY + 12);
      
      doc.fontSize(10).text(`Total: $${quote.totalAmount}`, 350, currentY + 26);

      currentY += 50;

      // Terms
      doc.fontSize(7).text('Terms: Payment due 30 days • Installation/delivery extra', 50, currentY);

      currentY += 20;

      // Simple footer
      doc.fontSize(7).text('Thank you for your business!', 50, currentY);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
