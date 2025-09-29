# PRISM Services Deployment Guide - Render

This guide provides step-by-step instructions for deploying all PRISM services to Render.

## Services Overview

1. **notification-service** (Python/Flask) - Email notifications and alerts
2. **python-ml-backend** (Python/FastAPI) - Machine learning model training and prediction
3. **supabase-backend** (Node.js/TypeScript) - Data persistence and Supabase integration
4. **web-dashboard** (React/TypeScript + Express) - Main web application

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket
3. **Environment Variables**: Configure all required environment variables

## Deployment Steps

### 1. Deploy Backend Services

#### Notification Service
```bash
# Connect your repository to Render
# Select: Web Service
# Runtime: Python 3
# Build Command: pip install -r requirements.txt
# Start Command: gunicorn --bind 0.0.0.0:$PORT app:app
```

**Environment Variables:**
- `SENDER_EMAIL`: Your Gmail address
- `SENDER_PASSWORD`: Your Gmail app password

#### Python ML Backend
```bash
# Connect your repository to Render
# Select: Web Service
# Runtime: Python 3
# Build Command: pip install -r requirements.txt
# Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

#### Supabase Backend
```bash
# Connect your repository to Render
# Select: Web Service
# Runtime: Node.js
# Build Command: npm install && npm run build
# Start Command: npm start
```

**Environment Variables:**
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 2. Deploy Web Dashboard

#### Web Dashboard
```bash
# Connect your repository to Render
# Select: Web Service
# Runtime: Node.js
# Build Command: npm install && npm run build && npm run build:server
# Start Command: npm start
```

**Environment Variables:**
- `VITE_API_BASE_URL`: Your web dashboard URL
- `VITE_NOTIFICATION_SERVICE_URL`: Notification service URL
- `VITE_ML_BACKEND_URL`: ML backend URL
- `VITE_SUPABASE_BACKEND_URL`: Supabase backend URL
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

### 3. Configure CORS (Important!)

Update CORS origins in all services to include your Render domains:

**Notification Service** (`app.py`):
```python
CORS(app, origins=[
    "https://your-web-dashboard.onrender.com",
    "https://your-custom-domain.com"
])
```

**Supabase Backend** (`src/index.ts`):
```typescript
const allowedOrigins = [
    "https://your-web-dashboard.onrender.com",
    "https://your-custom-domain.com"
];
```

**Web Dashboard Server** (`server/index.ts`):
```typescript
const allowedOrigins = [
    "https://your-web-dashboard.onrender.com",
    "https://your-custom-domain.com"
];
```

### 4. Update API Base URLs

Update the API client configurations in your web dashboard to point to the deployed services:

**Web Dashboard** (`src/api/config.ts`):
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = import.meta.env.VITE_NOTIFICATION_SERVICE_URL;
const ML_BACKEND_URL = import.meta.env.VITE_ML_BACKEND_URL;
const SUPABASE_BACKEND_URL = import.meta.env.VITE_SUPABASE_BACKEND_URL;
```

## Environment Configuration Files

Each service includes production environment files:
- `services/notification-service/.env.production`
- `services/supabase-backend/.env.production`
- `services/web-dashboard/.env.production`

Copy these to `.env` and update with your actual values before deployment.

## Deployment Order

1. Deploy backend services first (notification-service, python-ml-backend, supabase-backend)
2. Deploy web-dashboard last
3. Update CORS origins after all services are deployed
4. Test all endpoints

## Health Check Endpoints

- Notification Service: `https://your-service.onrender.com/health`
- Python ML Backend: `https://your-service.onrender.com/health`
- Supabase Backend: `https://your-service.onrender.com/health`
- Web Dashboard: `https://your-service.onrender.com/health`

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure all CORS origins are properly configured
2. **Environment Variables**: Verify all required env vars are set in Render dashboard
3. **Build Failures**: Check build logs in Render dashboard
4. **Runtime Errors**: Check application logs in Render dashboard

### Debug Steps:

1. Check Render service logs
2. Verify environment variables are set correctly
3. Test health check endpoints
4. Verify CORS configuration
5. Check network connectivity between services

## Custom Domains (Optional)

1. Purchase a custom domain
2. Add it to Render service settings
3. Update DNS records as instructed by Render
4. Update CORS origins to include custom domain
5. Update environment variables with custom domain URLs

## Monitoring

- Monitor service status in Render dashboard
- Set up uptime monitoring (e.g., Pingdom, UptimeRobot)
- Configure log aggregation if needed
- Set up error tracking (e.g., Sentry)

## Security Checklist

- [ ] Use strong, unique passwords for all services
- [ ] Enable 2FA on Render account
- [ ] Use environment variables for sensitive data
- [ ] Configure CORS properly
- [ ] Use HTTPS in production
- [ ] Regularly update dependencies
- [ ] Monitor for vulnerabilities

## Support

For issues with Render deployment, check:
- Render documentation: https://render.com/docs
- Render status page: https://status.render.com
- Render community: https://community.render.com