/*
 * app.js: wires the checker form in index.html to checks.js and renders results.
 * Recalculates on every input. Inputs are never stored or sent anywhere.
 */
(function () {
  "use strict";

  const R = window.TOWING_RULES;
  const C = window.TOWING_CHECKS;
  const { el, citation } = window.TOWING_UI;

  const form = document.getElementById("rig-form");
  const overallBox = document.getElementById("overall");
  const legalList = document.getElementById("legal-checks");

  const STATUS_LABEL = {
    pass: "Legal",
    warn: "Legal, with conditions",
    fail: "Not legal",
    info: "What applies",
    incomplete: "Needs input",
  };
  const STATUS_ICON = { pass: "✓", warn: "!", fail: "✕", info: "i", incomplete: "…" };

  const OVERALL_TEXT = {
    pass: "No problems found in the legal checks below.",
    info: "No problems found in the legal checks below.",
    warn: "Legal as entered, but with conditions. See the amber items below.",
    fail: "Not legal as entered. See the red items below.",
    incomplete: "Fill in the form to see your results.",
  };

  function num(name) {
    const v = form.elements[name].value.trim();
    return v === "" ? null : Number(v);
  }

  function readInput() {
    const count = Number(form.elements.trailerCount.value);
    const trailers = [];
    for (let i = 1; i <= count; i++) trailers.push({ gvmKg: num("trailer" + i + "GvmKg") });
    return {
      vehicleType: form.elements.vehicleType.value,
      tareKg: num("tareKg"),
      gvmKg: num("gvmKg"),
      licenceCode: form.elements.licenceCode.value,
      trailers,
      trailerBrake: form.elements.trailerBrake.value,
    };
  }

  function syncTrailerFields() {
    const count = Number(form.elements.trailerCount.value);
    form.querySelectorAll("[data-trailer]").forEach((node) => {
      node.hidden = count < Number(node.dataset.trailer);
    });
  }

  function renderCheck(check) {
    const rules = check.ruleIds.map((id) => R.get(id));
    return el(
      "li",
      { class: "check check--" + check.status },
      el(
        "div",
        { class: "check-head" },
        el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[check.status]),
        el("h3", null, check.title),
        el("span", { class: "status-label" }, STATUS_LABEL[check.status])
      ),
      el("p", { class: "check-reason" }, check.reason),
      check.notes.length ? el("ul", { class: "check-notes" }, check.notes.map((n) => el("li", null, n))) : null,
      el("ul", { class: "cites", "aria-label": "Sources" }, rules.map(citation))
    );
  }

  function render() {
    syncTrailerFields();
    const { checks, overall } = C.runLegalChecks(readInput());
    overallBox.className = "overall overall--" + overall;
    overallBox.replaceChildren(
      el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[overall]),
      el("span", null, OVERALL_TEXT[overall])
    );
    legalList.replaceChildren(...checks.map(renderCheck));
  }

  // ---------------------------------------------------------------- static content from rules.js
  function fillHelp() {
    document.querySelectorAll("[data-rule-help]").forEach((box) => {
      const rule = R.get(box.dataset.ruleHelp);
      box.querySelector(".help-body").replaceChildren(
        el("p", null, rule.summary),
        el("ul", { class: "cites" }, citation(rule))
      );
    });
  }

  function fillExplainers() {
    const why = R.explainers.whyNotRated;
    const whyBox = document.getElementById("why-not-rated");
    whyBox.replaceChildren(
      el("summary", null, why.title),
      el(
        "ol",
        null,
        why.points.map((pt) =>
          el("li", null, pt.text, pt.ruleId ? el("ul", { class: "cites" }, citation(R.get(pt.ruleId))) : null)
        )
      ),
      el("p", { class: "example" }, el("strong", null, "Worked example: "), why.example.text),
      el("button", { type: "button", class: "button button--ghost", "data-load-example": "" }, "Load this example into the form")
    );

    const myth = R.get("reg99-eb-articulated-myth");
    document.getElementById("eb-myth").replaceChildren(
      el("summary", null, myth.title),
      el("p", null, myth.summary),
      myth.notes.map((n) => el("p", null, n)),
      el("ul", { class: "cites" }, citation(myth))
    );
  }

  function loadExample(scroll) {
    const ex = R.explainers.whyNotRated.example;
    form.reset();
    form.querySelector(`input[name="vehicleType"][value="${ex.vehicleType}"]`).checked = true;
    form.elements.tareKg.value = ex.tareKg;
    form.elements.gvmKg.value = ex.gvmKg;
    form.elements.trailerCount.value = "1";
    form.elements.trailer1GvmKg.value = ex.trailerGvmKg;
    form.elements.trailerBrake.value = "overrun";
    render();
    if (scroll !== false)
      document.getElementById("results-title").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("reset", () => setTimeout(render, 0));
  document.getElementById("load-example").addEventListener("click", loadExample);
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-load-example]")) loadExample();
  });

  document.getElementById("year").textContent = new Date().getFullYear();
  fillHelp();
  fillExplainers();
  // index.html#example opens with the worked example filled in (a shareable link).
  if (location.hash === "#example") loadExample(false);
  else render();
})();
