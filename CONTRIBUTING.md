# Contributing to Natural Stone Distribution CRM

Thank you for your interest in contributing to this project! This guide will help you get started with development and ensure consistency across contributions.

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Git

### Getting Started
1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Install dependencies: `npm install`
4. Copy environment file: `cp .env.example .env`
5. Configure your environment variables
6. Run database migrations: `npm run db:push`
7. Start development server: `npm run dev`

## Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Define proper interfaces and types
- Use Zod schemas for validation
- Follow naming conventions: PascalCase for types, camelCase for variables

### Database Guidelines
- Use Drizzle ORM for all database operations
- Wrap multi-step operations in transactions
- Add proper indexes for frequently queried columns
- Use meaningful table and column names

### API Design
- Follow RESTful conventions
- Use proper HTTP status codes
- Implement consistent error responses
- Add comprehensive input validation
- Include audit logging for sensitive operations

### Security Requirements
- Never commit secrets or credentials
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Add rate limiting to all endpoints
- Log security-relevant events

## Testing

### Test Structure
```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # API endpoint tests
└── e2e/           # End-to-end user workflow tests
```

### Writing Tests
- Aim for 80%+ code coverage
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies
- Clean up test data after each test

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/issue-description` - Bug fixes
- `refactor/component-name` - Code refactoring
- `docs/section-name` - Documentation updates

### Commit Messages
Follow conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(auth): add JWT token refresh functionality`
- `fix(quotes): resolve PDF generation memory leak`
- `docs(api): update authentication endpoints`

### Pull Request Process
1. Create feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass: `npm test`
4. Run linting: `npm run lint`
5. Update documentation if needed
6. Submit pull request with clear description
7. Address review feedback
8. Merge after approval

## Project Structure

### Backend Architecture
```
src/
├── config/          # Environment and service configuration
├── controllers/     # Request handlers (thin layer)
├── services/        # Business logic (core functionality)
├── middleware/      # Express middleware
├── jobs/           # Background job definitions
├── routes/         # API route definitions
├── types/          # TypeScript definitions
└── utils/          # Utility functions
```

### Adding New Features

#### 1. Database Schema
Add tables to `shared/schema.ts`:
```typescript
export const newTable = pgTable("new_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### 2. Service Layer
Create business logic in `src/services/`:
```typescript
export class NewService {
  async create(data: CreateNewData): Promise<NewEntity> {
    return await db.transaction(async (tx) => {
      // Business logic here
    });
  }
}
```

#### 3. Controller Layer
Add request handlers in `src/controllers/`:
```typescript
export const createNew = async (req: Request, res: Response) => {
  try {
    const service = new NewService();
    const result = await service.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
```

#### 4. Routes
Define endpoints in `src/routes/`:
```typescript
const router = Router();
router.post('/', requireAuth, validateBody(schema), createNew);
export default router;
```

#### 5. Tests
Add comprehensive tests:
```typescript
describe('NewService', () => {
  it('should create new entity successfully', async () => {
    // Test implementation
  });
});
```

## Code Quality

### ESLint Rules
- No unused variables
- Consistent formatting
- Proper TypeScript usage
- Security best practices

### Performance Guidelines
- Use database indexes appropriately
- Implement caching where beneficial
- Optimize N+1 queries
- Use connection pooling
- Monitor memory usage

### Error Handling
- Use structured error responses
- Log errors with context
- Implement graceful degradation
- Provide meaningful error messages

## Documentation

### API Documentation
- Update OpenAPI specification in `docs/openapi.yaml`
- Include request/response examples
- Document error responses
- Add authentication requirements

### Code Documentation
- Use JSDoc for public functions
- Document complex business logic
- Include usage examples
- Explain non-obvious code

### README Updates
- Keep installation instructions current
- Update feature lists
- Add troubleshooting sections
- Include performance notes

## Deployment

### Environment Preparation
- Test in staging environment
- Verify all environment variables
- Run database migrations
- Check external service connections

### Monitoring
- Add health checks for new services
- Include metrics for new features
- Set up alerts for critical failures
- Monitor performance impact

## Common Issues

### Database Connections
- Use connection pooling
- Handle connection errors gracefully
- Implement retry logic
- Monitor connection counts

### Memory Management
- Clean up event listeners
- Close database connections
- Handle large file uploads
- Monitor memory usage

### Security
- Validate all inputs
- Use prepared statements
- Implement rate limiting
- Log security events

## Getting Help

- **Technical Questions**: Create GitHub issue with `question` label
- **Bug Reports**: Use bug report template
- **Feature Requests**: Use feature request template
- **Security Issues**: Email security@naturalstonecrm.com

## Release Process

1. **Version Bump**: Update version in package.json
2. **Changelog**: Update CHANGELOG.md with changes
3. **Testing**: Run full test suite
4. **Documentation**: Update relevant docs
5. **Tag Release**: Create git tag with version
6. **Deploy**: Follow deployment checklist
7. **Monitor**: Watch for issues post-deployment

Thank you for contributing to making this project better!