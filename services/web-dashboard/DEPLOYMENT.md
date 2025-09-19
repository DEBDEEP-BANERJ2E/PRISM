# PRISM Web Dashboard - Vercel Deployment Guide

## 🚀 Quick Deployment

### Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally
   ```bash
   npm install -g vercel
   ```
3. **GitHub Repository**: Ensure your code is pushed to GitHub

### Method 1: Automatic Deployment (Recommended)

1. **Connect GitHub Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `services/web-dashboard` directory as the root

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `services/web-dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Environment Variables**:
   Add the following environment variables in Vercel dashboard:
   ```
   VITE_API_BASE_URL=https://api.prism-ai.com
   VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
   VITE_AUTH_DOMAIN=your_auth_domain
   VITE_AUTH_CLIENT_ID=your_auth_client_id
   ```

4. **Deploy**: Click "Deploy" and wait for the build to complete

### Method 2: Manual Deployment via CLI

1. **Login to Vercel**:
   ```bash
   cd services/web-dashboard
   vercel login
   ```

2. **Deploy to Preview**:
   ```bash
   npm run deploy:preview
   ```

3. **Deploy to Production**:
   ```bash
   npm run deploy
   ```

## ⚙️ Configuration

### Build Configuration

The project uses Vite for building. Key configuration files:

- `vite.config.ts`: Vite configuration
- `vercel.json`: Vercel deployment configuration
- `package.json`: Build scripts and dependencies

### Environment Variables

#### Required Variables:
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_MAPBOX_ACCESS_TOKEN`: Mapbox token for maps

#### Optional Variables:
- `VITE_AUTH_DOMAIN`: Authentication domain
- `VITE_AUTH_CLIENT_ID`: Auth client ID
- `VITE_SENTRY_DSN`: Error tracking
- `VITE_GOOGLE_ANALYTICS_ID`: Analytics tracking

### Custom Domain

1. **Add Domain in Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain (e.g., `dashboard.prism-ai.com`)

2. **Configure DNS**:
   - Add CNAME record pointing to `cname.vercel-dns.com`
   - Or add A record pointing to Vercel's IP

## 🔧 Advanced Configuration

### Custom Headers

Security headers are configured in `vercel.json`:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

### Caching Strategy

Static assets are cached for 1 year:
- Images, fonts, CSS, JS files
- Configured in `vercel.json` routes

### Redirects and Rewrites

All routes are rewritten to `index.html` for SPA routing:
```json
{
  "src": "/(.*)",
  "dest": "/index.html"
}
```

## 📊 Monitoring

### Performance Monitoring

Vercel provides built-in analytics:
- Core Web Vitals
- Page load times
- Error tracking

### Custom Monitoring

Integrate with external services:
- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior analytics
- **LogRocket**: Session replay and debugging

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   ```bash
   # Check build locally
   npm run build
   
   # Check TypeScript errors
   npm run type-check
   ```

2. **Environment Variables Not Working**:
   - Ensure variables start with `VITE_`
   - Check Vercel dashboard environment variables
   - Redeploy after adding variables

3. **Routing Issues**:
   - Verify `vercel.json` rewrite rules
   - Check React Router configuration

4. **API Connection Issues**:
   - Verify `VITE_API_BASE_URL` is correct
   - Check CORS configuration on backend
   - Ensure API is accessible from Vercel

### Debug Mode

Enable debug mode for troubleshooting:
```bash
# Set in environment variables
VITE_DEBUG_MODE=true
```

## 🔄 CI/CD Integration

### GitHub Actions

Automatic deployment on push to main:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
    paths: ['services/web-dashboard/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: services/web-dashboard
```

### Environment-Specific Deployments

- **Production**: `main` branch → Production deployment
- **Staging**: `develop` branch → Preview deployment
- **Feature**: Feature branches → Preview deployments

## 📈 Performance Optimization

### Bundle Optimization

1. **Code Splitting**:
   ```typescript
   // Lazy load components
   const LazyComponent = lazy(() => import('./Component'));
   ```

2. **Tree Shaking**:
   - Import only needed modules
   - Use ES6 imports

3. **Asset Optimization**:
   - Compress images
   - Use WebP format
   - Optimize fonts

### Caching Strategy

1. **Static Assets**: 1 year cache
2. **HTML**: No cache (always fresh)
3. **API Responses**: Custom cache headers

## 🔒 Security

### Content Security Policy

Configured in `vercel.json`:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline'..."
}
```

### HTTPS

- Automatic HTTPS for all deployments
- HTTP to HTTPS redirects
- HSTS headers

## 📞 Support

### Vercel Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)

### PRISM Support

- **Email**: support@prism-ai.com
- **GitHub Issues**: [Report Issues](https://github.com/your-username/prism/issues)
- **Discord**: [Join Community](https://discord.gg/prism)

---

## 🎯 Deployment Checklist

- [ ] Environment variables configured
- [ ] Custom domain added (if needed)
- [ ] SSL certificate verified
- [ ] Performance metrics baseline established
- [ ] Error tracking configured
- [ ] Analytics setup completed
- [ ] Backup and rollback plan documented
- [ ] Team access permissions configured

**Your PRISM Web Dashboard is now ready for production on Vercel! 🚀**