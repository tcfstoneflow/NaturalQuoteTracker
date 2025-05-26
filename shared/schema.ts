import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("sales_rep"), // "admin", "sales_rep", "inventory_specialist"
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  // Enhanced security fields
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  accountLockedUntil: timestamp("account_locked_until"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaSecret: text("mfa_secret"),
  phoneNumber: text("phone_number"),
  lastPasswordChange: timestamp("last_password_change").defaultNow(),
  sessionTimeout: integer("session_timeout").default(3600), // in seconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// MFA verification codes table
export const mfaCodes = pgTable("mfa_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // "sms", "email", "totp"
  used: boolean("used").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  bundleId: text("bundle_id").notNull().unique(), // auto-generated bundle identifier
  name: text("name").notNull(),
  supplier: text("supplier").notNull(), // supplier/quarry name
  category: text("category").notNull(), // "marble", "granite", "quartz", "travertine", "porcelain"
  grade: text("grade").notNull(), // "premium", "standard", "economy"
  thickness: text("thickness").notNull(), // "2cm", "3cm"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("sqft"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  slabLength: decimal("slab_length", { precision: 8, scale: 2 }), // length in inches
  slabWidth: decimal("slab_width", { precision: 8, scale: 2 }), // width in inches
  location: text("location"), // storage location
  barcodes: text("barcodes").array(), // array of barcode strings for individual slabs
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(),
  clientId: integer("client_id").notNull(),
  projectName: text("project_name").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "approved", "rejected", "expired"
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.085"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  validUntil: timestamp("valid_until").notNull(),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quoteLineItems = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
});

export const slabs = pgTable("slabs", {
  id: serial("id").primaryKey(),
  bundleId: text("bundle_id").notNull(),
  slabNumber: text("slab_number").notNull(),
  status: text("status").notNull().default("available"), // "available", "sold", "delivered"
  length: decimal("length", { precision: 8, scale: 2 }), // length in inches
  width: decimal("width", { precision: 8, scale: 2 }), // width in inches
  barcode: text("barcode"),
  location: text("location"),
  notes: text("notes"),
  soldDate: timestamp("sold_date"),
  deliveredDate: timestamp("delivered_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "quote_created", "quote_sent", "quote_approved", "quote_rejected", "client_added", "product_updated", "showroom_visit_request"
  description: text("description").notNull(),
  entityType: text("entity_type"), // "quote", "client", "product", "contact_request"
  entityId: integer("entity_id"),
  metadata: jsonb("metadata"), // For showroom requests: {name, email, phone, preferredDate, message, status}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for showroom visit requests
export const showroomVisits = pgTable("showroom_visits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferredDate: text("preferred_date").notNull(),
  message: text("message"),
  status: text("status").default("pending").notNull(), // "pending", "scheduled", "completed", "cancelled"
  assignedToUserId: integer("assigned_to_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  quotes: many(quotes),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  lineItems: many(quoteLineItems),
}));

export const quoteLineItemsRelations = relations(quoteLineItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteLineItems.quoteId],
    references: [quotes.id],
  }),
  product: one(products, {
    fields: [quoteLineItems.productId],
    references: [products.id],
  }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  quoteLineItems: many(quoteLineItems),
  slabs: many(slabs),
}));

export const slabsRelations = relations(slabs, ({ one }) => ({
  product: one(products, {
    fields: [slabs.bundleId],
    references: [products.bundleId],
  }),
}));

export const mfaCodesRelations = relations(mfaCodes, ({ one }) => ({
  user: one(users, {
    fields: [mfaCodes.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  barcodes: true, // will be auto-generated based on stock quantity
  createdAt: true,
}).extend({
  bundleId: z.string().min(1, "Bundle ID is required"), // Allow manual bundle ID entry
  price: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num.toString(); // Convert to string for decimal field
  }),
  stockQuantity: z.union([z.string(), z.number()]).transform(val => typeof val === 'string' ? parseInt(val) : val),
  slabLength: z.union([z.string(), z.number(), z.null()]).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)
  ),
  slabWidth: z.union([z.string(), z.number(), z.null()]).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)
  ),
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  id: true,
  quoteNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  validUntil: z.string().or(z.date()).transform((val) => typeof val === 'string' ? new Date(val) : val),
});

// Create a simplified schema for quote line items that doesn't require quoteId
export const insertQuoteLineItemSchema = z.object({
  productId: z.number(),
  quantity: z.string(),
  unitPrice: z.string(),
  totalPrice: z.string(),
  notes: z.string().nullable().optional(),
});

export const insertSlabSchema = createInsertSchema(slabs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  length: z.union([z.string(), z.number(), z.null()]).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)
  ),
  width: z.union([z.string(), z.number(), z.null()]).optional().transform(val => 
    val === null || val === undefined || val === '' ? null : (typeof val === 'string' ? parseFloat(val) : val)
  ),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertShowroomVisitSchema = createInsertSchema(showroomVisits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type InsertQuoteLineItem = z.infer<typeof insertQuoteLineItemSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Slab = typeof slabs.$inferSelect;
export type InsertSlab = z.infer<typeof insertSlabSchema>;

export type ShowroomVisit = typeof showroomVisits.$inferSelect;
export type InsertShowroomVisit = z.infer<typeof insertShowroomVisitSchema>;

export type MfaCode = typeof mfaCodes.$inferSelect;
export type InsertMfaCode = typeof mfaCodes.$inferInsert;

// Extended types for API responses
export type QuoteWithDetails = Quote & {
  client: Client;
  lineItems: (QuoteLineItem & { product: Product })[];
};

export type ProductWithSlabs = Product & {
  slabs: Slab[];
};

export type DashboardStats = {
  totalRevenue: string;
  activeClients: number;
  pendingQuotes: number;
  inventoryItems: number;
  revenueChange: string;
  clientsChange: string;
  lowStockCount: number;
  expiringQuotesCount: number;
};
