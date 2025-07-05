# 🚀 Frontend Integration Guide - ISRO AQI Backend

## 🎯 Overview
Your backend is now **100% functional** with real AQI data from OpenWeatherMap and IQAir APIs. This guide provides everything frontend developers need to integrate with your backend.

**Backend Base URL**: `http://localhost:5001` (Development) | `https://your-app.onrender.com` (Production)

---

## ✅ **Real Data Verification**

### ✅ **Confirmed Working Endpoints**
- **✅ Real-time AQI**: Live data from OpenWeatherMap
- **✅ 48-hour Forecast**: Actual pollution predictions  
- **✅ Global Coverage**: Works worldwide, not just India
- **✅ All Pollutants**: PM2.5, PM10, NO2, SO2, CO, O3, NH3

### 🧪 **Test Commands (Verified Working)**
```bash
# Delhi AQI (Current: ~55 - Satisfactory)
curl "http://localhost:5001/api/aqi?lat=28.6139&lng=77.2090"

# Mumbai AQI (Current: ~12 - Good) 
curl "http://localhost:5001/api/aqi?lat=19.0760&lng=72.8777"

# Bangalore 48h Forecast
curl "http://localhost:5001/api/forecast?lat=12.9716&lng=77.5946&hours=48"
```

---

## 🌍 **API Endpoints Reference**

### 1. **Real-Time AQI Data**
**GET** `/api/aqi`

**Parameters:**
- `lat` (required): Latitude (decimal degrees)
- `lng` (required): Longitude (decimal degrees) 
- `radius` (optional): Search radius in km (default: 10)

**Example Request:**
```javascript
const response = await fetch('http://localhost:5001/api/aqi?lat=19.0760&lng=72.8777');
const data = await response.json();
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "name": "Mumbai",
      "latitude": 19.076,
      "longitude": 72.8777,
      "state": "Maharashtra",
      "stationType": "OpenWeatherMap"
    },
    "aqi": {
      "value": 12,
      "category": "GOOD",
      "lastUpdated": "2025-07-05T09:13:43.000Z",
      "label": "Good",
      "color": "#00E400"
    },
    "pollutants": {
      "pm25": 6.4,
      "pm10": 11.8,
      "no2": 0.1,
      "so2": 0.2,
      "co": 0.06,
      "o3": 48.9,
      "nh3": 0.1
    },
    "source": "OpenWeatherMap",
    "lastUpdated": "2025-07-05T09:13:43.000Z"
  },
  "message": "AQI data retrieved successfully",
  "meta": {
    "timestamp": "2025-07-05T09:23:03.817Z",
    "source": "external_api",
    "isRealData": true
  }
}
```

### 2. **AQI Forecast (4 Days)**
**GET** `/api/forecast`

**Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude
- `hours` (optional): Forecast period (1-96 hours, default: 24)

**Example Request:**
```javascript
const response = await fetch('http://localhost:5001/api/forecast?lat=12.9716&lng=77.5946&hours=48');
const data = await response.json();
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "name": "Bangalore",
      "lat": 12.9716,
      "lng": 77.5946,
      "state": "Karnataka"
    },
    "forecastPeriod": {
      "hours": 48,
      "from": "2025-07-05T09:23:12.814Z",
      "to": "2025-07-07T09:23:12.814Z"
    },
    "forecast": [
      {
        "timestamp": "2025-07-05T09:00:00.000Z",
        "hoursAhead": 1,
        "predictedAqi": 3,
        "confidence": 0.85,
        "category": "Good",
        "pollutants": {
          "pm25": 1.7,
          "pm10": 2.7,
          "no2": 2.1,
          "so2": 0.8,
          "co": 0.11,
          "o3": 33.1
        }
      }
      // ... more forecast points
    ],
    "summary": {
      "avgAqi": 5,
      "maxAqi": 12,
      "minAqi": 2,
      "trend": "stable",
      "mostCommonCategory": "Good"
    }
  }
}
```

### 3. **Historical Data**
**GET** `/api/history`

**Parameters:**
- `city` (required): City name
- `days` (optional): Number of days (1-90, default: 7)
- `aggregation` (optional): 'hourly' or 'daily' (default: 'daily')

**Example Request:**
```javascript
const response = await fetch('http://localhost:5001/api/history?city=Mumbai&days=7');
const data = await response.json();
```

### 4. **Health Advice**
**GET** `/api/health-advice`

**Parameters:**
- `aqi` (required): AQI value (0-500)

**Example Request:**
```javascript
const response = await fetch('http://localhost:5001/api/health-advice?aqi=156');
const data = await response.json();
```

---

## 📍 **Major Indian Cities Coordinates**

Use these tested coordinates for your frontend:

```javascript
const INDIAN_CITIES = {
  'Delhi': { lat: 28.6139, lng: 77.2090 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Lucknow': { lat: 26.8467, lng: 80.9462 }
};
```

---

## 🎨 **AQI Color Coding**

Use these standardized colors for AQI categories:

```javascript
const AQI_COLORS = {
  'GOOD': '#00E400',           // Green (0-50)
  'SATISFACTORY': '#FFFF00',   // Yellow (51-100)
  'MODERATE': '#FF7E00',       // Orange (101-200)
  'POOR': '#FF0000',          // Red (201-300)
  'VERY_POOR': '#8F3F97',     // Purple (301-400)
  'SEVERE': '#7E0023'         // Maroon (401-500)
};

const AQI_LABELS = {
  'GOOD': 'Good',
  'SATISFACTORY': 'Satisfactory', 
  'MODERATE': 'Moderate',
  'POOR': 'Poor',
  'VERY_POOR': 'Very Poor',
  'SEVERE': 'Severe'
};
```

---

## 📱 **React Component Examples**

### AQI Display Component
```jsx
import React, { useState, useEffect } from 'react';

const AQIDisplay = ({ lat, lng }) => {
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAQI = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/aqi?lat=${lat}&lng=${lng}`);
        const data = await response.json();
        setAqiData(data.data);
      } catch (error) {
        console.error('Error fetching AQI:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAQI();
  }, [lat, lng]);

  if (loading) return <div>Loading AQI...</div>;
  if (!aqiData) return <div>Failed to load AQI data</div>;

  return (
    <div className="aqi-card" style={{ backgroundColor: aqiData.aqi.color }}>
      <h2>{aqiData.location.name}</h2>
      <div className="aqi-value">{aqiData.aqi.value}</div>
      <div className="aqi-category">{aqiData.aqi.label}</div>
      <div className="pollutants">
        <div>PM2.5: {aqiData.pollutants.pm25} μg/m³</div>
        <div>PM10: {aqiData.pollutants.pm10} μg/m³</div>
        <div>NO2: {aqiData.pollutants.no2} μg/m³</div>
      </div>
      <small>Updated: {new Date(aqiData.lastUpdated).toLocaleString()}</small>
    </div>
  );
};
```

### Forecast Chart Component
```jsx
import React, { useState, useEffect } from 'react';

const ForecastChart = ({ lat, lng, hours = 24 }) => {
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/forecast?lat=${lat}&lng=${lng}&hours=${hours}`);
        const data = await response.json();
        setForecast(data.data);
      } catch (error) {
        console.error('Error fetching forecast:', error);
      }
    };

    fetchForecast();
  }, [lat, lng, hours]);

  if (!forecast) return <div>Loading forecast...</div>;

  return (
    <div className="forecast-container">
      <h3>AQI Forecast - {forecast.location.name}</h3>
      <div className="forecast-grid">
        {forecast.forecast.slice(0, 12).map((point) => (
          <div key={point.timestamp} className="forecast-point">
            <div className="time">
              {new Date(point.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
            <div className="aqi-value">{point.predictedAqi}</div>
            <div className="category">{point.category}</div>
          </div>
        ))}
      </div>
      <div className="forecast-summary">
        <p>Average AQI: {forecast.summary.avgAqi}</p>
        <p>Trend: {forecast.summary.trend}</p>
      </div>
    </div>
  );
};
```

---

## 🚨 **Error Handling**

All endpoints return consistent error format:

```json
{
  "success": false,
  "data": null,
  "message": "Error description",
  "error": {
    "code": "INVALID_COORDINATES",
    "details": "Latitude must be between -90 and 90"
  }
}
```

**Common Error Codes:**
- `INVALID_COORDINATES`: Invalid lat/lng values
- `API_RATE_LIMIT`: Too many requests
- `EXTERNAL_API_ERROR`: OpenWeatherMap/IQAir API failed
- `DATABASE_ERROR`: Database connection issue

---

## 🔄 **Caching & Performance**

### Data Freshness
- **Real-time AQI**: Cached for 1 hour
- **Forecast**: Cached for 3 hours  
- **Historical**: Permanent storage

### Rate Limits
- **OpenWeatherMap**: 1,000 calls/day (FREE tier)
- **IQAir**: 10,000 calls/month (FREE tier)
- **Backend**: Smart caching reduces API usage

### Best Practices
```javascript
// Cache AQI data in your frontend
const AQI_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const getCachedAQI = (lat, lng) => {
  const cacheKey = `aqi_${lat}_${lng}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < AQI_CACHE_DURATION) {
      return data;
    }
  }
  return null;
};

const setCachedAQI = (lat, lng, data) => {
  const cacheKey = `aqi_${lat}_${lng}`;
  localStorage.setItem(cacheKey, JSON.stringify({
    data,
    timestamp: Date.now()
  }));
};
```

---

## 🌐 **CORS Configuration**

CORS is enabled for all origins in development. For production, specific origins will be whitelisted.

---

## 📊 **Data Sources & Accuracy**

### Primary: **OpenWeatherMap**
- **Coverage**: Global (including all Indian cities)
- **Update Frequency**: Every hour
- **Accuracy**: Professional meteorological models
- **Pollutants**: PM2.5, PM10, CO, NO, NO2, O3, SO2, NH3

### Secondary: **IQAir** (Fallback)
- **Coverage**: Major cities worldwide
- **Update Frequency**: Real-time
- **Accuracy**: Ground station data + satellite

### Data Quality Indicators
- **✅ Real Data**: `meta.isRealData: true`
- **🌍 Source**: `source: "OpenWeatherMap"` or `"IQAir"`
- **⏱️ Freshness**: Check `lastUpdated` timestamp
- **📊 Confidence**: Forecast confidence levels (0.0-1.0)

---

## 🔧 **Development vs Production**

### Development
```javascript
const API_BASE_URL = 'http://localhost:5001';
```

### Production
```javascript
const API_BASE_URL = 'https://your-app.onrender.com';
```

### Environment Detection
```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-app.onrender.com'
  : 'http://localhost:5001';
```

---

## 🎯 **Frontend Checklist**

### ✅ **Essential Features**
- [ ] Real-time AQI display for major cities
- [ ] 24-48 hour forecast charts
- [ ] Color-coded AQI categories
- [ ] Health recommendations based on AQI
- [ ] Location-based AQI search
- [ ] Responsive design for mobile/desktop

### ✅ **Enhanced Features**  
- [ ] Historical trends (7-30 days)
- [ ] Comparative city analysis
- [ ] AQI threshold alerts
- [ ] Share AQI data functionality
- [ ] Pollutant-specific breakdowns
- [ ] Forecast accuracy tracking

### ✅ **Performance**
- [ ] Frontend caching implementation
- [ ] Loading states for API calls
- [ ] Error handling and fallbacks
- [ ] Optimized API call frequency
- [ ] Lazy loading for non-critical data

---

## 🚀 **Ready for Production**

Your backend is **production-ready** with:
- ✅ Real data from verified APIs
- ✅ Error handling and fallbacks
- ✅ Consistent JSON responses
- ✅ Rate limiting protection
- ✅ Database caching
- ✅ CORS configuration
- ✅ Environment-based configuration

**Next Step**: Deploy to Render and update frontend API URLs!

---

## 📞 **Support & Testing**

### Test Your Integration
```bash
# Health check
curl http://localhost:5001/

# Real Delhi AQI  
curl "http://localhost:5001/api/aqi?lat=28.6139&lng=77.2090"

# Mumbai 24h forecast
curl "http://localhost:5001/api/forecast?lat=19.0760&lng=72.8777&hours=24"
```

### Debug Real Data
- Check backend logs for API errors
- Verify `USE_REAL_DATA=true` in .env
- Confirm API keys are valid
- Monitor API usage at provider dashboards

**🎉 Your backend is ready for a world-class frontend integration!**
