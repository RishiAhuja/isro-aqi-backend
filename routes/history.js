const express = require('express');
const router = express.Router();
const DatabaseService = require('../services/databaseService');
const { formatResponse } = require('../utils/helpers');

const dbService = new DatabaseService();

/**
 * GET /api/history
 * Get historical AQI data for a location
 * Query params: city, days (optional), aggregation (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { city, days = 7, aggregation = 'daily' } = req.query;

    // Validate required parameters
    if (!city) {
      return res.status(400).json(
        formatResponse(false, null, 'City parameter is required')
      );
    }

    // Validate optional parameters
    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 90) {
      return res.status(400).json(
        formatResponse(false, null, 'Days must be between 1 and 90')
      );
    }

    if (!['daily', 'hourly'].includes(aggregation)) {
      return res.status(400).json(
        formatResponse(false, null, 'Aggregation must be either "daily" or "hourly"')
      );
    }

    // Get historical data
    const historicalData = await dbService.getHistoricalAQI(city, numDays, aggregation);

    if (historicalData.length === 0) {
      // Generate mock historical data if no real data exists
      const mockData = generateMockHistoricalData(city, numDays, aggregation);
      
      return res.json(
        formatResponse(true, {
          location: city,
          period: {
            from: new Date(Date.now() - numDays * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
            days: numDays
          },
          aggregation: aggregation,
          trends: mockData.trends,
          summary: mockData.summary,
          isRealData: false
        }, 'Historical data generated (mock data)', {
          dataSource: 'mock',
          recordCount: mockData.trends.length
        })
      );
    }

    // Calculate summary statistics
    const summary = calculateSummary(historicalData);

    // Format the response
    const response = {
      location: city,
      period: {
        from: new Date(Date.now() - numDays * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
        days: numDays
      },
      aggregation: aggregation,
      trends: historicalData.map(item => ({
        [aggregation === 'daily' ? 'date' : 'hour']: aggregation === 'daily' 
          ? item.date.toISOString().split('T')[0]
          : item.hour.toISOString(),
        avgAqi: item.avgAqi,
        maxAqi: item.maxAqi,
        minAqi: item.minAqi,
        category: item.category,
        dataPoints: parseInt(item.dataPoints)
      })),
      summary,
      isRealData: true
    };

    res.json(
      formatResponse(true, response, 'Historical data retrieved successfully', {
        dataSource: 'database',
        recordCount: historicalData.length
      })
    );

  } catch (error) {
    console.error('Error in history endpoint:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to retrieve historical data', {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    );
  }
});

/**
 * GET /api/history/summary
 * Get summary statistics for a city over a period
 * Query params: city, days (optional)
 */
router.get('/summary', async (req, res) => {
  try {
    const { city, days = 30 } = req.query;

    if (!city) {
      return res.status(400).json(
        formatResponse(false, null, 'City parameter is required')
      );
    }

    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json(
        formatResponse(false, null, 'Days must be between 1 and 365')
      );
    }

    const historicalData = await dbService.getHistoricalAQI(city, numDays, 'daily');
    
    if (historicalData.length === 0) {
      const mockSummary = generateMockSummary(city, numDays);
      return res.json(
        formatResponse(true, {
          location: city,
          period: {
            days: numDays,
            from: new Date(Date.now() - numDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
          },
          summary: mockSummary,
          isRealData: false
        }, 'Summary generated (mock data)')
      );
    }

    const summary = calculateDetailedSummary(historicalData);

    res.json(
      formatResponse(true, {
        location: city,
        period: {
          days: numDays,
          from: new Date(Date.now() - numDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          to: new Date().toISOString().split('T')[0]
        },
        summary,
        isRealData: true
      }, 'Summary statistics retrieved successfully')
    );

  } catch (error) {
    console.error('Error in history summary endpoint:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to retrieve summary data')
    );
  }
});

/**
 * Generate mock historical data for development/testing
 * @param {string} city - City name
 * @param {number} days - Number of days
 * @param {string} aggregation - 'daily' or 'hourly'
 * @returns {object} Mock historical data
 */
function generateMockHistoricalData(city, days, aggregation) {
  const trends = [];
  const now = new Date();
  
  // Base AQI for different cities
  const cityBaseAQI = {
    'delhi': 180,
    'mumbai': 120,
    'bangalore': 100,
    'chennai': 110,
    'kolkata': 150,
    'hyderabad': 130,
    'pune': 115,
    'ahmedabad': 125
  };

  const baseAQI = cityBaseAQI[city.toLowerCase()] || 130;
  const hoursToGenerate = aggregation === 'daily' ? days : days * 24;
  const interval = aggregation === 'daily' ? 24 : 1;

  for (let i = hoursToGenerate - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * interval * 60 * 60 * 1000);
    
    // Add some variation and trends
    const variation = Math.sin(i / 7) * 20 + Math.random() * 40 - 20;
    const avgAqi = Math.max(10, Math.min(450, Math.round(baseAQI + variation)));
    const minAqi = Math.max(5, avgAqi - 15 - Math.random() * 10);
    const maxAqi = Math.min(500, avgAqi + 15 + Math.random() * 15);

    trends.push({
      [aggregation === 'daily' ? 'date' : 'hour']: aggregation === 'daily' 
        ? timestamp.toISOString().split('T')[0]
        : timestamp.toISOString(),
      avgAqi: Math.round(avgAqi),
      maxAqi: Math.round(maxAqi),
      minAqi: Math.round(minAqi),
      category: getAQICategory(avgAqi),
      dataPoints: aggregation === 'daily' ? 24 : 1
    });
  }

  const summary = calculateSummary(trends);
  return { trends, summary };
}

/**
 * Generate mock summary for a city
 * @param {string} city - City name
 * @param {number} days - Number of days
 * @returns {object} Mock summary
 */
function generateMockSummary(city, days) {
  const mockData = generateMockHistoricalData(city, days, 'daily');
  return calculateDetailedSummary(mockData.trends);
}

/**
 * Calculate summary statistics from historical data
 * @param {array} data - Historical data array
 * @returns {object} Summary statistics
 */
function calculateSummary(data) {
  if (data.length === 0) return {};

  const aqiValues = data.map(item => item.avgAqi);
  const avgAqi = Math.round(aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length);
  
  // Calculate trend direction
  const firstHalf = aqiValues.slice(0, Math.floor(aqiValues.length / 2));
  const secondHalf = aqiValues.slice(Math.floor(aqiValues.length / 2));
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  let trendDirection = 'stable';
  if (secondAvg > firstAvg + 5) trendDirection = 'increasing';
  else if (secondAvg < firstAvg - 5) trendDirection = 'decreasing';

  // Find most common category
  const categories = data.map(item => item.category);
  const categoryCount = categories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const mostCommonCategory = Object.keys(categoryCount).reduce((a, b) => 
    categoryCount[a] > categoryCount[b] ? a : b
  );

  return {
    avgAqi,
    maxAqi: Math.max(...aqiValues),
    minAqi: Math.min(...aqiValues),
    trendDirection,
    mostCommonCategory,
    totalDataPoints: data.reduce((sum, item) => sum + (item.dataPoints || 1), 0)
  };
}

/**
 * Calculate detailed summary statistics
 * @param {array} data - Historical data array
 * @returns {object} Detailed summary
 */
function calculateDetailedSummary(data) {
  const basic = calculateSummary(data);
  
  // Category distribution
  const categories = data.map(item => item.category);
  const categoryDistribution = categories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Convert counts to percentages
  Object.keys(categoryDistribution).forEach(cat => {
    categoryDistribution[cat] = Math.round((categoryDistribution[cat] / categories.length) * 100);
  });

  // Days above threshold
  const aqiValues = data.map(item => item.avgAqi);
  const daysAbove100 = aqiValues.filter(aqi => aqi > 100).length;
  const daysAbove200 = aqiValues.filter(aqi => aqi > 200).length;
  const daysAbove300 = aqiValues.filter(aqi => aqi > 300).length;

  return {
    ...basic,
    categoryDistribution,
    thresholdExceedance: {
      daysAbove100,
      daysAbove200,
      daysAbove300,
      percentAbove100: Math.round((daysAbove100 / data.length) * 100),
      percentAbove200: Math.round((daysAbove200 / data.length) * 100),
      percentAbove300: Math.round((daysAbove300 / data.length) * 100)
    }
  };
}

/**
 * Get AQI category from value
 * @param {number} aqi - AQI value
 * @returns {string} AQI category
 */
function getAQICategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

module.exports = router;
