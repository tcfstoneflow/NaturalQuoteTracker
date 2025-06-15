import { 
  users, clients, products, quotes, quoteLineItems, activities, slabs, showroomVisits, 
  productGalleryImages, clientFavorites, consultations, tags, productTags, salesTargets,
  salesRepProfiles, salesRepFavoriteSlabs, salesRepPortfolioImages, salesRepAppointments, mfaCodes,
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
  type MfaCode, type InsertMfaCode,
  type DashboardStats
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
      if (error.code === '23505' || error.code === '23503') {
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
  // Basic operations needed for startup
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getClients(): Promise<Client[]>;
  getProducts(): Promise<Product[]>;
  getQuotes(): Promise<QuoteWithDetails[]>;
  getRecentActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  getDashboardStats(): Promise<DashboardStats>;
  executeQuery(query: string): Promise<any[]>;
  getSlabs(bundleId?: string): Promise<Slab[]>;
  getShowroomVisits(): Promise<ShowroomVisit[]>;
  createShowroomVisit(visit: InsertShowroomVisit): Promise<ShowroomVisit>;
  updateShowroomVisit(id: number, visit: Partial<InsertShowroomVisit>): Promise<ShowroomVisit>;
}

export class SimpleDatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await withRetry(async () => {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user || undefined;
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await withRetry(async () => {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    });
  }

  async getClients(): Promise<Client[]> {
    return await withRetry(async () => {
      return await db.select().from(clients).orderBy(desc(clients.createdAt));
    });
  }

  async getProducts(): Promise<Product[]> {
    return await withRetry(async () => {
      return await db.select().from(products).orderBy(desc(products.createdAt));
    });
  }

  async getQuotes(): Promise<QuoteWithDetails[]> {
    return await withRetry(async () => {
      const quotesData = await db.select().from(quotes).orderBy(desc(quotes.createdAt));
      return quotesData as QuoteWithDetails[];
    });
  }

  async getRecentActivities(limit: number = 10): Promise<Activity[]> {
    return await withRetry(async () => {
      return await db
        .select()
        .from(activities)
        .orderBy(desc(activities.createdAt))
        .limit(limit);
    });
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    return await withRetry(async () => {
      const [newActivity] = await db
        .insert(activities)
        .values(activity)
        .returning();
      return newActivity;
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return await withRetry(async () => {
      const [clientCount] = await db.select({ count: count() }).from(clients);
      const [productCount] = await db.select({ count: count() }).from(products);
      const [quoteCount] = await db.select({ count: count() }).from(quotes);
      const [slabCount] = await db.select({ count: count() }).from(slabs);

      return {
        totalClients: clientCount.count,
        totalProducts: productCount.count,
        totalQuotes: quoteCount.count,
        totalSlabs: slabCount.count,
        totalRevenue: "0",
        pendingQuotes: 0,
        lowStockProducts: 0,
        recentActivities: 0
      };
    });
  }

  async executeQuery(query: string): Promise<any[]> {
    return await withRetry(async () => {
      try {
        const result = await db.execute(sql.raw(query));
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('SQL query error:', error);
        throw error;
      }
    });
  }

  async getSlabs(bundleId?: string): Promise<Slab[]> {
    return await withRetry(async () => {
      if (bundleId) {
        return await db.select().from(slabs).where(eq(slabs.bundleId, bundleId));
      }
      return await db.select().from(slabs).orderBy(desc(slabs.createdAt));
    });
  }

  async getShowroomVisits(): Promise<ShowroomVisit[]> {
    return await withRetry(async () => {
      return await db.select().from(showroomVisits).orderBy(desc(showroomVisits.createdAt));
    });
  }

  async createShowroomVisit(visit: InsertShowroomVisit): Promise<ShowroomVisit> {
    return await withRetry(async () => {
      const [newVisit] = await db
        .insert(showroomVisits)
        .values(visit)
        .returning();
      return newVisit;
    });
  }

  async updateShowroomVisit(id: number, visit: Partial<InsertShowroomVisit>): Promise<ShowroomVisit> {
    return await withRetry(async () => {
      const [updatedVisit] = await db
        .update(showroomVisits)
        .set(visit)
        .where(eq(showroomVisits.id, id))
        .returning();
      return updatedVisit;
    });
  }
}

export const storage = new SimpleDatabaseStorage();