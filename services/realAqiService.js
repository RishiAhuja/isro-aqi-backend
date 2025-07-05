const axios = require('axios');
const { formatResponse } = require('../utils/helpers');

class RealAQIService {
  constructor() {
    this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY;
    this.iqAirApiKey = process.env.IQAIR_API_KEY;
    this.useRealData = process.env.USE_REAL_DATA === 'true';
    
    // API endpoints
    this.openWeatherBaseUrl = 'http://api.openweathermap.org/data/2.5';
    this.iqAirBaseUrl = 'http://api.airvisual.com/v2';
    
    console.log(`🌍 AQI Service initialized with real data: ${this.useRealData}`);
  }

  /**
   * Fetch real-time AQI data from multiple sources
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in km
   * @returns {Promise<object>} AQI data
   */
  async fetchRealTimeAQI(lat, lng, radius = 10) {
    if (!this.useRealData || !this.openWeatherApiKey || this.openWeatherApiKey === 'placeholder_openweather_key') {
      console.log('📝 Using mock data - real API keys not configured');
      return this.getMockAQIData(lat, lng);
    }

    try {
      // Try OpenWeatherMap first (primary source)
      const owmData = await this.fetchFromOpenWeatherMap(lat, lng);
      if (owmData) {
        console.log('✅ Data fetched from OpenWeatherMap');
        return owmData;
      }

      // Fallback to IQAir if OpenWeatherMap fails
      if (this.iqAirApiKey && this.iqAirApiKey !== 'placeholder_iqair_key') {
        const iqAirData = await this.fetchFromIQAir(lat, lng);
        if (iqAirData) {
          console.log('✅ Data fetched from IQAir (fallback)');
          return iqAirData;
        }
      }

      // Final fallback to mock data
      console.log('⚠️ All APIs failed, using mock data');
      return this.getMockAQIData(lat, lng, true);

    } catch (error) {
      console.error('❌ Error fetching real AQI data:', error.message);
      return this.getMockAQIData(lat, lng, true);
    }
  }

  /**
   * Fetch data from OpenWeatherMap Air Pollution API
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<object|null>} Formatted AQI data
   */
  async fetchFromOpenWeatherMap(lat, lng) {
    try {
      const url = `${this.openWeatherBaseUrl}/air_pollution`;
      const response = await axios.get(url, {
        params: {
          lat: lat,
          lon: lng,
          appid: this.openWeatherApiKey
        },
        timeout: 10000 // 10 second timeout
      });

      const data = response.data;
      if (!data.list || data.list.length === 0) {
        throw new Error('No data returned from OpenWeatherMap');
      }

      const pollution = data.list[0];
      return this.formatOpenWeatherMapResponse(pollution, lat, lng);

    } catch (error) {
      console.error('OpenWeatherMap API error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Fetch data from IQAir API
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<object|null>} Formatted AQI data
   */
  async fetchFromIQAir(lat, lng) {
    try {
      const url = `${this.iqAirBaseUrl}/nearest_city`;
      const response = await axios.get(url, {
        params: {
          lat: lat,
          lon: lng,
          key: this.iqAirApiKey
        },
        timeout: 10000
      });

      const data = response.data;
      if (data.status !== 'success' || !data.data) {
        throw new Error('Invalid response from IQAir API');
      }

      return this.formatIQAirResponse(data.data, lat, lng);

    } catch (error) {
      console.error('IQAir API error:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Format OpenWeatherMap API response
   * @param {object} pollution - OpenWeatherMap pollution data
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} Formatted AQI data
   */
  formatOpenWeatherMapResponse(pollution, lat, lng) {
    const components = pollution.components;
    
    // Convert OpenWeatherMap AQI (1-5) to Indian AQI (0-500)
    const indianAQI = this.convertToIndianAQI(components.pm2_5, components.pm10, components.no2, components.so2, components.co, components.o3);
    
    // Get city name from coordinates (approximate)
    const cityInfo = this.getCityFromCoordinates(lat, lng);

    return {
      location: {
        name: cityInfo.name,
        latitude: lat,
        longitude: lng,
        state: cityInfo.state,
        stationType: 'OpenWeatherMap'
      },
      aqi: {
        value: indianAQI,
        category: this.getAQICategory(indianAQI),
        lastUpdated: new Date(pollution.dt * 1000).toISOString()
      },
      pollutants: {
        pm25: Math.round(components.pm2_5 * 10) / 10,
        pm10: Math.round(components.pm10 * 10) / 10,
        no2: Math.round(components.no2 * 10) / 10,
        so2: Math.round(components.so2 * 10) / 10,
        co: Math.round(components.co / 1000 * 100) / 100, // Convert to mg/m³
        o3: Math.round(components.o3 * 10) / 10,
        nh3: Math.round(components.nh3 * 10) / 10
      },
      source: 'OpenWeatherMap',
      isRealData: true
    };
  }

  /**
   * Format IQAir API response
   * @param {object} data - IQAir data
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} Formatted AQI data
   */
  formatIQAirResponse(data, lat, lng) {
    const pollution = data.current.pollution;
    const weather = data.current.weather;
    
    // IQAir uses US AQI, convert to Indian AQI
    const usAQI = pollution.aqius;
    const indianAQI = this.convertUSAQIToIndian(usAQI);

    return {
      location: {
        name: data.city,
        latitude: lat,
        longitude: lng,
        state: data.state,
        country: data.country,
        stationType: 'IQAir'
      },
      aqi: {
        value: indianAQI,
        category: this.getAQICategory(indianAQI),
        lastUpdated: pollution.ts
      },
      pollutants: {
        pm25: pollution.p2?.v || 0,
        pm10: pollution.p1?.v || 0,
        // IQAir may not provide all pollutants in free tier
        no2: null,
        so2: null,
        co: null,
        o3: null
      },
      weather: {
        temperature: weather.tp,
        humidity: weather.hu,
        pressure: weather.pr,
        windSpeed: weather.ws
      },
      source: 'IQAir',
      isRealData: true
    };
  }

  /**
   * Convert pollutant concentrations to Indian AQI
   * @param {number} pm25 - PM2.5 concentration (μg/m³)
   * @param {number} pm10 - PM10 concentration (μg/m³)
   * @param {number} no2 - NO2 concentration (μg/m³)
   * @param {number} so2 - SO2 concentration (μg/m³)
   * @param {number} co - CO concentration (μg/m³)
   * @param {number} o3 - O3 concentration (μg/m³)
   * @returns {number} Indian AQI value
   */
  convertToIndianAQI(pm25, pm10, no2, so2, co, o3) {
    // Indian AQI calculation based on the highest sub-index
    const aqiValues = [];

    // PM2.5 Sub-Index
    if (pm25 !== undefined) {
      aqiValues.push(this.calculateSubIndex(pm25, [
        { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
        { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
        { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
        { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
        { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
        { cLow: 250, cHigh: 500, iLow: 401, iHigh: 500 }
      ]));
    }

    // PM10 Sub-Index
    if (pm10 !== undefined) {
      aqiValues.push(this.calculateSubIndex(pm10, [
        { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
        { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
        { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
        { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
        { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
        { cLow: 430, cHigh: 500, iLow: 401, iHigh: 500 }
      ]));
    }

    // NO2 Sub-Index (μg/m³)
    if (no2 !== undefined) {
      aqiValues.push(this.calculateSubIndex(no2, [
        { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
        { cLow: 40, cHigh: 80, iLow: 51, iHigh: 100 },
        { cLow: 80, cHigh: 180, iLow: 101, iHigh: 200 },
        { cLow: 180, cHigh: 280, iLow: 201, iHigh: 300 },
        { cLow: 280, cHigh: 400, iLow: 301, iHigh: 400 },
        { cLow: 400, cHigh: 500, iLow: 401, iHigh: 500 }
      ]));
    }

    // Return the maximum AQI (most restrictive)
    return Math.round(Math.max(...aqiValues, 1));
  }

  /**
   * Calculate sub-index for a pollutant
   * @param {number} concentration - Pollutant concentration
   * @param {array} breakpoints - AQI breakpoints array
   * @returns {number} Sub-index value
   */
  calculateSubIndex(concentration, breakpoints) {
    for (const bp of breakpoints) {
      if (concentration >= bp.cLow && concentration <= bp.cHigh) {
        return ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow;
      }
    }
    
    // If concentration exceeds all breakpoints, return maximum AQI
    return 500;
  }

  /**
   * Convert US AQI to Indian AQI (approximate)
   * @param {number} usAQI - US AQI value
   * @returns {number} Approximate Indian AQI
   */
  convertUSAQIToIndian(usAQI) {
    // Approximate conversion (not exact due to different standards)
    if (usAQI <= 50) return usAQI; // Good range similar
    if (usAQI <= 100) return usAQI; // Moderate range similar
    if (usAQI <= 150) return Math.round(usAQI * 1.33); // Scale up for Indian standards
    if (usAQI <= 200) return Math.round(usAQI * 1.5);
    if (usAQI <= 300) return Math.round(usAQI * 1.33);
    return Math.min(usAQI, 500);
  }

  /**
   * Get approximate city from coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} City information
   */
  getCityFromCoordinates(lat, lng) {
    // Major Indian cities with coordinates
    const cities = [
      { name: 'New Delhi', lat: 28.6139, lng: 77.2090, state: 'Delhi' },
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
      { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
      { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana' },
      { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
      { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
      { name: 'Jaipur', lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
      { name: 'Surat', lat: 21.1702, lng: 72.8311, state: 'Gujarat' }
    ];

    let closestCity = cities[0];
    let minDistance = this.calculateDistance(lat, lng, cities[0].lat, cities[0].lng);

    for (const city of cities) {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }

    return closestCity;
  }

  /**
   * Get forecast data from OpenWeatherMap
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} hours - Hours ahead (max 96)
   * @returns {Promise<object>} Forecast data
   */
  async fetchForecastData(lat, lng, hours = 24) {
    if (!this.useRealData || !this.openWeatherApiKey) {
      return this.getMockForecastData(lat, lng, hours);
    }

    try {
      const url = `${this.openWeatherBaseUrl}/air_pollution/forecast`;
      const response = await axios.get(url, {
        params: {
          lat: lat,
          lon: lng,
          appid: this.openWeatherApiKey
        },
        timeout: 10000
      });

      const data = response.data;
      if (!data.list || data.list.length === 0) {
        throw new Error('No forecast data available');
      }

      // Process forecast data (limit to requested hours)
      const maxEntries = Math.min(hours, data.list.length);
      const forecasts = data.list.slice(0, maxEntries).map((item, index) => {
        const indianAQI = this.convertToIndianAQI(
          item.components.pm2_5,
          item.components.pm10,
          item.components.no2,
          item.components.so2,
          item.components.co,
          item.components.o3
        );

        return {
          timestamp: new Date(item.dt * 1000).toISOString(),
          hoursAhead: index + 1,
          predictedAqi: indianAQI,
          confidence: 0.85, // OpenWeatherMap has good accuracy
          category: this.getAQICategory(indianAQI),
          pollutants: {
            pm25: Math.round(item.components.pm2_5 * 10) / 10,
            pm10: Math.round(item.components.pm10 * 10) / 10,
            no2: Math.round(item.components.no2 * 10) / 10,
            so2: Math.round(item.components.so2 * 10) / 10,
            co: Math.round(item.components.co / 1000 * 100) / 100,
            o3: Math.round(item.components.o3 * 10) / 10
          }
        };
      });

      return {
        location: this.getCityFromCoordinates(lat, lng),
        forecast: forecasts,
        model: 'OpenWeatherMap',
        source: 'real_api',
        accuracy: 'Based on meteorological models and satellite data',
        isRealData: true
      };

    } catch (error) {
      console.error('Forecast API error:', error.message);
      return this.getMockForecastData(lat, lng, hours);
    }
  }

  /**
   * Generate mock forecast data when real API is not available
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude  
   * @param {number} hours - Hours ahead
   * @returns {object} Mock forecast data
   */
  getMockForecastData(lat, lng, hours) {
    const cityInfo = this.getCityFromCoordinates(lat, lng);
    const baseAQI = this.getCityMockData(lat, lng).baseAQI;
    const forecasts = [];

    for (let i = 1; i <= hours; i++) {
      const timestamp = new Date(Date.now() + i * 60 * 60 * 1000);
      
      // Add some realistic variation
      const variation = Math.sin(i / 12) * 30 + Math.random() * 20 - 10;
      const predictedAqi = Math.max(10, Math.min(450, Math.round(baseAQI + variation)));

      forecasts.push({
        timestamp: timestamp.toISOString(),
        hoursAhead: i,
        predictedAqi: predictedAqi,
        confidence: 0.75 - (i / hours) * 0.2, // Confidence decreases with time
        category: this.getAQICategory(predictedAqi)
      });
    }

    return {
      location: cityInfo,
      forecast: forecasts,
      model: 'Mock_LSTM',
      source: 'mock_data',
      accuracy: 'Mock data for development purposes',
      isRealData: false
    };
  }

  // Keep existing mock data methods for fallback
  getMockAQIData(lat, lng, isError = false) {
    const cityData = this.getCityMockData(lat, lng);
    const baseAQI = cityData.baseAQI + Math.floor(Math.random() * 40) - 20;
    const aqi = Math.max(1, Math.min(500, baseAQI));

    return {
      location: {
        name: cityData.name,
        latitude: lat,
        longitude: lng,
        state: cityData.state,
        stationType: isError ? 'Mock-Fallback' : 'Mock-Development'
      },
      aqi: {
        value: aqi,
        category: this.getAQICategory(aqi),
        lastUpdated: new Date().toISOString()
      },
      pollutants: {
        pm25: Math.round((aqi * 0.6 + Math.random() * 10) * 10) / 10,
        pm10: Math.round((aqi * 1.2 + Math.random() * 15) * 10) / 10,
        no2: Math.round((aqi * 0.4 + Math.random() * 8) * 10) / 10,
        so2: Math.round((aqi * 0.2 + Math.random() * 5) * 10) / 10,
        co: Math.round((aqi * 0.01 + Math.random() * 0.5) * 100) / 100,
        o3: Math.round((aqi * 0.3 + Math.random() * 6) * 10) / 10
      },
      source: isError ? 'Mock-Fallback' : 'Mock-Development',
      isRealData: false
    };
  }

  getCityMockData(lat, lng) {
    const cities = [
      { name: 'New Delhi', lat: 28.6139, lng: 77.2090, state: 'Delhi', baseAQI: 180 },
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra', baseAQI: 120 },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946, state: 'Karnataka', baseAQI: 100 },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', baseAQI: 110 },
      { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal', baseAQI: 150 },
      { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana', baseAQI: 130 },
      { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra', baseAQI: 115 },
      { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat', baseAQI: 125 }
    ];

    let closestCity = cities[0];
    let minDistance = this.calculateDistance(lat, lng, cities[0].lat, cities[0].lng);

    for (const city of cities) {
      const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }

    return closestCity;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
  }
}

module.exports = RealAQIService;
