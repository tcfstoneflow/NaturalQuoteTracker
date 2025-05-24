import PDFDocument from 'pdfkit';
import { QuoteWithDetails } from '@shared/schema';

export function generateQuotePDF(quote: QuoteWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 30, 
        size: 'A4',
        bufferPages: true
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header section - compact
      doc.fontSize(16).text('Texas Counter Fitters', 50, 40);
      doc.fontSize(8).text('Natural Stone Distribution | Phone: (555) 123-4567 | Email: quotes@texascounterfitters.com', 50, 58);

      // Quote info - right aligned
      doc.fontSize(14).text('QUOTE', 450, 40);
      doc.fontSize(8)
        .text(`Quote #: ${quote.quoteNumber}`, 420, 58)
        .text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 420, 68)
        .text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 420, 78);

      // Client and Project info - side by side, compact
      doc.fontSize(9).text('Bill To:', 50, 100);
      doc.fontSize(8)
        .text(quote.client.name, 50, 112)
        .text(quote.client.email, 50, 122);

      doc.fontSize(9).text(`Project: ${quote.projectName}`, 300, 100);

      // Table header - compact
      let y = 140;
      doc.fontSize(9).fillColor('black');
      doc.rect(50, y, 500, 16).fillAndStroke('#f5f5f5', '#ddd');
      doc.fillColor('black')
        .text('Item Description', 55, y + 4)
        .text('Qty', 320, y + 4)
        .text('Unit Price', 380, y + 4)
        .text('Total', 480, y + 4);

      y += 18;

      // Line items - more compact
      quote.lineItems.forEach((item) => {
        doc.fontSize(8)
          .text(`${item.product.name} - ${item.product.thickness}`, 55, y)
          .text(item.quantity.toString(), 320, y)
          .text(`$${item.unitPrice}`, 380, y)
          .text(`$${item.totalPrice}`, 480, y);
        y += 14;
      });

      y += 10;

      // Totals - compact
      doc.fontSize(8)
        .text(`Subtotal: $${quote.subtotal}`, 420, y)
        .text(`Tax (${(parseFloat(quote.taxRate) * 100).toFixed(2)}%): $${quote.taxAmount}`, 420, y + 10);
      
      doc.fontSize(9).text(`Total: $${quote.totalAmount}`, 420, y + 22);

      y += 40;

      // Terms - single line
      doc.fontSize(7)
        .text('Terms: Payment due within 30 days • Prices valid for period specified • Installation/delivery charges may apply', 50, y);

      y += 15;

      // Notes if present
      if (quote.notes && quote.notes.trim()) {
        doc.fontSize(7).text(`Notes: ${quote.notes}`, 50, y);
        y += 12;
      }

      // Footer
      doc.fontSize(7).text('Thank you for choosing Texas Counter Fitters!', 50, y);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
