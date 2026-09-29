/*
 * diagram.js: draws the rig diagram (SPEC §7) from ratings.rigDiagram() data:
 * a side-view SVG with the mass at each axle and the tow ball, plus a table
 * with the same figures, limits and status in words.
 * Text stays in text colours; status shows as a coloured bar/arrow AND a word
 * in the table, never colour alone.
 */
(function (root) {
  "use strict";

  const { el } = root.TOWING_UI;
  const kg = root.TOWING_CHECKS.kg;
  const NS = "http://www.w3.org/2000/svg";

  function s(tag, attrs, text) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const STATUS_WORD = { pass: "OK", warn: "Close to limit", fail: "Over", info: "No limit entered", none: "Unknown" };
  const STATUS_ICON = { pass: "✓", warn: "!", fail: "✕", info: "i", none: "…" };
  const SOURCE_WORD = {
    weighbridge: "weighbridge",
    estimate: "estimate",
    entered: "entered",
    plated: "plated GVM",
  };

  function signedKg(n) {
    return (n >= 0 ? "+" : "−") + kg(Math.abs(n));
  }

  // Label under an axle: its mass, or the tow ball's estimated effect, or a dash.
  function axleText(p) {
    if (p.kg !== null) return { main: kg(p.kg), sub: null };
    if (p.changeKg !== undefined) return { main: signedKg(p.changeKg), sub: "tow ball effect" };
    return { main: "—", sub: null };
  }

  // Coloured status bar (only when there is a limit to compare with).
  function statusBar(x, y, width, status) {
    if (status !== "pass" && status !== "warn" && status !== "fail") return null;
    return s("rect", { x: x - width / 2, y, width, height: 6, rx: 3, class: "rig-status st-" + status });
  }

  function wheel(cx, cy, r) {
    const g = s("g", { class: "rig-wheel" });
    g.appendChild(s("circle", { cx, cy, r }));
    g.appendChild(s("circle", { cx, cy, r: r * 0.4, class: "rig-hub" }));
    return g;
  }

  const SHAPES = {
    // side profiles facing left; x 30..400, ground at 250
    goodsVehicle: "M30 200 L30 158 L92 146 L132 100 L252 100 L262 146 L400 146 L400 200 Z",
    motorCar: "M30 200 L30 158 L84 146 L134 98 L366 98 L394 146 L400 200 Z",
  };

  function svgFor(d) {
    const svg = s("svg", {
      viewBox: "0 0 800 356",
      class: "rig-svg",
      role: "img",
      "aria-labelledby": "rig-svg-title",
    });
    svg.appendChild(
      s("title", { id: "rig-svg-title" }, "Side view of the rig showing the mass on each axle and on the tow ball. The same figures are in the table below.")
    );

    const append = (node) => node && svg.appendChild(node);
    const text = (x, y, str, cls) => append(s("text", { x, y, class: cls, "text-anchor": "middle" }, str));

    append(s("line", { x1: 10, y1: 250, x2: 790, y2: 250, class: "rig-ground" }));

    // vehicle
    append(s("path", { d: SHAPES[d.vehicleType] || SHAPES.goodsVehicle, class: "rig-body" }));
    append(wheel(100, 218, 32));
    append(wheel(330, 218, 32));
    if (d.vehicle) {
      text(215, 34, "vehicle", "rig-sub");
      text(215, 66, kg(d.vehicle.kg), "rig-value");
      append(statusBar(215, 78, 110, d.vehicle.status));
    }
    [
      [100, d.front, "front axle"],
      [330, d.rear, "rear axle"],
    ].forEach(([x, p, name]) => {
      const t = axleText(p);
      text(x, 290, t.main, "rig-value");
      text(x, 318, name, "rig-sub");
      if (t.sub) text(x, 344, t.sub, "rig-sub");
      append(statusBar(x, 256, 70, p.status));
    });

    if (d.trailerCount) {
      // towbar, ball and trailer
      append(s("line", { x1: 400, y1: 180, x2: 440, y2: 180, class: "rig-bar" }));
      append(s("circle", { cx: 446, cy: 174, r: 8, class: "rig-ball" }));
      append(s("line", { x1: 452, y1: 180, x2: 505, y2: 180, class: "rig-bar" }));
      append(s("rect", { x: 505, y: 80, width: 270, height: 115, rx: 10, class: "rig-body" }));
      append(wheel(640, 220, 30));

      // tow ball load arrow
      const tbStatus = d.towball.status;
      const arrowCls = "rig-arrow" + (tbStatus === "pass" || tbStatus === "warn" || tbStatus === "fail" ? " st-" + tbStatus : "");
      append(s("line", { x1: 446, y1: 76, x2: 446, y2: 150, class: arrowCls }));
      append(s("path", { d: "M436 146 L456 146 L446 162 Z", class: arrowCls + " rig-arrowhead" }));
      text(446, 28, "tow ball", "rig-sub");
      text(446, 60, d.towball.kg !== null ? kg(d.towball.kg) : "—", "rig-value");

      if (d.trailer) {
        text(640, 122, d.trailerCount > 1 ? d.trailerCount + " trailers" : "trailer", "rig-sub");
        text(640, 156, kg(d.trailer.kg), "rig-value");
        append(statusBar(640, 166, 110, d.trailer.status));
      }
      const t = d.trailerAxles.kg !== null ? kg(d.trailerAxles.kg) : "—";
      text(640, 290, t, "rig-value");
      text(640, 318, "trailer axle", "rig-sub");
      if (d.trailerAxles.source === "estimate") text(640, 344, "estimate", "rig-sub");
    }
    return svg;
  }

  function row(label, p) {
    if (!p) return null;
    const status = p.status;
    let mass = "—";
    if (p.kg !== null) mass = kg(p.kg) + (p.source ? ` (${SOURCE_WORD[p.source] || p.source})` : "");
    else if (p.changeKg !== undefined) mass = `${signedKg(p.changeKg)} from the tow ball (estimate)`;
    const limit = p.limit !== null ? `${p.limitLabel} ${kg(p.limit)}` : "—";
    const word = p.word || (p.kg === null && p.changeKg !== undefined ? "Weigh to check" : STATUS_WORD[status]);
    return el(
      "tr",
      null,
      el("th", { scope: "row" }, label),
      el("td", { class: mass === "—" ? "is-empty" : null }, mass),
      el("td", { class: limit === "—" ? "is-empty" : null }, limit),
      el(
        "td",
        { class: "rig-cell rig-cell--" + status },
        el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[status]),
        el("span", null, p.limit !== null && p.kg !== null ? `${word} (${Math.round((p.kg / p.limit) * 100)} %)` : word)
      )
    );
  }

  function renderRigDiagram(d) {
    if (!d.hasData) return el("p", { class: "muted" }, "Enter the tare (or weighbridge axle readings) to draw your rig.");
    const rows = [
      row("Front axle", d.front),
      row("Rear axle", d.rear),
      d.towball ? row("Tow ball", d.towball) : null,
      d.trailerAxles ? row("Trailer axle(s)", d.trailerAxles) : null,
      row("Vehicle", d.vehicle),
      row("Trailer", d.trailer),
      row("Vehicle + trailer", d.combined),
    ];
    const notes = [];
    if (d.front.kg === null || d.rear.kg === null)
      notes.push("Axle loads need weighbridge readings (with the trailer hitched). Enter them under Weighbridge and measurements.");
    if (d.lever) notes.push("The tow ball's effect on the axles is estimated from the wheelbase and the distance from the rear axle to the tow ball.");
    return el(
      "div",
      null,
      el("figure", { class: "rig-figure" }, svgFor(d)),
      el(
        "div",
        { class: "table-wrap" },
        el(
          "table",
          { class: "rig-table" },
          el("thead", null, el("tr", null, el("th", { scope: "col" }, "Where"), el("th", { scope: "col" }, "Mass"), el("th", { scope: "col" }, "Limit"), el("th", { scope: "col" }, "Status"))),
          el("tbody", null, rows)
        )
      ),
      notes.length ? el("ul", { class: "check-notes" }, notes.map((n) => el("li", null, n))) : null
    );
  }

  root.TOWING_DIAGRAM = { renderRigDiagram };
})(window);
