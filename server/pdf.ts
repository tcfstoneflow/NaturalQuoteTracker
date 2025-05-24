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

      // Header - more compact
      doc.fontSize(18).text('Texas Counter Fitters', 50, 40);
      doc.fontSize(10).text('Natural Stone Distribution | 123 Stone Street, City, State 12345', 50, 60);
      doc.text('Phone: (555) 123-4567 | Email: quotes@texascounterfitters.com', 50, 75);

      // Quote title - align right
      doc.fontSize(16).text('QUOTE', 400, 40);
      doc.fontSize(10)
        .text(`Quote #: ${quote.quoteNumber}`, 400, 60)
        .text(`Date: ${new Date(quote.createdAt).toLocaleDateString()}`, 400, 75)
        .text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 400, 90);

      // Line separator
      doc.moveTo(50, 105).lineTo(550, 105).stroke();

      // Client and Project info side by side - more compact
      doc.fontSize(12).text('Bill To:', 50, 115);
      doc.fontSize(10)
        .text(quote.client.name, 50, 130)
        .text(quote.client.company || '', 50, 142)
        .text(quote.client.address || '', 50, 154)
        .text(`${quote.client.city || ''} ${quote.client.state || ''} ${quote.client.zipCode || ''}`.trim(), 50, 166)
        .text(quote.client.email, 50, 178);

      // Project information - right side
      doc.fontSize(12).text('Project:', 300, 115);
      doc.fontSize(10).text(quote.projectName, 300, 130);

      // Line items table - start higher
      let yPosition = 200;
      
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

      // Totals - more compact
      yPosition += 15;
      const totalsX = 400;
      
      doc.fontSize(10)
        .text(`Subtotal: $${quote.subtotal}`, totalsX, yPosition)
        .text(`Tax (${(parseFloat(quote.taxRate) * 100).toFixed(2)}%): $${quote.taxAmount}`, totalsX, yPosition + 12)
        .fontSize(11)
        .text(`Total: $${quote.totalAmount}`, totalsX, yPosition + 24);

      // Terms and conditions - more compact
      yPosition += 50;
      doc.fontSize(9)
        .text('Terms & Conditions:', 50, yPosition)
        .text('• Payment due within 30 days of acceptance  • Prices valid for period specified above', 50, yPosition + 12)
        .text('• Installation/delivery charges may apply  • Subject to standard terms and conditions', 50, yPosition + 24);

      // Notes section if any
      if (quote.notes && quote.notes.trim()) {
        yPosition += 40;
        doc.fontSize(9)
          .text('Notes:', 50, yPosition)
          .text(quote.notes, 50, yPosition + 12);
      }

      // Footer - compact
      doc.fontSize(8)
        .text('Thank you for choosing Texas Counter Fitters!', 50, doc.page.height - 30);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
