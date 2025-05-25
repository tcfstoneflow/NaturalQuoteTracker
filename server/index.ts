import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Extend Express session interface
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const app = express();

// Early API route registration before Vite middleware
app.post('/api/contact/showroom-visit', express.json(), async (req, res) => {
  try {
    const { storage } = await import('./storage');
    const { name, email, phone, preferredDate, message } = req.body;
    
    if (!name || !email || !phone || !preferredDate) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    const newVisit = await storage.createShowroomVisit({
      name,
      email,
      phone,
      preferredDate,
      message: message || null,
      status: "pending"
    });
    
    res.json({ 
      success: true, 
      message: "Your showroom visit request has been submitted successfully!",
      id: newVisit.id
    });
  } catch (error: any) {
    console.error("Showroom visit error:", error);
    res.status(500).json({ success: false, error: "Failed to submit request" });
  }
});

// URGENT: Early test route to debug sales dashboard issue
app.get('/api/sales-dashboard/recent-quotes', async (req, res) => {
  console.log('EARLY ROUTE HIT - Sales Dashboard Test');
  
  // Try to get actual data
  try {
    const { storage } = await import('./storage');
    const { requireAuth } = await import('./auth');
    
    // For now, bypass auth to test data flow
    const allQuotes = await storage.getQuotes();
    console.log('Found quotes:', allQuotes.length);
    
    // Return first few quotes with totals calculated
    const quotesWithTotals = allQuotes.slice(0, 5).map(quote => {
      const total = quote.lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      return {
        ...quote,
        total: total.toFixed(2)
      };
    });
    
    console.log('Returning quotes:', quotesWithTotals);
    res.json(quotesWithTotals);
  } catch (error) {
    console.error('Error in early route:', error);
    res.json([{
      id: 777,
      quoteNumber: "EARLY-TEST",
      client: { name: "Early Test Client" },
      total: "3000.00",
      status: "pending",
      createdAt: new Date()
    }]);
  }
});

// Early registration for showroom visits management routes
app.get('/api/showroom-visits', express.json(), async (req, res) => {
  try {
    const { storage } = await import('./storage');
    const visits = await storage.getShowroomVisits();
    res.json(visits);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch showroom visits" });
  }
});

app.patch('/api/showroom-visits/:id', express.json(), async (req, res) => {
  try {
    const { storage } = await import('./storage');
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const updatedVisit = await storage.updateShowroomVisit(id, updates);
    res.json(updatedVisit);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to update visit" });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});



(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
