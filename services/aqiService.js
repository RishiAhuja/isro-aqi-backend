const axios = require('axios');
const { formatResponse } = require('../utils/helpers');

class AQIService {
  constructor() {
    this.cpcbApiKey = process.env.CPCB_API_KEY;
    this.cpcbBaseUrl = process.env.CPCB_BASE_URL || 'https://api.cpcbccr.com';
  }

  /**
   * Fetch real-time AQI data from CPCB API
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in km
   * @returns {Promise<object>} AQI data
   */
  async fetchRealTimeAQI(lat, lng, radius = 10) {
    try {
      // Since CPCB API might not be immediately available, we'll use mock data
      // In production, replace this with actual CPCB API call
      if (this.cpcbApiKey === 'placeholder_cpcb_key') {
        return this.getMockAQIData(lat, lng);
      }

      // Actual CPCB API call (uncomment when API key is available)
      /*
      const response = await axios.get(`${this.cpcbBaseUrl}/aqi/nearest`, {
        params: { lat, lng, radius },
        headers: { 'Authorization': `Bearer ${this.cpcbApiKey}` }
      });
      return this.formatCPCBResponse(response.data);
      */

      return this.getMockAQIData(lat, lng);
    } catch (error) {
      console.error('Error fetching AQI data:', error.message);
      
      // Fallback to mock data if API fails
      return this.getMockAQIData(lat, lng, true);
    }
  }

  /**
   * Generate mock AQI data for development/testing
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {boolean} isError - Whether this is error fallback data
   * @returns {object} Mock AQI data
   */
  getMockAQIData(lat, lng, isError = false) {
    // Generate realistic AQI values based on location (rough estimates for Indian cities)
    const cityData = this.getCityMockData(lat, lng);
    
    // Add some randomness to make it realistic
    const baseAQI = cityData.baseAQI + Math.floor(Math.random() * 40) - 20;
    const aqi = Math.max(1, Math.min(500, baseAQI));

    return {
      location: {
        name: cityData.name,
        latitude: lat,
        longitude: lng,
        state: cityData.state,
        stationType: isError ? 'Mock-Fallback' : 'Mock-CPCB'
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
      source: isError ? 'Mock-Fallback' : 'Mock-CPCB',
      isRealData: false
    };
  }

  /**
   * Get mock city data based on coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {object} City information with typical AQI
   */
  getCityMockData(lat, lng) {
    // Major Indian cities with typical AQI ranges
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

    // Find closest city
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
   * Calculate distance between two coordinates
   * @param {number} lat1 - Latitude 1
   * @param {number} lng1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lng2 - Longitude 2
   * @returns {number} Distance in km
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Get AQI category from value
   * @param {number} aqi - AQI value
   * @returns {string} AQI category
   */
  getAQICategory(aqi) {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Satisfactory';
    if (aqi <= 200) return 'Moderate';
    if (aqi <= 300) return 'Poor';
    if (aqi <= 400) return 'Very Poor';
    return 'Severe';
  }

  /**
   * Format CPCB API response (for when real API is available)
   * @param {object} data - Raw CPCB response
   * @returns {object} Formatted AQI data
   */
  formatCPCBResponse(data) {
    // This will be implemented when actual CPCB API structure is known
    return {
      location: {
        name: data.station_name || 'Unknown',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        state: data.state || 'Unknown',
        stationType: 'CPCB'
      },
      aqi: {
        value: data.aqi || 0,
        category: this.getAQICategory(data.aqi || 0),
        lastUpdated: data.last_updated || new Date().toISOString()
      },
      pollutants: {
        pm25: data.pm25 || 0,
        pm10: data.pm10 || 0,
        no2: data.no2 || 0,
        so2: data.so2 || 0,
        co: data.co || 0,
        o3: data.o3 || 0
      },
      source: 'CPCB',
      isRealData: true
    };
  }
}

module.exports = AQIService;
