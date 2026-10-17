/*
 * charts.js: draws the brakes diagram (from checks.brakeChart()) and the
 * weight budget bars (from ratings.weightBudget()). HTML blocks positioned in
 * percent, so they stretch to any width. Text stays in text colours; status
 * shows as a marker or chip with a word, never colour alone. Hover or tap a
 * block for its figures (a tooltip); every figure is also in text beside it.
 */
(function (root) {
  "use strict";

  const R = root.TOWING_RULES;
  const C = root.TOWING_CHECKS;
  const { el } = root.TOWING_UI;
  const kg = C.kg;

  // ---------------------------------------------------------------- tooltip
  // Blocks carry data-tip-title / data-tip; one shared tooltip shows them.
  // textContent only: load list labels are typed by the user.
  let tip = null;

  function showTip(e) {
    const target = e.target.closest && e.target.closest("[data-tip-title]");
    if (!target) return;
    if (!tip) {
      tip = el("div", { class: "chart-tip", role: "presentation" });
      document.body.appendChild(tip);
    }
    tip.replaceChildren(
      el("strong", null, target.getAttribute("data-tip-title")),
      target.getAttribute("data-tip") ? el("span", null, target.getAttribute("data-tip")) : null
    );
    tip.hidden = false;
    const r = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8) + "px";
    const above = r.top - tip.offsetHeight - 8;
    tip.style.top = (above > 8 ? above : r.bottom + 8) + "px";
  }

  function hideTip() {
    if (tip) tip.hidden = true;
  }

  document.addEventListener("pointerover", showTip);
  document.addEventListener("pointerout", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });

  function pct(value, scale) {
    return (Math.max(0, Math.min(value / scale, 1)) * 100).toFixed(2) + "%";
  }

  // ---------------------------------------------------------------- brakes diagram
  const FITTED = { none: "no brakes", overrun: "overrun brakes", service: "a service brake" };
  const NEEDS = {
    overrun: "a trailer with overrun or service brakes",
    service: "a service brake the driver can operate from the tow vehicle",
  };

  // Tick labels sit under the bar; a label too close to the one before drops a row.
  function ticks(list, scale) {
    let last = -Infinity;
    return list
      .sort((a, b) => a.kg - b.kg)
      .map((t) => {
        const pos = t.kg / scale;
        const row = pos - last < 0.17 ? 1 : 0;
        if (!row) last = pos;
        const align = pos > 0.86 ? " brake-tick--end" : pos < 0.06 ? " brake-tick--start" : "";
        return el(
          "div",
          { class: "brake-tick" + (t.cls ? " " + t.cls : "") + align + (row ? " brake-tick--row2" : ""), style: "left:" + pct(t.kg, scale) },
          el("span", null, t.kg ? kg(t.kg) : "0", t.sub ? [el("br"), t.sub] : null)
        );
      });
  }

  // opts.fix: show what would make it legal (the checker's card, not the explainer)
  function renderBrakeChart(b, opts) {
    const p = R.get("reg151-trailer-brakes").params;
    const scale = b.scaleKg;
    const overrunLimit = b.overrunByTare ? "your tare" : `the ${kg(p.heavyTrailerMinKg)} cap`;
    const zones = [
      {
        level: "none",
        from: 0,
        to: b.noneMaxKg,
        text: "Parking brake only",
        tip: `Up to ${kg(b.noneMaxKg)}: a parking brake (or other way to keep it parked) is enough. Only for a trailer up to ${kg(p.lightTrailerMaxKg)} and up to half the tow vehicle's tare.`,
      },
      {
        level: "overrun",
        from: b.noneMaxKg,
        to: b.overrunMaxKg,
        text: "Overrun or service brake",
        tip: `Over ${kg(b.noneMaxKg)}, up to ${kg(b.overrunMaxKg)} (${overrunLimit}): an overrun brake, like most caravans, or a service brake.`,
      },
      {
        level: "service",
        from: b.overrunMaxKg,
        to: scale,
        text: "Service brake",
        tip: `Over ${kg(b.overrunMaxKg)}: a service brake the driver can operate from the tow vehicle. Overrun brakes aren't enough.`,
      },
    ];
    const zoneNodes = zones.map((z) => {
      const share = (z.to - z.from) / scale;
      return el(
        "div",
        {
          class: "brake-zone brake-zone--" + z.level + (share < 0.13 ? " is-narrow" : ""),
          style: `left:${pct(z.from, scale)};width:calc(${pct(z.to - z.from, scale)} - 2px)`,
          "data-tip-title": z.level === "service" ? `Over ${kg(z.from)}` : `${kg(z.from)} – ${kg(z.to)}`,
          "data-tip": z.tip,
        },
        el("span", null, z.text)
      );
    });

    const tickList = [
      { kg: 0 },
      { kg: b.noneMaxKg, sub: b.noneByHalfTare ? "half your tare" : null },
      { kg: b.overrunMaxKg, sub: b.overrunByTare ? "your tare" : "overrun limit", cls: "brake-tick--strong" },
    ];
    if (b.ratingKg && b.ratingKg !== b.overrunMaxKg) tickList.push({ kg: b.ratingKg, sub: "factory rating", cls: "brake-tick--maker" });

    let pin = null;
    let over = null;
    if (b.trailerKg !== null) {
      const status = b.overKg > 0 ? "fail" : b.fitted ? "pass" : "none";
      const pos = b.trailerKg / scale;
      const what = `Your trailer${b.trailerCount > 1 ? "s" : ""}: ${kg(b.trailerKg)}${b.trailerCount > 1 ? " total" : ""}`;
      pin = [
        el("div", { class: "brake-pin brake-pin--" + status, style: "left:" + pct(b.trailerKg, scale) }),
        el(
          "span",
          { class: "brake-pin-label brake-pin--" + status + (pos > 0.5 ? " brake-pin-label--right" : "") },
          status === "fail" || status === "pass" ? el("span", { class: "status-icon", "aria-hidden": "true" }, status === "fail" ? "✕" : "✓") : null,
          b.fitted ? `${what}, ${FITTED[b.fitted]}` : what
        ),
      ];
      if (b.overKg > 0)
        over = el("div", {
          class: "brake-over",
          style: `left:${pct(b.allowedKg, scale)};width:${pct(b.overKg, scale)}`,
          "data-tip-title": `${kg(b.overKg)} over`,
          "data-tip": `The part of the trailer's plated GVM above the ${kg(b.allowedKg)} allowed with ${FITTED[b.fitted]}.`,
        });
    }

    const summary =
      `Trailer brakes needed behind a tare of ${kg(b.tareKg)}: parking brake only up to ${kg(b.noneMaxKg)}; ` +
      `overrun or service brake up to ${kg(b.overrunMaxKg)}; service brake above that.` +
      (b.trailerKg !== null ? ` Your trailer: ${kg(b.trailerKg)}${b.overKg ? `, ${kg(b.overKg)} over the limit for ${FITTED[b.fitted]}` : ""}.` : "");

    let fix = null;
    if (opts && opts.fix && b.overKg > 0) {
      const need = C.requiredBrake(b.trailerKg, b.tareKg).level;
      fix = el(
        "div",
        { class: "brake-fix" },
        el("strong", null, "To make this legal, either:"),
        el(
          "ul",
          null,
          el(
            "li",
            null,
            b.trailerCount > 1 ? "keep the trailers' plated GVMs to " : "tow a trailer plated at ",
            el("strong", null, kg(b.allowedKg) + (b.trailerCount > 1 ? " or less in total" : " or less")),
            ", or"
          ),
          el("li", null, "use ", el("strong", null, NEEDS[need]), ".")
        )
      );
    }

    return [
      el(
        "figure",
        { class: "brake-fig" },
        el("figcaption", null, `Brakes the trailer needs, by its plated GVM, behind a tare of ${kg(b.tareKg)}`),
        el(
          "div",
          { class: "brake-plot" + (pin ? " has-pin" : "") },
          el("div", { class: "brake-zones", role: "img", "aria-label": summary }, zoneNodes),
          over,
          pin,
          el("div", { class: "brake-ticks", "aria-hidden": "true" }, ticks(tickList, scale))
        )
      ),
      fix,
    ];
  }

  // ---------------------------------------------------------------- weight budget
  const SWATCH = { tare: "tare", weighed: "tare", load: "load", towball: "towball", trailer: "trailer" };
  const CHIP = { pass: "OK", warn: "Close to the limit" };
  const STATUS_ICON = { pass: "✓", warn: "!", fail: "✕" };

  function sum(parts) {
    return parts.reduce((s, part) => s + part.kg, 0);
  }

  function chip(status, overKg) {
    if (!STATUS_ICON[status]) return null;
    return el(
      "span",
      { class: "budget-chip budget-chip--" + status },
      el("span", { class: "status-icon", "aria-hidden": "true" }, STATUS_ICON[status]),
      status === "fail" ? `${kg(overKg)} over` : CHIP[status]
    );
  }

  // A part's own figure: the trailer block is drawn without its tow ball
  // (that's hatched beside it), but named with the trailer's whole mass.
  function partKg(part) {
    return part.fullKg || part.kg;
  }

  // The label inside a block: name and figure, or just the name if that's all
  // that fits (fitLabels picks once the bar is laid out). The hatched tow ball
  // is too busy to write on; the key and legend name it.
  function blockLabel(full, short) {
    return el("span", { class: "budget-label", "data-full": full, "data-short": short });
  }

  function fitLabels(container) {
    container.querySelectorAll(".budget-label").forEach((span) => {
      for (const text of [span.dataset.full, span.dataset.short, ""]) {
        span.textContent = text;
        if (span.scrollWidth <= span.clientWidth + 1) break;
      }
    });
  }

  function partTip(part) {
    if (part.kind === "towball") return "Part of the trailer's mass, carried by the vehicle.";
    if (part.fullKg) return `Includes the ${kg(part.fullKg - part.kg)} on the tow ball (hatched).`;
    if (part.qty > 1) return `${part.qty} × ${kg(part.eachKg)}`;
    return null;
  }

  // One stacked bar. limitName e.g. "GVM"; leftText for the space left.
  function stack(bar, limitName, leftText) {
    const total = sum(bar.parts);
    const scale = Math.max(total, bar.limitKg);
    const blocks = bar.parts
      .filter((part) => part.kg > 0)
      .map((part) =>
        el(
          "div",
          {
            class: "budget-block budget-block--" + part.kind,
            style: "flex-grow:" + part.kg,
            "data-tip-title": `${part.label}: ${kg(partKg(part))}`,
            "data-tip": partTip(part),
          },
          part.kind === "towball" ? null : blockLabel(`${part.label} ${kg(partKg(part))}`, part.label)
        )
      );
    const left = bar.limitKg - total;
    if (left > 0)
      blocks.push(
        el(
          "div",
          { class: "budget-block budget-block--left", style: "flex-grow:" + left, "data-tip-title": `${kg(left)} left`, "data-tip": `Before you reach the ${kg(bar.limitKg)} ${limitName}.` },
          blockLabel(leftText(left), kg(left))
        )
      );
    const label =
      bar.parts.map((part) => `${part.label} ${kg(partKg(part))}` + (part.fullKg ? " including the tow ball" : "")).join(", ") +
      (left >= 0 ? `; ${kg(left)} left of the ${kg(bar.limitKg)} ${limitName}` : `; ${kg(-left)} over the ${kg(bar.limitKg)} ${limitName}`);
    return el(
      "div",
      { class: "budget-stack" + (left < 0 ? " has-limit" : ""), role: "img", "aria-label": label },
      blocks,
      left < 0 ? el("div", { class: "budget-limit", style: "left:" + pct(bar.limitKg, scale) }, el("span", null, limitName)) : null
    );
  }

  function head(title, figure, status, overKg) {
    return el("div", { class: "budget-head" }, el("h3", null, title), el("span", { class: "budget-figure" }, figure), chip(status, overKg));
  }

  // statuses: { payload, gcm } from the manufacturer checks
  function renderWeightBudget(b, statuses) {
    if (!b || (!b.vehicle && !b.combination))
      return el("p", { class: "muted" }, "Enter the tare and GVM, and what you carry, to see where your weight goes.");
    const out = [];

    if (b.vehicle) {
      const total = sum(b.vehicle.parts);
      const block = [
        head("Vehicle", `${kg(total)} of ${kg(b.vehicle.limitKg)} GVM`, statuses.payload, total - b.vehicle.limitKg),
        stack(b.vehicle, "GVM", (left) => `${kg(left)} left`),
      ];
      if (b.payload) {
        // the zoom: the payload stretch of the vehicle bar, drawn full width below
        const tare = b.vehicle.parts[0].kg;
        const from = (tare / Math.max(total, b.vehicle.limitKg)) * 100;
        const used = sum(b.payload.parts);
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "budget-zoom");
        svg.setAttribute("viewBox", "0 0 100 24");
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("aria-hidden", "true");
        const poly = document.createElementNS(svgNS, "polygon");
        poly.setAttribute("points", `${from.toFixed(2)},0 100,0 100,24 0,24`);
        poly.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(poly);
        const payloadKg = b.payload.limitKg;
        block.push(
          svg,
          el(
            "div",
            { class: "budget-head budget-head--sub" },
            el("h3", null, "Your payload"),
            el("span", { class: "budget-figure" }, `${kg(used)} of ${kg(payloadKg)} used (GVM − tare)`)
          ),
          stack(b.payload, "payload", (left) => `${kg(left)} left`),
          el(
            "table",
            { class: "budget-legend" },
            el("caption", { class: "visually-hidden" }, "Your payload, item by item"),
            el(
              "tbody",
              null,
              b.payload.parts.map((part) =>
                el(
                  "tr",
                  null,
                  el("td", null, el("span", { class: "budget-swatch budget-swatch--" + SWATCH[part.kind], "aria-hidden": "true" })),
                  el("th", { scope: "row" }, part.label, part.qty > 1 ? el("span", { class: "muted" }, ` (${part.qty} × ${kg(part.eachKg)})`) : null),
                  el("td", { class: "num" }, kg(part.kg)),
                  el("td", { class: "num muted" }, Math.round((part.kg / payloadKg) * 100) + " %")
                )
              ),
              el(
                "tr",
                { class: "budget-legend-total" },
                el("td", null, el("span", { class: "budget-swatch budget-swatch--left", "aria-hidden": "true" })),
                el("th", { scope: "row" }, used > payloadKg ? "Over" : "Left"),
                el("td", { class: "num" }, kg(Math.abs(payloadKg - used))),
                el("td", { class: "num muted" }, Math.round((Math.abs(payloadKg - used) / payloadKg) * 100) + " %")
              )
            )
          )
        );
      }
      out.push(el("div", { class: "budget" }, block));
    }

    if (b.combination) {
      const total = sum(b.combination.parts);
      const notes = [];
      if (b.towballKg)
        notes.push(`The tow ball's ${kg(b.towballKg)} sits on the vehicle but belongs to the trailer, so the whole rig counts it once.`);
      if (b.trailerSource) notes.push(`Trailer mass from ${C.MASS_SOURCE_TEXT[b.trailerSource]}.`);
      out.push(
        el(
          "div",
          { class: "budget" },
          head(b.trailerCount ? "Whole rig" : "Vehicle against the GCM", `${kg(total)} of ${kg(b.combination.limitKg)} GCM`, statuses.gcm, total - b.combination.limitKg),
          stack(b.combination, "GCM", (left) => (b.trailerCount ? `${kg(left)} left` : `${kg(left)} left for a trailer`)),
          notes.length ? el("p", { class: "budget-note" }, notes.join(" ")) : null
        )
      );
    }

    out.push(
      el(
        "ul",
        { class: "budget-key", "aria-label": "Key" },
        [
          ["tare", b.vehicleSource === "weighbridge" ? "Vehicle (weighed)" : "Tare (empty vehicle)"],
          b.vehicleSource === "estimate" ? ["load", "What you carry"] : null,
          b.towballKg ? ["towball", "Tow ball (the trailer's, on the vehicle)"] : null,
          b.combination && b.trailerCount ? ["trailer", "Trailer"] : null,
          ["left", "Room left"],
        ]
          .filter(Boolean)
          .map(([kind, text]) => el("li", null, el("span", { class: "budget-swatch budget-swatch--" + kind, "aria-hidden": "true" }), text))
      )
    );
    return out;
  }

  root.TOWING_CHARTS = { renderBrakeChart, renderWeightBudget, fitLabels };
})(window);
