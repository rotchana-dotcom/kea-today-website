/**
 * N97 optional: run every few hours, not every minute.
 * Usage: node cron-ai.mjs
 * Reads env SHEET_WEBHOOK GET or prints 402.2.1.0
 * Does not call paid AI until OPENAI/GEMINI key is set.
 */
const webhook = process.env.SHEET_WEBHOOK || "";
async function main() {
  if (!webhook) {
    console.log("[402.2.1.0] No SHEET_WEBHOOK. Skip AI. See growth/FAULTS.md");
    return;
  }
  const res = await fetch(webhook);
  const data = await res.json();
  console.log("[growth] sheet summary", data);
  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log("[402.5.1.0] No AI key — rules-based salesperson lives in salesperson.js on kea.today");
  }
}
main().catch((e) => {
  console.error("[402.2.56.101]", e.message);
  process.exit(1);
});
