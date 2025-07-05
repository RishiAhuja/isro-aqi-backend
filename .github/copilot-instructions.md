# HACKATHON PROJECT: ISRO AQI VISUALIZER & FORECAST APP
  Role: Backend Developer | Assistant: GitHub Copilot

  Objective:
  Build a backend system for a React-based web app that delivers:
  - Real-time AQI from CPCB stations and satellite sources
  - Historical AQI trends over time
  - Predictive AQI forecasts for next 24–72 hours
  - Health recommendations based on pollution levels
  - Push notifications when AQI exceeds thresholds
  - (Optional/Bonus): Map of pollution sources like factories or crop burning

  Tech Stack:
  - Node.js + Express (REST API server)
  - Prisma ORM (DB abstraction)
  - PostgreSQL (relational database, dockerized)
  - Docker + docker-compose (for local development)
  - Axios (for external API calls)
  - Firebase Cloud Messaging (for push alerts)
  - Render (final deployment target)

  Folder Structure to Follow:
  - /routes         → Express endpoints
  - /services       → AQI fetching, processing, and logic modules
  - /utils          → Constants, categorization, formatting helpers
  - /docs           → Full API documentation (markdown or json)
  - /prisma         → Prisma schema + migrations
  - /scripts        → Cron/data-ingestion tools

  Responsibilities for Copilot:
  - Help design routes & DB models based on project goals
  - Divide development into a PHASE-BASED roadmap
  - Maintain a checklist at each phase
  - Clearly mark steps that require human input (e.g., API keys, auth)
  - Assist with deployment readiness for Render

  Copilot Prompt Strategy:
  1. Reflect on project description → Suggest core REST endpoints and DB models
  2. For each feature:
     - Define route URL + method
     - Describe input & output JSON
     - Suggest Prisma models to support this feature
     - Note if it requires: External API key Secure credential Manual integration
  3. Create a phase-based roadmap with checklists
  4. Help update `/docs/` with descriptions & sample responses
  5. Add `.env.example` with needed variables (clearly mark human-provided values)
  6. At final stage, configure Render deployment settings (port binding, env vars, DB URL)

PHASE ROADMAP (Checklist Tracking)

🔹 Phase 1: Project Bootstrap
[x] Initialize Express + Prisma + Docker + Postgres
[x] Setup `docker-compose.yml` with backend + DB
[x] Define basic schema: AQILog, Location
[x] Connect Prisma to Postgres and migrate
[x] Create `.env.example` with:
      - DATABASE_URL= (Human: Docker Postgres URL)
      - OPENWEATHER_API_KEY= (Human)
      - IQAIR_API_KEY= (Human)

🔹 Phase 2: Real-Time AQI + Data Caching
[x] Route: GET /aqi?lat=..&lng=..
[x] Fetch from OpenWeatherMap API + IQAir fallback (Real Data)
[x] Cache to DB with timestamp
[x] Handle API failures gracefully
[x] Log live queries to AQILog table

🔹 Phase 3: Historical Trends
[x] Route: GET /history?city=..&days=..
[x] Query DB for past AQI values
[x] Aggregate by day/hour

🔹 Phase 4: Forecasting Engine
[x] Route: GET /forecast?city=..
[x] Call OpenWeatherMap API for forecast data
[x] Format multi-day prediction output
[x] (Human: Add OpenWeatherMap API token to .env)

🔹 Phase 5: Health Advisory
[x] Route: GET /health-advice?aqi=..
[x] Logic based on Indian/WHO AQI breakpoints
[x] Return severity + advice string

🔹 Phase 6: Notifications (SKIPPED)
[x] Phase 6 skipped per user request - FCM notifications too complex for hackathon
[x] Focus on real data integration instead

🔹 Phase 7: Deployment on Render
[ ] Prepare `start` script in package.json (✅ Already done)
[ ] Add `render.yaml` or deploy via dashboard
[ ] Add build/start command (Render expects `npm start`)
[ ] Configure environment variables on Render dashboard (Human)
[ ] Test live API with frontend

📚 Documentation:
- Every route is documented in `/docs/API.md`
- Real data integration guide in `/docs/QUICK_START_REAL_DATA.md`
- Complete setup summary in `/REAL_DATA_COMPLETED.md`
- Testing script available: `./test-real-data.sh`

🎯 Current Status:
- ✅ All core functionality complete with REAL data
- ✅ OpenWeatherMap + IQAir APIs integrated
- ✅ Phase 6 (FCM notifications) skipped per user request
- ✅ Ready for frontend integration and deployment
- 🔴 Human action needed: Add OpenWeatherMap API key to .env

Tips:
- Use Postman to test routes before frontend integration
- Use `prisma studio` (`npx prisma studio`) to debug DB content
- Use `node-cron` to run AQI fetcher every hour (optional)

- Remember to update this roadmap header throughout the build.
- Mark completed tasks with [x] and add new ones as needed
- tell me whereever I need to manually add API keys or credentials