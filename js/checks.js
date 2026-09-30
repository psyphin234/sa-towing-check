/*
 * checks.js: legal checks (SPEC §4.1–4.4) and the rig mass model shared with
 * ratings.js. Pure functions, no DOM.
 *
 * Every threshold comes from rules.js params. Each check returns:
 *   { id, title, status, reason, notes: [], ruleIds: [] }
 * With no vehicle type, runLegalChecks adds variants: [{ type, label, status,
 * reason, notes }] to checks whose wording or outcome depends on the type
 * (variantsSame: true when only the wording does).
 * status is one of:
 *   "pass"        legal as entered (green)
 *   "warn"        legal, but with a restriction or something you must do (amber)
 *   "fail"        not legal as entered (red)
 *   "info"        nothing to pass or fail, just what applies (blue)
 *   "incomplete"  inputs missing (grey)
 *
 * Input shape (masses in kg; null/undefined = not entered):
 *   {
 *     vehicleType: "motorCar" | "goodsVehicle" | "",
 *     tareKg, gvmKg,
 *     licenceCode: "B" | "EB" | "C1" | "EC1" | "C" | "EC" | "",
 *     trailers: [{ gvmKg }],            // 0, 1 or 2 trailers
 *     trailerBrake: "none" | "overrun" | "service",
 *     // optional, used from build step 3 on:
 *     drive: "rwd" | "fwd" | "4wd" | "",
 *     gcmKg, frontAxleRatingKg, rearAxleRatingKg,
 *     brakedCapacityKg, unbrakedCapacityKg, maxTowballKg,
 *     loadItems: [{ label, kg, qty }],  // kg each x qty
 *     towballKg, trailerTareKg, trailerActualKg,   // trailer masses are totals for all trailers
 *     weighbridge: { frontAxleKg, rearAxleKg, trailerAxlesKg },  // trailer hitched
 *     wheelbaseMm, rearOverhangMm
 *   }
 */
(function (root) {
  "use strict";

  const R =
    typeof module !== "undefined" && module.exports ? require("./rules.js") : root.TOWING_RULES;

  // "2100" -> "2 100 kg" (SA style: space as thousands separator)
  function kg(n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kg";
  }

  function isNum(v) {
    return typeof v === "number" && isFinite(v) && v > 0;
  }

  function trailerSum(input) {
    const trailers = input.trailers || [];
    if (!trailers.length) return { count: 0, sumKg: 0, complete: true };
    const complete = trailers.every((t) => isNum(t.gvmKg));
    const sumKg = trailers.reduce((s, t) => s + (isNum(t.gvmKg) ? t.gvmKg : 0), 0);
    return { count: trailers.length, sumKg, complete };
  }

  function vehicleTypeLabel(type) {
    return type === "motorCar" ? "motor car" : "goods vehicle";
  }

  // data: optional machine-readable outcome (used for short summaries, e.g. the comparison table)
  function result(id, title, status, reason, ruleIds, notes, data) {
    return { id, title, status, reason, ruleIds, notes: notes || [], data: data || null };
  }

  // ------------------------------------------------------------------ §4.1 licence code (reg 99)
  function licenceCheck(input) {
    const rule = R.get("reg99-licence-codes");
    const p = rule.params;
    const ids = ["reg99-licence-codes"];
    const title = "Driving licence code";
    const t = trailerSum(input);

    if (!input.vehicleType) {
      return result("licence", title, "incomplete", "Choose the vehicle type from your registration papers.", ids);
    }
    const byTare = input.vehicleType === "motorCar";
    const basisKg = byTare ? input.tareKg : input.gvmKg;
    const basisName = byTare ? "tare" : "GVM";
    if (!isNum(basisKg)) {
      return result(
        "licence",
        title,
        "incomplete",
        `Enter the vehicle's ${basisName}: a ${vehicleTypeLabel(input.vehicleType)} is classed by its ${basisName}.`,
        ids
      );
    }
    if (!t.complete) {
      return result("licence", title, "incomplete", "Enter the trailer's plated GVM.", ids);
    }

    const vehicleClass =
      basisKg <= p.lightVehicleMaxKg ? "B" : basisKg <= p.mediumVehicleMaxKg ? "C1" : "C";
    const heavyTrailer = t.sumKg > p.lightTrailerMaxKg;
    const required = p.requiredCode[vehicleClass][heavyTrailer ? "heavy" : "light"];

    const notes = [];
    const why =
      `Your ${vehicleTypeLabel(input.vehicleType)} is classed by its ${basisName} (${kg(basisKg)}, ` +
      (vehicleClass === "B"
        ? `up to ${kg(p.lightVehicleMaxKg)})`
        : vehicleClass === "C1"
        ? `over ${kg(p.lightVehicleMaxKg)}, up to ${kg(p.mediumVehicleMaxKg)})`
        : `over ${kg(p.mediumVehicleMaxKg)})`) +
      (t.count === 0
        ? ", with no trailer."
        : `, with a trailer GVM ${t.count > 1 ? "total " : ""}of ${kg(t.sumKg)} (${
            heavyTrailer ? "over" : "up to"
          } ${kg(p.lightTrailerMaxKg)}).`);

    if (!byTare && vehicleClass !== "B" && isNum(input.tareKg) && input.tareKg <= p.lightVehicleMaxKg) {
      notes.push(
        `Goods vehicles are classed by GVM, not tare, so this vehicle needs ${required} even though its tare is under ${kg(p.lightVehicleMaxKg)}.`
      );
      ids.push("reg99-eb-articulated-myth");
    }
    if (p.outOfScopeCodes.indexOf(required) !== -1) {
      notes.push(`Code ${required} vehicles are outside what this tool checks in detail.`);
    }
    if (t.count > 1) notes.push(rule.notes[0]);

    const data = { required };
    if (!input.licenceCode) {
      return result("licence", title, "info", `You need code ${required}. ${why}`, ids, notes, data);
    }
    const covered = (p.includes[input.licenceCode] || []).indexOf(required) !== -1;
    if (covered) {
      return result(
        "licence",
        title,
        "pass",
        `Your code ${input.licenceCode} covers this (needs ${required}). ${why}`,
        ids,
        notes,
        data
      );
    }
    return result(
      "licence",
      title,
      "fail",
      `This needs code ${required}; code ${input.licenceCode} only covers ${p.includes[input.licenceCode].join(", ")}. ${why}`,
      ids,
      notes,
      data
    );
  }

  // ------------------------------------------------------------------ §4.2 trailer brakes (reg 151)
  // Pure rule: which brake level does a trailer GVM (sum) need behind this tare?
  function requiredBrake(trailerGvmKg, tareKg) {
    const p = R.get("reg151-trailer-brakes").params;
    if (trailerGvmKg > p.heavyTrailerMinKg) return { level: "service", clause: p.clauses.overHeavy };
    if (trailerGvmKg > tareKg)
      return { level: "service", clause: trailerGvmKg > p.lightTrailerMaxKg ? p.clauses.overTare : p.clauses.lightOverTare };
    if (trailerGvmKg > p.lightTrailerMaxKg) return { level: "overrun", clause: p.clauses.heavyUpToTare };
    if (trailerGvmKg > tareKg * p.unbrakedTareFraction)
      return { level: "overrun", clause: p.clauses.lightOverTareHalf };
    return { level: "none", clause: p.clauses.parkingOnly };
  }

  // Largest legal trailer GVM (sum) for each brake type behind this tare.
  function maxTrailerByBrake(tareKg) {
    const p = R.get("reg151-trailer-brakes").params;
    return {
      none: Math.min(p.lightTrailerMaxKg, tareKg * p.unbrakedTareFraction),
      overrun: Math.min(tareKg, p.heavyTrailerMinKg),
      service: null, // no reg 151 cap; licence, manufacturer and other limits still apply
    };
  }

  const BRAKE_TEXT = {
    none: "no brakes (parking brake only)",
    overrun: "an overrun or service brake",
    service: "a service brake the driver can operate from the tow vehicle",
  };
  const BRAKE_FITTED_TEXT = { none: "no brakes", overrun: "overrun brakes", service: "a service brake" };

  function brakeCheck(input) {
    const rule = R.get("reg151-trailer-brakes");
    const p = rule.params;
    const ids = ["reg151-trailer-brakes", "reg151-plated-gvm"];
    const title = "Trailer brakes vs tow vehicle tare";
    const t = trailerSum(input);

    if (t.count === 0) return result("brakes", title, "info", "No trailer entered.", ids.slice(0, 1));
    if (!isNum(input.tareKg))
      return result("brakes", title, "incomplete", "Enter the tow vehicle's tare (from the licence disc).", ids);
    if (!t.complete) return result("brakes", title, "incomplete", "Enter the trailer's plated GVM.", ids);
    if (!input.trailerBrake)
      return result("brakes", title, "incomplete", "Choose the trailer's brake type.", ids);

    const need = requiredBrake(t.sumKg, input.tareKg);
    const max = maxTrailerByBrake(input.tareKg);
    const gvmText = `Trailer GVM ${t.count > 1 ? "total " : ""}${kg(t.sumKg)}`;
    const reason =
      `${gvmText} behind a tare of ${kg(input.tareKg)} needs ${BRAKE_TEXT[need.level]} (reg ${need.clause}).`;

    const notes = [
      `Limits for your tare: no brakes up to ${kg(max.none)}; overrun brakes up to ${kg(max.overrun)}; above that a service brake is required.`,
      rule.notes[0],
    ];
    if (t.count > 1) notes.push(rule.notes[1]);
    if (need.level === "service" && input.trailerBrake === "overrun")
      ids.push("def-overrun-service-brake");

    const ok = p.brakeLevels[input.trailerBrake] >= p.brakeLevels[need.level];
    return result(
      "brakes",
      title,
      ok ? "pass" : "fail",
      ok
        ? `${reason} ${capitalise(BRAKE_FITTED_TEXT[input.trailerBrake])}: legal.`
        : `${reason} It has ${BRAKE_FITTED_TEXT[input.trailerBrake]}: not legal.`,
      ids,
      notes,
      { required: need.level }
    );
  }

  function capitalise(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ------------------------------------------------------------------ §4.3 speed limit (reg 292/293)
  function speedCheck(input) {
    const general = R.get("reg292-general-speed").params;
    const p = R.get("reg293-goods-towing-speed").params;
    const title = "Speed limit";
    const t = trailerSum(input);
    const generalText = `General limits apply: ${general.urbanKmh} km/h urban, ${general.ruralKmh} km/h rural, ${general.freewayKmh} km/h freeway.`;

    if (!input.vehicleType)
      return result("speed", title, "incomplete", "Choose the vehicle type from your registration papers.", [
        "reg293-goods-towing-speed",
      ]);
    const noTowingLimit = { limitKmh: null, sign: false };
    if (input.vehicleType === "motorCar") {
      if (t.count === 0)
        return result("speed", title, "info", `No trailer entered. ${generalText}`, ["reg292-general-speed"], null, noTowingLimit);
      return result(
        "speed",
        title,
        "info",
        `The reg 293 towing limit applies to goods vehicles only, not to a motor car. ${generalText}`,
        ["reg293-goods-towing-speed", "reg292-general-speed", "def-motor-car"],
        null,
        noTowingLimit
      );
    }

    // Goods vehicle: reg 293 uses its GVM alone, or with trailers the sum of all GVMs.
    const ids = ["reg293-goods-towing-speed"];
    if (!isNum(input.gvmKg))
      return result("speed", title, "incomplete", "Enter the vehicle's GVM.", ids);
    if (!t.complete) return result("speed", title, "incomplete", "Enter the trailer's plated GVM.", ids);
    if (t.count > p.maxTrailers)
      return result("speed", title, "info", `More than ${p.maxTrailers} trailers is outside what this tool checks.`, ids);

    const towing = t.count > 0;
    const combined = input.gvmKg + t.sumKg;
    const sumText = towing
      ? `Vehicle GVM ${kg(input.gvmKg)} + trailer GVM ${kg(t.sumKg)} = ${kg(combined)}`
      : `Vehicle GVM ${kg(input.gvmKg)}`;
    const signNotes = towing ? [R.get("reg293-speed-sign").notes[0]] : [];
    const limited = (kmh, overKg, clause) =>
      result(
        "speed",
        title,
        "warn",
        `Maximum ${kmh} km/h, and a ${kmh} km/h sign must be displayed on the rear. ${sumText}, over ${kg(overKg)} (reg ${clause}).`,
        ids.concat("reg293-speed-sign"),
        signNotes,
        { limitKmh: kmh, sign: true }
      );
    if (combined > p.combinedGvmHeavyOverKg)
      return limited(p.heavyLimitKmh, p.combinedGvmHeavyOverKg, towing ? p.clauses.heavy : p.clauses.soloHeavy);
    if (combined > p.combinedGvmOverKg)
      return limited(p.limitKmh, p.combinedGvmOverKg, towing ? p.clauses.limit : p.clauses.soloLimit);
    return result(
      "speed",
      title,
      "info",
      towing
        ? `${sumText}, not over ${kg(p.combinedGvmOverKg)}, so the reg 293 limit does not apply. ${generalText}`
        : `No trailer entered, and the GVM is not over ${kg(p.combinedGvmOverKg)}. ${generalText}`,
      towing ? ids.concat("reg292-general-speed") : ["reg292-general-speed"],
      null,
      noTowingLimit
    );
  }

  // ------------------------------------------------------------------ rig mass model
  // Where each mass comes from, best source first. Weighbridge readings are
  // taken with the trailer hitched, so the vehicle's axles already carry the
  // tow ball mass and the trailer's axles carry the rest of the trailer.
  const MASS_SOURCE_TEXT = {
    weighbridge: "weighbridge readings",
    estimate: "an estimate (tare + load list + tow ball mass)",
    entered: "the trailer's actual mass you entered",
    plated: "the trailer's plated GVM, as no actual mass was entered",
  };

  function rigMasses(input) {
    const t = trailerSum(input);
    const itemsKg = (input.loadItems || []).reduce((s, it) => {
      const each = Number(it.kg);
      const qty = Number(it.qty);
      return s + (each > 0 && qty > 0 ? each * qty : 0);
    }, 0);
    const towballKnown = isNum(input.towballKg);
    const tb = t.count && towballKnown ? input.towballKg : 0;
    const wb = input.weighbridge || {};

    let vehicle = null;
    if (isNum(wb.frontAxleKg) && isNum(wb.rearAxleKg))
      vehicle = { kg: wb.frontAxleKg + wb.rearAxleKg, source: "weighbridge" };
    else if (isNum(input.tareKg)) vehicle = { kg: input.tareKg + itemsKg + tb, source: "estimate" };

    let trailer = null;
    if (t.count) {
      if (isNum(wb.trailerAxlesKg)) trailer = { kg: wb.trailerAxlesKg + tb, source: "weighbridge" };
      else if (isNum(input.trailerActualKg)) trailer = { kg: input.trailerActualKg, source: "entered" };
      else if (t.complete && t.sumKg > 0) trailer = { kg: t.sumKg, source: "plated" };
    }

    let combined = null;
    if (vehicle && (t.count === 0 || trailer)) {
      const allWeighed = vehicle.source === "weighbridge" && (t.count === 0 || trailer.source === "weighbridge");
      combined = { kg: vehicle.kg - tb + (trailer ? trailer.kg : 0), source: allWeighed ? "weighbridge" : "estimate" };
    }

    return {
      trailerCount: t.count,
      trailerPlatedKg: t.complete ? t.sumKg : null,
      itemsKg,
      towballKg: towballKnown ? input.towballKg : null,
      towballMissing: t.count > 0 && !towballKnown,
      vehicle,
      trailer,
      combined,
      // vehicle mass without the tow ball: what the GCM leaves room against
      vehicleOwnKg: vehicle ? vehicle.kg - tb : null,
    };
  }

  // ------------------------------------------------------------------ §4.4 overloading (reg 239)
  function overloadingCheck(input) {
    const title = "Overloading";
    const ids = ["reg239-overloading"];
    if (!input.vehicleType)
      return result("overloading", title, "incomplete", "Choose the vehicle type from your registration papers.", ids);
    if (input.vehicleType === "motorCar") {
      return result(
        "overloading",
        title,
        "info",
        "Reg 239 lists goods vehicles, minibuses, buses and tractors, not motor cars, so its overloading offences (and the driving axle rule) do not apply to your vehicle. Its GVM, axle and GCM ratings still matter for safety and insurance: see Manufacturer limits.",
        ids.concat("reg239-motor-car-exclusion"),
        [R.get("reg239-motor-car-exclusion").notes[0]]
      );
    }
    if (!isNum(input.gvmKg)) return result("overloading", title, "incomplete", "Enter the vehicle's GVM.", ids);

    const m = rigMasses(input);
    if (!m.vehicle)
      return result("overloading", title, "incomplete", "Enter the tare, or weighbridge axle readings.", ids);
    if (m.vehicle.source === "estimate" && m.itemsKg === 0 && !m.towballKg) {
      return result(
        "overloading",
        title,
        "info",
        "Add what you carry to the load list (or enter weighbridge readings) to check the vehicle against its GVM.",
        ids.concat("def-gvm")
      );
    }

    const over = [];
    const parts = [];
    const notes = [];
    ids.push("def-gvm");

    parts.push(`Vehicle ${kg(m.vehicle.kg)} against its GVM of ${kg(input.gvmKg)}.`);
    if (m.vehicle.kg > input.gvmKg) over.push(`over GVM by ${kg(m.vehicle.kg - input.gvmKg)}`);

    const wb = input.weighbridge || {};
    [
      ["front", wb.frontAxleKg, input.frontAxleRatingKg],
      ["rear", wb.rearAxleKg, input.rearAxleRatingKg],
    ].forEach(([axle, load, rating]) => {
      if (isNum(load) && isNum(rating)) {
        parts.push(`${capitalise(axle)} axle ${kg(load)} against its rating of ${kg(rating)}.`);
        if (load > rating) over.push(`${axle} axle over by ${kg(load - rating)}`);
      }
    });
    if (!isNum(wb.frontAxleKg) || !isNum(wb.rearAxleKg))
      notes.push("Axle loads are only checked from weighbridge readings.");

    if (isNum(input.gcmKg) && m.combined) {
      ids.push("def-gcm");
      parts.push(`Combination ${kg(m.combined.kg)} against the GCM of ${kg(input.gcmKg)}.`);
      if (m.combined.kg > input.gcmKg) over.push(`over GCM by ${kg(m.combined.kg - input.gcmKg)}`);
    } else if (!isNum(input.gcmKg)) {
      notes.push("GCM not entered, so the combination is not checked.");
    }

    notes.unshift(`Vehicle mass from ${MASS_SOURCE_TEXT[m.vehicle.source]}.`);
    if (m.trailer && isNum(input.gcmKg)) notes.push(`Trailer mass from ${MASS_SOURCE_TEXT[m.trailer.source]}.`);
    if (m.towballMissing) notes.push("Tow ball mass not entered: it adds to the vehicle's mass.");

    return result(
      "overloading",
      title,
      over.length ? "fail" : "pass",
      (over.length ? `Overloaded: ${over.join("; ")}. ` : "Within the limits checked. ") + parts.join(" "),
      ids,
      notes
    );
  }

  // ------------------------------------------------------------------ tow ball mass (VC 8026 via reg 216)
  // A grey area (see the rule's notes), but the checker treats 100 kg as the
  // maximum for a caravan or light trailer.
  function towballLegalCheck(input) {
    const t = trailerSum(input);
    if (t.count === 0) return null;
    const p = R.get("vc8026-towball-limit").params;
    const ids = ["vc8026-towball-limit"];
    const title = "Tow ball mass (25–100 kg)";
    const range = `${kg(p.minKg)} to ${kg(p.maxKg)}`;
    if ((input.trailers || []).some((tr) => isNum(tr.gvmKg) && tr.gvmKg > p.maxTrailerGvmKg))
      return result(
        "towball-legal",
        title,
        "info",
        `The ${range} limit is for caravans and light trailers with a GVM up to ${kg(p.maxTrailerGvmKg)}. Your trailer is heavier: follow its maker's tow ball figures.`,
        ids
      );
    if (!isNum(input.towballKg))
      return result(
        "towball-legal",
        title,
        "info",
        `With the trailer loaded, keep the tow ball (nose) mass between ${range}, whatever your towbar is rated for. Check it with a tow ball scale.`,
        ids
      );
    const tb = input.towballKg;
    if (tb > p.maxKg)
      return result(
        "towball-legal",
        title,
        "fail",
        `${kg(tb)} on the tow ball is over the ${kg(p.maxKg)} maximum for a caravan or light trailer. Move load back towards the trailer's axle.`,
        ids
      );
    if (tb < p.minKg)
      return result(
        "towball-legal",
        title,
        "fail",
        `${kg(tb)} on the tow ball is under the ${kg(p.minKg)} minimum for a caravan or light trailer. Move load forward, over the trailer's axle.`,
        ids
      );
    return result("towball-legal", title, "pass", `${kg(tb)} on the tow ball: within ${range}.`, ids);
  }

  const DRIVE_TEXT = { rwd: "rear axle", fwd: "front axle", "4wd": "front and rear axles" };

  function drivingAxleCheck(input) {
    if (input.vehicleType !== "goodsVehicle") return null; // covered by the overloading card for motor cars
    const p = R.get("reg239-driving-axle").params;
    const title = "Driving axle ratio";
    const ids = ["reg239-driving-axle"];
    const wb = input.weighbridge || {};
    if (!isNum(wb.frontAxleKg) && !isNum(wb.rearAxleKg)) {
      return result(
        "driving-axle",
        title,
        "info",
        `The combination may weigh at most ${p.maxMassToDrivingAxleRatio} times the load on the driving axle(s). Checking this needs weighbridge axle readings with the trailer hitched.`,
        ids
      );
    }
    if (!input.drive) return result("driving-axle", title, "incomplete", "Choose the vehicle's drive type.", ids);

    const driving =
      input.drive === "rwd"
        ? wb.rearAxleKg
        : input.drive === "fwd"
        ? wb.frontAxleKg
        : isNum(wb.frontAxleKg) && isNum(wb.rearAxleKg)
        ? wb.frontAxleKg + wb.rearAxleKg
        : null;
    if (!isNum(driving))
      return result("driving-axle", title, "incomplete", `Enter the weighbridge reading for the ${DRIVE_TEXT[input.drive]}.`, ids);

    const m = rigMasses(input);
    if (!m.combined)
      return result("driving-axle", title, "incomplete", "Enter both axle readings (or the tare) and the trailer mass.", ids);

    const limit = driving * p.maxMassToDrivingAxleRatio;
    const ok = m.combined.kg <= limit;
    const notes = [`Combination mass from ${MASS_SOURCE_TEXT[m.combined.source]}.`];
    if (input.drive === "4wd") notes.push(R.get("reg239-driving-axle").notes[0]);
    return result(
      "driving-axle",
      title,
      ok ? "pass" : "fail",
      `Combination ${kg(m.combined.kg)} ${ok ? "is within" : "is more than"} ${p.maxMassToDrivingAxleRatio} × the ${DRIVE_TEXT[input.drive]} load of ${kg(driving)} = ${kg(limit)}.`,
      ids,
      notes
    );
  }

  // ------------------------------------------------------------------ all checks
  const STATUS_RANK = { fail: 4, incomplete: 3, warn: 2, info: 1, pass: 0 };

  function worstStatus(checks) {
    return checks.reduce((worst, c) => (STATUS_RANK[c.status] > STATUS_RANK[worst] ? c.status : worst), "pass");
  }

  // Vehicle type left blank: run a type-dependent check both ways. Identical
  // results show as one card. Otherwise the card gets a variant per type:
  // variantsSame when only the wording differs (same status and data), so
  // the card can give the shared outcome and tuck the variants away.
  const TYPE_LABEL = { goodsVehicle: "Goods vehicle", motorCar: "Motor car" };
  const SAME_OUTCOME_TEXT = {
    licence: (d, status) =>
      `you need code ${d.required}` +
      (status === "pass" ? ", which your code covers" : status === "fail" ? ", which your code doesn't cover" : ""),
    speed: (d) => (d.limitKmh ? `maximum ${d.limitKmh} km/h, with a ${d.limitKmh} km/h sign on the rear` : "the general limits apply"),
  };

  function forEitherType(check, input) {
    const run = (type) => check(Object.assign({}, input, { vehicleType: type }));
    const goods = run("goodsVehicle");
    const car =
      run("motorCar") ||
      result(goods.id, goods.title, "info", "Does not apply to a motor car.", ["reg239-motor-car-exclusion"]);
    if (goods.status === car.status && goods.reason === car.reason) return goods;
    const same =
      goods.status === car.status &&
      goods.data &&
      car.data &&
      SAME_OUTCOME_TEXT[goods.id] &&
      JSON.stringify(goods.data) === JSON.stringify(car.data);
    const variant = (type, c) => ({ type, label: TYPE_LABEL[type], status: c.status, reason: c.reason, notes: c.notes });
    const merged = result(
      goods.id,
      goods.title,
      worstStatus([goods, car]),
      same
        ? `Same whichever way it's registered: ${SAME_OUTCOME_TEXT[goods.id](goods.data, goods.status)}.`
        : "Depends on how your vehicle is registered:",
      Array.from(new Set(goods.ruleIds.concat(car.ruleIds))),
      null,
      same ? goods.data : null
    );
    merged.variants = [variant("goodsVehicle", goods), variant("motorCar", car)];
    merged.variantsSame = Boolean(same);
    return merged;
  }

  function runLegalChecks(input) {
    const typed = (check) => (input.vehicleType ? check(input) : forEitherType(check, input));
    const checks = [
      typed(licenceCheck),
      brakeCheck(input),
      typed(speedCheck),
      towballLegalCheck(input),
      typed(overloadingCheck),
      typed(drivingAxleCheck),
    ].filter(Boolean);
    return { checks, overall: worstStatus(checks), dependsOnType: checks.some((c) => c.variants && !c.variantsSame) };
  }

  const api = {
    runLegalChecks,
    licenceCheck,
    brakeCheck,
    speedCheck,
    towballLegalCheck,
    overloadingCheck,
    drivingAxleCheck,
    requiredBrake,
    maxTrailerByBrake,
    rigMasses,
    worstStatus,
    isNum,
    kg,
    MASS_SOURCE_TEXT,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TOWING_CHECKS = api;
})(typeof window !== "undefined" ? window : globalThis);
