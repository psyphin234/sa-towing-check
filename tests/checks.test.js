/*
 * Tests for rules.js and checks.js. Runs in the browser via tests/index.html
 * (open it, or run tests/run.ps1 for a headless run).
 */
(function () {
  "use strict";

  const R = window.TOWING_RULES;
  const C = window.TOWING_CHECKS;
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: e.message });
    }
  }

  function eq(actual, expected, what) {
    if (actual !== expected)
      throw new Error(`${what || "value"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  function includes(text, part) {
    if (text.indexOf(part) === -1) throw new Error(`expected "${text}" to include "${part}"`);
  }

  const car = (o) => Object.assign({ vehicleType: "motorCar", licenceCode: "", trailers: [], trailerBrake: "" }, o);
  const bakkie = (o) => Object.assign({ vehicleType: "goodsVehicle", licenceCode: "", trailers: [], trailerBrake: "" }, o);
  const trailer = (gvmKg) => [{ gvmKg }];

  // ------------------------------------------------------------ rules.js integrity
  test("every rule has the required fields", () => {
    R.rules.forEach((r) => {
      ["id", "category", "title", "summary", "regulation", "sourceUrl", "sourceLabel"].forEach((f) => {
        if (!r[f]) throw new Error(`${r.id || "?"} missing ${f}`);
      });
      eq(typeof r.verified, "boolean", r.id + ".verified");
      eq(typeof r.official, "boolean", r.id + ".official");
      if (r.lastChecked !== null && !/^\d{4}-\d{2}-\d{2}$/.test(r.lastChecked))
        throw new Error(r.id + ".lastChecked must be YYYY-MM-DD or null");
      if (r.verified && !r.lastChecked) throw new Error(r.id + " is verified but has no lastChecked date");
      if (!/^https:\/\//.test(r.sourceUrl)) throw new Error(r.id + ".sourceUrl must be https");
    });
  });

  test("categories are known", () => {
    R.rules.forEach((r) => {
      if (["legal", "definition", "manufacturer", "guidance"].indexOf(r.category) === -1)
        throw new Error(r.id + " has unknown category " + r.category);
    });
  });

  test("explainer rule ids exist", () => {
    R.explainers.whyNotRated.points.forEach((p) => p.ruleId && R.get(p.ruleId));
  });

  // ------------------------------------------------------------ reg 151 brake rule
  test("151(1)(a)(i): light trailer up to half tare needs no brakes", () => {
    const r = C.requiredBrake(500, 2100);
    eq(r.level, "none");
    eq(r.clause, "151(1)(a)(i)");
  });
  test("151(1)(a)(ii): light trailer over half tare needs overrun", () => {
    const r = C.requiredBrake(700, 1300);
    eq(r.level, "overrun");
    eq(r.clause, "151(1)(a)(ii)");
  });
  test("151(1)(a)(i) boundary: exactly half tare is unbraked", () => {
    eq(C.requiredBrake(650, 1300).level, "none");
  });
  test("151(1)(b)(i): over 750 kg up to tare needs overrun", () => {
    const r = C.requiredBrake(1100, 2100);
    eq(r.level, "overrun");
    eq(r.clause, "151(1)(b)(i)");
  });
  test("151(1)(b)(i) boundary: trailer GVM equal to tare is overrun", () => {
    eq(C.requiredBrake(2100, 2100).level, "overrun");
  });
  test("151(1)(b)(ii): trailer GVM over tare needs service brake", () => {
    const r = C.requiredBrake(2101, 2100);
    eq(r.level, "service");
    eq(r.clause, "151(1)(b)(ii)");
  });
  test("151(1)(c): trailer over 3 500 kg needs service brake even under tare", () => {
    const r = C.requiredBrake(3600, 4000);
    eq(r.level, "service");
    eq(r.clause, "151(1)(c)");
    eq(C.requiredBrake(3500, 4000).level, "overrun", "3 500 kg exactly");
  });
  test("max trailer GVM per brake type", () => {
    const m = C.maxTrailerByBrake(2100);
    eq(m.none, 750, "none");
    eq(m.overrun, 2100, "overrun");
    eq(C.maxTrailerByBrake(1200).none, 600, "half tare");
    eq(C.maxTrailerByBrake(4000).overrun, 3500, "3 500 kg cap");
  });

  // ------------------------------------------------------------ brake check
  test("SPEC worked example: tare 2100, 2500 kg overrun caravan is not legal", () => {
    const c = C.brakeCheck(bakkie({ tareKg: 2100, trailers: trailer(2500), trailerBrake: "overrun" }));
    eq(c.status, "fail");
    includes(c.reason, "151(1)(b)(ii)");
    if (c.ruleIds.indexOf("def-overrun-service-brake") === -1) throw new Error("should cite overrun vs service definition");
  });
  test("same caravan with a service brake is legal", () => {
    eq(C.brakeCheck(bakkie({ tareKg: 2100, trailers: trailer(2500), trailerBrake: "service" })).status, "pass");
  });
  test("two trailers are summed for reg 151", () => {
    const c = C.brakeCheck(bakkie({ tareKg: 2100, trailers: [{ gvmKg: 1200 }, { gvmKg: 1000 }], trailerBrake: "overrun" }));
    eq(c.status, "fail");
  });
  test("brake check incomplete without tare / brake type", () => {
    eq(C.brakeCheck(bakkie({ trailers: trailer(1000), trailerBrake: "overrun" })).status, "incomplete");
    eq(C.brakeCheck(bakkie({ tareKg: 2000, trailers: trailer(1000) })).status, "incomplete");
  });
  test("no trailer: brake check is info", () => {
    eq(C.brakeCheck(bakkie({ tareKg: 2000 })).status, "info");
  });

  // ------------------------------------------------------------ licence (reg 99)
  test("motor car + 1 500 kg trailer on code B fails, needs EB", () => {
    const c = C.licenceCheck(car({ tareKg: 2000, trailers: trailer(1500), licenceCode: "B" }));
    eq(c.status, "fail");
    includes(c.reason, "needs code EB");
  });
  test("code EB covers it", () => {
    eq(C.licenceCheck(car({ tareKg: 2000, trailers: trailer(1500), licenceCode: "EB" })).status, "pass");
  });
  test("EC1 covers EB", () => {
    eq(C.licenceCheck(car({ tareKg: 2000, trailers: trailer(1500), licenceCode: "EC1" })).status, "pass");
  });
  test("trailer of exactly 750 kg needs only B", () => {
    const c = C.licenceCheck(bakkie({ gvmKg: 3000, trailers: trailer(750) }));
    eq(c.status, "info");
    includes(c.reason, "need code B.");
  });
  test("goods vehicle classed by GVM: 3 500 kg is B, 3 501 kg is C1", () => {
    includes(C.licenceCheck(bakkie({ gvmKg: 3500, trailers: [] })).reason, "need code B.");
    includes(C.licenceCheck(bakkie({ gvmKg: 3501, trailers: [] })).reason, "need code C1.");
  });
  test("Super Duty example: GVM over 3 500 kg, tare under, heavy trailer needs EC1", () => {
    const c = C.licenceCheck(bakkie({ tareKg: 3200, gvmKg: 4500, trailers: trailer(3000), licenceCode: "EB" }));
    eq(c.status, "fail");
    includes(c.reason, "needs code EC1");
    if (!c.notes.some((n) => n.indexOf("classed by GVM, not tare") !== -1)) throw new Error("missing GVM-not-tare note");
  });
  test("motor car classed by tare, not GVM", () => {
    includes(C.licenceCheck(car({ tareKg: 2400, gvmKg: 3600, trailers: [] })).reason, "need code B.");
  });
  test("licence check incomplete without the classing mass", () => {
    eq(C.licenceCheck(bakkie({ tareKg: 2000, trailers: trailer(1000) })).status, "incomplete");
    eq(C.licenceCheck(car({ gvmKg: 2500, trailers: trailer(1000) })).status, "incomplete");
    eq(C.licenceCheck({ trailers: [] }).status, "incomplete");
  });
  test("heavy vehicle flags C/EC as out of scope", () => {
    const c = C.licenceCheck(bakkie({ gvmKg: 18000, trailers: trailer(5000) }));
    includes(c.reason, "need code EC.");
    if (!c.notes.some((n) => n.indexOf("outside what this tool checks") !== -1)) throw new Error("missing out-of-scope note");
  });

  // ------------------------------------------------------------ speed (reg 293)
  test("bakkie towing: sum of GVMs over 3 500 kg gives 100 km/h and a sign", () => {
    const c = C.speedCheck(bakkie({ gvmKg: 3100, trailers: trailer(2500) }));
    eq(c.status, "warn");
    includes(c.reason, "100 km/h sign");
    if (c.ruleIds.indexOf("reg293-speed-sign") === -1) throw new Error("should cite reg 293(2)(b)");
  });
  test("SUV towing the same caravan: general limits only", () => {
    const c = C.speedCheck(car({ gvmKg: 3100, trailers: trailer(2500) }));
    eq(c.status, "info");
    includes(c.reason, "goods vehicles only");
  });
  test("sum exactly 3 500 kg: reg 293 does not apply", () => {
    eq(C.speedCheck(bakkie({ gvmKg: 2800, trailers: trailer(700) })).status, "info");
  });
  test("sum over 9 000 kg: 80 km/h", () => {
    const c = C.speedCheck(bakkie({ gvmKg: 6000, trailers: trailer(3500) }));
    eq(c.status, "warn");
    includes(c.reason, "Maximum 80 km/h");
  });
  test("sum exactly 9 000 kg is still 100 km/h", () => {
    includes(C.speedCheck(bakkie({ gvmKg: 5500, trailers: trailer(3500) })).reason, "Maximum 100 km/h");
  });
  test("three trailers are out of scope", () => {
    const c = C.speedCheck(bakkie({ gvmKg: 3000, trailers: [{ gvmKg: 500 }, { gvmKg: 500 }, { gvmKg: 500 }] }));
    eq(c.status, "info");
    includes(c.reason, "outside what this tool checks");
  });

  // ------------------------------------------------------------ overall
  test("overall status is the worst check", () => {
    const r = C.runLegalChecks(
      bakkie({ tareKg: 2100, gvmKg: 3100, licenceCode: "EB", trailers: trailer(2500), trailerBrake: "overrun" })
    );
    eq(r.overall, "fail");
    const ok = C.runLegalChecks(
      bakkie({ tareKg: 2100, gvmKg: 3100, licenceCode: "EB", trailers: trailer(2000), trailerBrake: "overrun" })
    );
    eq(ok.overall, "warn", "legal but speed-limited");
  });
  test("every rule id cited by a check exists", () => {
    const inputs = [
      bakkie({ tareKg: 3200, gvmKg: 4500, licenceCode: "EB", trailers: trailer(3000), trailerBrake: "overrun" }),
      car({ tareKg: 2000, trailers: trailer(500), trailerBrake: "none" }),
      bakkie({ tareKg: 2000, gvmKg: 3000 }),
    ];
    inputs.forEach((i) => C.runLegalChecks(i).checks.forEach((c) => c.ruleIds.forEach((id) => R.get(id))));
  });
  test("kg() formats with SA thousands separator", () => {
    eq(C.kg(2100), "2 100 kg");
    eq(C.kg(750), "750 kg");
  });

  // ------------------------------------------------------------ report
  const failed = results.filter((r) => !r.ok);
  const out = document.getElementById("results");
  results.forEach((r) => {
    const li = document.createElement("li");
    li.className = r.ok ? "ok" : "bad";
    li.textContent = (r.ok ? "PASS  " : "FAIL  ") + r.name + (r.ok ? "" : "  -> " + r.error);
    out.appendChild(li);
  });
  const summary = document.getElementById("summary");
  summary.textContent = failed.length
    ? `FAILED: ${failed.length} of ${results.length} tests`
    : `ALL PASSED: ${results.length} tests`;
  summary.className = failed.length ? "bad" : "ok";
})();
