// AQI categories based on Indian National Air Quality Index (NAQI)
const AQI_CATEGORIES = {
  GOOD: { min: 0, max: 50, label: 'Good', color: '#00E400' },
  SATISFACTORY: { min: 51, max: 100, label: 'Satisfactory', color: '#FFFF00' },
  MODERATE: { min: 101, max: 200, label: 'Moderate', color: '#FF7E00' },
  POOR: { min: 201, max: 300, label: 'Poor', color: '#FF0000' },
  VERY_POOR: { min: 301, max: 400, label: 'Very Poor', color: '#8F3F97' },
  SEVERE: { min: 401, max: 500, label: 'Severe', color: '#7E0023' }
};

// Pollutant limits for Indian NAQI
const POLLUTANT_LIMITS = {
  PM25: {
    GOOD: 30,
    SATISFACTORY: 60,
    MODERATE: 90,
    POOR: 120,
    VERY_POOR: 250,
    SEVERE: Infinity
  },
  PM10: {
    GOOD: 50,
    SATISFACTORY: 100,
    MODERATE: 250,
    POOR: 350,
    VERY_POOR: 430,
    SEVERE: Infinity
  },
  NO2: {
    GOOD: 40,
    SATISFACTORY: 80,
    MODERATE: 180,
    POOR: 280,
    VERY_POOR: 400,
    SEVERE: Infinity
  },
  SO2: {
    GOOD: 40,
    SATISFACTORY: 80,
    MODERATE: 380,
    POOR: 800,
    VERY_POOR: 1600,
    SEVERE: Infinity
  },
  CO: {
    GOOD: 1.0,
    SATISFACTORY: 2.0,
    MODERATE: 10,
    POOR: 17,
    VERY_POOR: 34,
    SEVERE: Infinity
  },
  O3: {
    GOOD: 50,
    SATISFACTORY: 100,
    MODERATE: 168,
    POOR: 208,
    VERY_POOR: 748,
    SEVERE: Infinity
  }
};

// Default notification thresholds
const NOTIFICATION_THRESHOLDS = {
  MODERATE: 101,
  POOR: 201,
  VERY_POOR: 301,
  SEVERE: 401
};

module.exports = {
  AQI_CATEGORIES,
  POLLUTANT_LIMITS,
  NOTIFICATION_THRESHOLDS
};
