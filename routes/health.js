const express = require('express');
const router = express.Router();
const { formatResponse, categorizeAQI, getHealthAdvice } = require('../utils/helpers');

/**
 * GET /api/health-advice
 * Get health recommendations based on AQI level
 * Query params: aqi (required), category (optional)
 */
router.get('/', async (req, res) => {
  try {
    const { aqi, category } = req.query;

    // Validate required parameters
    if (!aqi) {
      return res.status(400).json(
        formatResponse(false, null, 'AQI parameter is required')
      );
    }

    const aqiValue = parseInt(aqi);
    if (isNaN(aqiValue) || aqiValue < 0 || aqiValue > 1000) {
      return res.status(400).json(
        formatResponse(false, null, 'AQI must be a number between 0 and 1000')
      );
    }

    // Get AQI category if not provided
    const aqiCategory = category || categorizeAQI(aqiValue);
    const categoryKey = typeof aqiCategory === 'object' ? aqiCategory.category : aqiCategory;
    
    // Get health advice
    const healthAdvice = getHealthAdvice(categoryKey);
    
    // Determine risk level
    const riskLevel = getRiskLevel(aqiValue);
    
    // Get specific recommendations based on AQI level
    const specificRecommendations = getSpecificRecommendations(aqiValue);

    const response = {
      aqi: aqiValue,
      category: categoryKey,
      categoryInfo: typeof aqiCategory === 'object' ? aqiCategory : categorizeAQI(aqiValue),
      riskLevel: riskLevel,
      advice: healthAdvice,
      specificRecommendations: specificRecommendations,
      vulnerableGroups: getVulnerableGroupAdvice(aqiValue),
      protectiveMeasures: getProtectiveMeasures(aqiValue)
    };

    res.json(
      formatResponse(true, response, 'Health advice generated successfully', {
        aqiLevel: categoryKey,
        riskLevel: riskLevel
      })
    );

  } catch (error) {
    console.error('Error in health advice endpoint:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to generate health advice', {
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      })
    );
  }
});

/**
 * GET /api/health-advice/bulk
 * Get health advice for multiple AQI values
 * Request body: { aqiValues: [number] }
 */
router.post('/bulk', async (req, res) => {
  try {
    const { aqiValues } = req.body;

    if (!aqiValues || !Array.isArray(aqiValues)) {
      return res.status(400).json(
        formatResponse(false, null, 'aqiValues must be an array of numbers')
      );
    }

    if (aqiValues.length === 0 || aqiValues.length > 50) {
      return res.status(400).json(
        formatResponse(false, null, 'aqiValues array must contain 1-50 values')
      );
    }

    const results = aqiValues.map(aqi => {
      const aqiValue = parseInt(aqi);
      if (isNaN(aqiValue) || aqiValue < 0 || aqiValue > 1000) {
        return {
          aqi: aqi,
          error: 'Invalid AQI value'
        };
      }

      const aqiCategory = categorizeAQI(aqiValue);
      const healthAdvice = getHealthAdvice(aqiCategory.category);
      
      return {
        aqi: aqiValue,
        category: aqiCategory.category,
        label: aqiCategory.label,
        riskLevel: getRiskLevel(aqiValue),
        advice: {
          general: healthAdvice.general,
          sensitive: healthAdvice.sensitive
        }
      };
    });

    res.json(
      formatResponse(true, results, `Health advice generated for ${results.length} AQI values`)
    );

  } catch (error) {
    console.error('Error in bulk health advice endpoint:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to generate bulk health advice')
    );
  }
});

/**
 * GET /api/health-advice/categories
 * Get all AQI categories with their health implications
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      'GOOD', 'SATISFACTORY', 'MODERATE', 'POOR', 'VERY_POOR', 'SEVERE'
    ];

    const categoryInfo = categories.map(category => {
      const sampleAQI = getSampleAQI(category);
      const aqiCategory = categorizeAQI(sampleAQI);
      const healthAdvice = getHealthAdvice(category);

      return {
        category: category,
        label: aqiCategory.label,
        color: aqiCategory.color,
        range: getAQIRange(category),
        riskLevel: getRiskLevel(sampleAQI),
        healthImplications: healthAdvice,
        protectiveMeasures: getProtectiveMeasures(sampleAQI)
      };
    });

    res.json(
      formatResponse(true, categoryInfo, 'AQI categories and health information retrieved')
    );

  } catch (error) {
    console.error('Error in categories endpoint:', error);
    res.status(500).json(
      formatResponse(false, null, 'Failed to retrieve category information')
    );
  }
});

/**
 * Determine risk level based on AQI value
 * @param {number} aqi - AQI value
 * @returns {string} Risk level
 */
function getRiskLevel(aqi) {
  if (aqi <= 50) return 'low';
  if (aqi <= 100) return 'low';
  if (aqi <= 200) return 'medium';
  if (aqi <= 300) return 'high';
  if (aqi <= 400) return 'very_high';
  return 'hazardous';
}

/**
 * Get specific recommendations based on AQI level
 * @param {number} aqi - AQI value
 * @returns {object} Specific recommendations
 */
function getSpecificRecommendations(aqi) {
  const recommendations = {
    outdoor: [],
    indoor: [],
    health: [],
    travel: []
  };

  if (aqi <= 50) {
    recommendations.outdoor = ['Perfect for all outdoor activities', 'Ideal time for exercise and sports'];
    recommendations.indoor = ['Natural ventilation recommended', 'Windows can be kept open'];
    recommendations.health = ['No health precautions needed', 'Enjoy fresh air activities'];
    recommendations.travel = ['All outdoor travel is safe'];
  } else if (aqi <= 100) {
    recommendations.outdoor = ['Generally safe for outdoor activities', 'Sensitive individuals should monitor symptoms'];
    recommendations.indoor = ['Good air circulation recommended', 'Air purifiers beneficial for sensitive individuals'];
    recommendations.health = ['Unusually sensitive people may experience minor symptoms'];
    recommendations.travel = ['Travel is generally safe for all'];
  } else if (aqi <= 200) {
    recommendations.outdoor = ['Limit prolonged outdoor exertion', 'Consider indoor alternatives for exercise'];
    recommendations.indoor = ['Keep windows closed during peak pollution hours', 'Use air purifiers if available'];
    recommendations.health = ['People with respiratory conditions should limit outdoor exposure'];
    recommendations.travel = ['Consider avoiding peak traffic hours', 'Use air-conditioned transport when possible'];
  } else if (aqi <= 300) {
    recommendations.outdoor = ['Avoid outdoor activities', 'Cancel outdoor sports and events'];
    recommendations.indoor = ['Stay indoors as much as possible', 'Use air purifiers continuously'];
    recommendations.health = ['Wear N95 masks when going outside', 'People with heart/lung conditions should stay indoors'];
    recommendations.travel = ['Postpone non-essential travel', 'Use masks in public transport'];
  } else if (aqi <= 400) {
    recommendations.outdoor = ['Avoid all outdoor activities', 'Stay indoors with air purification'];
    recommendations.indoor = ['Seal windows and doors', 'Run air purifiers on high setting'];
    recommendations.health = ['Everyone should wear N95/N99 masks outside', 'Seek medical attention if experiencing symptoms'];
    recommendations.travel = ['Avoid all non-essential travel', 'Emergency travel only with proper protection'];
  } else {
    recommendations.outdoor = ['Emergency conditions - stay indoors', 'Do not go outside unless absolutely necessary'];
    recommendations.indoor = ['Create a clean air room', 'Multiple air purifiers recommended'];
    recommendations.health = ['Health emergency - serious effects for everyone', 'Immediate medical attention for any symptoms'];
    recommendations.travel = ['Emergency travel only', 'Full respiratory protection required'];
  }

  return recommendations;
}

/**
 * Get advice for vulnerable groups
 * @param {number} aqi - AQI value
 * @returns {object} Vulnerable group advice
 */
function getVulnerableGroupAdvice(aqi) {
  return {
    children: getGroupAdvice(aqi, 'children'),
    elderly: getGroupAdvice(aqi, 'elderly'),
    pregnant: getGroupAdvice(aqi, 'pregnant'),
    respiratory: getGroupAdvice(aqi, 'respiratory'),
    heart: getGroupAdvice(aqi, 'heart')
  };
}

/**
 * Get advice for specific vulnerable group
 * @param {number} aqi - AQI value
 * @param {string} group - Vulnerable group
 * @returns {string} Group-specific advice
 */
function getGroupAdvice(aqi, group) {
  const advice = {
    children: {
      good: 'Perfect for outdoor play and activities',
      moderate: 'Limit intense outdoor activities, watch for symptoms',
      poor: 'Keep indoors, avoid outdoor play',
      severe: 'Stay indoors completely, seek medical help if symptoms develop'
    },
    elderly: {
      good: 'Safe for all activities',
      moderate: 'Monitor health, limit strenuous outdoor activities',
      poor: 'Stay indoors, avoid physical exertion',
      severe: 'Complete indoor isolation, immediate medical attention for symptoms'
    },
    pregnant: {
      good: 'Safe for normal activities',
      moderate: 'Reduce outdoor exposure, monitor wellbeing',
      poor: 'Minimize outdoor time, use air purifiers',
      severe: 'Stay indoors, consult healthcare provider'
    },
    respiratory: {
      good: 'Normal activities with regular medication',
      moderate: 'Have rescue inhaler ready, limit outdoor time',
      poor: 'Stay indoors, increase medication as prescribed',
      severe: 'Emergency protocols, immediate medical care if symptoms worsen'
    },
    heart: {
      good: 'Normal activities and exercise',
      moderate: 'Reduce intensity of physical activities',
      poor: 'Avoid physical exertion, stay indoors',
      severe: 'Complete rest, emergency medical care for chest symptoms'
    }
  };

  let level = 'good';
  if (aqi > 100) level = 'moderate';
  if (aqi > 200) level = 'poor';
  if (aqi > 300) level = 'severe';

  return advice[group]?.[level] || 'Consult healthcare provider for specific advice';
}

/**
 * Get protective measures for AQI level
 * @param {number} aqi - AQI value
 * @returns {object} Protective measures
 */
function getProtectiveMeasures(aqi) {
  const measures = {
    masks: [],
    airPurifiers: [],
    windows: '',
    ventilation: '',
    plants: []
  };

  if (aqi <= 100) {
    measures.masks = ['Not necessary for general population'];
    measures.windows = 'Can be kept open for natural ventilation';
    measures.ventilation = 'Natural air circulation is beneficial';
    measures.plants = ['Indoor plants can help improve air quality'];
  } else if (aqi <= 200) {
    measures.masks = ['N95 masks for sensitive individuals when outdoors'];
    measures.airPurifiers = ['HEPA air purifiers recommended'];
    measures.windows = 'Close during peak pollution hours (usually evening)';
    measures.ventilation = 'Use mechanical ventilation when possible';
    measures.plants = ['Spider plants', 'Peace lilies', 'Snake plants'];
  } else if (aqi <= 300) {
    measures.masks = ['N95 masks mandatory for all outdoor activities'];
    measures.airPurifiers = ['HEPA air purifiers on high setting', 'Consider multiple units'];
    measures.windows = 'Keep all windows and doors closed';
    measures.ventilation = 'Avoid natural ventilation, use air conditioning';
    measures.plants = ['Increase indoor plants for air purification'];
  } else {
    measures.masks = ['N95/N99 masks essential', 'P100 masks for extended exposure'];
    measures.airPurifiers = ['Industrial-grade air purifiers', 'Multiple HEPA units per room'];
    measures.windows = 'Seal all openings to prevent outdoor air entry';
    measures.ventilation = 'Complete isolation from outdoor air';
    measures.plants = ['Maximize indoor plants but ensure proper care'];
  }

  return measures;
}

/**
 * Get sample AQI value for a category
 * @param {string} category - AQI category
 * @returns {number} Sample AQI value
 */
function getSampleAQI(category) {
  const samples = {
    'GOOD': 25,
    'SATISFACTORY': 75,
    'MODERATE': 150,
    'POOR': 250,
    'VERY_POOR': 350,
    'SEVERE': 450
  };
  return samples[category] || 100;
}

/**
 * Get AQI range for a category
 * @param {string} category - AQI category
 * @returns {object} AQI range
 */
function getAQIRange(category) {
  const ranges = {
    'GOOD': { min: 0, max: 50 },
    'SATISFACTORY': { min: 51, max: 100 },
    'MODERATE': { min: 101, max: 200 },
    'POOR': { min: 201, max: 300 },
    'VERY_POOR': { min: 301, max: 400 },
    'SEVERE': { min: 401, max: 500 }
  };
  return ranges[category] || { min: 0, max: 500 };
}

module.exports = router;
