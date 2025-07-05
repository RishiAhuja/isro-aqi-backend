const { AQI_CATEGORIES } = require('./constants');

/**
 * Categorize AQI value into Indian NAQI categories
 * @param {number} aqi - AQI value
 * @returns {object} Category information
 */
function categorizeAQI(aqi) {
  for (const [key, category] of Object.entries(AQI_CATEGORIES)) {
    if (aqi >= category.min && aqi <= category.max) {
      return {
        category: key,
        label: category.label,
        color: category.color,
        value: aqi
      };
    }
  }
  
  // If AQI exceeds 500, classify as SEVERE
  return {
    category: 'SEVERE',
    label: 'Severe',
    color: '#7E0023',
    value: aqi
  };
}

/**
 * Get health recommendations based on AQI category
 * @param {string} category - AQI category
 * @returns {object} Health advice
 */
function getHealthAdvice(category) {
  const advice = {
    GOOD: {
      general: "Air quality is excellent. Ideal for outdoor activities.",
      sensitive: "No health implications. Enjoy outdoor activities.",
      recommendations: ["Perfect time for outdoor exercise", "Windows can be kept open"]
    },
    SATISFACTORY: {
      general: "Air quality is acceptable for most people.",
      sensitive: "Unusually sensitive individuals may experience minor respiratory symptoms.",
      recommendations: ["Outdoor activities are generally safe", "Consider reducing prolonged outdoor exertion"]
    },
    MODERATE: {
      general: "May cause breathing discomfort to people with lung disease, children and older adults.",
      sensitive: "People with respiratory or heart conditions should limit outdoor activities.",
      recommendations: ["Reduce outdoor activities if experiencing symptoms", "Use air purifiers indoors", "Keep windows closed"]
    },
    POOR: {
      general: "May cause breathing discomfort to most people on prolonged exposure.",
      sensitive: "People with respiratory/heart conditions should avoid outdoor activities.",
      recommendations: ["Avoid outdoor activities", "Use N95 masks when going outside", "Keep windows closed", "Use air purifiers"]
    },
    VERY_POOR: {
      general: "May cause respiratory illness on prolonged exposure.",
      sensitive: "People with respiratory/heart conditions must avoid outdoor activities.",
      recommendations: ["Stay indoors", "Use N95/N99 masks if you must go outside", "Avoid all outdoor exercise", "Use air purifiers continuously"]
    },
    SEVERE: {
      general: "May cause respiratory effects even on healthy people.",
      sensitive: "Serious health effects for everyone. Avoid outdoor activities completely.",
      recommendations: ["Stay indoors at all times", "Use N99 masks if emergency outdoor exposure", "Use multiple air purifiers", "Seek medical attention if experiencing symptoms"]
    }
  };

  return advice[category] || advice.SEVERE;
}

/**
 * Format API response with consistent structure
 * @param {boolean} success - Whether the operation was successful
 * @param {any} data - Response data
 * @param {string} message - Response message
 * @param {object} meta - Additional metadata
 * @returns {object} Formatted response
 */
function formatResponse(success, data = null, message = '', meta = {}) {
  return {
    success,
    data,
    message,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = {
  categorizeAQI,
  getHealthAdvice,
  formatResponse,
  calculateDistance
};
