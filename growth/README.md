# KEA Growth Engine

Sales / conversion funnel for Energy Today. Extract this folder (plus `functions/api/`) to sell as a web app.

## Live (no N97)

- Dashboard: https://www.kea.today/growth/
- Reading: https://www.kea.today/growth/reading.html
- Track: `https://www.kea.today/growth/go.html?src=youtube&c=POST_ID`

## Automation that is on

- Per-platform tracked links (also wired in keaplatform Echos captions when you sync N97)
- Event types: visit, click, play_tap, reading, return, offer_shown
- Headline experiments A/B/C (daily rotate)
- Return-visit 3-day trial offer
- Rules-based salesperson (no paid AI)
- `/api/track` and `/api/convert` Pages Functions
- 90-day prune locally; Sheet script prunes to 90 days

## You still paste (cannot invent)

Play Console installs / revenue / payers. Google Apps Script URL for a shared Sheet.

## Home later

1. Cloudflare Pages → keatoday1 → Settings → Environment variables: `SHEET_WEBHOOK` after you deploy `apps-script/Code.gs`
2. Optional KV binding `GROWTH_KV`
3. Sync N97 so new Echos posts use tracked URLs (`channelPostLinks.ts`)
