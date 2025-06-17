import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb, index } from "drizzle-orm/pg-core";
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
  avatarUrl: text("avatar_url"), // Profile photo URL
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
  salesManagerId: integer("sales_manager_id").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client favorites for saving preferred slabs
export const clientFavorites = pgTable("client_favorites", {
  id: serial("id").primaryKey(),
  clientEmail: text("client_email").notNull(), // using email as client identifier for public users
  productId: integer("product_id").references(() => products.id).notNull(),
  notes: text("notes"), // optional client notes about why they like this slab
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // Ensure one favorite per client per product
  uniqueFavorite: index("unique_client_product_favorite").on(table.clientEmail, table.productId),
}));

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  bundleId: text("bundle_id").unique(), // manual or auto-generated bundle identifier
  name: text("name").notNull(),
  description: text("description"), // product description
  supplier: text("supplier").notNull(), // supplier/quarry name
  category: text("category").notNull(), // "marble", "granite", "quartz", "travertine", "porcelain", "counter_fixtures"
  grade: text("grade").notNull(), // "premium", "standard", "economy"
  thickness: text("thickness").notNull(), // "2cm", "3cm"
  finish: text("finish").notNull(), // "Polished", "Leather", "Brushed", "Matte"
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("sqft"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  slabLength: decimal("slab_length", { precision: 8, scale: 2 }), // length in inches
  slabWidth: decimal("slab_width", { precision: 8, scale: 2 }), // width in inches
  location: text("location"), // storage location
  barcodes: text("barcodes").array(), // array of barcode strings for individual slabs
  imageUrl: text("image_url"),
  aiHeadline: text("ai_headline"), // AI-generated marketing headline
  isActive: boolean("is_active").notNull().default(true),
  // E-commerce specific fields for counter fixtures
  isEcommerceEnabled: boolean("is_ecommerce_enabled").notNull().default(false),
  displayOnline: boolean("display_online").notNull().default(false),
  ecommercePrice: decimal("ecommerce_price", { precision: 10, scale: 2 }), // public facing price
  ecommerceDescription: text("ecommerce_description"),
  ecommerceImages: text("ecommerce_images").array(), // multiple product images
  specifications: jsonb("specifications"), // detailed specs for fixtures
  weight: decimal("weight", { precision: 8, scale: 2 }), // shipping weight
  dimensions: jsonb("dimensions"), // length, width, height for fixtures
  shippingClass: text("shipping_class"), // "standard", "oversized", "freight"
  minOrderQuantity: integer("min_order_quantity").default(1),
  maxOrderQuantity: integer("max_order_quantity"),
  leadTime: integer("lead_time"), // days
  // SEO/Marketing fields
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoUrl: text("seo_url"), // custom URL slug
  metaKeywords: text("meta_keywords"),
  socialTitle: text("social_title"), // Open Graph title
  socialDescription: text("social_description"), // Open Graph description
  socialImage: text("social_image"), // Open Graph image URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // High-performance indexes for large inventory (5000+ products)
  categoryIdx: index("products_category_idx").on(table.category),
  supplierIdx: index("products_supplier_idx").on(table.supplier),
  gradeIdx: index("products_grade_idx").on(table.grade),
  finishIdx: index("products_finish_idx").on(table.finish),
  locationIdx: index("products_location_idx").on(table.location),
  stockIdx: index("products_stock_idx").on(table.stockQuantity),
  priceIdx: index("products_price_idx").on(table.price),
  activeIdx: index("products_active_idx").on(table.isActive),
  // Composite indexes for common filter combinations
  categoryGradeIdx: index("products_category_grade_idx").on(table.category, table.grade),
  supplierCategoryIdx: index("products_supplier_category_idx").on(table.supplier, table.category),
  locationStockIdx: index("products_location_stock_idx").on(table.location, table.stockQuantity),
  // Full-text search preparation
  nameIdx: index("products_name_idx").on(table.name),
}));

// Tags system for products
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  category: text("category"), // "color", "pattern", "finish", "style", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("tags_name_idx").on(table.name),
  categoryIdx: index("tags_category_idx").on(table.category),
}));

// Many-to-many relationship between products and tags
export const productTags = pgTable("product_tags", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  productTagIdx: index("product_tags_product_idx").on(table.productId),
  tagProductIdx: index("product_tags_tag_idx").on(table.tagId),
  // Unique constraint to prevent duplicate tag assignments
  uniqueProductTag: index("product_tags_unique_idx").on(table.productId, table.tagId),
}));

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  quoteNumber: text("quote_number").notNull().unique(),
  clientId: integer("client_id").notNull(),
  projectName: text("project_name").notNull(),
  status: text("status").notNull().default("approved"), // "pending", "approved", "rejected", "expired", "draft", "sent"
  pipelineStage: text("pipeline_stage").notNull().default("In-Flight"), // "In-Flight", "At Risk", "Actioned", "Closed", "Won"
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 4 }).notNull().default("0.085"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  validUntil: timestamp("valid_until").notNull(),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  salesRepId: integer("sales_rep_id").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  cartId: integer("cart_id").references(() => carts.id),
  // Sales leader approval fields
  approved: boolean("approved"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
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
  slabId: integer("slab_id").references(() => slabs.id),
  length: decimal("length", { precision: 8, scale: 2 }),
  width: decimal("width", { precision: 8, scale: 2 }),
  area: decimal("area", { precision: 10, scale: 2 }),
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
  location: text("location"), // storage location
  productionLocation: text("production_location"), // quarry/production origin
  notes: text("notes"),
  soldDate: timestamp("sold_date"),
  deliveredDate: timestamp("delivered_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "quote_created", "quote_sent", "quote_approved", "quote_rejected", "client_added", "product_updated", "showroom_visit_request", "quote_draft_created"
  description: text("description").notNull(),
  entityType: text("entity_type"), // "quote", "client", "product", "contact_request"
  entityId: integer("entity_id"),
  clientId: integer("client_id"), // For client-specific activities
  metadata: jsonb("metadata"), // For showroom requests: {name, email, phone, preferredDate, message, status}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New table for showroom visit requests
export const showroomVisits = pgTable("showroom_visits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"), // Time in HH:MM format
  message: text("message"),
  status: text("status").default("pending").notNull(), // "pending", "scheduled", "completed", "cancelled"
  assignedToUserId: integer("assigned_to_user_id"),
  assignedSalesMember: text("assigned_sales_member"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Gallery images for products showing stone in real installations
export const productGalleryImages = pgTable("product_gallery_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  imageUrl: text("image_url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  installationType: text("installation_type").notNull(), // "kitchen", "bathroom", "countertop", "backsplash", "fireplace", "floor"
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client consultation requests from public sales rep profiles
export const clientConsultations = pgTable("client_consultations", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => users.id).notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone").notNull(),
  projectType: text("project_type").notNull(),
  projectDescription: text("project_description").notNull(),
  budget: text("budget"), // Optional budget range
  timeline: text("timeline"), // Optional timeline
  preferredContactMethod: text("preferred_contact_method").notNull(),
  context: text("context"), // What triggered the consultation (e.g., "Portfolio Project: Kitchen Remodel")
  status: text("status").default("pending").notNull(), // "pending", "contacted", "scheduled", "completed", "cancelled"
  notes: text("notes"), // Internal notes by sales rep
  followUpDate: timestamp("follow_up_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User profiles for the public favorites system
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Consultation requests from the favorites page
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"),
  projectType: text("project_type").notNull(),
  message: text("message").notNull(),
  favoriteProducts: text("favorite_products"), // JSON string of favorite products
  source: text("source").default("website").notNull(),
  status: text("status").default("pending").notNull(), // "pending", "contacted", "scheduled", "completed", "cancelled"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const clientsRelations = relations(clients, ({ one, many }) => ({
  quotes: many(quotes),
  salesManager: one(users, {
    fields: [clients.salesManagerId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  lineItems: many(quoteLineItems),
  salesRep: one(users, {
    fields: [quotes.salesRepId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [quotes.createdBy],
    references: [users.id],
  }),
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
  galleryImages: many(productGalleryImages),
  ecommerceOrderItems: many(ecommerceOrderItems),
  cartItems: many(shoppingCart),
  reviews: many(productReviews),
}));

export const productGalleryImagesRelations = relations(productGalleryImages, ({ one }) => ({
  product: one(products, {
    fields: [productGalleryImages.productId],
    references: [products.id],
  }),
}));

export const clientFavoritesRelations = relations(clientFavorites, ({ one }) => ({
  product: one(products, {
    fields: [clientFavorites.productId],
    references: [products.id],
  }),
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

// E-commerce orders for counter fixtures
export const ecommerceOrders = pgTable("ecommerce_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  // Billing address
  billingAddress: jsonb("billing_address"), // {street, city, state, zip, country}
  // Shipping address
  shippingAddress: jsonb("shipping_address"), // {street, city, state, zip, country}
  // Order totals
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  // Payment and status
  paymentStatus: text("payment_status").notNull().default("pending"), // "pending", "paid", "failed", "refunded"
  paymentMethod: text("payment_method"), // "stripe", "paypal", "bank_transfer"
  paymentIntentId: text("payment_intent_id"), // Stripe payment intent ID
  orderStatus: text("order_status").notNull().default("pending"), // "pending", "processing", "shipped", "delivered", "cancelled"
  // Shipping
  shippingMethod: text("shipping_method"), // "standard", "expedited", "freight"
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery"),
  // Notes and metadata
  customerNotes: text("customer_notes"),
  internalNotes: text("internal_notes"),
  assignedTo: integer("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// E-commerce order line items
export const ecommerceOrderItems = pgTable("ecommerce_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ecommerceOrders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  productSnapshot: jsonb("product_snapshot"), // snapshot of product data at time of order
});

// Shopping cart for customers
export const shoppingCart = pgTable("shopping_cart", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"), // for anonymous users
  customerEmail: text("customer_email"), // for registered customers
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Product reviews and ratings
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  title: text("title"),
  review: text("review"),
  verified: boolean("verified").default(false), // verified purchase
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sales targets table
export const salesTargets = pgTable("sales_targets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetType: text("target_type").notNull(), // "monthly", "quarterly"
  year: integer("year").notNull(),
  period: integer("period").notNull(), // 1-12 for months, 1-4 for quarters
  revenueTarget: decimal("revenue_target", { precision: 12, scale: 2 }).notNull(),
  quotesTarget: integer("quotes_target").notNull(), // number of quotes to create
  conversionTarget: decimal("conversion_target", { precision: 5, scale: 2 }).notNull(), // percentage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userPeriodIdx: index("sales_targets_user_period_idx").on(table.userId, table.targetType, table.year, table.period),
}));

// Sales Rep Public Profiles
export const salesRepProfiles = pgTable("sales_rep_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  urlSlug: text("url_slug").notNull().unique(), // unique URL slug for public access
  bio: text("bio"), // sales rep bio/description
  title: text("title"), // job title
  yearsExperience: integer("years_experience"),
  specialties: text("specialties").array(), // areas of expertise
  phone: text("phone"),
  email: text("email"),
  profileImageUrl: text("profile_image_url"),
  isPublic: boolean("is_public").default(true).notNull(),
  customization: jsonb("customization"), // page styling and layout preferences
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sales Rep Favorite Slabs (for showcasing)
export const salesRepFavoriteSlabs = pgTable("sales_rep_favorite_slabs", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  displayOrder: integer("display_order").default(0), // for custom ordering
  notes: text("notes"), // why they recommend this slab
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFavorite: index("unique_sales_rep_product_favorite").on(table.salesRepId, table.productId),
}));

// Sales Rep Portfolio Images
export const salesRepPortfolioImages = pgTable("sales_rep_portfolio_images", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => users.id).notNull(),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  description: text("description"),
  projectType: text("project_type"), // "kitchen", "bathroom", "commercial", etc.
  productsUsed: text("products_used").array(), // array of product names/IDs used in this project
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Appointment bookings for sales reps
export const salesRepAppointments = pgTable("sales_rep_appointments", {
  id: serial("id").primaryKey(),
  salesRepId: integer("sales_rep_id").references(() => users.id).notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  appointmentDate: timestamp("appointment_date").notNull(),
  appointmentType: text("appointment_type").notNull(), // "consultation", "showroom_visit", "site_visit"
  status: text("status").default("pending").notNull(), // "pending", "confirmed", "completed", "cancelled"
  notes: text("notes"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cart management for quotes and orders
export const carts = pgTable("carts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => users.id).notNull(),
  name: text("name").notNull().default("Untitled Cart"),
  description: text("description"),
  type: text("type").notNull().default("quote"), // "quote", "order"
  status: text("status").notNull().default("active"), // "active", "converted", "abandoned"
  totalAmount: text("total_amount").notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").references(() => carts.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  slabId: integer("slab_id").references(() => slabs.id),
  itemType: text("item_type").notNull(), // "product", "slab"
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  customSpecs: jsonb("custom_specs"), // Custom specifications for the item
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// E-commerce relations
export const ecommerceOrdersRelations = relations(ecommerceOrders, ({ many, one }) => ({
  orderItems: many(ecommerceOrderItems),
  assignedUser: one(users, {
    fields: [ecommerceOrders.assignedTo],
    references: [users.id],
  }),
}));

export const ecommerceOrderItemsRelations = relations(ecommerceOrderItems, ({ one }) => ({
  order: one(ecommerceOrders, {
    fields: [ecommerceOrderItems.orderId],
    references: [ecommerceOrders.id],
  }),
  product: one(products, {
    fields: [ecommerceOrderItems.productId],
    references: [products.id],
  }),
}));

export const shoppingCartRelations = relations(shoppingCart, ({ one }) => ({
  product: one(products, {
    fields: [shoppingCart.productId],
    references: [products.id],
  }),
}));

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
}));

export const salesTargetsRelations = relations(salesTargets, ({ one }) => ({
  user: one(users, {
    fields: [salesTargets.userId],
    references: [users.id],
  }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  client: one(users, {
    fields: [carts.clientId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  slab: one(slabs, {
    fields: [cartItems.slabId],
    references: [slabs.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  quotes: many(quotes),
  clients: many(clients),
  showroomVisits: many(showroomVisits),
  salesTargets: many(salesTargets),
  carts: many(carts),
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
  pipelineStage: z.enum(["In-Flight", "At Risk", "Actioned", "Closed", "Won"]).optional(),
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

export const insertProductGalleryImageSchema = createInsertSchema(productGalleryImages).omit({
  id: true,
  createdAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConsultationSchema = createInsertSchema(consultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesTargetSchema = createInsertSchema(salesTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  revenueTarget: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num.toString();
  }),
  conversionTarget: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return num.toString();
  }),
});

// E-commerce schemas
export const insertEcommerceOrderSchema = createInsertSchema(ecommerceOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEcommerceOrderItemSchema = createInsertSchema(ecommerceOrderItems).omit({
  id: true,
});

export const insertShoppingCartSchema = createInsertSchema(shoppingCart).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export const insertProductReviewSchema = createInsertSchema(productReviews).omit({
  id: true,
  createdAt: true,
});

export const insertClientFavoriteSchema = createInsertSchema(clientFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertProductTagSchema = createInsertSchema(productTags).omit({
  id: true,
  createdAt: true,
});

export const insertSalesRepProfileSchema = createInsertSchema(salesRepProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesRepFavoriteSlabSchema = createInsertSchema(salesRepFavoriteSlabs).omit({
  id: true,
  createdAt: true,
});

export const insertSalesRepPortfolioImageSchema = createInsertSchema(salesRepPortfolioImages).omit({
  id: true,
  createdAt: true,
});

export const insertSalesRepAppointmentSchema = createInsertSchema(salesRepAppointments).omit({
  id: true,
  createdAt: true,
});

export const insertClientConsultationSchema = createInsertSchema(clientConsultations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartSchema = createInsertSchema(carts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
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

export type EcommerceOrder = typeof ecommerceOrders.$inferSelect;
export type InsertEcommerceOrder = z.infer<typeof insertEcommerceOrderSchema>;

export type SalesTarget = typeof salesTargets.$inferSelect;
export type InsertSalesTarget = z.infer<typeof insertSalesTargetSchema>;

export type EcommerceOrderItem = typeof ecommerceOrderItems.$inferSelect;
export type InsertEcommerceOrderItem = z.infer<typeof insertEcommerceOrderItemSchema>;

export type ShoppingCartItem = typeof shoppingCart.$inferSelect;
export type InsertShoppingCartItem = z.infer<typeof insertShoppingCartSchema>;

export type ProductReview = typeof productReviews.$inferSelect;
export type InsertProductReview = z.infer<typeof insertProductReviewSchema>;

export type ShowroomVisit = typeof showroomVisits.$inferSelect;
export type InsertShowroomVisit = z.infer<typeof insertShowroomVisitSchema>;

export type ProductGalleryImage = typeof productGalleryImages.$inferSelect;
export type InsertProductGalleryImage = z.infer<typeof insertProductGalleryImageSchema>;

export type ClientFavorite = typeof clientFavorites.$inferSelect;
export type InsertClientFavorite = z.infer<typeof insertClientFavoriteSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

export type MfaCode = typeof mfaCodes.$inferSelect;
export type InsertMfaCode = typeof mfaCodes.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type ProductTag = typeof productTags.$inferSelect;
export type InsertProductTag = z.infer<typeof insertProductTagSchema>;

export type SalesRepProfile = typeof salesRepProfiles.$inferSelect;
export type InsertSalesRepProfile = z.infer<typeof insertSalesRepProfileSchema>;

export type SalesRepFavoriteSlab = typeof salesRepFavoriteSlabs.$inferSelect;
export type InsertSalesRepFavoriteSlab = z.infer<typeof insertSalesRepFavoriteSlabSchema>;

export type SalesRepPortfolioImage = typeof salesRepPortfolioImages.$inferSelect;
export type InsertSalesRepPortfolioImage = z.infer<typeof insertSalesRepPortfolioImageSchema>;

export type SalesRepAppointment = typeof salesRepAppointments.$inferSelect;
export type InsertSalesRepAppointment = z.infer<typeof insertSalesRepAppointmentSchema>;

export type ClientConsultation = typeof clientConsultations.$inferSelect;
export type InsertClientConsultation = z.infer<typeof insertClientConsultationSchema>;

export type Cart = typeof carts.$inferSelect;
export type InsertCart = z.infer<typeof insertCartSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

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

// Workflow system tables
export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // "manual", "schedule", "event", "api"
  triggerConditions: jsonb("trigger_conditions"), // conditions for automated triggers
  status: text("status").default("active").notNull(), // "active", "inactive", "draft"
  category: text("category").notNull(), // "sales", "inventory", "client_management", "operations"
  priority: text("priority").default("medium").notNull(), // "low", "medium", "high", "urgent"
  estimatedDuration: integer("estimated_duration"), // in minutes
  assignedToRole: text("assigned_to_role"), // auto-assign to specific role
  createdBy: integer("created_by").references(() => users.id).notNull(),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  isTemplate: boolean("is_template").default(false),
  templateCategory: text("template_category"),
  automationEnabled: boolean("automation_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowSteps = pgTable("workflow_steps", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").references(() => workflows.id).notNull(),
  stepOrder: integer("step_order").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  stepType: text("step_type").notNull(), // "task", "decision", "automation", "notification", "approval"
  requiredRole: text("required_role"), // role required to execute this step
  assigneeId: integer("assignee_id").references(() => users.id),
  estimatedDuration: integer("estimated_duration"), // in minutes
  dependencies: jsonb("dependencies"), // array of step IDs that must complete first
  automationConfig: jsonb("automation_config"), // configuration for automated steps
  approvalRequired: boolean("approval_required").default(false),
  isOptional: boolean("is_optional").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflowInstances = pgTable("workflow_instances", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").references(() => workflows.id).notNull(),
  instanceName: text("instance_name"),
  status: text("status").default("pending").notNull(), // "pending", "in_progress", "completed", "cancelled", "failed"
  priority: text("priority").default("medium").notNull(),
  assignedTo: integer("assigned_to").references(() => users.id),
  startedBy: integer("started_by").references(() => users.id).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  progress: integer("progress").default(0), // percentage complete
  contextData: jsonb("context_data"), // data specific to this instance
  clientId: integer("client_id").references(() => clients.id),
  quoteId: integer("quote_id").references(() => quotes.id),
  productId: integer("product_id").references(() => products.id),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualDuration: integer("actual_duration"), // actual time taken in minutes
  notes: text("notes"),
  tags: text("tags").array(),
});

export const workflowStepInstances = pgTable("workflow_step_instances", {
  id: serial("id").primaryKey(),
  workflowInstanceId: integer("workflow_instance_id").references(() => workflowInstances.id).notNull(),
  stepId: integer("step_id").references(() => workflowSteps.id).notNull(),
  status: text("status").default("pending").notNull(), // "pending", "in_progress", "completed", "skipped", "failed"
  assignedTo: integer("assigned_to").references(() => users.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  dueDate: timestamp("due_date"),
  actualDuration: integer("actual_duration"), // in minutes
  output: jsonb("output"), // results or data from this step
  notes: text("notes"),
  attachments: text("attachments").array(),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
});

export const pipeline = pgTable("pipeline", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id").references(() => carts.id).notNull(),
  cartName: text("cart_name").notNull(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  stage: text("stage").default("quote").notNull(), // quote, approved, production, delivery, completed
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  notes: text("notes"),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowTemplates = pgTable("workflow_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  industry: text("industry").default("stone_distribution"),
  complexity: text("complexity").default("medium"), // "simple", "medium", "complex"
  estimatedDuration: integer("estimated_duration"),
  templateData: jsonb("template_data").notNull(), // complete workflow structure
  usageCount: integer("usage_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(false),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workflowComments = pgTable("workflow_comments", {
  id: serial("id").primaryKey(),
  workflowInstanceId: integer("workflow_instance_id").references(() => workflowInstances.id),
  stepInstanceId: integer("step_instance_id").references(() => workflowStepInstances.id),
  commentText: text("comment_text").notNull(),
  commentType: text("comment_type").default("general"), // "general", "issue", "question", "resolution"
  authorId: integer("author_id").references(() => users.id).notNull(),
  isInternal: boolean("is_internal").default(true),
  mentionedUsers: integer("mentioned_users").array(),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Workflow relations
export const workflowsRelations = relations(workflows, ({ many, one }) => ({
  steps: many(workflowSteps),
  instances: many(workflowInstances),
  createdBy: one(users, {
    fields: [workflows.createdBy],
    references: [users.id],
  }),
  lastModifiedBy: one(users, {
    fields: [workflows.lastModifiedBy],
    references: [users.id],
  }),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
  assignee: one(users, {
    fields: [workflowSteps.assigneeId],
    references: [users.id],
  }),
  stepInstances: many(workflowStepInstances),
}));

export const workflowInstancesRelations = relations(workflowInstances, ({ one, many }) => ({
  workflow: one(workflows, {
    fields: [workflowInstances.workflowId],
    references: [workflows.id],
  }),
  assignedTo: one(users, {
    fields: [workflowInstances.assignedTo],
    references: [users.id],
  }),
  startedBy: one(users, {
    fields: [workflowInstances.startedBy],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [workflowInstances.clientId],
    references: [clients.id],
  }),
  quote: one(quotes, {
    fields: [workflowInstances.quoteId],
    references: [quotes.id],
  }),
  product: one(products, {
    fields: [workflowInstances.productId],
    references: [products.id],
  }),
  stepInstances: many(workflowStepInstances),
  comments: many(workflowComments),
}));

export const workflowStepInstancesRelations = relations(workflowStepInstances, ({ one, many }) => ({
  workflowInstance: one(workflowInstances, {
    fields: [workflowStepInstances.workflowInstanceId],
    references: [workflowInstances.id],
  }),
  step: one(workflowSteps, {
    fields: [workflowStepInstances.stepId],
    references: [workflowSteps.id],
  }),
  assignedTo: one(users, {
    fields: [workflowStepInstances.assignedTo],
    references: [users.id],
  }),
  approvedBy: one(users, {
    fields: [workflowStepInstances.approvedBy],
    references: [users.id],
  }),
  comments: many(workflowComments),
}));

export const workflowCommentsRelations = relations(workflowComments, ({ one }) => ({
  workflowInstance: one(workflowInstances, {
    fields: [workflowComments.workflowInstanceId],
    references: [workflowInstances.id],
  }),
  stepInstance: one(workflowStepInstances, {
    fields: [workflowComments.stepInstanceId],
    references: [workflowStepInstances.id],
  }),
  author: one(users, {
    fields: [workflowComments.authorId],
    references: [users.id],
  }),
}));

// Workflow schemas
export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).omit({
  id: true,
  startedAt: true,
});

export const insertWorkflowStepInstanceSchema = createInsertSchema(workflowStepInstances).omit({
  id: true,
});

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});

export const insertWorkflowCommentSchema = createInsertSchema(workflowComments).omit({
  id: true,
  createdAt: true,
});

// Workflow types
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;

export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;

export type WorkflowStepInstance = typeof workflowStepInstances.$inferSelect;
export type InsertWorkflowStepInstance = z.infer<typeof insertWorkflowStepInstanceSchema>;

export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;

export type WorkflowComment = typeof workflowComments.$inferSelect;
export type InsertWorkflowComment = z.infer<typeof insertWorkflowCommentSchema>;

// Extended workflow types
export type WorkflowWithSteps = Workflow & {
  steps: WorkflowStep[];
};

export type WorkflowInstanceWithDetails = WorkflowInstance & {
  workflow: WorkflowWithSteps;
  stepInstances: (WorkflowStepInstance & {
    step: WorkflowStep;
    assignedTo?: User;
  })[];
  assignedTo?: User;
  startedBy?: User;
  client?: Client;
  quote?: Quote;
  product?: Product;
};

export type Pipeline = typeof pipeline.$inferSelect;
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;
export const insertPipelineSchema = createInsertSchema(pipeline);
