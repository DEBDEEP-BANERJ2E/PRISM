# PRISM Documentation

## Table of Contents

1. [Architecture Overview](./architecture.md)
2. [Getting Started](./getting-started.md)
3. [API Documentation](./api.md)
4. [Database Schema](./database.md)
5. [Deployment Guide](./deployment.md)
6. [Development Guide](./development.md)
7. [Monitoring & Observability](./monitoring.md)
8. [Security](./security.md)
9. [Troubleshooting](./troubleshooting.md)

## Quick Links

- [API Gateway Documentation](./services/api-gateway.md)
- [Data Ingestion Service](./services/data-ingestion.md)
- [Digital Twin Service](./services/digital-twin.md)
- [AI/ML Pipeline Service](./services/ai-pipeline.md)
- [Alert Management Service](./services/alert-management.md)
- [User Management Service](./services/user-management.md)

## System Requirements

### Development Environment
- Node.js 18+
- Docker & Docker Compose
- TypeScript 5+
- PostgreSQL 15+ (with TimescaleDB and PostGIS)
- Neo4j 5+
- Apache Kafka
- Redis

### Production Environment
- Kubernetes 1.25+
- Helm 3+
- Prometheus & Grafana
- SSL/TLS certificates
- Load balancer (NGINX Ingress Controller)

## Architecture Overview

PRISM follows a microservices architecture with the following components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Dashboard │    │   Mobile App    │    │  External APIs  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴───────────┐
                    │     API Gateway         │
                    │  (Auth, Rate Limiting)  │
                    └─────────────┬───────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────┴────────┐    ┌──────────┴──────────┐    ┌─────────┴────────┐
│ Data Ingestion │    │   Digital Twin      │    │   AI/ML Pipeline │
│    Service     │    │     Service         │    │     Service      │
└────────────────┘    └─────────────────────┘    └──────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────┴───────────┐
                    │  Alert Management       │
                    │      Service            │
                    └─────────────────────────┘
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prism-rockfall-prediction
   ```

2. **Install dependencies**
   ```bash
   make install
   ```

3. **Start development environment**
   ```bash
   make dev
   ```

4. **Access the services**
   - API Gateway: http://localhost:8080
   - Data Ingestion: http://localhost:3001
   - Digital Twin: http://localhost:3002
   - AI Pipeline: http://localhost:3003
   - Alert Management: http://localhost:3004
   - User Management: http://localhost:3005

For detailed setup instructions, see [Getting Started Guide](./getting-started.md).