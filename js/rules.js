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
 * Status (2026-09-29): the legal rules and definitions were checked against
 * government-hosted copies of the gazetted text: the Regulations (GN R225 of
 * 2000, consolidated to 9 March 2012), the later amendments that touch them
 * (GN R846 of 2014 and GN R1408 of 2016; the 2016 fee and 2022 form
 * amendments don't), and the Act as published. Rules that the text doesn't
 * settle stay verified: false; manufacturer and guidance rules are not law.
 * When a new amendment is published, re-check the rules it touches and update
 * lastChecked.
 *
 * Classic script (not an ES module) so the site also works opened from disk.
 * Exposes window.TOWING_RULES in the browser and module.exports in Node.
 */
(function (root) {
  "use strict";

  // Official sources (government-hosted copies of the gazetted text).
  const SRC = {
    regs2012: {
      label: "National Road Traffic Regulations (GN R225 of 17 March 2000, consolidated to 9 March 2012), KZN Department of Transport",
      url: "http://www.kzntransport.gov.za/reading_room/acts/national/NRTA%20Regs%20Part%201.pdf",
      official: true,
    },
    gnR846: {
      label: "GN R846 of 31 October 2014 (22nd amendment of the Regulations), Government Gazette 38142",
      url: "https://www.gov.za/sites/default/files/gcis_document/201411/38142rg10303gon846.pdf",
      official: true,
    },
    gnR1408: {
      label: "GN R1408 of 11 November 2016 (24th amendment of the Regulations), Government Gazette 40420",
      url: "https://www.gov.za/sites/default/files/gcis_document/201611/40420gon1408.pdf",
      official: true,
    },
    act1996: {
      label: "National Road Traffic Act 93 of 1996 as published (Road Traffic Management Corporation)",
      url: "https://www.rtmc.co.za/images/rtmc/docs/legislation/National%20Road%20Traffic%20Act.pdf",
      official: true,
    },
    // Secondary sources: explanations, kept as further reading.
    focus: {
      label: "Focus on Transport: Towing a trailer? Read this first",
      url: "https://focusontransport.co.za/towing-a-trailer-read-this-first/",
    },
    findSchool: {
      label: "Find a Driving School: Code EB driver's licence",
      url: "https://findadrivingschool.co.za/code-eb-drivers-license",
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
    carmag: {
      label: "CAR magazine: Towing in South Africa, here's what the law says",
      url: "https://www.carmag.co.za/technical/technical/towing-in-south-africa-heres-what-the-law-says/",
    },
    redarc: {
      label: "REDARC: How to calculate your caravan tow ball weight",
      url: "https://www.redarcelectronics.com/au/discover/how-to-calculate-your-caravan-tow-ball-weight/",
    },
    carsCoZa: {
      label: "Cars.co.za: Guide to safe towing",
      url: "https://www.cars.co.za/motoring-news/guide-to-safe-towing/294448/",
    },
  };

  function src(key) {
    return { label: SRC[key].label, url: SRC[key].url };
  }

  // Checked against the official text listed in the rule's sources.
  const VERIFIED = { official: true, verified: true, lastChecked: "2026-09-29" };
  // Not law: the explanatory source was read and supports the summary.
  const SOURCE_CHECKED = { official: false, verified: true, lastChecked: "2026-09-29" };
  // Not law, or not settled by the regulation's wording.
  const UNVERIFIED = { official: false, verified: false, lastChecked: null };

  const rules = [
    // ---------------------------------------------------------------- definitions
    {
      id: "def-goods-vehicle",
      category: "definition",
      title: "Goods vehicle",
      summary:
        "A motor vehicle, other than a motor cycle, motor tricycle, motor quadrucycle, motor car, minibus or bus, designed or adapted to carry goods on a public road.",
      regulation: "National Road Traffic Regulations, reg 1 (as substituted by GN R846 of 2014)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("gnR846")],
      ...VERIFIED,
      notes: [
        "Not from the regulation: most bakkies are registered as light delivery vehicles (goods vehicles), and many double cabs are too, but your registration papers decide.",
      ],
    },
    {
      id: "def-motor-car",
      category: "definition",
      title: "Motor car",
      summary:
        "A motor vehicle, other than a motor cycle, motor tricycle or motor quadrucycle, designed or adapted solely or principally to carry not more than nine persons, including the driver.",
      regulation: "National Road Traffic Regulations, reg 1",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      ...VERIFIED,
      notes: ["Not from the regulation: sedans and SUVs are normally registered as motor cars."],
    },
    {
      id: "def-vehicle-type-from-papers",
      category: "definition",
      title: "Vehicle type comes from the registration papers",
      summary:
        "Whether your vehicle is a motor car or a goods vehicle is what its registration certificate / licence disc says, not its body shape. A double cab can be either: it carries up to five people and has a load bed, so check your papers.",
      regulation: "National Road Traffic Regulations, reg 1 (definitions of goods vehicle and motor car)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      ...UNVERIFIED,
      notes: [
        "The definitions depend on what a vehicle is \"designed or adapted\" for; how a particular double cab is registered is not settled by the regulation text. See Still to check.",
      ],
    },
    {
      id: "def-overrun-service-brake",
      category: "definition",
      title: "Overrun brake vs service brake",
      summary:
        "An overrun brake is a braking system worked by a device on the trailer's drawbar through the trailer's inertia. A trailer's service brake must be capable of being operated by the driver of the drawing vehicle while moving. A normal caravan overrun brake is NOT a service brake.",
      regulation: "National Road Traffic Regulations, reg 1 (definitions) and reg 151(2)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("gnR846")],
      ...VERIFIED,
    },
    {
      id: "def-tare",
      category: "definition",
      title: "Tare",
      summary:
        "The mass of the vehicle ready to travel on a road, including the spare wheel, standard accessories and anything permanently fitted, but NOT including fuel. Use the tare on the licence disc / registration certificate.",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sourceUrl: SRC.act1996.url,
      sourceLabel: SRC.act1996.label,
      ...VERIFIED,
      notes: [
        "Because tare excludes fuel, the fuel in the tank always counts against payload.",
        "Checked against the Act as published; later amendments to the Act were not available to check, but every current copy found gives the same wording.",
      ],
    },
    {
      id: "def-gvm",
      category: "definition",
      title: "GVM (gross vehicle mass)",
      summary:
        "The maximum mass of the vehicle and its load as specified by the manufacturer (or, without that, as determined by the registering authority).",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sourceUrl: SRC.act1996.url,
      sourceLabel: SRC.act1996.label,
      ...VERIFIED,
    },
    {
      id: "def-gcm",
      category: "definition",
      title: "GCM (gross combination mass)",
      summary:
        "The maximum mass of the combination (drawing vehicle plus trailers) and load as specified by the manufacturer (or, without that, as determined by the registering authority).",
      regulation: "National Road Traffic Act 93 of 1996, s1",
      sourceUrl: SRC.act1996.url,
      sourceLabel: SRC.act1996.label,
      ...VERIFIED,
    },

    // ---------------------------------------------------------------- reg 99 licence codes
    {
      id: "reg99-licence-codes",
      category: "legal",
      title: "Driving licence code",
      summary:
        "A motor vehicle is classed by its tare; a minibus, midibus, bus or goods vehicle by its GVM. Up to 3 500 kg: code B with a trailer GVM up to 750 kg, EB with a heavier trailer. Over 3 500 kg up to 16 000 kg: C1, or EC1 with a trailer over 750 kg. Heavier: C or EC.",
      regulation: "National Road Traffic Regulations, reg 99(4)(a) (as substituted by GN R53 of 2011 and GN R846 of 2014)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("gnR846"), src("focus")],
      ...VERIFIED,
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
        // "Includes authorisation to drive" column of the reg 99(4) table.
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
        "With two trailers this tool uses the sum of the trailer GVMs for the 750 kg test; the regulation speaks of \"a trailer\". Confirm with your DLTC.",
      ],
    },
    {
      id: "reg99-eb-articulated-myth",
      category: "legal",
      title: "The EB \"3 500 kg GCM\" myth",
      summary:
        "Code EB's \"gross combination mass of the truck-tractor does not exceed 3 500 kg\" applies only to articulated vehicles (truck-tractor plus semi-trailer). For a car or bakkie with a trailer, EB covers a tow vehicle with a tare (motor car) or GVM (goods vehicle) up to 3 500 kg and a trailer GVM over 750 kg, with no combined-mass limit in the licence code.",
      regulation: "National Road Traffic Regulations, reg 99(4)(a), code EB",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("gnR846"), src("findSchool")],
      ...VERIFIED,
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
        "The brakes a trailer needs depend only on its GVM and the tow vehicle's tare; engine power and the factory towing capacity play no part. Up to 750 kg and up to half the tare: parking brake (or other device to keep it stationary). Over half the tare, up to the tare (and up to 3 500 kg): parking brake plus overrun or service brake. Over the tare, or over 3 500 kg: parking brake plus a service brake the driver can operate.",
      regulation: "National Road Traffic Regulations, reg 151(1)–(3)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("arriveExpert"), src("focus")],
      ...VERIFIED,
      params: {
        lightTrailerMaxKg: 750, // 151(1)(a) vs (b)
        unbrakedTareFraction: 0.5, // 151(1)(a)(i): up to half the tare
        heavyTrailerMinKg: 3500, // 151(1)(c): above this, service brake regardless
        // Brake levels: none < overrun < service
        brakeLevels: { none: 0, overrun: 1, service: 2 },
        clauses: {
          parkingOnly: "151(1)(a)(i)",
          lightOverTareHalf: "151(1)(a)(ii)",
          lightOverTare: "151(1)(a)(iii)",
          heavyUpToTare: "151(1)(b)(i)",
          overTare: "151(1)(b)(ii)",
          overHeavy: "151(1)(c)",
        },
      },
      notes: [
        "Every trailer also needs a parking brake (or, for a light trailer, a device to keep it stationary). An overrun or service brake that can also be used as a parking brake counts as one (reg 151(3)).",
        "With more than one trailer, the requirements apply to each trailer, using the total GVM of all the trailers (reg 151(1), closing words).",
      ],
    },
    {
      id: "reg151-plated-gvm",
      category: "legal",
      title: "Plated GVM, not actual mass",
      summary:
        "Reg 151 uses the trailer's gross vehicle mass, which the Act defines as the maximum mass specified by the manufacturer (the plated GVM on its licence disc / compliance plate), not what the trailer weighs on the day. A lightly loaded caravan with a high plated GVM still counts at its plated GVM.",
      regulation: "National Road Traffic Regulations, reg 151(1), read with the Act's definition of gross vehicle mass (s1)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("act1996")],
      ...VERIFIED,
    },

    // ---------------------------------------------------------------- reg 292 / 293 speed
    {
      id: "reg292-general-speed",
      category: "legal",
      title: "General speed limits",
      summary: "60 km/h in urban areas, 100 km/h on public roads outside urban areas other than freeways, 120 km/h on freeways, unless a sign shows otherwise.",
      regulation: "National Road Traffic Regulations, reg 292",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("arriveSpeed")],
      ...VERIFIED,
      params: { urbanKmh: 60, ruralKmh: 100, freewayKmh: 120 },
    },
    {
      id: "reg293-goods-towing-speed",
      category: "legal",
      title: "Speed limit for goods vehicles",
      summary:
        "100 km/h for a goods vehicle with a GVM over 3 500 kg up to 9 000 kg, and for a goods vehicle drawing one or two trailers where the vehicle's GVM plus the trailers' GVMs is over 3 500 kg up to 9 000 kg. 80 km/h where the vehicle's GVM, or that sum, is over 9 000 kg. Goods vehicles only: a motor car (SUV) towing the same caravan keeps the general limits.",
      regulation: "National Road Traffic Regulations, reg 293(1)(a)(i)–(ii) and 293(1)(b)(iv) (inserted by GN R1408 of 2016)",
      sourceUrl: SRC.gnR1408.url,
      sourceLabel: SRC.gnR1408.label,
      moreSources: [src("regs2012"), src("arriveSpeed")],
      ...VERIFIED,
      params: {
        combinedGvmOverKg: 3500, // GVM (or sum of GVMs) above this: 100 km/h
        combinedGvmHeavyOverKg: 9000, // GVM (or sum of GVMs) above this: 80 km/h
        limitKmh: 100,
        heavyLimitKmh: 80,
        maxTrailers: 2, // the regulation covers one or two trailers
        clauses: {
          limit: "293(1)(b)(iv)(bb)",
          heavy: "293(1)(a)(ii)",
          soloLimit: "293(1)(b)(iv)(aa)",
          soloHeavy: "293(1)(a)(i)",
        },
      },
    },
    {
      id: "reg293-speed-sign",
      category: "legal",
      title: "Speed-limit sign on the rear",
      summary:
        "A vehicle limited to 100 km/h under reg 293(1)(b) must display a 100 km/h sign on the rear, and a goods vehicle limited to 80 km/h under reg 293(1)(a) an 80 km/h sign, in the colours set by SANS 1329.",
      regulation: "National Road Traffic Regulations, reg 293(2)(a)–(b) (paragraph (a) as substituted by GN R846 of 2014)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("gnR846"), src("gnR1408")],
      ...VERIFIED,
      notes: [
        "The regulation says \"on the rear of\" the vehicle and doesn't say where the sign goes when a trailer is hitched. A sign on the tow vehicle is hidden by a caravan, so put one where following traffic can see it and confirm with your DLTC.",
      ],
    },

    // ---------------------------------------------------------------- reg 239 overloading
    {
      id: "reg239-overloading",
      category: "legal",
      title: "Overloading (goods vehicles)",
      summary:
        "No person may operate a minibus, bus, tractor or goods vehicle on a public road if its GVM, any gross axle massload or any gross axle unit massload is exceeded, or, when it draws another vehicle, if the GCM is exceeded.",
      regulation: "National Road Traffic Regulations, reg 239(1)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      moreSources: [src("gnR846"), src("arriveTowing")],
      ...VERIFIED,
    },
    {
      id: "reg239-motor-car-exclusion",
      category: "legal",
      title: "Motor cars and the overloading offences",
      summary:
        "Reg 239(1), and the permissible-mass rules in regs 236 and 237, list minibuses, buses, tractors and goods vehicles, not motor cars. For an SUV, going over the GVM, axle ratings or GCM is shown as a manufacturer and insurance issue rather than these offences.",
      regulation: "National Road Traffic Regulations, regs 236, 237 and 239(1)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      ...VERIFIED,
      notes: [
        "Tyre load limits (reg 238) apply to every motor vehicle, motor cars included: no wheel may carry more than its tyre is rated for.",
      ],
    },
    {
      id: "reg239-driving-axle",
      category: "legal",
      title: "Driving axle ratio (goods vehicles)",
      summary:
        "No person may operate a minibus, midibus, bus, tractor or goods vehicle if the mass of the vehicle, or of the combination it forms part of, exceeds five times the total axle massload of its driving axle or axles. This matters for 2WD bakkies towing heavy with a light load in the back.",
      regulation: "National Road Traffic Regulations, reg 239(3) (as substituted by GN R846 of 2014)",
      sourceUrl: SRC.gnR846.url,
      sourceLabel: SRC.gnR846.label,
      moreSources: [src("regs2012"), src("arriveTowing")],
      ...VERIFIED,
      params: { maxMassToDrivingAxleRatio: 5 },
      notes: [
        "A part-time 4x4 driven in 2WD may only have its rear axle driving; whether that changes the driving axle(s) for this rule is unconfirmed.",
      ],
    },

    // ---------------------------------------------------------------- length
    {
      id: "length-limits",
      category: "legal",
      title: "Combination and trailer length",
      summary:
        "A combination of vehicles may be at most 22 m long including the drawbar. A trailer (not a semi-trailer) with one axle or one axle unit and a GVM up to 12 000 kg may be at most 8 m long, excluding the drawbar.",
      regulation: "National Road Traffic Regulations, reg 221(b)(ii) and (g)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      ...VERIFIED,
      params: { maxCombinationLengthM: 22, maxTrailerLengthM: 8, trailerLengthGvmMaxKg: 12000 },
      notes: ["Shown for reference; the checker doesn't ask for lengths."],
    },

    // ---------------------------------------------------------------- manufacturer ratings (not law)
    // Sources here explain the idea; the numbers themselves come from the
    // owner's manual / compliance plate.
    {
      id: "maker-payload",
      category: "manufacturer",
      title: "Payload",
      summary:
        "Payload is GVM minus tare. Everything you carry counts against it: people, fuel (tare never includes it), accessories (canopy, roof rack, rooftop tent, drawers, fridge), water, gear and the tow ball mass of the trailer.",
      regulation: "Vehicle manufacturer's GVM (compliance plate / owner's manual)",
      sourceUrl: SRC.carsCoZa.url,
      sourceLabel: SRC.carsCoZa.label,
      moreSources: [src("redarc"), src("act1996")],
      ...SOURCE_CHECKED,
    },
    {
      id: "maker-gcm",
      category: "manufacturer",
      title: "Combination mass (GCM)",
      summary:
        "The loaded vehicle plus the loaded trailer must not weigh more than the GCM. A heavily loaded vehicle leaves less room for the trailer, even when the trailer is within the towing capacity.",
      regulation: "Vehicle manufacturer's GCM (owner's manual)",
      sourceUrl: SRC.carsCoZa.url,
      sourceLabel: SRC.carsCoZa.label,
      moreSources: [src("act1996")],
      ...SOURCE_CHECKED,
    },
    {
      id: "maker-towing-capacity",
      category: "manufacturer",
      title: "Towing capacity",
      summary:
        "The manufacturer rates the heaviest trailer the vehicle may tow: one figure for a braked trailer and a lower one for an unbraked trailer. This is a rating, not the legal limit; reg 151 can set a lower legal limit.",
      regulation: "Vehicle manufacturer's towing capacity (owner's manual)",
      sourceUrl: SRC.carsCoZa.url,
      sourceLabel: SRC.carsCoZa.label,
      moreSources: [src("arriveExpert")],
      ...SOURCE_CHECKED,
    },
    {
      id: "maker-towball-max",
      category: "manufacturer",
      title: "Maximum tow ball mass",
      summary:
        "The manufacturer's maximum vertical load on the tow ball (and on the towbar's own plate, if that is lower). The tow ball mass also counts against payload.",
      regulation: "Vehicle / towbar manufacturer's rating (owner's manual, towbar plate)",
      sourceUrl: SRC.redarc.url,
      sourceLabel: SRC.redarc.label,
      ...SOURCE_CHECKED,
    },
    {
      id: "maker-axle-ratings",
      category: "manufacturer",
      title: "Axle ratings",
      summary:
        "Each axle has a maximum load (gross axle massload) set by the manufacturer. Tow ball mass acts behind the rear axle like a lever: it adds more than its own mass to the rear axle and takes some load off the front.",
      regulation: "Vehicle manufacturer's axle ratings (compliance plate / owner's manual)",
      sourceUrl: SRC.regs2012.url,
      sourceLabel: SRC.regs2012.label,
      ...SOURCE_CHECKED,
      notes: [
        "Estimate used: extra rear axle load = tow ball mass × (wheelbase + rear overhang) ÷ wheelbase; front axle load drops by tow ball mass × rear overhang ÷ wheelbase. Rear overhang is measured from the rear axle centre to the tow ball.",
      ],
    },
    {
      id: "maker-trailer-gvm",
      category: "manufacturer",
      title: "Trailer within its own GVM",
      summary: "The loaded trailer must not weigh more than its own plated GVM. Its load capacity is its GVM minus its tare.",
      regulation: "Trailer manufacturer's GVM (trailer licence disc / compliance plate)",
      sourceUrl: SRC.act1996.url,
      sourceLabel: SRC.act1996.label,
      ...SOURCE_CHECKED,
    },

    // ---------------------------------------------------------------- not law
    {
      id: "guidance-towball-mass",
      category: "guidance",
      title: "Tow ball (nose) mass",
      summary:
        "Rule of thumb: a tow ball mass of 7–10 % of the loaded trailer's actual mass, and never more than the vehicle or towbar maker's maximum. Follow your caravan maker's figure if it gives one. This is a rule of thumb, not a legal limit.",
      regulation: "Guidance only: the regulations set no tow ball mass limit",
      sourceUrl: "https://www.redarcelectronics.com/au/discover/how-to-calculate-your-caravan-tow-ball-weight/",
      sourceLabel: "REDARC: How to calculate your caravan tow ball weight",
      moreSources: [
        { label: "Outback Travel Australia: Towball weight and trailer stability", url: "https://outbacktravelaustralia.com.au/driving-towing-towing/towball-weight-and-trailer-stability/" },
      ],
      official: false,
      verified: true,
      lastChecked: "2026-09-29",
      params: { minFraction: 0.07, maxFraction: 0.1 },
      notes: [
        "Advice varies: European research found about 6–8 % best, while many Australian and American makers use about 10 % or more. Too little tow ball mass can make the trailer sway.",
        "No tow ball mass limit was found in the National Road Traffic Regulations.",
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
      official: false,
      verified: true,
      lastChecked: "2026-09-29",
      notes: ["Whether a claim is refused depends on your policy wording: check it with your insurer."],
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
        { ruleId: "maker-gcm", text: "The vehicle's GCM and payload also limit you: the loaded vehicle plus tow ball mass eats into what's left. Fill in the manufacturer ratings and your load to see how much." },
      ],
      example: {
        vehicleType: "goodsVehicle",
        tareKg: 2100,
        // Illustrative figures for a typical double cab, not any specific model.
        gvmKg: 3100,
        drive: "4wd",
        factoryRatingKg: 3500,
        unbrakedCapacityKg: 750,
        gcmKg: 5850,
        maxTowballKg: 350,
        trailerGvmKg: 2500,
        towballKg: 200,
        loadItems: [
          { preset: "person", qty: 2 },
          { preset: "canopy" },
          { preset: "fridge" },
          { preset: "gear" },
        ],
        text: "A bakkie with a tare of 2 100 kg and a factory towing rating of 3 500 kg, towing a caravan plated at 2 500 kg with overrun brakes: not legal. The legal maximum on overrun brakes is a trailer GVM of 2 100 kg (the tare).",
      },
    },
  };

  // What the regulation text doesn't settle, shown on sources.html. Remove an
  // entry once it is settled (and update the rules it names).
  const openQuestions = [
    { text: "How are double cab bakkies registered: always as goods vehicles (LDVs), or can one be a motor car?", ruleIds: ["def-goods-vehicle", "def-vehicle-type-from-papers"] },
    { text: "For a part-time 4x4 driven in 2WD, which axles count as driving axles under reg 239(3)?", ruleIds: ["reg239-driving-axle"] },
    { text: "With two trailers, does the 750 kg licence threshold apply to the sum of the trailer GVMs? Reg 99 speaks of \"a trailer\".", ruleIds: ["reg99-licence-codes"] },
    { text: "When towing, where must the 100 km/h (or 80 km/h) sign go: on the tow vehicle, or on the rear of the trailer where it can be seen?", ruleIds: ["reg293-speed-sign"] },
    { text: "Have any amendments since the 25th amendment (GN 45901 of February 2022) changed these rules?", ruleIds: [] },
  ];

  // Display settings (not law): when a mass counts as "close to the limit"
  // (amber); and in the simple check, a payload (GVM − tare) below which a
  // family, fuel, luggage and the tow ball could plausibly use it all up, so
  // the advanced check is worth doing. A rule of thumb, not a legal limit.
  const settings = { nearLimitFraction: 0.95, simpleLowPayloadKg: 600 };

  // Load list presets. Typical starting masses only, NOT data about any product:
  // the UI asks people to replace them with their own weighed figures.
  // perUnit: what "Qty" counts ("each" or "litre").
  const loadPresets = [
    { id: "person", label: "Person (driver or passenger)", kg: 80, qty: 1, perUnit: "each" },
    { id: "diesel", label: "Diesel (tare excludes fuel)", kg: 0.84, qty: 80, perUnit: "litre" },
    { id: "petrol", label: "Petrol (tare excludes fuel)", kg: 0.74, qty: 80, perUnit: "litre" },
    { id: "water", label: "Water", kg: 1, qty: 40, perUnit: "litre" },
    { id: "canopy", label: "Canopy", kg: 70, qty: 1, perUnit: "each" },
    { id: "roof-rack", label: "Roof rack", kg: 25, qty: 1, perUnit: "each" },
    { id: "rooftop-tent", label: "Rooftop tent", kg: 60, qty: 1, perUnit: "each" },
    { id: "drawers", label: "Drawer system", kg: 60, qty: 1, perUnit: "each" },
    { id: "fridge", label: "Fridge with contents", kg: 35, qty: 1, perUnit: "each" },
    { id: "recovery", label: "Recovery gear", kg: 25, qty: 1, perUnit: "each" },
    { id: "gear", label: "Camping gear / luggage", kg: 50, qty: 1, perUnit: "each" },
    { id: "custom", label: "Other item", kg: 0, qty: 1, perUnit: "each" },
  ];

  const byId = {};
  rules.forEach((r) => {
    if (byId[r.id]) throw new Error("Duplicate rule id: " + r.id);
    byId[r.id] = r;
  });

  const api = {
    rules,
    byId,
    explainers,
    settings,
    loadPresets,
    openQuestions,
    get(id) {
      const rule = byId[id];
      if (!rule) throw new Error("Unknown rule id: " + id);
      return rule;
    },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.TOWING_RULES = api;
})(typeof window !== "undefined" ? window : globalThis);
