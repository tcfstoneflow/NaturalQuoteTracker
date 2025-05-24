interface ConstantContactConfig {
  apiKey: string;
  accessToken: string;
  baseUrl: string;
}

interface Contact {
  email_address: {
    address: string;
    permission_to_send: string;
  };
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone_numbers?: Array<{
    phone_number: string;
    kind: string;
  }>;
  list_memberships?: string[];
}

interface EmailCampaign {
  name: string;
  email_campaign_activities: Array<{
    format_type: number;
    from_name: string;
    from_email: string;
    reply_to_email: string;
    subject: string;
    html_content: string;
    text_content?: string;
  }>;
}

export class ConstantContactService {
  private config: ConstantContactConfig;

  constructor() {
    this.config = {
      apiKey: process.env.CONSTANT_CONTACT_API_KEY || '',
      accessToken: process.env.CONSTANT_CONTACT_ACCESS_TOKEN || '',
      baseUrl: 'https://api.cc.email/v3'
    };

    if (!this.config.apiKey || !this.config.accessToken) {
      console.warn('Constant Contact credentials not configured');
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    if (!this.config.apiKey || !this.config.accessToken) {
      throw new Error('Constant Contact API credentials not configured');
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'X-API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Constant Contact API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Contact Management
  async createOrUpdateContact(contactData: {
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phone?: string;
    listIds?: string[];
  }) {
    const contact: Contact = {
      email_address: {
        address: contactData.email,
        permission_to_send: 'implicit'
      }
    };

    if (contactData.firstName) contact.first_name = contactData.firstName;
    if (contactData.lastName) contact.last_name = contactData.lastName;
    if (contactData.companyName) contact.company_name = contactData.companyName;
    if (contactData.phone) {
      contact.phone_numbers = [{
        phone_number: contactData.phone,
        kind: 'work'
      }];
    }
    if (contactData.listIds) {
      contact.list_memberships = contactData.listIds;
    }

    try {
      return await this.makeRequest('/contacts', 'POST', contact);
    } catch (error: any) {
      if (error.message.includes('409')) {
        // Contact already exists, update instead
        const existingContact = await this.findContactByEmail(contactData.email);
        if (existingContact) {
          return await this.makeRequest(`/contacts/${existingContact.contact_id}`, 'PUT', contact);
        }
      }
      throw error;
    }
  }

  async findContactByEmail(email: string) {
    try {
      const response = await this.makeRequest(`/contacts?email=${encodeURIComponent(email)}`);
      return response.contacts && response.contacts.length > 0 ? response.contacts[0] : null;
    } catch (error) {
      console.error('Error finding contact:', error);
      return null;
    }
  }

  // List Management
  async getLists() {
    return await this.makeRequest('/contact_lists');
  }

  async createList(name: string, description?: string) {
    return await this.makeRequest('/contact_lists', 'POST', {
      name,
      description: description || `Auto-created list for ${name}`
    });
  }

  // Email Campaign Management
  async sendQuoteEmail(contactEmail: string, quoteData: {
    quoteNumber: string;
    clientName: string;
    totalAmount: string;
    pdfUrl?: string;
    additionalMessage?: string;
  }) {
    // First, ensure contact exists
    await this.createOrUpdateContact({
      email: contactEmail,
      firstName: quoteData.clientName.split(' ')[0],
      lastName: quoteData.clientName.split(' ').slice(1).join(' ')
    });

    const htmlContent = this.generateQuoteEmailHTML(quoteData);
    const textContent = this.generateQuoteEmailText(quoteData);

    const campaign: EmailCampaign = {
      name: `Quote ${quoteData.quoteNumber} - ${quoteData.clientName}`,
      email_campaign_activities: [{
        format_type: 5, // Custom HTML
        from_name: 'StoneFlow CRM',
        from_email: process.env.COMPANY_EMAIL || 'quotes@yourcompany.com',
        reply_to_email: process.env.COMPANY_EMAIL || 'quotes@yourcompany.com',
        subject: `Your Quote ${quoteData.quoteNumber} - Stone Materials`,
        html_content: htmlContent,
        text_content: textContent
      }]
    };

    return await this.makeRequest('/emails', 'POST', campaign);
  }

  private generateQuoteEmailHTML(quoteData: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote ${quoteData.quoteNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px 0; }
          .quote-details { background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
          .total { font-size: 1.2em; font-weight: bold; color: #2c5aa0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Stone Materials Quote</h1>
            <p>Quote #${quoteData.quoteNumber}</p>
          </div>
          
          <div class="content">
            <p>Dear ${quoteData.clientName},</p>
            
            <p>Thank you for your interest in our stone materials. Please find your quote details below:</p>
            
            <div class="quote-details">
              <h3>Quote Summary</h3>
              <p><strong>Quote Number:</strong> ${quoteData.quoteNumber}</p>
              <p><strong>Total Amount:</strong> <span class="total">$${quoteData.totalAmount}</span></p>
              
              ${quoteData.additionalMessage ? `
                <h4>Additional Notes:</h4>
                <p>${quoteData.additionalMessage}</p>
              ` : ''}
            </div>
            
            ${quoteData.pdfUrl ? `
              <p><a href="${quoteData.pdfUrl}" style="background: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Download Full Quote PDF</a></p>
            ` : ''}
            
            <p>If you have any questions or would like to proceed with this quote, please don't hesitate to contact us.</p>
          </div>
          
          <div class="footer">
            <p>Thank you for choosing us for your stone material needs!</p>
            <p><strong>StoneFlow CRM</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateQuoteEmailText(quoteData: any): string {
    return `
Your Stone Materials Quote

Quote #${quoteData.quoteNumber}

Dear ${quoteData.clientName},

Thank you for your interest in our stone materials. Please find your quote details below:

Quote Number: ${quoteData.quoteNumber}
Total Amount: $${quoteData.totalAmount}

${quoteData.additionalMessage ? `
Additional Notes:
${quoteData.additionalMessage}
` : ''}

If you have any questions or would like to proceed with this quote, please don't hesitate to contact us.

Thank you for choosing us for your stone material needs!

StoneFlow CRM
    `.trim();
  }

  // Marketing Campaign Methods
  async createNewsletterCampaign(subject: string, content: string, listIds: string[]) {
    const campaign: EmailCampaign = {
      name: `Newsletter - ${subject}`,
      email_campaign_activities: [{
        format_type: 5,
        from_name: 'StoneFlow CRM',
        from_email: process.env.COMPANY_EMAIL || 'newsletter@yourcompany.com',
        reply_to_email: process.env.COMPANY_EMAIL || 'newsletter@yourcompany.com',
        subject: subject,
        html_content: content,
        text_content: content.replace(/<[^>]*>/g, '') // Strip HTML for text version
      }]
    };

    return await this.makeRequest('/emails', 'POST', campaign);
  }

  async addClientToMarketingList(clientData: {
    email: string;
    name: string;
    companyName?: string;
    listName?: string;
  }) {
    // Default to a "Stone Clients" list
    const listName = clientData.listName || 'Stone Clients';
    
    // Get or create the list
    let lists = await this.getLists();
    let targetList = lists.lists?.find((list: any) => list.name === listName);
    
    if (!targetList) {
      targetList = await this.createList(listName, 'Automatically managed list for stone material clients');
    }

    // Add contact to list
    const [firstName, ...lastNameParts] = clientData.name.split(' ');
    return await this.createOrUpdateContact({
      email: clientData.email,
      firstName,
      lastName: lastNameParts.join(' '),
      companyName: clientData.companyName,
      listIds: [targetList.list_id]
    });
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.makeRequest('/account/summary');
      return true;
    } catch (error) {
      console.error('Constant Contact connection test failed:', error);
      return false;
    }
  }
}

export const constantContactService = new ConstantContactService();