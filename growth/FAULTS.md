# Growth Engine faults — CATEGORY.PAGE.LINE.CHAR (402 = this funnel)

Do not guess. Read the note. Example: `402.2.56.101`.

| Code | Meaning | What to do |
|------|---------|------------|
| **402.1.1.0** | Play URL missing | Fill `playStoreUrl` in `config.js`. |
| **402.1.2.0** | Unknown `src` | youtube, facebook, instagram, tiktok, website, reading, offer. |
| **402.1.3.0** | `/api/track` got invalid JSON | Send a JSON object. |
| **402.2.1.0** | No Sheet and no KV | Paste Apps Script URL into `sheetWebhook` and/or set Pages env `SHEET_WEBHOOK` + optional `GROWTH_KV`. Events still save in the browser. |
| **402.2.56.101** | Sheet append failed | Check Web App deploy (Anyone), URL, network. Visitor still redirects to Play. |
| **402.3.1.0** | Reading form incomplete | Name + birthday required. |
| **402.4.1.0** | No clicks and no Play numbers | Use tracked links; paste Console installs. Do not invent a leak. |
| **402.5.1.0** | N97 not required for public funnel | kea.today / Cloudflare. Sync N97 later only to change Echos captions. |
| **402.6.1.0** | Clicks exist, installs not entered | Paste Play Console. Then decide CTA vs store listing. |
| **402.6.2.0** | Installs exist, no payers entered | Return-visit 3-day trial is already on the reading page. Measure purchases in Play. |
| **402.7.1.0** | App convert webhook unused | Energy Today should POST `/api/convert` on install/purchase when you add that in the Android app. |

N97 cron (optional, later): `kea-growth-engine/server/cron-ai.mjs` — AI only every few hours, not every minute.
