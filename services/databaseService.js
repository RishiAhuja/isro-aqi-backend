const { PrismaClient } = require('../generated/prisma');
const { categorizeAQI } = require('../utils/helpers');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Save AQI data to database
   * @param {object} aqiData - AQI data to save
   * @returns {Promise<object>} Saved AQI log
   */
  async saveAQIData(aqiData) {
    try {
      // First, ensure location exists or create it
      const location = await this.upsertLocation(aqiData.location);

      // Save AQI log
      const aqiLog = await this.prisma.aQILog.create({
        data: {
          locationId: location.id,
          aqi: aqiData.aqi.value,
          category: aqiData.aqi.category,
          pm25: aqiData.pollutants.pm25,
          pm10: aqiData.pollutants.pm10,
          no2: aqiData.pollutants.no2,
          so2: aqiData.pollutants.so2,
          co: aqiData.pollutants.co,
          o3: aqiData.pollutants.o3,
          source: aqiData.source,
          timestamp: new Date(aqiData.aqi.lastUpdated)
        },
        include: {
          location: true
        }
      });

      return aqiLog;
    } catch (error) {
      console.error('Error saving AQI data:', error);
      throw new Error('Failed to save AQI data to database');
    }
  }

  /**
   * Create or update location
   * @param {object} locationData - Location information
   * @returns {Promise<object>} Location record
   */
  async upsertLocation(locationData) {
    try {
      return await this.prisma.location.upsert({
        where: {
          latitude_longitude: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          }
        },
        update: {
          name: locationData.name,
          state: locationData.state,
          stationType: locationData.stationType,
          updatedAt: new Date()
        },
        create: {
          name: locationData.name,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          state: locationData.state,
          stationType: locationData.stationType,
          country: 'India'
        }
      });
    } catch (error) {
      console.error('Error upserting location:', error);
      throw new Error('Failed to save location data');
    }
  }

  /**
   * Get latest AQI data for a location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in km
   * @returns {Promise<object|null>} Latest AQI data
   */
  async getLatestAQI(lat, lng, radius = 10) {
    try {
      // Find locations within radius using raw SQL for distance calculation
      const locations = await this.prisma.$queryRaw`
        SELECT id, name, latitude, longitude, state, "stationType"
        FROM locations 
        WHERE (
          6371 * acos(
            cos(radians(${lat})) 
            * cos(radians(latitude)) 
            * cos(radians(longitude) - radians(${lng})) 
            + sin(radians(${lat})) 
            * sin(radians(latitude))
          )
        ) <= ${radius}
        AND "isActive" = true
        ORDER BY (
          6371 * acos(
            cos(radians(${lat})) 
            * cos(radians(latitude)) 
            * cos(radians(longitude) - radians(${lng})) 
            + sin(radians(${lat})) 
            * sin(radians(latitude))
          )
        ) ASC
        LIMIT 1
      `;

      if (locations.length === 0) {
        return null;
      }

      const location = locations[0];

      // Get latest AQI data for this location
      const latestAQI = await this.prisma.aQILog.findFirst({
        where: {
          locationId: location.id
        },
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          location: true
        }
      });

      return latestAQI;
    } catch (error) {
      console.error('Error getting latest AQI:', error);
      return null;
    }
  }

  /**
   * Get historical AQI data for a location
   * @param {string} cityName - City name
   * @param {number} days - Number of days to look back
   * @param {string} aggregation - 'hourly' or 'daily'
   * @returns {Promise<array>} Historical AQI data
   */
  async getHistoricalAQI(cityName, days = 7, aggregation = 'daily') {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      if (aggregation === 'daily') {
        // Daily aggregation using Prisma query
        const results = await this.prisma.aQILog.findMany({
          where: {
            location: {
              name: {
                contains: cityName,
                mode: 'insensitive'
              }
            },
            timestamp: {
              gte: startDate
            }
          },
          include: {
            location: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        });

        // Group by date and calculate daily aggregations
        const dailyData = {};
        results.forEach(record => {
          const date = record.timestamp.toISOString().split('T')[0];
          if (!dailyData[date]) {
            dailyData[date] = {
              date: new Date(date),
              aqiValues: [],
              categories: []
            };
          }
          dailyData[date].aqiValues.push(record.aqi);
          dailyData[date].categories.push(record.category);
        });

        // Calculate daily statistics
        return Object.values(dailyData).map(day => ({
          date: day.date,
          avgAqi: Math.round(day.aqiValues.reduce((sum, val) => sum + val, 0) / day.aqiValues.length),
          maxAqi: Math.max(...day.aqiValues),
          minAqi: Math.min(...day.aqiValues),
          category: getMostCommonCategory(day.categories),
          dataPoints: day.aqiValues.length
        }));
      } else {
        // Hourly data - return individual records grouped by hour
        const results = await this.prisma.aQILog.findMany({
          where: {
            location: {
              name: {
                contains: cityName,
                mode: 'insensitive'
              }
            },
            timestamp: {
              gte: startDate
            }
          },
          include: {
            location: true
          },
          orderBy: {
            timestamp: 'asc'
          }
        });

        // Group by hour
        const hourlyData = {};
        results.forEach(record => {
          const hour = new Date(record.timestamp);
          hour.setMinutes(0, 0, 0); // Round to hour
          const hourKey = hour.toISOString();
          
          if (!hourlyData[hourKey]) {
            hourlyData[hourKey] = {
              hour: hour,
              aqiValues: [],
              categories: []
            };
          }
          hourlyData[hourKey].aqiValues.push(record.aqi);
          hourlyData[hourKey].categories.push(record.category);
        });

        return Object.values(hourlyData).map(hour => ({
          hour: hour.hour,
          avgAqi: Math.round(hour.aqiValues.reduce((sum, val) => sum + val, 0) / hour.aqiValues.length),
          maxAqi: Math.max(...hour.aqiValues),
          minAqi: Math.min(...hour.aqiValues),
          category: getMostCommonCategory(hour.categories),
          dataPoints: hour.aqiValues.length
        }));
      }
    } catch (error) {
      console.error('Error getting historical AQI:', error);
      return [];
    }
  }

  /**
   * Get locations by name pattern
   * @param {string} searchTerm - Search term for location name
   * @returns {Promise<array>} Matching locations
   */
  async searchLocations(searchTerm) {
    try {
      return await this.prisma.location.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { state: { contains: searchTerm, mode: 'insensitive' } }
          ],
          isActive: true
        },
        orderBy: {
          name: 'asc'
        },
        take: 10
      });
    } catch (error) {
      console.error('Error searching locations:', error);
      return [];
    }
  }

  /**
   * Cleanup old AQI data (older than specified days)
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<number>} Number of deleted records
   */
  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.prisma.aQILog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up ${result.count} old AQI records`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

/**
 * Helper function to get most common category from array
 * @param {array} categories - Array of category strings
 * @returns {string} Most common category
 */
function getMostCommonCategory(categories) {
  if (categories.length === 0) return 'Unknown';
  
  const counts = categories.reduce((acc, category) => {
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
  
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

module.exports = DatabaseService;
