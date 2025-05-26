import { 
  users, clients, products, quotes, quoteLineItems, activities, slabs, showroomVisits,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Product, type InsertProduct,
  type Quote, type InsertQuote, type QuoteWithDetails,
  type QuoteLineItem, type InsertQuoteLineItem,
  type Activity, type InsertActivity,
  type Slab, type InsertSlab, type ProductWithSlabs,
  type ShowroomVisit, type InsertShowroomVisit,
  type DashboardStats
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, gte, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  toggleUserStatus(id: number, isActive: boolean): Promise<User>;
  deleteUser(id: number): Promise<boolean>;
  
  // Enhanced security methods
  updateFailedAttempts(id: number, attempts: number): Promise<void>;
  resetFailedLoginAttempts(id: number): Promise<void>;
  lockAccount(id: number, lockUntil: Date): Promise<void>;
  setPasswordResetToken(id: number, token: string, expires: Date): Promise<void>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(id: number): Promise<void>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
  
  // MFA methods
  createMFACode(mfaCode: InsertMfaCode): Promise<void>;
  verifyAndUseMFACode(userId: number, code: string, type: string): Promise<boolean>;
  enableMFA(userId: number, secret: string): Promise<void>;
  disableMFA(userId: number): Promise<void>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<boolean>;
  searchClients(query: string): Promise<Client[]>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;
  getTopProducts(limit?: number): Promise<Product[]>;
  getLowStockProducts(): Promise<Product[]>;

  // Quotes
  getQuotes(): Promise<QuoteWithDetails[]>;
  getQuote(id: number): Promise<QuoteWithDetails | undefined>;
  getQuoteByNumber(quoteNumber: string): Promise<QuoteWithDetails | undefined>;
  createQuote(quote: InsertQuote, lineItems: InsertQuoteLineItem[]): Promise<QuoteWithDetails>;
  updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote>;
  deleteQuote(id: number): Promise<boolean>;
  getRecentQuotes(limit?: number): Promise<QuoteWithDetails[]>;
  getClientQuotes(clientId: number): Promise<QuoteWithDetails[]>;

  // Quote Line Items
  getQuoteLineItems(quoteId: number): Promise<QuoteLineItem[]>;
  addQuoteLineItem(lineItem: InsertQuoteLineItem): Promise<QuoteLineItem>;
  updateQuoteLineItem(id: number, lineItem: Partial<InsertQuoteLineItem>): Promise<QuoteLineItem>;
  deleteQuoteLineItem(id: number): Promise<boolean>;

  // Activities
  getRecentActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Dashboard
  getDashboardStats(): Promise<DashboardStats>;

  // SQL Query
  executeQuery(query: string): Promise<any[]>;

  // Slabs
  getSlabs(bundleId?: string): Promise<Slab[]>;
  getSlab(id: number): Promise<Slab | undefined>;
  createSlab(slab: InsertSlab): Promise<Slab>;
  updateSlab(id: number, slab: Partial<InsertSlab>): Promise<Slab>;
  deleteSlab(id: number): Promise<boolean>;
  getProductWithSlabs(id: number): Promise<ProductWithSlabs | undefined>;
  updateSlabStatus(id: number, status: string, date?: Date): Promise<Slab>;

  // Showroom Visits
  getShowroomVisits(): Promise<ShowroomVisit[]>;
  getShowroomVisit(id: number): Promise<ShowroomVisit | undefined>;
  createShowroomVisit(visit: InsertShowroomVisit): Promise<ShowroomVisit>;
  updateShowroomVisit(id: number, visit: Partial<InsertShowroomVisit>): Promise<ShowroomVisit>;
  deleteShowroomVisit(id: number): Promise<boolean>;
  getPendingShowroomVisits(): Promise<ShowroomVisit[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  // Enhanced security methods
  async updateFailedAttempts(id: number, attempts: number): Promise<void> {
    await db
      .update(users)
      .set({ failedLoginAttempts: attempts })
      .where(eq(users.id, id));
  }

  async resetFailedLoginAttempts(id: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        failedLoginAttempts: 0,
        accountLockedUntil: null 
      })
      .where(eq(users.id, id));
  }

  async lockAccount(id: number, lockUntil: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        accountLockedUntil: lockUntil,
        failedLoginAttempts: 0 
      })
      .where(eq(users.id, id));
  }

  async setPasswordResetToken(id: number, token: string, expires: Date): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: token,
        passwordResetExpires: expires 
      })
      .where(eq(users.id, id));
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async clearPasswordResetToken(id: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordResetToken: null,
        passwordResetExpires: null 
      })
      .where(eq(users.id, id));
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        passwordHash,
        lastPasswordChange: new Date() 
      })
      .where(eq(users.id, id));
  }

  // MFA methods
  async createMFACode(mfaCode: InsertMfaCode): Promise<void> {
    await db.insert(mfaCodes).values(mfaCode);
  }

  async verifyAndUseMFACode(userId: number, code: string, type: string): Promise<boolean> {
    const [mfaCode] = await db
      .select()
      .from(mfaCodes)
      .where(
        and(
          eq(mfaCodes.userId, userId),
          eq(mfaCodes.code, code),
          eq(mfaCodes.type, type),
          eq(mfaCodes.used, false),
          gte(mfaCodes.expiresAt, new Date())
        )
      );

    if (!mfaCode) return false;

    // Mark code as used
    await db
      .update(mfaCodes)
      .set({ used: true })
      .where(eq(mfaCodes.id, mfaCode.id));

    return true;
  }

  async enableMFA(userId: number, secret: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        mfaEnabled: true,
        mfaSecret: secret 
      })
      .where(eq(users.id, userId));
  }

  async disableMFA(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ 
        mfaEnabled: false,
        mfaSecret: null 
      })
      .where(eq(users.id, userId));
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    
    await this.createActivity({
      type: "client_added",
      description: `New client ${newClient.name} added to CRM`,
      entityType: "client",
      entityId: newClient.id,
    });

    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return result.rowCount > 0;
  }

  async searchClients(query: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(
        sql`${clients.name} ILIKE ${'%' + query + '%'} OR ${clients.email} ILIKE ${'%' + query + '%'} OR ${clients.company} ILIKE ${'%' + query + '%'}`
      )
      .orderBy(desc(clients.createdAt));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true)).orderBy(asc(products.name));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async createProduct(product: any): Promise<Product> {
    // Bundle ID is now provided manually in the product data
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  private async generateBundleId(): Promise<string> {
    // Get the next sequential number
    const [lastProduct] = await db
      .select({ id: products.id })
      .from(products)
      .orderBy(desc(products.id))
      .limit(1);
    
    const nextId = (lastProduct?.id || 0) + 1;
    return `BDL-${nextId.toString().padStart(4, '0')}`;
  }

  private generateBarcodes(bundleId: string, slabCount: number): string[] {
    const barcodes: string[] = [];
    for (let i = 1; i <= slabCount; i++) {
      // Generate barcode: BundleID-SlabNumber
      barcodes.push(`${bundleId}-${i.toString().padStart(3, '0')}`);
    }
    return barcodes;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updatedProduct] = await db
      .update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db
      .update(products)
      .set({ isActive: false })
      .where(eq(products.id, id));
    return result.rowCount > 0;
  }

  async getTopProducts(limit: number = 4): Promise<Product[]> {
    return await db
      .select({
        ...products,
        salesCount: sql<number>`COALESCE(SUM(${quoteLineItems.quantity}), 0)`.as('salesCount')
      })
      .from(products)
      .leftJoin(quoteLineItems, eq(products.id, quoteLineItems.productId))
      .where(eq(products.isActive, true))
      .groupBy(products.id)
      .orderBy(desc(sql`COALESCE(SUM(${quoteLineItems.quantity}), 0)`))
      .limit(limit);
  }

  async getLowStockProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.stockQuantity} <= 10`));
  }

  // Quotes
  async getQuotes(): Promise<QuoteWithDetails[]> {
    return await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .orderBy(desc(quotes.createdAt))
      .then(async (results) => {
        const quotesWithDetails = await Promise.all(
          results.map(async (result) => {
            const lineItems = await db
              .select()
              .from(quoteLineItems)
              .leftJoin(products, eq(quoteLineItems.productId, products.id))
              .where(eq(quoteLineItems.quoteId, result.quotes.id));

            return {
              ...result.quotes,
              client: result.clients!,
              lineItems: lineItems.map(item => ({
                ...item.quote_line_items,
                product: item.products!
              }))
            };
          })
        );
        return quotesWithDetails;
      });
  }

  async getQuote(id: number): Promise<QuoteWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.id, id));

    if (!result) return undefined;

    const lineItems = await db
      .select()
      .from(quoteLineItems)
      .leftJoin(products, eq(quoteLineItems.productId, products.id))
      .where(eq(quoteLineItems.quoteId, id));

    return {
      ...result.quotes,
      client: result.clients!,
      lineItems: lineItems.map(item => ({
        ...item.quote_line_items,
        product: item.products!
      }))
    };
  }

  async getQuoteByNumber(quoteNumber: string): Promise<QuoteWithDetails | undefined> {
    const [result] = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.quoteNumber, quoteNumber));

    if (!result) return undefined;

    const lineItems = await db
      .select()
      .from(quoteLineItems)
      .leftJoin(products, eq(quoteLineItems.productId, products.id))
      .where(eq(quoteLineItems.quoteId, result.quotes.id));

    return {
      ...result.quotes,
      client: result.clients!,
      lineItems: lineItems.map(item => ({
        ...item.quote_line_items,
        product: item.products!
      }))
    };
  }

  async createQuote(quote: InsertQuote, lineItems: InsertQuoteLineItem[]): Promise<QuoteWithDetails> {
    const quoteNumber = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const [newQuote] = await db
      .insert(quotes)
      .values({ ...quote, quoteNumber })
      .returning();

    // Add line items
    if (lineItems.length > 0) {
      await db.insert(quoteLineItems).values(
        lineItems.map(item => ({ ...item, quoteId: newQuote.id }))
      );
    }

    await this.createActivity({
      type: "quote_created",
      description: `Quote ${quoteNumber} created`,
      entityType: "quote",
      entityId: newQuote.id,
    });

    return this.getQuote(newQuote.id) as Promise<QuoteWithDetails>;
  }

  async updateQuote(id: number, quote: Partial<InsertQuote>): Promise<Quote> {
    const [updatedQuote] = await db
      .update(quotes)
      .set({ ...quote, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updatedQuote;
  }

  async deleteQuote(id: number): Promise<boolean> {
    await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id));
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return result.rowCount > 0;
  }

  async getRecentQuotes(limit: number = 5): Promise<QuoteWithDetails[]> {
    const results = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .leftJoin(users, eq(quotes.createdBy, users.id))
      .orderBy(desc(quotes.createdAt))
      .limit(limit);

    const quotesWithDetails = await Promise.all(
      results.map(async (result) => {
        const lineItems = await db
          .select()
          .from(quoteLineItems)
          .leftJoin(products, eq(quoteLineItems.productId, products.id))
          .where(eq(quoteLineItems.quoteId, result.quotes.id));

        return {
          ...result.quotes,
          client: result.clients!,
          creator: result.users ? {
            id: result.users.id,
            username: result.users.username,
            firstName: result.users.firstName,
            lastName: result.users.lastName,
            role: result.users.role
          } : null,
          lineItems: lineItems.map(item => ({
            ...item.quote_line_items,
            product: item.products!
          }))
        };
      })
    );
    return quotesWithDetails;
  }

  async getClientQuotes(clientId: number): Promise<QuoteWithDetails[]> {
    const results = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(eq(quotes.clientId, clientId))
      .orderBy(desc(quotes.createdAt));

    const quotesWithDetails = await Promise.all(
      results.map(async (result) => {
        const lineItems = await db
          .select()
          .from(quoteLineItems)
          .leftJoin(products, eq(quoteLineItems.productId, products.id))
          .where(eq(quoteLineItems.quoteId, result.quotes.id));

        return {
          ...result.quotes,
          client: result.clients!,
          lineItems: lineItems.map(item => ({
            ...item.quote_line_items,
            product: item.products!
          }))
        };
      })
    );
    return quotesWithDetails;
  }

  // Quote Line Items
  async getQuoteLineItems(quoteId: number): Promise<QuoteLineItem[]> {
    return await db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
  }

  async addQuoteLineItem(lineItem: InsertQuoteLineItem): Promise<QuoteLineItem> {
    const [newLineItem] = await db
      .insert(quoteLineItems)
      .values(lineItem)
      .returning();
    return newLineItem;
  }

  async updateQuoteLineItem(id: number, lineItem: Partial<InsertQuoteLineItem>): Promise<QuoteLineItem> {
    const [updatedLineItem] = await db
      .update(quoteLineItems)
      .set(lineItem)
      .where(eq(quoteLineItems.id, id))
      .returning();
    return updatedLineItem;
  }

  async deleteQuoteLineItem(id: number): Promise<boolean> {
    const result = await db.delete(quoteLineItems).where(eq(quoteLineItems.id, id));
    return result.rowCount > 0;
  }

  // Activities
  async getRecentActivities(limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db
      .insert(activities)
      .values(activity)
      .returning();
    return newActivity;
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const [totalRevenueResult] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(${quotes.totalAmount}), 0)`
      })
      .from(quotes)
      .where(eq(quotes.status, 'approved'));

    const [clientCountResult] = await db
      .select({
        count: count()
      })
      .from(clients);

    const [pendingQuotesResult] = await db
      .select({
        count: count()
      })
      .from(quotes)
      .where(eq(quotes.status, 'pending'));

    const [inventoryCountResult] = await db
      .select({
        count: count()
      })
      .from(products)
      .where(eq(products.isActive, true));

    const [lowStockResult] = await db
      .select({
        count: count()
      })
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.stockQuantity} <= 10`));

    const [expiringQuotesResult] = await db
      .select({
        count: count()
      })
      .from(quotes)
      .where(and(
        eq(quotes.status, 'pending'),
        sql`${quotes.validUntil} <= NOW() + INTERVAL '7 days'`
      ));

    return {
      totalRevenue: totalRevenueResult.revenue || "0",
      activeClients: clientCountResult.count,
      pendingQuotes: pendingQuotesResult.count,
      inventoryItems: inventoryCountResult.count,
      revenueChange: "+12.5%", // This would be calculated based on previous period
      clientsChange: "+8.2%", // This would be calculated based on previous period
      lowStockCount: lowStockResult.count,
      expiringQuotesCount: expiringQuotesResult.count,
    };
  }

  // SQL Query execution
  async executeQuery(query: string): Promise<any[]> {
    try {
      const result = await db.execute(sql.raw(query));
      return result.rows || [];
    } catch (error) {
      throw new Error(`SQL execution failed: ${(error as Error).message}`);
    }
  }

  // Slab Management Methods
  async getSlabs(bundleId?: string): Promise<Slab[]> {
    if (bundleId) {
      return await db.select().from(slabs).where(eq(slabs.bundleId, bundleId)).orderBy(asc(slabs.slabNumber));
    }
    return await db.select().from(slabs).orderBy(asc(slabs.bundleId), asc(slabs.slabNumber));
  }

  async getSlab(id: number): Promise<Slab | undefined> {
    const [slab] = await db.select().from(slabs).where(eq(slabs.id, id));
    return slab;
  }

  private generateSlabBarcode(bundleId: string, slabNumber: string): string {
    // Generate a unique barcode combining bundle ID and slab number
    // Format: TCF-{bundleId}-{slabNumber}-{checksum}
    const baseCode = `TCF-${bundleId}-${slabNumber}`;
    const checksum = baseCode.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100;
    return `${baseCode}-${checksum.toString().padStart(2, '0')}`;
  }

  async createSlab(slab: InsertSlab): Promise<Slab> {
    // Auto-generate barcode if not provided
    const barcode = slab.barcode || this.generateSlabBarcode(slab.bundleId, slab.slabNumber);
    
    const [newSlab] = await db.insert(slabs).values({
      ...slab,
      barcode,
      updatedAt: new Date(),
    }).returning();
    return newSlab;
  }

  async updateSlab(id: number, slab: Partial<InsertSlab>): Promise<Slab> {
    const [updatedSlab] = await db.update(slabs)
      .set({
        ...slab,
        updatedAt: new Date(),
      })
      .where(eq(slabs.id, id))
      .returning();
    return updatedSlab;
  }

  async deleteSlab(id: number): Promise<boolean> {
    const result = await db.delete(slabs).where(eq(slabs.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getProductWithSlabs(id: number): Promise<ProductWithSlabs | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;

    const productSlabs = await this.getSlabs(product.bundleId);
    return {
      ...product,
      slabs: productSlabs,
    };
  }

  async updateSlabStatus(id: number, status: string, date?: Date): Promise<Slab> {
    const updateData: Partial<InsertSlab> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'sold') {
      updateData.soldDate = date || new Date();
    } else if (status === 'delivered') {
      updateData.deliveredDate = date || new Date();
    }

    const [updatedSlab] = await db.update(slabs)
      .set(updateData)
      .where(eq(slabs.id, id))
      .returning();
    return updatedSlab;
  }

  // Showroom Visits methods
  async getShowroomVisits(): Promise<ShowroomVisit[]> {
    return await db.select().from(showroomVisits).orderBy(desc(showroomVisits.createdAt));
  }

  async getShowroomVisit(id: number): Promise<ShowroomVisit | undefined> {
    const [visit] = await db.select().from(showroomVisits).where(eq(showroomVisits.id, id));
    return visit;
  }

  async createShowroomVisit(visit: InsertShowroomVisit): Promise<ShowroomVisit> {
    const [newVisit] = await db.insert(showroomVisits).values(visit).returning();
    
    // Create activity log for the showroom visit request
    await this.createActivity({
      type: "showroom_visit_request",
      description: `New showroom visit request from ${visit.name} (${visit.email})`,
      entityType: "contact_request",
      entityId: newVisit.id,
      metadata: {
        name: visit.name,
        email: visit.email,
        phone: visit.phone,
        preferredDate: visit.preferredDate,
        message: visit.message || null,
        status: "pending"
      }
    });

    return newVisit;
  }

  async updateShowroomVisit(id: number, visit: Partial<InsertShowroomVisit>): Promise<ShowroomVisit> {
    const [updatedVisit] = await db.update(showroomVisits)
      .set({ ...visit, updatedAt: new Date() })
      .where(eq(showroomVisits.id, id))
      .returning();
    return updatedVisit;
  }

  async deleteShowroomVisit(id: number): Promise<boolean> {
    const result = await db.delete(showroomVisits).where(eq(showroomVisits.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPendingShowroomVisits(): Promise<ShowroomVisit[]> {
    return await db.select().from(showroomVisits)
      .where(eq(showroomVisits.status, "pending"))
      .orderBy(desc(showroomVisits.createdAt));
  }
}

export const storage = new DatabaseStorage();
