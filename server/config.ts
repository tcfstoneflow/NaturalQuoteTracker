import { z } from 'zod';

// Environment variable validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32).optional(),
  
  // Email configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().regex(/^\d+$/).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // AI configuration (optional)
  OPENAI_API_KEY: z.string().optional(),
  
  // Upload configuration
  MAX_FILE_SIZE: z.string().regex(/^\d+$/).optional(),
  UPLOAD_DIR: z.string().default('./upload'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).default('1000'),
  
  // Cache configuration
  CACHE_TTL_PRODUCTS: z.string().regex(/^\d+$/).default('300000'), // 5 minutes
  CACHE_TTL_DASHBOARD: z.string().regex(/^\d+$/).default('120000'), // 2 minutes
});

type Environment = z.infer<typeof envSchema>;

class ConfigManager {
  private config: Environment;

  constructor() {
    try {
      this.config = envSchema.parse(process.env);
    } catch (error) {
      console.error('Environment validation failed:', error);
      throw new Error('Invalid environment configuration');
    }
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get sessionSecret(): string {
    return this.config.SESSION_SECRET || 'fallback-secret-change-in-production';
  }

  get isEmailConfigured(): boolean {
    return !!(this.config.SMTP_HOST && this.config.SMTP_USER && this.config.SMTP_PASS);
  }

  get emailConfig() {
    return {
      host: this.config.SMTP_HOST,
      port: parseInt(this.config.SMTP_PORT || '587'),
      user: this.config.SMTP_USER,
      pass: this.config.SMTP_PASS,
    };
  }

  get isOpenAIConfigured(): boolean {
    return !!this.config.OPENAI_API_KEY;
  }

  get openAIApiKey(): string | undefined {
    return this.config.OPENAI_API_KEY;
  }

  get maxFileSize(): number {
    return parseInt(this.config.MAX_FILE_SIZE || '50000000'); // 50MB default
  }

  get uploadDir(): string {
    return this.config.UPLOAD_DIR;
  }

  get rateLimitConfig() {
    return {
      windowMs: parseInt(this.config.RATE_LIMIT_WINDOW_MS),
      maxRequests: parseInt(this.config.RATE_LIMIT_MAX_REQUESTS),
    };
  }

  get cacheConfig() {
    return {
      productsTTL: parseInt(this.config.CACHE_TTL_PRODUCTS),
      dashboardTTL: parseInt(this.config.CACHE_TTL_DASHBOARD),
    };
  }

  // Validate required configurations for specific features
  validateEmailFeature(): void {
    if (!this.isEmailConfigured) {
      throw new Error('Email configuration incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
    }
  }

  validateAIFeature(): void {
    if (!this.isOpenAIConfigured) {
      throw new Error('OpenAI API key not configured. Required: OPENAI_API_KEY');
    }
  }

  // Get sanitized config for logging (removes sensitive data)
  getSanitizedConfig() {
    return {
      nodeEnv: this.config.NODE_ENV,
      emailConfigured: this.isEmailConfigured,
      aiConfigured: this.isOpenAIConfigured,
      maxFileSize: this.maxFileSize,
      uploadDir: this.uploadDir,
      rateLimit: this.rateLimitConfig,
      cache: this.cacheConfig,
    };
  }
}

export const config = new ConfigManager();