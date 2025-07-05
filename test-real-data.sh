#!/bin/bash

# ISRO AQI Backend - Real Data Test Script
# This script tests if your backend is ready for real AQI data

echo "🚀 ISRO AQI Backend - Real Data Integration Test"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
echo -e "${BLUE}1. Checking environment configuration...${NC}"
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    # Check if API keys are configured
    if grep -q "USE_REAL_DATA=true" .env; then
        echo "   ✅ Real data is enabled"
    else
        echo -e "   ${YELLOW}⚠️  Real data is disabled (USE_REAL_DATA=false)${NC}"
        echo "   📝 To enable: Set USE_REAL_DATA=true in .env"
    fi
    
    if grep -q "placeholder_openweather_key" .env; then
        echo -e "   ${YELLOW}⚠️  OpenWeatherMap API key is placeholder${NC}"
        echo "   📝 Get real key: https://openweathermap.org/api"
    else
        echo "   ✅ OpenWeatherMap API key configured"
    fi
    
    if grep -q "placeholder_iqair_key" .env; then
        echo -e "   ${YELLOW}⚠️  IQAir API key is placeholder (optional)${NC}"
    else
        echo "   ✅ IQAir API key configured"
    fi
else
    echo -e "   ${RED}❌ .env file not found${NC}"
    echo "   📝 Copy from .env.example and configure API keys"
fi

echo ""

# Check Docker containers
echo -e "${BLUE}2. Checking Docker containers...${NC}"
if command -v docker-compose &> /dev/null; then
    if docker-compose ps | grep -q "Up"; then
        echo "   ✅ Docker containers are running"
    else
        echo -e "   ${YELLOW}⚠️  Docker containers are not running${NC}"
        echo "   📝 Run: docker-compose up -d"
    fi
else
    echo -e "   ${YELLOW}⚠️  Docker Compose not found${NC}"
fi

echo ""

# Check database connection
echo -e "${BLUE}3. Checking database connection...${NC}"
if npx prisma db pull --schema=prisma/schema.prisma &>/dev/null; then
    echo "   ✅ Database connection successful"
else
    echo -e "   ${YELLOW}⚠️  Database connection failed${NC}"
    echo "   📝 Run: docker-compose up -d postgres"
fi

echo ""

# Check Node.js dependencies
echo -e "${BLUE}4. Checking Node.js dependencies...${NC}"
if [ -f "node_modules/.bin/prisma" ]; then
    echo "   ✅ Dependencies installed"
else
    echo -e "   ${YELLOW}⚠️  Dependencies missing${NC}"
    echo "   📝 Run: npm install"
fi

echo ""

# Test API endpoints (if server is running)
echo -e "${BLUE}5. Testing API endpoints...${NC}"
if curl -s http://localhost:5000/ &>/dev/null; then
    echo "   ✅ Server is running on port 5000"
    
    # Test health endpoint
    HEALTH_RESPONSE=$(curl -s http://localhost:5000/)
    if echo "$HEALTH_RESPONSE" | grep -q "ISRO AQI"; then
        echo "   ✅ Health endpoint working"
    fi
    
    # Test AQI endpoint with mock data
    echo "   🧪 Testing AQI endpoint..."
    AQI_RESPONSE=$(curl -s "http://localhost:5000/api/aqi?lat=28.6139&lng=77.2090")
    if echo "$AQI_RESPONSE" | grep -q "success"; then
        echo "   ✅ AQI endpoint working"
        
        # Check if using real or mock data
        if echo "$AQI_RESPONSE" | grep -q "openweathermap\|iqair"; then
            echo -e "   ${GREEN}🌍 Using REAL data from external APIs${NC}"
        else
            echo -e "   ${YELLOW}📝 Using mock data (API keys needed for real data)${NC}"
        fi
    else
        echo -e "   ${RED}❌ AQI endpoint failed${NC}"
    fi
    
else
    echo -e "   ${YELLOW}⚠️  Server not running${NC}"
    echo "   📝 Start with: npm start"
fi

echo ""
echo "================================================"
echo -e "${GREEN}🎯 Quick Setup for Real Data:${NC}"
echo ""
echo "1. Get OpenWeatherMap API key:"
echo "   📍 Visit: https://openweathermap.org/api"
echo "   📍 Sign up (free) → Get API key"
echo ""
echo "2. Update .env file:"
echo "   📍 OPENWEATHER_API_KEY=\"your_key_here\""
echo "   📍 USE_REAL_DATA=true"
echo ""
echo "3. Restart backend:"
echo "   📍 docker-compose restart backend"
echo ""
echo "4. Test real data:"
echo "   📍 curl \"http://localhost:5000/api/aqi?lat=19.0760&lng=72.8777\""
echo ""
echo -e "${BLUE}📚 Full documentation: /docs/QUICK_START_REAL_DATA.md${NC}"
echo "================================================"
