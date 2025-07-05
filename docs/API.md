# ISRO AQI Visualizer & Forecast API Documentation

## Overview
Backend API for **real-time AQI monitoring** with actual data from OpenWeatherMap and IQAir APIs, historical trends, forecasting, and health recommendations.

**Base URL:** `http://localhost:5000` (Development) | `https://your-app.render.com` (Production)

**API Version:** v1.0.0

**Data Sources:** 
- 🌍 **OpenWeatherMap Air Pollution API** (Primary)
- 🌬️ **IQAir AirVisual API** (Fallback)
- 📊 **Real-time data** with automatic caching

---

## 🚀 Quick Start
1. **Enable Real Data**: Follow `/docs/QUICK_START_REAL_DATA.md`
2. **Get API Keys**: OpenWeatherMap (primary) + IQAir (optional)
3. **Test Endpoints**: Use coordinates for Indian cities

---

## Authentication
Currently open API. Production deployment will include rate limiting and monitoring.

---

## Endpoints

### 🏠 Health Check
**GET** `/`

Check if the API is running.

**Response:**
```json
{
  "message": "ISRO AQI Visualizer & Forecast API",
  "version": "1.0.0",
  "status": "active",
  "timestamp": "2025-07-05T10:30:00.000Z"
}
```

---

## 📊 AQI Endpoints (Phase 2)

### Get Current AQI
**GET** `/api/aqi`

Get **real-time AQI data** from OpenWeatherMap/IQAir for any location worldwide.

**Query Parameters:**
- `lat` (number, required): Latitude
- `lng` (number, required): Longitude  
- `radius` (number, optional): Search radius in km (default: 10)

**Example Request:**
```
GET /api/aqi?lat=19.0760&lng=72.8777&radius=5
```

**Real Data Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "city": "Mumbai",
      "country": "IN"
    },
    "aqi": {
      "value": 142,
      "category": "Unhealthy for Sensitive Groups",
      "color": "#ff9500",
      "healthAdvice": "People with respiratory or heart conditions should limit outdoor exertion."
    },
    "pollutants": {
      "pm2_5": 52.8,
      "pm10": 78.4,
      "co": 789.2,
      "no": 0.4,
      "no2": 28.6,
      "o3": 34.7,
      "so2": 11.2,
      "nh3": 12.8
    },
    "timestamp": "2025-07-05T10:30:00Z",
    "source": "openweathermap"
  },
  "message": "AQI data retrieved successfully",
  "metadata": {
    "source": "real_api",
    "cached": false,
    "processingTime": "1.2s"
  }
}
```

---

## 📈 Historical Data Endpoints (Phase 3)

### Get Historical AQI Trends
**GET** `/api/history`

Get historical AQI data for trend analysis.

**Query Parameters:**
- `city` (string, required): City name
- `days` (number, optional): Number of days (default: 7, max: 30)
- `aggregation` (string, optional): 'hourly' or 'daily' (default: 'daily')

**Example Request:**
```
GET /api/history?city=Delhi&days=7&aggregation=daily
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "location": "Delhi",
    "period": {
      "from": "2025-06-28T00:00:00.000Z",
      "to": "2025-07-05T00:00:00.000Z",
      "days": 7
    },
    "trends": [
      {
        "date": "2025-06-28",
        "avgAqi": 142,
        "maxAqi": 189,
        "minAqi": 98,
        "category": "MODERATE"
      }
      // ... more daily data
    ],
    "summary": {
      "avgAqi": 156,
      "trendDirection": "increasing",
      "mostCommonCategory": "MODERATE"
    }
  },
  "message": "Historical data retrieved successfully"
}
```

---

## 🔮 Forecast Endpoints (Phase 4)

### Get AQI Forecast
**GET** `/api/forecast`

Get AQI predictions for the next 24-72 hours.

**Query Parameters:**
- `city` (string, required): City name
- `hours` (number, optional): Forecast period in hours (default: 24, options: 24, 48, 72)

**Example Request:**
```
GET /api/forecast?city=Delhi&hours=48
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "location": "Delhi",
    "forecast": [
      {
        "timestamp": "2025-07-05T11:00:00.000Z",
        "hoursAhead": 1,
        "predictedAqi": 162,
        "confidence": 0.85,
        "category": "MODERATE"
      }
      // ... more hourly predictions
    ],
    "model": "LSTM",
    "accuracy": "Based on last 30 days historical data"
  },
  "message": "Forecast generated successfully"
}
```

---

## 🏥 Health Advisory Endpoints (Phase 5)

### Get Health Recommendations
**GET** `/api/health-advice`

Get health recommendations based on AQI level.

**Query Parameters:**
- `aqi` (number, required): Current AQI value
- `category` (string, optional): AQI category if known

**Example Request:**
```
GET /api/health-advice?aqi=156
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "aqi": 156,
    "category": "MODERATE",
    "advice": {
      "general": "May cause breathing discomfort to people with lung disease, children and older adults.",
      "sensitive": "People with respiratory or heart conditions should limit outdoor activities.",
      "recommendations": [
        "Reduce outdoor activities if experiencing symptoms",
        "Use air purifiers indoors",
        "Keep windows closed"
      ]
    },
    "riskLevel": "medium"
  },
  "message": "Health advice generated successfully"
}
```

---

## 🔔 Notification Endpoints (Phase 6)

### Subscribe to Notifications
**POST** `/api/notifications/subscribe`

Subscribe to AQI threshold notifications.

**Request Body:**
```json
{
  "fcmToken": "firebase_device_token",
  "locations": ["location_id_1", "location_id_2"],
  "thresholds": {
    "moderate": 101,
    "poor": 201,
    "severe": 401
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_123456",
    "status": "active"
  },
  "message": "Subscription created successfully"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "meta": {
    "timestamp": "2025-07-05T10:30:00.000Z"
  }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (location/data not found)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error
- `503` - Service Unavailable (external API down)

---

## Rate Limiting
- **Limit:** 100 requests per 15-minute window per IP
- **Headers:** Rate limit info included in response headers

---

## Data Sources
- **CPCB:** Central Pollution Control Board (India)
- **Satellite:** ISRO satellite data (when available)
- **IQAir:** Backup international data source
- **OpenWeatherMap:** Air pollution API

---

## Development Notes

### Local Testing
```bash
# Start development server
npm run dev

# Test API endpoint
curl http://localhost:5000/

# View database
npm run db:studio
```

### Deployment
The API is designed to be deployed on Render with PostgreSQL add-on.

**Required Environment Variables:**
- `DATABASE_URL` (provided by Render)
- `CPCB_API_KEY` (manual setup required)
- `FIREBASE_SERVER_KEY` (manual setup required)
- `HUGGINGFACE_API_KEY` (manual setup required)

---

*This documentation will be updated as new features are implemented in each phase.*
