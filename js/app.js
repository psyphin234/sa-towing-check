/*
 * app.js: wires the checker form in index.html to checks.js / ratings.js and
 * renders results. Recalculates on every input. Inputs are never stored or
 * sent anywhere.
 */
(function () {
  "use strict";

  const R = window.TOWING_RULES;
  const C = window.TOWING_CHECKS;
  const M = window.TOWING_RATINGS;
  const { el, citation } = window.TOWING_UI;

  const form = document.getElementById("rig-form");
  const overallBox = document.getElementById("overall");
  const legalList = document.getElementById("legal-checks");
  const makerList = document.getElementById("maker-checks");
  const makerSummary = document.getElementById("maker-summary");
  const limitBox = document.getElementById("trailer-limit");
  const loadList = document.getElementById("load-list");
  const loadTotal = document.getElementById("load-total");
  const presetSelect = document.getElementById("load-preset");

  const STATUS_LABEL = {
    pass: "OK",
    warn: "Check",
    fail: "Not OK",
    info: "What applies",
    incomplete: "Needs input",
  };
  const LEGAL_STATUS_LABEL = Object.assign({}, STATUS_LABEL, {
    pass: "Legal",
    warn: "Legal, with conditions",
    fail: "Not legal",
  });
  const STATUS_ICON = { pass: "✓", warn: "!", fail: "✕", info: "i", incomplete: "…" };

  const OVERALL_TEXT = {
    pass: "No problems found in the legal checks.",
    info: "No problems found in the legal checks.",
    warn: "Legal as entered, but with conditions. See the amber items.",
    fail: "Not legal as entered. See the red items.",
    incomplete: "Fill in the form to see your results.",
  };

  // ---------------------------------------------------------------- reading the form
  function num(name) {
    const v = form.elements[name].value.trim();
    return v === "" ? null : Number(v);
  }

  function readLoadItems() {
    return Array.from(loadList.querySelectorAll(".load-row")).map((row) => ({
      label: row.querySelector("[data-f=label]").value,
      qty: Number(row.querySelector("[data-f=qty]").value) || 0,
      kg: Number(row.querySelector("[data-f=kg]").value) || 0,
    }));
  }

  function readInput() {
    const count = Number(form.elements.trailerCount.value);
    const trailers = [];
    for (let i = 1; i <= count; i++) trailers.push({ gvmKg: num("trailer" + i + "GvmKg") });
    return {
      vehicleType: form.elements.vehicleType.value,
      tareKg: num("tareKg"),
      gvmKg: num("gvmKg"),
      drive: form.elements.drive.value,
      licenceCode: form.elements.licenceCode.value,
      trailers,
      trailerBrake: form.elements.trailerBrake.value,
      gcmKg: num("gcmKg"),
      brakedCapacityKg: num("brakedCapacityKg"),
      unbrakedCapacityKg: num("unbrakedCapacityKg"),
      maxTowballKg: num("maxTowballKg"),
      frontAxleRatingKg: num("frontAxleRatingKg"),
      rearAxleRatingKg: num("rearAxleRatingKg"),
      loadItems: readLoadItems(),
      towballKg: num("towballKg"),
      trailerTareKg: num("trailerTareKg"),
      trailerActualKg: num("trailerActualKg"),
      weighbridge: {
        frontAxleKg: num("wbFrontAxleKg"),
        rearAxleKg: num("wbRearAxleKg"),
        trailerAxlesKg: count ? num("wbTrailerAxlesKg") : null,
      },
      wheelbaseMm: num("wheelbaseMm"),
      rearOverhangMm: num("rearOverhangMm"),
    };
  }

  function syncTrailerFields() {
    const count = Number(form.elements.trailerCount.value);
    form.querySelectorAll("[data-trailer]").forEach((node) => {
      node.hidden = count < Number(node.dataset.trailer);
    });
  }

  // ---------------------------------------------------------------- load list builder
  function numberInput(field, value, label) {
    return el("input", { type: "number", inputmode: "decimal", min: "0", step: "any", "data-f": field, value: String(value), "aria-label": label });
  }

  function addLoadRow(presetId, qty) {
    const p = R.loadPresets.find((x) => x.id === presetId) || R.loadPresets[R.loadPresets.length - 1];
    const perLitre = p.perUnit === "litre";
    const labelInput = el("input", { type: "text", "data-f": "label", value: p.label, "aria-label": "Item" });
    const row = el(
      "div",
      { class: "load-row" },
      labelInput,
      el("label", { class: "load-num" }, el("span", null, perLitre ? "Litres" : "Qty"), numberInput("qty", qty || p.qty, perLitre ? "Litres" : "Quantity")),
      el("label", { class: "load-num" }, el("span", null, perLitre ? "kg / litre" : "kg each"), numberInput("kg", p.kg, perLitre ? "kg per litre" : "kg each")),
      el("button", { type: "button", class: "load-remove", "aria-label": "Remove item" }, "×")
    );
    loadList.appendChild(row);
    return labelInput;
  }

  function updateLoadTotal(items) {
    const total = items.reduce((s, it) => s + (it.kg > 0 && it.qty > 0 ? it.kg * it.qty : 0), 0);
    loadTotal.textContent = C.kg(total);
  }

  presetSelect.replaceChildren(...R.loadPresets.map((p) => el("option", { value: p.id }, p.label)));
  document.getElementById("load-add").addEventListener("click", () => {
    const labelInput = addLoadRow(presetSelect.value);
    render();
    if (presetSelect.value === "custom") labelInput.select();
  });
  loadList.addEventListener("click", (e) => {
    const btn = e.target.closest(".load-remove");
    if (!btn) return;
    btn.closest(".load-row").remove();
    render();
  });

  // ---------------------------------------------------------------- rendering
  function renderMeter(meter, status) {
    const ratio = meter.value / meter.max;
    const pctText = Math.round(ratio * 100) + " %";
    return el(
      "div",
      { class: "meter meter--" + status },
      el(
        "div",
        {
          class: "meter-track",
          role: "meter",
          "aria-valuemin": "0",
          "aria-valuemax": String(meter.max),
          "aria-valuenow": String(Math.round(meter.value)),
          "aria-label": `${C.kg(meter.value)} ${meter.label}`,
        },
        el("div", { class: "meter-fill", style: `width:${Math.min(ratio, 1) * 100}%` })
      ),
      el("span", { class: "meter-text" }, `${pctText} ${meter.label}`)
    );
  }

  function renderCheck(check, labels) {
    const rules = check.ruleIds.map((id) => R.get(id));
    return el(
      "li",
      { class: "check check--" + check.status },
      el(
        "div",
        { class: "check-head" },
        el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[check.status]),
        el("h3", null, check.title),
        el("span", { class: "status-label" }, labels[check.status])
      ),
      el("p", { class: "check-reason" }, check.reason),
      check.meter ? renderMeter(check.meter, check.status) : null,
      check.notes.length ? el("ul", { class: "check-notes" }, check.notes.map((n) => el("li", null, n))) : null,
      el("ul", { class: "cites", "aria-label": "Sources" }, rules.map(citation))
    );
  }

  const BRAKE_NAME = { none: "no brakes", overrun: "overrun brakes", service: "a service brake" };

  function renderLimit(input) {
    const t = M.trailerLimit(input);
    const heading = el("h2", { id: "limit-title" }, "Heaviest trailer for this rig");
    if (t.limitKg === null) {
      limitBox.replaceChildren(heading, el("p", { class: "muted" }, t.reason));
      return;
    }
    const rows = t.candidates.map((c) =>
      el(
        "tr",
        { class: c.binding ? "is-binding" : null },
        el("td", null, c.label, c.binding ? el("span", { class: "visually-hidden" }, " (sets the limit)") : null),
        el("td", { class: "num" }, C.kg(c.kg)),
        el("td", null, c.basis),
        el(
          "td",
          null,
          el("span", { class: "kind kind--" + c.category }, c.category === "legal" ? "Law" : "Not law")
        )
      )
    );
    const binding = t.candidates.filter((c) => c.binding).map((c) => c.label.toLowerCase());
    limitBox.replaceChildren(
      heading,
      el("p", { class: "limit-figure" }, C.kg(t.limitKg)),
      el("p", { class: "limit-sub" }, `With ${BRAKE_NAME[input.trailerBrake]}. Set by: ${binding.join("; ")}.`),
      el(
        "div",
        { class: "table-wrap" },
        el(
          "table",
          { class: "limit-table" },
          el("thead", null, el("tr", null, el("th", null, "Limit"), el("th", { class: "num" }, "Trailer up to"), el("th", null, "Applies to"), el("th", null, "Type"))),
          el("tbody", null, rows)
        )
      ),
      el(
        "p",
        { class: "hint" },
        "Legal limits apply to the trailer's plated GVM; manufacturer limits to what it actually weighs. Stay under all of them.",
        t.notes.length ? " " + t.notes.join(" ") : ""
      )
    );
  }

  const MAKER_SUMMARY = {
    fail: ["fail", "Over a manufacturer rating. See the red items."],
    warn: ["warn", "Close to a manufacturer rating. See the amber items."],
    pass: ["pass", "Within the manufacturer ratings checked."],
    none: ["incomplete", "Fill in the ratings and your load to check them."],
  };

  function renderMakerSummary(checks) {
    const has = (s) => checks.some((c) => c.status === s);
    const key = has("fail") ? "fail" : has("warn") ? "warn" : has("pass") ? "pass" : "none";
    const [status, text] = MAKER_SUMMARY[key];
    makerSummary.className = "panel-summary overall--" + status;
    makerSummary.replaceChildren(
      el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[status]),
      el("span", null, text)
    );
  }

  function render() {
    syncTrailerFields();
    const input = readInput();
    updateLoadTotal(input.loadItems);

    const legal = C.runLegalChecks(input);
    overallBox.className = "overall overall--" + legal.overall;
    overallBox.replaceChildren(
      el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[legal.overall]),
      el("span", null, OVERALL_TEXT[legal.overall])
    );
    legalList.replaceChildren(...legal.checks.map((c) => renderCheck(c, LEGAL_STATUS_LABEL)));

    const maker = M.runMakerChecks(input);
    renderMakerSummary(maker.checks);
    makerList.replaceChildren(...maker.checks.map((c) => renderCheck(c, STATUS_LABEL)));

    renderLimit(input);
  }

  // ---------------------------------------------------------------- static content from rules.js
  function fillHelp() {
    document.querySelectorAll("[data-rule-help]").forEach((box) => {
      const rule = R.get(box.dataset.ruleHelp);
      box.querySelector(".help-body").replaceChildren(el("p", null, rule.summary), el("ul", { class: "cites" }, citation(rule)));
    });
  }

  function fillExplainers() {
    const why = R.explainers.whyNotRated;
    document.getElementById("why-not-rated").replaceChildren(
      el("summary", null, why.title),
      el(
        "ol",
        null,
        why.points.map((pt) => el("li", null, pt.text, pt.ruleId ? el("ul", { class: "cites" }, citation(R.get(pt.ruleId))) : null))
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

  function clearForm() {
    form.reset();
    loadList.replaceChildren();
  }

  function loadExample(scroll) {
    const ex = R.explainers.whyNotRated.example;
    clearForm();
    form.querySelector(`input[name="vehicleType"][value="${ex.vehicleType}"]`).checked = true;
    const set = (name, value) => (form.elements[name].value = value);
    set("tareKg", ex.tareKg);
    set("gvmKg", ex.gvmKg);
    set("drive", ex.drive);
    set("gcmKg", ex.gcmKg);
    set("brakedCapacityKg", ex.factoryRatingKg);
    set("unbrakedCapacityKg", ex.unbrakedCapacityKg);
    set("maxTowballKg", ex.maxTowballKg);
    set("trailerCount", "1");
    set("trailer1GvmKg", ex.trailerGvmKg);
    set("trailerBrake", "overrun");
    set("towballKg", ex.towballKg);
    ex.loadItems.forEach((it) => addLoadRow(it.preset, it.qty));
    render();
    if (scroll !== false) document.getElementById("results-title").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  form.addEventListener("reset", (e) => {
    loadList.replaceChildren();
    setTimeout(render, 0);
  });
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
