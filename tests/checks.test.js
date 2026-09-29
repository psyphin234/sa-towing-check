/*
 * Tests for rules.js and checks.js. Runs in the browser via tests/index.html
 * (open it, or run tests/run.ps1 for a headless run).
 */
(function () {
  "use strict";

  const R = window.TOWING_RULES;
  const C = window.TOWING_CHECKS;
  const results = [];
  window.addEventListener("error", (e) => {
    document.getElementById("summary").textContent = "FAILED: script error: " + e.message;
  });

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

  // ------------------------------------------------------------ rig mass model
  const M = window.TOWING_RATINGS;
  const items = (...pairs) => pairs.map(([kg, qty]) => ({ label: "x", kg, qty }));

  test("masses: estimate from tare + load list + tow ball", () => {
    const m = C.rigMasses(
      bakkie({ tareKg: 2100, loadItems: items([80, 2], [70, 1]), towballKg: 200, trailers: trailer(2500) })
    );
    eq(m.itemsKg, 230, "items");
    eq(m.vehicle.kg, 2530, "vehicle");
    eq(m.vehicle.source, "estimate");
    eq(m.trailer.kg, 2500, "trailer");
    eq(m.trailer.source, "plated");
    eq(m.vehicleOwnKg, 2330, "vehicle without tow ball");
    eq(m.combined.kg, 4830, "combined counts the tow ball once");
  });
  test("masses: weighbridge readings (trailer hitched) take priority", () => {
    const m = C.rigMasses(
      bakkie({
        tareKg: 2100,
        towballKg: 200,
        trailers: trailer(2500),
        trailerActualKg: 2400,
        weighbridge: { frontAxleKg: 1200, rearAxleKg: 1500, trailerAxlesKg: 2100 },
      })
    );
    eq(m.vehicle.kg, 2700, "vehicle");
    eq(m.trailer.kg, 2300, "trailer = axles + tow ball");
    eq(m.combined.kg, 4800, "combined = all axles");
    eq(m.combined.source, "weighbridge");
  });
  test("masses: actual trailer mass beats plated GVM", () => {
    const m = C.rigMasses(bakkie({ tareKg: 2000, trailers: trailer(2500), trailerActualKg: 1900 }));
    eq(m.trailer.kg, 1900);
    eq(m.trailer.source, "entered");
    eq(m.towballMissing, true, "tow ball flagged missing");
  });
  test("masses: tow ball ignored without a trailer", () => {
    eq(C.rigMasses(bakkie({ tareKg: 2000, towballKg: 200 })).vehicle.kg, 2000);
  });

  // ------------------------------------------------------------ reg 239
  test("239(1): goods vehicle over GVM on estimate fails", () => {
    const c = C.overloadingCheck(
      bakkie({ tareKg: 2100, gvmKg: 3100, loadItems: items([900, 1]), towballKg: 200, trailers: trailer(2000) })
    );
    eq(c.status, "fail");
    includes(c.reason, "over GVM by 100");
  });
  test("239(1): within GVM passes", () => {
    eq(C.overloadingCheck(bakkie({ tareKg: 2100, gvmKg: 3100, loadItems: items([300, 1]) })).status, "pass");
  });
  test("239(1): rear axle over rating (weighbridge) fails", () => {
    const c = C.overloadingCheck(
      bakkie({ gvmKg: 3100, rearAxleRatingKg: 1800, weighbridge: { frontAxleKg: 1200, rearAxleKg: 1850 } })
    );
    eq(c.status, "fail");
    includes(c.reason, "rear axle over by 50");
  });
  test("239(1): combination over GCM fails", () => {
    const c = C.overloadingCheck(
      bakkie({ tareKg: 2100, gvmKg: 3100, gcmKg: 5000, loadItems: items([400, 1]), trailers: trailer(2600) })
    );
    eq(c.status, "fail");
    includes(c.reason, "over GCM by 100");
  });
  test("239(1): nothing loaded yet is info, not a pass", () => {
    eq(C.overloadingCheck(bakkie({ tareKg: 2100, gvmKg: 3100 })).status, "info");
  });
  test("239(1): motor car is info citing the exclusion", () => {
    const c = C.overloadingCheck(car({ tareKg: 2100, gvmKg: 2700, loadItems: items([900, 1]) }));
    eq(c.status, "info");
    if (c.ruleIds.indexOf("reg239-motor-car-exclusion") === -1) throw new Error("missing exclusion rule");
  });
  test("239(3): 2WD rear axle too light fails", () => {
    const c = C.drivingAxleCheck(
      bakkie({ drive: "rwd", trailers: trailer(3500), weighbridge: { frontAxleKg: 1500, rearAxleKg: 1000, trailerAxlesKg: 3000 } })
    );
    eq(c.status, "fail");
    includes(c.reason, "5 × the rear axle load of 1 000 kg = 5 000 kg");
  });
  test("239(3): same rig as 4x4 passes (both axles drive)", () => {
    const c = C.drivingAxleCheck(
      bakkie({ drive: "4wd", trailers: trailer(3500), weighbridge: { frontAxleKg: 1500, rearAxleKg: 1000, trailerAxlesKg: 3000 } })
    );
    eq(c.status, "pass");
  });
  test("239(3): needs weighbridge readings, drive type; not shown for motor cars", () => {
    eq(C.drivingAxleCheck(bakkie({ drive: "rwd", tareKg: 2000 })).status, "info");
    eq(C.drivingAxleCheck(bakkie({ weighbridge: { rearAxleKg: 1000 } })).status, "incomplete");
    eq(C.drivingAxleCheck(car({ weighbridge: { rearAxleKg: 1000 } })), null);
    eq(C.runLegalChecks(car({ tareKg: 2000 })).checks.length, 4, "motor car: 4 legal cards");
  });

  // ------------------------------------------------------------ manufacturer ratings
  const exampleRig = (o) =>
    bakkie(
      Object.assign(
        {
          tareKg: 2100,
          gvmKg: 3100,
          gcmKg: 5850,
          brakedCapacityKg: 3500,
          unbrakedCapacityKg: 750,
          maxTowballKg: 350,
          loadItems: items([80, 2], [70, 1], [35, 1], [50, 1]),
          towballKg: 200,
          trailers: trailer(2500),
          trailerBrake: "overrun",
        },
        o
      )
    );

  test("payload: example uses 515 of 1 000 kg", () => {
    const c = M.payloadCheck(exampleRig());
    eq(c.status, "pass");
    includes(c.reason, "Using 515 kg of your 1 000 kg payload (52 %)");
    eq(c.meter.value, 515);
    eq(c.meter.max, 1000);
  });
  test("payload: within 5 % of the limit is amber, over is red", () => {
    eq(M.payloadCheck(exampleRig({ loadItems: items([760, 1]) })).status, "warn");
    eq(M.payloadCheck(exampleRig({ loadItems: items([810, 1]) })).status, "fail");
  });
  test("payload: empty load list is info with the payload figure", () => {
    const c = M.payloadCheck(bakkie({ tareKg: 2100, gvmKg: 3100 }));
    eq(c.status, "info");
    includes(c.reason, "1 000 kg");
  });
  test("payload: weighbridge vehicle mass against GVM", () => {
    const c = M.payloadCheck(bakkie({ gvmKg: 3100, weighbridge: { frontAxleKg: 1300, rearAxleKg: 1900 } }));
    eq(c.status, "fail");
    includes(c.reason, "100 kg over");
  });
  test("GCM: example leaves room for a 3 435 kg trailer", () => {
    const c = M.gcmCheck(exampleRig());
    eq(c.status, "pass");
    includes(c.reason, "= 4 915 kg");
    includes(c.reason, "trailer of up to 3 435 kg");
  });
  test("GCM: over is red; missing GCM is incomplete; no trailer shows room", () => {
    eq(M.gcmCheck(exampleRig({ gcmKg: 4800 })).status, "fail");
    eq(M.gcmCheck(exampleRig({ gcmKg: null })).status, "incomplete");
    const c = M.gcmCheck(exampleRig({ trailers: [] }));
    eq(c.status, "info");
    includes(c.reason, "up to 3 435 kg");
  });
  test("towing capacity: braked vs unbraked rating", () => {
    eq(M.towingCapacityCheck(exampleRig()).status, "pass");
    eq(M.towingCapacityCheck(exampleRig({ trailerBrake: "none", trailers: trailer(800) })).status, "fail");
    eq(M.towingCapacityCheck(exampleRig({ brakedCapacityKg: null })).status, "incomplete");
    eq(M.towingCapacityCheck(exampleRig({ trailers: [] })), null);
  });
  test("tow ball: 8 % is fine, over the maximum fails, 4 % is amber guidance", () => {
    eq(M.towballCheck(exampleRig()).status, "pass");
    eq(M.towballCheck(exampleRig({ towballKg: 380 })).status, "fail");
    const light = M.towballCheck(exampleRig({ towballKg: 100 }));
    eq(light.status, "warn");
    includes(light.reason, "4.0 %");
    eq(M.towballCheck(exampleRig({ towballKg: null })).status, "incomplete");
  });
  test("trailer GVM: weighed trailer over its plate fails; load capacity note", () => {
    const c = M.trailerGvmCheck(exampleRig({ trailerActualKg: 2600, trailerTareKg: 1800 }));
    eq(c.status, "fail");
    if (!c.notes.some((n) => n.indexOf("= 700 kg") !== -1)) throw new Error("missing load capacity note");
    eq(M.trailerGvmCheck(exampleRig()).status, "info", "not weighed");
  });
  test("axles: lever estimate from wheelbase and overhang", () => {
    const lever = M.towballLever(200, 3085, 1100);
    eq(Math.round(lever.rearAddKg), 271, "rear add");
    eq(Math.round(lever.frontReliefKg), 71, "front relief");
    eq(M.axleCheck(exampleRig({ wheelbaseMm: 3085, rearOverhangMm: 1100 })).status, "info");
  });
  test("axles: weighbridge against ratings", () => {
    const c = M.axleCheck(
      exampleRig({ frontAxleRatingKg: 1400, rearAxleRatingKg: 1800, weighbridge: { frontAxleKg: 1150, rearAxleKg: 1790 } })
    );
    eq(c.status, "warn", "rear at 99 %");
  });

  // ------------------------------------------------------------ heaviest trailer
  test("limit: example is capped at the tare by reg 151", () => {
    const t = M.trailerLimit(exampleRig());
    eq(t.limitKg, 2100);
    const binding = t.candidates.filter((c) => c.binding);
    eq(binding.length, 1);
    eq(binding[0].ruleId, "reg151-trailer-brakes");
  });
  test("limit: code B caps at 750 kg", () => {
    eq(M.trailerLimit(exampleRig({ licenceCode: "B" })).limitKg, 750);
    eq(M.licenceTrailerCap(exampleRig({ licenceCode: "EB" })), null);
    eq(M.licenceTrailerCap(exampleRig({ licenceCode: "B", gvmKg: 4500 })), 0, "B doesn't cover a C1 vehicle");
  });
  test("limit: service brake removes the reg 151 cap; GCM room can bind", () => {
    const t = M.trailerLimit(exampleRig({ trailerBrake: "service", gcmKg: 5500 }));
    eq(t.limitKg, 3085, "GCM room 5 500 - 2 415");
    if (!t.notes.length) throw new Error("expected a note about no reg 151 cap");
  });
  test("limit: no brake type chosen gives no figure", () => {
    eq(M.trailerLimit(exampleRig({ trailerBrake: "" })).limitKg, null);
  });
  test("worked example presets all exist", () => {
    R.explainers.whyNotRated.example.loadItems.forEach((it) => {
      if (!R.loadPresets.some((p) => p.id === it.preset)) throw new Error("unknown preset " + it.preset);
    });
  });
  test("every rule id cited by a manufacturer check exists", () => {
    [exampleRig(), exampleRig({ weighbridge: { frontAxleKg: 1200, rearAxleKg: 1700, trailerAxlesKg: 2300 } }), bakkie({})].forEach(
      (i) => M.runMakerChecks(i).checks.forEach((c) => c.ruleIds.forEach((id) => R.get(id)))
    );
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
