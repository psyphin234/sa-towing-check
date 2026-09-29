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
    children.flat().forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(keepNumbersTogether(c)) : c);
    });
    return node;
  }

  function externalLink(url, text) {
    return el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, text);
  }

  function verifiedBadge(rule) {
    return rule.verified
      ? el("span", { class: "badge badge--verified", title: "Checked against the gazetted regulations" }, "Verified")
      : el(
          "span",
          { class: "badge badge--unverified", title: "Not yet checked against the gazetted regulations" },
          "Unverified: confirm with DLTC"
        );
  }

  // One-line citation: regulation (linked to source) + badge.
  function citation(rule) {
    return el(
      "li",
      { class: "cite" },
      externalLink(rule.sourceUrl, rule.regulation),
      " ",
      el("span", { class: "cite-source" }, "via " + rule.sourceLabel),
      " ",
      verifiedBadge(rule)
    );
  }

  function formatDate(iso) {
    if (!iso) return "Not yet checked";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }

  root.TOWING_UI = { el, externalLink, verifiedBadge, citation, formatDate };
})(window);
