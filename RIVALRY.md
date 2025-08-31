# Rivalry (Derby) - Minimal Feature

This adds a subtle rivalry accent for certain high-intensity matchups.

Backend
- New field on matches:
  rivalry: { enabled: boolean; intensity: 0|1|2; tag?: string }
  • Default: disabled (enabled=false, intensity=0)
- Admin endpoint (X-Admin-Token required):
  POST /api/matches/{id}/rivalry
  Body example:
  {
    "enabled": true,
    "intensity": 2,
    "tag": "El Clásico"
  }
  - Any field omitted is left unchanged. Send {enabled:false} to clear.

Seeds
- Added high-intensity rivalries:
  • Barcelona – Real Madrid (tag: El Clásico)
  • Lazio – Roma (tag: Derby della Capitale)
  • Liverpool – Manchester United (tag: North-West Derby)
  • Boston Celtics – Los Angeles Lakers (tag: Historic Rivalry)

Frontend
- Feature flag (default ON): EXPO_PUBLIC_RIVALRY_UI=1
- When active and rivalry.enabled=true:
  • Add a tiny 🔥 chip with label "Derby" or the provided tag.
  • Add a very soft top-edge glow (opacity ≤ 0.10) that respects glass tokens and fixed card size.
  • Accessibility: accessibilityLabel="Rivalry match" on the touchable.

Share (MVP)
- On Match Details header: tap Share
  • iOS/Android: React Native Share API
  • Web: navigator.share if available; else copy link to clipboard
  • Template: "{home} vs {away} — {localTime}. Join the vote: {url}"