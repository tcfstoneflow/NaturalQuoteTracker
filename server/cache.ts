import { LRUCache } from 'lru-cache';

interface CacheOptions {
  max: number;
  ttl: number; // time to live in milliseconds
}

class CacheManager {
  private productCache: LRUCache<string, any>;
  private tagCache: LRUCache<string, any>;
  private dashboardCache: LRUCache<string, any>;

  constructor() {
    this.productCache = new LRUCache({
      max: 1000,
      ttl: 5 * 60 * 1000, // 5 minutes
    });

    this.tagCache = new LRUCache({
      max: 500,
      ttl: 30 * 60 * 1000, // 30 minutes
    });

    this.dashboardCache = new LRUCache({
      max: 100,
      ttl: 2 * 60 * 1000, // 2 minutes
    });
  }

  // Product cache methods
  getProduct(key: string): any | undefined {
    return this.productCache.get(key);
  }

  setProduct(key: string, value: any): void {
    this.productCache.set(key, value);
  }

  invalidateProducts(): void {
    this.productCache.clear();
  }

  // Tag cache methods
  getTags(key: string): any | undefined {
    return this.tagCache.get(key);
  }

  setTags(key: string, value: any): void {
    this.tagCache.set(key, value);
  }

  invalidateTags(): void {
    this.tagCache.clear();
  }

  // Dashboard cache methods
  getDashboard(key: string): any | undefined {
    return this.dashboardCache.get(key);
  }

  setDashboard(key: string, value: any): void {
    this.dashboardCache.set(key, value);
  }

  invalidateDashboard(): void {
    this.dashboardCache.clear();
  }

  // Clear all caches
  clearAll(): void {
    this.productCache.clear();
    this.tagCache.clear();
    this.dashboardCache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      products: {
        size: this.productCache.size,
        max: this.productCache.max
      },
      tags: {
        size: this.tagCache.size,
        max: this.tagCache.max
      },
      dashboard: {
        size: this.dashboardCache.size,
        max: this.dashboardCache.max
      }
    };
  }
}

export const cache = new CacheManager();