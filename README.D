# Project Progress Notes

## 2026-04-29 - Prompt 11 + Chat/Gemini Integration Update

- Added sample-data seeding flow:
  - `src/services/seedSampleData.ts`
  - `src/modules/settings/SeedSampleDataButton.tsx`
  - Integrated button into settings page.
- Fixed asset path issues for seeded chat avatars:
  - Added `src/assets/images/avatar1.png`
  - Updated seed records to use existing avatar asset paths.
- Enabled `@q` assistant response flow in chat:
  - Hooked `@q` detection into chat send flow.
  - Auto-create assistant reply messages in the same channel.
- Secured Gemini usage with server-side route:
  - Added `src/app/api/gemini/route.ts`
  - Moved Gemini API key usage to server env (`GEMINI_API_KEY`).
  - Updated client AI service to call internal `/api/gemini` endpoint.
- Updated lint ignores for generated PWA artifacts to avoid false blocking issues.

## Current Status

- Build: passing (`npm run build`)
- Lint: no errors, only non-blocking warnings
- Branch: `prompt-11-progress-update`
