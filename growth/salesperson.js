/**
 * Rules-based salesperson (no GPU, no paid AI until Sheet + Play numbers exist).
 * Output is an action, not a vanity %. Faults stay 402.*.
 */
(function () {
  window.KeaGrowthSales = {
    report: function (funnel, pasted) {
      pasted = pasted || {};
      var installs = Number(pasted.installs);
      var paid = Number(pasted.paid);
      var revenue = pasted.revenue;
      var lines = [];
      var action = "";
      var leak = "unknown";
      var code = null;

      var clicks = funnel.clicks || 0;
      var readings = funnel.readings || 0;
      var sources = funnel.bySource || {};
      var best = "none";
      var bestN = 0;
      Object.keys(sources).forEach(function (k) {
        if (sources[k] > bestN) {
          bestN = sources[k];
          best = k;
        }
      });

      if (clicks === 0 && !installs) {
        code = "402.4.1.0";
        leak = "no_signal";
        action = "Put tracked links in every Echos caption. Then wait for clicks.";
        lines.push("No clicks and no Play numbers. Do not guess the leak.");
      } else if (clicks > 0 && !(installs > 0)) {
        code = "402.6.1.0";
        leak = "click_to_install";
        action = "Paste Play Console listing visitors vs installs. If visitors are high and installs low, fix the store listing. If visitors are near zero, the leak is still the CTA.";
        lines.push(clicks + " tracked click(s) here. Installs not entered — cannot claim a store-page problem yet.");
      } else if (installs > 0 && !(paid > 0)) {
        code = "402.6.2.0";
        leak = "install_to_pay";
        action = "Offer a 3-day premium trial on the reading return-visit. Measure purchases in Play.";
        lines.push(installs + " installs entered, no paying users entered. Conversion after download is the job.");
      } else if (paid > 0) {
        leak = "scale_winner";
        action = "Push more of the winning source (" + best + "). Pause weak sources until they beat this pay rate.";
        lines.push("Paying users recorded. Scale the source that produced them, not the most views.");
      }

      if (bestN > 0) {
        lines.push("Best click source on this device: " + best + " (" + bestN + ").");
      }

      var exp = funnel.byExp || {};
      var expKeys = Object.keys(exp);
      if (expKeys.length > 1) {
        expKeys.sort(function (a, b) {
          return exp[b] - exp[a];
        });
        lines.push("Headline experiment lead: " + expKeys[0] + " (" + exp[expKeys[0]] + " events). Winner is whoever produces PAYING users, not clicks.");
      }

      if (readings > 0 && clicks > readings * 3) {
        lines.push(readings + " readings vs many Play taps. People skip the reading — keep Play CTA above the fold.");
      }

      if (revenue) lines.push("Revenue note: " + revenue);

      return {
        leak: leak,
        action: action,
        lines: lines,
        bestSource: best,
        bestN: bestN,
        code: code
      };
    }
  };
})();
