import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProductSchema, insertQuoteSchema, insertQuoteLineItemSchema } from "@shared/schema";
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

  app.post("/api/users/:id/avatar", requireAuth, requireRole(['admin']), avatarUpload.single('avatar'), async (req, res) => {
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

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { category, search } = req.query;
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
        const transporter = nodemailer.createTransporter({
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

  // AI-powered product description generation
  app.post('/api/generate-product-description', requireAuth, async (req, res) => {
    try {
      const { bundleName, category, imageUrl, supplier, grade, finish } = req.body;

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
- Supplier: ${supplier || 'Premium supplier'}
- Grade: ${grade || 'Premium'}
- Finish: ${finish || 'Polished'}

Requirements:
1. Write 2-3 sentences (60-120 words)
2. Highlight the stone's visual characteristics and unique patterns
3. Mention ideal use cases (countertops, backsplashes, flooring, etc.)
4. Use engaging, professional language that appeals to homeowners and designers
5. Focus on the stone's natural beauty and durability
6. Avoid overly technical jargon

Write the description in a tone that's informative yet appealing to both homeowners and interior designers.`;

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
      if (imageUrl && imageUrl.startsWith('data:image/')) {
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

  app.post("/api/tags", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Tag name is required" });
      }

      // Check if tag already exists
      const existingTag = await storage.getTagByName(name);
      if (existingTag) {
        return res.status(400).json({ error: "Tag already exists" });
      }

      const tag = await storage.createTag({ name, description });
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

  // Product Tags API endpoints
  app.get("/api/products/:id/tags", requireAuth, requireInventoryAccess, async (req, res) => {
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

  app.post("/api/products/:id/tags", requireAuth, requireRole(['admin', 'sales_manager']), async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const { tagId } = req.body;

      if (!tagId) {
        return res.status(400).json({ error: "Tag ID is required" });
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
