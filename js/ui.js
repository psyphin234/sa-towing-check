/*
 * ui.js: small DOM helpers shared by index.html and sources.html.
 * All text goes in via textContent, never innerHTML, so rule text is never
 * interpreted as HTML.
 */
(function (root) {
  "use strict";

  // "3 500 kg" -> non-breaking spaces, so a number never wraps across lines.
  function keepNumbersTogether(text) {
    return text.replace(/(\d) (?=\d{3}\b)/g, "$1 ").replace(/(\d) (kg|km\/h|m)\b/g, "$1 $2");
  }

  // el("p", { class: "x", href: "..." }, "text", childNode, ...)
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else node.setAttribute(k, v === true ? "" : v);
    });
    children.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(keepNumbersTogether(c)) : c);
    });
    return node;
  }

  function externalLink(url, text) {
    return el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text);
  }

  // Law (legal / definition) is verified against the gazette; other rules
  // only have their explanatory source checked.
  function verifiedBadge(rule) {
    const isLaw = rule.category === "legal" || rule.category === "definition";
    if (rule.verified)
      return el(
        "span",
        { class: "badge badge--verified", title: isLaw ? "Checked against the gazetted regulations" : "Source checked" },
        isLaw ? "Verified" : "Source checked"
      );
    return isLaw
      ? el(
          "span",
          { class: "badge badge--unverified", title: "Not yet checked against the gazetted regulations" },
          "Unverified: confirm with DLTC"
        )
      : el("span", { class: "badge badge--unverified", title: "The linked source has not been checked yet" }, "Source not checked");
  }

  // Short citation for the checker, e.g. "reg 99" or "Act s1". Law only:
  // manufacturer and guidance rules aren't regulations.
  function shortRef(rule) {
    if (rule.category !== "legal" && rule.category !== "definition") return null;
    const reg = rule.regulation.match(/\bregs? \d+/);
    if (reg) return reg[0];
    const section = rule.regulation.match(/\bAct\b.*?\bs(\d+)\b/);
    return section ? "Act s" + section[1] : null;
  }

  // The checker's compact citations: one line of plain-language rule names,
  // each with its short regulation number, linking to the rule's entry on the
  // sources page (full regulation text, gazette links, verified status). New
  // tab, so the form's inputs survive. Unverified law keeps its badge here.
  function ruleLinks(rules) {
    const unique = rules.filter((r, i) => rules.indexOf(r) === i);
    const items = unique.map((rule) => {
      const ref = shortRef(rule);
      const isLaw = rule.category === "legal" || rule.category === "definition";
      return el(
        "li",
        null,
        el(
          "a",
          { href: "sources.html#" + rule.id, target: "_blank", title: "Full source and verification status (opens the Sources page)" },
          rule.title,
          ref ? el("span", { class: "rule-ref" }, " (" + ref + ")") : null
        ),
        isLaw && !rule.verified ? [" ", verifiedBadge(rule)] : null
      );
    });
    return el("div", { class: "rule-links" }, el("span", { class: "rule-links-label" }, "Read more:"), el("ul", { "aria-label": "Rules this is based on" }, items));
  }

  function formatDate(iso) {
    if (!iso) return "Not yet checked";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }

  root.TOWING_UI = { el, externalLink, verifiedBadge, shortRef, ruleLinks, formatDate };
})(window);
