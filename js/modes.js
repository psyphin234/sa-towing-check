/*
 * modes.js: the "What can I tow?" and "Motor car vs goods vehicle" modes
 * (SPEC §7). Pure functions, no DOM; built on checks.js and ratings.js.
 */
(function (root) {
  "use strict";

  const isNode = typeof module !== "undefined" && module.exports;
  const R = isNode ? require("./rules.js") : root.TOWING_RULES;
  const C = isNode ? require("./checks.js") : root.TOWING_CHECKS;
  const M = isNode ? require("./ratings.js") : root.TOWING_RATINGS;
  const { kg, isNum } = C;

  const BRAKES = ["none", "overrun", "service"];
  const BRAKE_TITLE = {
    none: "No brakes",
    overrun: "Overrun brakes (typical caravan)",
    service: "Service brake (driver-operated)",
  };

  function minOf(limits) {
    return limits.length ? Math.min.apply(null, limits.map((l) => l.kg)) : null;
  }

  function markBinding(limits) {
    const min = minOf(limits);
    limits.forEach((l) => (l.binding = l.kg === min));
    return limits;
  }

  // Licence class of the vehicle and the codes it needs (reg 99). With no
  // vehicle type, the heavier class of the two (both masses needed).
  function licenceClass(input) {
    const p = R.get("reg99-licence-codes").params;
    const classOf = (kgValue) => (kgValue <= p.lightVehicleMaxKg ? "B" : kgValue <= p.mediumVehicleMaxKg ? "C1" : "C");
    let cls;
    if (input.vehicleType) {
      const basisKg = input.vehicleType === "motorCar" ? input.tareKg : input.gvmKg;
      if (!isNum(basisKg)) return null;
      cls = classOf(basisKg);
    } else {
      if (!isNum(input.tareKg) || !isNum(input.gvmKg)) return null;
      const order = ["B", "C1", "C"];
      cls = order[Math.max(order.indexOf(classOf(input.tareKg)), order.indexOf(classOf(input.gvmKg)))];
    }
    return {
      cls,
      lightCode: p.requiredCode[cls].light,
      heavyCode: p.requiredCode[cls].heavy,
      lightTrailerMaxKg: p.lightTrailerMaxKg,
    };
  }

  // Trailer GVM thresholds for the reg 293 towing speed limit (goods vehicles).
  // eitherType: no vehicle type, so these apply only if it's a goods vehicle.
  function speedThresholds(input) {
    const p = R.get("reg293-goods-towing-speed").params;
    const general = R.get("reg292-general-speed").params;
    const eitherType = !input.vehicleType;
    if (input.vehicleType === "motorCar") return { applies: false, general };
    if (!isNum(input.gvmKg)) return { applies: true, general, eitherType, incomplete: true };
    return {
      applies: true,
      general,
      eitherType,
      // trailer GVM (sum) above which each limit applies
      limitOverKg: Math.max(p.combinedGvmOverKg - input.gvmKg, 0),
      heavyOverKg: Math.max(p.combinedGvmHeavyOverKg - input.gvmKg, 0),
      limitKmh: p.limitKmh,
      heavyLimitKmh: p.heavyLimitKmh,
      maxTrailers: p.maxTrailers,
    };
  }

  // ------------------------------------------------------------------ What can I tow?
  function whatCanITow(input) {
    if (!isNum(input.tareKg)) return { ready: false, reason: "Enter the tare from your licence disc." };
    const lic = licenceClass(input);
    if (!lic) return { ready: false, reason: "Enter the GVM: a goods vehicle's licence code depends on it." };

    const reg151 = C.maxTrailerByBrake(input.tareKg);
    const p151 = R.get("reg151-trailer-brakes").params;
    const licenceCap = M.licenceTrailerCap(input); // null (no cap), lightTrailerMaxKg, or 0
    const vehicleOnly = C.rigMasses(Object.assign({}, input, { trailers: [] }));
    const gcmRoom =
      isNum(input.gcmKg) && vehicleOnly.vehicle ? Math.max(input.gcmKg - vehicleOnly.vehicleOwnKg, 0) : null;

    const rows = BRAKES.map((brake) => {
      const legal = [];
      if (brake === "none") {
        const halfTare = input.tareKg * p151.unbrakedTareFraction;
        legal.push({
          kg: reg151.none,
          label:
            halfTare < p151.lightTrailerMaxKg
              ? `Reg 151(1)(a)(i): up to half your tare`
              : `Reg 151(1)(a)(i): up to ${kg(p151.lightTrailerMaxKg)}`,
          ruleId: "reg151-trailer-brakes",
        });
      } else if (brake === "overrun") {
        legal.push({
          kg: reg151.overrun,
          label:
            input.tareKg < p151.heavyTrailerMinKg
              ? "Reg 151(1)(b)(i): up to your tare"
              : `Reg 151(1)(c): up to ${kg(p151.heavyTrailerMinKg)}`,
          ruleId: "reg151-trailer-brakes",
        });
      }
      if (licenceCap !== null) {
        legal.push({
          kg: licenceCap,
          label:
            licenceCap === 0
              ? `Code ${input.licenceCode} does not cover this vehicle (needs ${lic.lightCode})`
              : `Code ${input.licenceCode}: trailer GVM up to ${kg(licenceCap)}`,
          ruleId: "reg99-licence-codes",
        });
      }

      const maker = [];
      const rating = brake === "none" ? input.unbrakedCapacityKg : input.brakedCapacityKg;
      if (isNum(rating))
        maker.push({
          kg: rating,
          label: `Factory ${brake === "none" ? "unbraked" : "braked"} towing capacity`,
          ruleId: "maker-towing-capacity",
        });
      if (gcmRoom !== null) maker.push({ kg: gcmRoom, label: "Room under the GCM with your load", ruleId: "maker-gcm" });

      const legalMaxKg = minOf(legal);
      return {
        brake,
        title: BRAKE_TITLE[brake],
        legal: markBinding(legal),
        maker: markBinding(maker),
        legalMaxKg, // null = no reg 151 or licence cap
        makerMaxKg: minOf(maker), // null = no ratings entered
        // Code needed to use this row's full legal allowance
        codeNeeded: legalMaxKg === null || legalMaxKg > lic.lightTrailerMaxKg ? lic.heavyCode : lic.lightCode,
      };
    });

    const notes = [];
    if (!input.vehicleType && licenceClass(Object.assign({}, input, { vehicleType: "motorCar" })).cls !== lic.cls)
      notes.push("The licence code needed depends on how the vehicle is registered (a motor car is classed by its tare, a goods vehicle by its GVM); this uses the stricter case. Choose the vehicle type to be sure.");
    if (!input.licenceCode)
      notes.push(
        `Trailers up to ${kg(lic.lightTrailerMaxKg)} GVM need code ${lic.lightCode}; heavier trailers need code ${lic.heavyCode}. Choose your licence code to apply it.`
      );
    if (!isNum(input.brakedCapacityKg) && !isNum(input.gcmKg))
      notes.push("Add the towing capacity and GCM (Manufacturer ratings) to see the manufacturer limits too.");

    return { ready: true, rows, licence: lic, licenceCap, speed: speedThresholds(input), notes };
  }

  // ------------------------------------------------------------------ motor car vs goods vehicle
  const BRAKE_SHORT = {
    none: "parking brake only",
    overrun: "overrun or service brake",
    service: "service brake (driver-operated)",
  };

  // One-line summary of a legal check, for the comparison table.
  function summarise(check, vehicleType) {
    if (!check) {
      return { status: "info", text: "Does not apply" };
    }
    if (check.status === "incomplete") return { status: "incomplete", text: check.reason };
    const d = check.data || {};
    switch (check.id) {
      case "licence":
        return { status: check.status, text: `Needs code ${d.required}` + (check.status === "fail" ? " (not yours)" : "") };
      case "brakes":
        return d.required
          ? { status: check.status, text: `Needs ${BRAKE_SHORT[d.required]}` }
          : { status: "info", text: check.reason };
      case "speed":
        if (d.limitKmh) return { status: check.status, text: `${d.limitKmh} km/h maximum` + (d.sign ? `, ${d.limitKmh} km/h sign on the rear` : "") };
        return { status: "info", text: "General limits (60 / 100 / 120 km/h)" };
      case "overloading":
        if (vehicleType === "motorCar") return { status: "info", text: "This offence does not apply (manufacturer limits still matter)" };
        return {
          status: check.status,
          text: { pass: "Applies: within the limits checked", fail: "Applies: overloaded", info: "Applies: add your load to check" }[check.status] || check.reason,
        };
      case "driving-axle":
        return {
          status: check.status,
          text: { pass: "Applies: within the 5× ratio", fail: "Applies: driving axle too lightly loaded", info: "Applies: needs weighbridge readings" }[check.status] || check.reason,
        };
      default:
        return { status: check.status, text: check.reason };
    }
  }

  const COMPARE_ROWS = [
    { id: "licence", title: "Licence code" },
    { id: "brakes", title: "Trailer brakes" },
    { id: "speed", title: "Speed limit" },
    { id: "overloading", title: "Overloading offence (reg 239(1))" },
    { id: "driving-axle", title: "Driving axle ratio (reg 239(3))" },
  ];

  function compareBodyTypes(input) {
    if (!isNum(input.tareKg) || !isNum(input.gvmKg))
      return { ready: false, reason: "Enter the tare and GVM: the comparison uses the same figures for both vehicle types." };
    const car = C.runLegalChecks(Object.assign({}, input, { vehicleType: "motorCar" })).checks;
    const goods = C.runLegalChecks(Object.assign({}, input, { vehicleType: "goodsVehicle" })).checks;
    const find = (list, id) => list.find((c) => c.id === id) || null;

    const rows = COMPARE_ROWS.map((r) => {
      const carCheck = find(car, r.id);
      const goodsCheck = find(goods, r.id);
      const carSum = summarise(carCheck, "motorCar");
      const goodsSum = summarise(goodsCheck, "goodsVehicle");
      const ruleIds = Array.from(new Set([].concat(carCheck ? carCheck.ruleIds : [], goodsCheck ? goodsCheck.ruleIds : [])));
      return {
        id: r.id,
        title: r.title,
        car: carSum,
        goods: goodsSum,
        same: carSum.text === goodsSum.text && carSum.status === goodsSum.status,
        ruleIds,
      };
    });
    return { ready: true, rows, differences: rows.filter((r) => !r.same).length };
  }

  const api = { whatCanITow, compareBodyTypes, speedThresholds, licenceClass, summarise, BRAKES };
  if (isNode) module.exports = api;
  else root.TOWING_MODES = api;
})(typeof window !== "undefined" ? window : globalThis);
