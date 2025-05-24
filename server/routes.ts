import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertClientSchema, insertProductSchema, insertQuoteSchema, insertQuoteLineItemSchema } from "@shared/schema";
import { translateNaturalLanguageToSQL, analyzeSQLResult } from "./ai";
import { generateQuotePDF } from "./pdf";
import { sendQuoteEmail } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post("/api/products", async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, validatedData);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
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
      const quotes = await storage.getQuotes();
      res.json(quotes);
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

  app.post("/api/quotes", async (req, res) => {
    try {
      const { quote: quoteData, lineItems } = req.body;
      
      console.log("Quote data:", JSON.stringify(quoteData, null, 2));
      console.log("Line items:", JSON.stringify(lineItems, null, 2));
      
      const validatedQuote = insertQuoteSchema.parse(quoteData);
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

  const httpServer = createServer(app);
  return httpServer;
}
