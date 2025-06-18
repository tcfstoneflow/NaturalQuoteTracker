# Natural Stone Distribution CRM

A production-ready business management platform for natural stone distribution with advanced data intelligence, comprehensive security, and automated operations.

## Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend]
        PWA[Progressive Web App]
    end
    
    subgraph "Load Balancer"
        LB[Nginx/Load Balancer]
    end
    
    subgraph "Application Layer"
        API[Express.js API Server]
        AUTH[JWT Authentication]
        VAL[Zod Validation]
        RATE[Rate Limiting]
        AUDIT[Audit Logging]
    end
    
    subgraph "Business Logic"
        CTRL[Controllers]
        SVC[Services]
        JOBS[Background Jobs]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        REDIS[(Redis Cache)]
        FILES[File Storage]
    end
    
    subgraph "External Services"
        EMAIL[Email Service]
        BACKUP[Backup System]
        MONITOR[Health Monitoring]
    end
    
    UI --> LB
    PWA --> LB
    LB --> API
    API --> AUTH
    API --> VAL
    API --> RATE
    API --> AUDIT
    API --> CTRL
    CTRL --> SVC
    SVC --> DB
    SVC --> REDIS
    SVC --> FILES
    JOBS --> EMAIL
    JOBS --> BACKUP
    API --> MONITOR
```

## Features

### Core Business Functions
- **Quote Management**: Complete quote lifecycle with PDF generation and email delivery
- **Inventory Control**: Real-time stock tracking with automated alerts
- **Client Management**: Comprehensive customer relationship tracking
- **Sales Analytics**: Advanced reporting with profit margin analysis
- **User Management**: Role-based access control with audit trails

### Production Infrastructure
- **Security**: JWT authentication, RBAC, rate limiting, audit logging
- **Monitoring**: Health checks, logging, performance metrics
- **Scalability**: Redis caching, background job processing
- **Reliability**: Database transactions, error handling, graceful shutdowns
- **DevOps**: Docker containerization, CI/CD pipeline, automated backups

## Technology Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with security middleware
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis with BullMQ for job processing
- **Authentication**: JWT tokens with session management
- **Validation**: Zod schemas with comprehensive error handling

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Components**: Shadcn/UI with Radix primitives
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS with responsive design
- **Charts**: Recharts for data visualization

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Winston logging with structured JSON
- **Testing**: Vitest unit tests, Supertest integration tests
- **CI/CD**: Automated pipeline with security audits

## Quick Start

### Prerequisites
- Node.js 20 or higher
- PostgreSQL 15 or higher
- Redis 7 or higher
- Docker (optional)

### Environment Setup

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd natural-stone-crm
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Run migrations
   npm run db:push
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

### Production Deployment

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Manual Deployment**
   ```bash
   npm run build
   npm start
   ```

## Required Environment Variables

### Core Configuration
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@localhost/database
```

### Authentication
```env
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
SESSION_SECRET=your-super-secret-session-key-minimum-32-characters
JWT_EXPIRES_IN=7d
```

### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional-redis-password
```

### Email Services
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
```

### External Services (Optional)
```env
OPENAI_API_KEY=sk-your-openai-key
STRIPE_SECRET_KEY=sk_test_your-stripe-key
SENDGRID_API_KEY=SG.your-sendgrid-key
```

## API Documentation

Interactive API documentation is available at:
- Development: `http://localhost:5000/docs`
- Production: `https://yourdomain.com/docs`

OpenAPI specification: `docs/openapi.yaml`

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Database Management

### Migrations
```bash
# Apply schema changes
npm run db:push

# Generate migration files
npm run db:generate

# View database in browser
npm run db:studio
```

### Backup & Restore
```bash
# Manual backup
npm run backup

# Restore from backup
psql $DATABASE_URL < backups/database/backup-2024-01-01.sql
```

## Monitoring & Maintenance

### Health Checks
- **Application**: `GET /health`
- **Database**: `GET /ready`
- **Metrics**: Available in logs and monitoring dashboard

### Logging
- **Location**: `logs/` directory
- **Format**: Structured JSON with timestamp and context
- **Levels**: error, warn, info, debug

### Background Jobs
- **Email processing**: Automated with retry logic
- **Database backups**: Nightly at 2 AM
- **File cleanup**: Weekly maintenance
- **Analytics updates**: Hourly refresh

## Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access control (RBAC)
- Session management with secure cookies
- Password hashing with bcrypt

### Security Middleware
- Helmet.js for security headers
- CORS configuration
- Rate limiting per endpoint
- Input validation with Zod
- SQL injection prevention

### Audit Logging
- All user actions logged
- IP address and user agent tracking
- Database change tracking
- Security event monitoring

## Performance Optimization

### Caching Strategy
- Redis for session storage
- Database query result caching
- Static asset optimization
- CDN integration ready

### Database Optimization
- Proper indexing on frequently queried columns
- Connection pooling
- Query optimization
- Regular VACUUM and ANALYZE

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check database status
   npm run health
   
   # Verify connection string
   echo $DATABASE_URL
   ```

2. **Redis Connection Issues**
   ```bash
   # Test Redis connectivity
   redis-cli ping
   
   # Check Redis logs
   docker logs redis-container
   ```

3. **Email Delivery Problems**
   ```bash
   # Verify SMTP settings
   npm run test:email
   
   # Check email queue status
   curl http://localhost:5000/api/admin/queues
   ```

### Log Analysis
```bash
# View recent errors
tail -f logs/error.log

# Search for specific events
grep "authentication" logs/combined.log

# Monitor in real-time
tail -f logs/combined.log | jq '.'
```

## Development

### Project Structure
```
src/
├── config/          # Environment and service configuration
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── services/        # Business logic
├── jobs/           # Background job definitions
├── routes/         # API route definitions
├── types/          # TypeScript type definitions
└── utils/          # Utility functions

tests/
├── unit/           # Unit tests
├── integration/    # API integration tests
└── e2e/           # End-to-end tests
```

### Adding New Features

1. **Create Database Schema**
   ```typescript
   // Add to shared/schema.ts
   export const newTable = pgTable("new_table", {
     id: serial("id").primaryKey(),
     // ... other fields
   });
   ```

2. **Add Service Layer**
   ```typescript
   // src/services/newService.ts
   export class NewService {
     async create(data: CreateData) {
       // Implementation
     }
   }
   ```

3. **Create Controller**
   ```typescript
   // src/controllers/newController.ts
   export const createNew = async (req: Request, res: Response) => {
     // Handle request
   };
   ```

4. **Add Routes**
   ```typescript
   // src/routes/newRoutes.ts
   router.post('/', validateBody(schema), createNew);
   ```

5. **Write Tests**
   ```typescript
   // tests/unit/newService.test.ts
   describe('NewService', () => {
     // Test cases
   });
   ```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and contribution process.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Full API docs at `/docs`
- **Issues**: GitHub Issues for bug reports
- **Security**: security@naturalstonecrm.com for security issues
- **General**: support@naturalstonecrm.com for general support