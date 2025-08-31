# Sports MVP – Public Demo

Quick test steps
- Backend endpoints of interest:
  - GET /api/health → { ok: true }
  - GET /api/version → { version, gitSha }
  - GET /api/competitions
  - GET /api/competitions/{id}/matches?tz=Europe/Madrid
  - GET /api/matches/{id}?include=lineups&amp;tz=Europe/Madrid
  - POST /api/auth/login → demo@demo.com / Demo123!
  - POST /api/matches/{id}/vote (requires Authorization: Bearer)

Login and vote
1. Login with demo@demo.com / Demo123!
2. Open a seeded match (football/basketball/UFC) from competitions or matches list.
3. For football, try Lineups/Unavailable cards, and cast votes in categories (MVP, scorer…).
4. Player star ratings (football only) use the Player name field.

Lineups & injuries
- Lineups card shows formations, starters and bench for both teams.
- Unavailable card shows Out/Doubtful/Recovery chips and reason.
- In dev builds, an Edit JSON button allows admin overrides (X-Admin-Token).

Environment
- See backend/.env.example for required variables.
- THESPORTSDB_API_KEY defaults to 1 if not provided. Import endpoint is tolerant and returns friendly JSON.

Expo Frontend
- Set EXPO_PUBLIC_BACKEND_URL to your deployed backend HTTPS URL before publishing web/Go.