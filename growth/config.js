/**
 * KEA Growth Engine — tenant config (Energy Today / Kea Today).
 * Sellable copy: replace these with the customer's links, or leave placeholders.
 *
 * Faults: CATEGORY.PAGE.LINE.CHAR — see FAULTS.md (402 = this sales funnel).
 */
window.KEA_GROWTH = {
  tenantName: "Kea Today",
  productName: "Energy Today",
  productType: "android_app",
  retentionDays: 90,

  playStoreUrl: "https://play.google.com/store/apps/details?id=com.kea.energytoday",
  websiteUrl: "https://www.kea.today/",
  energyPageUrl: "../energy-today-app.html",
  echosPageUrl: "../echos-wisdom.html",

  /** Paste Google Apps Script / Sheet webhook URL here. Empty = 402.2.1.0 */
  sheetWebhook: "",

  sources: {
    youtube: {
      label: "YouTube",
      profile: "https://www.youtube.com/channel/UCnyl7BVETg7q6AmXMXyLzVg"
    },
    facebook: {
      label: "Facebook",
      profile: "https://www.facebook.com/profile.php?id=109822684772325"
    },
    instagram: {
      label: "Instagram",
      profile: ""
    },
    tiktok: {
      label: "TikTok",
      profile: ""
    },
    website: {
      label: "kea.today",
      profile: "https://www.kea.today/"
    },
    reading: {
      label: "Free reading page",
      profile: ""
    }
  }
};
