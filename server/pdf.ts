import PDFDocument from 'pdfkit';
import { QuoteWithDetails } from '@shared/schema';

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
      quote.lineItems.forEach((item) => {
        doc.text(`${item.product.name} - ${item.product.thickness}`, 50, y, { width: 190 });
        doc.text(item.quantity, 250, y);
        doc.text(`$${item.unitPrice}`, 300, y);
        doc.text(`$${item.totalPrice}`, 380, y);
        y += 12;
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
