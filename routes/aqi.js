const express = require('express');
const router = express.Router();
const AQIService = require('../services/aqiService');
const DatabaseService = require('../services/databaseService');
const { formatResponse, categorizeAQI } = require('../utils/helpers');

const aqiService = new AQIService();
const dbService = new DatabaseService();

/**
 * GET /api/aqi
 * Get real-time AQI data for a location
 * Query params: lat, lng, radius (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json(
        formatResponse(false, null, 'Latitude and longitude are required parameters')
      );
    }

    // Validate coordinate ranges
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json(
        formatResponse(false, null, 'Invalid latitude. Must be between -90 and 90')
      );
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json(
        formatResponse(false, null, 'Invalid longitude. Must be between -180 and 180')
      );
    }

    if (isNaN(searchRadius) || searchRadius <= 0 || searchRadius > 100) {
      return res.status(400).json(
        formatResponse(false, null, 'Invalid radius. Must be between 0 and 100 km')
      );
    }

    // First, try to get recent data from database (within last hour)
    const cachedData = await dbService.getLatestAQI(latitude, longitude, searchRadius);
    
    if (cachedData && isDataFresh(cachedData.timestamp)) {
      const response = formatCachedAQIResponse(cachedData);
      return res.json(
        formatResponse(true, response, 'AQI data retrieved from cache', {
          source: 'cache',
          dataAge: getDataAge(cachedData.timestamp)
        })
      );
    }

    // If no fresh cached data, fetch from external API
    const freshData = await aqiService.fetchRealTimeAQI(latitude, longitude, searchRadius);
    
    // Save fresh data to database
    try {
      await dbService.saveAQIData(freshData);
    } catch (saveError) {
      console.error('Failed to save AQI data to database:', saveError);
      // Continue even if saving fails
    }

    // Format and categorize the response
    const aqiCategory = categorizeAQI(freshData.aqi.value);
    const response = {
      location: freshData.location,
      aqi: {
        ...freshData.aqi,
        ...aqiCategory
      },
      pollutants: freshData.pollutants,
      source: freshData.source,
      lastUpdated: freshData.aqi.lastUpdated
    };

    res.json(
      formatResponse(true, response, 'AQI data retrieved successfully', {
        source: 'external_api',
        isRealData: freshData.isRealData || false
      })
    );

  } catch (error) {
    console.error('Error in AQI endpoint:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to retrieve AQI data', {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    );
  }
});

/**
 * GET /api/aqi/locations
 * Search for available monitoring locations
 * Query params: q (search term)
 */
router.get('/locations', async (req, res) => {
  try {
    const { q: searchTerm } = req.query;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json(
        formatResponse(false, null, 'Search term must be at least 2 characters long')
      );
    }

    const locations = await dbService.searchLocations(searchTerm.trim());

    res.json(
      formatResponse(true, locations, `Found ${locations.length} matching locations`)
    );

  } catch (error) {
    console.error('Error searching locations:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to search locations')
    );
  }
});

/**
 * GET /api/aqi/nearest
 * Get AQI data for the nearest monitoring station
 * Query params: lat, lng
 */
router.get('/nearest', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json(
        formatResponse(false, null, 'Latitude and longitude are required')
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Get the nearest station within 50km
    const nearestData = await dbService.getLatestAQI(latitude, longitude, 50);

    if (!nearestData) {
      return res.status(404).json(
        formatResponse(false, null, 'No monitoring stations found within 50km radius')
      );
    }

    const response = formatCachedAQIResponse(nearestData);
    
    res.json(
      formatResponse(true, response, 'Nearest station data retrieved', {
        distance: calculateDistance(latitude, longitude, nearestData.location.latitude, nearestData.location.longitude)
      })
    );

  } catch (error) {
    console.error('Error finding nearest station:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to find nearest monitoring station')
    );
  }
});

/**
 * Helper function to check if data is fresh (within last hour)
 * @param {Date} timestamp - Data timestamp
 * @returns {boolean} Whether data is fresh
 */
function isDataFresh(timestamp) {
  const now = new Date();
  const dataTime = new Date(timestamp);
  const diffInMinutes = (now - dataTime) / (1000 * 60);
  return diffInMinutes <= 60; // Fresh if less than 1 hour old
}

/**
 * Helper function to get data age in minutes
 * @param {Date} timestamp - Data timestamp
 * @returns {number} Age in minutes
 */
function getDataAge(timestamp) {
  const now = new Date();
  const dataTime = new Date(timestamp);
  return Math.round((now - dataTime) / (1000 * 60));
}

/**
 * Helper function to format cached AQI response
 * @param {object} cachedData - Cached AQI data from database
 * @returns {object} Formatted response
 */
function formatCachedAQIResponse(cachedData) {
  const aqiCategory = categorizeAQI(cachedData.aqi);
  
  return {
    location: {
      name: cachedData.location.name,
      latitude: cachedData.location.latitude,
      longitude: cachedData.location.longitude,
      state: cachedData.location.state,
      stationType: cachedData.location.stationType
    },
    aqi: {
      value: cachedData.aqi,
      ...aqiCategory,
      lastUpdated: cachedData.timestamp.toISOString()
    },
    pollutants: {
      pm25: cachedData.pm25,
      pm10: cachedData.pm10,
      no2: cachedData.no2,
      so2: cachedData.so2,
      co: cachedData.co,
      o3: cachedData.o3
    },
    source: cachedData.source
  };
}

/**
 * Helper function to calculate distance between coordinates
 * @param {number} lat1 - Latitude 1
 * @param {number} lng1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lng2 - Longitude 2
 * @returns {number} Distance in km
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

module.exports = router;
