const express = require('express');
const router = express.Router();
const RealAQIService = require('../services/realAqiService');
const AIService = require('../services/aiService');
const DatabaseService = require('../services/databaseService');
const { formatResponse, categorizeAQI } = require('../utils/helpers');

const aqiService = new RealAQIService();
const aiService = new AIService();
const dbService = new DatabaseService();

/**
 * GET /api/ai-forecast
 * Get AI-enhanced AQI predictions using Hugging Face models
 * Query params: lat, lng, hours (optional), includeAI (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { lat, lng, hours = 24, includeAI = 'true', demographics } = req.query;

    // Validate parameters
    if (!lat && !lng) {
      return res.status(400).json(
        formatResponse(false, null, 'Coordinates (lat, lng) are required')
      );
    }

    // Validate hours parameter
    const forecastHours = parseInt(hours);
    if (isNaN(forecastHours) || forecastHours < 1 || forecastHours > 120) {
      return res.status(400).json(
        formatResponse(false, null, 'Hours must be between 1 and 120')
      );
    }

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json(
        formatResponse(false, null, 'Invalid coordinates provided')
      );
    }

    console.log(`🤖 Generating AI-enhanced forecast for (${latitude}, ${longitude}), ${forecastHours} hours`);

    // Get current conditions
    const currentData = await aqiService.fetchRealTimeAQI(latitude, longitude);
    
    // Get historical data for AI training
    const historicalData = await dbService.getHistoricalData(latitude, longitude, 168); // 7 days
    
    // Get traditional forecast as baseline
    const traditionalForecast = await aqiService.fetchForecastData(latitude, longitude, forecastHours);

    let aiEnhancedData = null;
    let aiHealthAdvice = null;
    let aiPatterns = null;

    // Add AI enhancements if enabled
    if (includeAI === 'true') {
      try {
        // AI-enhanced predictions
        aiEnhancedData = await aiService.enhancedAQIPrediction(
          historicalData, 
          currentData.data, 
          forecastHours
        );

        // AI health recommendations
        const demographicsData = demographics ? JSON.parse(demographics) : {};
        aiHealthAdvice = await aiService.generateAIHealthAdvice(
          currentData.data, 
          demographicsData
        );

        // Pollution pattern analysis
        aiPatterns = await aiService.analyzePollutionPatterns(
          { city: currentData.data.location.name, lat: latitude, lng: longitude },
          '7d'
        );

      } catch (aiError) {
        console.error('AI enhancement failed:', aiError.message);
        // Continue with traditional forecast
      }
    }

    // Combine traditional + AI predictions
    const enhancedForecast = combineForecasts(traditionalForecast.data, aiEnhancedData);

    // Format response
    const response = {
      location: {
        name: currentData.data.location.name || `Location ${latitude}, ${longitude}`,
        latitude,
        longitude,
        country: currentData.data.location.country || 'Unknown'
      },
      currentConditions: {
        aqi: currentData.data.aqi.value,
        category: currentData.data.aqi.category,
        pollutants: currentData.data.pollutants,
        timestamp: new Date().toISOString()
      },
      forecastPeriod: {
        hours: forecastHours,
        from: new Date().toISOString(),
        to: new Date(Date.now() + forecastHours * 60 * 60 * 1000).toISOString()
      },
      predictions: enhancedForecast,
      aiEnhancements: {
        enabled: includeAI === 'true' && aiEnhancedData !== null,
        confidence: aiEnhancedData?.confidence || null,
        methodology: aiEnhancedData?.methodology || 'traditional-only',
        models: aiEnhancedData?.models || ['baseline']
      },
      healthAdvice: aiHealthAdvice || getBasicHealthAdvice(currentData.data.aqi.value),
      patterns: aiPatterns || { detected: false, reason: 'AI disabled or failed' },
      summary: generateForecastSummary(enhancedForecast),
      dataSource: 'combined-ai-real-data',
      isRealData: true,
      generatedAt: new Date().toISOString()
    };

    // Cache the AI prediction for future use
    if (aiEnhancedData) {
      try {
        await dbService.saveAIPrediction(latitude, longitude, aiEnhancedData);
      } catch (saveError) {
        console.error('Failed to save AI prediction:', saveError);
      }
    }

    res.json(formatResponse(true, response, 'AI-enhanced forecast generated successfully'));

  } catch (error) {
    console.error('AI forecast generation failed:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to generate AI forecast', {
        error: error.message,
        fallback: 'Use /api/forecast for traditional predictions'
      })
    );
  }
});

/**
 * GET /api/ai-health
 * Get AI-powered personalized health recommendations
 */
router.get('/health', async (req, res) => {
  try {
    const { lat, lng, age, healthConditions, activity } = req.query;

    if (!lat || !lng) {
      return res.status(400).json(
        formatResponse(false, null, 'Coordinates are required')
      );
    }

    // Get current AQI data
    const currentData = await aqiService.fetchRealTimeAQI(parseFloat(lat), parseFloat(lng));

    // Prepare demographics
    const demographics = {
      age: age ? parseInt(age) : undefined,
      healthConditions: healthConditions ? healthConditions.split(',') : [],
      plannedActivity: activity || 'general'
    };

    // Get AI health advice
    const aiAdvice = await aiService.generateAIHealthAdvice(currentData.data, demographics);

    res.json(formatResponse(true, {
      location: currentData.data.location,
      currentAQI: currentData.data.aqi,
      healthAdvice: aiAdvice,
      recommendations: generatePersonalizedRecommendations(currentData.data, demographics),
      riskAssessment: calculatePersonalizedRisk(currentData.data, demographics)
    }, 'AI health recommendations generated'));

  } catch (error) {
    console.error('AI health advice failed:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to generate AI health advice')
    );
  }
});

/**
 * GET /api/ai-patterns
 * Analyze pollution patterns using AI
 */
router.get('/patterns', async (req, res) => {
  try {
    const { lat, lng, timeRange = '7d' } = req.query;

    if (!lat || !lng) {
      return res.status(400).json(
        formatResponse(false, null, 'Coordinates are required')
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Get location data
    const locationData = {
      lat: latitude,
      lng: longitude,
      city: 'Unknown Location'
    };

    // Get historical data for pattern analysis
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
    const historicalData = await dbService.getHistoricalData(latitude, longitude, days * 24);

    // Analyze patterns with AI
    const patterns = await aiService.analyzePollutionPatterns(locationData, timeRange);

    res.json(formatResponse(true, {
      location: locationData,
      timeRange,
      patterns,
      historicalSummary: summarizeHistoricalData(historicalData),
      insights: generatePatternInsights(patterns, historicalData)
    }, 'Pollution patterns analyzed'));

  } catch (error) {
    console.error('Pattern analysis failed:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to analyze pollution patterns')
    );
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function combineForecasts(traditionalForecast, aiPrediction) {
  if (!aiPrediction || !aiPrediction.predictions) {
    return traditionalForecast.forecast.map(point => ({
      ...point,
      aiEnhanced: false,
      confidence: 0.7,
      method: 'traditional-only'
    }));
  }

  // Merge traditional and AI predictions
  return traditionalForecast.forecast.map((point, index) => {
    const aiPoint = aiPrediction.predictions[index];
    
    if (aiPoint) {
      // Weighted combination of traditional and AI
      const weightAI = 0.6;
      const weightTraditional = 0.4;
      
      const combinedAQI = Math.round(
        (aiPoint.aqi * weightAI) + (point.predictedAqi * weightTraditional)
      );

      return {
        ...point,
        predictedAqi: combinedAQI,
        aiEnhanced: true,
        confidence: aiPoint.confidence || 0.8,
        method: 'ai-enhanced',
        breakdown: {
          traditional: point.predictedAqi,
          ai: aiPoint.aqi,
          final: combinedAQI
        }
      };
    }

    return {
      ...point,
      aiEnhanced: false,
      confidence: 0.7,
      method: 'traditional-fallback'
    };
  });
}

function getBasicHealthAdvice(aqi) {
  if (aqi <= 50) {
    return {
      general: "Air quality is good. Perfect for outdoor activities!",
      recommendations: ["Enjoy outdoor exercise", "Open windows for fresh air"],
      aiGenerated: false
    };
  } else if (aqi <= 100) {
    return {
      general: "Air quality is moderate. Some people may experience minor irritation.",
      recommendations: ["Sensitive individuals should limit prolonged outdoor exertion"],
      aiGenerated: false
    };
  } else {
    return {
      general: "Air quality is unhealthy. Limit outdoor activities.",
      recommendations: ["Wear masks outdoors", "Use air purifiers indoors", "Avoid outdoor exercise"],
      aiGenerated: false
    };
  }
}

function generateForecastSummary(predictions) {
  const aqiValues = predictions.map(p => p.predictedAqi);
  const avgAQI = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);
  const maxAQI = Math.max(...aqiValues);
  const minAQI = Math.min(...aqiValues);

  return {
    averageAQI: avgAQI,
    maxAQI,
    minAQI,
    trend: maxAQI - minAQI > 20 ? 'variable' : 'stable',
    aiEnhanced: predictions.some(p => p.aiEnhanced),
    overallCategory: categorizeAQI(avgAQI).category
  };
}

function generatePersonalizedRecommendations(aqiData, demographics) {
  const recommendations = [];

  if (demographics.age && demographics.age > 65) {
    recommendations.push("Seniors should take extra precautions in current air quality");
  }

  if (demographics.healthConditions.includes('asthma')) {
    recommendations.push("Keep rescue inhaler readily available");
  }

  if (demographics.plannedActivity === 'running') {
    if (aqiData.aqi.value > 100) {
      recommendations.push("Consider indoor exercise instead of outdoor running");
    }
  }

  return recommendations;
}

function calculatePersonalizedRisk(aqiData, demographics) {
  let baseRisk = aqiData.aqi.value > 100 ? 'elevated' : 'normal';
  
  if (demographics.age > 65 || demographics.healthConditions.length > 0) {
    baseRisk = baseRisk === 'elevated' ? 'high' : 'elevated';
  }

  return {
    level: baseRisk,
    factors: demographics.healthConditions,
    ageConsideration: demographics.age > 65
  };
}

function summarizeHistoricalData(historicalData) {
  if (!historicalData || historicalData.length === 0) {
    return { available: false };
  }

  const aqiValues = historicalData.map(d => d.aqi);
  return {
    available: true,
    dataPoints: historicalData.length,
    averageAQI: Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length),
    maxAQI: Math.max(...aqiValues),
    minAQI: Math.min(...aqiValues)
  };
}

function generatePatternInsights(patterns, historicalData) {
  return {
    trendDirection: patterns.patterns?.trend || 'unknown',
    confidence: patterns.confidence || 0.5,
    aiAnalysisAvailable: patterns.aiInsights || false,
    dataQuality: historicalData && historicalData.length > 24 ? 'good' : 'limited'
  };
}

module.exports = router;
