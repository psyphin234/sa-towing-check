/*
 * ratings.js: manufacturer ratings (SPEC §5): payload, GCM, towing capacity,
 * tow ball, trailer's own GVM, axle loads, and the "heaviest trailer" summary.
 * These are the vehicle maker's limits, not law. Pure functions, no DOM.
 *
 * Results use the same shape as checks.js, plus an optional
 *   meter: { value, max, label }   (a "used of limit" bar)
 */
(function (root) {
  "use strict";

  const isNode = typeof module !== "undefined" && module.exports;
  const R = isNode ? require("./rules.js") : root.TOWING_RULES;
  const C = isNode ? require("./checks.js") : root.TOWING_CHECKS;
  const { kg, isNum, rigMasses, MASS_SOURCE_TEXT } = C;
  const NEAR = R.settings.nearLimitFraction;

  function result(id, title, status, reason, ruleIds, notes, meter) {
    return { id, title, status, reason, ruleIds, notes: notes || [], meter: meter || null };
  }

  // Over the limit: fail. Within NEAR of it: warn. Otherwise pass.
  function level(value, limit) {
    return value > limit ? "fail" : value >= limit * NEAR ? "warn" : "pass";
  }

  function pct(value, limit) {
    return Math.round((value / limit) * 100);
  }

  function leftOrOver(value, limit) {
    return value > limit ? `${kg(value - limit)} over` : `${kg(limit - value)} left`;
  }

  // ------------------------------------------------------------------ payload / GVM
  function payloadCheck(input) {
    const title = "Payload (GVM)";
    const ids = ["maker-payload", "def-gvm", "def-tare"];
    if (!isNum(input.gvmKg)) return result("payload", title, "incomplete", "Enter the vehicle's GVM.", ids);
    const m = rigMasses(input);
    if (!m.vehicle) return result("payload", title, "incomplete", "Enter the tare (from the licence disc).", ids);

    const notes = [];
    if (m.towballMissing) notes.push("Tow ball mass not entered: it counts against payload.");
    if (input.vehicleType === "goodsVehicle")
      notes.push("For a goods vehicle, going over the GVM is also an offence (reg 239(1)): see Legal requirements.");

    if (m.vehicle.source === "weighbridge") {
      const status = level(m.vehicle.kg, input.gvmKg);
      return result(
        "payload",
        title,
        status,
        `Weighbridge: the vehicle weighs ${kg(m.vehicle.kg)}, ${pct(m.vehicle.kg, input.gvmKg)} % of its GVM of ${kg(input.gvmKg)} (${leftOrOver(m.vehicle.kg, input.gvmKg)}).`,
        ids,
        notes,
        { value: m.vehicle.kg, max: input.gvmKg, label: "of GVM" }
      );
    }

    const payload = input.gvmKg - input.tareKg;
    if (payload <= 0) return result("payload", title, "incomplete", "The GVM should be more than the tare. Check both figures.", ids);
    const used = m.itemsKg + (m.towballKg && m.trailerCount ? m.towballKg : 0);
    if (used === 0) {
      return result(
        "payload",
        title,
        "info",
        `Your payload is ${kg(payload)} (GVM ${kg(input.gvmKg)} − tare ${kg(input.tareKg)}). Add what you carry to the load list to see how much is used.`,
        ids,
        notes
      );
    }
    notes.unshift(
      `Load list ${kg(m.itemsKg)}` + (m.towballKg && m.trailerCount ? ` + tow ball ${kg(m.towballKg)}` : "") + ` = ${kg(used)}.`
    );
    return result(
      "payload",
      title,
      level(used, payload),
      `Using ${kg(used)} of your ${kg(payload)} payload (${pct(used, payload)} %): ${leftOrOver(used, payload)}.`,
      ids,
      notes,
      { value: used, max: payload, label: "of payload" }
    );
  }

  // ------------------------------------------------------------------ GCM
  function gcmCheck(input) {
    const title = "Combination mass (GCM)";
    const ids = ["maker-gcm", "def-gcm"];
    if (!isNum(input.gcmKg)) return result("gcm", title, "incomplete", "Enter the GCM from the owner's manual.", ids);
    const m = rigMasses(input);
    if (!m.vehicle) return result("gcm", title, "incomplete", "Enter the tare (or weighbridge axle readings).", ids);

    const room = input.gcmKg - m.vehicleOwnKg;
    const vehicleNote = `Vehicle mass from ${MASS_SOURCE_TEXT[m.vehicle.source]}.`;
    if (m.trailerCount === 0) {
      return result(
        "gcm",
        title,
        room > 0 ? "info" : "fail",
        room > 0
          ? `With the vehicle as loaded (${kg(m.vehicleOwnKg)}), the GCM of ${kg(input.gcmKg)} leaves room for a trailer weighing up to ${kg(room)}.`
          : `The vehicle as loaded (${kg(m.vehicleOwnKg)}) already exceeds the GCM of ${kg(input.gcmKg)}.`,
        ids,
        [vehicleNote]
      );
    }
    if (!m.trailer) return result("gcm", title, "incomplete", "Enter the trailer's plated GVM or actual mass.", ids);

    const notes = [
      vehicleNote,
      `Trailer mass from ${MASS_SOURCE_TEXT[m.trailer.source]}.`,
      "The tow ball mass is counted once: it is part of the trailer's mass, even though the vehicle carries it.",
    ];
    if (m.towballMissing && m.vehicle.source === "estimate")
      notes.push("Tow ball mass not entered; the vehicle estimate leaves it out.");
    const combined = m.combined.kg;
    return result(
      "gcm",
      title,
      level(combined, input.gcmKg),
      `Vehicle ${kg(m.vehicleOwnKg)} + trailer ${kg(m.trailer.kg)} = ${kg(combined)}, ${pct(combined, input.gcmKg)} % of the GCM of ${kg(input.gcmKg)} (${leftOrOver(combined, input.gcmKg)}). With this vehicle load, the GCM allows a trailer of up to ${kg(Math.max(room, 0))}.`,
      ids,
      notes,
      { value: combined, max: input.gcmKg, label: "of GCM" }
    );
  }

  // ------------------------------------------------------------------ towing capacity
  function towingCapacityCheck(input) {
    const m = rigMasses(input);
    if (m.trailerCount === 0) return null;
    const title = "Towing capacity";
    const ids = ["maker-towing-capacity"];
    if (!input.trailerBrake) return result("capacity", title, "incomplete", "Choose the trailer's brake type.", ids);
    const braked = input.trailerBrake !== "none";
    const rating = braked ? input.brakedCapacityKg : input.unbrakedCapacityKg;
    const name = braked ? "braked" : "unbraked";
    if (!isNum(rating))
      return result("capacity", title, "incomplete", `Enter the ${name} towing capacity from the owner's manual.`, ids);
    if (!m.trailer) return result("capacity", title, "incomplete", "Enter the trailer's plated GVM or actual mass.", ids);
    return result(
      "capacity",
      title,
      level(m.trailer.kg, rating),
      `Trailer ${kg(m.trailer.kg)} against the ${name} towing capacity of ${kg(rating)} (${leftOrOver(m.trailer.kg, rating)}).`,
      ids,
      [`Trailer mass from ${MASS_SOURCE_TEXT[m.trailer.source]}.`, "Reg 151 may set a lower legal limit: see Legal requirements."]
    );
  }

  // ------------------------------------------------------------------ tow ball
  function towballCheck(input) {
    const m = rigMasses(input);
    if (m.trailerCount === 0) return null;
    const title = "Tow ball mass";
    const ids = ["maker-towball-max", "guidance-towball-mass"];
    if (!m.towballKg)
      return result("towball", title, "incomplete", "Enter the tow ball (nose) mass: weigh it with a tow ball scale.", ids);

    const g = R.get("guidance-towball-mass").params;
    const parts = [];
    const notes = [];
    let status = "pass";

    if (isNum(input.maxTowballKg)) {
      parts.push(`${kg(m.towballKg)} against the maximum of ${kg(input.maxTowballKg)}.`);
      if (m.towballKg > input.maxTowballKg) status = "fail";
    } else {
      parts.push(`Tow ball mass ${kg(m.towballKg)}.`);
      notes.push("Maximum tow ball mass not entered (owner's manual / towbar plate).");
    }

    if (m.trailer) {
      const ratio = m.towballKg / m.trailer.kg;
      const inRange = ratio >= g.minFraction && ratio <= g.maxFraction;
      parts.push(
        `That is ${(ratio * 100).toFixed(1)} % of the trailer's ${kg(m.trailer.kg)}; the rule of thumb is ${Math.round(g.minFraction * 100)}–${Math.round(g.maxFraction * 100)} % (guidance, not law).`
      );
      if (!inRange) {
        if (status === "pass") status = "warn";
        notes.push(
          ratio < g.minFraction
            ? "A light tow ball mass can make the trailer sway. Move load forward in the trailer, over its axle."
            : "A heavy tow ball mass overloads the rear axle and lightens the steering. Move load back towards the trailer's axle."
        );
      }
      notes.push(`Trailer mass from ${MASS_SOURCE_TEXT[m.trailer.source]}.`);
    }
    return result("towball", title, status, parts.join(" "), ids, notes);
  }

  // ------------------------------------------------------------------ trailer's own GVM
  function trailerGvmCheck(input) {
    const m = rigMasses(input);
    if (m.trailerCount === 0) return null;
    const title = "Trailer within its own GVM";
    const ids = ["maker-trailer-gvm"];
    if (!isNum(m.trailerPlatedKg) || m.trailerPlatedKg <= 0)
      return result("trailer-gvm", title, "incomplete", "Enter the trailer's plated GVM.", ids);

    const notes = [];
    if (isNum(input.trailerTareKg)) {
      const capacity = m.trailerPlatedKg - input.trailerTareKg;
      notes.push(`Load capacity: plated GVM ${kg(m.trailerPlatedKg)} − tare ${kg(input.trailerTareKg)} = ${kg(capacity)}.`);
    }
    const weighed = m.trailer && (m.trailer.source === "weighbridge" || m.trailer.source === "entered");
    if (!weighed) {
      return result(
        "trailer-gvm",
        title,
        "info",
        `Weigh the loaded trailer (or enter its actual mass) to check it against its plated GVM of ${kg(m.trailerPlatedKg)}.`,
        ids,
        notes
      );
    }
    notes.push(`Trailer mass from ${MASS_SOURCE_TEXT[m.trailer.source]}.`);
    return result(
      "trailer-gvm",
      title,
      level(m.trailer.kg, m.trailerPlatedKg),
      `Trailer ${kg(m.trailer.kg)}, ${pct(m.trailer.kg, m.trailerPlatedKg)} % of its plated GVM of ${kg(m.trailerPlatedKg)} (${leftOrOver(m.trailer.kg, m.trailerPlatedKg)}).`,
      ids,
      notes,
      { value: m.trailer.kg, max: m.trailerPlatedKg, label: "of trailer GVM" }
    );
  }

  // ------------------------------------------------------------------ axle loads
  // Tow ball lever: extra rear axle load and front axle relief.
  function towballLever(towballKg, wheelbaseMm, rearOverhangMm) {
    return {
      rearAddKg: (towballKg * (wheelbaseMm + rearOverhangMm)) / wheelbaseMm,
      frontReliefKg: (towballKg * rearOverhangMm) / wheelbaseMm,
    };
  }

  function axleCheck(input) {
    const title = "Axle loads";
    const ids = ["maker-axle-ratings"];
    const wb = input.weighbridge || {};
    const m = rigMasses(input);

    const pairs = [
      ["Front", wb.frontAxleKg, input.frontAxleRatingKg],
      ["Rear", wb.rearAxleKg, input.rearAxleRatingKg],
    ].filter(([, load, rating]) => isNum(load) && isNum(rating));
    if (pairs.length) {
      const statuses = pairs.map(([, load, rating]) => level(load, rating));
      const status = statuses.indexOf("fail") !== -1 ? "fail" : statuses.indexOf("warn") !== -1 ? "warn" : "pass";
      return result(
        "axles",
        title,
        status,
        pairs
          .map(([axle, load, rating]) => `${axle} axle ${kg(load)} of its ${kg(rating)} rating (${leftOrOver(load, rating)}).`)
          .join(" "),
        ids,
        ["From weighbridge readings with the trailer hitched."]
      );
    }

    if (m.trailerCount === 0 && !isNum(wb.frontAxleKg) && !isNum(wb.rearAxleKg)) return null;

    if (m.towballKg && m.trailerCount && isNum(input.wheelbaseMm) && isNum(input.rearOverhangMm)) {
      const lever = towballLever(m.towballKg, input.wheelbaseMm, input.rearOverhangMm);
      const notes = [R.get("maker-axle-ratings").notes[0]];
      return result(
        "axles",
        title,
        "info",
        `The tow ball mass of ${kg(m.towballKg)} adds about ${kg(lever.rearAddKg)} to the rear axle and takes about ${kg(lever.frontReliefKg)} off the front axle.` +
          (isNum(input.rearAxleRatingKg)
            ? ` Weigh the vehicle to compare the rear axle with its ${kg(input.rearAxleRatingKg)} rating.`
            : ""),
        ids,
        notes
      );
    }
    return result(
      "axles",
      title,
      "info",
      "Optional: enter weighbridge axle readings (and axle ratings) to check each axle, or the wheelbase and rear overhang to estimate the tow ball's effect.",
      ids
    );
  }

  // ------------------------------------------------------------------ heaviest trailer (SPEC §5)
  // The lowest of: reg 151 limit for the fitted brakes, licence code limit,
  // factory towing capacity and the room left under the GCM.
  function licenceTrailerCap(input) {
    const p = R.get("reg99-licence-codes").params;
    if (!input.licenceCode || !input.vehicleType) return null;
    const basisKg = input.vehicleType === "motorCar" ? input.tareKg : input.gvmKg;
    if (!isNum(basisKg)) return null;
    const vehicleClass = basisKg <= p.lightVehicleMaxKg ? "B" : basisKg <= p.mediumVehicleMaxKg ? "C1" : "C";
    const held = p.includes[input.licenceCode] || [];
    if (held.indexOf(p.requiredCode[vehicleClass].heavy) !== -1) return null; // no licence cap
    if (held.indexOf(p.requiredCode[vehicleClass].light) !== -1) return p.lightTrailerMaxKg;
    return 0; // licence doesn't cover this vehicle at all
  }

  function trailerLimit(input) {
    const brake = input.trailerBrake;
    if (!brake) return { limitKg: null, candidates: [], reason: "Choose the trailer's brake type to see the heaviest trailer you may tow." };
    const m = rigMasses(input);
    const candidates = [];
    const notes = [];

    if (isNum(input.tareKg)) {
      const legal = C.maxTrailerByBrake(input.tareKg)[brake];
      if (legal !== null) {
        candidates.push({
          label: brake === "none" ? "Reg 151: unbraked trailer" : "Reg 151: overrun brakes, up to your tare",
          kg: legal,
          basis: "plated GVM",
          category: "legal",
          ruleId: "reg151-trailer-brakes",
        });
      } else {
        notes.push("With a service brake, reg 151 sets no cap of its own.");
      }
    }
    const licenceCap = licenceTrailerCap(input);
    if (licenceCap !== null) {
      candidates.push({
        label: licenceCap === 0 ? `Licence code ${input.licenceCode} does not cover this vehicle` : `Licence code ${input.licenceCode}`,
        kg: licenceCap,
        basis: "plated GVM",
        category: "legal",
        ruleId: "reg99-licence-codes",
      });
    }
    const rating = brake === "none" ? input.unbrakedCapacityKg : input.brakedCapacityKg;
    if (isNum(rating)) {
      candidates.push({
        label: `Factory ${brake === "none" ? "unbraked" : "braked"} towing capacity`,
        kg: rating,
        basis: "actual mass",
        category: "manufacturer",
        ruleId: "maker-towing-capacity",
      });
    }
    if (isNum(input.gcmKg) && m.vehicle) {
      candidates.push({
        label: "Room left under the GCM with your vehicle load",
        kg: Math.max(input.gcmKg - m.vehicleOwnKg, 0),
        basis: "actual mass",
        category: "manufacturer",
        ruleId: "maker-gcm",
      });
    }

    if (!candidates.length)
      return { limitKg: null, candidates, notes, reason: "Enter the tare (and ideally the towing capacity and GCM) to see the heaviest trailer you may tow." };
    const limitKg = Math.min.apply(null, candidates.map((c) => c.kg));
    candidates.forEach((c) => (c.binding = c.kg === limitKg));
    return { limitKg, candidates, notes, reason: null };
  }

  function runMakerChecks(input) {
    const checks = [
      payloadCheck(input),
      gcmCheck(input),
      towingCapacityCheck(input),
      towballCheck(input),
      trailerGvmCheck(input),
      axleCheck(input),
    ].filter(Boolean);
    return { checks, overall: C.worstStatus(checks) };
  }

  const api = {
    runMakerChecks,
    trailerLimit,
    payloadCheck,
    gcmCheck,
    towingCapacityCheck,
    towballCheck,
    trailerGvmCheck,
    axleCheck,
    towballLever,
    licenceTrailerCap,
  };
  if (isNode) module.exports = api;
  else root.TOWING_RATINGS = api;
})(typeof window !== "undefined" ? window : globalThis);
