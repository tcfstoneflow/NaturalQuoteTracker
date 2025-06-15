import { 
  users, clients, products, quotes, quoteLineItems, activities, slabs, showroomVisits, productGalleryImages, clientFavorites, consultations, tags, productTags, salesTargets,
  salesRepProfiles, salesRepFavoriteSlabs, salesRepPortfolioImages, salesRepAppointments,
  workflows, workflowSteps, workflowInstances, workflowStepInstances, workflowTemplates, workflowComments,
  type User, type InsertUser,
  type Client, type InsertClient,
  type Product, type InsertProduct,
  type Quote, type InsertQuote, type QuoteWithDetails,
  type QuoteLineItem, type InsertQuoteLineItem,
  type Activity, type InsertActivity,
  type Slab, type InsertSlab, type ProductWithSlabs,
  type ShowroomVisit, type InsertShowroomVisit,
  type ProductGalleryImage, type InsertProductGalleryImage,
  type ClientFavorite, type InsertClientFavorite,
  type Consultation, type InsertConsultation,
  type Tag, type InsertTag,
  type ProductTag, type InsertProductTag,
  type SalesTarget, type InsertSalesTarget,
  type SalesRepProfile, type InsertSalesRepProfile,
  type SalesRepFavoriteSlab, type InsertSalesRepFavoriteSlab,
  type SalesRepPortfolioImage, type InsertSalesRepPortfolioImage,
  type SalesRepAppointment, type InsertSalesRepAppointment,
  type DashboardStats,
  type Workflow, type InsertWorkflow, type WorkflowWithSteps,
  type WorkflowStep, type InsertWorkflowStep,
  type WorkflowInstance, type InsertWorkflowInstance, type WorkflowInstanceWithDetails,
  type WorkflowStepInstance, type InsertWorkflowStepInstance,
  type WorkflowTemplate, type InsertWorkflowTemplate,
  type WorkflowComment, type InsertWorkflowComment
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, sql, and, or, gte, lte, count } from "drizzle-orm";

// Database operation retry utility
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === '23505' || error.code === '23503') { // Unique constraint or foreign key violations
        throw error;
      }
      
      console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

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
  updateUserProfile(id: number, updates: { firstName?: string; lastName?: string; email?: string; username?: string; role?: string }): Promise<User>;
  updateUserAvatar(id: number, avatarUrl: string): Promise<User>;
  
  // MFA methods
  createMFACode(mfaCode: any): Promise<void>;
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
  getProductByBundleId(bundleId: string): Promise<Product | undefined>;
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
  getQuotesByDateRange(startDate: string, endDate: string): Promise<QuoteWithDetails[]>;

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
  getAllSlabs(): Promise<Slab[]>;
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

  // Gallery Images
  getGalleryImages(productId: number): Promise<ProductGalleryImage[]>;
  createGalleryImage(image: InsertProductGalleryImage): Promise<ProductGalleryImage>;
  deleteGalleryImage(id: number): Promise<boolean>;

  // Product Gallery
  getProductGalleryImages(productId: number): Promise<ProductGalleryImage[]>;
  
  // Client Favorites
  getClientFavorites(clientEmail: string): Promise<(ClientFavorite & { product: Product })[]>;
  addClientFavorite(favorite: InsertClientFavorite): Promise<ClientFavorite>;
  removeClientFavorite(clientEmail: string, productId: number): Promise<boolean>;
  isProductFavorited(clientEmail: string, productId: number): Promise<boolean>;
  
  // Consultations
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  
  // Tags
  getTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, tag: Partial<InsertTag>): Promise<Tag>;
  deleteTag(id: number): Promise<boolean>;
  
  // Product Tags
  getProductTags(productId: number): Promise<(ProductTag & { tag: Tag })[]>;
  getAllProductTags(): Promise<(ProductTag & { tag: Tag })[]>;
  addProductTag(productTag: InsertProductTag): Promise<ProductTag>;
  removeProductTag(productId: number, tagId: number): Promise<boolean>;
  getProductsByTag(tagId: number): Promise<Product[]>;
  getSimilarProductsByTags(productId: number, limit?: number): Promise<Product[]>;
  
  // Reports
  getTopSellingProducts(startDate: Date, endDate: Date, limit?: number): Promise<any[]>;
  getProductQuotesByDate(productId: number, date: string): Promise<any[]>;
  getSalesManagerQuotesByDate(managerId: number, date: string): Promise<any[]>;
  
  // Sales Targets
  getSalesTargets(): Promise<SalesTarget[]>;
  getSalesTargetsByUser(userId: number): Promise<SalesTarget[]>;
  getSalesTarget(userId: number, targetType: string, year: number, period: number): Promise<SalesTarget | undefined>;
  getSalesTargetById(id: number): Promise<SalesTarget | undefined>;
  createSalesTarget(target: InsertSalesTarget): Promise<SalesTarget>;
  updateSalesTarget(id: number, updates: Partial<InsertSalesTarget>): Promise<SalesTarget>;
  deleteSalesTarget(id: number): Promise<boolean>;
  
  // Sales Rep Portfolio
  getSalesRepPortfolioImages(salesRepId: number): Promise<SalesRepPortfolioImage[]>;
  addSalesRepPortfolioImage(imageData: InsertSalesRepPortfolioImage): Promise<SalesRepPortfolioImage>;
  updateSalesRepPortfolioImage(id: number, salesRepId: number, updates: Partial<{
    imageUrl: string;
    title: string;
    description: string;
    projectType: string;
  }>): Promise<SalesRepPortfolioImage | null>;
  deleteSalesRepPortfolioImage(id: number, salesRepId: number): Promise<boolean>;
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

  async getSalesManagers(): Promise<{ id: number; firstName: string; lastName: string; }[]> {
    return await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.role, 'admin'),
            eq(users.role, 'sales_rep')
          )
        )
      )
      .orderBy(users.firstName, users.lastName);
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

  async updateUserProfile(id: number, updates: { firstName?: string; lastName?: string; email?: string; username?: string; role?: string }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async updateUserAvatar(id: number, avatarUrl: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ avatarUrl: avatarUrl })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
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
  async getClients(): Promise<(Client & { salesManager?: { firstName: string; lastName: string } })[]> {
    return await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        company: clients.company,
        address: clients.address,
        city: clients.city,
        state: clients.state,
        zipCode: clients.zipCode,
        notes: clients.notes,
        salesManagerId: clients.salesManagerId,
        createdBy: clients.createdBy,
        createdAt: clients.createdAt,
        salesManager: {
          firstName: users.firstName,
          lastName: users.lastName,
        },
      })
      .from(clients)
      .leftJoin(users, eq(clients.salesManagerId, users.id))
      .orderBy(desc(clients.createdAt));
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
    try {
      // Check if client has associated quotes before deletion
      const clientQuotes = await db
        .select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(eq(quotes.clientId, id));
      
      if (clientQuotes[0].count > 0) {
        // Soft delete if client has quotes to maintain referential integrity
        await db
          .update(clients)
          .set({ 
            name: `[DELETED] ${new Date().toISOString()}`,
            email: `deleted_${id}_${Date.now()}@deleted.local`,
            isActive: false 
          })
          .where(eq(clients.id, id));
        return true;
      }
      
      const result = await db.delete(clients).where(eq(clients.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Delete client error:', error);
      return false;
    }
  }

  async searchClients(query: string): Promise<Client[]> {
    // Sanitize query to prevent SQL injection
    const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
    
    return await db
      .select()
      .from(clients)
      .where(
        or(
          sql`${clients.name} ILIKE ${`%${sanitizedQuery}%`}`,
          sql`${clients.email} ILIKE ${`%${sanitizedQuery}%`}`,
          sql`${clients.company} ILIKE ${`%${sanitizedQuery}%`}`
        )
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

  async getProductByBundleId(bundleId: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.bundleId, bundleId));
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

  async getTopSellingProducts(startDate: Date, endDate: Date, limit: number = 5): Promise<any[]> {
    try {
      const result = await db
        .select({
          productId: quoteLineItems.productId,
          productName: products.name,
          bundleId: products.bundleId,
          category: products.category,
          imageUrl: products.imageUrl,
          totalQuantitySold: sql<number>`SUM(CAST(${quoteLineItems.quantity} AS DECIMAL))`,
          totalRevenue: sql<number>`SUM(CAST(${quoteLineItems.totalPrice} AS DECIMAL))`,
          numberOfSales: sql<number>`COUNT(${quoteLineItems.id})`
        })
        .from(quoteLineItems)
        .innerJoin(quotes, eq(quoteLineItems.quoteId, quotes.id))
        .innerJoin(products, eq(quoteLineItems.productId, products.id))
        .where(
          and(
            eq(quotes.status, 'approved'),
            gte(quotes.createdAt, startDate),
            lte(quotes.createdAt, endDate)
          )
        )
        .groupBy(quoteLineItems.productId, products.name, products.bundleId, products.category, products.imageUrl)
        .orderBy(sql`SUM(CAST(${quoteLineItems.totalPrice} AS DECIMAL)) DESC`)
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting top selling products:', error);
      return [];
    }
  }

  async getSalesManagerPerformance(startDate: Date, endDate: Date, limit: number = 10): Promise<any[]> {
    try {
      const result = await db
        .select({
          managerId: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
          totalRevenue: sql<number>`COALESCE(SUM(
            (SELECT SUM(CAST(qli.total_price AS DECIMAL)) 
             FROM quote_line_items qli 
             WHERE qli.quote_id = quotes.id)
          ), 0)`,
          quotesCreated: sql<number>`COUNT(${quotes.id})`,
          clientCount: sql<number>`COUNT(DISTINCT ${clients.id})`,
          conversionRate: sql<number>`
            CASE 
              WHEN COUNT(${quotes.id}) > 0 
              THEN ROUND(
                (COUNT(CASE WHEN ${quotes.status} = 'approved' THEN 1 END) * 100.0) / COUNT(${quotes.id}), 
                1
              )
              ELSE 0 
            END
          `
        })
        .from(users)
        .leftJoin(quotes, and(
          eq(quotes.createdBy, users.id),
          gte(quotes.createdAt, startDate),
          lte(quotes.createdAt, endDate)
        ))
        .leftJoin(clients, eq(clients.salesManagerId, users.id))
        .where(or(eq(users.role, 'sales_manager'), eq(users.role, 'sales_rep'), eq(users.role, 'admin')))
        .groupBy(users.id, users.firstName, users.lastName)
        .orderBy(sql`COALESCE(SUM(
          (SELECT SUM(CAST(qli.total_price AS DECIMAL)) 
           FROM quote_line_items qli 
           WHERE qli.quote_id = quotes.id)
        ), 0) DESC`)
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting sales manager performance:', error);
      return [];
    }
  }

  async getSalesManagerPerformanceDetail(managerId: number, startDate: Date, endDate: Date, intervalFormat: string): Promise<any[]> {
    try {
      // Generate time series intervals based on the interval format
      const intervals: string[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        if (intervalFormat === 'hour') {
          intervals.push(current.toISOString());
          current.setHours(current.getHours() + 1);
        } else if (intervalFormat === 'day') {
          intervals.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        } else if (intervalFormat === 'month') {
          intervals.push(current.toISOString().slice(0, 7)); // YYYY-MM format
          current.setMonth(current.getMonth() + 1);
        }
      }

      // Get quote data for this manager grouped by time intervals
      const quoteData = await db
        .select({
          date: sql<string>`
            CASE 
              WHEN ${sql.raw(`'${intervalFormat}'`)} = 'hour' THEN DATE_TRUNC('hour', ${quotes.createdAt})::text
              WHEN ${sql.raw(`'${intervalFormat}'`)} = 'day' THEN DATE(${quotes.createdAt})::text
              WHEN ${sql.raw(`'${intervalFormat}'`)} = 'month' THEN TO_CHAR(${quotes.createdAt}, 'YYYY-MM')
            END
          `,
          quotes: sql<number>`COUNT(${quotes.id})`,
          revenue: sql<number>`COALESCE(SUM(
            (SELECT SUM(CAST(qli.total_price AS DECIMAL)) 
             FROM quote_line_items qli 
             WHERE qli.quote_id = quotes.id)
          ), 0)`,
          approvedQuotes: sql<number>`COUNT(CASE WHEN ${quotes.status} = 'approved' THEN 1 END)`
        })
        .from(quotes)
        .where(and(
          eq(quotes.createdBy, managerId),
          gte(quotes.createdAt, startDate),
          lte(quotes.createdAt, endDate)
        ))
        .groupBy(sql`
          CASE 
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'hour' THEN DATE_TRUNC('hour', ${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'day' THEN DATE(${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'month' THEN TO_CHAR(${quotes.createdAt}, 'YYYY-MM')
          END
        `)
        .orderBy(sql`
          CASE 
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'hour' THEN DATE_TRUNC('hour', ${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'day' THEN DATE(${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'month' THEN TO_CHAR(${quotes.createdAt}, 'YYYY-MM')
          END
        `);

      // Create a map of quote data by date for quick lookup
      const quoteMap = new Map();
      quoteData.forEach(row => {
        quoteMap.set(row.date, row);
      });

      // Build the complete time series with zero values for missing intervals
      const result = intervals.map(interval => {
        const data = quoteMap.get(interval) || { quotes: 0, revenue: 0, approvedQuotes: 0 };
        const conversionRate = data.quotes > 0 ? (data.approvedQuotes / data.quotes) * 100 : 0;
        
        return {
          date: interval,
          quotes: data.quotes,
          revenue: data.revenue,
          conversionRate: Math.round(conversionRate * 10) / 10 // Round to 1 decimal place
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting sales manager performance detail:', error);
      return [];
    }
  }

  async getProductPerformanceDetail(productId: number, startDate: Date, endDate: Date, intervalFormat: string): Promise<any[]> {
    try {
      // Generate time series intervals based on the interval format
      const intervals: string[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        if (intervalFormat === 'hour') {
          intervals.push(current.toISOString());
          current.setHours(current.getHours() + 1);
        } else if (intervalFormat === 'day') {
          intervals.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        } else if (intervalFormat === 'month') {
          intervals.push(current.toISOString().slice(0, 7)); // YYYY-MM format
          current.setMonth(current.getMonth() + 1);
        }
      }

      // Get product sales data grouped by time intervals
      const salesData = await db
        .select({
          date: sql<string>`
            CASE 
              WHEN ${sql.raw(`'${intervalFormat}'`)} = 'hour' THEN DATE_TRUNC('hour', ${quotes.createdAt})::text
              WHEN ${sql.raw(`'${intervalFormat}'`)} = 'day' THEN DATE(${quotes.createdAt})::text
              WHEN ${sql.raw(`'${intervalFormat}'`)} = 'month' THEN TO_CHAR(${quotes.createdAt}, 'YYYY-MM')
            END
          `,
          sales: sql<number>`COALESCE(SUM(CAST(${quoteLineItems.quantity} AS DECIMAL)), 0)`,
          revenue: sql<number>`COALESCE(SUM(CAST(${quoteLineItems.totalPrice} AS DECIMAL)), 0)`,
          orderCount: sql<number>`COUNT(DISTINCT ${quotes.id})`,
          stockLevel: sql<number>`AVG(${products.stockQuantity})`
        })
        .from(quoteLineItems)
        .innerJoin(quotes, eq(quoteLineItems.quoteId, quotes.id))
        .innerJoin(products, eq(quoteLineItems.productId, products.id))
        .where(and(
          eq(quoteLineItems.productId, productId),
          eq(quotes.status, 'approved'),
          gte(quotes.createdAt, startDate),
          lte(quotes.createdAt, endDate)
        ))
        .groupBy(sql`
          CASE 
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'hour' THEN DATE_TRUNC('hour', ${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'day' THEN DATE(${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'month' THEN TO_CHAR(${quotes.createdAt}, 'YYYY-MM')
          END
        `)
        .orderBy(sql`
          CASE 
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'hour' THEN DATE_TRUNC('hour', ${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'day' THEN DATE(${quotes.createdAt})::text
            WHEN ${sql.raw(`'${intervalFormat}'`)} = 'month' THEN TO_CHAR(${quotes.createdAt}, 'YYYY-MM')
          END
        `);

      // Create a map of sales data by date for quick lookup
      const salesMap = new Map();
      salesData.forEach(row => {
        salesMap.set(row.date, row);
      });

      // Build the complete time series with zero values for missing intervals
      const result = intervals.map(interval => {
        const data = salesMap.get(interval) || { sales: 0, revenue: 0, orderCount: 0, stockLevel: 0 };
        
        return {
          date: interval,
          sales: data.sales,
          revenue: data.revenue,
          orderCount: data.orderCount,
          stockLevel: Math.round(data.stockLevel || 0)
        };
      });

      return result;
    } catch (error) {
      console.error('Error getting product performance detail:', error);
      return [];
    }
  }

  async getTopClients(startDate: Date, endDate: Date, limit: number = 10): Promise<any[]> {
    try {
      const result = await db
        .select({
          clientId: clients.id,
          name: clients.name,
          company: clients.company,
          totalRevenue: sql<number>`COALESCE(SUM(
            (SELECT SUM(CAST(qli.total_price AS DECIMAL)) 
             FROM quote_line_items qli 
             WHERE qli.quote_id = quotes.id)
          ), 0)`,
          quoteCount: sql<number>`COUNT(${quotes.id})`
        })
        .from(clients)
        .leftJoin(quotes, and(
          eq(quotes.clientId, clients.id),
          eq(quotes.status, 'approved'),
          gte(quotes.createdAt, startDate),
          lte(quotes.createdAt, endDate)
        ))
        .groupBy(clients.id, clients.name, clients.company)
        .having(sql`COUNT(${quotes.id}) > 0`)
        .orderBy(sql`COALESCE(SUM(
          (SELECT SUM(CAST(qli.total_price AS DECIMAL)) 
           FROM quote_line_items qli 
           WHERE qli.quote_id = quotes.id)
        ), 0) DESC`)
        .limit(limit);

      return result;
    } catch (error) {
      console.error('Error getting top clients:', error);
      return [];
    }
  }

  async getInventoryByCategory(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const result = await db
        .select({
          category: products.category,
          productCount: sql<number>`COUNT(DISTINCT ${products.id})`,
          slabCount: sql<number>`COALESCE(COUNT(${slabs.id}), 0)`,
          totalSquareFeet: sql<number>`COALESCE(SUM(
            CASE 
              WHEN ${slabs.length} IS NOT NULL AND ${slabs.width} IS NOT NULL 
              THEN CAST(${slabs.length} AS DECIMAL) * CAST(${slabs.width} AS DECIMAL) / 144
              ELSE 0 
            END
          ), 0)`,
          totalValue: sql<number>`COALESCE(SUM(CAST(${products.price} AS DECIMAL) * ${products.stockQuantity}), 0)`
        })
        .from(products)
        .leftJoin(slabs, eq(slabs.bundleId, products.bundleId))
        .where(eq(products.isActive, true))
        .groupBy(products.category)
        .orderBy(sql`COALESCE(SUM(CAST(${products.price} AS DECIMAL) * ${products.stockQuantity}), 0) DESC`);

      return result;
    } catch (error) {
      console.error('Error getting inventory by category:', error);
      return [];
    }
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

  async getQuotesByDateRange(startDate: string, endDate: string): Promise<QuoteWithDetails[]> {
    const results = await db
      .select()
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .leftJoin(users, eq(quotes.createdBy, users.id))
      .where(and(
        gte(quotes.createdAt, new Date(startDate)),
        lte(quotes.createdAt, new Date(endDate + ' 23:59:59'))
      ))
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
          clientName: result.clients?.name || 'Unknown Client',
          salesManagerName: result.users ? `${result.users.firstName} ${result.users.lastName}` : 'Unassigned',
          salesManagerId: result.users?.id || null,
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

  async getAllSlabs(): Promise<Slab[]> {
    return await db.select().from(slabs).orderBy(asc(slabs.createdAt));
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

  async getProductGalleryImages(productId: number): Promise<ProductGalleryImage[]> {
    return await db.select().from(productGalleryImages)
      .where(and(
        eq(productGalleryImages.productId, productId),
        eq(productGalleryImages.isActive, true)
      ))
      .orderBy(asc(productGalleryImages.sortOrder));
  }

  async getGalleryImages(productId: number): Promise<ProductGalleryImage[]> {
    return await db.select().from(productGalleryImages)
      .where(eq(productGalleryImages.productId, productId))
      .orderBy(asc(productGalleryImages.createdAt));
  }

  async createGalleryImage(image: InsertProductGalleryImage): Promise<ProductGalleryImage> {
    const [newImage] = await db.insert(productGalleryImages).values(image).returning();
    return newImage;
  }

  async deleteGalleryImage(id: number): Promise<boolean> {
    const result = await db.delete(productGalleryImages).where(eq(productGalleryImages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getProductQuotesByDate(productId: number, date: string): Promise<any[]> {
    try {
      // Parse the date to get the start and end of the day
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // First get the quotes for the specific product and date
      const quotesData = await db
        .select()
        .from(quotes)
        .innerJoin(clients, eq(quotes.clientId, clients.id))
        .innerJoin(quoteLineItems, eq(quotes.id, quoteLineItems.quoteId))
        .where(
          and(
            eq(quoteLineItems.productId, productId),
            gte(quotes.createdAt, startOfDay),
            lte(quotes.createdAt, endOfDay)
          )
        )
        .orderBy(desc(quotes.createdAt));

      // Group quotes by ID to handle multiple line items per quote
      const quotesMap = new Map();
      
      quotesData.forEach((row: any) => {
        const quoteId = row.quotes.id;
        if (!quotesMap.has(quoteId)) {
          quotesMap.set(quoteId, {
            id: row.quotes.id,
            quoteNumber: row.quotes.quoteNumber,
            status: row.quotes.status,
            total: parseFloat(row.quotes.totalAmount || '0'),
            createdAt: row.quotes.createdAt,
            validUntil: row.quotes.validUntil,
            client: {
              name: row.clients.name,
              email: row.clients.email
            },
            lineItems: []
          });
        }
        
        // Add line item to the quote
        quotesMap.get(quoteId).lineItems.push({
          quantity: row.quote_line_items.quantity,
          unitPrice: parseFloat(row.quote_line_items.unitPrice || '0'),
          totalPrice: parseFloat(row.quote_line_items.totalPrice || '0'),
          product: { name: 'Product' }
        });
      });

      const transformedQuotes = Array.from(quotesMap.values());

      return transformedQuotes;
    } catch (error) {
      console.error('Product quotes by date error:', error);
      return [];
    }
  }

  async getSalesManagerQuotesByDate(managerId: number, date: string): Promise<any[]> {
    try {
      // Parse the date to get the start and end of the day
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get quotes created by this sales manager for the specific date
      const quotesData = await db
        .select({
          quote: quotes,
          client: clients,
          items: sql<any[]>`
            COALESCE(
              (SELECT json_agg(
                json_build_object(
                  'id', qli.id,
                  'quantity', qli.quantity,
                  'unitPrice', qli.unit_price,
                  'totalPrice', qli.total_price,
                  'product', json_build_object(
                    'id', p.id,
                    'name', p.name,
                    'category', p.category
                  )
                )
              )
              FROM quote_line_items qli
              LEFT JOIN products p ON qli.product_id = p.id
              WHERE qli.quote_id = quotes.id),
              '[]'::json
            )
          `
        })
        .from(quotes)
        .innerJoin(clients, eq(quotes.clientId, clients.id))
        .where(
          and(
            eq(quotes.createdBy, managerId),
            gte(quotes.createdAt, startOfDay),
            lte(quotes.createdAt, endOfDay)
          )
        )
        .orderBy(desc(quotes.createdAt));

      // Transform the data to match the expected format
      const transformedQuotes = quotesData.map((row: any) => {
        // Calculate total from line items
        const items = row.items || [];
        const total = items.reduce((sum: number, item: any) => 
          sum + parseFloat(item.totalPrice || '0'), 0
        );

        return {
          id: row.quote.id,
          quoteNumber: row.quote.quoteNumber,
          status: row.quote.status,
          total: total,
          createdAt: row.quote.createdAt,
          validUntil: row.quote.validUntil,
          notes: row.quote.notes,
          items: items,
          client: {
            id: row.client.id,
            name: row.client.name,
            email: row.client.email,
            phone: row.client.phone,
            company: row.client.company
          }
        };
      });

      return transformedQuotes;
    } catch (error) {
      console.error('Sales manager quotes by date error:', error);
      return [];
    }
  }

  // Consultations Implementation
  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const [newConsultation] = await db
      .insert(consultations)
      .values(consultation)
      .returning();
    return newConsultation;
  }

  // Client Favorites Implementation
  async getClientFavorites(clientEmail: string): Promise<(ClientFavorite & { product: Product })[]> {
    const favorites = await db
      .select()
      .from(clientFavorites)
      .innerJoin(products, eq(clientFavorites.productId, products.id))
      .where(eq(clientFavorites.clientEmail, clientEmail))
      .orderBy(desc(clientFavorites.createdAt));

    return favorites.map(row => ({
      ...row.client_favorites,
      product: row.products
    }));
  }

  async addClientFavorite(favorite: InsertClientFavorite): Promise<ClientFavorite> {
    // Check if already favorited (prevent duplicates)
    const existing = await db
      .select()
      .from(clientFavorites)
      .where(
        and(
          eq(clientFavorites.clientEmail, favorite.clientEmail),
          eq(clientFavorites.productId, favorite.productId)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [newFavorite] = await db
      .insert(clientFavorites)
      .values(favorite)
      .returning();

    return newFavorite;
  }

  async removeClientFavorite(clientEmail: string, productId: number): Promise<boolean> {
    const result = await db
      .delete(clientFavorites)
      .where(
        and(
          eq(clientFavorites.clientEmail, clientEmail),
          eq(clientFavorites.productId, productId)
        )
      );

    return (result.rowCount || 0) > 0;
  }

  async isProductFavorited(clientEmail: string, productId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(clientFavorites)
      .where(
        and(
          eq(clientFavorites.clientEmail, clientEmail),
          eq(clientFavorites.productId, productId)
        )
      );

    return !!favorite;
  }

  // Tags Implementation
  async getTags(): Promise<Tag[]> {
    return await withRetry(() => db.select().from(tags).orderBy(asc(tags.name)));
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.name, name));
    return tag;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db
      .insert(tags)
      .values(tag)
      .returning();
    return newTag;
  }

  async updateTag(id: number, tag: Partial<InsertTag>): Promise<Tag> {
    const [updatedTag] = await db
      .update(tags)
      .set(tag)
      .where(eq(tags.id, id))
      .returning();
    return updatedTag;
  }

  async deleteTag(id: number): Promise<boolean> {
    // First remove all product-tag associations
    await db.delete(productTags).where(eq(productTags.tagId, id));
    
    // Then delete the tag
    const result = await db.delete(tags).where(eq(tags.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Product Tags Implementation
  async getProductTags(productId: number): Promise<(ProductTag & { tag: Tag })[]> {
    const productTagsWithTags = await db
      .select()
      .from(productTags)
      .innerJoin(tags, eq(productTags.tagId, tags.id))
      .where(eq(productTags.productId, productId))
      .orderBy(asc(tags.name));

    return productTagsWithTags.map(row => ({
      ...row.product_tags,
      tag: row.tags
    }));
  }

  async getAllProductTags(): Promise<(ProductTag & { tag: Tag })[]> {
    try {
      const productTagsWithTags = await db
        .select()
        .from(productTags)
        .innerJoin(tags, eq(productTags.tagId, tags.id))
        .orderBy(asc(tags.name));

      return productTagsWithTags.map(row => ({
        ...row.product_tags,
        tag: row.tags
      }));
    } catch (error) {
      console.error('Error fetching all product tags:', error);
      return [];
    }
  }

  async addProductTag(productTag: InsertProductTag): Promise<ProductTag> {
    // Check if association already exists
    const existing = await db
      .select()
      .from(productTags)
      .where(
        and(
          eq(productTags.productId, productTag.productId),
          eq(productTags.tagId, productTag.tagId)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    const [newProductTag] = await db
      .insert(productTags)
      .values(productTag)
      .returning();
    return newProductTag;
  }

  async removeProductTag(productId: number, tagId: number): Promise<boolean> {
    const result = await db
      .delete(productTags)
      .where(
        and(
          eq(productTags.productId, productId),
          eq(productTags.tagId, tagId)
        )
      );
    return (result.rowCount || 0) > 0;
  }

  async getProductsByTag(tagId: number): Promise<Product[]> {
    const productsWithTag = await db
      .select()
      .from(products)
      .innerJoin(productTags, eq(products.id, productTags.productId))
      .where(eq(productTags.tagId, tagId))
      .orderBy(asc(products.name));

    return productsWithTag.map(row => row.products);
  }

  async getSimilarProductsByTags(productId: number, limit: number = 6): Promise<Product[]> {
    // Get all tags for the given product
    const productTagIds = await db
      .select({ tagId: productTags.tagId })
      .from(productTags)
      .where(eq(productTags.productId, productId));

    if (productTagIds.length === 0) {
      return []; // No tags, no similar products
    }

    const tagIds = productTagIds.map(pt => pt.tagId);

    // Find products that share tags with the given product
    const similarProducts = await db
      .select({
        product: products,
        sharedTagCount: sql<number>`COUNT(DISTINCT ${productTags.tagId})`
      })
      .from(products)
      .innerJoin(productTags, eq(products.id, productTags.productId))
      .where(
        and(
          sql`${productTags.tagId} IN (${sql.join(tagIds.map(id => sql`${id}`), sql`, `)})`,
          sql`${products.id} != ${productId}`,
          eq(products.isActive, true)
        )
      )
      .groupBy(products.id, products.name, products.bundleId, products.supplier, products.category, products.grade, products.thickness, products.finish, products.price, products.stockQuantity, products.slabLength, products.slabWidth, products.location, products.imageUrl, products.description, products.isActive, products.createdAt, products.displayOnline, products.ecommercePrice, products.ecommerceDescription, products.ecommerceImages, products.specifications, products.weight, products.dimensions, products.shippingClass, products.minOrderQuantity, products.maxOrderQuantity, products.leadTime)
      .orderBy(desc(sql`COUNT(DISTINCT ${productTags.tagId})`), asc(products.name))
      .limit(limit);

    return similarProducts.map(row => row.product);
  }

  // Sales Targets implementation
  async getSalesTargets(): Promise<SalesTarget[]> {
    return await db.select().from(salesTargets).orderBy(desc(salesTargets.createdAt));
  }

  async getSalesTargetsByUser(userId: number): Promise<SalesTarget[]> {
    return await db
      .select()
      .from(salesTargets)
      .where(eq(salesTargets.userId, userId))
      .orderBy(desc(salesTargets.year), desc(salesTargets.period));
  }

  async getSalesTarget(userId: number, targetType: string, year: number, period: number): Promise<SalesTarget | undefined> {
    const [target] = await db
      .select()
      .from(salesTargets)
      .where(
        and(
          eq(salesTargets.userId, userId),
          eq(salesTargets.targetType, targetType),
          eq(salesTargets.year, year),
          eq(salesTargets.period, period)
        )
      );
    return target || undefined;
  }

  async getSalesTargetById(id: number): Promise<SalesTarget | undefined> {
    const [target] = await db.select().from(salesTargets).where(eq(salesTargets.id, id));
    return target || undefined;
  }

  async createSalesTarget(target: InsertSalesTarget): Promise<SalesTarget> {
    const [newTarget] = await db
      .insert(salesTargets)
      .values({
        ...target,
        updatedAt: new Date()
      })
      .returning();
    return newTarget;
  }

  async updateSalesTarget(id: number, updates: Partial<InsertSalesTarget>): Promise<SalesTarget> {
    const [updatedTarget] = await db
      .update(salesTargets)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(salesTargets.id, id))
      .returning();
    return updatedTarget;
  }

  async deleteSalesTarget(id: number): Promise<boolean> {
    const result = await db.delete(salesTargets).where(eq(salesTargets.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Sales Rep Profile methods
  async getSalesRepProfile(userId: number): Promise<SalesRepProfile | undefined> {
    const [profile] = await db
      .select()
      .from(salesRepProfiles)
      .where(eq(salesRepProfiles.userId, userId));
    return profile || undefined;
  }

  async getSalesRepProfileBySlug(slug: string): Promise<(SalesRepProfile & { userName: string; firstName: string; lastName: string }) | undefined> {
    const [profile] = await db
      .select({
        id: salesRepProfiles.id,
        userId: salesRepProfiles.userId,
        urlSlug: salesRepProfiles.urlSlug,
        bio: salesRepProfiles.bio,
        title: salesRepProfiles.title,
        yearsExperience: salesRepProfiles.yearsExperience,
        specialties: salesRepProfiles.specialties,
        phone: salesRepProfiles.phone,
        email: salesRepProfiles.email,
        profileImageUrl: salesRepProfiles.profileImageUrl,
        isPublic: salesRepProfiles.isPublic,
        customization: salesRepProfiles.customization,
        createdAt: salesRepProfiles.createdAt,
        updatedAt: salesRepProfiles.updatedAt,
        userName: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(salesRepProfiles)
      .innerJoin(users, eq(salesRepProfiles.userId, users.id))
      .where(eq(salesRepProfiles.urlSlug, slug));
    return profile || undefined;
  }

  async createSalesRepProfile(profileData: InsertSalesRepProfile): Promise<SalesRepProfile> {
    const [profile] = await db
      .insert(salesRepProfiles)
      .values(profileData)
      .returning();
    return profile;
  }

  async updateSalesRepProfile(userId: number, updates: Partial<InsertSalesRepProfile>): Promise<SalesRepProfile | undefined> {
    const [profile] = await db
      .update(salesRepProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(salesRepProfiles.userId, userId))
      .returning();
    return profile || undefined;
  }

  // Sales Rep Favorite Slabs methods
  async getSalesRepFavoriteSlabs(salesRepId: number): Promise<(SalesRepFavoriteSlab & { product: Product })[]> {
    return await db
      .select({
        id: salesRepFavoriteSlabs.id,
        salesRepId: salesRepFavoriteSlabs.salesRepId,
        productId: salesRepFavoriteSlabs.productId,
        displayOrder: salesRepFavoriteSlabs.displayOrder,
        notes: salesRepFavoriteSlabs.notes,
        isActive: salesRepFavoriteSlabs.isActive,
        createdAt: salesRepFavoriteSlabs.createdAt,
        product: products
      })
      .from(salesRepFavoriteSlabs)
      .innerJoin(products, eq(salesRepFavoriteSlabs.productId, products.id))
      .where(and(
        eq(salesRepFavoriteSlabs.salesRepId, salesRepId),
        eq(salesRepFavoriteSlabs.isActive, true)
      ))
      .orderBy(salesRepFavoriteSlabs.displayOrder, salesRepFavoriteSlabs.createdAt);
  }

  async addSalesRepFavoriteSlab(favoriteData: InsertSalesRepFavoriteSlab): Promise<SalesRepFavoriteSlab> {
    const [favorite] = await db
      .insert(salesRepFavoriteSlabs)
      .values(favoriteData)
      .returning();
    return favorite;
  }

  async removeSalesRepFavoriteSlab(salesRepId: number, productId: number): Promise<boolean> {
    const result = await db
      .delete(salesRepFavoriteSlabs)
      .where(and(
        eq(salesRepFavoriteSlabs.salesRepId, salesRepId),
        eq(salesRepFavoriteSlabs.productId, productId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Sales Rep Portfolio methods
  async getSalesRepPortfolioImages(salesRepId: number): Promise<SalesRepPortfolioImage[]> {
    return await db
      .select()
      .from(salesRepPortfolioImages)
      .where(and(
        eq(salesRepPortfolioImages.salesRepId, salesRepId),
        eq(salesRepPortfolioImages.isActive, true)
      ))
      .orderBy(salesRepPortfolioImages.displayOrder, salesRepPortfolioImages.createdAt);
  }

  async addSalesRepPortfolioImage(imageData: InsertSalesRepPortfolioImage): Promise<SalesRepPortfolioImage> {
    const [image] = await db
      .insert(salesRepPortfolioImages)
      .values(imageData)
      .returning();
    return image;
  }

  async updateSalesRepPortfolioImage(id: number, salesRepId: number, updates: Partial<{
    imageUrl: string;
    title: string;
    description: string;
    projectType: string;
    productsUsed: string[];
  }>): Promise<SalesRepPortfolioImage | null> {
    const [image] = await db
      .update(salesRepPortfolioImages)
      .set(updates)
      .where(and(
        eq(salesRepPortfolioImages.id, id),
        eq(salesRepPortfolioImages.salesRepId, salesRepId)
      ))
      .returning();
    return image || null;
  }

  async deleteSalesRepPortfolioImage(id: number, salesRepId: number): Promise<boolean> {
    const result = await db
      .delete(salesRepPortfolioImages)
      .where(and(
        eq(salesRepPortfolioImages.id, id),
        eq(salesRepPortfolioImages.salesRepId, salesRepId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Sales Rep Appointments methods
  async createSalesRepAppointment(appointmentData: InsertSalesRepAppointment): Promise<SalesRepAppointment> {
    const [appointment] = await db
      .insert(salesRepAppointments)
      .values(appointmentData)
      .returning();
    return appointment;
  }

  async getSalesRepAppointments(salesRepId: number): Promise<SalesRepAppointment[]> {
    return await db
      .select()
      .from(salesRepAppointments)
      .where(eq(salesRepAppointments.salesRepId, salesRepId))
      .orderBy(desc(salesRepAppointments.appointmentDate));
  }

  async updateAppointmentStatus(id: number, status: string): Promise<SalesRepAppointment | undefined> {
    const [appointment] = await db
      .update(salesRepAppointments)
      .set({ status })
      .where(eq(salesRepAppointments.id, id))
      .returning();
    return appointment || undefined;
  }

  // Workflow management methods
  async getWorkflows(): Promise<WorkflowWithSteps[]> {
    return await withRetry(async () => {
      const workflowsData = await db
        .select()
        .from(workflows)
        .leftJoin(workflowSteps, eq(workflows.id, workflowSteps.workflowId))
        .orderBy(desc(workflows.createdAt), asc(workflowSteps.stepOrder));

      // Group workflows with their steps
      const workflowMap = new Map<number, WorkflowWithSteps>();
      
      for (const row of workflowsData) {
        const workflow = row.workflows;
        const step = row.workflow_steps;
        
        if (!workflowMap.has(workflow.id)) {
          workflowMap.set(workflow.id, {
            ...workflow,
            steps: []
          });
        }
        
        if (step) {
          workflowMap.get(workflow.id)!.steps.push(step);
        }
      }
      
      return Array.from(workflowMap.values());
    });
  }

  async getWorkflow(id: number): Promise<WorkflowWithSteps | undefined> {
    const [workflow] = await db.select().from(workflows).where(eq(workflows.id, id));
    if (!workflow) return undefined;

    const steps = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, id))
      .orderBy(asc(workflowSteps.stepOrder));

    return {
      ...workflow,
      steps
    };
  }

  async createWorkflow(workflowData: InsertWorkflow): Promise<Workflow> {
    const [workflow] = await db
      .insert(workflows)
      .values(workflowData)
      .returning();
    return workflow;
  }

  async updateWorkflow(id: number, updates: Partial<InsertWorkflow>): Promise<Workflow> {
    const [workflow] = await db
      .update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, id))
      .returning();
    return workflow;
  }

  async deleteWorkflow(id: number): Promise<boolean> {
    // Delete associated steps first
    await db.delete(workflowSteps).where(eq(workflowSteps.workflowId, id));
    
    const result = await db.delete(workflows).where(eq(workflows.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Workflow steps methods
  async createWorkflowStep(stepData: InsertWorkflowStep): Promise<WorkflowStep> {
    const [step] = await db
      .insert(workflowSteps)
      .values(stepData)
      .returning();
    return step;
  }

  async updateWorkflowStep(id: number, updates: Partial<InsertWorkflowStep>): Promise<WorkflowStep> {
    const [step] = await db
      .update(workflowSteps)
      .set(updates)
      .where(eq(workflowSteps.id, id))
      .returning();
    return step;
  }

  async deleteWorkflowStep(id: number): Promise<boolean> {
    const result = await db.delete(workflowSteps).where(eq(workflowSteps.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Workflow instances methods
  async getWorkflowInstances(): Promise<WorkflowInstanceWithDetails[]> {
    return await withRetry(async () => {
      const instancesData = await db
        .select()
        .from(workflowInstances)
        .leftJoin(workflows, eq(workflowInstances.workflowId, workflows.id))
        .leftJoin(users, eq(workflowInstances.assignedTo, users.id))
        .leftJoin(clients, eq(workflowInstances.clientId, clients.id))
        .leftJoin(quotes, eq(workflowInstances.quoteId, quotes.id))
        .leftJoin(products, eq(workflowInstances.productId, products.id))
        .orderBy(desc(workflowInstances.startedAt));

      const instancesMap = new Map<number, any>();
      
      for (const row of instancesData) {
        const instance = row.workflow_instances;
        if (!instancesMap.has(instance.id)) {
          instancesMap.set(instance.id, {
            ...instance,
            workflow: row.workflows,
            assignedTo: row.users,
            client: row.clients,
            quote: row.quotes,
            product: row.products,
            stepInstances: []
          });
        }
      }

      // Get step instances for each workflow instance
      for (const [instanceId, instanceData] of instancesMap) {
        const stepInstances = await db
          .select()
          .from(workflowStepInstances)
          .leftJoin(workflowSteps, eq(workflowStepInstances.stepId, workflowSteps.id))
          .leftJoin(users, eq(workflowStepInstances.assignedTo, users.id))
          .where(eq(workflowStepInstances.workflowInstanceId, instanceId))
          .orderBy(asc(workflowSteps.stepOrder));

        instanceData.stepInstances = stepInstances.map(row => ({
          ...row.workflow_step_instances,
          step: row.workflow_steps,
          assignedTo: row.users
        }));
      }

      return Array.from(instancesMap.values());
    });
  }

  async getWorkflowInstance(id: number): Promise<WorkflowInstanceWithDetails | undefined> {
    const [instance] = await db
      .select()
      .from(workflowInstances)
      .leftJoin(workflows, eq(workflowInstances.workflowId, workflows.id))
      .leftJoin(users, eq(workflowInstances.assignedTo, users.id))
      .leftJoin(clients, eq(workflowInstances.clientId, clients.id))
      .leftJoin(quotes, eq(workflowInstances.quoteId, quotes.id))
      .leftJoin(products, eq(workflowInstances.productId, products.id))
      .where(eq(workflowInstances.id, id));

    if (!instance) return undefined;

    // Get workflow steps
    const workflowStepsData = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, instance.workflows.id))
      .orderBy(asc(workflowSteps.stepOrder));

    // Get step instances
    const stepInstances = await db
      .select()
      .from(workflowStepInstances)
      .leftJoin(workflowSteps, eq(workflowStepInstances.stepId, workflowSteps.id))
      .leftJoin(users, eq(workflowStepInstances.assignedTo, users.id))
      .where(eq(workflowStepInstances.workflowInstanceId, id))
      .orderBy(asc(workflowSteps.stepOrder));

    return {
      ...instance.workflow_instances,
      workflow: {
        ...instance.workflows,
        steps: workflowStepsData
      },
      assignedTo: instance.users,
      client: instance.clients,
      quote: instance.quotes,
      product: instance.products,
      stepInstances: stepInstances.map(row => ({
        ...row.workflow_step_instances,
        step: row.workflow_steps,
        assignedTo: row.users
      }))
    };
  }

  async createWorkflowInstance(instanceData: InsertWorkflowInstance): Promise<WorkflowInstance> {
    const [instance] = await db
      .insert(workflowInstances)
      .values(instanceData)
      .returning();
    
    // Create step instances for all workflow steps
    const workflowStepsData = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, instance.workflowId))
      .orderBy(asc(workflowSteps.stepOrder));

    for (const step of workflowStepsData) {
      await db.insert(workflowStepInstances).values({
        workflowInstanceId: instance.id,
        stepId: step.id,
        status: 'pending',
        assignedTo: step.assigneeId
      });
    }

    return instance;
  }

  async updateWorkflowInstance(id: number, updates: Partial<InsertWorkflowInstance>): Promise<WorkflowInstance> {
    const [instance] = await db
      .update(workflowInstances)
      .set(updates)
      .where(eq(workflowInstances.id, id))
      .returning();
    return instance;
  }

  async deleteWorkflowInstance(id: number): Promise<boolean> {
    // Delete step instances first
    await db.delete(workflowStepInstances).where(eq(workflowStepInstances.workflowInstanceId, id));
    
    const result = await db.delete(workflowInstances).where(eq(workflowInstances.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Workflow step instances methods
  async updateWorkflowStepInstance(id: number, updates: Partial<InsertWorkflowStepInstance>): Promise<WorkflowStepInstance> {
    const [stepInstance] = await db
      .update(workflowStepInstances)
      .set(updates)
      .where(eq(workflowStepInstances.id, id))
      .returning();
    return stepInstance;
  }

  async completeWorkflowStep(stepInstanceId: number, output?: any, notes?: string): Promise<WorkflowStepInstance> {
    const [stepInstance] = await db
      .update(workflowStepInstances)
      .set({
        status: 'completed',
        completedAt: new Date(),
        output,
        notes
      })
      .where(eq(workflowStepInstances.id, stepInstanceId))
      .returning();
    
    // Check if all steps are completed to update workflow instance status
    const allSteps = await db
      .select()
      .from(workflowStepInstances)
      .where(eq(workflowStepInstances.workflowInstanceId, stepInstance.workflowInstanceId));
    
    const completedSteps = allSteps.filter(step => step.status === 'completed');
    const progress = Math.round((completedSteps.length / allSteps.length) * 100);
    
    const instanceStatus = progress === 100 ? 'completed' : 'in_progress';
    const completedAt = progress === 100 ? new Date() : null;
    
    await db
      .update(workflowInstances)
      .set({
        status: instanceStatus,
        progress,
        completedAt
      })
      .where(eq(workflowInstances.id, stepInstance.workflowInstanceId));
    
    return stepInstance;
  }

  // Workflow templates methods
  async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    return await db
      .select()
      .from(workflowTemplates)
      .orderBy(desc(workflowTemplates.usageCount), desc(workflowTemplates.createdAt));
  }

  async getWorkflowTemplate(id: number): Promise<WorkflowTemplate | undefined> {
    const [template] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, id));
    return template;
  }

  async createWorkflowTemplate(templateData: InsertWorkflowTemplate): Promise<WorkflowTemplate> {
    const [template] = await db
      .insert(workflowTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async createWorkflowFromTemplate(templateId: number, instanceData: Partial<InsertWorkflowInstance>): Promise<WorkflowInstance> {
    const template = await this.getWorkflowTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create workflow from template
    const workflowData = template.templateData as any;
    const [workflow] = await db
      .insert(workflows)
      .values({
        name: workflowData.name,
        description: workflowData.description,
        category: workflowData.category,
        priority: workflowData.priority,
        triggerType: 'manual',
        status: 'active',
        createdBy: instanceData.startedBy!,
        estimatedDuration: workflowData.estimatedDuration
      })
      .returning();

    // Create workflow steps
    for (const stepData of workflowData.steps) {
      await db.insert(workflowSteps).values({
        workflowId: workflow.id,
        stepOrder: stepData.stepOrder,
        name: stepData.name,
        description: stepData.description,
        stepType: stepData.stepType,
        requiredRole: stepData.requiredRole,
        estimatedDuration: stepData.estimatedDuration,
        isOptional: stepData.isOptional || false
      });
    }

    // Create workflow instance
    const instance = await this.createWorkflowInstance({
      workflowId: workflow.id,
      startedBy: instanceData.startedBy!,
      instanceName: instanceData.instanceName,
      assignedTo: instanceData.assignedTo,
      clientId: instanceData.clientId,
      quoteId: instanceData.quoteId,
      productId: instanceData.productId,
      dueDate: instanceData.dueDate,
      priority: instanceData.priority || 'medium'
    });

    // Increment template usage count
    await db
      .update(workflowTemplates)
      .set({ usageCount: template.usageCount + 1 })
      .where(eq(workflowTemplates.id, templateId));

    return instance;
  }

  // Workflow comments methods
  async getWorkflowComments(workflowInstanceId: number): Promise<(WorkflowComment & { author: User })[]> {
    const comments = await db
      .select()
      .from(workflowComments)
      .leftJoin(users, eq(workflowComments.authorId, users.id))
      .where(eq(workflowComments.workflowInstanceId, workflowInstanceId))
      .orderBy(desc(workflowComments.createdAt));

    return comments.map(row => ({
      ...row.workflow_comments,
      author: row.users!
    }));
  }

  async createWorkflowComment(commentData: InsertWorkflowComment): Promise<WorkflowComment> {
    const [comment] = await db
      .insert(workflowComments)
      .values(commentData)
      .returning();
    return comment;
  }

  async getUserWorkflowInstances(userId: number): Promise<WorkflowInstanceWithDetails[]> {
    const instances = await db
      .select()
      .from(workflowInstances)
      .leftJoin(workflows, eq(workflowInstances.workflowId, workflows.id))
      .leftJoin(clients, eq(workflowInstances.clientId, clients.id))
      .where(
        or(
          eq(workflowInstances.assignedTo, userId),
          eq(workflowInstances.startedBy, userId)
        )
      )
      .orderBy(desc(workflowInstances.startedAt));

    return instances.map(row => ({
      ...row.workflow_instances,
      workflow: row.workflows,
      client: row.clients,
      stepInstances: []
    })) as WorkflowInstanceWithDetails[];
  }

  // Sales leader permission methods
  async updateQuoteApproval(quoteId: number, approvalData: {
    approved: boolean;
    approvedBy: number;
    approvedAt: Date;
    approvalNotes?: string;
  }): Promise<Quote> {
    const [quote] = await db
      .update(quotes)
      .set({
        approved: approvalData.approved,
        approvedBy: approvalData.approvedBy,
        approvedAt: approvalData.approvedAt,
        approvalNotes: approvalData.approvalNotes,
        status: approvalData.approved ? 'approved' : 'rejected',
        updatedAt: new Date()
      })
      .where(eq(quotes.id, quoteId))
      .returning();
    
    return quote;
  }

  async getTeamPerformanceReport(params: {
    startDate?: Date;
    endDate?: Date;
    teamMemberId?: number;
  }): Promise<any> {
    const whereConditions = [];
    
    if (params.startDate) {
      whereConditions.push(gte(quotes.createdAt, params.startDate));
    }
    
    if (params.endDate) {
      whereConditions.push(lte(quotes.createdAt, params.endDate));
    }
    
    if (params.teamMemberId) {
      whereConditions.push(eq(quotes.salesRepId, params.teamMemberId));
    }
    
    const teamQuotes = await db
      .select({
        salesRepId: quotes.salesRepId,
        salesRep: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        },
        totalQuotes: count(quotes.id),
        totalValue: sql<number>`COALESCE(SUM(${quotes.totalAmount}::numeric), 0)`,
        approvedQuotes: sql<number>`COALESCE(SUM(CASE WHEN ${quotes.approved} = true THEN 1 ELSE 0 END), 0)`,
        approvedValue: sql<number>`COALESCE(SUM(CASE WHEN ${quotes.approved} = true THEN ${quotes.totalAmount}::numeric ELSE 0 END), 0)`
      })
      .from(quotes)
      .leftJoin(users, eq(quotes.salesRepId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(quotes.salesRepId, users.firstName, users.lastName, users.email);
    
    return {
      teamMembers: teamQuotes,
      summary: {
        totalQuotes: teamQuotes.reduce((sum, member) => sum + member.totalQuotes, 0),
        totalValue: teamQuotes.reduce((sum, member) => sum + Number(member.totalValue), 0),
        approvedQuotes: teamQuotes.reduce((sum, member) => sum + member.approvedQuotes, 0),
        approvedValue: teamQuotes.reduce((sum, member) => sum + Number(member.approvedValue), 0)
      }
    };
  }

  async getSalesLeaderMetrics(salesLeaderId: number): Promise<any> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Get team members under sales leader supervision
    const teamMembers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(
        and(
          or(
            eq(users.role, 'sales_manager'),
            eq(users.role, 'sales_rep')
          ),
          eq(users.isActive, true)
        )
      );

    // Get quotes pending approval
    const pendingQuotes = await db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        projectName: quotes.projectName,
        totalAmount: quotes.totalAmount,
        createdAt: quotes.createdAt,
        salesRep: {
          firstName: users.firstName,
          lastName: users.lastName
        },
        client: {
          name: clients.name,
          company: clients.company
        }
      })
      .from(quotes)
      .leftJoin(users, eq(quotes.salesRepId, users.id))
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(
        and(
          eq(quotes.status, 'pending'),
          sql`${quotes.approved} IS NULL`
        )
      )
      .orderBy(asc(quotes.createdAt));

    // Get monthly performance metrics
    const monthlyMetrics = await db
      .select({
        totalQuotes: count(quotes.id),
        totalValue: sql<number>`COALESCE(SUM(${quotes.totalAmount}::numeric), 0)`,
        approvedQuotes: sql<number>`COALESCE(SUM(CASE WHEN ${quotes.approved} = true THEN 1 ELSE 0 END), 0)`,
        rejectedQuotes: sql<number>`COALESCE(SUM(CASE WHEN ${quotes.approved} = false THEN 1 ELSE 0 END), 0)`
      })
      .from(quotes)
      .where(
        gte(quotes.createdAt, currentMonth)
      );

    return {
      teamMembers,
      pendingQuotes,
      monthlyMetrics: monthlyMetrics[0] || {
        totalQuotes: 0,
        totalValue: 0,
        approvedQuotes: 0,
        rejectedQuotes: 0
      },
      dashboardStats: {
        totalTeamMembers: teamMembers.length,
        pendingApprovals: pendingQuotes.length,
        monthlyQuoteValue: monthlyMetrics[0]?.totalValue || 0,
        approvalRate: monthlyMetrics[0]?.totalQuotes > 0 
          ? Math.round((monthlyMetrics[0].approvedQuotes / monthlyMetrics[0].totalQuotes) * 100) 
          : 0
      }
    };
  }
}

export const storage = new DatabaseStorage();
