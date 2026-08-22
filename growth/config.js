/**
 * KEA Growth Engine — tenant config (Energy Today).
 * Sellable copy: customer pastes their URLs here. Faults: 402.* see FAULTS.md
 */
window.KEA_GROWTH = {
  tenantName: "Kea Today",
  productName: "Energy Today",
  productType: "android_app",
  retentionDays: 90,
  trackApi: "/api/track",

  playStoreUrl: "https://play.google.com/store/apps/details?id=com.kea.energytoday",
  websiteUrl: "https://www.kea.today/",
  energyPageUrl: "../energy-today-app.html",
  echosPageUrl: "../echos-wisdom.html",

  /** Google Apps Script Web App URL. Empty = 402.2.1.0 */
  sheetWebhook: "",
  /** Optional published CSV/JSON URL for dashboard pull */
  sheetCsvUrl: "",

  sources: {
    youtube: { label: "YouTube", profile: "https://www.youtube.com/channel/UCnyl7BVETg7q6AmXMXyLzVg" },
    facebook: { label: "Facebook", profile: "https://www.facebook.com/profile.php?id=109822684772325" },
    instagram: { label: "Instagram", profile: "https://www.instagram.com/" },
    tiktok: { label: "TikTok", profile: "" },
    website: { label: "kea.today", profile: "https://www.kea.today/" },
    reading: { label: "Free reading", profile: "" },
    offer: { label: "Return offer", profile: "" }
  },

  experiments: [
    { id: "A", headline: "Discover your energy today." },
    { id: "B", headline: "Find out what today has in store for you." },
    { id: "C", headline: "Your birth date reveals more than you think." }
  ]
};
