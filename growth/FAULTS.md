# Growth Engine faults — Nexus format

Format: **CATEGORY.PAGE.LINE.CHAR**  
Example: `402.2.56.101` = sales funnel (402), page 2, line 56, character 101.

Category **402** is reserved for this Growth / Sales engine (payment-required / conversion).  
Do not guess. Look up the code, read the note, try the suggestion.

| Code | Meaning | What to do |
|------|---------|------------|
| **402.1.1.0** | `config.js` missing or `playStoreUrl` empty | Fill tenant Play / store URL. Sellable: customer pastes their listing. |
| **402.1.2.0** | Unknown `src` on `go.html` | Use youtube, facebook, instagram, tiktok, website, or reading. |
| **402.2.1.0** | Google Sheet webhook empty | Clicks stay in this browser only. Paste Apps Script URL into `sheetWebhook` when ready. |
| **402.2.56.101** | Sheet append failed | Check webhook URL, sharing, and network. Click still redirects so the visitor is not blocked. |
| **402.3.1.0** | Reading form missing name or birthday | Enter both, then submit. |
| **402.4.1.0** | Dashboard has no Sheet and no local clicks | Open tracked links once, or paste Play Console numbers into the boxes (placeholders). |
| **402.5.1.0** | N97 / cloud not used | Public funnel is on kea.today (Cloudflare). Dashboard is this `/growth/` folder. No N97 required for café testing. |

Notes are shown in the UI next to `[code]` so a fault is picked up without scrolling logs.
