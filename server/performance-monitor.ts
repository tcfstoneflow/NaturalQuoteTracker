import { db } from "./db";
import { products, quotes, clients } from "@shared/schema";
import { sql } from "drizzle-orm";

interface PerformanceMetrics {
  productCount: number;
  queryPerformance: {
    simpleSelect: number;
    filteredSelect: number;
    sortedSelect: number;
    searchSelect: number;
  };
  indexEfficiency: {
    categoryLookup: number;
    supplierLookup: number;
    priceLookup: number;
  };
  recommendations: string[];
}

export async function analyzeInventoryPerformance(): Promise<PerformanceMetrics> {
  const recommendations: string[] = [];
  
  // Count total products
  const productCountStart = Date.now();
  const [{ count: productCount }] = await db.select({ count: sql<number>`count(*)` }).from(products);
  const productCountTime = Date.now() - productCountStart;

  // Test query performance
  const simpleStart = Date.now();
  await db.select().from(products).limit(100);
  const simpleSelectTime = Date.now() - simpleStart;

  const filteredStart = Date.now();
  await db.select().from(products).where(sql`category = 'granite'`).limit(100);
  const filteredSelectTime = Date.now() - filteredStart;

  const sortedStart = Date.now();
  await db.select().from(products).orderBy(sql`price DESC`).limit(100);
  const sortedSelectTime = Date.now() - sortedStart;

  const searchStart = Date.now();
  await db.select().from(products).where(sql`name ILIKE '%white%'`).limit(50);
  const searchSelectTime = Date.now() - searchStart;

  // Test index efficiency
  const categoryStart = Date.now();
  await db.select().from(products).where(sql`category = 'marble'`).limit(10);
  const categoryLookupTime = Date.now() - categoryStart;

  const supplierStart = Date.now();
  await db.select().from(products).where(sql`supplier = 'Premium Stone Co'`).limit(10);
  const supplierLookupTime = Date.now() - supplierStart;

  const priceStart = Date.now();
  await db.select().from(products).where(sql`price > 100`).limit(10);
  const priceLookupTime = Date.now() - priceStart;

  // Performance recommendations
  if (productCount > 1000 && simpleSelectTime > 50) {
    recommendations.push("Consider adding LIMIT clauses to large product queries");
  }
  
  if (searchSelectTime > 100) {
    recommendations.push("Consider implementing full-text search for product names");
  }
  
  if (filteredSelectTime > 30) {
    recommendations.push("Verify database indexes are properly configured");
  }

  if (productCount > 5000) {
    recommendations.push("Consider implementing pagination for inventory views");
    recommendations.push("Monitor database connection pool usage with high product volumes");
  }

  return {
    productCount,
    queryPerformance: {
      simpleSelect: simpleSelectTime,
      filteredSelect: filteredSelectTime,
      sortedSelect: sortedSelectTime,
      searchSelect: searchSelectTime,
    },
    indexEfficiency: {
      categoryLookup: categoryLookupTime,
      supplierLookup: supplierLookupTime,
      priceLookup: priceLookupTime,
    },
    recommendations,
  };
}

export async function getInventoryStats() {
  const [productStats] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`count(*) filter (where is_active = true)`,
    lowStock: sql<number>`count(*) filter (where stock_quantity < 5)`,
    avgPrice: sql<number>`avg(price)`,
    maxPrice: sql<number>`max(price)`,
    categoryCounts: sql<string>`json_object_agg(category, category_count) from (select category, count(*) as category_count from products group by category) t`,
  }).from(products);

  return productStats;
}

export async function simulateLargeInventoryLoad() {
  console.log("Testing database performance with current inventory size...");
  
  const start = Date.now();
  const metrics = await analyzeInventoryPerformance();
  const totalTime = Date.now() - start;
  
  console.log(`Performance Analysis Complete (${totalTime}ms):`);
  console.log(`- Product Count: ${metrics.productCount}`);
  console.log(`- Simple Select: ${metrics.queryPerformance.simpleSelect}ms`);
  console.log(`- Filtered Select: ${metrics.queryPerformance.filteredSelect}ms`);
  console.log(`- Sorted Select: ${metrics.queryPerformance.sortedSelect}ms`);
  console.log(`- Search Query: ${metrics.queryPerformance.searchSelect}ms`);
  
  if (metrics.recommendations.length > 0) {
    console.log("Recommendations:");
    metrics.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  return metrics;
}