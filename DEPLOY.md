# One-pass deploy (Render + MongoDB Atlas + Expo)

Backend (Render)
1) Fork this repo to your GitHub (or share access). On Render: New → Blueprint → point to this repo. It will read render.yaml.
2) Set environment variables (Render UI → Environment):
   - MONGO_URL=&lt;Atlas SRV&gt;
   - DB_NAME=mvp
   - ADMIN_TOKEN=CHANGEME
   - THESPORTSDB_API_KEY=1
   - JWT_SECRET=&lt;strong random&gt;
   - APP_VERSION=0.1.0
   - GIT_SHA=&lt;auto or leave blank&gt;
   - VOTING_WINDOW_HOURS=24
   - CORS=*
3) Deploy. Health endpoints:
   - GET /api/health → { ok: true }
   - GET /api/version → { version, gitSha }

MongoDB Atlas
- Create free cluster, make database user, allow IP access 0.0.0.0/0 (for demo), copy SRV as MONGO_URL, DB name mvp.

Expo (Web + Go)
1) In frontend/.env set EXPO_PUBLIC_BACKEND_URL to your Render URL.
2) Web build: from frontend, run `npx expo export -p web` (or `npx expo start --web` for preview).
3) Expo Go: `npx expo publish` (requires an Expo account and EAS token if CI). Share the QR from the publish output.

Demo
- Login: demo@demo.com / Demo123!
- Competitions → pick competition → open a match → Lineups/Unavailable + Vote.

Notes
- Import endpoint is tolerant and returns friendly JSON on errors.
- Seeds include 6–8 matches across Football/Basketball/UFC.