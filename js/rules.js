/*
 * rules.js: the ONE place for legal thresholds, rule text and citations.
 *
 * Every number the checks use comes from a rule's `params`, so each threshold
 * sits next to the regulation it comes from. UI and check code must not
 * hard-code thresholds.
 *
 * Rule fields:
 *   id           stable key, referenced by checks.js
 *   category     "legal" (law), "definition" (law, used for help text),
 *                "manufacturer" (ratings, not law) or "guidance" (rule of thumb, not law)
 *   title        short name
 *   summary      one or two plain-language sentences shown to the user
 *   regulation   Act / regulation reference
 *   sourceUrl    primary source link
 *   sourceLabel  name of that source
 *   moreSources  optional extra sources [{ label, url }]
 *   official     true only when sourceUrl is the official gazetted text
 *   verified     true only once checked against the official gazetted text
 *   lastChecked  "YYYY-MM-DD" when someone last checked the source, or null
 *   params       thresholds used by checks.js
 *   notes        optional extra lines (open questions, interpretation)
 *
 * Status (2026-09-29): every source is secondary (see SPEC §8), so every
 * rule is verified: false and shows the "unverified" badge. To verify a rule,
 * check it against the gazetted National Road Traffic Regulations, update
 * sourceUrl/regulation, set official and verified to true and fill in
 * lastChecked.
 *
 * Classic script (not an ES module) so the site also works opened from disk.
 * Exposes window.TOWING_RULES in the browser and module.exports in Node.
 */
(function (root) {
  "use strict";

  const SRC = {
    focus: {
      label: "Focus on Transport: Towing a trailer? Read this first",
      url: "https://focusontransport.co.za/towing-a-trailer-read-this-first/",
    },
    forum4x4: {
      label: "4x4community forum: regulation 99 text as quoted",
      url: "https://www.4x4community.co.za/forum/showthread.php/163025-Drivers-Licence-Confusion/page5",
    },
    findSchool: {
      label: "Find a Driving School: Code EB driver's licence",
      url: "https://findadrivingschool.co.za/code-eb-drivers-license",
    },
    wikiLicence: {
      label: "Wikipedia: Driving licence in South Africa",
      url: "https://en.wikipedia.org/wiki/Driving_licence_in_South_Africa",
    },
    ecoimpact: {
      label: "EcoImpact legal register: National Road Traffic Regulations (copy)",
      url: "https://registers.ecoimpact.co.za/app/webroot/uploads/doc_legislations/file_56e12ffcb90a2o_1adfq6leo1oe91rde8ll10e1mms7.htm",
    },
    arriveExpert: {
      label: "Arrive Alive: Ask the Expert #1019",
      url: "https://www.arrivealive.mobi/ask-the-expert/details/1019",
    },
    arriveSpeed: {
      label: "Arrive Alive: speed limits (s59, reg 292, reg 293)",
      url: "https://carinsurance.arrivealive.co.za/what-is-the-speed-limit-for-minibuses-on-the-freeway/",
    },
    arriveTowing: {
      label: "Arrive Alive: Towing of vehicles (quotes reg 239)",
      url: "https://www.arrivealive.mobi/towing-of-vehicles",
    },
    ddyn: {
      label: "NRTA definitions (ddyn legal updates)",
      url: "https://ddyn.com/Portal/UpdatesBrowser/PrintPreview?documentId=NRTA&gazdexId=18388",
    },
    saflii: {
      label: "SAFLII: National Road Traffic Act 93 of 1996 (consolidated)",
      url: "https://www.saflii.org/za/legis/consol_act/nrta1996189.pdf",
    },
    carmag: {
      label: "CAR magazine: Towing in South Africa, here's what the law says",
      url: "https://www.carmag.co.za/technical/technical/towing-in-south-africa-heres-what-the-law-says/",
    },
    carsCoZa: {
      label: "Cars.co.za: Guide to safe towing",
      url: "https://www.cars.co.za/motoring-news/guide-to-safe-towing/294448/",
    },
  };

  function src(key) {
    return { label: SRC[key].label, url: SRC[key].url };
  }

  // Shared defaults for every rule until it is checked against the gazette.
  const UNVERIFIED = { official: false, verified: false, lastChecked: null };

  const rules = [
    // ---------------------------------------------------------------- definitions
    {
      id: "def-goods-vehicle",
      category: "definition",
      title: "Goods vehicle",
      summary:
        "A motor vehicle (not a motor cycle, tricycle, motor car, minibus or bus) designed or adapted to carry goods on a public road. All bakkies/LDVs are goods vehicles, not only heavy ones.",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sourceUrl: SRC.ddyn.url,
      sourceLabel: SRC.ddyn.label,
      moreSources: [src("saflii")],
      ...UNVERIFIED,
    },
    {
      id: "def-motor-car",
      category: "definition",
      title: "Motor car",
      summary:
        "A motor vehicle designed or adapted solely or principally to carry no more than nine persons, including the driver. SUVs are motor cars.",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sourceUrl: SRC.ddyn.url,
      sourceLabel: SRC.ddyn.label,
      moreSources: [src("saflii")],
      ...UNVERIFIED,
    },
    {
      id: "def-vehicle-type-from-papers",
      category: "definition",
      title: "Vehicle type comes from the registration papers",
      summary:
        "Whether your vehicle is a motor car or a goods vehicle is what its registration certificate / licence disc says, not its body shape. Double cabs are the usual point of confusion: check your papers.",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sourceUrl: SRC.ddyn.url,
      sourceLabel: SRC.ddyn.label,
      ...UNVERIFIED,
    },
    {
      id: "def-overrun-service-brake",
      category: "definition",
      title: "Overrun brake vs service brake",
      summary:
        "An overrun brake is worked by a device on the drawbar through the trailer's inertia. A service brake must be operable by the driver of the drawing vehicle while moving. A normal caravan overrun brake is NOT a service brake.",
      regulation: "National Road Traffic Regulations, reg 1 (definitions) and reg 151(2)",
      sourceUrl: SRC.ecoimpact.url,
      sourceLabel: SRC.ecoimpact.label,
      moreSources: [src("ddyn")],
      ...UNVERIFIED,
    },

    // ---------------------------------------------------------------- reg 99 licence codes
    {
      id: "reg99-licence-codes",
      category: "legal",
      title: "Driving licence code",
      summary:
        "A motor car is classed by its tare, any other vehicle (bakkie/LDV, goods vehicle, minibus, bus) by its GVM. Up to 3 500 kg: code B, or EB when the trailer GVM is over 750 kg. Over 3 500 kg up to 16 000 kg: code C1, or EC1 with a trailer over 750 kg. Heavier needs C/EC.",
      regulation: "National Road Traffic Regulations, reg 99(4)",
      sourceUrl: SRC.focus.url,
      sourceLabel: SRC.focus.label,
      moreSources: [src("forum4x4"), src("wikiLicence")],
      ...UNVERIFIED,
      params: {
        lightVehicleMaxKg: 3500, // B / EB drawing vehicle: tare (motor car) or GVM (other) up to this
        mediumVehicleMaxKg: 16000, // C1 / EC1 drawing vehicle up to this
        lightTrailerMaxKg: 750, // trailer GVM above this needs an "E" code
        // Code needed for [vehicle class][heavy trailer?]
        requiredCode: {
          B: { light: "B", heavy: "EB" },
          C1: { light: "C1", heavy: "EC1" },
          C: { light: "C", heavy: "EC" },
        },
        // Higher codes include lower ones. Codes C and EC are out of scope for
        // this tool; their lists follow the same pattern but are unverified.
        includes: {
          B: ["B"],
          EB: ["B", "EB"],
          C1: ["B", "C1"],
          EC1: ["B", "EB", "C1", "EC1"],
          C: ["B", "C1", "C"],
          EC: ["B", "EB", "C1", "EC1", "C", "EC"],
        },
        outOfScopeCodes: ["C", "EC"],
      },
      notes: [
        "With two trailers this tool uses the sum of the trailer GVMs for the 750 kg test. Confirm with your DLTC.",
      ],
    },
    {
      id: "reg99-eb-articulated-myth",
      category: "legal",
      title: "The EB \"3 500 kg GCM\" myth",
      summary:
        "The \"GCM up to 3 500 kg\" wording for code EB applies to articulated vehicles (truck-tractor plus semi-trailer). A car or bakkie towing a caravan on a towball is not articulated. For those, the 3 500 kg limit applies to the tow vehicle, not to vehicle plus trailer.",
      regulation: "National Road Traffic Regulations, reg 99(4)",
      sourceUrl: SRC.findSchool.url,
      sourceLabel: SRC.findSchool.label,
      moreSources: [src("focus")],
      ...UNVERIFIED,
      notes: [
        "Example: a goods vehicle with a GVM over 3 500 kg (Super Duty class) needs C1 to drive and EC1 to tow more than 750 kg, even when its tare is under 3 500 kg.",
      ],
    },

    // ---------------------------------------------------------------- reg 151 trailer brakes
    {
      id: "reg151-trailer-brakes",
      category: "legal",
      title: "Trailer brakes vs tow vehicle tare",
      summary:
        "The brakes a trailer needs depend only on its plated GVM and the tow vehicle's tare. Engine power and the factory towing capacity play no part. Trailer GVM up to 750 kg and up to half the tare: parking brake only. Over half the tare (or over 750 kg), up to the tare: overrun or service brake. Over the tare, or over 3 500 kg: service brake the driver can operate.",
      regulation: "National Road Traffic Regulations, reg 151(1)(a)–(c)",
      sourceUrl: SRC.ecoimpact.url,
      sourceLabel: SRC.ecoimpact.label,
      moreSources: [src("arriveExpert"), src("focus")],
      ...UNVERIFIED,
      params: {
        lightTrailerMaxKg: 750, // 151(1)(a) vs (b)
        unbrakedTareFraction: 0.5, // 151(1)(a)(i): up to half the tare
        heavyTrailerMinKg: 3500, // 151(1)(c): above this, service brake regardless
        // Brake levels: none < overrun < service
        brakeLevels: { none: 0, overrun: 1, service: 2 },
        clauses: {
          parkingOnly: "151(1)(a)(i)",
          lightOverTareHalf: "151(1)(a)(ii)",
          heavyUpToTare: "151(1)(b)(i)",
          overTare: "151(1)(b)(ii)",
          overHeavy: "151(1)(c)",
        },
      },
      notes: [
        "Every trailer also needs a parking brake or a device to keep it stationary.",
        "With more than one trailer, the sum of all trailer GVMs is used (reg 151(1), closing words).",
      ],
    },
    {
      id: "reg151-plated-gvm",
      category: "legal",
      title: "Plated GVM, not actual mass",
      summary:
        "Reg 151 compares the trailer's plated GVM (from its licence disc / compliance plate) with the tow vehicle's tare, not what the trailer actually weighs on the day. A lightly loaded caravan with a high plated GVM still counts at its plated GVM.",
      regulation: "National Road Traffic Regulations, reg 151(1)",
      sourceUrl: SRC.ecoimpact.url,
      sourceLabel: SRC.ecoimpact.label,
      ...UNVERIFIED,
      notes: ["This is a reading of the regulation's wording that has not yet been confirmed."],
    },

    // ---------------------------------------------------------------- reg 292 / 293 speed
    {
      id: "reg292-general-speed",
      category: "legal",
      title: "General speed limits",
      summary: "60 km/h in urban areas, 100 km/h on rural roads other than freeways, 120 km/h on freeways, unless a sign shows otherwise.",
      regulation: "National Road Traffic Regulations, reg 292",
      sourceUrl: SRC.arriveSpeed.url,
      sourceLabel: SRC.arriveSpeed.label,
      ...UNVERIFIED,
      params: { urbanKmh: 60, ruralKmh: 100, freewayKmh: 120 },
    },
    {
      id: "reg293-goods-towing-speed",
      category: "legal",
      title: "Speed limit for goods vehicles towing",
      summary:
        "A goods vehicle drawing one or two trailers is limited to 100 km/h when the sum of the GVMs (vehicle plus trailers) is over 3 500 kg up to 9 000 kg, and to 80 km/h when that sum is over 9 000 kg. This applies to goods vehicles only: a motor car (SUV) towing the same caravan keeps the general limits.",
      regulation: "National Road Traffic Regulations, reg 293(1)(b)(iv)(bb) and 293(1)(a)(ii)",
      sourceUrl: SRC.arriveSpeed.url,
      sourceLabel: SRC.arriveSpeed.label,
      ...UNVERIFIED,
      params: {
        combinedGvmOverKg: 3500, // sum of GVMs above this: 100 km/h
        combinedGvmHeavyOverKg: 9000, // sum of GVMs above this: 80 km/h
        limitKmh: 100,
        heavyLimitKmh: 80,
        maxTrailers: 2, // the regulation covers one or two trailers
        clauses: { limit: "293(1)(b)(iv)(bb)", heavy: "293(1)(a)(ii)" },
      },
    },
    {
      id: "reg293-speed-sign",
      category: "legal",
      title: "100 km/h sign on the rear",
      summary:
        "A combination limited to 100 km/h under reg 293 must display a 100 km/h speed-limit sign on the rear, in the colours set by SANS 1329.",
      regulation: "National Road Traffic Regulations, reg 293(2)(b)",
      sourceUrl: SRC.arriveSpeed.url,
      sourceLabel: SRC.arriveSpeed.label,
      ...UNVERIFIED,
    },

    // ---------------------------------------------------------------- reg 239 overloading (checks come in build step 3)
    {
      id: "reg239-overloading",
      category: "legal",
      title: "Overloading (goods vehicles)",
      summary:
        "It is an offence to operate a minibus, bus, tractor or goods vehicle that exceeds its GVM, any gross axle massload or its GCM.",
      regulation: "National Road Traffic Regulations, reg 239(1)",
      sourceUrl: SRC.arriveTowing.url,
      sourceLabel: SRC.arriveTowing.label,
      ...UNVERIFIED,
    },
    {
      id: "reg239-motor-car-exclusion",
      category: "legal",
      title: "Motor cars and reg 239(1)",
      summary:
        "Motor cars are not listed in reg 239(1). For an SUV, overloading is shown as a manufacturer rating and insurance issue rather than this specific offence.",
      regulation: "National Road Traffic Regulations, reg 239(1)",
      sourceUrl: SRC.arriveTowing.url,
      sourceLabel: SRC.arriveTowing.label,
      ...UNVERIFIED,
      notes: ["This is an interpretation that has not yet been confirmed."],
    },
    {
      id: "reg239-driving-axle",
      category: "legal",
      title: "Driving axle ratio (goods vehicles)",
      summary:
        "The mass of a goods vehicle or combination must not exceed 5 times the total axle massload of its driving axle(s). This matters for 2WD bakkies towing heavy with a light load in the back.",
      regulation: "National Road Traffic Regulations, reg 239(3)",
      sourceUrl: SRC.arriveTowing.url,
      sourceLabel: SRC.arriveTowing.label,
      ...UNVERIFIED,
      params: { maxMassToDrivingAxleRatio: 5 },
    },

    // ---------------------------------------------------------------- length (regulation not yet found)
    {
      id: "length-limits",
      category: "legal",
      title: "Combination and trailer length",
      summary:
        "Reported limits: combination length under 22 m; a trailer (not a semi-trailer) with a GVM under 12 000 kg at most 8 m long. The regulation number has not been confirmed.",
      regulation: "Regulation number not yet confirmed",
      sourceUrl: SRC.carsCoZa.url,
      sourceLabel: SRC.carsCoZa.label,
      moreSources: [{ label: "getyourlearners.co.za (trailer length; page not recorded)", url: null }],
      ...UNVERIFIED,
      params: { maxCombinationLengthM: 22, maxTrailerLengthM: 8, trailerLengthGvmBelowKg: 12000 },
      notes: ["Not used in any check until the regulation is found."],
    },

    // ---------------------------------------------------------------- not law
    {
      id: "guidance-towball-mass",
      category: "guidance",
      title: "Tow ball (nose) mass",
      summary:
        "Rule of thumb: tow ball mass of 7–10 % of the trailer's actual mass, and never more than the vehicle manufacturer's maximum. This is guidance, not law.",
      regulation: "Guidance only (no legal limit found yet)",
      sourceUrl: SRC.carmag.url,
      sourceLabel: SRC.carmag.label,
      ...UNVERIFIED,
      params: { minFraction: 0.07, maxFraction: 0.1 },
      notes: [
        "The linked source has not yet been checked for the 7–10 % figure.",
        "Whether any legal nose-weight limit exists is still an open question.",
      ],
    },
    {
      id: "insurance-non-compliance",
      category: "guidance",
      title: "Insurance",
      summary:
        "If you tow without the right licence code or outside the legal brake ratio, your insurer may repudiate a claim.",
      regulation: "Insurance terms (not a regulation)",
      sourceUrl: SRC.focus.url,
      sourceLabel: SRC.focus.label,
      ...UNVERIFIED,
    },
  ];

  // Explainers shown under the results. Example figures live here, not in UI code.
  const explainers = {
    whyNotRated: {
      title: "Why can't my 3 500 kg-rated bakkie tow 3 500 kg?",
      points: [
        { ruleId: "reg151-trailer-brakes", text: "A braked trailer whose GVM is more than your tare needs a service brake the driver can operate. A typical bakkie tare is about 2 000–2 300 kg, so an overrun-braked trailer is capped at your tare." },
        { ruleId: "reg151-plated-gvm", text: "The trailer's plated GVM counts, not what it weighs on the day." },
        { ruleId: "reg99-licence-codes", text: "Code B stops at a trailer GVM of 750 kg. Heavier needs EB." },
        { ruleId: null, text: "The vehicle's GCM and payload also limit you: the loaded vehicle plus tow ball mass eats into what's left (manufacturer ratings, coming soon in this tool)." },
      ],
      example: {
        vehicleType: "goodsVehicle",
        tareKg: 2100,
        gvmKg: 3100, // typical double-cab figure, only so the example fills every legal check
        factoryRatingKg: 3500,
        trailerGvmKg: 2500,
        text: "A bakkie with a tare of 2 100 kg (GVM 3 100 kg) and a factory towing rating of 3 500 kg, towing a caravan plated at 2 500 kg with overrun brakes: not legal. The legal maximum on overrun brakes is a trailer GVM of 2 100 kg (the tare).",
      },
    },
  };

  const byId = {};
  rules.forEach((r) => {
    if (byId[r.id]) throw new Error("Duplicate rule id: " + r.id);
    byId[r.id] = r;
  });

  const api = {
    rules,
    byId,
    explainers,
    get(id) {
      const rule = byId[id];
      if (!rule) throw new Error("Unknown rule id: " + id);
      return rule;
    },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TOWING_RULES = api;
})(typeof window !== "undefined" ? window : globalThis);
