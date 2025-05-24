import PDFDocument from 'pdfkit';
import { QuoteWithDetails } from '@shared/schema';

export function generateQuotePDF(quote: QuoteWithDetails): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('Texas Counter Fitters CRM', 50, 50);
      doc.fontSize(12).text('Natural Stone Distribution', 50, 75);
      doc.fontSize(10).text('123 Stone Street, City, State 12345', 50, 90);
      doc.text('Phone: (555) 123-4567 | Email: quotes@texascounterfitters.com', 50, 105);

      // Quote title
      doc.fontSize(18).text('QUOTE', 400, 50);
      doc.fontSize(12).text(`Quote #: ${quote.quoteNumber}`, 400, 75);
      doc.text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 400, 90);
      doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 400, 105);

      // Line separator
      doc.moveTo(50, 130).lineTo(550, 130).stroke();

      // Client information
      doc.fontSize(14).text('Bill To:', 50, 150);
      doc.fontSize(11)
        .text(quote.client.name, 50, 170)
        .text(quote.client.company || '', 50, 185)
        .text(quote.client.address || '', 50, 200)
        .text(`${quote.client.city || ''} ${quote.client.state || ''} ${quote.client.zipCode || ''}`.trim(), 50, 215)
        .text(quote.client.email, 50, 230);

      // Project information
      doc.fontSize(14).text('Project:', 300, 150);
      doc.fontSize(11).text(quote.projectName, 300, 170);

      // Line items table
      let yPosition = 270;
      
      // Table header
      doc.fontSize(11).fillColor('black');
      doc.rect(50, yPosition, 500, 20).fillAndStroke('#f5f5f5', '#000');
      doc.fillColor('black')
        .text('Item', 60, yPosition + 6)
        .text('Qty', 300, yPosition + 6)
        .text('Unit Price', 360, yPosition + 6)
        .text('Total', 480, yPosition + 6);

      yPosition += 25;

      // Line items
      quote.lineItems.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
        doc.rect(50, yPosition, 500, 20).fillAndStroke(bgColor, '#ddd');
        
        doc.fillColor('black')
          .text(`${item.product.name} - ${item.product.thickness}`, 60, yPosition + 6)
          .text(item.quantity.toString(), 300, yPosition + 6)
          .text(`$${item.unitPrice}`, 360, yPosition + 6)
          .text(`$${item.totalPrice}`, 480, yPosition + 6);
        
        yPosition += 20;
      });

      // Totals
      yPosition += 20;
      const totalsX = 400;
      
      doc.text(`Subtotal: $${quote.subtotal}`, totalsX, yPosition);
      yPosition += 15;
      doc.text(`Tax (${(parseFloat(quote.taxRate) * 100).toFixed(2)}%): $${quote.taxAmount}`, totalsX, yPosition);
      yPosition += 15;
      doc.fontSize(12).text(`Total: $${quote.totalAmount}`, totalsX, yPosition);

      // Terms and conditions
      yPosition += 40;
      doc.fontSize(10)
        .text('Terms & Conditions:', 50, yPosition)
        .text('• Payment is due within 30 days of quote acceptance', 50, yPosition + 15)
        .text('• Prices are valid for the period specified above', 50, yPosition + 30)
        .text('• Installation and delivery charges may apply', 50, yPosition + 45)
        .text('• All sales are subject to our standard terms and conditions', 50, yPosition + 60);

      // Footer
      doc.fontSize(8)
        .text('Thank you for your business!', 50, doc.page.height - 50)
        .text('StoneFlow CRM - Natural Stone Distribution', 50, doc.page.height - 35);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
