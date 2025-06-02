import { db } from "./db";
import { products, slabs, quotes, quoteLineItems } from "@shared/schema";
import { sql, eq, and, isNull, or } from "drizzle-orm";

/**
 * Database maintenance utilities for cleaning up data inconsistencies
 * and ensuring data integrity across the CRM system
 */

export async function validateProductData(): Promise<{
  issues: string[];
  fixed: string[];
}> {
  const issues: string[] = [];
  const fixed: string[] = [];

  try {
    // Check for products with missing required fields
    const invalidProducts = await db
      .select()
      .from(products)
      .where(
        or(
          isNull(products.supplier),
          isNull(products.finish),
          eq(products.supplier, ''),
          eq(products.finish, '')
        )
      );

    if (invalidProducts.length > 0) {
      issues.push(`Found ${invalidProducts.length} products with missing supplier or finish data`);
      
      // Fix missing suppliers
      await db
        .update(products)
        .set({ supplier: 'Unknown Supplier' })
        .where(or(isNull(products.supplier), eq(products.supplier, '')));
      
      // Fix missing finish
      await db
        .update(products)
        .set({ finish: 'Polished' })
        .where(or(isNull(products.finish), eq(products.finish, '')));
      
      fixed.push('Updated products with missing supplier/finish data');
    }

    // Check for duplicate bundle IDs
    const duplicateBundles = await db.execute(sql`
      SELECT bundle_id, COUNT(*) as count 
      FROM products 
      WHERE bundle_id IS NOT NULL 
      GROUP BY bundle_id 
      HAVING COUNT(*) > 1
    `);

    if (duplicateBundles.rows.length > 0) {
      issues.push(`Found ${duplicateBundles.rows.length} duplicate bundle IDs`);
    }

    // Check for orphaned slabs
    const orphanedSlabs = await db.execute(sql`
      SELECT s.* 
      FROM slabs s 
      LEFT JOIN products p ON s.bundle_id = p.bundle_id 
      WHERE p.bundle_id IS NULL
    `);

    if (orphanedSlabs.rows.length > 0) {
      issues.push(`Found ${orphanedSlabs.rows.length} orphaned slabs without matching products`);
    }

    return { issues, fixed };
  } catch (error) {
    console.error('Database validation error:', error);
    return { issues: ['Database validation failed'], fixed: [] };
  }
}

export async function optimizeQuoteCalculations(): Promise<void> {
  try {
    // Update quote totals to ensure accuracy
    const quotesToUpdate = await db
      .select({
        id: quotes.id,
        subtotal: quotes.subtotal,
        taxRate: quotes.taxRate,
        processingFee: quotes.processingFee
      })
      .from(quotes);

    for (const quote of quotesToUpdate) {
      const taxAmount = Number(quote.subtotal) * Number(quote.taxRate);
      const totalAmount = Number(quote.subtotal) + taxAmount + Number(quote.processingFee);

      await db
        .update(quotes)
        .set({
          taxAmount: taxAmount.toString(),
          totalAmount: totalAmount.toString()
        })
        .where(eq(quotes.id, quote.id));
    }
  } catch (error) {
    console.error('Quote calculation optimization error:', error);
  }
}

export async function cleanupExpiredData(): Promise<void> {
  try {
    // Clean up expired quotes older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await db
      .update(quotes)
      .set({ status: 'expired' })
      .where(
        and(
          eq(quotes.status, 'pending'),
          sql`${quotes.validUntil} < ${oneYearAgo.toISOString()}`
        )
      );

    // Clean up old MFA codes
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    await db.execute(sql`
      DELETE FROM mfa_codes 
      WHERE expires_at < ${oneDayAgo.toISOString()} OR used = true
    `);
  } catch (error) {
    console.error('Data cleanup error:', error);
  }
}

export async function generateHealthReport(): Promise<{
  systemHealth: 'good' | 'warning' | 'critical';
  metrics: Record<string, any>;
  recommendations: string[];
}> {
  try {
    const metrics: Record<string, any> = {};
    const recommendations: string[] = [];

    // Count total records
    const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [quoteCount] = await db.select({ count: sql<number>`count(*)` }).from(quotes);
    const [slabCount] = await db.select({ count: sql<number>`count(*)` }).from(slabs);

    metrics.totalProducts = productCount.count;
    metrics.totalQuotes = quoteCount.count;
    metrics.totalSlabs = slabCount.count;

    // Check low stock products
    const lowStockCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(and(eq(products.isActive, true), sql`${products.stockQuantity} <= 5`));

    metrics.lowStockProducts = lowStockCount[0].count;

    if (metrics.lowStockProducts > 10) {
      recommendations.push('High number of low-stock products detected. Consider restocking.');
    }

    // Check pending quotes
    const pendingQuotesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(quotes)
      .where(eq(quotes.status, 'pending'));

    metrics.pendingQuotes = pendingQuotesCount[0].count;

    if (metrics.pendingQuotes > 50) {
      recommendations.push('Large number of pending quotes. Consider follow-up actions.');
    }

    // Determine system health
    let systemHealth: 'good' | 'warning' | 'critical' = 'good';
    
    if (metrics.lowStockProducts > 20 || metrics.pendingQuotes > 100) {
      systemHealth = 'warning';
    }
    
    if (metrics.lowStockProducts > 50 || metrics.pendingQuotes > 200) {
      systemHealth = 'critical';
    }

    return { systemHealth, metrics, recommendations };
  } catch (error) {
    console.error('Health report generation error:', error);
    return {
      systemHealth: 'critical',
      metrics: {},
      recommendations: ['System health check failed. Please investigate.']
    };
  }
}