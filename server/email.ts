import nodemailer from 'nodemailer';
import { QuoteWithDetails } from '@shared/schema';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER || 'your-email@example.com',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || 'your-app-password',
  },
});

export interface EmailQuoteOptions {
  quote: QuoteWithDetails;
  pdfBuffer: Buffer;
  additionalMessage?: string;
}

export async function sendQuoteEmail({ quote, pdfBuffer, additionalMessage }: EmailQuoteOptions): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.SMTP_USER || process.env.EMAIL_USER || 'quotes@stoneflow.com',
      to: quote.client.email,
      cc: process.env.CC_EMAIL || '',
      subject: `Quote ${quote.quoteNumber} - ${quote.projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1976D2; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">StoneFlow CRM</h1>
            <p style="margin: 5px 0 0 0;">Natural Stone Distribution</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Dear ${quote.client.name},</h2>
            
            <p>Thank you for your interest in our natural stone products. Please find attached your quote for <strong>${quote.projectName}</strong>.</p>
            
            <div style="background-color: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1976D2; margin-top: 0;">Quote Details:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li><strong>Quote Number:</strong> ${quote.quoteNumber}</li>
                <li><strong>Project:</strong> ${quote.projectName}</li>
                <li><strong>Total Amount:</strong> $${quote.totalAmount}</li>
                <li><strong>Valid Until:</strong> ${new Date(quote.validUntil).toLocaleDateString()}</li>
              </ul>
            </div>
            
            ${additionalMessage ? `
              <div style="margin: 20px 0;">
                <h4 style="color: #333;">Additional Notes:</h4>
                <p style="font-style: italic;">${additionalMessage}</p>
              </div>
            ` : ''}
            
            <p>The attached PDF contains detailed specifications and pricing for all items. Please review and let us know if you have any questions.</p>
            
            <p>To accept this quote, simply reply to this email or call us at <strong>(555) 123-4567</strong>.</p>
            
            <p>We look forward to working with you!</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0;"><strong>StoneFlow CRM Team</strong></p>
              <p style="margin: 5px 0 0 0; color: #666;">
                123 Stone Street, City, State 12345<br>
                Phone: (555) 123-4567 | Email: quotes@stoneflow.com
              </p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            <p style="margin: 0;">This quote is valid until the date specified above. Terms and conditions apply.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `Quote-${quote.quoteNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function testEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('Email configuration test failed:', error);
    return false;
  }
}
