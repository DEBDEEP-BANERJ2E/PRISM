# PRISM Data Science Backend

A Node.js Express backend service that provides APIs for the PRISM data science workflow, including data processing, model training, analytics, reporting, and scenario planning.

## Features

- **Data Management**: Upload, validate, and preprocess datasets
- **Model Training**: Configure and train ML models with various algorithms
- **Analytics**: Generate insights and visualizations from trained models
- **Reporting**: Create and export comprehensive analysis reports
- **Scenario Planning**: Execute what-if scenarios for risk assessment
- **Job Management**: Track long-running operations with real-time status

## Architecture

The backend integrates with the AI Pipeline service to perform actual ML operations while providing a clean REST API for the frontend dashboard.

```
Frontend (React) → Data Science Backend → AI Pipeline Service
                                      ↓
                                   Database
```

## API Endpoints

### Data Management
- `POST /api/data-science/data/upload` - Upload CSV files
- `POST /api/data-science/data/manual` - Submit manual table data
- `POST /api/data-science/data/:dataId/preprocess` - Start preprocessing
- `GET /api/data-science/data/preprocess/:jobId/status` - Check preprocessing status
- `GET /api/data-science/data/:dataId` - Get dataset details
- `GET /api/data-science/data` - List datasets

### Model Training
- `POST /api/data-science/models/train` - Start model training
- `GET /api/data-science/models/train/:jobId/progress` - Get training progress
- `GET /api/data-science/models/train/:jobId/results` - Get training results
- `GET /api/data-science/models/:modelId` - Get model details
- `GET /api/data-science/models` - List models
- `DELETE /api/data-science/models/:modelId` - Delete model
- `POST /api/data-science/models/:modelId/predict` - Make predictions

### Scenario Planning
- `POST /api/data-science/scenarios` - Create scenario
- `POST /api/data-science/scenarios/:scenarioId/execute` - Execute scenario
- `GET /api/data-science/scenarios/:scenarioId/results` - Get scenario results
- `GET /api/data-science/scenarios/:scenarioId` - Get scenario details
- `GET /api/data-science/scenarios` - List scenarios
- `PUT /api/data-science/scenarios/:scenarioId` - Update scenario
- `DELETE /api/data-science/scenarios/:scenarioId` - Delete scenario

### Reports
- `POST /api/data-science/reports/generate` - Generate report
- `GET /api/data-science/reports/:reportId/status` - Check generation status
- `GET /api/data-science/reports/:reportId/download` - Download report
- `GET /api/data-science/reports/:reportId` - Get report details
- `GET /api/data-science/reports` - List reports
- `DELETE /api/data-science/reports/:reportId` - Delete report

### Job Management
- `GET /api/data-science/jobs/:jobId/status` - Get job status
- `GET /api/data-science/jobs` - List jobs
- `POST /api/data-science/jobs/:jobId/cancel` - Cancel job

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`

4. Build the project:
```bash
npm run build
```

## Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3001` by default.

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `AI_PIPELINE_URL` | AI Pipeline service URL | `http://localhost:3002` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | - |
| `JWT_SECRET` | JWT signing secret | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | - |
| `LOG_LEVEL` | Logging level | `info` |
| `MAX_FILE_SIZE` | Max upload file size | `52428800` (50MB) |

## Project Structure

```
src/
├── api/
│   └── routes/          # API route handlers
├── errors/              # Custom error classes
├── middleware/          # Express middleware
├── services/            # Business logic services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── validation/          # Data validation utilities
└── __tests__/           # Test files
```

## Error Handling

The API uses structured error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  },
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

## Security Features

- Helmet.js for security headers
- CORS configuration
- Input sanitization
- File upload validation
- Request size limits
- Error message sanitization in production

## Logging

The service uses Winston for structured logging with different levels:
- `error`: Error conditions
- `warn`: Warning conditions  
- `info`: Informational messages
- `debug`: Debug-level messages

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all levels)

## Integration with AI Pipeline

The backend communicates with the AI Pipeline service for:
- Data preprocessing
- Model training
- Predictions
- Scenario execution

All ML operations are asynchronous with job tracking for long-running tasks.

## Database Schema

The service uses PostgreSQL with the following main tables:
- `datasets` - Raw and processed datasets
- `trained_models` - Model metadata and artifacts
- `scenarios` - Scenario configurations and results
- `reports` - Generated reports
- `job_queue` - Async job tracking

## Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Use conventional commit messages
5. Ensure all tests pass before submitting PRs