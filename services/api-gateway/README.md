# PRISM API Gateway

The PRISM API Gateway provides secure, centralized access to all PRISM services and external system integrations. It handles authentication, authorization, rate limiting, and request routing for the entire PRISM ecosystem.

## Features

### Core Functionality
- **JWT-based Authentication**: Secure token-based authentication with Redis session management
- **Role-based Access Control**: Granular permissions for different user roles (admin, engineer, operator, viewer)
- **Rate Limiting**: Configurable rate limiting to prevent abuse (default: 1000 requests per 15 minutes)
- **Request Validation**: Comprehensive input validation using express-validator
- **Health Monitoring**: Built-in health checks for all integrated services
- **OpenAPI Documentation**: Complete API documentation with interactive Swagger UI

### External System Integrations

#### Fleet Management Integration
- **Rockfall Alerts**: Send real-time rockfall risk alerts to fleet management systems
- **Truck Rerouting**: Request automatic rerouting of haul trucks around high-risk areas
- **Operations Control**: Stop operations in critical zones when necessary
- **Fleet Monitoring**: Retrieve active truck locations and status

#### Blast Planning Integration
- **Slope Stability Assessment**: Submit AI-generated slope stability assessments for planned blasts
- **Blast Optimization**: Request optimization of blast designs based on slope stability constraints
- **Schedule Management**: Retrieve upcoming blasts and request postponements when needed
- **Vibration Prediction**: Submit vibration predictions to blast planning systems

#### Water Management Integration
- **Groundwater Monitoring**: Submit real-time groundwater data from hexapod sensors
- **Drainage Recommendations**: Provide AI-generated drainage recommendations
- **Pumping Control**: Send control commands to pumping stations
- **Emergency Response**: Request emergency drainage for critical situations

## Quick Start

### Prerequisites
- Node.js 18+
- Redis server
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Build the application
npm run build

# Start in development mode
npm run dev

# Start in production mode
npm start
```

### Environment Variables

```bash
# Server Configuration
PORT=8080
NODE_ENV=production

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_URL=redis://localhost:6379

# CORS Configuration
CORS_ORIGINS=https://app.prism.mining,https://dashboard.prism.mining

# Internal Services
DATA_INGESTION_URL=http://data-ingestion:3001
DIGITAL_TWIN_URL=http://digital-twin:3002
AI_PIPELINE_URL=http://ai-pipeline:3003
ALERT_MANAGEMENT_URL=http://alert-management:3004
USER_MANAGEMENT_URL=http://user-management:3005

# External System Integration
FLEET_MANAGEMENT_URL=http://fleet-management:8080
FLEET_MANAGEMENT_API_KEY=your-fleet-api-key

BLAST_PLANNING_URL=http://blast-planning:8080
BLAST_PLANNING_API_KEY=your-blast-api-key

WATER_MANAGEMENT_URL=http://water-management:8080
WATER_MANAGEMENT_API_KEY=your-water-api-key

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

## API Documentation

### Interactive Documentation
Visit `/docs/swagger` for the interactive Swagger UI documentation.

### OpenAPI Specification
- JSON format: `/docs/openapi.json`
- YAML format: `/docs/openapi.yaml`

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```bash
# Login to get token
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your-username", "password": "your-password"}'

# Use token in subsequent requests
curl -X GET http://localhost:8080/api/integrations/fleet/trucks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example API Calls

#### Send Fleet Alert
```bash
curl -X POST http://localhost:8080/api/integrations/fleet/alert \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "alertId": "alert-123",
    "riskLevel": 0.75,
    "affectedArea": {
      "coordinates": [[100.0, 0.0], [101.0, 0.0], [101.0, 1.0], [100.0, 1.0], [100.0, 0.0]],
      "description": "Bench 5 North Wall"
    },
    "recommendedActions": ["evacuate_personnel", "stop_hauling"],
    "timestamp": "2024-01-15T10:30:00Z"
  }'
```

#### Submit Groundwater Data
```bash
curl -X POST http://localhost:8080/api/integrations/water/groundwater \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "sensorId": "gw-sensor-001",
      "location": {
        "latitude": -23.5,
        "longitude": 46.6,
        "elevation": 1200,
        "depth": 15.5
      },
      "measurements": {
        "waterLevel": 12.3,
        "pressure": 150.2,
        "temperature": 18.5
      },
      "timestamp": "2024-01-15T10:30:00Z"
    }]
  }'
```

## Architecture

### Service Proxy Configuration
The API Gateway acts as a reverse proxy for internal PRISM services:

```typescript
const serviceProxies = {
  '/api/data-ingestion': 'http://data-ingestion:3001',
  '/api/digital-twin': 'http://digital-twin:3002',
  '/api/ai-pipeline': 'http://ai-pipeline:3003',
  '/api/alert-management': 'http://alert-management:3004',
  '/api/user-management': 'http://user-management:3005'
};
```

### Security Features
- **Helmet.js**: Security headers and protection against common vulnerabilities
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: IP-based rate limiting with Redis backend
- **JWT Validation**: Secure token validation with blacklist support
- **Input Validation**: Comprehensive request validation and sanitization

### Error Handling
- Centralized error handling middleware
- Structured error responses
- Request/response logging
- Service health monitoring

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

### Docker Support
```bash
# Build Docker image
docker build -t prism-api-gateway .

# Run with Docker Compose
docker-compose up api-gateway
```

## Monitoring and Health Checks

### Health Endpoints
- `/health` - API Gateway health status
- `/api/integrations/health` - External systems health overview
- `/api/integrations/health/fleet` - Fleet management system health
- `/api/integrations/health/blast` - Blast planning system health
- `/api/integrations/health/water` - Water management system health

### Metrics and Logging
- Structured JSON logging with Winston
- Request/response logging middleware
- Performance metrics collection
- Error tracking and alerting

## Security Considerations

### Authentication Flow
1. User submits credentials to `/auth/login`
2. System validates credentials with user management service
3. JWT token generated and returned to client
4. Client includes token in Authorization header for subsequent requests
5. Gateway validates token and forwards user context to services

### Session Management
- Redis-based session storage
- Token blacklisting for logout
- Configurable token expiration
- Session activity tracking

### API Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection via Helmet.js
- Rate limiting to prevent abuse
- HTTPS enforcement in production

## Troubleshooting

### Common Issues

#### Authentication Errors
```bash
# Check if user management service is running
curl http://user-management:3005/health

# Verify JWT secret configuration
echo $JWT_SECRET

# Check Redis connectivity
redis-cli ping
```

#### Integration Failures
```bash
# Check external system connectivity
curl http://fleet-management:8080/health
curl http://blast-planning:8080/health
curl http://water-management:8080/health

# Verify API keys
echo $FLEET_MANAGEMENT_API_KEY
```

#### Performance Issues
```bash
# Check Redis performance
redis-cli --latency

# Monitor request rates
curl http://localhost:8080/health

# Check service proxy health
curl http://localhost:8080/api/integrations/health
```

### Debugging
Enable debug logging by setting `LOG_LEVEL=debug` in your environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Include unit tests for new features

## License

Proprietary - PRISM Mining Safety Systems

## Support

For technical support, contact:
- Email: api-support@prism.mining
- Documentation: https://docs.prism.mining
- Issues: https://github.com/prism/api-gateway/issues