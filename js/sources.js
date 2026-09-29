/*
 * sources.js: builds sources.html from rules.js: a status summary, the open
 * questions still to settle, then every rule grouped by category. Each rule
 * has an anchor (#rule-id) that the checker's citation badges link to.
 */
(function () {
  "use strict";

  const R = window.TOWING_RULES;
  const { el, externalLink, verifiedBadge, formatDate } = window.TOWING_UI;

  const GROUPS = [
    { category: "legal", title: "Legal requirements (law)", anchor: "legal" },
    { category: "definition", title: "Definitions (law)", anchor: "definitions" },
    { category: "manufacturer", title: "Manufacturer ratings (not law)", anchor: "manufacturer" },
    { category: "guidance", title: "Guidance (not law)", anchor: "guidance" },
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
      { class: "source-item", id: rule.id, tabindex: "-1" },
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
      rule.notes && rule.notes.length ? el("ul", { class: "check-notes" }, rule.notes.map((n) => el("li", null, n))) : null
    );
  }

  function summaryTable() {
    const rows = GROUPS.map((g) => {
      const rules = R.rules.filter((r) => r.category === g.category);
      return el(
        "tr",
        null,
        el("th", { scope: "row" }, el("a", { href: "#" + g.anchor }, g.title)),
        el("td", { class: "num" }, String(rules.length)),
        el("td", { class: "num" }, String(rules.filter((r) => r.verified).length)),
        el("td", { class: "num" }, String(rules.filter((r) => r.official).length))
      );
    });
    return el(
      "div",
      { class: "table-wrap" },
      el(
        "table",
        { class: "sources-summary" },
        el(
          "thead",
          null,
          el("tr", null, el("th", { scope: "col" }, "Group"), el("th", { scope: "col", class: "num" }, "Rules"), el("th", { scope: "col", class: "num" }, "Verified"), el("th", { scope: "col", class: "num" }, "Official source"))
        ),
        el("tbody", null, rows)
      )
    );
  }

  function openQuestions() {
    return el(
      "section",
      { class: "source-group", id: "open-questions" },
      el("h2", null, "Still to check"),
      el("p", { class: "muted" }, "Until these are settled, the rules involved stay marked as unverified."),
      el(
        "ol",
        { class: "open-questions" },
        R.openQuestions.map((q) =>
          el(
            "li",
            null,
            q.text,
            q.ruleIds.length
              ? el(
                  "span",
                  { class: "oq-rules" },
                  " See: ",
                  q.ruleIds.map((id, i) => [i ? ", " : "", el("a", { href: "#" + id }, R.get(id).title)])
                )
              : null
          )
        )
      )
    );
  }

  const container = document.getElementById("source-groups");
  container.appendChild(summaryTable());
  container.appendChild(openQuestions());
  GROUPS.forEach((g) => {
    const rules = R.rules.filter((r) => r.category === g.category);
    if (!rules.length) return;
    container.appendChild(
      el("section", { class: "source-group", id: g.anchor }, el("h2", null, g.title), el("ul", { class: "source-list" }, rules.map(renderRule)))
    );
  });

  const verified = R.rules.filter((r) => r.verified).length;
  document.getElementById("verified-count").textContent = `${verified} of ${R.rules.length} rules verified so far.`;
  document.getElementById("year").textContent = new Date().getFullYear();

  // The rules are built by script, so jump to #rule-id once they exist.
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.scrollIntoView();
      if (target.classList.contains("source-item")) target.focus({ preventScroll: true });
    }
  }
})();
