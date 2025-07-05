# 🚀 Render Deployment Guide - ISRO AQI Backend

## 🎯 Overview
Deploy your fully functional AQI backend to Render with Docker support. Your backend is ready with real API data integration.

---

## 📋 **Pre-Deployment Checklist**

### ✅ **Verified Working Locally**
- ✅ Real API integration with OpenWeatherMap
- ✅ Database connection with PostgreSQL
- ✅ All endpoints tested and functional
- ✅ Environment variables configured

### ✅ **Required for Render**
- ✅ Dockerfile (already created)
- ✅ docker-compose.yml (for local development)
- ✅ package.json with start script
- ✅ Environment variables list
- ✅ PostgreSQL database setup

---

## 🐳 **Dockerfile (Already Created)**

Your existing Dockerfile is production-ready:

```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
```

---

## 🚀 **Step-by-Step Render Deployment**

### **Step 1: Create Render Account**
1. Go to: https://render.com
2. Sign up with GitHub account
3. Connect your GitHub repository

### **Step 2: Create PostgreSQL Database**
1. In Render Dashboard → **"New"** → **"PostgreSQL"**
2. **Database Name**: `aqi-database`
3. **User**: `aqi_user` 
4. **Region**: Choose closest to your users (e.g., `oregon` for global)
5. **Plan**: Free tier (sufficient for development)
6. Click **"Create Database"**
7. **IMPORTANT**: Copy the **Internal Database URL** (starts with `postgresql://`)

### **Step 3: Create Web Service**
1. In Render Dashboard → **"New"** → **"Web Service"**
2. **Connect Repository**: Select your `aqi-backend` repo
3. **Service Configuration**:
   - **Name**: `aqi-backend`
   - **Region**: Same as your database
   - **Branch**: `main` or `master`
   - **Runtime**: `Docker`
   - **Build Command**: (Leave empty - Docker handles this)
   - **Start Command**: (Leave empty - Docker handles this)

### **Step 4: Configure Environment Variables**
In the **Environment Variables** section, add:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=your_internal_postgresql_url_from_step_2
OPENWEATHER_API_KEY=54e72fa67053fd111f04bb90d633cca6
IQAIR_API_KEY=7983aa7d-e986-481a-ac20-790546737b75
USE_REAL_DATA=true
ENABLE_CRON_JOBS=false
LOG_LEVEL=info
```

**🔴 IMPORTANT**: 
- Replace `your_internal_postgresql_url_from_step_2` with actual URL from Step 2
- Your API keys are already included above
- Set `ENABLE_CRON_JOBS=false` for Render free tier

### **Step 5: Deploy**
1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Build the Docker image  
   - Run database migrations
   - Start your application
3. **Build time**: ~5-10 minutes
4. **Your app URL**: `https://aqi-backend-xxxx.onrender.com`

---

## 🔧 **Database Migration on Render**

Render will automatically run your migrations during deployment. If needed manually:

### **Option 1: Add to package.json (Recommended)**
```json
{
  "scripts": {
    "start": "npx prisma migrate deploy && npx prisma generate && node server.js",
    "build": "npx prisma generate"
  }
}
```

### **Option 2: Manual Migration via Render Shell**
1. Go to your service → **"Shell"**
2. Run:
```bash
npx prisma migrate deploy
npx prisma generate
```

---

## 🌐 **Custom Domain (Optional)**

### **Add Custom Domain**
1. In your service → **"Settings"** → **"Custom Domains"**
2. Add: `api.your-domain.com`
3. Configure DNS:
   - **Type**: CNAME
   - **Name**: api  
   - **Value**: `aqi-backend-xxxx.onrender.com`

---

## 📊 **Monitoring & Logs**

### **Real-time Logs**
1. Service Dashboard → **"Logs"**
2. Filter by:
   - **Build logs**: Deployment issues
   - **Application logs**: Runtime errors
   - **Request logs**: API usage

### **Health Monitoring**
```bash
# Test deployed API
curl https://aqi-backend-xxxx.onrender.com/

# Test real AQI data
curl "https://aqi-backend-xxxx.onrender.com/api/aqi?lat=28.6139&lng=77.2090"
```

---

## 💰 **Render Pricing & Limits**

### **Free Tier Limits**
- **Web Service**: 750 hours/month (always-on with paid plan)
- **PostgreSQL**: 1GB storage, 97 connections
- **Sleep Mode**: Service sleeps after 15 minutes of inactivity
- **Cold Start**: ~30 seconds to wake up

### **Paid Plans** (Recommended for Production)
- **Starter ($7/month)**: Always-on, no sleep mode
- **Standard ($25/month)**: More resources, better performance

---

## 🔒 **Security Configuration**

### **Environment Variables Security**
✅ All sensitive data in environment variables
✅ No API keys in code
✅ Database URL encrypted by Render

### **CORS Configuration for Production**
Update your `server.js` for production:

```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com', 'https://your-app.netlify.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## 🧪 **Post-Deployment Testing**

### **Automated Test Script**
```bash
#!/bin/bash
BACKEND_URL="https://aqi-backend-xxxx.onrender.com"

echo "🧪 Testing deployed backend..."

# Health check
echo "Testing health endpoint..."
curl -f "$BACKEND_URL/" || echo "❌ Health check failed"

# Real AQI data
echo "Testing real AQI data..."
AQI_RESPONSE=$(curl -s "$BACKEND_URL/api/aqi?lat=28.6139&lng=77.2090")
if echo "$AQI_RESPONSE" | grep -q "OpenWeatherMap"; then
  echo "✅ Real AQI data working"
else
  echo "❌ Real AQI data failed"
fi

# Forecast
echo "Testing forecast..."
FORECAST_RESPONSE=$(curl -s "$BACKEND_URL/api/forecast?lat=19.0760&lng=72.8777&hours=24")
if echo "$FORECAST_RESPONSE" | grep -q "forecast"; then
  echo "✅ Forecast working"
else
  echo "❌ Forecast failed"
fi

echo "🎉 Testing complete!"
```

### **Manual Testing**
1. **Health Check**: `https://your-app.onrender.com/`
2. **Real AQI**: `https://your-app.onrender.com/api/aqi?lat=28.6139&lng=77.2090`
3. **Forecast**: `https://your-app.onrender.com/api/forecast?lat=19.0760&lng=72.8777&hours=24`

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Build Fails**
```
Error: Cannot find module 'prisma'
```
**Solution**: Add to package.json:
```json
{
  "scripts": {
    "build": "npx prisma generate"
  }
}
```

#### **2. Database Connection Error**
```
Error: P1001: Can't reach database server
```
**Solution**: 
- Verify `DATABASE_URL` in environment variables
- Use **Internal Database URL** from Render PostgreSQL dashboard
- Ensure database and web service are in same region

#### **3. API Keys Not Working**
```
AQI Service initialized with real data: false
```
**Solution**:
- Check environment variables spelling
- Verify `USE_REAL_DATA=true`
- Test API keys manually:
```bash
curl "http://api.openweathermap.org/data/2.5/air_pollution?lat=28.6139&lon=77.2090&appid=YOUR_KEY"
```

#### **4. Service Won't Start**
```
Error: listen EADDRINUSE: address already in use
```
**Solution**: Ensure `PORT` environment variable is set to `5000`

#### **5. Cold Start Issues**
**Problem**: Service sleeps on free tier
**Solution**: 
- Upgrade to paid plan, OR
- Implement ping service to keep warm, OR
- Add loading states in frontend

---

## 🔄 **Deployment Automation**

### **Auto-Deploy on Git Push**
Render automatically redeploys when you push to main branch:

1. Make changes locally
2. Test with `npm start`
3. Commit and push:
```bash
git add .
git commit -m "Update API endpoints"
git push origin main
```
4. Render automatically builds and deploys
5. Check logs for deployment status

### **Environment-Specific Branches**
- **main/master**: Production deployment
- **develop**: Staging deployment (create separate Render service)

---

## 📈 **Performance Optimization**

### **Database Optimization**
```sql
-- Add indexes for better performance
CREATE INDEX idx_aqi_logs_timestamp ON aqi_logs(timestamp);
CREATE INDEX idx_aqi_logs_location_time ON aqi_logs(location_id, timestamp);
```

### **API Response Caching**
Already implemented in your backend:
- AQI data cached for 1 hour
- Forecast cached for 3 hours
- Reduces external API calls

### **Docker Image Optimization**
Your multi-stage Dockerfile is already optimized:
- Small Alpine Linux base
- Production-only dependencies
- Efficient layer caching

---

## 🎯 **Production Checklist**

### ✅ **Before Going Live**
- [ ] Environment variables configured
- [ ] Database migrations successful  
- [ ] All endpoints tested
- [ ] Error handling verified
- [ ] API rate limits monitored
- [ ] CORS configured for frontend domain
- [ ] Health monitoring setup
- [ ] Custom domain configured (optional)

### ✅ **Post-Deployment**
- [ ] Frontend updated with production API URL
- [ ] Real data verification
- [ ] Performance monitoring
- [ ] API usage tracking
- [ ] Error monitoring setup
- [ ] Backup strategy implemented

---

## 📞 **Support & Resources**

### **Render Documentation**
- **Web Services**: https://render.com/docs/web-services
- **PostgreSQL**: https://render.com/docs/databases
- **Environment Variables**: https://render.com/docs/environment-variables

### **Your Backend Resources**
- **API Documentation**: `/docs/FRONTEND_INTEGRATION_GUIDE.md`
- **Real Data Setup**: `/docs/QUICK_START_REAL_DATA.md`
- **Testing Script**: `./test-real-data.sh`

---

## 🎉 **You're Ready for Production!**

Your backend is **production-ready** with:
- ✅ **Real AQI data** from OpenWeatherMap & IQAir
- ✅ **Global coverage** with Indian city focus
- ✅ **48-hour forecasting** capability
- ✅ **Professional error handling**
- ✅ **Database caching** for performance
- ✅ **Docker deployment** ready

**Next Steps**:
1. Deploy to Render using steps above
2. Update frontend with production URL
3. Test all endpoints with real data
4. Launch your AQI app! 🚀

---

**Deployment Time**: ~15 minutes
**Total Cost**: Free tier available, $7/month for production
**Scalability**: Automatic scaling based on traffic
