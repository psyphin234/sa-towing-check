/*
 * sources.js: builds sources.html from rules.js, grouped by category.
 */
(function () {
  "use strict";

  const R = window.TOWING_RULES;
  const { el, externalLink, verifiedBadge, formatDate } = window.TOWING_UI;

  const GROUPS = [
    { category: "legal", title: "Legal requirements (law)" },
    { category: "definition", title: "Definitions (law)" },
    { category: "manufacturer", title: "Manufacturer ratings (not law)" },
    { category: "guidance", title: "Guidance (not law)" },
  ];

  function sourceLine(label, url) {
    return el("li", null, url ? externalLink(url, label) : label + " (no link recorded)");
  }

  function renderRule(rule) {
    const sources = [sourceLine(rule.sourceLabel, rule.sourceUrl)].concat(
      (rule.moreSources || []).map((s) => sourceLine(s.label, s.url))
    );
    return el(
      "li",
      { class: "source-item", id: rule.id },
      el("h3", null, rule.title, verifiedBadge(rule)),
      el("p", null, rule.summary),
      el("p", { class: "source-meta" }, el("strong", null, "Regulation: "), rule.regulation),
      el(
        "p",
        { class: "source-meta" },
        el("strong", null, "Official gazette text: "),
        rule.official ? "yes" : "no, secondary source",
        " · ",
        el("strong", null, "Last checked: "),
        formatDate(rule.lastChecked)
      ),
      el("ul", { class: "source-meta" }, sources),
      rule.notes && rule.notes.length
        ? el("ul", { class: "check-notes" }, rule.notes.map((n) => el("li", null, n)))
        : null
    );
  }

  const container = document.getElementById("source-groups");
  GROUPS.forEach((g) => {
    const rules = R.rules.filter((r) => r.category === g.category);
    if (!rules.length) return;
    container.appendChild(
      el(
        "section",
        { class: "source-group" },
        el("h2", null, g.title),
        el("ul", { class: "source-list" }, rules.map(renderRule))
      )
    );
  });

  const verified = R.rules.filter((r) => r.verified).length;
  document.getElementById("verified-count").textContent = `${verified} of ${R.rules.length} rules verified so far.`;
  document.getElementById("year").textContent = new Date().getFullYear();
})();
