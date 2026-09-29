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
  const MD = window.TOWING_MODES;
  const { el, citation } = window.TOWING_UI;

  // ---------------------------------------------------------------- modes
  const MODES = {
    check: "Enter your vehicle, trailer and load to check everything at once.",
    tow: "Enter your vehicle and licence code to see the heaviest trailer you may tow with each type of brakes.",
    compare: "See how the rules change when the same vehicle is registered as a motor car or as a goods vehicle.",
  };
  let mode = "check";

  function setMode(next, updateHash) {
    mode = MODES[next] ? next : "check";
    document.querySelectorAll(".mode-button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    document.querySelectorAll("[data-modes]").forEach((node) => {
      node.hidden = node.dataset.modes.split(" ").indexOf(mode) === -1;
    });
    document.getElementById("mode-hint").textContent = MODES[mode];
    if (updateHash) history.replaceState(null, "", mode === "check" ? location.pathname : "#" + mode);
  }

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
          el("span", { class: "kind kind--" + c.category }, c.category === "legal" ? "SA law" : "Manufacturer")
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

  // ---------------------------------------------------------------- What can I tow?
  function citeList(ruleIds) {
    return el("ul", { class: "cites", "aria-label": "Sources" }, Array.from(new Set(ruleIds)).map((id) => citation(R.get(id), true)));
  }

  function limitLine(limit, category) {
    return el(
      "li",
      { class: limit.binding ? "is-binding" : null },
      el("span", { class: "tow-line-label" }, limit.label, limit.binding ? el("span", { class: "visually-hidden" }, " (the tighter limit)") : null),
      el("span", { class: "tow-line-kg" }, C.kg(limit.kg)),
      el("span", { class: "kind kind--" + category }, category === "legal" ? "SA law" : "Manufacturer")
    );
  }

  function makerSentence(row) {
    if (row.makerMaxKg === null)
      return row.legalMaxKg === null
        ? "Enter the braked towing capacity and GCM to see a limit for this case."
        : null;
    if (row.legalMaxKg === null)
      return `Your manufacturer ratings set the limit: the loaded trailer may weigh at most ${C.kg(row.makerMaxKg)}.`;
    if (row.makerMaxKg < row.legalMaxKg)
      return `Your manufacturer ratings are the tighter limit: the loaded trailer may weigh at most ${C.kg(row.makerMaxKg)}.`;
    return `Your manufacturer ratings allow a loaded trailer of up to ${C.kg(row.makerMaxKg)}, so the law is the tighter limit.`;
  }

  function towCard(row) {
    const ids = row.legal.concat(row.maker).map((l) => l.ruleId);
    if (row.brake === "service") ids.push("def-overrun-service-brake");
    if (!ids.length) ids.push("reg151-trailer-brakes");
    const sentence = makerSentence(row);
    return el(
      "li",
      { class: "tow-card" },
      el("h3", null, row.title),
      el("p", { class: "tow-figure" + (row.legalMaxKg === null ? " tow-figure--none" : "") }, row.legalMaxKg === null ? "No legal cap" : C.kg(row.legalMaxKg)),
      el(
        "p",
        { class: "tow-figure-sub" },
        row.legalMaxKg === null
          ? "Reg 151 and your licence code set no trailer limit here; manufacturer ratings still apply."
          : "Heaviest trailer GVM allowed by law"
      ),
      row.legal.length || row.maker.length
        ? el("ul", { class: "tow-lines" }, row.legal.map((l) => limitLine(l, "legal")), row.maker.map((l) => limitLine(l, "manufacturer")))
        : null,
      sentence ? el("p", { class: "tow-sentence" }, sentence) : null,
      el("p", { class: "hint" }, `Licence code needed for the full allowance: ${row.codeNeeded}.`),
      citeList(ids)
    );
  }

  function speedCard(s) {
    const g = s.general;
    const generalText = `general limits (${g.urbanKmh} / ${g.ruralKmh} / ${g.freewayKmh} km/h)`;
    let lines;
    let ids;
    if (!s.applies) {
      lines = [`${generalText.charAt(0).toUpperCase() + generalText.slice(1)} whatever you tow. The reg 293 towing limit applies to goods vehicles only.`];
      ids = ["reg293-goods-towing-speed", "reg292-general-speed"];
    } else if (s.incomplete) {
      lines = ["Enter the GVM to see the speed limit when towing."];
      ids = ["reg293-goods-towing-speed"];
    } else {
      lines = [];
      if (s.limitOverKg > 0) lines.push(`Trailer GVM up to ${C.kg(s.limitOverKg)}: ${generalText}.`);
      lines.push(
        (s.limitOverKg > 0 ? `Trailer GVM over ${C.kg(s.limitOverKg)}: ` : "Any trailer: ") +
          `${s.limitKmh} km/h maximum and a ${s.limitKmh} km/h sign on the rear.`
      );
      lines.push(`Trailer GVM over ${C.kg(s.heavyOverKg)}: ${s.heavyLimitKmh} km/h maximum.`);
      ids = ["reg293-goods-towing-speed", "reg293-speed-sign"];
    }
    return el(
      "div",
      { class: "tow-speed" },
      el("h3", null, "Speed limit when towing"),
      el("ul", null, lines.map((l) => el("li", null, l))),
      s.applies && !s.incomplete ? el("p", { class: "hint" }, "Based on your vehicle's GVM plus the trailer's plated GVM.") : null,
      citeList(ids)
    );
  }

  function renderTow(input) {
    const body = document.getElementById("tow-body");
    const t = MD.whatCanITow(input);
    if (!t.ready) {
      body.replaceChildren(el("p", { class: "muted" }, t.reason));
      return;
    }
    body.replaceChildren(
      el("ul", { class: "tow-cards" }, t.rows.map(towCard)),
      speedCard(t.speed),
      t.notes.length ? el("ul", { class: "check-notes" }, t.notes.map((n) => el("li", null, n))) : null
    );
  }

  // ---------------------------------------------------------------- motor car vs goods vehicle
  function compareCell(sum, label) {
    return el(
      "td",
      { class: "compare-cell compare-cell--" + sum.status, "data-label": label },
      el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[sum.status]),
      el("span", null, sum.text)
    );
  }

  function renderCompare(input) {
    const body = document.getElementById("compare-body");
    const c = MD.compareBodyTypes(input);
    if (!c.ready) {
      body.replaceChildren(el("p", { class: "muted" }, c.reason));
      return;
    }
    const carLabel = "Motor car";
    const goodsLabel = "Goods vehicle";
    const ids = ["def-vehicle-type-from-papers", "def-motor-car", "def-goods-vehicle"].concat(...c.rows.map((r) => r.ruleIds));
    body.replaceChildren(
      el(
        "p",
        { class: "panel-summary compare-summary" },
        c.differences === 0
          ? "No differences for these figures."
          : `${c.differences} difference${c.differences > 1 ? "s" : ""} for these figures, highlighted below.`
      ),
      el(
        "div",
        { class: "table-wrap" },
        el(
          "table",
          { class: "compare-table" },
          el(
            "thead",
            null,
            el("tr", null, el("th", { scope: "col" }, "Rule"), el("th", { scope: "col" }, carLabel + " (e.g. SUV)"), el("th", { scope: "col" }, goodsLabel + " (e.g. bakkie)"))
          ),
          el(
            "tbody",
            null,
            c.rows.map((r) =>
              el(
                "tr",
                { class: r.same ? null : "is-different" },
                el("th", { scope: "row" }, r.title, r.same ? null : el("span", { class: "diff-tag" }, "Differs")),
                compareCell(r.car, carLabel),
                compareCell(r.goods, goodsLabel)
              )
            )
          )
        )
      ),
      el(
        "p",
        { class: "hint" },
        "Trailer brakes depend only on tare, so they never differ. Manufacturer ratings (payload, GCM, towing capacity) are the same for both; see Check my rig."
      ),
      el("details", { class: "help compare-sources" }, el("summary", null, `Sources (${new Set(ids).size})`), citeList(ids))
    );
  }

  // ---------------------------------------------------------------- print sheet (weighbridge day)
  const PRINT_TITLE = {
    check: "Rig check: weighbridge summary",
    tow: "What can I tow?",
    compare: "Motor car vs goods vehicle",
  };
  const VEHICLE_NAME = { motorCar: "Motor car", goodsVehicle: "Goods vehicle" };
  const DRIVE_NAME = { rwd: "2WD, rear-wheel drive", fwd: "2WD, front-wheel drive", "4wd": "4x4 / AWD" };
  const BRAKE_FITTED = { none: "None (parking brake only)", overrun: "Overrun brake", service: "Service brake (driver-operated)" };

  function kgOrNull(v) {
    return C.isNum(v) ? C.kg(v) : null;
  }

  function renderPrintSheet(input) {
    const rows = [];
    const add = (label, value) => {
      if (value !== null && value !== undefined && value !== "") rows.push(el("tr", null, el("th", { scope: "row" }, label), el("td", null, value)));
    };
    if (mode !== "compare") add("Vehicle type (as registered)", VEHICLE_NAME[input.vehicleType]);
    add("Tare", kgOrNull(input.tareKg));
    add("GVM", kgOrNull(input.gvmKg));
    add("GCM", kgOrNull(input.gcmKg));
    if (mode !== "tow") add("Drive", DRIVE_NAME[input.drive]);
    add("Licence code", input.licenceCode);
    add("Towing capacity, braked", kgOrNull(input.brakedCapacityKg));
    add("Towing capacity, unbraked", kgOrNull(input.unbrakedCapacityKg));
    if (mode !== "tow") {
      add("Maximum tow ball mass", kgOrNull(input.maxTowballKg));
      add("Axle ratings", C.isNum(input.frontAxleRatingKg) || C.isNum(input.rearAxleRatingKg)
        ? `front ${kgOrNull(input.frontAxleRatingKg) || "—"}, rear ${kgOrNull(input.rearAxleRatingKg) || "—"}`
        : null);
      if (input.trailers.length) {
        add(
          input.trailers.length > 1 ? "Trailers, plated GVM" : "Trailer plated GVM",
          input.trailers.map((t) => kgOrNull(t.gvmKg) || "—").join(" + ")
        );
        add("Trailer brakes", BRAKE_FITTED[input.trailerBrake]);
        add("Tow ball mass", kgOrNull(input.towballKg));
        add("Trailer tare", kgOrNull(input.trailerTareKg));
        add("Trailer actual mass", kgOrNull(input.trailerActualKg));
      } else {
        add("Trailer", "None");
      }
    }
    const items = input.loadItems.filter((it) => it.kg > 0 && it.qty > 0);
    if (items.length) {
      add(
        "Load in the vehicle",
        items.map((it) => `${it.label}: ${it.qty} × ${it.kg} kg`).join("; ") +
          ` (total ${C.kg(items.reduce((s, it) => s + it.kg * it.qty, 0))})`
      );
    }

    const blank = () => el("td", { class: "write-in" }, "");
    const writeIn =
      mode === "check"
        ? el(
            "table",
            { class: "print-table write-in-table" },
            el("caption", null, "At the weighbridge: write in the readings (trailer hitched, loaded for the trip)"),
            el("thead", null, el("tr", null, el("th", null, "Reading"), el("th", null, "Mass"), el("th", null, "Limit"))),
            el(
              "tbody",
              null,
              [
                ["Front axle", kgOrNull(input.frontAxleRatingKg) ? `rating ${kgOrNull(input.frontAxleRatingKg)}` : "axle rating"],
                ["Rear axle", kgOrNull(input.rearAxleRatingKg) ? `rating ${kgOrNull(input.rearAxleRatingKg)}` : "axle rating"],
                ["Trailer axle(s)", ""],
                ["Tow ball", kgOrNull(input.maxTowballKg) ? `maximum ${kgOrNull(input.maxTowballKg)}` : ""],
                ["Vehicle total (front + rear)", kgOrNull(input.gvmKg) ? `GVM ${kgOrNull(input.gvmKg)}` : "GVM"],
                ["Everything (all axles)", kgOrNull(input.gcmKg) ? `GCM ${kgOrNull(input.gcmKg)}` : "GCM"],
              ].map(([label, limit]) => el("tr", null, el("th", { scope: "row" }, label), blank(), el("td", null, limit)))
            )
          )
        : null;

    document.getElementById("print-sheet").replaceChildren(
      el("h2", null, PRINT_TITLE[mode]),
      el("p", { class: "print-meta" }, "Printed " + new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) + " from psyphin.co.za. Guidance only, not legal advice."),
      rows.length ? el("table", { class: "print-table" }, el("caption", null, "What was entered"), el("tbody", null, rows)) : null,
      writeIn
    );
  }

  function render() {
    syncTrailerFields();
    const input = readInput();
    updateLoadTotal(input.loadItems);
    renderTow(input);
    renderCompare(input);
    document.getElementById("rig-body").replaceChildren(window.TOWING_DIAGRAM.renderRigDiagram(M.rigDiagram(input)));
    renderPrintSheet(input);

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
    setMode("check", true);
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
    if (scroll !== false) document.querySelector(".results").scrollIntoView({ behavior: "smooth", block: "start" });
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

  document.querySelectorAll("[data-print]").forEach((b) =>
    b.addEventListener("click", () => {
      render(); // fresh date and figures on the sheet
      window.print();
    })
  );

  // Scroll without touching the URL hash (it holds the mode).
  document.querySelector(".jump-link").addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelector(".results").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll(".mode-button").forEach((b) =>
    b.addEventListener("click", () => {
      setMode(b.dataset.mode, true);
      render();
    })
  );

  document.getElementById("year").textContent = new Date().getFullYear();
  fillHelp();
  fillExplainers();
  // index.html#example opens with the worked example filled in (a shareable
  // link); #tow and #compare open those modes.
  const hash = location.hash.slice(1);
  if (hash === "example") {
    loadExample(false);
    history.replaceState(null, "", "#example");
  } else {
    setMode(hash, false);
    render();
  }
})();
