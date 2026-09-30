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
  const { el, ruleLinks } = window.TOWING_UI;

  // ---------------------------------------------------------------- modes
  const MODES = {
    simple: "Copy the numbers from your two licence discs for a quick legal check.",
    check: "Enter your vehicle, trailer and load to check everything at once.",
    tow: "Enter your vehicle and licence code to see the heaviest trailer you may tow with each type of brakes.",
    compare: "See how the rules change when the same vehicle is registered as a motor car or as a goods vehicle.",
  };
  // URL hash for each mode (none for the default, simple). "#check" was the
  // advanced check's old name; it still works.
  const MODE_HASH = { simple: "", check: "advanced", tow: "tow", compare: "compare" };
  const HASH_MODE = { "": "simple", advanced: "check", check: "check", tow: "tow", compare: "compare" };
  let mode = "simple";

  function setMode(next, updateHash) {
    mode = MODES[next] ? next : "simple";
    document.querySelectorAll(".mode-button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    document.querySelectorAll("[data-modes]").forEach((node) => {
      node.hidden = node.dataset.modes.split(" ").indexOf(mode) === -1;
    });
    document.getElementById("mode-hint").textContent = MODES[mode];
    if (updateHash) history.replaceState(null, "", MODE_HASH[mode] ? "#" + MODE_HASH[mode] : location.pathname);
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

  // Toggles in the results are rebuilt on every input; remember which are
  // open so they don't snap shut while someone types.
  const openToggles = new Set();

  function toggle(key, cls, summaryText, content) {
    const box = el("details", { class: cls, open: openToggles.has(key) }, el("summary", null, summaryText), content);
    box.addEventListener("toggle", () => (box.open ? openToggles.add(key) : openToggles.delete(key)));
    return box;
  }

  // A card's explanatory notes, folded away so the result and figures stand
  // out. A closed toggle can't print its contents, so print gets its own copy.
  function notesToggle(key, notes) {
    if (!notes.length) return null;
    const list = (cls) => el("ul", { class: cls }, notes.map((n) => el("li", null, n)));
    return [toggle("notes:" + key, "more-detail", "More detail", list("check-notes")), list("check-notes print-only")];
  }

  // One vehicle type's outcome, when the type was left blank.
  function renderVariant(v, labels, key) {
    return el(
      "li",
      { class: "variant variant--" + v.status },
      el(
        "div",
        { class: "variant-head" },
        el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[v.status]),
        el("strong", null, "If registered as a " + v.label.toLowerCase()),
        el("span", { class: "status-label" }, labels[v.status])
      ),
      el("p", null, v.reason),
      notesToggle(key + ":" + v.type, v.notes)
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
      check.variants && !check.variantsSame ? el("ul", { class: "variants" }, check.variants.map((v) => renderVariant(v, labels, check.id))) : null,
      check.variantsSame
        ? toggle(
            "variants:" + check.id,
            "help variants-details",
            "Details for each vehicle type",
            el("ul", { class: "variants" }, check.variants.map((v) => renderVariant(v, labels, check.id)))
          )
        : null,
      check.meter ? renderMeter(check.meter, check.status) : null,
      notesToggle(check.id, check.notes),
      ruleLinks(rules)
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
    return ruleLinks(ruleIds.map((id) => R.get(id)));
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
      const sign = (kmh) => `${kmh} km/h maximum and a ${kmh} km/h sign on the rear`;
      lines = [];
      if (s.heavyOverKg === 0) {
        lines.push(`Your GVM is over 9 000 kg: ${sign(s.heavyLimitKmh)}, with or without a trailer.`);
      } else {
        if (s.limitOverKg > 0) lines.push(`Trailer GVM up to ${C.kg(s.limitOverKg)}: ${generalText}.`);
        else lines.push(`Your GVM is over 3 500 kg, so even without a trailer: ${sign(s.limitKmh)}.`);
        lines.push((s.limitOverKg > 0 ? `Trailer GVM over ${C.kg(s.limitOverKg)}: ` : "With a trailer: ") + `${sign(s.limitKmh)}.`);
        lines.push(`Trailer GVM over ${C.kg(s.heavyOverKg)}: ${sign(s.heavyLimitKmh)}.`);
      }
      lines.push(R.get("reg293-speed-sign").notes[0]);
      ids = ["reg293-goods-towing-speed", "reg293-speed-sign"];
    }
    let list = [
      el("ul", null, lines.map((l) => el("li", null, l))),
      s.applies && !s.incomplete ? el("p", { class: "hint" }, "Based on your vehicle's GVM plus the trailer's plated GVM.") : null,
    ];
    if (s.eitherType) {
      ids.push("reg292-general-speed");
      list = [
        el("p", { class: "tow-speed-group" }, "If registered as a goods vehicle:"),
        list,
        el("p", { class: "tow-speed-group" }, "If registered as a motor car:"),
        el("ul", null, el("li", null, `${generalText.charAt(0).toUpperCase() + generalText.slice(1)} whatever you tow.`)),
      ];
    }
    return el(
      "div",
      { class: "tow-speed" },
      el("h3", null, "Speed limit when towing"),
      list,
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
      citeList(ids)
    );
  }

  // ---------------------------------------------------------------- simple check
  function simpleRaw() {
    return {
      tareKg: num("tareKg"),
      gvmKg: num("gvmKg"),
      licenceCode: form.elements.licenceCode.value,
      trailerTareKg: num("trailerTareKg"),
      trailerGvmKg: num("trailer1GvmKg"),
      trailerBrake: form.elements.trailerBrake.value,
      vehicleType: form.elements.vehicleType.value, // only set in the advanced check
    };
  }

  function figureTile(label, value, sub) {
    return el(
      "div",
      { class: "figure" },
      el("span", { class: "figure-label" }, label),
      el("span", { class: "figure-value" }, value),
      sub ? el("span", { class: "figure-sub" }, sub) : null
    );
  }

  function renderSimple() {
    const body = document.getElementById("simple-body");
    const s = MD.simpleCheck(simpleRaw());
    if (!s.ready) {
      body.replaceChildren(el("p", { class: "muted" }, s.reason));
      return s;
    }
    const f = s.figures;
    const tiles = [
      f.vehiclePayloadKg !== null
        ? figureTile("Your vehicle can carry", C.kg(f.vehiclePayloadKg), "GVM − tare: people, fuel, luggage and the trailer's tow ball")
        : null,
      f.trailerPayloadKg !== null ? figureTile("Your trailer can carry", C.kg(f.trailerPayloadKg), "Trailer GVM − tare") : null,
      s.towing && f.brakeChosen
        ? figureTile(
            "Heaviest trailer the law allows",
            f.heaviestTrailerKg === null ? "No legal cap" : C.kg(f.heaviestTrailerKg),
            f.heaviestTrailerKg === null
              ? "With a service brake. Your vehicle's own towing limits still apply."
              : "Trailer GVM, with these brakes. Set by: " + f.heaviestTrailerSetBy.join("; ").toLowerCase() + "."
          )
        : null,
    ].filter(Boolean);

    const specific = s.reasons.filter((r) => r.id !== "manufacturer").length > 0;
    body.replaceChildren(
      el(
        "div",
        { class: "overall overall--" + s.overall, role: "status" },
        el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[s.overall]),
        el("span", null, OVERALL_TEXT[s.overall])
      ),
      tiles.length ? el("div", { class: "figures" }, tiles) : null,
      el("ul", { class: "checks" }, s.checks.map((c) => renderCheck(c, LEGAL_STATUS_LABEL))),
      el(
        "div",
        { class: "advanced-note" + (specific ? " advanced-note--flag" : "") },
        el("h3", null, specific ? "Worth a closer look" : "Want the full picture?"),
        s.reasons.length
          ? el("ul", null, s.reasons.map((r) => el("li", null, r.text)))
          : el("p", null, "This check uses only your licence discs. The advanced check adds what you load, your vehicle's own towing limits and weighbridge readings."),
        el("button", { type: "button", class: "button button--primary", "data-open-advanced": "" }, "Open the advanced check")
      )
    );
    return s;
  }

  // ---------------------------------------------------------------- print sheet (weighbridge day)
  const PRINT_TITLE = {
    simple: "Rig check (simple): from the licence discs",
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
    if (mode === "simple") {
      // only what the simple check asked for: the two discs, licence code and brakes
      add("Vehicle type (as registered)", VEHICLE_NAME[input.vehicleType]);
      add("Tare (vehicle disc)", kgOrNull(input.tareKg));
      add("GVM (vehicle disc)", kgOrNull(input.gvmKg));
      add("Licence code", input.licenceCode);
      if (input.trailers.length) {
        add("Trailer tare (trailer disc)", kgOrNull(input.trailerTareKg));
        add("Trailer GVM (trailer disc)", kgOrNull(input.trailers[0].gvmKg));
        add("Trailer brakes", BRAKE_FITTED[input.trailerBrake]);
      } else {
        add("Trailer", "None");
      }
    } else {
      if (mode !== "compare") add("Vehicle type (as registered)", VEHICLE_NAME[input.vehicleType] || "Not sure (both shown)");
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
                ["Tow ball", M.towballMax(input) ? `maximum ${C.kg(M.towballMax(input).kg)}` : ""],
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
    syncMirrors();
    const input = readInput();
    updateLoadTotal(input.loadItems);
    const simple = renderSimple();
    renderTow(input);
    renderCompare(input);
    document.getElementById("rig-body").replaceChildren(window.TOWING_DIAGRAM.renderRigDiagram(M.rigDiagram(input)));
    renderPrintSheet(mode === "simple" && simple.ready ? simple.input : input);

    const legal = C.runLegalChecks(input);
    overallBox.className = "overall overall--" + legal.overall;
    overallBox.replaceChildren(
      el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[legal.overall]),
      el(
        "span",
        null,
        OVERALL_TEXT[legal.overall],
        legal.dependsOnType && legal.overall !== "incomplete"
          ? " Some results depend on how your vehicle is registered: choose the vehicle type to narrow them down."
          : ""
      )
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
      box.querySelector(".help-body").replaceChildren(el("p", null, rule.summary), ruleLinks([rule]));
    });
  }

  function fillExplainers() {
    const why = R.explainers.whyNotRated;
    document.getElementById("why-not-rated").replaceChildren(
      el("summary", null, why.title),
      el(
        "ol",
        null,
        why.points.map((pt) => el("li", null, pt.text, pt.ruleId ? ruleLinks([R.get(pt.ruleId)]) : null))
      ),
      el("p", { class: "example" }, el("strong", null, "Worked example: "), why.example.text),
      el("button", { type: "button", class: "button button--ghost", "data-load-example": "" }, "Load this example into the form")
    );

    const myth = R.get("reg99-eb-articulated-myth");
    document.getElementById("eb-myth").replaceChildren(
      el("summary", null, myth.title),
      el("p", null, myth.summary),
      myth.notes.map((n) => el("p", null, n)),
      ruleLinks([myth])
    );
  }

  // ---------------------------------------------------------------- simple-mode mirrors
  // The simple check's disc inputs (data-mirror="<name>") are copies of the
  // advanced form's fields, so one set of values serves every mode.
  const mirrors = Array.from(form.querySelectorAll("[data-mirror]"));

  function setUpMirrors() {
    mirrors.forEach((m) => {
      const source = form.elements[m.dataset.mirror];
      if (m.tagName === "SELECT") m.replaceChildren(...Array.from(source.options).map((o) => o.cloneNode(true)));
      const copy = () => {
        source.value = m.value;
        // a trailer disc filled in means one trailer
        if (m.dataset.mirror === "trailer1GvmKg" && m.value && form.elements.trailerCount.value === "0")
          form.elements.trailerCount.value = "1";
      };
      m.addEventListener("input", copy); // runs before the form's own listener re-renders
      m.addEventListener("change", copy);
    });
  }

  function syncMirrors() {
    mirrors.forEach((m) => {
      const value = form.elements[m.dataset.mirror].value;
      if (m.value !== value && document.activeElement !== m) m.value = value;
    });
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
    if (e.target.closest("[data-open-advanced]")) {
      // values carry over: the simple inputs are the advanced form's fields
      setMode("check", true);
      render();
      document.querySelector(".modes").scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
  document.querySelector(".disclaimer-link a").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("disclaimer").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll(".mode-button").forEach((b) =>
    b.addEventListener("click", () => {
      setMode(b.dataset.mode, true);
      render();
    })
  );

  document.getElementById("year").textContent = new Date().getFullYear();
  setUpMirrors();
  fillHelp();
  fillExplainers();
  // index.html#example opens the advanced check with the worked example filled
  // in (a shareable link); #advanced, #tow and #compare open those modes.
  const hash = location.hash.slice(1);
  if (hash === "example") {
    loadExample(false);
    history.replaceState(null, "", "#example");
  } else {
    setMode(HASH_MODE[hash] || "simple", false);
    render();
  }
})();
