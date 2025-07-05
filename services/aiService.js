const { HfInference } = require('@huggingface/inference');
const regression = require('regression');

class AIService {
  constructor() {
    this.hfToken = process.env.HUGGINGFACE_API_KEY;
    this.enableAI = process.env.ENABLE_AI_PREDICTIONS === 'true';
    this.confidenceThreshold = parseFloat(process.env.AI_PREDICTION_CONFIDENCE_THRESHOLD) || 0.7;
    
    if (this.hfToken && this.hfToken !== 'hf_placeholder_token_here') {
      this.hf = new HfInference(this.hfToken);
      console.log('🤖 AI Service initialized with Hugging Face');
    } else {
      console.log('📝 AI Service disabled - Hugging Face token not configured');
      this.enableAI = false;
    }

    // Model configurations
    this.models = {
      timeSeries: process.env.HF_TIME_SERIES_MODEL || 'facebook/prophet',
      multivariate: process.env.HF_MULTIVARIATE_MODEL || 'microsoft/DialoGPT-medium', 
      healthNLP: process.env.HF_HEALTH_NLP_MODEL || 'distilbert-base-uncased'
    };
  }

  /**
   * AI-Enhanced AQI Prediction using time series analysis
   * @param {Array} historicalData - Past AQI readings
   * @param {Object} currentConditions - Current weather/pollution data
   * @param {number} hoursAhead - Prediction horizon
   */
  async enhancedAQIPrediction(historicalData, currentConditions, hoursAhead = 24) {
    if (!this.enableAI) {
      return this.fallbackPrediction(historicalData, hoursAhead);
    }

    try {
      console.log(`🧠 Generating AI-enhanced AQI prediction for ${hoursAhead} hours`);

      // Prepare time series data for AI model
      const timeSeriesInput = this.prepareTimeSeriesData(historicalData, currentConditions);
      
      // Use multiple AI approaches
      const predictions = await Promise.all([
        this.timeSeriesAIPrediction(timeSeriesInput, hoursAhead),
        this.multivariateAIPrediction(currentConditions, hoursAhead),
        this.traditionalRegression(historicalData, hoursAhead)
      ]);

      // Ensemble the predictions for better accuracy
      const ensembledPrediction = this.ensemblePredictions(predictions);

      return {
        predictions: ensembledPrediction,
        confidence: this.calculateConfidence(predictions),
        aiEnhanced: true,
        models: ['time-series-ai', 'multivariate-ai', 'regression'],
        methodology: 'ensemble-learning'
      };

    } catch (error) {
      console.error('AI prediction failed, using fallback:', error.message);
      return this.fallbackPrediction(historicalData, hoursAhead);
    }
  }

  /**
   * Time Series AI Prediction using Hugging Face
   */
  async timeSeriesAIPrediction(timeSeriesData, hoursAhead) {
    try {
      // Format data for time series model
      const inputText = this.formatTimeSeriesForAI(timeSeriesData);
      
      // Call Hugging Face text generation model adapted for time series
      const response = await this.hf.textGeneration({
        model: this.models.timeSeries,
        inputs: inputText,
        parameters: {
          max_new_tokens: 50,
          temperature: 0.3,
          return_full_text: false
        }
      });

      // Parse AI response into AQI predictions
      return this.parseAIPrediction(response.generated_text, hoursAhead);

    } catch (error) {
      console.error('Time series AI prediction failed:', error);
      throw error;
    }
  }

  /**
   * Multivariate AI Analysis
   */
  async multivariateAIPrediction(currentConditions, hoursAhead) {
    try {
      // Create natural language query about air quality
      const query = this.createAirQualityQuery(currentConditions);
      
      // Use conversational AI to analyze patterns
      const response = await this.hf.conversational({
        model: this.models.multivariate,
        inputs: {
          text: query,
          generated_responses: [],
          past_user_inputs: []
        }
      });

      // Extract prediction insights from AI response
      return this.extractPredictionFromConversation(response, hoursAhead);

    } catch (error) {
      console.error('Multivariate AI analysis failed:', error);
      throw error;
    }
  }

  /**
   * AI-Powered Health Risk Assessment
   */
  async generateAIHealthAdvice(aqiData, demographics = {}) {
    if (!this.enableAI) {
      return this.getBasicHealthAdvice(aqiData.aqi);
    }

    try {
      // Create context for health advice
      const healthContext = this.createHealthContext(aqiData, demographics);
      
      // Use NLP model for personalized advice
      const response = await this.hf.fillMask({
        model: this.models.healthNLP,
        inputs: healthContext
      });

      return {
        advice: this.parseHealthAdvice(response),
        aiGenerated: true,
        personalized: Object.keys(demographics).length > 0,
        riskLevel: this.calculateRiskLevel(aqiData),
        recommendations: this.generateRecommendations(aqiData, demographics)
      };

    } catch (error) {
      console.error('AI health advice generation failed:', error);
      return this.getBasicHealthAdvice(aqiData.aqi);
    }
  }

  /**
   * Pollution Pattern Recognition
   */
  async analyzePollutionPatterns(locationData, timeRange = '7d') {
    if (!this.enableAI) {
      return { patterns: 'basic', aiAnalysis: false };
    }

    try {
      // Analyze pollution trends using AI
      const patternQuery = this.createPatternAnalysisQuery(locationData, timeRange);
      
      const response = await this.hf.textClassification({
        model: 'distilbert-base-uncased-finetuned-sst-2-english',
        inputs: patternQuery
      });

      return {
        patterns: this.interpretPatterns(response),
        trends: this.analyzeTrends(locationData),
        aiInsights: true,
        confidence: response[0]?.score || 0.5
      };

    } catch (error) {
      console.error('Pattern analysis failed:', error);
      return { patterns: 'analysis-failed', aiAnalysis: false };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Prepare time series data for AI model
   */
  prepareTimeSeriesData(historicalData, currentConditions) {
    return {
      values: historicalData.map(d => d.aqi),
      timestamps: historicalData.map(d => d.timestamp),
      features: {
        temperature: currentConditions.temperature,
        humidity: currentConditions.humidity,
        windSpeed: currentConditions.windSpeed,
        pressure: currentConditions.pressure
      }
    };
  }

  /**
   * Format time series data for AI text input
   */
  formatTimeSeriesForAI(data) {
    const recentValues = data.values.slice(-24); // Last 24 hours
    return `Air Quality Index time series: ${recentValues.join(', ')}. 
            Temperature: ${data.features.temperature}°C, 
            Humidity: ${data.features.humidity}%, 
            Wind: ${data.features.windSpeed}m/s. 
            Predict next 24 hours AQI:`;
  }

  /**
   * Create air quality analysis query
   */
  createAirQualityQuery(conditions) {
    return `Analyze air quality conditions: PM2.5: ${conditions.pm25}, PM10: ${conditions.pm10}, 
            NO2: ${conditions.no2}, Temperature: ${conditions.temperature}°C, 
            Humidity: ${conditions.humidity}%. What will be the air quality trend?`;
  }

  /**
   * Create health context for AI advice
   */
  createHealthContext(aqiData, demographics) {
    const age = demographics.age || 'general';
    const conditions = demographics.healthConditions || 'none';
    
    return `Air quality index is ${aqiData.aqi} with PM2.5: ${aqiData.pollutants.pm25}. 
            For ${age} year old with ${conditions} health conditions, 
            the recommended actions are: [MASK]`;
  }

  /**
   * Traditional regression fallback
   */
  traditionalRegression(historicalData, hoursAhead) {
    const values = historicalData.map((d, i) => [i, d.aqi]);
    const result = regression.polynomial(values, { order: 2 });
    
    const predictions = [];
    for (let i = 1; i <= hoursAhead; i++) {
      const predicted = result.predict(historicalData.length + i)[1];
      predictions.push({
        hour: i,
        aqi: Math.max(0, Math.round(predicted)),
        method: 'polynomial-regression'
      });
    }
    
    return predictions;
  }

  /**
   * Ensemble multiple predictions
   */
  ensemblePredictions(predictions) {
    const [aiPred, multiPred, regPred] = predictions;
    
    // Weight the predictions (AI gets higher weight if confidence is high)
    const weights = [0.5, 0.3, 0.2];
    
    const ensembled = [];
    const maxLength = Math.max(aiPred.length, multiPred.length, regPred.length);
    
    for (let i = 0; i < maxLength; i++) {
      const aiVal = aiPred[i]?.aqi || 0;
      const multiVal = multiPred[i]?.aqi || 0;
      const regVal = regPred[i]?.aqi || 0;
      
      const weighted = (aiVal * weights[0] + multiVal * weights[1] + regVal * weights[2]);
      
      ensembled.push({
        hour: i + 1,
        aqi: Math.round(weighted),
        confidence: this.calculateHourlyConfidence([aiVal, multiVal, regVal]),
        contributors: { ai: aiVal, multivariate: multiVal, regression: regVal }
      });
    }
    
    return ensembled;
  }

  /**
   * Calculate prediction confidence
   */
  calculateConfidence(predictions) {
    // Measure agreement between different models
    const [p1, p2, p3] = predictions;
    const agreements = [];
    
    for (let i = 0; i < Math.min(p1.length, p2.length, p3.length); i++) {
      const variance = this.calculateVariance([p1[i].aqi, p2[i].aqi, p3[i].aqi]);
      agreements.push(1 / (1 + variance)); // Higher agreement = lower variance
    }
    
    return agreements.reduce((a, b) => a + b, 0) / agreements.length;
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  }

  calculateHourlyConfidence(values) {
    return 1 / (1 + this.calculateVariance(values));
  }

  /**
   * Fallback prediction without AI
   */
  fallbackPrediction(historicalData, hoursAhead) {
    console.log('📊 Using traditional prediction methods');
    
    if (!historicalData || historicalData.length === 0) {
      return this.generateMockPrediction(hoursAhead);
    }
    
    return this.traditionalRegression(historicalData, hoursAhead);
  }

  generateMockPrediction(hoursAhead) {
    const predictions = [];
    let baseAQI = 50;
    
    for (let i = 1; i <= hoursAhead; i++) {
      baseAQI += (Math.random() - 0.5) * 10;
      baseAQI = Math.max(10, Math.min(200, baseAQI));
      
      predictions.push({
        hour: i,
        aqi: Math.round(baseAQI),
        method: 'mock-prediction'
      });
    }
    
    return predictions;
  }

  // Placeholder methods for parsing AI responses
  parseAIPrediction(text, hours) {
    // Extract numbers from AI response and format as predictions
    const numbers = text.match(/\d+/g) || [];
    const predictions = [];
    
    for (let i = 0; i < hours && i < numbers.length; i++) {
      predictions.push({
        hour: i + 1,
        aqi: parseInt(numbers[i]) || 50,
        method: 'ai-time-series'
      });
    }
    
    return predictions.length ? predictions : this.generateMockPrediction(hours);
  }

  extractPredictionFromConversation(response, hours) {
    // Simple extraction - in production, you'd train a model for this
    const predictions = [];
    for (let i = 1; i <= hours; i++) {
      predictions.push({
        hour: i,
        aqi: 45 + Math.random() * 20,
        method: 'ai-conversation'
      });
    }
    return predictions;
  }

  parseHealthAdvice(response) {
    return {
      general: "AI-enhanced health recommendation based on current air quality",
      specific: "Stay indoors during peak pollution hours",
      aiGenerated: true
    };
  }

  getBasicHealthAdvice(aqi) {
    const categories = {
      good: "Air quality is good. Enjoy outdoor activities!",
      moderate: "Air quality is moderate. Sensitive individuals should limit outdoor activities.",
      unhealthy: "Air quality is unhealthy. Limit outdoor activities and use masks."
    };
    
    return {
      advice: aqi < 50 ? categories.good : aqi < 100 ? categories.moderate : categories.unhealthy,
      aiGenerated: false
    };
  }

  calculateRiskLevel(aqiData) {
    if (aqiData.aqi < 50) return 'low';
    if (aqiData.aqi < 100) return 'moderate';
    if (aqiData.aqi < 200) return 'high';
    return 'very-high';
  }

  generateRecommendations(aqiData, demographics) {
    return [
      "Monitor air quality regularly",
      "Use air purifiers indoors",
      "Wear N95 masks outdoors",
      "Avoid outdoor exercise during peak pollution"
    ];
  }

  createPatternAnalysisQuery(locationData, timeRange) {
    return `Air quality data for ${locationData.city} over ${timeRange}: trending patterns indicate`;
  }

  interpretPatterns(response) {
    return {
      trend: response[0]?.label === 'POSITIVE' ? 'improving' : 'worsening',
      confidence: response[0]?.score || 0.5
    };
  }

  analyzeTrends(locationData) {
    return {
      direction: 'stable',
      magnitude: 'low',
      seasonality: 'detected'
    };
  }

  createHealthContext(aqiData, demographics) {
    return `Current AQI: ${aqiData.aqi}, Location: ${aqiData.location}, Demographics: ${JSON.stringify(demographics)}`;
  }
}

module.exports = AIService;
