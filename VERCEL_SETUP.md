# 🚀 PRISM Vercel Deployment Setup Guide

## Step-by-Step Deployment Instructions

### 1. 📋 Prerequisites

- ✅ Vercel account ([sign up here](https://vercel.com))
- ✅ GitHub repository with PRISM code
- ✅ Node.js 18+ installed locally

### 2. 🔧 Vercel CLI Setup

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to your Vercel account
vercel login
```

### 3. 🌐 Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Click "New Project"**
3. **Import from GitHub**: Select your PRISM repository
4. **Configure Project**:
   - **Project Name**: `prism-web-dashboard`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `services/web-dashboard`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 4. ⚙️ Environment Variables

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

#### Required Variables:
```env
VITE_APP_NAME=PRISM
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
VITE_API_BASE_URL=https://api.prism-ai.com
```

#### Optional Variables:
```env
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
VITE_AUTH_DOMAIN=your_auth_domain
VITE_AUTH_CLIENT_ID=your_auth_client_id
VITE_SENTRY_DSN=your_sentry_dsn
VITE_GOOGLE_ANALYTICS_ID=your_ga_id
```

### 5. 🚀 Manual Deployment (Alternative)

```bash
# Navigate to web dashboard directory
cd services/web-dashboard

# Deploy to preview
npm run deploy:preview

# Deploy to production
npm run deploy
```

### 6. 🔄 Automatic Deployment Setup

The GitHub Action is already configured! Just add these secrets to your GitHub repository:

**GitHub Repository → Settings → Secrets and Variables → Actions**:

```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

**To get these values**:
1. **Vercel Token**: https://vercel.com/account/tokens
2. **Org ID & Project ID**: Run `vercel link` in your project directory

### 7. 🌍 Custom Domain (Optional)

1. **In Vercel Dashboard**: Project → Settings → Domains
2. **Add Domain**: `dashboard.prism-ai.com`
3. **Configure DNS**: Add CNAME record pointing to `cname.vercel-dns.com`

### 8. ✅ Verification Checklist

After deployment, verify:

- [ ] ✅ Site loads at Vercel URL
- [ ] ✅ Landing page displays correctly
- [ ] ✅ Navigation works
- [ ] ✅ 3D visualizations render
- [ ] ✅ Mobile responsive design
- [ ] ✅ No console errors
- [ ] ✅ Performance score > 80 (Lighthouse)

### 9. 📊 Monitoring Setup

#### Vercel Analytics
- Automatically enabled for performance monitoring
- View in Vercel Dashboard → Analytics

#### External Monitoring (Optional)
- **Sentry**: Error tracking
- **Google Analytics**: User analytics
- **LogRocket**: Session replay

### 10. 🔧 Troubleshooting

#### Common Issues:

**Build Fails**:
```bash
# Test build locally
cd services/web-dashboard
npm run build
```

**Environment Variables Not Working**:
- Ensure variables start with `VITE_`
- Check Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding variables

**Routing Issues**:
- Verify `vercel.json` configuration
- Check React Router setup

**API Connection Issues**:
- Verify `VITE_API_BASE_URL`
- Check CORS settings on backend
- Test API endpoints manually

### 11. 🚀 Go Live!

Once everything is configured:

1. **Push to main branch** → Automatic deployment
2. **Check deployment status** in Vercel Dashboard
3. **Test the live site** thoroughly
4. **Share the URL** with your team! 🎉

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **PRISM Support**: support@prism-ai.com
- **GitHub Issues**: https://github.com/your-username/prism/issues

**Your PRISM Web Dashboard will be live at**: `https://prism-web-dashboard.vercel.app` 🚀