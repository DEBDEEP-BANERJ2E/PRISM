# PRISM - Predictive Rockfall Intelligence & Safety Management

AI-based rockfall prediction and alert system for open-pit mines that integrates multi-source data fusion, digital twin technology, and advanced machine learning.

## Architecture

PRISM follows a microservices architecture with the following core services:

- **Data Ingestion Service**: Multi-protocol data streams (MQTT, HTTP, LoRaWAN)
- **Digital Twin Service**: Real-time virtual representation of mine environment
- **AI/ML Pipeline Service**: Model training, inference, and deployment
- **Alert Management Service**: Risk assessment and notification processing
- **User Management Service**: Authentication, authorization, and multi-tenancy

## Quick Start

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check service health
curl http://localhost:8080/health
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Start development environment
npm run dev
```

## Services

- Data Ingestion: http://localhost:3001
- Digital Twin: http://localhost:3002
- AI/ML Pipeline: http://localhost:3003
- Alert Management: http://localhost:3004
- User Management: http://localhost:3005
- API Gateway: http://localhost:8080

## Documentation

See `/docs` directory for detailed documentation.