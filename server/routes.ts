import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProductSchema, insertQuoteSchema, insertQuoteLineItemSchema } from "@shared/schema";
import { translateNaturalLanguageToSQL, analyzeSQLResult } from "./ai";
import { generateQuotePDF } from "./pdf";
import { sendQuoteEmail } from "./email";
import { login, register, logout, getCurrentUser, requireAuth, requireRole, requireInventoryAccess, requirePricingAccess } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Showroom visit contact form - place at top to avoid conflicts
  app.post("/api/contact/showroom-visit", (req, res, next) => {
    // Force JSON response and prevent HTML fallback
    res.setHeader('Content-Type', 'application/json');
    
    (async () => {
      try {
        const { name, email, phone, preferredDate, message } = req.body;
        
        if (!name || !email || !phone || !preferredDate) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        // Store in database
        const newVisit = await storage.createShowroomVisit({
          name,
          email,
          phone,
          preferredDate,
          message: message || null,
          status: "pending"
        });
        
        res.status(200).json({ 
          success: true, 
          message: "Your showroom visit request has been submitted successfully!",
          id: newVisit.id
        });
      } catch (error: any) {
        console.error("Showroom visit creation error:", error);
        res.status(500).json({ 
          success: false, 
          error: "Failed to submit request" 
        });
      }
    })();
  });

  // Authentication routes
  app.post("/api/auth/login", login);
  app.post("/api/auth/register", requireAuth, requireRole(['admin']), register);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/user", requireAuth, getCurrentUser);

  // User management routes (admin only)
  app.get("/api/users", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.patch("/api/users/:id/toggle", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const user = await storage.toggleUserStatus(userId, isActive);
      res.json(user);
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent deleting the current user
      if (req.user && req.user.id === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(204).send();
    } catch (error: any) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  // Dashboard
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/recent-quotes", async (req, res) => {
    try {
      const quotes = await storage.getRecentQuotes(5);
      res.json(quotes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/top-products", async (req, res) => {
    try {
      const products = await storage.getTopProducts(4);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/dashboard/recent-activities", async (req, res) => {
    try {
      const activities = await storage.getRecentActivities(10);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Showroom visit management routes (for sales reps)
  app.get("/api/showroom-visits", requireAuth, async (req, res) => {
    try {
      const visits = await storage.getShowroomVisits();
      res.json(visits);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch showroom visits" });
    }
  });

  app.get("/api/showroom-visits/pending", requireAuth, async (req, res) => {
    try {
      const pendingVisits = await storage.getPendingShowroomVisits();
      res.json(pendingVisits);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch pending visits" });
    }
  });

  app.patch("/api/showroom-visits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedVisit = await storage.updateShowroomVisit(id, updates);
      res.json(updatedVisit);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update visit" });
    }
  });

  // Clients
  app.get("/api/clients", async (req, res) => {
    try {
      const { search } = req.query;
      let clients;
      
      if (search && typeof search === 'string') {
        clients = await storage.searchClients(search);
      } else {
        clients = await storage.getClients();
      }
      
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      res.json(client);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClient(id);
      
      if (!success) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/with-slabs", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const productsWithSlabs = await Promise.all(
        products.map(async (product) => {
          const productWithSlabs = await storage.getProductWithSlabs(product.id);
          return productWithSlabs;
        })
      );
      res.json(productsWithSlabs.filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const data = req.body;
      
      // Check if user is trying to set price and if they have permission
      if (data.price && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can set pricing' });
      }
      
      // Create product data object with proper field mapping
      const productData = {
        bundleId: data.bundleId || `BDL-${Date.now()}`,
        name: data.name,
        supplier: data.supplier,
        category: data.category,
        grade: data.grade,
        thickness: data.thickness,
        price: data.price?.toString() || "0",
        unit: data.unit || "sq ft",
        stockQuantity: parseInt(data.stockQuantity) || 0,
        slabLength: data.slabLength ? parseFloat(data.slabLength) : null,
        slabWidth: data.slabWidth ? parseFloat(data.slabWidth) : null,
        location: data.location || null,
        imageUrl: data.imageUrl || null,
        isActive: true
      };
      
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error: any) {
      console.error("Product creation error:", error.message);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      // Check if user is trying to update price and if they have permission
      if (validatedData.price !== undefined && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can modify pricing' });
      }
      
      const product = await storage.updateProduct(id, validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/products/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      
      // Check if user is trying to update price and if they have permission
      if (validatedData.price !== undefined && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can modify pricing' });
      }
      
      const product = await storage.updateProduct(id, validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProduct(id);
      
      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quotes
  app.get("/api/quotes", async (req, res) => {
    try {
      const { clientId } = req.query;
      
      if (clientId) {
        const quotes = await storage.getClientQuotes(parseInt(clientId as string));
        res.json(quotes);
      } else {
        const quotes = await storage.getQuotes();
        res.json(quotes);
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      res.json(quote);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/quotes", requireAuth, async (req: any, res) => {
    try {
      const { quote: quoteData, lineItems } = req.body;
      const userId = req.user.id;
      
      console.log("Quote data:", JSON.stringify(quoteData, null, 2));
      console.log("Line items:", JSON.stringify(lineItems, null, 2));
      
      // Add the current user as the creator
      const quoteDataWithCreator = { ...quoteData, createdBy: userId };
      const validatedQuote = insertQuoteSchema.parse(quoteDataWithCreator);
      console.log("Validated quote:", JSON.stringify(validatedQuote, null, 2));
      
      // Don't validate line items with schema since quoteId is added later
      const validatedLineItems = lineItems.map((item: any) => ({
        productId: parseInt(item.productId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes || null
      }));
      
      console.log("Validated line items:", JSON.stringify(validatedLineItems, null, 2));
      
      const quote = await storage.createQuote(validatedQuote, validatedLineItems);
      res.status(201).json(quote);
    } catch (error) {
      console.error("Quote creation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertQuoteSchema.partial().parse(req.body);
      const quote = await storage.updateQuote(id, validatedData);
      res.json(quote);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteQuote(id);
      
      if (!success) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Quote PDF generation
  app.get("/api/quotes/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuote(id);
      
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      const pdfBuffer = await generateQuotePDF(quote);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Quote-${quote.quoteNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send quote email
  app.post("/api/quotes/:id/send", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { additionalMessage } = req.body;
      
      const quote = await storage.getQuote(id);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      const pdfBuffer = await generateQuotePDF(quote);
      await sendQuoteEmail({ quote, pdfBuffer, additionalMessage });
      
      // Update quote as sent
      await storage.updateQuote(id, { sentAt: new Date() });
      
      // Log activity
      await storage.createActivity({
        type: "quote_sent",
        description: `Quote ${quote.quoteNumber} sent to ${quote.client.name}`,
        entityType: "quote",
        entityId: id,
      });
      
      res.json({ success: true, message: "Quote sent successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI SQL Query Translation
  app.post("/api/ai/translate-query", async (req, res) => {
    try {
      const { naturalQuery } = req.body;
      
      if (!naturalQuery || typeof naturalQuery !== 'string') {
        return res.status(400).json({ error: "Natural query is required" });
      }
      
      const result = await translateNaturalLanguageToSQL(naturalQuery);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute SQL Query
  app.post("/api/sql/execute", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "SQL query is required" });
      }
      
      // Basic safety check - only allow SELECT statements
      const trimmedQuery = query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        return res.status(400).json({ error: "Only SELECT queries are allowed for security reasons" });
      }
      
      const results = await storage.executeQuery(query);
      const analysis = await analyzeSQLResult(query, results);
      
      res.json({ 
        results, 
        analysis,
        rowCount: results.length 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Public Slabs Endpoint for Client Inventory
  app.get("/api/public/slabs", async (req, res) => {
    try {
      const { bundleId } = req.query;
      const slabs = await storage.getSlabs(bundleId as string);
      // Only return available slabs with limited information for public access
      const publicSlabs = slabs
        .filter(slab => slab.status?.toLowerCase() === 'available')
        .map(slab => ({
          id: slab.id,
          slabNumber: slab.slabNumber,
          length: slab.length,
          width: slab.width,
          location: slab.location,
          barcode: slab.barcode,
          status: slab.status
        }));
      res.json(publicSlabs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch slabs", details: error.message });
    }
  });

  // Public Product Details Endpoint for Client Access
  app.get("/api/public/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProductWithSlabs(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Filter to only show available slabs for public access
      const publicProduct = {
        ...product,
        slabs: product.slabs?.filter(slab => slab.status?.toLowerCase() === 'available') || []
      };

      res.json(publicProduct);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch product details", details: error.message });
    }
  });

  // Slab Management Routes
  app.get("/api/slabs", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const { bundleId } = req.query;
      const slabs = await storage.getSlabs(bundleId as string);
      res.json(slabs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch slabs", details: error.message });
    }
  });

  app.get("/api/slabs/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const slab = await storage.getSlab(parseInt(req.params.id));
      if (!slab) {
        return res.status(404).json({ error: "Slab not found" });
      }
      res.json(slab);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch slab", details: error.message });
    }
  });

  app.post("/api/slabs", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const slab = await storage.createSlab(req.body);
      res.status(201).json(slab);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create slab", details: error.message });
    }
  });

  app.patch("/api/slabs/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const slab = await storage.updateSlab(parseInt(req.params.id), req.body);
      res.json(slab);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update slab", details: error.message });
    }
  });

  app.patch("/api/slabs/:id/status", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const { status, date } = req.body;
      const slab = await storage.updateSlabStatus(parseInt(req.params.id), status, date ? new Date(date) : undefined);
      res.json(slab);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update slab status", details: error.message });
    }
  });

  app.delete("/api/slabs/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const success = await storage.deleteSlab(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ error: "Slab not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete slab", details: error.message });
    }
  });

  app.get("/api/products/:id/with-slabs", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const productWithSlabs = await storage.getProductWithSlabs(parseInt(req.params.id));
      if (!productWithSlabs) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(productWithSlabs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch product with slabs", details: error.message });
    }
  });

  // Auto-create slabs based on stock quantity
  app.post('/api/products/:id/auto-create-slabs', requireAuth, requireInventoryAccess(), async (req: any, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if slabs already exist
      const existingSlabs = await storage.getSlabs(product.bundleId);
      if (existingSlabs.length > 0) {
        return res.status(400).json({ error: 'Slabs already exist for this bundle' });
      }

      // Create slabs based on stock quantity
      const slabPromises = [];
      for (let i = 1; i <= product.stockQuantity; i++) {
        const slabData = {
          bundleId: product.bundleId,
          slabNumber: `S${i.toString().padStart(3, '0')}`,
          length: product.slabLength,
          width: product.slabWidth,
          status: 'available' as const,
          barcode: null, // Will be auto-generated by createSlab method
          location: product.location,
          notes: null,
        };
        slabPromises.push(storage.createSlab(slabData));
      }

      await Promise.all(slabPromises);
      
      // Log activity
      await storage.createActivity({
        type: 'slab_auto_created',
        description: `Auto-created ${product.stockQuantity} slabs for ${product.name}`,
        userId: req.user.id,
        metadata: { productId, slabCount: product.stockQuantity }
      });

      res.json({ 
        message: `Successfully created ${product.stockQuantity} slabs`,
        count: product.stockQuantity 
      });
    } catch (error: any) {
      console.error('Auto-create slabs error:', error);
      res.status(500).json({ error: 'Failed to auto-create slabs', details: error.message });
    }
  });

  // Constant Contact Marketing Routes
  app.get('/api/marketing/lists', async (req, res) => {
    try {
      const { constantContactService } = await import('./constant-contact');
      const lists = await constantContactService.getLists();
      res.json(lists);
    } catch (error: any) {
      console.error('Error fetching marketing lists:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/marketing/newsletter', async (req, res) => {
    try {
      const { subject, content, listIds } = req.body;
      const { constantContactService } = await import('./constant-contact');
      const campaign = await constantContactService.createNewsletterCampaign(subject, content, listIds);
      res.json(campaign);
    } catch (error: any) {
      console.error('Error creating newsletter campaign:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/marketing/add-client', async (req, res) => {
    try {
      const { email, name, companyName, listName } = req.body;
      const { constantContactService } = await import('./constant-contact');
      const result = await constantContactService.addClientToMarketingList({
        email,
        name,
        companyName,
        listName
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error adding client to marketing list:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/marketing/test-connection', async (req, res) => {
    try {
      const { constantContactService } = await import('./constant-contact');
      const isConnected = await constantContactService.testConnection();
      res.json({ connected: isConnected });
    } catch (error: any) {
      console.error('Error testing Constant Contact connection:', error);
      res.status(500).json({ error: error.message, connected: false });
    }
  });

  app.post('/api/test-email', async (req, res) => {
    try {
      const { testEmailConfiguration } = await import('./email');
      const isConfigured = await testEmailConfiguration();
      res.json({ success: true, configured: isConfigured });
    } catch (error: any) {
      console.error('Email test failed:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Sales Dashboard API endpoints
  app.get('/api/sales-dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Get current date and calculate date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Get all quotes for this sales rep (or all if admin)
      let allQuotes;
      if (userRole === 'admin') {
        allQuotes = await storage.getQuotes();
      } else {
        // For sales reps, filter quotes they created
        const quotes = await storage.getQuotes();
        allQuotes = quotes.filter(quote => quote.createdBy === userId);
      }
      
      // Calculate monthly revenue
      const thisMonthQuotes = allQuotes.filter(quote => 
        new Date(quote.createdAt) >= startOfMonth && quote.status === 'accepted'
      );
      const lastMonthQuotes = allQuotes.filter(quote => 
        new Date(quote.createdAt) >= startOfLastMonth && 
        new Date(quote.createdAt) <= endOfLastMonth && 
        quote.status === 'accepted'
      );
      
      const thisMonthRevenue = thisMonthQuotes.reduce((sum, quote) => sum + parseFloat(quote.total), 0);
      const lastMonthRevenue = lastMonthQuotes.reduce((sum, quote) => sum + parseFloat(quote.total), 0);
      const monthlyGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
      
      // Count active and pending quotes
      const activeQuotes = allQuotes.filter(quote => quote.status === 'draft' || quote.status === 'sent').length;
      const pendingQuotes = allQuotes.filter(quote => quote.status === 'sent').length;
      
      // Get clients (for sales rep, get their clients)
      let clients;
      if (userRole === 'admin') {
        clients = await storage.getClients();
      } else {
        // For sales reps, get clients they've worked with
        const clientIds = [...new Set(allQuotes.map(quote => quote.clientId))];
        const allClients = await storage.getClients();
        clients = allClients.filter(client => clientIds.includes(client.id));
      }
      
      const totalClients = clients.length;
      const newClientsThisMonth = clients.filter(client => 
        new Date(client.createdAt) >= startOfMonth
      ).length;
      
      // Calculate follow-ups due (quotes sent over 7 days ago with no response)
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const followUpsDue = allQuotes.filter(quote => 
        quote.status === 'sent' && new Date(quote.updatedAt) < weekAgo
      ).length;
      
      res.json({
        monthlyRevenue: thisMonthRevenue,
        monthlyGrowth: monthlyGrowth,
        activeQuotes,
        pendingQuotes,
        totalClients,
        newClientsThisMonth,
        followUpsDue
      });
    } catch (error: any) {
      console.error('Error getting sales dashboard stats:', error);
      res.status(500).json({ error: 'Failed to get sales dashboard stats' });
    }
  });

  app.get('/api/sales-dashboard/my-quotes', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role || 'sales';
      
      console.log(`SALES DASHBOARD FINAL: User ID ${userId}, Role: ${userRole}`);
      
      // Get ALL quotes first
      const allQuotes = await storage.getQuotes();
      console.log(`SALES DASHBOARD FINAL: Found ${allQuotes.length} total quotes in database`);
      
      // Debug: Log all quotes with their createdBy values
      allQuotes.forEach((quote, index) => {
        console.log(`SALES DASHBOARD FINAL: Quote ${index + 1}: ${quote.quoteNumber}, createdBy: ${quote.createdBy}`);
      });
      
      // For admin users, show all quotes. For sales reps, show only their quotes
      let userQuotes;
      if (userRole === 'admin') {
        console.log('SALES DASHBOARD FINAL: Admin user - showing all quotes');
        userQuotes = allQuotes;
      } else {
        console.log(`SALES DASHBOARD FINAL: Sales rep - filtering quotes where createdBy = ${userId}`);
        userQuotes = allQuotes.filter(quote => {
          const createdByNum = Number(quote.createdBy);
          const userIdNum = Number(userId);
          const match = createdByNum === userIdNum;
          console.log(`SALES DASHBOARD FINAL: Quote ${quote.quoteNumber}: createdBy=${createdByNum}, userId=${userIdNum}, match=${match}`);
          return match;
        });
      }
      
      console.log(`SALES DASHBOARD FINAL: After filtering: ${userQuotes.length} quotes for user ${userId}`);
      
      const sortedQuotes = userQuotes
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      // Calculate totals for each quote
      const quotesWithTotals = sortedQuotes.map(quote => {
        const total = quote.lineItems.reduce((sum, item) => 
          sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
        return {
          ...quote,
          total: total.toFixed(2)
        };
      });
      
      console.log(`SALES DASHBOARD FINAL: Returning ${quotesWithTotals.length} quotes with totals`);
      res.json(quotesWithTotals);
    } catch (error: any) {
      console.error('Sales dashboard recent quotes error:', error);
      res.status(500).json({ error: 'Failed to get recent quotes' });
    }
  });

  app.get('/api/sales-dashboard/recent-activities', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let activities;
      if (userRole === 'admin') {
        activities = await storage.getRecentActivities(10);
      } else {
        // For sales reps, get activities related to their work
        const allActivities = await storage.getRecentActivities(50);
        activities = allActivities
          .filter(activity => 
            activity.description.includes(req.user.username) ||
            activity.entityType === 'quote' ||
            activity.entityType === 'client'
          )
          .slice(0, 10);
      }
      
      res.json(activities);
    } catch (error: any) {
      console.error('Error getting recent activities:', error);
      res.status(500).json({ error: 'Failed to get recent activities' });
    }
  });

  app.get('/api/sales-dashboard/pending-showroom-visits', requireAuth, async (req: any, res) => {
    try {
      const pendingVisits = await storage.getPendingShowroomVisits();
      res.json(pendingVisits);
    } catch (error: any) {
      console.error('Error getting pending showroom visits:', error);
      res.status(500).json({ error: 'Failed to get pending showroom visits' });
    }
  });



  // Generate barcodes for existing slabs
  app.post('/api/slabs/generate-barcodes', requireAuth, requireInventoryAccess(), async (req: any, res) => {
    try {
      const slabs = await storage.getSlabs();
      const slabsWithoutBarcodes = slabs.filter(slab => !slab.barcode);
      
      if (slabsWithoutBarcodes.length === 0) {
        return res.json({ message: "All slabs already have barcodes", count: 0 });
      }

      // Update slabs without barcodes
      const updatePromises = slabsWithoutBarcodes.map(slab => {
        const baseCode = `TCF-${slab.bundleId}-${slab.slabNumber}`;
        const checksum = baseCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;
        const barcode = `${baseCode}-${checksum.toString().padStart(2, '0')}`;
        
        return storage.updateSlab(slab.id, { barcode });
      });

      await Promise.all(updatePromises);

      res.json({ 
        message: `Generated barcodes for ${slabsWithoutBarcodes.length} slabs`,
        count: slabsWithoutBarcodes.length 
      });
    } catch (error: any) {
      console.error('Generate barcodes error:', error);
      res.status(500).json({ error: "Failed to generate barcodes", details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
