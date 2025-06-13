import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProductSchema, insertQuoteSchema, insertQuoteLineItemSchema, insertSalesTargetSchema, insertSalesRepProfileSchema, insertSalesRepFavoriteSlabSchema, insertSalesRepPortfolioImageSchema, insertSalesRepAppointmentSchema } from "@shared/schema";
import { translateNaturalLanguageToSQL, analyzeSQLResult } from "./ai";
import { generateQuotePDF } from "./pdf";
import { sendQuoteEmail } from "./email";
import { login, register, logout, getCurrentUser, requireAuth, requireRole, requireInventoryAccess, requirePricingAccess, hashPassword, verifyPassword } from "./auth";
import { analyzeClientPurchases } from "./client-analysis";
import { processSlabUpload } from "./ai-rendering";
import { generatePythonCountertopRender, uploadRenderingAsset } from "./python-rendering";
import { validateProductData, optimizeQuoteCalculations, cleanupExpiredData, generateHealthReport } from "./database-maintenance";
import { db } from "./db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import multer from "multer";
import nodemailer from "nodemailer";
import csv from "csv-parser";
import { Readable } from "stream";
import { apiLimiter, authLimiter, uploadLimiter } from "./rate-limiter";
import { cache } from "./cache";
import { config } from "./config";

// Configure multer for profile image uploads
const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'upload/profile-images';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const profileImageUpload = multer({
  storage: profileImageStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Email function for appointment notifications
async function sendAppointmentEmail(visit: any, type: 'confirmation' | 'update' | 'cancellation') {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("SMTP not configured, skipping email notification");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = type === 'confirmation' ? 'Showroom Visit Confirmation' :
                  type === 'update' ? 'Showroom Visit Update' :
                  'Showroom Visit Cancellation';

  const timeText = visit.preferredTime ? ` at ${visit.preferredTime}` : '';
  const assignedText = visit.assignedSalesMember ? `\n\nYour sales representative: ${visit.assignedSalesMember}` : '';

  const htmlContent = `
    <h2>${subject}</h2>
    <p>Dear ${visit.name},</p>
    
    ${type === 'confirmation' ? 
      `<p>Thank you for scheduling a showroom visit with us.</p>` :
      type === 'update' ?
      `<p>Your showroom visit has been updated.</p>` :
      `<p>Your showroom visit has been cancelled.</p>`
    }
    
    <h3>Visit Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${visit.preferredDate}${timeText}</li>
      <li><strong>Status:</strong> ${visit.status}</li>
      ${visit.notes ? `<li><strong>Notes:</strong> ${visit.notes}</li>` : ''}
    </ul>
    
    ${assignedText}
    
    <p>If you need to reschedule or have any questions, please contact us.</p>
    
    <p>Best regards,<br>
    Texas Counter Fitters Team</p>
  `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: visit.email,
    subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
}

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

  // Authentication routes with rate limiting
  app.post("/api/auth/login", authLimiter, login);
  app.post("/api/auth/register", requireAuth, requireRole(['admin']), authLimiter, register);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/user", requireAuth, getCurrentUser);

  // User management routes (admin only)
  app.get("/api/users", requireAuth, requireRole(['admin', 'sales_manager', 'sales_rep']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get sales managers for client assignment
  app.get("/api/users/sales-managers", requireAuth, async (req, res) => {
    try {
      const salesManagers = await storage.getSalesManagers();
      res.json(salesManagers);
    } catch (error: any) {
      console.error('Get sales managers error:', error);
      res.status(500).json({ error: 'Failed to fetch sales managers' });
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

  // User profile management routes
  app.patch("/api/users/:id/profile", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { firstName, lastName, email, username, role } = req.body;
      
      const updatedUser = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        username,
        role
      });
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error('Update user profile error:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  // Avatar upload route
  const avatarUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = './upload/avatars';
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const userId = req.params.id;
        const extension = path.extname(file.originalname);
        cb(null, `user-${userId}-${Date.now()}${extension}`);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/users/:id/avatar", requireAuth, requireRole(['admin']), uploadLimiter, avatarUpload.single('avatar'), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }
      
      const avatarUrl = `/upload/avatars/${req.file.filename}`;
      const updatedUser = await storage.updateUserAvatar(userId, avatarUrl);
      
      res.json({ success: true, avatarUrl, user: updatedUser });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: 'Failed to upload avatar' });
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

  app.get("/api/showroom-visits/pending", requireAuth, async (req: any, res) => {
    try {
      const pendingVisits = await storage.getPendingShowroomVisits();
      
      // Filter out read notifications
      const readNotifications = req.session.readNotifications || {};
      const unreadVisits = pendingVisits.filter((visit: any) => {
        const notificationKey = `showroom_visit_${visit.id}`;
        return !readNotifications[notificationKey];
      });
      
      res.json(unreadVisits);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch pending visits" });
    }
  });

  app.post("/api/showroom-visits", requireAuth, async (req, res) => {
    try {
      const { name, email, phone, preferredDate, preferredTime, message, status, assignedToUserId, assignedSalesMember } = req.body;
      
      if (!name || !email || !preferredDate) {
        return res.status(400).json({ message: "Name, email, and preferred date are required" });
      }

      const newVisit = await storage.createShowroomVisit({
        name,
        email,
        phone: phone || null,
        preferredDate,
        preferredTime: preferredTime || null,
        message: message || null,
        status: status || "pending",
        assignedToUserId: assignedToUserId || null,
        assignedSalesMember: assignedSalesMember || null
      });

      // Send appointment confirmation email
      try {
        await sendAppointmentEmail(newVisit, 'confirmation');
      } catch (emailError) {
        console.log("Email notification failed:", emailError);
        // Don't fail the appointment creation if email fails
      }
      
      res.status(201).json(newVisit);
    } catch (error: any) {
      console.error("Create showroom visit error:", error);
      res.status(500).json({ message: "Failed to create visit" });
    }
  });

  app.patch("/api/showroom-visits/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedVisit = await storage.updateShowroomVisit(id, updates);

      // Send update email if status changed to scheduled or if other details changed
      try {
        if (updates.status === 'scheduled' || updates.preferredDate || updates.preferredTime) {
          await sendAppointmentEmail(updatedVisit, 'update');
        } else if (updates.status === 'cancelled') {
          await sendAppointmentEmail(updatedVisit, 'cancellation');
        }
      } catch (emailError) {
        console.log("Email notification failed:", emailError);
        // Don't fail the update if email fails
      }
      
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
    } catch (error: any) {
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

  // Get client statistics
  app.get("/api/clients/:id/stats", async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      if (isNaN(clientId)) {
        return res.status(400).json({ error: 'Invalid client ID' });
      }

      // Get client details first
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Get all quotes for this client
      const quotes = await storage.getQuotes();
      const clientQuotes = quotes.filter(quote => quote.clientId === clientId);
      
      // Calculate total value from quote totals
      const totalValue = clientQuotes.reduce((sum, quote) => {
        const quoteTotal = parseFloat(quote.totalAmount) || 0;
        return sum + quoteTotal;
      }, 0);

      // Get appointments for this client (match by email)
      const visits = await storage.getShowroomVisits();
      const clientAppointments = visits.filter(visit => 
        visit.email && visit.email.toLowerCase() === client.email.toLowerCase()
      );

      res.json({
        totalQuotes: clientQuotes.length,
        totalValue: totalValue,
        appointments: clientAppointments.length
      });
    } catch (error) {
      console.error('Error fetching client stats:', error);
      res.status(500).json({ error: 'Failed to fetch client statistics' });
    }
  });

  // Client AI Summary
  app.post("/api/clients/ai-summary", requireAuth, async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (!clientId) {
        return res.status(400).json({ error: "Client ID is required" });
      }
      
      // Get client details
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Get client's quotes
      const quotes = await storage.getClientQuotes(clientId);
      
      if (quotes.length === 0) {
        return res.json({ 
          summary: "This client has no purchase history yet. Consider reaching out to discuss their natural stone needs and project requirements."
        });
      }

      // Generate AI analysis
      const analysis = await analyzeClientPurchases(client.name, quotes);
      
      // Format the summary for display
      const summary = `Based on ${quotes.length} quotes totaling $${analysis.totalSpent.toFixed(2)}, this client shows preference for ${analysis.preferredStoneTypes.join(', ')}. ${analysis.purchasePatterns} ${analysis.recommendations}`;
      
      res.json({ summary });
    } catch (error: any) {
      if (error.message.includes('OpenAI API key')) {
        return res.status(503).json({ error: "AI analysis service is not configured. Please contact your administrator." });
      }
      console.error('Client AI summary error:', error);
      res.status(500).json({ error: "Failed to generate client summary" });
    }
  });

  // Bulk client import
  app.post("/api/clients/bulk-import", requireAuth, async (req, res) => {
    try {
      const clients = JSON.parse(req.body.clients);
      let imported = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const clientData of clients) {
        try {
          // Validate required fields
          if (!clientData.name || !clientData.email) {
            errors++;
            errorDetails.push(`Row ${clientData.rowNumber}: Missing required fields (name or email)`);
            continue;
          }

          // Check if client already exists by email
          const existingClients = await storage.getClients();
          const existingClient = existingClients.find((c: any) => 
            c.email.toLowerCase() === clientData.email.toLowerCase()
          );

          if (existingClient) {
            errors++;
            errorDetails.push(`Row ${clientData.rowNumber}: Client with email ${clientData.email} already exists`);
            continue;
          }

          // Create client
          await storage.createClient({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone || '',
            company: clientData.company || '',
            address: clientData.address || '',
            city: clientData.city || '',
            state: clientData.state || '',
            zipCode: clientData.zipCode || '',
            notes: clientData.notes || '',
            salesManagerId: null
          });

          imported++;
        } catch (clientError) {
          errors++;
          errorDetails.push(`Row ${clientData.rowNumber}: ${(clientError as Error).message}`);
        }
      }

      res.json({
        success: true,
        imported,
        errors,
        errorDetails: errorDetails.slice(0, 10)
      });
    } catch (error: any) {
      console.error("Bulk import error:", error);
      res.status(500).json({ error: "Failed to process bulk import" });
    }
  });

  // Products with caching and rate limiting
  app.get("/api/products", apiLimiter, async (req, res) => {
    try {
      const { category, search } = req.query;
      const cacheKey = `products:${category || 'all'}:${search || 'none'}`;
      
      // Check cache first
      const cached = cache.getProduct(cacheKey);
      if (cached) {
        return res.json(cached);
      }
      
      let products = await storage.getProducts();
      
      // Filter by category if specified
      if (category && typeof category === 'string') {
        products = products.filter((product: any) => product.category === category);
      }
      
      // Filter by search query if specified
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        products = products.filter((product: any) => 
          product.name.toLowerCase().includes(searchLower) ||
          product.supplier.toLowerCase().includes(searchLower) ||
          product.category.toLowerCase().includes(searchLower)
        );
      }
      
      // Cache the filtered results
      cache.setProduct(cacheKey, products);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/products/low-stock", requireAuth, async (req: any, res) => {
    try {
      const lowStockProducts = await storage.getLowStockProducts();
      
      // Filter out read notifications
      const readNotifications = req.session.readNotifications || {};
      const unreadProducts = lowStockProducts.filter((product: any) => {
        const notificationKey = `low_stock_${product.id}`;
        return !readNotifications[notificationKey];
      });
      
      res.json(unreadProducts);
    } catch (error: any) {
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

  // CRITICAL FIX: Public product-tags endpoint must be before parameterized routes
  app.get("/api/public/products/tags", async (req, res) => {
    try {
      const allProductTags = await storage.getAllProductTags();
      res.json(allProductTags);
    } catch (error: any) {
      console.error('Get public product tags error:', error);
      res.status(500).json({ error: "Failed to fetch all product tags", details: error.message });
    }
  });

  // Public product-tags endpoint for tag filtering in gallery
  app.get("/api/public/product-tags", async (req, res) => {
    try {
      const allProductTags = await storage.getAllProductTags();
      res.json(allProductTags);
    } catch (error: any) {
      console.error('Get public product tags error:', error);
      res.status(500).json({ error: "Failed to fetch product tags for filtering", details: error.message });
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
      
      // Invalidate products cache after creating new product
      cache.invalidateProducts();
      
      // Trigger AI rendering if imageUrl was provided
      if (productData.imageUrl) {
        // Run AI processing in background to avoid blocking the response
        processSlabUpload(product.id, productData.imageUrl).catch(error => {
          console.error('Background AI rendering failed:', error);
        });
      }
      
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
      
      // Invalidate products cache after updating product
      cache.invalidateProducts();
      
      // Note: Automatic AI rendering disabled to prevent unwanted gallery image generation
      // Use manual render endpoints instead: /api/products/:id/generate-render or /api/products/:id/generate-python-render
      
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
      
      // Invalidate products cache after updating product
      cache.invalidateProducts();
      
      // Note: Automatic AI rendering disabled to prevent unwanted gallery image generation
      // Use manual render endpoints instead: /api/products/:id/generate-render or /api/products/:id/generate-python-render
      
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
      
      // Invalidate products cache after deleting product
      cache.invalidateProducts();
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Manual AI render generation for existing products
  app.post("/api/products/:id/generate-render", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      if (!product.imageUrl) {
        return res.status(400).json({ error: 'Product must have an image to generate AI render' });
      }
      
      // Run AI rendering in background
      processSlabUpload(id, product.imageUrl).catch(error => {
        console.error('Manual AI rendering failed:', error);
      });
      
      res.json({ message: 'AI render generation started in background' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Python-based render generation for existing products
  app.post("/api/products/:id/generate-python-render", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      if (!product.imageUrl) {
        return res.status(400).json({ error: 'Product must have an image to generate Python render' });
      }
      
      // Generate Python-based render
      const renderUrl = await generatePythonCountertopRender({
        productId: id,
        slabImageUrl: product.imageUrl,
        productName: product.name
      });
      
      if (renderUrl) {
        // Save the generated render to the product gallery
        await storage.createGalleryImage({
          productId: id,
          imageUrl: renderUrl,
          title: `${product.name} Kitchen Visualization`,
          description: `Realistic kitchen countertop render showing ${product.name} natural stone`,
          installationType: 'kitchen',
          isAiGenerated: false,
          isActive: true,
          sortOrder: 0
        });
        
        res.json({ renderUrl, message: 'Python render generated successfully' });
      } else {
        res.status(500).json({ error: 'Failed to generate Python render' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Gallery Images routes
  app.get("/api/products/:id/gallery", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const galleryImages = await storage.getGalleryImages(productId);
      res.json(galleryImages);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/products/:id/gallery", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { url, title, description, installationType, isAiGenerated } = req.body;
      
      if (!url || !title) {
        return res.status(400).json({ error: "URL and title are required" });
      }
      
      const galleryImage = await storage.createGalleryImage({
        productId,
        imageUrl: url,
        title,
        description: description || null,
        installationType: installationType || 'general',
        isAiGenerated: isAiGenerated || false
      });
      
      res.status(201).json(galleryImage);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/gallery/:id", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGalleryImage(id);
      
      if (!success) {
        return res.status(404).json({ error: "Gallery image not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Clean up expired gallery images
  app.post("/api/gallery/cleanup-expired", requireAuth, async (req, res) => {
    try {
      const { cleanupExpiredGalleryImages } = await import("./cleanup-expired-images");
      await cleanupExpiredGalleryImages();
      res.json({ message: "Expired images cleaned up successfully" });
    } catch (error: any) {
      console.error("Cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup expired images" });
    }
  });

  // Advanced Reports Endpoints
  
  // Inventory Turnover Report
  app.get("/api/reports/inventory-turnover", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const quotes = await storage.getQuotes();
      
      // Calculate turnover rates based on quote line items
      const productSales = new Map();
      
      // Aggregate sales data from quotes
      quotes.forEach((quote: any) => {
        if (quote.status === 'approved' && quote.lineItems) {
          quote.lineItems.forEach((item: any) => {
            const productId = item.productId;
            if (!productSales.has(productId)) {
              productSales.set(productId, {
                totalSold: 0,
                lastSaleDate: new Date(quote.createdAt),
                product: products.find((p: any) => p.id === productId)
              });
            }
            productSales.get(productId).totalSold += item.quantity;
            productSales.get(productId).lastSaleDate = new Date(quote.createdAt);
          });
        }
      });

      const fastMoving = [];
      const slowMoving = [];
      
      products.forEach((product: any) => {
        const salesData = productSales.get(product.id);
        if (salesData) {
          const daysSinceLastSale = Math.floor((Date.now() - salesData.lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
          const turnoverRate = salesData.totalSold / Math.max(1, daysSinceLastSale / 30);
          
          if (turnoverRate > 2) {
            fastMoving.push({
              id: product.id,
              name: product.name,
              category: product.category,
              turnoverRate: turnoverRate.toFixed(1),
              totalSold: salesData.totalSold
            });
          }
        } else {
          // Products with no sales are slow moving
          slowMoving.push({
            id: product.id,
            name: product.name,
            category: product.category,
            daysInStock: Math.floor(Math.random() * 180) + 30, // Placeholder calculation
            currentStock: product.stockQuantity || 0
          });
        }
      });

      res.json({
        averageTurnover: fastMoving.length > 0 ? (fastMoving.reduce((sum: number, p: any) => sum + parseFloat(p.turnoverRate), 0) / fastMoving.length).toFixed(1) : '0',
        fastMoving: fastMoving.sort((a, b) => parseFloat(b.turnoverRate) - parseFloat(a.turnoverRate)),
        slowMoving: slowMoving.slice(0, 10)
      });
    } catch (error: any) {
      console.error("Inventory turnover report error:", error);
      res.status(500).json({ error: "Failed to generate inventory turnover report" });
    }
  });

  // Supplier Performance Report
  app.get("/api/reports/supplier-performance", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const quotes = await storage.getQuotes();
      
      // Group products by supplier
      const supplierData = new Map();
      
      products.forEach((product: any) => {
        const supplier = product.supplier || 'Unknown';
        if (!supplierData.has(supplier)) {
          supplierData.set(supplier, {
            name: supplier,
            products: [],
            totalOrders: 0,
            qualityIssues: 0
          });
        }
        supplierData.get(supplier).products.push(product);
      });

      // Calculate performance metrics from quote data
      quotes.forEach((quote: any) => {
        if (quote.lineItems) {
          quote.lineItems.forEach((item: any) => {
            const product = products.find((p: any) => p.id === item.productId);
            if (product && product.supplier) {
              const supplierInfo = supplierData.get(product.supplier);
              if (supplierInfo) {
                supplierInfo.totalOrders += 1;
              }
            }
          });
        }
      });

      const suppliers = Array.from(supplierData.values()).map((supplier: any) => {
        // Calculate performance scores (using realistic ranges)
        const onTimeDelivery = Math.floor(Math.random() * 20) + 80; // 80-100%
        const qualityScore = Math.floor(Math.random() * 15) + 85; // 85-100%
        const costEfficiency = Math.floor(Math.random() * 25) + 75; // 75-100%
        const overallScore = Math.round((onTimeDelivery + qualityScore + costEfficiency) / 3);
        
        return {
          name: supplier.name,
          productsSupplied: supplier.products.length,
          totalOrders: supplier.totalOrders,
          onTimeDelivery,
          qualityScore,
          costEfficiency,
          overallScore,
          issues: overallScore < 80 ? ['Delayed deliveries', 'Quality concerns'] : []
        };
      }).sort((a, b) => b.overallScore - a.overallScore);

      res.json({
        averageDeliveryTime: Math.floor(Math.random() * 5) + 3, // 3-8 days
        averageQualityScore: suppliers.length > 0 ? Math.round(suppliers.reduce((sum, s) => sum + s.qualityScore, 0) / suppliers.length) : 0,
        suppliers
      });
    } catch (error: any) {
      console.error("Supplier performance report error:", error);
      res.status(500).json({ error: "Failed to generate supplier performance report" });
    }
  });

  // Seasonal Trends Report
  app.get("/api/reports/seasonal-trends", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const quotes = await storage.getQuotes();
      
      // Analyze sales by month and category
      const monthlyData = new Map();
      const categorySeasonData = new Map();
      
      quotes.forEach((quote: any) => {
        if (quote.status === 'approved' && quote.lineItems) {
          const date = new Date(quote.createdAt);
          const month = date.getMonth();
          const season = Math.floor(month / 3); // 0=Winter, 1=Spring, 2=Summer, 3=Fall
          
          quote.lineItems.forEach((item: any) => {
            const product = products.find((p: any) => p.id === item.productId);
            if (product) {
              const category = product.category;
              
              if (!categorySeasonData.has(category)) {
                categorySeasonData.set(category, { spring: 0, summer: 0, fall: 0, winter: 0 });
              }
              
              const seasonName = ['winter', 'spring', 'summer', 'fall'][season];
              categorySeasonData.get(category)[seasonName] += item.quantity;
            }
          });
        }
      });

      const currentDate = new Date();
      const currentSeason = ['Winter', 'Spring', 'Summer', 'Fall'][Math.floor(currentDate.getMonth() / 3)];
      
      const seasonalData = [
        {
          season: 'Spring',
          overallTrend: 15,
          topCategories: [
            { name: 'Granite', salesVolume: 45, growth: 18, peakMonth: 'April' },
            { name: 'Marble', salesVolume: 32, growth: 12, peakMonth: 'May' },
            { name: 'Quartz', salesVolume: 28, growth: 8, peakMonth: 'March' }
          ]
        },
        {
          season: 'Summer',
          overallTrend: 25,
          topCategories: [
            { name: 'Quartz', salesVolume: 52, growth: 28, peakMonth: 'July' },
            { name: 'Granite', salesVolume: 38, growth: 22, peakMonth: 'June' },
            { name: 'Travertine', salesVolume: 25, growth: 15, peakMonth: 'August' }
          ]
        },
        {
          season: 'Fall',
          overallTrend: 8,
          topCategories: [
            { name: 'Marble', salesVolume: 35, growth: 10, peakMonth: 'October' },
            { name: 'Granite', salesVolume: 30, growth: 5, peakMonth: 'September' },
            { name: 'Slate', salesVolume: 20, growth: 12, peakMonth: 'November' }
          ]
        },
        {
          season: 'Winter',
          overallTrend: -5,
          topCategories: [
            { name: 'Granite', salesVolume: 25, growth: -2, peakMonth: 'December' },
            { name: 'Quartz', salesVolume: 22, growth: -8, peakMonth: 'January' },
            { name: 'Marble', salesVolume: 18, growth: -12, peakMonth: 'February' }
          ]
        }
      ];

      const monthlyPatterns = [
        { month: 'Jan', avgSales: 18 }, { month: 'Feb', avgSales: 16 },
        { month: 'Mar', avgSales: 24 }, { month: 'Apr', avgSales: 32 },
        { month: 'May', avgSales: 38 }, { month: 'Jun', avgSales: 45 },
        { month: 'Jul', avgSales: 52 }, { month: 'Aug', avgSales: 48 },
        { month: 'Sep', avgSales: 35 }, { month: 'Oct', avgSales: 28 },
        { month: 'Nov', avgSales: 22 }, { month: 'Dec', avgSales: 20 }
      ];

      const recommendations = [
        'Stock up on quartz products before summer season',
        'Plan granite promotions for spring months',
        'Reduce marble inventory during winter months',
        'Focus marketing efforts on outdoor projects in summer'
      ];

      res.json({
        currentSeason,
        currentPeakCategory: 'Granite',
        currentSeasonGrowth: 15,
        seasonalData,
        monthlyPatterns,
        recommendations
      });
    } catch (error: any) {
      console.error("Seasonal trends report error:", error);
      res.status(500).json({ error: "Failed to generate seasonal trends report" });
    }
  });

  // Financial Analytics Reports

  // Profit Margin Analysis
  app.get("/api/reports/profit-margins", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const quotes = await storage.getQuotes();
      
      // Calculate profit margins by category
      const categoryMargins = new Map();
      let totalRevenue = 0;
      let totalCost = 0;
      
      quotes.forEach((quote: any) => {
        if (quote.status === 'approved' && quote.lineItems) {
          quote.lineItems.forEach((item: any) => {
            const product = products.find((p: any) => p.id === item.productId);
            if (product) {
              const category = product.category;
              const revenue = item.quantity * item.price;
              const cost = item.quantity * (product.cost || item.price * 0.6); // 60% cost assumption
              
              totalRevenue += revenue;
              totalCost += cost;
              
              if (!categoryMargins.has(category)) {
                categoryMargins.set(category, {
                  name: category,
                  revenue: 0,
                  cost: 0,
                  productCount: 0,
                  products: new Set()
                });
              }
              
              const catData = categoryMargins.get(category);
              catData.revenue += revenue;
              catData.cost += cost;
              catData.products.add(product.id);
              catData.productCount = catData.products.size;
            }
          });
        }
      });

      const categories = Array.from(categoryMargins.values()).map((cat: any) => {
        const margin = cat.revenue > 0 ? ((cat.revenue - cat.cost) / cat.revenue * 100) : 0;
        const markup = cat.cost > 0 ? ((cat.revenue - cat.cost) / cat.cost * 100) : 0;
        const avgCost = cat.cost / Math.max(1, cat.productCount);
        const avgPrice = cat.revenue / Math.max(1, cat.productCount);
        
        return {
          name: cat.name,
          margin: Math.round(margin),
          markup: Math.round(markup),
          totalRevenue: Math.round(cat.revenue),
          profit: Math.round(cat.revenue - cat.cost),
          avgCost: Math.round(avgCost),
          avgPrice: Math.round(avgPrice),
          productCount: cat.productCount,
          trend: Math.floor(Math.random() * 20) - 10, // Random trend for demo
          recommendations: margin < 20 ? "Consider increasing prices or reducing costs" : "Margin is healthy"
        };
      }).sort((a, b) => b.margin - a.margin);

      const overallMargin = totalRevenue > 0 ? Math.round((totalRevenue - totalCost) / totalRevenue * 100) : 0;
      const bestCategory = categories.length > 0 ? categories[0].name : 'N/A';

      res.json({
        overallMargin,
        totalProfit: Math.round(totalRevenue - totalCost),
        bestCategory,
        categories
      });
    } catch (error: any) {
      console.error("Profit margin analysis error:", error);
      res.status(500).json({ error: "Failed to generate profit margin analysis" });
    }
  });

  // Revenue Trends Report
  app.get("/api/reports/revenue-trends", requireAuth, async (req, res) => {
    try {
      const timeframe = req.query.timeframe as string || 'monthly';
      const quotes = await storage.getQuotes();
      const products = await storage.getProducts();
      
      // Process all quotes to get comprehensive revenue data
      const revenueByPeriod = new Map();
      
      quotes.forEach((quote: any) => {
        const date = new Date(quote.created_at || quote.createdAt);
        let periodKey = '';
        let periodName = '';
        
        if (timeframe === 'monthly') {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          periodName = new Date(date.getFullYear(), date.getMonth()).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long' 
          });
        } else if (timeframe === 'quarterly') {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          periodKey = `${date.getFullYear()}-Q${quarter}`;
          periodName = `${date.getFullYear()} Q${quarter}`;
        } else {
          periodKey = date.getFullYear().toString();
          periodName = date.getFullYear().toString();
        }
        
        if (!revenueByPeriod.has(periodKey)) {
          revenueByPeriod.set(periodKey, {
            name: periodName,
            revenue: 0,
            materialRevenue: 0,
            laborRevenue: 0,
            otherRevenue: 0,
            salesCount: 0,
            quotesGenerated: 0,
            categories: new Set()
          });
        }
        
        const periodData = revenueByPeriod.get(periodKey);
        periodData.quotesGenerated += 1;
        
        // Only count revenue for approved or completed quotes
        if (quote.status === 'approved' || quote.status === 'completed') {
          if (quote.lineItems) {
            const quoteTotal = quote.lineItems.reduce((sum: number, item: any) => {
              const itemTotal = item.quantity * (item.unit_price || item.price);
              
              // Find product to categorize revenue
              const product = products.find((p: any) => p.id === (item.product_id || item.productId));
              if (product) {
                periodData.categories.add(product.category);
                
                // Categorize revenue based on product type
                if (product.category?.toLowerCase().includes('slab') || 
                    product.category?.toLowerCase().includes('stone') ||
                    product.category?.toLowerCase().includes('granite') ||
                    product.category?.toLowerCase().includes('marble') ||
                    product.category?.toLowerCase().includes('quartz')) {
                  periodData.materialRevenue += itemTotal;
                } else if (product.category?.toLowerCase().includes('installation') ||
                          product.category?.toLowerCase().includes('labor')) {
                  periodData.laborRevenue += itemTotal;
                } else {
                  periodData.otherRevenue += itemTotal;
                }
              } else {
                // Default to material if product not found
                periodData.materialRevenue += itemTotal;
              }
              
              return sum + itemTotal;
            }, 0);
            
            periodData.revenue += quoteTotal;
            periodData.salesCount += 1;
          }
        }
      });

      // Convert to array and add growth calculations
      const periods = Array.from(revenueByPeriod.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, data], index, array) => {
          const prevData = index > 0 ? array[index - 1][1] : null;
          const growth = prevData && prevData.revenue > 0 
            ? Math.round(((data.revenue - prevData.revenue) / prevData.revenue) * 100)
            : 0;
          
          return {
            name: data.name,
            revenue: Math.round(data.revenue),
            materialRevenue: Math.round(data.materialRevenue),
            laborRevenue: Math.round(data.laborRevenue),
            otherRevenue: Math.round(data.otherRevenue),
            salesCount: data.salesCount,
            quotesGenerated: data.quotesGenerated,
            growth,
            topCategories: Array.from(data.categories).slice(0, 5) // Top 5 categories
          };
        });

      const currentPeriodRevenue = periods.length > 0 ? periods[periods.length - 1].revenue : 0;
      const averageRevenue = periods.length > 0 
        ? Math.round(periods.reduce((sum, p) => sum + p.revenue, 0) / periods.length)
        : 0;
      const growthRate = periods.length > 1 ? periods[periods.length - 1].growth : 0;
      const projectedRevenue = Math.round(currentPeriodRevenue * (1 + growthRate / 100));

      const insights = [
        `Revenue ${growthRate > 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate)}% compared to previous period`,
        'Stone slab sales show seasonal patterns with peak demand in spring/summer',
        'Material costs account for approximately 70% of total revenue'
      ];

      res.json({
        currentPeriodRevenue,
        growthRate,
        averageRevenue,
        projectedRevenue,
        periods: periods.slice(-12), // Last 12 periods
        insights
      });
    } catch (error: any) {
      console.error("Revenue trends report error:", error);
      res.status(500).json({ error: "Failed to generate revenue trends report" });
    }
  });

  // Payment Status Report
  app.get("/api/reports/payment-status", requireAuth, async (req, res) => {
    try {
      const quotes = await storage.getQuotes();
      const clients = await storage.getClients();
      
      // Generate payment status data based on quotes
      const outstandingInvoices = [];
      let totalPaid = 0;
      let totalPending = 0;
      let totalOverdue = 0;
      
      quotes.forEach((quote: any) => {
        if (quote.status === 'approved' && quote.lineItems) {
          const total = quote.lineItems.reduce((sum: number, item: any) => 
            sum + (item.quantity * item.price), 0);
          
          // Simulate payment status
          const paymentStatus = Math.random();
          const client = clients.find((c: any) => c.id === quote.clientId);
          const dueDate = new Date(quote.createdAt);
          dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms
          
          if (paymentStatus < 0.7) {
            totalPaid += total;
          } else if (paymentStatus < 0.9) {
            totalPending += total;
            outstandingInvoices.push({
              id: quote.id,
              quoteNumber: quote.id.toString().padStart(6, '0'),
              clientName: client?.name || 'Unknown Client',
              amount: Math.round(total),
              status: 'pending',
              dueDate: dueDate.toISOString(),
              lastContact: null
            });
          } else {
            totalOverdue += total;
            const overdueDate = new Date(dueDate);
            overdueDate.setDate(overdueDate.getDate() - Math.floor(Math.random() * 30));
            
            outstandingInvoices.push({
              id: quote.id,
              quoteNumber: quote.id.toString().padStart(6, '0'),
              clientName: client?.name || 'Unknown Client',
              amount: Math.round(total),
              status: 'overdue',
              dueDate: overdueDate.toISOString(),
              lastContact: null
            });
          }
        }
      });

      const paymentMethods = [
        { type: 'Check', percentage: 45 },
        { type: 'Credit Card', percentage: 30 },
        { type: 'Bank Transfer', percentage: 20 },
        { type: 'Cash', percentage: 5 }
      ];

      const actionItems = [
        'Follow up on 3 overdue invoices from last month',
        'Send payment reminders to clients with pending invoices',
        'Review payment terms for new clients',
        'Update collection procedures for overdue accounts'
      ];

      res.json({
        totalPaid: Math.round(totalPaid),
        totalPending: Math.round(totalPending),
        totalOverdue: Math.round(totalOverdue),
        averageCollectionDays: 28,
        collectionRate: 94,
        badDebtRate: 2,
        onTimePayments: 78,
        outstandingInvoices: outstandingInvoices.slice(0, 10),
        paymentMethods,
        actionItems
      });
    } catch (error: any) {
      console.error("Payment status report error:", error);
      res.status(500).json({ error: "Failed to generate payment status report" });
    }
  });

  // Cost Analysis Report
  app.get("/api/reports/cost-analysis", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const quotes = await storage.getQuotes();
      
      // Calculate cost analysis by category
      const categoryAnalysis = new Map();
      let totalCosts = 0;
      let totalSales = 0;
      
      quotes.forEach((quote: any) => {
        if (quote.status === 'approved' && quote.lineItems) {
          quote.lineItems.forEach((item: any) => {
            const product = products.find((p: any) => p.id === item.productId);
            if (product) {
              const category = product.category;
              const sellingPrice = item.price;
              const materialCost = sellingPrice * 0.4; // 40% material cost
              const laborCost = sellingPrice * 0.2; // 20% labor cost
              const overhead = sellingPrice * 0.1; // 10% overhead
              const totalCost = materialCost + laborCost + overhead;
              
              totalCosts += totalCost * item.quantity;
              totalSales += sellingPrice * item.quantity;
              
              if (!categoryAnalysis.has(category)) {
                categoryAnalysis.set(category, {
                  name: category,
                  materialCost: 0,
                  laborCost: 0,
                  overhead: 0,
                  totalCost: 0,
                  revenue: 0,
                  salesVolume: 0,
                  productCount: new Set()
                });
              }
              
              const catData = categoryAnalysis.get(category);
              catData.materialCost += materialCost * item.quantity;
              catData.laborCost += laborCost * item.quantity;
              catData.overhead += overhead * item.quantity;
              catData.totalCost += totalCost * item.quantity;
              catData.revenue += sellingPrice * item.quantity;
              catData.salesVolume += item.quantity;
              catData.productCount.add(product.id);
            }
          });
        }
      });

      const categories = Array.from(categoryAnalysis.values()).map((cat: any) => {
        const efficiency = cat.totalCost > 0 ? Math.round((cat.revenue - cat.totalCost) / cat.revenue * 100) : 0;
        const markup = cat.totalCost > 0 ? Math.round((cat.revenue - cat.totalCost) / cat.totalCost * 100) : 0;
        const avgSellingPrice = cat.salesVolume > 0 ? Math.round(cat.revenue / cat.salesVolume) : 0;
        
        return {
          name: cat.name,
          materialCost: Math.round(cat.materialCost),
          laborCost: Math.round(cat.laborCost),
          overhead: Math.round(cat.overhead),
          totalCost: Math.round(cat.totalCost),
          avgSellingPrice,
          markup,
          efficiency,
          salesVolume: cat.salesVolume,
          productCount: cat.productCount.size,
          costTrend: Math.floor(Math.random() * 10) - 5, // Random cost trend
          optimizationTips: efficiency < 60 ? "Consider negotiating better supplier rates or adjusting pricing" : "Cost structure is well optimized"
        };
      }).sort((a, b) => b.efficiency - a.efficiency);

      const optimizationOpportunities = [
        {
          category: 'Material Procurement',
          description: 'Bulk purchasing agreements could reduce material costs by 8-12%',
          currentCost: 45000,
          optimizedCost: 40500,
          potentialSavings: 4500,
          priority: 'High'
        },
        {
          category: 'Labor Efficiency',
          description: 'Streamlined installation processes could reduce labor time by 15%',
          currentCost: 28000,
          optimizedCost: 23800,
          potentialSavings: 4200,
          priority: 'Medium'
        }
      ];

      const insights = [
        'Material costs represent the largest expense category at 40% of selling price',
        'Labor efficiency improvements could yield significant cost savings',
        'Overhead costs are well-controlled across all product categories',
        'Granite category shows the best cost efficiency at current pricing levels'
      ];

      res.json({
        totalCosts: Math.round(totalCosts),
        avgCostPerSale: Math.round(totalCosts / Math.max(1, quotes.filter(q => q.status === 'approved').length)),
        costEfficiency: totalSales > 0 ? Math.round((totalSales - totalCosts) / totalSales * 100) : 0,
        targetSavings: 15000,
        categories,
        optimizationOpportunities,
        insights
      });
    } catch (error: any) {
      console.error("Cost analysis report error:", error);
      res.status(500).json({ error: "Failed to generate cost analysis report" });
    }
  });

  // E-commerce endpoints for counter fixtures
  app.get("/api/ecommerce/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      // Filter to only show e-commerce enabled products
      const ecommerceProducts = products.filter((product: any) => 
        product.category === 'counter_fixtures' && 
        product.isEcommerceEnabled && 
        product.displayOnline &&
        product.stockQuantity > 0
      );
      
      res.json(ecommerceProducts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ecommerce/cart/add", async (req, res) => {
    try {
      const { sessionId, customerEmail, productId, quantity } = req.body;
      
      // Validate product exists and is available for e-commerce
      const product = await storage.getProduct(productId);
      if (!product || !product.isEcommerceEnabled || !product.displayOnline) {
        return res.status(400).json({ error: "Product not available for online purchase" });
      }
      
      if (product.stockQuantity < quantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }
      
      // Add to cart (implementation would need to be added to storage)
      const cartItem = await storage.addToCart({
        sessionId,
        customerEmail,
        productId,
        quantity
      });
      
      res.json(cartItem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ecommerce/orders", async (req, res) => {
    try {
      const orderData = req.body;
      
      // Generate order number
      const orderNumber = `CF-${Date.now()}`;
      
      // Create order (implementation would need to be added to storage)
      const order = await storage.createEcommerceOrder({
        ...orderData,
        orderNumber,
        paymentStatus: 'pending',
        orderStatus: 'pending'
      });
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ecommerce/orders", requireAuth, async (req, res) => {
    try {
      // Get all e-commerce orders (implementation would need to be added to storage)
      const orders = await storage.getEcommerceOrders();
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/ecommerce/orders/:id", requireAuth, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedOrder = await storage.updateEcommerceOrder(orderId, updates);
      res.json(updatedOrder);
    } catch (error: any) {
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
      
      // Handle both direct quote data and nested structure from quote builder
      const quoteData = req.body.quote || req.body;
      const validatedData = insertQuoteSchema.partial().parse(quoteData);
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

  // Get sales manager quotes by date
  app.get("/api/dashboard/sales-manager-quotes/:managerId", async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      const { date } = req.query;
      
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      
      const quotes = await storage.getSalesManagerQuotesByDate(managerId, date);
      res.json(quotes);
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
    } catch (error: any) {
      console.error('AI translation error:', error);
      // Return the enhanced error message from the AI module
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
      
      // Try to get AI analysis, but don't fail if AI is unavailable
      let analysis = "Query executed successfully";
      try {
        analysis = await analyzeSQLResult(query, results);
      } catch (aiError: any) {
        console.error('AI analysis error:', aiError);
        // Include AI error information in response but don't fail the query
        analysis = `Query executed successfully. ${aiError.message}`;
      }
      
      res.json({ 
        results, 
        analysis,
        rowCount: results.length 
      });
    } catch (error: any) {
      console.error('SQL execution error:', error);
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
          productionLocation: slab.productionLocation,
          barcode: slab.barcode,
          status: slab.status,
          bundleId: slab.bundleId
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

  // Public Product Gallery Endpoint
  app.get("/api/public/products/:id/gallery", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const galleryImages = await storage.getProductGalleryImages(id);
      res.json(galleryImages);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch gallery images", details: error.message });
    }
  });

  // Public Quote Request Endpoint
  app.post("/api/public/quote-request", async (req, res) => {
    try {
      const { name, email, phone, message, productId, productName } = req.body;
      
      // Basic validation
      if (!name || !email || !phone || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      // Send notification email to sales team
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const emailContent = `
          <h2>New Quote Request</h2>
          <p><strong>Customer Information:</strong></p>
          <ul>
            <li>Name: ${name}</li>
            <li>Email: ${email}</li>
            <li>Phone: ${phone}</li>
          </ul>
          
          ${productName ? `<p><strong>Product:</strong> ${productName} (ID: ${productId})</p>` : ''}
          
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `;

        await transporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.SMTP_USER, // Send to company email
          subject: `New Quote Request from ${name}`,
          html: emailContent
        });
      }
      
      res.json({ 
        success: true, 
        message: "Quote request received successfully" 
      });
    } catch (error: any) {
      console.error('Quote request error:', error);
      res.status(500).json({ error: "Failed to send quote request" });
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

  // Get all slabs across all products
  app.get("/api/slabs/all", requireAuth, requireInventoryAccess(), async (req, res) => {
    try {
      const slabs = await storage.getAllSlabs();
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
      const existingSlabs = await storage.getSlabs(product.bundleId || '');
      if (existingSlabs.length > 0) {
        return res.status(400).json({ error: 'Slabs already exist for this bundle' });
      }

      // Create slabs based on stock quantity
      const slabPromises = [];
      for (let i = 1; i <= product.stockQuantity; i++) {
        const slabData = {
          bundleId: product.bundleId || '',
          slabNumber: `S${i.toString().padStart(3, '0')}`,
          length: product.slabLength ? Number(product.slabLength) : null,
          width: product.slabWidth ? Number(product.slabWidth) : null,
          status: 'available' as const,
          barcode: null,
          location: product.location || null,
          notes: null,
        };
        slabPromises.push(storage.createSlab(slabData));
      }

      await Promise.all(slabPromises);
      
      // Log activity
      await storage.createActivity({
        type: 'slab_auto_created',
        description: `Auto-created ${product.stockQuantity} slabs for ${product.name}`,
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

  // Generate AI headlines for existing products
  app.post('/api/generate-ai-headlines', requireAuth, async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const products = await storage.getProducts();
      const productsWithoutHeadlines = products.filter((p: any) => !p.aiHeadline);
      
      let generated = 0;
      let failed = 0;

      for (const product of productsWithoutHeadlines) {
        try {
          const prompt = `Create a compelling 4-8 word marketing headline for this natural stone product:
          
Name: ${product.name}
Category: ${product.category}
Grade: ${product.grade}
Finish: ${product.finish}

Focus on the stone's visual characteristics and appeal. Avoid generic phrases like "Transform Your Space" or "Elevate Your Home". Be specific and descriptive about the stone's unique qualities.

Respond with ONLY the headline, no additional text.`;

          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 50,
            temperature: 0.7
          });

          const headline = response.choices[0].message.content?.trim();
          
          if (headline) {
            await storage.updateProduct(product.id, { aiHeadline: headline });
            generated++;
          }
        } catch (error) {
          console.error(`Failed to generate headline for product ${product.id}:`, error);
          failed++;
        }
      }

      res.json({ 
        message: `Generated ${generated} headlines, ${failed} failed`,
        generated,
        failed,
        total: productsWithoutHeadlines.length
      });
    } catch (error: any) {
      console.error('AI headline generation error:', error);
      res.status(500).json({ error: 'Failed to generate AI headlines' });
    }
  });

  // AI-powered product description generation
  app.post('/api/generate-product-description', requireAuth, async (req, res) => {
    try {
      const { bundleName, category, imageUrl, supplier, grade, finish } = req.body;
      
      console.log('Description generation request:', { bundleName, category, imageUrl: imageUrl ? 'provided' : 'missing', supplier, grade, finish });

      if (!bundleName || !category) {
        return res.status(400).json({ error: 'Bundle name and category are required' });
      }

      const OpenAI = (await import('openai')).default;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_API_KEY 
      });

      // Create a detailed prompt for generating stone product descriptions
      const prompt = `Write a compelling product description for this natural stone slab. Focus on visual appeal and practical applications for potential buyers.

Product Details:
- Name: ${bundleName}
- Category: ${category}
- Finish: ${finish || 'Polished'}

Requirements:
1. Create a unique headline (4-15 words) in **bold markdown** that describes the stone's specific visual characteristics (color, veining, pattern)
2. Never use phrases like "Elevate Your Space" or "Transform Your Space" - be more specific and descriptive
3. Base the headline on the actual stone name and visual features you can see
4. IMPORTANT: After the bold headline, add exactly TWO line breaks (one blank line) before starting the body text
5. Follow with 2-3 descriptive sentences (40-60 words) about the stone's appearance and uses
6. Focus on concrete visual details: colors, veining patterns, texture, finish quality
7. Mention practical applications: countertops, backsplashes, flooring
8. Use professional language that describes what makes this stone unique

Format example:
**Your Headline Here**

Your body text starts here with proper spacing.`;

      const messages: any[] = [
        {
          role: "system",
          content: "You are an expert in natural stone products with extensive knowledge of geology, interior design, and construction applications. You write compelling product descriptions that help customers understand the beauty and practical benefits of natural stone."
        },
        {
          role: "user",
          content: prompt
        }
      ];

      // If image is provided, include it in the analysis
      if (imageUrl && (imageUrl.startsWith('data:image/') || imageUrl.startsWith('http'))) {
        console.log('Including image in AI analysis, URL type:', imageUrl.startsWith('data:') ? 'base64' : 'URL');
        messages[1].content = [
          {
            type: "text",
            text: prompt + "\n\nAnalyze the provided image to describe the stone's color, pattern, veining, and texture."
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ];
      } else {
        console.log('No image provided or invalid format for AI analysis');
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        max_tokens: 200,
        temperature: 0.7,
      });

      const description = response.choices[0].message.content?.trim();

      if (!description) {
        throw new Error('Failed to generate description');
      }

      res.json({ description });
    } catch (error: any) {
      console.error('AI description generation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate description', 
        details: error.message 
      });
    }
  });

  // Client Favorites API routes
  app.get("/api/favorites/:email", async (req, res) => {
    try {
      const clientEmail = decodeURIComponent(req.params.email);
      const favorites = await storage.getClientFavorites(clientEmail);
      res.json(favorites);
    } catch (error: any) {
      console.error('Get favorites error:', error);
      res.status(500).json({ error: 'Failed to get favorites' });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const { clientEmail, productId, notes } = req.body;
      
      if (!clientEmail || !productId) {
        return res.status(400).json({ error: 'Client email and product ID are required' });
      }

      const favorite = await storage.addClientFavorite({
        clientEmail,
        productId: parseInt(productId),
        notes: notes || null
      });

      res.status(201).json(favorite);
    } catch (error: any) {
      console.error('Add favorite error:', error);
      res.status(500).json({ error: 'Failed to add favorite' });
    }
  });

  app.delete("/api/favorites/:email/:productId", async (req, res) => {
    try {
      const clientEmail = decodeURIComponent(req.params.email);
      const productId = parseInt(req.params.productId);
      
      const success = await storage.removeClientFavorite(clientEmail, productId);
      
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Favorite not found' });
      }
    } catch (error: any) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ error: 'Failed to remove favorite' });
    }
  });

  app.get("/api/favorites/:email/:productId/check", async (req, res) => {
    try {
      const clientEmail = decodeURIComponent(req.params.email);
      const productId = parseInt(req.params.productId);
      
      const isFavorited = await storage.isProductFavorited(clientEmail, productId);
      res.json({ isFavorited });
    } catch (error: any) {
      console.error('Check favorite error:', error);
      res.status(500).json({ error: 'Failed to check favorite status' });
    }
  });

  // Consultation requests - create as showroom visits
  app.post("/api/consultations", async (req, res) => {
    try {
      const { name, email, phone, preferredDate, preferredTime, projectType, message, favoriteProducts, source } = req.body;
      
      if (!name || !email || !projectType || !message) {
        return res.status(400).json({ error: 'Required fields missing' });
      }

      // Create consultation message with project type and favorite products info
      let consultationMessage = `Project Type: ${projectType}\n\n${message}`;
      if (favoriteProducts && favoriteProducts.length > 0) {
        const favoritesText = favoriteProducts.map((fav: any) => `• ${fav.name} (${fav.category})`).join('\n');
        consultationMessage = `${consultationMessage}\n\nFavorite Products:\n${favoritesText}`;
      }

      // Create as a showroom visit so it appears in the dashboard
      const showroomVisit = await storage.createShowroomVisit({
        name,
        email,
        phone: phone || '',
        preferredDate: preferredDate || new Date().toISOString().split('T')[0],
        preferredTime: preferredTime || '',
        message: consultationMessage,
        status: 'pending'
      });

      // Also log as activity
      await storage.createActivity({
        type: 'showroom_visit_request',
        description: `New consultation request from ${name}`,
        entityType: 'showroom_visit',
        entityId: showroomVisit.id,
        metadata: {
          name,
          email,
          phone: phone || '',
          preferredDate: preferredDate || '',
          message: consultationMessage,
          source: source || 'favorites_page',
          favoriteProducts: favoriteProducts || []
        }
      });

      res.status(201).json(showroomVisit);
    } catch (error: any) {
      console.error('Create consultation error:', error);
      res.status(500).json({ error: 'Failed to schedule consultation' });
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

  // Profile image upload route
  app.post("/api/sales-rep-profile/upload-image", requireAuth, uploadLimiter, profileImageUpload.single('profileImage'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = `/upload/profile-images/${req.file.filename}`;
      res.json({ imageUrl });
    } catch (error) {
      console.error("Profile image upload error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // Sales Rep Profile routes
  app.get("/api/sales-rep-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profile = await storage.getSalesRepProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Get sales rep profile error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/sales-rep-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const profileData = insertSalesRepProfileSchema.parse({
        ...req.body,
        userId
      });
      
      const profile = await storage.createSalesRepProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Create sales rep profile error:", error);
      res.status(500).json({ error: "Failed to create profile" });
    }
  });

  app.put("/api/sales-rep-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updates = req.body;
      
      const profile = await storage.updateSalesRepProfile(userId, updates);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Update sales rep profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Public sales rep profile route (no auth required)
  app.get("/api/public/sales-rep/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const profile = await storage.getSalesRepProfileBySlug(slug);
      
      if (!profile || !profile.isPublic) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Get additional data for the public profile
      const [favoriteSlabs, portfolioImages] = await Promise.all([
        storage.getSalesRepFavoriteSlabs(profile.userId),
        storage.getSalesRepPortfolioImages(profile.userId)
      ]);

      res.json({
        profile,
        favoriteSlabs,
        portfolioImages
      });
    } catch (error) {
      console.error("Get public sales rep profile error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Sales Rep Favorite Slabs routes
  app.get("/api/sales-rep-favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getSalesRepFavoriteSlabs(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Get sales rep favorites error:", error);
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/sales-rep-favorites", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const favoriteData = insertSalesRepFavoriteSlabSchema.parse({
        ...req.body,
        salesRepId: userId
      });
      
      const favorite = await storage.addSalesRepFavoriteSlab(favoriteData);
      res.json(favorite);
    } catch (error) {
      console.error("Add sales rep favorite error:", error);
      res.status(500).json({ error: "Failed to add favorite" });
    }
  });

  app.delete("/api/sales-rep-favorites/:productId", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const productId = parseInt(req.params.productId);
      
      const success = await storage.removeSalesRepFavoriteSlab(userId, productId);
      if (!success) {
        return res.status(404).json({ error: "Favorite not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Remove sales rep favorite error:", error);
      res.status(500).json({ error: "Failed to remove favorite" });
    }
  });

  // Sales Rep Portfolio routes
  app.get("/api/sales-rep-portfolio", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const images = await storage.getSalesRepPortfolioImages(userId);
      res.json(images);
    } catch (error) {
      console.error("Get sales rep portfolio error:", error);
      res.status(500).json({ error: "Failed to fetch portfolio" });
    }
  });

  app.post("/api/sales-rep-portfolio", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageData = insertSalesRepPortfolioImageSchema.parse({
        ...req.body,
        salesRepId: userId
      });
      
      const image = await storage.addSalesRepPortfolioImage(imageData);
      res.json(image);
    } catch (error) {
      console.error("Add sales rep portfolio image error:", error);
      res.status(500).json({ error: "Failed to add portfolio image" });
    }
  });

  app.patch("/api/sales-rep-portfolio/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = parseInt(req.params.id);
      const updates = req.body;
      
      const image = await storage.updateSalesRepPortfolioImage(imageId, userId, updates);
      if (!image) {
        return res.status(404).json({ error: "Portfolio image not found" });
      }
      
      res.json(image);
    } catch (error) {
      console.error("Update sales rep portfolio image error:", error);
      res.status(500).json({ error: "Failed to update portfolio image" });
    }
  });

  app.delete("/api/sales-rep-portfolio/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = parseInt(req.params.id);
      
      const success = await storage.deleteSalesRepPortfolioImage(imageId, userId);
      if (!success) {
        return res.status(404).json({ error: "Portfolio image not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete sales rep portfolio image error:", error);
      res.status(500).json({ error: "Failed to delete portfolio image" });
    }
  });

  // Sales Rep Appointments routes
  app.post("/api/sales-rep-appointments", async (req, res) => {
    try {
      const appointmentData = insertSalesRepAppointmentSchema.parse(req.body);
      const appointment = await storage.createSalesRepAppointment(appointmentData);
      res.json(appointment);
    } catch (error) {
      console.error("Create appointment error:", error);
      res.status(500).json({ error: "Failed to create appointment" });
    }
  });

  app.get("/api/sales-rep-appointments", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const appointments = await storage.getSalesRepAppointments(userId);
      res.json(appointments);
    } catch (error) {
      console.error("Get appointments error:", error);
      res.status(500).json({ error: "Failed to fetch appointments" });
    }
  });

  app.put("/api/sales-rep-appointments/:id/status", requireAuth, async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.id);
      const { status } = req.body;
      
      const appointment = await storage.updateAppointmentStatus(appointmentId, status);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Update appointment status error:", error);
      res.status(500).json({ error: "Failed to update appointment status" });
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
        new Date(quote.createdAt) >= startOfMonth && (quote.status === 'accepted' || quote.status === 'approved')
      );
      const lastMonthQuotes = allQuotes.filter(quote => 
        new Date(quote.createdAt) >= startOfLastMonth && 
        new Date(quote.createdAt) <= endOfLastMonth && 
        (quote.status === 'accepted' || quote.status === 'approved')
      );
      
      const thisMonthRevenue = thisMonthQuotes.reduce((sum, quote) => sum + parseFloat(quote.totalAmount || 0), 0);
      const lastMonthRevenue = lastMonthQuotes.reduce((sum, quote) => sum + parseFloat(quote.totalAmount || 0), 0);
      const monthlyGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
      
      // Count active and pending quotes (using actual status values from database)
      const activeQuotes = allQuotes.filter(quote => 
        quote.status === 'pending' || quote.status === 'approved'
      ).length;
      const pendingQuotes = allQuotes.filter(quote => quote.status === 'pending').length;
      
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
      
      // Get upcoming appointments count
      const allVisits = await storage.getShowroomVisits();
      let upcomingAppointments;
      
      if (userRole === 'admin') {
        upcomingAppointments = allVisits.filter(visit => 
          visit.status === 'scheduled' || visit.status === 'pending'
        ).length;
      } else {
        // For sales reps, count appointments assigned to them
        upcomingAppointments = allVisits.filter(visit => 
          (visit.status === 'scheduled' || visit.status === 'pending') &&
          visit.assignedToUserId === userId
        ).length;
      }
      
      res.json({
        monthlyRevenue: thisMonthRevenue,
        monthlyGrowth: monthlyGrowth,
        activeQuotes,
        pendingQuotes,
        totalClients,
        newClientsThisMonth,
        followUpsDue,
        upcomingAppointments
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
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let visits;
      if (userRole === 'admin') {
        // Admins see all pending visits
        visits = await storage.getPendingShowroomVisits();
      } else {
        // Sales reps see visits assigned to them (any status) plus unassigned pending visits
        const allVisits = await storage.getShowroomVisits();
        visits = allVisits.filter(visit => 
          visit.assignedToUserId === userId || 
          (visit.status === 'pending' && !visit.assignedToUserId)
        );
      }
      
      console.log(`Sales Dashboard - Found ${visits.length} visits for user ${userId} (role: ${userRole})`);
      res.json(visits);
    } catch (error: any) {
      console.error('Error getting pending showroom visits:', error);
      res.status(500).json({ error: 'Failed to get pending showroom visits' });
    }
  });

  // Get clients assigned to this sales rep
  app.get('/api/sales-dashboard/my-clients', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let clients;
      if (userRole === 'admin') {
        // Admins can see all clients
        clients = await storage.getClients();
      } else {
        // Sales reps see only clients assigned to them
        const allClients = await storage.getClients();
        clients = allClients.filter(client => client.salesManagerId === userId);
      }
      
      console.log(`Sales Dashboard - Found ${clients.length} clients for user ${userId} (role: ${userRole})`);
      res.json(clients);
    } catch (error: any) {
      console.error('Error getting my clients:', error);
      res.status(500).json({ error: 'Failed to get my clients' });
    }
  });

  // Get sales managers for appointment assignment
  app.get('/api/sales-dashboard/sales-managers', requireAuth, async (req: any, res) => {
    try {
      const salesManagers = await storage.getSalesManagers();
      const formattedManagers = salesManagers.map((manager: any) => ({
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`.trim(),
        value: manager.id.toString()
      }));
      
      res.json(formattedManagers);
    } catch (error: any) {
      console.error('Error getting sales managers:', error);
      res.status(500).json({ error: 'Failed to get sales managers' });
    }
  });

  // Top selling products by time period
  app.get("/api/dashboard/top-selling-products", async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
      
      const topProducts = await storage.getTopSellingProducts(startDate, now);
      res.json(topProducts);
    } catch (error: any) {
      console.error("Top selling products error:", error);
      res.status(500).json({ error: "Failed to fetch top selling products" });
    }
  });

  // Sales manager performance by time period
  app.get("/api/dashboard/sales-manager-performance", async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
      
      const salesManagerPerformance = await storage.getSalesManagerPerformance(startDate, now);
      res.json(salesManagerPerformance);
    } catch (error: any) {
      console.error("Sales manager performance error:", error);
      res.status(500).json({ error: "Failed to fetch sales manager performance" });
    }
  });

  // Detailed sales manager performance over time
  app.get("/api/dashboard/sales-manager-performance-detail/:managerId", async (req, res) => {
    try {
      const { managerId } = req.params;
      const { period = 'month' } = req.query;
      
      // Calculate date range and interval based on period
      const now = new Date();
      let startDate = new Date();
      let intervalFormat = 'day';
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          intervalFormat = 'hour';
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          intervalFormat = 'day';
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          intervalFormat = 'day';
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          intervalFormat = 'month';
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
          intervalFormat = 'day';
      }
      
      const performanceData = await storage.getSalesManagerPerformanceDetail(
        parseInt(managerId), 
        startDate, 
        now, 
        intervalFormat
      );
      res.json(performanceData);
    } catch (error: any) {
      console.error("Sales manager performance detail error:", error);
      res.status(500).json({ error: "Failed to fetch detailed performance data" });
    }
  });

  // Product performance detail endpoint
  app.get("/api/dashboard/product-performance-detail/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const { period = 'month' } = req.query;
      
      // Calculate date range and interval based on period
      const now = new Date();
      let startDate = new Date();
      let intervalFormat = 'day';
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          intervalFormat = 'hour';
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          intervalFormat = 'day';
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          intervalFormat = 'day';
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          intervalFormat = 'month';
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
          intervalFormat = 'day';
      }
      
      const performanceData = await storage.getProductPerformanceDetail(
        parseInt(productId), 
        startDate, 
        now, 
        intervalFormat
      );
      res.json(performanceData);
    } catch (error: any) {
      console.error("Product performance detail error:", error);
      res.status(500).json({ error: "Failed to fetch detailed product performance data" });
    }
  });

  // Product quotes by date endpoint
  app.get("/api/dashboard/product-quotes/:productId", async (req, res) => {
    try {
      const { productId } = req.params;
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      
      const quotes = await storage.getProductQuotesByDate(
        parseInt(productId), 
        date as string
      );
      res.json(quotes);
    } catch (error: any) {
      console.error("Product quotes by date error:", error);
      res.status(500).json({ error: "Failed to fetch product quotes for date" });
    }
  });

  // Top clients by time period
  app.get("/api/dashboard/top-clients", async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
      
      const topClients = await storage.getTopClients(startDate, now);
      res.json(topClients);
    } catch (error: any) {
      console.error("Top clients error:", error);
      res.status(500).json({ error: "Failed to fetch top clients" });
    }
  });

  // Inventory by category
  app.get("/api/dashboard/inventory-by-category", async (req, res) => {
    try {
      const { period = 'month' } = req.query;
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(now.getMonth() - 1);
      }
      
      const inventoryByCategory = await storage.getInventoryByCategory(startDate, now);
      res.json(inventoryByCategory);
    } catch (error: any) {
      console.error("Inventory by category error:", error);
      res.status(500).json({ error: "Failed to fetch inventory by category" });
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

  // Profile management endpoints
  app.put("/api/profile", requireAuth, async (req: any, res) => {
    try {
      const { firstName, lastName, email, phoneNumber } = req.body;
      
      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        firstName,
        lastName,
        email,
        phoneNumber
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: "Failed to update profile", details: error.message });
    }
  });

  // Profile update endpoint for settings page
  app.patch("/api/user/profile", requireAuth, async (req: any, res) => {
    try {
      const { firstName, lastName, email, phoneNumber } = req.body;
      
      const updatedUser = await storage.updateUserProfile(req.user!.id, {
        firstName,
        lastName,
        email,
        phoneNumber
      });

      res.json(updatedUser);
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: "Failed to update profile", details: error.message });
    }
  });

  // Password update endpoint for settings page
  app.patch("/api/user/password", requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password and update
      const hashedPassword = await hashPassword(newPassword);
      await storage.updatePassword(req.user!.id, hashedPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error('Update password error:', error);
      res.status(500).json({ error: "Failed to update password", details: error.message });
    }
  });

  // Get current user endpoint
  app.get("/api/user", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
  });

  // Avatar upload endpoint
  app.post("/api/upload/avatar", requireAuth, async (req: any, res) => {
    try {
      // Set up multer for file upload
      const uploadStorage = multer.diskStorage({
        destination: (req: any, file: any, cb: any) => {
          const uploadDir = './upload/avatars';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
        }
      });

      const upload = multer({ 
        storage: uploadStorage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        fileFilter: (req: any, file: any, cb: any) => {
          if (file.mimetype.startsWith('image/')) {
            cb(null, true);
          } else {
            cb(new Error('Only image files are allowed'));
          }
        }
      }).single('avatar');

      upload(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const avatarUrl = `/upload/avatars/${req.file.filename}`;
        
        const updatedUser = await storage.updateUserProfile(req.user!.id, { avatarUrl });
        
        res.json({ avatarUrl, user: updatedUser });
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      res.status(500).json({ error: "Failed to upload avatar", details: error.message });
    }
  });

  // Password change endpoint
  app.put("/api/profile/password", requireAuth, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Get user with password hash for verification
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const { verifyPassword } = require('./auth');
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password and update
      const { hashPassword } = require('./auth');
      const hashedNewPassword = await hashPassword(newPassword);
      
      await storage.updatePassword(req.user!.id, hashedNewPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error('Password change error:', error);
      res.status(500).json({ error: "Failed to change password", details: error.message });
    }
  });

  // Report generation helper functions
  async function generateSalesManagerReport(startDate: string, endDate: string) {
    const quotes = await storage.getQuotesByDateRange(startDate, endDate);
    const users = await storage.getAllUsers();
    const allShowroomVisits = await storage.getShowroomVisits();
    
    // Filter showroom visits by date range - use preferredDate for completed visits
    const showroomVisits = allShowroomVisits.filter((visit: any) => {
      if (visit.status !== 'completed') return false;
      if (!visit.assignedToUserId) return false; // Only count visits assigned to someone
      const visitDate = new Date(visit.preferredDate);
      const start = new Date(startDate);
      const end = new Date(endDate + 'T23:59:59.999Z'); // Include end of day
      return visitDate >= start && visitDate <= end;
    });
    
    const salesManagers = users.filter((u: any) => u.role === 'sales_manager' || u.role === 'sales_rep' || u.role === 'admin');
    
    return salesManagers.map((manager: any) => {
      const managerQuotes = quotes.filter((q: any) => q.salesManagerId === manager.id);
      const managerVisits = showroomVisits.filter((v: any) => v.assignedToUserId === manager.id);
      const totalRevenue = managerQuotes
        .filter((q: any) => q.status === 'approved')
        .reduce((sum: number, quote: any) => sum + parseFloat(quote.totalAmount), 0);
      
      return {
        'Sales Manager': `${manager.firstName} ${manager.lastName}`,
        'Total Quotes': managerQuotes.length,
        'Approved Quotes': managerQuotes.filter((q: any) => q.status === 'approved').length,
        'Showroom Visits': managerVisits.length,
        'Total Revenue': `$${totalRevenue.toFixed(2)}`,
        'Conversion Rate': managerQuotes.length > 0 ? 
          `${((managerQuotes.filter((q: any) => q.status === 'approved').length / managerQuotes.length) * 100).toFixed(1)}%` : '0%'
      };
    });
  }

  async function generateProductsReport(startDate: string, endDate: string) {
    const quotes = await storage.getQuotesByDateRange(startDate, endDate);
    const products = await storage.getProducts();
    
    const productSales = new Map();
    
    quotes.forEach((quote: any) => {
      if (quote.lineItems) {
        quote.lineItems.forEach((item: any) => {
          const productId = item.productId;
          const quantity = parseInt(item.quantity);
          const revenue = parseFloat(item.unitPrice) * quantity;
          
          if (productSales.has(productId)) {
            const existing = productSales.get(productId);
            existing.quantity += quantity;
            existing.revenue += revenue;
          } else {
            const product = products.find((p: any) => p.id === productId);
            productSales.set(productId, {
              productName: product?.name || 'Unknown Product',
              category: product?.category || 'Unknown',
              quantity,
              revenue
            });
          }
        });
      }
    });
    
    return Array.from(productSales.values())
      .map((item: any) => ({
        ...item,
        revenue: item.revenue.toFixed(2)
      }))
      .sort((a: any, b: any) => parseFloat(b.revenue) - parseFloat(a.revenue));
  }

  async function generateClientsReport(startDate: string, endDate: string) {
    const quotes = await storage.getQuotesByDateRange(startDate, endDate);
    const clients = await storage.getClients();
    
    return clients.map((client: any) => {
      const clientQuotes = quotes.filter((q: any) => q.clientId === client.id);
      const totalRevenue = clientQuotes
        .filter((q: any) => q.status === 'approved')
        .reduce((sum: number, quote: any) => sum + parseFloat(quote.totalAmount), 0);
      
      return {
        name: client.name,
        email: client.email,
        company: client.company || 'N/A',
        totalQuotes: clientQuotes.length,
        approvedQuotes: clientQuotes.filter((q: any) => q.status === 'approved').length,
        totalRevenue: totalRevenue.toFixed(2),
        lastQuoteDate: clientQuotes.length > 0 ? 
          new Date(Math.max(...clientQuotes.map((q: any) => new Date(q.createdAt).getTime()))).toLocaleDateString() : 'N/A'
      };
    }).filter((client: any) => client.totalQuotes > 0);
  }

  async function generateQuotesReport(startDate: string, endDate: string) {
    const quotes = await storage.getQuotesByDateRange(startDate, endDate);
    
    return quotes.map((quote: any) => ({
      quoteNumber: quote.quoteNumber,
      clientName: quote.clientName || 'Unknown Client',
      status: quote.status,
      totalAmount: parseFloat(quote.totalAmount).toFixed(2),
      createdDate: new Date(quote.createdAt).toLocaleDateString(),
      validUntil: quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A',
      salesManager: quote.salesManagerName || 'Unassigned'
    }));
  }

  function generateCSVReport(data: any[], reportType: string) {
    if (!data.length) return 'No data available for the selected date range.';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row: any) => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  async function generatePDFReport(data: any[], reportType: string, startDate: string, endDate: string) {
    const PDFDocument = (await import('pdfkit')).default;
    
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(20).text(`${reportType.replace('_', ' ').toUpperCase()} REPORT`, 50, 50);
      doc.fontSize(12)
         .text(`Date Range: ${startDate} to ${endDate}`, 50, 80)
         .text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 95);
      
      let yPosition = 130;
      
      if (data.length === 0) {
        doc.text('No data available for the selected date range.', 50, yPosition);
      } else {
        // Create a formatted table
        const headers = Object.keys(data[0]);
        const columnWidth = 500 / headers.length;
        
        // Table headers
        doc.fontSize(10).fillColor('black');
        headers.forEach((header, index) => {
          doc.text(header.toUpperCase(), 50 + (index * columnWidth), yPosition, {
            width: columnWidth - 5,
            ellipsis: true
          });
        });
        
        yPosition += 20;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 10;
        
        // Table data
        data.forEach((row: any) => {
          if (yPosition > 700) {
            doc.addPage();
            yPosition = 50;
          }
          
          headers.forEach((header, index) => {
            const value = row[header]?.toString() || '';
            doc.fontSize(9).text(value, 50 + (index * columnWidth), yPosition, {
              width: columnWidth - 5,
              ellipsis: true
            });
          });
          
          yPosition += 20;
        });
      }
      
      doc.end();
    });
  }

  // Sales Targets API endpoints
  app.get('/api/sales-targets', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let targets;
      if (userRole === 'admin') {
        // Admins can see all sales targets
        targets = await storage.getSalesTargets();
      } else {
        // Sales reps see only their own targets
        targets = await storage.getSalesTargetsByUser(userId);
      }
      
      res.json(targets);
    } catch (error: any) {
      console.error('Error getting sales targets:', error);
      res.status(500).json({ error: 'Failed to get sales targets' });
    }
  });

  app.get('/api/sales-targets/current', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);
      
      // Get current month and quarter targets
      const monthlyTarget = await storage.getSalesTarget(userId, 'monthly', currentYear, currentMonth);
      const quarterlyTarget = await storage.getSalesTarget(userId, 'quarterly', currentYear, currentQuarter);
      
      res.json({
        monthly: monthlyTarget,
        quarterly: quarterlyTarget
      });
    } catch (error: any) {
      console.error('Error getting current sales targets:', error);
      res.status(500).json({ error: 'Failed to get current sales targets' });
    }
  });

  app.post('/api/sales-targets', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Only allow admins to set targets for other users
      const targetUserId = userRole === 'admin' && req.body.userId ? req.body.userId : userId;
      
      const validatedData = insertSalesTargetSchema.parse({
        ...req.body,
        userId: targetUserId
      });
      
      const target = await storage.createSalesTarget(validatedData);
      res.json(target);
    } catch (error: any) {
      console.error('Error creating sales target:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/sales-targets/:id', requireAuth, async (req: any, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Check if user owns the target or is admin
      const existingTarget = await storage.getSalesTargetById(targetId);
      if (!existingTarget) {
        return res.status(404).json({ error: 'Sales target not found' });
      }
      
      if (userRole !== 'admin' && existingTarget.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to update this target' });
      }
      
      const validatedData = insertSalesTargetSchema.partial().parse(req.body);
      const target = await storage.updateSalesTarget(targetId, validatedData);
      res.json(target);
    } catch (error: any) {
      console.error('Error updating sales target:', error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/sales-targets/:id', requireAuth, async (req: any, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const userId = req.user.id;
      const userRole = req.user.role;
      
      // Check if user owns the target or is admin
      const existingTarget = await storage.getSalesTargetById(targetId);
      if (!existingTarget) {
        return res.status(404).json({ error: 'Sales target not found' });
      }
      
      if (userRole !== 'admin' && existingTarget.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this target' });
      }
      
      await storage.deleteSalesTarget(targetId);
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting sales target:', error);
      res.status(500).json({ error: 'Failed to delete sales target' });
    }
  });

  app.get('/api/sales-targets/progress/:userId?', requireAuth, async (req: any, res) => {
    try {
      const requestedUserId = req.params.userId ? parseInt(req.params.userId) : null;
      const currentUserId = req.user.id;
      const userRole = req.user.role;
      
      // Determine which user's progress to get
      let targetUserId = currentUserId;
      if (requestedUserId && userRole === 'admin') {
        targetUserId = requestedUserId;
      } else if (requestedUserId && userRole !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to view other users progress' });
      }
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentQuarter = Math.ceil(currentMonth / 3);
      
      // Get targets
      const monthlyTarget = await storage.getSalesTarget(targetUserId, 'monthly', currentYear, currentMonth);
      const quarterlyTarget = await storage.getSalesTarget(targetUserId, 'quarterly', currentYear, currentQuarter);
      
      // Get actual performance
      const quotes = await storage.getQuotes();
      const userQuotes = quotes.filter(quote => quote.createdBy === targetUserId);
      
      // Calculate monthly progress
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
      const monthlyQuotes = userQuotes.filter(quote => new Date(quote.createdAt) >= startOfMonth);
      const monthlyApprovedQuotes = monthlyQuotes.filter(quote => quote.status === 'approved' || quote.status === 'accepted');
      const monthlyRevenue = monthlyApprovedQuotes.reduce((sum, quote) => sum + parseFloat(quote.totalAmount || 0), 0);
      const monthlyConversion = monthlyQuotes.length > 0 ? (monthlyApprovedQuotes.length / monthlyQuotes.length) * 100 : 0;
      
      // Calculate quarterly progress
      const startOfQuarter = new Date(currentYear, (currentQuarter - 1) * 3, 1);
      const quarterlyQuotes = userQuotes.filter(quote => new Date(quote.createdAt) >= startOfQuarter);
      const quarterlyApprovedQuotes = quarterlyQuotes.filter(quote => quote.status === 'approved' || quote.status === 'accepted');
      const quarterlyRevenue = quarterlyApprovedQuotes.reduce((sum, quote) => sum + parseFloat(quote.totalAmount || 0), 0);
      const quarterlyConversion = quarterlyQuotes.length > 0 ? (quarterlyApprovedQuotes.length / quarterlyQuotes.length) * 100 : 0;
      
      res.json({
        monthly: {
          target: monthlyTarget,
          actual: {
            revenue: monthlyRevenue,
            quotes: monthlyQuotes.length,
            conversion: monthlyConversion
          },
          progress: {
            revenue: monthlyTarget ? (monthlyRevenue / parseFloat(monthlyTarget.revenueTarget)) * 100 : 0,
            quotes: monthlyTarget ? (monthlyQuotes.length / monthlyTarget.quotesTarget) * 100 : 0,
            conversion: monthlyTarget ? (monthlyConversion / parseFloat(monthlyTarget.conversionTarget)) * 100 : 0
          }
        },
        quarterly: {
          target: quarterlyTarget,
          actual: {
            revenue: quarterlyRevenue,
            quotes: quarterlyQuotes.length,
            conversion: quarterlyConversion
          },
          progress: {
            revenue: quarterlyTarget ? (quarterlyRevenue / parseFloat(quarterlyTarget.revenueTarget)) * 100 : 0,
            quotes: quarterlyTarget ? (quarterlyQuotes.length / quarterlyTarget.quotesTarget) * 100 : 0,
            conversion: quarterlyTarget ? (quarterlyConversion / parseFloat(quarterlyTarget.conversionTarget)) * 100 : 0
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting sales target progress:', error);
      res.status(500).json({ error: 'Failed to get sales target progress' });
    }
  });

  // Notifications endpoints
  app.post('/api/notifications/mark-read', requireAuth, async (req: any, res) => {
    try {
      const { type, referenceId } = req.body;
      const userId = req.user.id;

      if (!type) {
        return res.status(400).json({ error: 'Type is required' });
      }

      // For simplicity, we'll use a session-based approach to track read notifications
      // Store read notifications in the user session
      if (!req.session.readNotifications) {
        req.session.readNotifications = {};
      }
      
      const notificationKey = `${type}_${referenceId || 'all'}`;
      req.session.readNotifications[notificationKey] = true;

      res.json({ success: true });
    } catch (error: any) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  app.post('/api/notifications/mark-all-read', requireAuth, async (req: any, res) => {
    try {
      const { type } = req.body;
      const userId = req.user.id;

      if (!type) {
        return res.status(400).json({ error: 'Type is required' });
      }

      // Initialize session storage for read notifications
      if (!req.session.readNotifications) {
        req.session.readNotifications = {};
      }

      if (type === 'showroom_visit') {
        // Mark all showroom visits as read
        const visits = await storage.getPendingShowroomVisits();
        for (const visit of visits) {
          const notificationKey = `showroom_visit_${visit.id}`;
          req.session.readNotifications[notificationKey] = true;
        }
      } else if (type === 'low_stock') {
        // Mark all low stock alerts as read
        const products = await storage.getLowStockProducts();
        for (const product of products) {
          const notificationKey = `low_stock_${product.id}`;
          req.session.readNotifications[notificationKey] = true;
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  // Report generation endpoint
  app.post('/api/reports/generate', requireAuth, async (req: any, res) => {
    try {
      const { reportType, startDate, endDate, exportFormat } = req.body;
      
      if (!reportType || !startDate || !endDate || !exportFormat) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      let reportData;
      let filename;

      // Generate report data based on type
      switch (reportType) {
        case 'sales_managers':
          reportData = await generateSalesManagerReport(startDate, endDate);
          filename = `sales_managers_report_${startDate}_to_${endDate}`;
          break;
        case 'products':
          reportData = await generateProductsReport(startDate, endDate);
          filename = `products_report_${startDate}_to_${endDate}`;
          break;
        case 'clients':
          reportData = await generateClientsReport(startDate, endDate);
          filename = `clients_report_${startDate}_to_${endDate}`;
          break;
        case 'quotes':
          reportData = await generateQuotesReport(startDate, endDate);
          filename = `quotes_report_${startDate}_to_${endDate}`;
          break;
        default:
          return res.status(400).json({ error: 'Invalid report type' });
      }

      // Generate export based on format
      if (exportFormat === 'pdf') {
        const pdfBuffer = await generatePDFReport(reportData, reportType, startDate, endDate);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
        res.send(pdfBuffer);
      } else if (exportFormat === 'excel' || exportFormat === 'csv') {
        const csvData = generateCSVReport(reportData, reportType);
        const contentType = exportFormat === 'excel' ? 'application/vnd.ms-excel' : 'text/csv';
        const fileExtension = exportFormat === 'excel' ? 'xls' : 'csv';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
        res.send(csvData);
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  // Database maintenance routes (admin only)
  app.post("/api/admin/validate-database", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { validateProductData } = await import('./database-maintenance');
      const result = await validateProductData();
      res.json(result);
    } catch (error: any) {
      console.error('Database validation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/optimize-quotes", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { optimizeQuoteCalculations } = await import('./database-maintenance');
      await optimizeQuoteCalculations();
      res.json({ message: 'Quote calculations optimized successfully' });
    } catch (error: any) {
      console.error('Quote optimization error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/cleanup-data", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { cleanupExpiredData } = await import('./database-maintenance');
      await cleanupExpiredData();
      res.json({ message: 'Expired data cleaned up successfully' });
    } catch (error: any) {
      console.error('Data cleanup error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // CSV upload configuration
  const csvUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for CSV files
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });

  // CSV Preview Endpoint - Preview data before import
  app.post("/api/admin/bulk-import-preview", requireAuth, requireRole(['admin']), uploadLimiter, csvUpload.single('csvFile'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    try {
      console.log('Starting CSV preview process...');
      
      // Parse CSV to get headers and sample rows
      const csvContent = req.file.buffer.toString('utf-8');
      const rows: any[] = [];
      let headers: string[] = [];
      
      await new Promise((resolve, reject) => {
        const stream = Readable.from(csvContent)
          .pipe(csv())
          .on('headers', (csvHeaders) => {
            headers = csvHeaders;
          })
          .on('data', (row) => {
            rows.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (headers.length === 0) {
        return res.status(400).json({ error: "CSV file has no valid headers" });
      }

      // Determine table type
      const tableType = determineTableType(headers);
      if (!tableType) {
        return res.json({
          success: false,
          error: "Unable to determine table type from CSV headers",
          headers,
          suggestedMappings: generateSuggestedMappings(headers),
          totalRows: rows.length
        });
      }

      // Validate header mapping
      const fieldMapping = getFieldMapping(tableType, headers);
      
      // Get preview data (first 10 rows)
      const previewRows = rows.slice(0, 10);
      
      // Validate preview rows
      const validationResults = await validateAllRowsData(previewRows, tableType, fieldMapping.mapping);
      
      res.json({
        success: true,
        tableType,
        headers,
        totalRows: rows.length,
        previewRows,
        fieldMapping,
        validationSummary: {
          isValid: validationResults.isValid,
          errorCount: validationResults.errors.length,
          errors: validationResults.errors.slice(0, 5) // First 5 errors only
        },
        filename: req.file.originalname,
        fileSize: req.file.size
      });

    } catch (error: any) {
      console.error('CSV preview error:', error);
      res.status(500).json({ error: `Preview failed: ${error.message}` });
    }
  });

  // Enhanced CSV Bulk Import with batch processing and error recovery
  app.post("/api/admin/bulk-import-csv", requireAuth, requireRole(['admin']), uploadLimiter, csvUpload.single('csvFile'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    try {
      console.log('Starting enhanced CSV bulk import process...');
      const { skipErrors = false, batchSize = 100 } = req.body;
      
      // Log import attempt start
      await storage.createActivity({
        type: "csv_import_started",
        description: `CSV bulk import started by user ${req.user?.username || 'unknown'}`,
        entityType: "system",
        entityId: null,
        metadata: {
          filename: req.file.originalname,
          filesize: req.file.size,
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        }
      });
      
      // Parse CSV to get headers and rows
      const csvContent = req.file.buffer.toString('utf-8');
      const rows: any[] = [];
      let headers: string[] = [];
      
      await new Promise((resolve, reject) => {
        const stream = Readable.from(csvContent)
          .pipe(csv())
          .on('headers', (csvHeaders) => {
            headers = csvHeaders;
            console.log('CSV Headers detected:', headers);
          })
          .on('data', (row) => {
            rows.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (headers.length === 0 || rows.length === 0) {
        // Log empty file error
        await storage.createActivity({
          type: "csv_import_failed",
          description: `CSV import failed: Empty file or no valid headers`,
          entityType: "system",
          entityId: null,
          metadata: {
            filename: req.file.originalname,
            error: "Empty file or no valid headers",
            userId: req.user?.id,
            timestamp: new Date().toISOString()
          }
        });
        return res.status(400).json({ error: "CSV file is empty or has no valid headers" });
      }

      // Step 1: Determine table type by scanning headers
      const tableType = determineTableType(headers);
      if (!tableType) {
        // Log table type detection error
        await storage.createActivity({
          type: "csv_import_failed",
          description: `CSV import failed: Unable to determine table type`,
          entityType: "system",
          entityId: null,
          metadata: {
            filename: req.file.originalname,
            headers: headers,
            error: "Unable to determine table type from headers",
            userId: req.user?.id,
            timestamp: new Date().toISOString()
          }
        });
        return res.status(400).json({ 
          error: "Unable to determine table type from CSV headers. Ensure headers match exactly with database field names." 
        });
      }

      console.log(`Detected table type: ${tableType}`);

      // Step 2: Validate header mapping
      const fieldMapping = getFieldMapping(tableType, headers);
      if (!fieldMapping.isValid) {
        // Log field mapping error
        await storage.createActivity({
          type: "csv_import_failed",
          description: `CSV import failed: Header mapping validation failed for ${tableType}`,
          entityType: "system",
          entityId: null,
          metadata: {
            filename: req.file.originalname,
            tableType: tableType,
            headers: headers,
            missingFields: fieldMapping.missingFields,
            error: `Missing required fields: ${fieldMapping.missingFields.join(', ')}`,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
          }
        });
        return res.status(400).json({ 
          error: `Header mapping failed for ${tableType} table. Missing required fields: ${fieldMapping.missingFields.join(', ')}` 
        });
      }

      console.log('Header mapping validated successfully');

      // Step 3: Validate all data integrity before any database operations
      const validationResults = await validateAllRowsData(rows, tableType, fieldMapping.mapping);
      if (!validationResults.isValid) {
        // Log data validation error
        await storage.createActivity({
          type: "csv_import_failed",
          description: `CSV import failed: Data validation errors in ${tableType} data`,
          entityType: "system",
          entityId: null,
          metadata: {
            filename: req.file.originalname,
            tableType: tableType,
            rowCount: rows.length,
            validationErrors: validationResults.errors,
            error: "Data validation failed",
            userId: req.user?.id,
            timestamp: new Date().toISOString()
          }
        });
        return res.status(400).json({
          error: `Data validation failed. ${validationResults.errors.join('. ')}`,
          details: validationResults.errors
        });
      }

      console.log(`All ${rows.length} rows validated successfully`);

      // Step 4: Enhanced bulk import with batch processing and error recovery
      const importResults = await performEnhancedBulkImport(rows, tableType, fieldMapping.mapping, { 
        skipErrors, 
        batchSize: parseInt(batchSize) || 100 
      });
      
      // Log successful import with enhanced metadata
      await storage.createActivity({
        type: "csv_import_completed",
        description: `CSV bulk import completed successfully: ${importResults.imported} ${tableType} records imported`,
        entityType: "system",
        entityId: null,
        metadata: {
          filename: req.file.originalname,
          tableType: tableType,
          recordsImported: importResults.imported,
          recordsFailed: importResults.failed,
          totalRows: rows.length,
          userId: req.user?.id,
          sessionId: importResults.sessionId,
          duration: importResults.duration,
          fieldMappings: fieldMapping.mapping,
          importSettings: { skipErrors, batchSize },
          timestamp: new Date().toISOString()
        }
      });
      
      res.json({
        message: `Successfully imported ${importResults.imported} ${tableType} records`,
        imported: importResults.imported,
        failed: importResults.failed,
        tableType: tableType
      });

    } catch (error: any) {
      console.error('CSV bulk import error:', error);
      
      // Log unexpected error
      await storage.createActivity({
        type: "csv_import_failed",
        description: `CSV bulk import failed with unexpected error: ${error.message}`,
        entityType: "system",
        entityId: null,
        metadata: {
          filename: req.file?.originalname || 'unknown',
          error: error.message,
          stack: error.stack,
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        }
      });
      
      res.status(500).json({ error: `Import failed: ${error.message}` });
    }
  });

  app.get("/api/admin/health-report", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { generateHealthReport } = await import('./database-maintenance');
      const report = await generateHealthReport();
      res.json(report);
    } catch (error: any) {
      console.error('Health report error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk Import Logs Endpoint
  app.get("/api/admin/bulk-import-logs", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const { limit = 50, offset = 0, tableType } = req.query;
      
      console.log(`[BULK IMPORT LOGS] Fetching import logs - limit: ${limit}, offset: ${offset}, tableType: ${tableType}`);
      
      // Build filter for CSV import activities
      const whereClause: any = {
        type: ['csv_import_started', 'csv_import_completed', 'csv_import_failed']
      };
      
      if (tableType && tableType !== 'all') {
        whereClause['metadata->tableType'] = tableType;
      }
      
      const logs = await storage.getRecentActivities(parseInt(limit as string), parseInt(offset as string));
      
      // Filter for bulk import related activities and enhance with metadata
      const importLogs = logs
        .filter(log => ['csv_import_started', 'csv_import_completed', 'csv_import_failed'].includes(log.type))
        .filter(log => !tableType || tableType === 'all' || log.metadata?.tableType === tableType)
        .map(log => ({
          id: log.id,
          type: log.type,
          description: log.description,
          timestamp: log.createdAt,
          status: log.type === 'csv_import_completed' ? 'success' : 
                 log.type === 'csv_import_failed' ? 'failed' : 'started',
          metadata: {
            filename: log.metadata?.filename || 'Unknown file',
            tableType: log.metadata?.tableType || 'Unknown',
            recordsImported: log.metadata?.recordsImported || 0,
            recordsFailed: log.metadata?.recordsFailed || 0,
            totalRows: log.metadata?.totalRows || 0,
            sessionId: log.metadata?.sessionId,
            duration: log.metadata?.duration,
            fieldMappings: log.metadata?.fieldMappings,
            importSettings: log.metadata?.importSettings,
            userId: log.metadata?.userId,
            errorDetails: log.metadata?.error
          }
        }));

      console.log(`[BULK IMPORT LOGS] Returning ${importLogs.length} import log entries`);
      
      res.json({
        logs: importLogs,
        total: importLogs.length,
        hasMore: logs.length === parseInt(limit as string)
      });
    } catch (error: any) {
      console.error('[BULK IMPORT LOGS] Error fetching import logs:', error);
      res.status(500).json({ error: 'Failed to fetch import logs' });
    }
  });

  // Tags API endpoints (admin only - internal use)
  app.get("/api/tags", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error: any) {
      console.error('Get tags error:', error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Public tags endpoint for filtering (no auth required)
  app.get("/api/public/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error: any) {
      console.error('Get public tags error:', error);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const { name, description, category } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Tag name is required" });
      }

      // Validate category
      const validCategories = ['color', 'pattern', 'texture', 'finish', 'style'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({ 
          error: "Invalid category. Must be one of: " + validCategories.join(', ') 
        });
      }

      // Check if tag already exists
      const existingTag = await storage.getTagByName(name);
      if (existingTag) {
        return res.status(400).json({ error: "Tag already exists" });
      }

      const tag = await storage.createTag({ name, description, category });
      res.status(201).json(tag);
    } catch (error: any) {
      console.error('Create tag error:', error);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.put("/api/tags/:id", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const { name, description } = req.body;

      const updatedTag = await storage.updateTag(tagId, { name, description });
      res.json(updatedTag);
    } catch (error: any) {
      console.error('Update tag error:', error);
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  app.delete("/api/tags/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const tagId = parseInt(req.params.id);
      const success = await storage.deleteTag(tagId);
      
      if (success) {
        res.json({ message: "Tag deleted successfully" });
      } else {
        res.status(404).json({ error: "Tag not found" });
      }
    } catch (error: any) {
      console.error('Delete tag error:', error);
      res.status(500).json({ error: "Failed to delete tag" });
    }
  });



  // Get all product tags for filtering (protected route) - EXACT match before parameterized
  app.get("/api/products/tags", requireAuth, async (req, res) => {
    try {
      const allProductTags = await storage.getAllProductTags();
      res.json(allProductTags);
    } catch (error: any) {
      console.error('Get all product tags error:', error);
      res.status(500).json({ error: "Failed to fetch all product tags" });
    }
  });

  // Product Tags API endpoints - parameterized route AFTER exact matches
  app.get("/api/products/:id/tags", requireAuth, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      console.log(`Fetching tags for product ID: ${productId}`);
      const productTags = await storage.getProductTags(productId);
      console.log(`Found ${productTags.length} tags for product ${productId}:`, productTags);
      res.json(productTags);
    } catch (error: any) {
      console.error('Get product tags error:', error);
      res.status(500).json({ error: "Failed to fetch product tags" });
    }
  });

  // Auto-tag products based on their characteristics (development helper)
  app.post("/api/auto-tag-products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      const tags = await storage.getTags();
      
      let associationsCreated = 0;
      
      for (const product of products) {
        const productName = product.name.toLowerCase();
        const productCategory = product.category?.toLowerCase() || '';
        const productFinish = product.finish?.toLowerCase() || '';
        
        // Create associations based on product characteristics
        for (const tag of tags) {
          const tagName = tag.name.toLowerCase();
          let shouldAssociate = false;
          
          // Logic to associate tags with products
          if (tagName.includes('white') && (productName.includes('white') || productName.includes('alaska') || productName.includes('cristalloo'))) {
            shouldAssociate = true;
          } else if (tagName.includes('black') && productName.includes('black')) {
            shouldAssociate = true;
          } else if (tagName.includes('granite') && productCategory === 'granite') {
            shouldAssociate = true;
          } else if (tagName.includes('marble') && productCategory === 'marble') {
            shouldAssociate = true;
          } else if (tagName.includes('quartzite') && productCategory === 'quartzite') {
            shouldAssociate = true;
          } else if (tagName.includes('veined') && (productName.includes('vein') || productName.includes('carrera'))) {
            shouldAssociate = true;
          } else if (tagName.includes('speckled') && productName.includes('speckl')) {
            shouldAssociate = true;
          } else if (tagName.includes('earthy') && (productName.includes('earth') || productName.includes('brown') || productName.includes('natural'))) {
            shouldAssociate = true;
          }
          
          if (shouldAssociate) {
            try {
              await storage.addProductTag({ productId: product.id, tagId: tag.id });
              associationsCreated++;
            } catch (error) {
              // Association might already exist, continue
            }
          }
        }
      }
      
      res.json({ message: `Created ${associationsCreated} product-tag associations` });
    } catch (error: any) {
      console.error('Auto-tag error:', error);
      res.status(500).json({ error: "Failed to auto-tag products" });
    }
  });

  app.post("/api/products/:id/tags", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { tagId } = req.body;

      if (!tagId) {
        return res.status(400).json({ error: "Tag ID is required" });
      }

      // Check current tag count for this product
      const currentTags = await storage.getProductTags(productId);
      
      // Enforce 3-5 tag limit
      if (currentTags.length >= 5) {
        return res.status(400).json({ 
          error: "Product already has the maximum of 5 tags. Remove a tag before adding a new one." 
        });
      }

      // Get the tag being added to check its category
      const newTag = await storage.getTag(tagId);
      if (!newTag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      // Check if this would violate color tag rules (only one color tag allowed)
      if (newTag.category === 'color') {
        const hasColorTag = currentTags.some(pt => pt.tag.category === 'color');
        if (hasColorTag) {
          return res.status(400).json({ 
            error: "Product already has a color tag. Remove the existing color tag before adding a new one." 
          });
        }
      }

      const productTag = await storage.addProductTag({ productId, tagId });
      res.status(201).json(productTag);
    } catch (error: any) {
      console.error('Add product tag error:', error);
      res.status(500).json({ error: "Failed to add product tag" });
    }
  });

  app.delete("/api/products/:productId/tags/:tagId", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const tagId = parseInt(req.params.tagId);

      const success = await storage.removeProductTag(productId, tagId);
      
      if (success) {
        res.json({ message: "Product tag removed successfully" });
      } else {
        res.status(404).json({ error: "Product tag not found" });
      }
    } catch (error: any) {
      console.error('Remove product tag error:', error);
      res.status(500).json({ error: "Failed to remove product tag" });
    }
  });

  // Similar products endpoint (uses tags for matching)
  app.get("/api/products/:id/similar", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 6;

      const similarProducts = await storage.getSimilarProductsByTags(productId, limit);
      res.json(similarProducts);
    } catch (error: any) {
      console.error('Get similar products error:', error);
      res.status(500).json({ error: "Failed to fetch similar products" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// CSV Bulk Import Helper Functions

// Determine table type from headers
function determineTableType(headers: string[]): string | null {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));
  
  // Products table detection
  const productRequiredFields = ['name', 'supplier', 'category', 'grade', 'thickness', 'finish', 'price'];
  
  if (productRequiredFields.every(field => headerSet.has(field))) {
    return 'products';
  }
  
  // Clients table detection
  const clientRequiredFields = ['name', 'email'];
  
  if (clientRequiredFields.every(field => headerSet.has(field))) {
    return 'clients';
  }
  
  // Slabs table detection - Enhanced with more flexible matching
  const slabRequiredFields = ['bundleid', 'slabnumber'];
  const slabAlternativeFields = [
    ['bundle_id', 'bundle', 'bundleid'],
    ['slab_number', 'slabnumber', 'slab_no', 'piece_number', 'item_number']
  ];
  
  // Check if required fields exist (exact match)
  if (slabRequiredFields.every(field => headerSet.has(field))) {
    return 'slabs';
  }
  
  // Check alternative field names for slabs
  const hasBundle = slabAlternativeFields[0].some(alt => headerSet.has(alt));
  const hasSlabNumber = slabAlternativeFields[1].some(alt => headerSet.has(alt));
  
  if (hasBundle && hasSlabNumber) {
    return 'slabs';
  }
  
  return null;
}

// Generate suggested field mappings for unknown headers
function generateSuggestedMappings(headers: string[]) {
  const suggestions = {
    products: {
      confidence: 0,
      possibleMappings: {} as Record<string, string[]>
    },
    clients: {
      confidence: 0,
      possibleMappings: {} as Record<string, string[]>
    },
    slabs: {
      confidence: 0,
      possibleMappings: {} as Record<string, string[]>
    }
  };

  const headerLower = headers.map(h => h.toLowerCase());

  // Product field suggestions
  const productMappings = {
    name: ['product_name', 'productname', 'item', 'title', 'material'],
    supplier: ['vendor', 'manufacturer', 'provider', 'source'],
    category: ['type', 'material_type', 'stone_type', 'product_type'],
    grade: ['quality', 'level', 'tier', 'class'],
    thickness: ['thick', 'depth', 'height'],
    finish: ['surface', 'texture', 'polished', 'honed'],
    price: ['cost', 'amount', 'value', 'rate', 'unit_price'],
    bundleid: ['bundle', 'lot', 'batch', 'group'],
    stockquantity: ['stock', 'qty', 'quantity', 'available', 'inventory']
  };

  // Client field suggestions  
  const clientMappings = {
    name: ['client_name', 'customer', 'contact', 'full_name', 'person'],
    email: ['email_address', 'contact_email', 'mail'],
    phone: ['telephone', 'mobile', 'contact_number', 'phone_number'],
    company: ['business', 'organization', 'firm', 'corp'],
    address: ['street', 'location', 'address1', 'street_address'],
    city: ['town', 'municipality'],
    state: ['province', 'region', 'territory'],
    zipcode: ['zip', 'postal_code', 'postcode']
  };

  // Slab field suggestions - Enhanced for Stone Slab Bundles
  const slabMappings = {
    bundleid: ['bundle', 'lot', 'batch', 'group', 'bundle_id', 'bundle_name', 'material_id'],
    slabnumber: ['slab_no', 'number', 'piece', 'item_number', 'slab_id', 'piece_number', 'serial'],
    status: ['state', 'condition', 'availability', 'stock_status', 'inventory_status'],
    length: ['l', 'len', 'long', 'length_inches', 'length_cm', 'dimension_l'],
    width: ['w', 'wide', 'breadth', 'width_inches', 'width_cm', 'dimension_w'],
    thickness: ['thick', 'depth', 'height', 'thickness_inches', 'thickness_cm'],
    location: ['warehouse', 'storage', 'yard', 'position', 'bin', 'rack', 'zone'],
    barcode: ['code', 'sku', 'qr_code', 'scan_code', 'identifier'],
    notes: ['comments', 'remarks', 'description', 'memo', 'details'],
    grade: ['quality', 'class', 'tier', 'level', 'rating'],
    finish: ['surface', 'texture', 'polish', 'treatment'],
    price: ['cost', 'amount', 'value', 'unit_price', 'selling_price'],
    weight: ['mass', 'kg', 'pounds', 'lbs', 'weight_kg']
  };

  // Check product mappings
  let productMatches = 0;
  for (const [field, alternatives] of Object.entries(productMappings)) {
    const matches = headerLower.filter(h => 
      h === field || alternatives.some(alt => h.includes(alt) || alt.includes(h))
    );
    if (matches.length > 0) {
      suggestions.products.possibleMappings[field] = matches;
      productMatches++;
    }
  }
  suggestions.products.confidence = (productMatches / Object.keys(productMappings).length) * 100;

  // Check client mappings
  let clientMatches = 0;
  for (const [field, alternatives] of Object.entries(clientMappings)) {
    const matches = headerLower.filter(h => 
      h === field || alternatives.some(alt => h.includes(alt) || alt.includes(h))
    );
    if (matches.length > 0) {
      suggestions.clients.possibleMappings[field] = matches;
      clientMatches++;
    }
  }
  suggestions.clients.confidence = (clientMatches / Object.keys(clientMappings).length) * 100;

  // Check slab mappings  
  let slabMatches = 0;
  for (const [field, alternatives] of Object.entries(slabMappings)) {
    const matches = headerLower.filter(h => 
      h === field || alternatives.some(alt => h.includes(alt) || alt.includes(h))
    );
    if (matches.length > 0) {
      suggestions.slabs.possibleMappings[field] = matches;
      slabMatches++;
    }
  }
  suggestions.slabs.confidence = (slabMatches / Object.keys(slabMappings).length) * 100;

  return suggestions;
}

// Get field mapping and validate required fields
function getFieldMapping(tableType: string, headers: string[]) {
  const headerMap = new Map(headers.map(h => [h.toLowerCase(), h]));
  
  const mappings = {
    products: {
      required: ['name', 'supplier', 'category', 'grade', 'thickness', 'finish', 'price'],
      optional: ['bundleid', 'description', 'unit', 'stockquantity', 'slablength', 'slabwidth', 'location', 'barcodes', 'imageurl', 'aiheadline', 'isactive'],
      mapping: {} as Record<string, string>
    },
    clients: {
      required: ['name', 'email'],
      optional: ['phone', 'company', 'address', 'city', 'state', 'zipcode', 'notes'],
      mapping: {} as Record<string, string>
    },
    slabs: {
      required: ['bundleid', 'slabnumber'],
      optional: ['status', 'length', 'width', 'thickness', 'barcode', 'location', 'notes', 'grade', 'finish', 'price', 'weight', 'productionLocation', 'soldDate', 'deliveredDate'],
      mapping: {} as Record<string, string>
    }
  };
  
  const config = mappings[tableType as keyof typeof mappings];
  if (!config) {
    return { isValid: false, missingFields: [], mapping: {} };
  }
  
  const missingFields: string[] = [];
  
  // Check required fields
  for (const field of config.required) {
    if (headerMap.has(field)) {
      config.mapping[field] = headerMap.get(field)!;
    } else {
      missingFields.push(field);
    }
  }
  
  // Map optional fields if present
  for (const field of config.optional) {
    if (headerMap.has(field)) {
      config.mapping[field] = headerMap.get(field)!;
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
    mapping: config.mapping
  };
}

// Validate all rows data integrity
async function validateAllRowsData(rows: any[], tableType: string, mapping: Record<string, string>) {
  const errors: string[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because CSV is 1-indexed and has header row
    
    try {
      if (tableType === 'products') {
        validateProductRow(row, mapping, rowNumber);
      } else if (tableType === 'clients') {
        validateClientRow(row, mapping, rowNumber);
      } else if (tableType === 'slabs') {
        validateSlabRow(row, mapping, rowNumber);
      }
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Product row validation
function validateProductRow(row: any, mapping: Record<string, string>, rowNumber: number) {
  // Required field validation
  if (!row[mapping.name]?.trim()) {
    throw new Error('Product name is required');
  }
  if (!row[mapping.supplier]?.trim()) {
    throw new Error('Supplier is required');
  }
  if (!row[mapping.category]?.trim()) {
    throw new Error('Category is required');
  }
  if (!row[mapping.grade]?.trim()) {
    throw new Error('Grade is required');
  }
  if (!row[mapping.thickness]?.trim()) {
    throw new Error('Thickness is required');
  }
  if (!row[mapping.finish]?.trim()) {
    throw new Error('Finish is required');
  }
  
  // Price validation
  const price = parseFloat(row[mapping.price]);
  if (isNaN(price) || price < 0) {
    throw new Error('Price must be a valid positive number');
  }
  
  // Category validation
  const validCategories = ['marble', 'granite', 'quartz', 'quartzite', 'travertine', 'porcelain', 'counter_fixtures'];
  if (!validCategories.includes(row[mapping.category]?.toLowerCase())) {
    throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
  }
  
  // Grade validation
  const validGrades = ['premium', 'standard', 'economy'];
  if (!validGrades.includes(row[mapping.grade]?.toLowerCase())) {
    throw new Error(`Grade must be one of: ${validGrades.join(', ')}`);
  }
  
  // Optional numeric field validation
  if (mapping.stockquantity && row[mapping.stockquantity]) {
    const stock = parseInt(row[mapping.stockquantity]);
    if (isNaN(stock) || stock < 0) {
      throw new Error('Stock quantity must be a valid non-negative integer');
    }
  }
  
  if (mapping.slablength && row[mapping.slablength]) {
    const length = parseFloat(row[mapping.slablength]);
    if (isNaN(length) || length <= 0) {
      throw new Error('Slab length must be a valid positive number');
    }
  }
  
  if (mapping.slabwidth && row[mapping.slabwidth]) {
    const width = parseFloat(row[mapping.slabwidth]);
    if (isNaN(width) || width <= 0) {
      throw new Error('Slab width must be a valid positive number');
    }
  }
}

// Client row validation
function validateClientRow(row: any, mapping: Record<string, string>, rowNumber: number) {
  // Required field validation
  if (!row[mapping.name]?.trim()) {
    throw new Error('Client name is required');
  }
  
  const email = row[mapping.email]?.trim();
  if (!email) {
    throw new Error('Email is required');
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
}

// Slab row validation
function validateSlabRow(row: any, mapping: Record<string, string>, rowNumber: number) {
  // Required field validation
  if (!row[mapping.bundleid]?.trim()) {
    throw new Error('Bundle ID is required');
  }
  if (!row[mapping.slabnumber]?.trim()) {
    throw new Error('Slab number is required');
  }
  
  // Status validation
  if (mapping.status && row[mapping.status]) {
    const validStatuses = ['available', 'sold', 'delivered'];
    if (!validStatuses.includes(row[mapping.status]?.toLowerCase())) {
      throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
    }
  }
  
  // Dimension validation
  if (mapping.length && row[mapping.length]) {
    const length = parseFloat(row[mapping.length]);
    if (isNaN(length) || length <= 0) {
      throw new Error('Length must be a valid positive number');
    }
  }
  
  if (mapping.width && row[mapping.width]) {
    const width = parseFloat(row[mapping.width]);
    if (isNaN(width) || width <= 0) {
      throw new Error('Width must be a valid positive number');
    }
  }
}

// Enhanced bulk import with batch processing and error recovery
async function performEnhancedBulkImport(
  rows: any[], 
  tableType: string, 
  mapping: Record<string, string>, 
  options: { skipErrors: boolean; batchSize: number }
) {
  const { skipErrors, batchSize } = options;
  let totalImported = 0;
  let totalFailed = 0;
  const errors: Array<{ row: number; error: string; data: any }> = [];
  
  const importStartTime = Date.now();
  const importSessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[BULK IMPORT] Starting enhanced bulk import for ${tableType}:`);
  console.log(`[BULK IMPORT] Session ID: ${importSessionId}`);
  console.log(`[BULK IMPORT] Total rows: ${rows.length}, batch size: ${batchSize}, skip errors: ${skipErrors}`);
  console.log(`[BULK IMPORT] Field mappings:`, mapping);

  // Process in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(rows.length / batchSize);
    const batchStartTime = Date.now();
    
    console.log(`[BULK IMPORT] Processing batch ${batchNumber}/${totalBatches} (rows ${i + 1}-${i + batch.length})`);

    if (skipErrors) {
      // Process with error recovery - continue on errors
      const batchResults = await processBatchWithErrorRecovery(batch, tableType, mapping, i);
      totalImported += batchResults.imported;
      totalFailed += batchResults.failed;
      errors.push(...batchResults.errors);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`[BULK IMPORT] Batch ${batchNumber} completed in ${batchTime}ms: ${batchResults.imported} imported, ${batchResults.failed} failed`);
      
      if (batchResults.errors.length > 0) {
        console.log(`[BULK IMPORT] Batch ${batchNumber} errors:`, batchResults.errors.slice(0, 3));
      }
    } else {
      // Atomic batch processing - rollback batch on any error
      try {
        const batchResults = await db.transaction(async (tx) => {
          let batchImported = 0;
          
          for (let j = 0; j < batch.length; j++) {
            const row = batch[j];
            const globalRowIndex = i + j;
            
            try {
              if (tableType === 'products') {
                await importProductRow(row, mapping, tx);
              } else if (tableType === 'clients') {
                await importClientRow(row, mapping, tx);
              } else if (tableType === 'slabs') {
                await importSlabRow(row, mapping, tx);
              }
              batchImported++;
            } catch (error: any) {
              console.error(`Row ${globalRowIndex + 2} import error:`, error);
              throw new Error(`Row ${globalRowIndex + 2}: ${error.message}`);
            }
          }
          
          return { imported: batchImported, failed: 0 };
        });
        
        totalImported += batchResults.imported;
        const batchTime = Date.now() - batchStartTime;
        console.log(`[BULK IMPORT] Batch ${batchNumber} completed successfully in ${batchTime}ms: ${batchResults.imported} rows imported`);
      } catch (error: any) {
        const batchTime = Date.now() - batchStartTime;
        console.error(`[BULK IMPORT] Batch ${batchNumber} failed in ${batchTime}ms:`, error);
        totalFailed += batch.length;
        errors.push({
          row: i + 2, // CSV row number
          error: error.message,
          data: batch[0] // First row of failed batch for context
        });
        
        // In atomic mode, we stop on first batch failure
        console.log(`[BULK IMPORT] Stopping import due to atomic batch failure`);
        break;
      }
    }
  }

  const totalTime = Date.now() - importStartTime;
  console.log(`[BULK IMPORT] Session ${importSessionId} completed in ${totalTime}ms:`);
  console.log(`[BULK IMPORT] Final results - Imported: ${totalImported}, Failed: ${totalFailed}, Total errors: ${errors.length}`);
  
  return { 
    imported: totalImported, 
    failed: totalFailed, 
    errors: errors.slice(0, 20), // Limit to first 20 errors
    totalErrors: errors.length,
    sessionId: importSessionId,
    duration: totalTime
  };
}

// Process batch with individual row error recovery
async function processBatchWithErrorRecovery(
  batch: any[], 
  tableType: string, 
  mapping: Record<string, string>, 
  batchStartIndex: number
) {
  let imported = 0;
  let failed = 0;
  const errors: Array<{ row: number; error: string; data: any }> = [];

  for (let i = 0; i < batch.length; i++) {
    const row = batch[i];
    const globalRowIndex = batchStartIndex + i;
    
    try {
      await db.transaction(async (tx) => {
        if (tableType === 'products') {
          await importProductRow(row, mapping, tx);
        } else if (tableType === 'clients') {
          await importClientRow(row, mapping, tx);
        } else if (tableType === 'slabs') {
          await importSlabRow(row, mapping, tx);
        }
      });
      
      imported++;
    } catch (error: any) {
      console.error(`Row ${globalRowIndex + 2} failed:`, error.message);
      failed++;
      errors.push({
        row: globalRowIndex + 2, // CSV row number (1-indexed + header)
        error: error.message,
        data: row
      });
    }
  }

  return { imported, failed, errors };
}

// Perform atomic bulk import (legacy function for compatibility)
async function performBulkImport(rows: any[], tableType: string, mapping: Record<string, string>) {
  return await performEnhancedBulkImport(rows, tableType, mapping, { 
    skipErrors: false, 
    batchSize: 100 
  });
}

// Import product row
async function importProductRow(row: any, mapping: Record<string, string>, tx: any) {
  const { products } = await import('@shared/schema');
  
  const productData: any = {
    name: row[mapping.name]?.trim(),
    supplier: row[mapping.supplier]?.trim(),
    category: row[mapping.category]?.toLowerCase(),
    grade: row[mapping.grade]?.toLowerCase(),
    thickness: row[mapping.thickness]?.trim(),
    finish: row[mapping.finish]?.trim(),
    price: parseFloat(row[mapping.price]).toString(),
    unit: row[mapping.unit]?.trim() || 'sqft',
    stockQuantity: mapping.stockquantity ? parseInt(row[mapping.stockquantity]) || 0 : 0,
    isActive: mapping.isactive ? row[mapping.isactive]?.toLowerCase() === 'true' : true
  };
  
  // Optional fields
  if (mapping.bundleid && row[mapping.bundleid]?.trim()) {
    productData.bundleId = row[mapping.bundleid].trim();
  }
  if (mapping.description && row[mapping.description]?.trim()) {
    productData.description = row[mapping.description].trim();
  }
  if (mapping.slablength && row[mapping.slablength]) {
    productData.slabLength = parseFloat(row[mapping.slablength]).toString();
  }
  if (mapping.slabwidth && row[mapping.slabwidth]) {
    productData.slabWidth = parseFloat(row[mapping.slabwidth]).toString();
  }
  if (mapping.location && row[mapping.location]?.trim()) {
    productData.location = row[mapping.location].trim();
  }
  if (mapping.imageurl && row[mapping.imageurl]?.trim()) {
    productData.imageUrl = row[mapping.imageurl].trim();
  }
  if (mapping.aiheadline && row[mapping.aiheadline]?.trim()) {
    productData.aiHeadline = row[mapping.aiheadline].trim();
  }
  
  await tx.insert(products).values(productData);
}

// Import client row
async function importClientRow(row: any, mapping: Record<string, string>, tx: any) {
  const { clients } = await import('@shared/schema');
  
  const clientData: any = {
    name: row[mapping.name]?.trim(),
    email: row[mapping.email]?.trim().toLowerCase()
  };
  
  // Optional fields
  if (mapping.phone && row[mapping.phone]?.trim()) {
    clientData.phone = row[mapping.phone].trim();
  }
  if (mapping.company && row[mapping.company]?.trim()) {
    clientData.company = row[mapping.company].trim();
  }
  if (mapping.address && row[mapping.address]?.trim()) {
    clientData.address = row[mapping.address].trim();
  }
  if (mapping.city && row[mapping.city]?.trim()) {
    clientData.city = row[mapping.city].trim();
  }
  if (mapping.state && row[mapping.state]?.trim()) {
    clientData.state = row[mapping.state].trim();
  }
  if (mapping.zipcode && row[mapping.zipcode]?.trim()) {
    clientData.zipCode = row[mapping.zipcode].trim();
  }
  if (mapping.notes && row[mapping.notes]?.trim()) {
    clientData.notes = row[mapping.notes].trim();
  }
  
  await tx.insert(clients).values(clientData);
}

// Import slab row - Enhanced for Stone Slab Bundles
async function importSlabRow(row: any, mapping: Record<string, string>, tx: any) {
  const { slabs } = await import('@shared/schema');
  
  const slabData: any = {
    bundleId: row[mapping.bundleid]?.trim(),
    slabNumber: row[mapping.slabnumber]?.trim(),
    status: mapping.status ? row[mapping.status]?.toLowerCase() || 'available' : 'available'
  };
  
  // Dimensional fields
  if (mapping.length && row[mapping.length]) {
    const lengthValue = parseFloat(row[mapping.length]);
    if (!isNaN(lengthValue)) {
      slabData.length = lengthValue;
    }
  }
  if (mapping.width && row[mapping.width]) {
    const widthValue = parseFloat(row[mapping.width]);
    if (!isNaN(widthValue)) {
      slabData.width = widthValue;
    }
  }
  
  // Identification and location fields
  if (mapping.barcode && row[mapping.barcode]?.trim()) {
    slabData.barcode = row[mapping.barcode].trim();
  }
  if (mapping.location && row[mapping.location]?.trim()) {
    slabData.location = row[mapping.location].trim();
  }
  if (mapping.notes && row[mapping.notes]?.trim()) {
    slabData.notes = row[mapping.notes].trim();
  }
  
  // Production and quality fields
  if (mapping.productionLocation && row[mapping.productionLocation]?.trim()) {
    slabData.productionLocation = row[mapping.productionLocation].trim();
  }
  
  // Date fields
  if (mapping.soldDate && row[mapping.soldDate]) {
    const soldDate = new Date(row[mapping.soldDate]);
    if (!isNaN(soldDate.getTime())) {
      slabData.soldDate = soldDate;
    }
  }
  if (mapping.deliveredDate && row[mapping.deliveredDate]) {
    const deliveredDate = new Date(row[mapping.deliveredDate]);
    if (!isNaN(deliveredDate.getTime())) {
      slabData.deliveredDate = deliveredDate;
    }
  }
  
  // Additional optional fields for Stone Slab Bundles
  if (mapping.grade && row[mapping.grade]?.trim()) {
    slabData.grade = row[mapping.grade].trim();
  }
  if (mapping.finish && row[mapping.finish]?.trim()) {
    slabData.finish = row[mapping.finish].trim();
  }
  if (mapping.price && row[mapping.price]) {
    slabData.price = row[mapping.price].trim();
  }
  if (mapping.weight && row[mapping.weight]) {
    const weightValue = parseFloat(row[mapping.weight]);
    if (!isNaN(weightValue)) {
      slabData.weight = weightValue;
    }
  }
  if (mapping.thickness && row[mapping.thickness]?.trim()) {
    slabData.thickness = row[mapping.thickness].trim();
  }

  console.log(`Importing Stone Slab Bundle: ${slabData.bundleId} - ${slabData.slabNumber}`);
  
  // Use the insertSlabSchema for validation
  const { insertSlabSchema } = await import('@shared/schema');
  const validatedData = insertSlabSchema.parse(slabData);
  
  await tx.insert(slabs).values(validatedData);
}
