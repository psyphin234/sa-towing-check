/* Visual effects, decoration only (nothing here touches the checks):
   - the rig hologram in the checker's header (canvas.hero-fx): a bakkie and
     caravan drawn in light, driving along a moving road while a scan beam sweeps
     over them and tags the front axle, rear axle, tow ball and trailer axle as
     it passes. It shows no figures, so it can't be mistaken for a result;
   - "Your rig at a glance" on screen (window.TOWING_RIGFX, used by diagram.js):
     the same rig in light, with the user's own figures coloured by how close
     each is to its limit (this file loads before app.js for that);
   - the form's fieldsets and the explainers fading in as they scroll into view.
   Under prefers-reduced-motion the hologram is drawn once, fully scanned, the
   rig diagram stands still, and the fade-ins are skipped. The circuit board behind the page is js/circuit.js. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------- fade-ins
  function setUpReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("fx-reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
    document.querySelectorAll(".inputs fieldset, .explainer").forEach(function (el) { io.observe(el); });
    // Fail-safe: nothing stays invisible if the observer misses it.
    setTimeout(function () {
      document.querySelectorAll(".inputs fieldset, .explainer").forEach(function (el) { el.classList.add("is-visible"); });
    }, 4000);
  }

  // ------------------------------------------------------------ the hologram
  // The rig in its own units: the ground is y = 0 and up is negative; the bakkie
  // faces left (x = 0 is its front bumper) and the caravan ends at x = 600.
  var WHEELS = [
    { x: 62, r: 30 },   // bakkie front
    { x: 232, r: 30 },  // bakkie rear
    { x: 500, r: 28 },  // caravan
  ];
  var TAGS = [
    { x: 62, y: -30, label: "FRONT AXLE", row: 0, fill: 0.58 },
    { x: 232, y: -30, label: "REAR AXLE", row: 1, fill: 0.74 },
    { x: 334, y: -40, label: "TOW BALL", row: 0, fill: 0.66 },
    { x: 500, y: -28, label: "TRAILER AXLE", row: 1, fill: 0.62 },
  ];
  var SWEEP = 4.2, CYCLE = 6.6;      // seconds: the beam crosses, then holds

  function bakkie(ctx) {
    ctx.moveTo(0, -26);
    ctx.lineTo(2, -58);
    ctx.lineTo(14, -70);
    ctx.lineTo(98, -78);
    ctx.lineTo(134, -124);
    ctx.lineTo(202, -126);
    ctx.lineTo(208, -80);
    ctx.lineTo(300, -80);
    ctx.lineTo(302, -30);
    ctx.lineTo(270, -30);
    ctx.arc(232, -30, 38, 0, Math.PI, true);
    ctx.lineTo(100, -30);
    ctx.arc(62, -30, 38, 0, Math.PI, true);
    ctx.closePath();
  }

  function caravan(ctx) {
    ctx.moveTo(392, -28);
    ctx.lineTo(392, -120);
    ctx.quadraticCurveTo(394, -142, 418, -142);
    ctx.lineTo(578, -142);
    ctx.quadraticCurveTo(600, -142, 600, -120);
    ctx.lineTo(600, -28);
    ctx.lineTo(536, -28);
    ctx.arc(500, -28, 36, 0, Math.PI, true);
    ctx.closePath();
  }

  // The live rig diagram draws a sedan or a motor home instead of the bakkie
  // when that's the vehicle type; same wheels, same tow ball.
  function motorCar(ctx) {
    ctx.moveTo(0, -26);
    ctx.lineTo(2, -56);
    ctx.lineTo(16, -66);
    ctx.lineTo(92, -74);
    ctx.lineTo(128, -112);
    ctx.lineTo(236, -114);
    ctx.lineTo(282, -80);
    ctx.lineTo(300, -74);
    ctx.lineTo(302, -30);
    ctx.lineTo(270, -30);
    ctx.arc(232, -30, 38, 0, Math.PI, true);
    ctx.lineTo(100, -30);
    ctx.arc(62, -30, 38, 0, Math.PI, true);
    ctx.closePath();
  }

  function motorHome(ctx) {
    ctx.moveTo(0, -26);
    ctx.lineTo(2, -58);
    ctx.lineTo(14, -68);
    ctx.lineTo(46, -74);
    ctx.lineTo(68, -110);
    ctx.lineTo(40, -116);
    ctx.lineTo(46, -150);
    ctx.lineTo(290, -152);
    ctx.quadraticCurveTo(302, -152, 302, -140);
    ctx.lineTo(302, -30);
    ctx.lineTo(270, -30);
    ctx.arc(232, -30, 38, 0, Math.PI, true);
    ctx.lineTo(100, -30);
    ctx.arc(62, -30, 38, 0, Math.PI, true);
    ctx.closePath();
  }

  var BODIES = { goodsVehicle: bakkie, motorCar: motorCar, motorHome: motorHome };
  var ROOF = { goodsVehicle: -126, motorCar: -114, motorHome: -152 };   // at x = 150

  function vehicleDetails(ctx, type) {
    if (type === "motorCar") {
      ctx.moveTo(100, -76); ctx.lineTo(130, -108); ctx.lineTo(230, -110); ctx.lineTo(268, -78); ctx.closePath();
      ctx.moveTo(176, -76); ctx.lineTo(177, -110);
      ctx.moveTo(100, -74); ctx.lineTo(100, -40);
      ctx.moveTo(176, -76); ctx.lineTo(176, -40);
      ctx.moveTo(4, -53); ctx.lineTo(16, -55);
    } else if (type === "motorHome") {
      ctx.moveTo(50, -76); ctx.lineTo(68, -106);
      ctx.moveTo(110, -132); ctx.lineTo(170, -132); ctx.lineTo(170, -106); ctx.lineTo(110, -106); ctx.closePath();
      ctx.moveTo(196, -132); ctx.lineTo(226, -132); ctx.lineTo(226, -40); ctx.lineTo(196, -40); ctx.closePath();
      ctx.moveTo(60, -92); ctx.lineTo(302, -92);
      ctx.moveTo(4, -55); ctx.lineTo(16, -57);
    } else {
      // bakkie: windows, pillar, door, bed, lamp
      ctx.moveTo(104, -82); ctx.lineTo(136, -118); ctx.lineTo(198, -120); ctx.lineTo(201, -82); ctx.closePath();
      ctx.moveTo(160, -82); ctx.lineTo(162, -119);
      ctx.moveTo(100, -76); ctx.lineTo(100, -40);
      ctx.moveTo(208, -80); ctx.lineTo(208, -36);
      ctx.moveTo(4, -55); ctx.lineTo(16, -57);
    }
  }

  function towbar(ctx) {
    ctx.moveTo(302, -36); ctx.lineTo(330, -36);
    ctx.moveTo(338, -40); ctx.arc(334, -40, 4, 0, Math.PI * 2);
  }

  function hitch(ctx) {
    // drawbar and jockey wheel
    ctx.moveTo(334, -40); ctx.lineTo(392, -34);
    ctx.moveTo(334, -40); ctx.lineTo(392, -48);
    ctx.moveTo(372, -40); ctx.lineTo(372, -15);
    ctx.moveTo(377, -10); ctx.arc(372, -10, 5, 0, Math.PI * 2);
  }

  function caravanDetails(ctx) {
    // window, door, stripe
    ctx.moveTo(424, -118); ctx.lineTo(474, -118); ctx.lineTo(474, -92); ctx.lineTo(424, -92); ctx.closePath();
    ctx.moveTo(522, -118); ctx.lineTo(560, -118); ctx.lineTo(560, -40); ctx.lineTo(522, -40); ctx.closePath();
    ctx.moveTo(392, -62); ctx.lineTo(600, -62);
  }

  function details(ctx) {
    vehicleDetails(ctx, "goodsVehicle");
    towbar(ctx);
    hitch(ctx);
    caravanDetails(ctx);
  }

  function wheel(ctx, w, spin) {
    var cy = -w.r;
    ctx.moveTo(w.x + w.r, cy); ctx.arc(w.x, cy, w.r, 0, Math.PI * 2);
    ctx.moveTo(w.x + w.r * 0.36, cy); ctx.arc(w.x, cy, w.r * 0.36, 0, Math.PI * 2);
    for (var k = 0; k < 5; k++) {
      var a = spin + (k * Math.PI * 2) / 5;
      ctx.moveTo(w.x + Math.cos(a) * w.r * 0.36, cy + Math.sin(a) * w.r * 0.36);
      ctx.lineTo(w.x + Math.cos(a) * w.r * 0.86, cy + Math.sin(a) * w.r * 0.86);
    }
  }

  function wheels(ctx, spin) {
    WHEELS.forEach(function (w) { wheel(ctx, w, spin); });
  }

  function setUpHologram() {
    var canvas = document.querySelector(".hero-fx");
    if (!canvas || !canvas.getContext) return;
    var header = canvas.parentElement;
    var text = header.querySelector(".brand-text");
    var ctx = canvas.getContext("2d");

    var w = 0, h = 0, s = 1, ox = 0, gy = 0, fade = 1, labels = true;
    var mx = 0, my = 0, tx = 0, ty = 0;
    var dust = [];
    for (var i = 0; i < 26; i++) dust.push({ p: Math.random(), y: -4 - Math.random() * 40, v: 0.25 + Math.random() * 0.5 });

    function resize() {
      var rect = header.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var textRight = text ? text.getBoundingClientRect().right - rect.left : w * 0.6;
      var contentRight = (w + Math.min(w, 1120)) / 2;
      var room = Math.min(w - 24, contentRight + 140) - textRight - 30;
      if (room > 300) {
        s = Math.min(room / 690, (h - 36) / 300);
        ox = textRight + 30 + (room - 600 * s) / 2;
        gy = h - 46 * s - 24;
        fade = 1; labels = true;
      } else {
        // Narrow screens: a faint rig behind the text, along the bottom.
        s = Math.min((w * 0.95) / 640, (h * 0.55) / 250);
        ox = w - 620 * s;
        gy = h - 30 * s - 12;
        fade = 0.2; labels = false;
      }
    }

    function stroke(colour, width, blur) {
      ctx.strokeStyle = colour;
      ctx.lineWidth = width / s;
      ctx.shadowColor = "rgba(76, 201, 255, 0.9)";
      ctx.shadowBlur = blur;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function drawRig(time, colour, width, blur) {
      var bob = Math.sin(time * 7) * 0.7, lag = Math.sin(time * 7 - 0.9) * 0.7;
      ctx.save(); ctx.translate(0, bob);
      ctx.beginPath(); bakkie(ctx); stroke(colour, width, blur);
      ctx.restore();
      ctx.save(); ctx.translate(0, lag);
      ctx.beginPath(); caravan(ctx); stroke(colour, width, blur);
      ctx.restore();
      ctx.save(); ctx.translate(0, (bob + lag) / 2);
      ctx.beginPath(); details(ctx); stroke(colour, width * 0.75, blur * 0.6);
      ctx.restore();
      ctx.beginPath(); wheels(ctx, -time * 5); stroke(colour, width * 0.9, blur * 0.8);
    }

    function frame(t) {
      var time = t / 1000;
      ctx.clearRect(0, 0, w, h);
      tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;

      ctx.save();
      ctx.translate(ox + tx * 10, gy + ty * 6);
      ctx.scale(s, s);
      ctx.globalAlpha = fade;

      // Light pooled under the rig.
      var pool = ctx.createRadialGradient(300, -40, 10, 300, -40, 360);
      pool.addColorStop(0, "rgba(47, 107, 255, 0.22)");
      pool.addColorStop(1, "rgba(47, 107, 255, 0)");
      ctx.fillStyle = pool;
      ctx.fillRect(-80, -260, 760, 330);

      // The road: a lit line, lane dashes and a floor grid sliding past (the rig
      // drives left, so the world moves right).
      var road = ctx.createLinearGradient(-120, 0, 720, 0);
      road.addColorStop(0, "rgba(76, 201, 255, 0)");
      road.addColorStop(0.2, "rgba(76, 201, 255, 0.7)");
      road.addColorStop(0.8, "rgba(76, 201, 255, 0.7)");
      road.addColorStop(1, "rgba(76, 201, 255, 0)");
      ctx.beginPath(); ctx.moveTo(-120, 0); ctx.lineTo(720, 0);
      ctx.strokeStyle = road; ctx.lineWidth = 1.2 / s;
      ctx.shadowColor = "rgba(76, 201, 255, 0.9)"; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      var shift = (time * 140) % 60;
      ctx.strokeStyle = "rgba(76, 201, 255, 0.35)";
      ctx.lineWidth = 2 / s;
      ctx.beginPath();
      for (var x = -120 + shift; x < 720; x += 60) { ctx.moveTo(x, 12); ctx.lineTo(x + 26, 12); }
      ctx.stroke();
      ctx.lineWidth = 0.8 / s;
      var gshift = (time * 140) % 40;
      for (var gx = -160 + gshift; gx < 760; gx += 40) {
        var edge = 1 - Math.min(1, Math.abs(gx - 300) / 440);
        ctx.strokeStyle = "rgba(76, 201, 255, " + (0.22 * edge) + ")";
        ctx.beginPath(); ctx.moveTo(gx, 2); ctx.lineTo(300 + (gx - 300) * 1.6, 46); ctx.stroke();
      }
      [20, 32, 46].forEach(function (y, k) {
        ctx.strokeStyle = "rgba(76, 201, 255, " + (0.16 - k * 0.04) + ")";
        ctx.beginPath(); ctx.moveTo(-100, y); ctx.lineTo(700, y); ctx.stroke();
      });

      // Dust thrown up behind the caravan.
      ctx.fillStyle = "rgb(150, 210, 255)";
      dust.forEach(function (d) {
        var p = (d.p + time * d.v * 0.4) % 1;
        ctx.globalAlpha = fade * (1 - p) * 0.6;
        ctx.fillRect(600 + p * 160, d.y - p * 10, 2 / s, 2 / s);
      });
      ctx.globalAlpha = fade;

      // Faint body fill, then the rig in light.
      ctx.save();
      ctx.beginPath(); bakkie(ctx); caravan(ctx);
      var body = ctx.createLinearGradient(0, -150, 0, 0);
      body.addColorStop(0, "rgba(76, 201, 255, 0.10)");
      body.addColorStop(1, "rgba(76, 201, 255, 0.02)");
      ctx.fillStyle = body;
      ctx.fill();
      // hologram scan lines inside the body
      ctx.clip();
      ctx.fillStyle = "rgba(160, 225, 255, 0.07)";
      var lineShift = (time * 12) % 4;
      for (var ly = -150 + lineShift; ly < 0; ly += 4) ctx.fillRect(0, ly, 600, 1 / s);
      ctx.restore();
      drawRig(time, "rgba(76, 201, 255, 0.75)", 1.4, 6);

      // The scan beam, and the band it has just lit.
      var phase = reduceMotion ? SWEEP + 0.6 : time % CYCLE;
      var beamX = -40 + (phase / SWEEP) * 680;
      if (phase < SWEEP) {
        [[70, "rgba(130, 220, 255, 0.55)", 1.6, 8], [16, "rgba(235, 250, 255, 0.95)", 1.8, 12]].forEach(function (band) {
          ctx.save();
          ctx.beginPath(); ctx.rect(beamX - band[0], -170, band[0], 220); ctx.clip();
          drawRig(time, band[1], band[2], band[3]);
          ctx.restore();
        });
        var beam = ctx.createLinearGradient(beamX - 26, 0, beamX + 4, 0);
        beam.addColorStop(0, "rgba(76, 201, 255, 0)");
        beam.addColorStop(1, "rgba(76, 201, 255, 0.28)");
        ctx.fillStyle = beam;
        ctx.fillRect(beamX - 26, -170, 30, 216);
        ctx.fillStyle = "rgba(220, 245, 255, 0.95)";
        ctx.shadowColor = "rgba(76, 201, 255, 1)"; ctx.shadowBlur = 14;
        ctx.fillRect(beamX, -170, 1.6 / s, 216);
        ctx.shadowBlur = 0;
      }

      // Tags: each appears as the beam passes, then fades before the next sweep.
      if (labels) {
        var out = phase > CYCLE - 0.45 ? (CYCLE - phase) / 0.45 : 1;
        ctx.font = "600 " + (10.5 / s) + "px Inter, system-ui, sans-serif";
        if ("letterSpacing" in ctx) ctx.letterSpacing = (1.6 / s) + "px";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        TAGS.forEach(function (tag) {
          var a = Math.max(0, Math.min(1, (beamX - tag.x) / 50)) * out;
          if (a <= 0) return;
          var top = tag.row ? -214 : -188;
          ctx.globalAlpha = fade * a;
          // leader: a dashed line down to the point, with an arrowhead
          ctx.strokeStyle = "rgba(76, 201, 255, 0.8)";
          ctx.lineWidth = 1 / s;
          ctx.setLineDash([3 / s, 3 / s]);
          ctx.beginPath(); ctx.moveTo(tag.x, top + 14); ctx.lineTo(tag.x, tag.y - 6); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(76, 201, 255, 0.95)";
          ctx.beginPath(); ctx.moveTo(tag.x - 4, tag.y - 10); ctx.lineTo(tag.x + 4, tag.y - 10); ctx.lineTo(tag.x, tag.y - 3); ctx.closePath(); ctx.fill();
          // a ring that pulses on the point
          var ring = (time * 1.4 + tag.x / 200) % 1;
          ctx.strokeStyle = "rgba(160, 230, 255, " + (1 - ring) * 0.8 + ")";
          ctx.beginPath(); ctx.arc(tag.x, tag.y, 3 + ring * 9, 0, Math.PI * 2); ctx.stroke();
          // the label and a small meter that fills
          ctx.fillStyle = "rgba(225, 242, 255, 0.95)";
          ctx.shadowColor = "rgba(76, 201, 255, 0.9)"; ctx.shadowBlur = 8;
          ctx.fillText(tag.label, tag.x, top);
          ctx.shadowBlur = 0;
          var mw = 54, fill = tag.fill * Math.min(1, (beamX - tag.x) / 140);
          ctx.fillStyle = "rgba(76, 201, 255, 0.18)";
          ctx.fillRect(tag.x - mw / 2, top + 4, mw, 3);
          ctx.fillStyle = "rgba(76, 201, 255, 0.95)";
          ctx.fillRect(tag.x - mw / 2, top + 4, mw * fill, 3);
        });
        ctx.globalAlpha = fade;

        // A HUD frame round the scene, with its name and a blinking light.
        ctx.strokeStyle = "rgba(76, 201, 255, 0.55)";
        ctx.lineWidth = 1 / s;
        var L = -40, T = -262, R = 640, B = 56, c = 16;
        ctx.beginPath();
        ctx.moveTo(L, T + c); ctx.lineTo(L, T); ctx.lineTo(L + c, T);
        ctx.moveTo(R - c, T); ctx.lineTo(R, T); ctx.lineTo(R, T + c);
        ctx.moveTo(L, B - c); ctx.lineTo(L, B); ctx.lineTo(L + c, B);
        ctx.moveTo(R - c, B); ctx.lineTo(R, B); ctx.lineTo(R, B - c);
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(150, 190, 235, 0.8)";
        ctx.fillText("RIG SCAN", L + 30, T + 12);
        ctx.fillStyle = "rgba(46, 230, 166, " + (0.4 + 0.6 * (Math.sin(time * 4) > 0 ? 1 : 0.2)) + ")";
        ctx.beginPath(); ctx.arc(L + 18, T + 12, 3.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    var running = false, visible = true, raf = 0;
    function loop(t) { frame(t); raf = requestAnimationFrame(loop); }
    function update() {
      var should = !reduceMotion && visible && !document.hidden;
      if (should && !running) { running = true; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }
    function still() { if (!running) frame(SWEEP * 1000 + 1500); }

    resize();
    still();
    if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); still(); }).observe(header);
    else window.addEventListener("resize", function () { resize(); still(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); still(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }).observe(header);
    }
    document.addEventListener("visibilitychange", update);
    header.addEventListener("pointermove", function (e) {
      var rect = header.getBoundingClientRect();
      mx = (e.clientX - rect.left) / rect.width - 0.5;
      my = (e.clientY - rect.top) / rect.height - 0.5;
    });
    update();
  }

  // ------------------------------------------------------- live rig diagram
  // "Your rig at a glance" on screen: the rig in light on a moving road, with
  // the mass at each point from ratings.rigDiagram(), coloured by how close it
  // is to its limit. diagram.js calls TOWING_RIGFX.show(data) on every render
  // and puts the canvas it returns in the figure. It's the same canvas each
  // time, so the animation carries on and a changed figure counts to its new
  // value. The SVG beside it is for print. The colours are lenient on purpose
  // (owner's request): a hard limit (GVM, GCM, axle ratings, the trailer's
  // plated GVM) stays green to 85 %, turns orange by 90 % and red from 94 %;
  // the tow ball is green up to its maximum (sitting right on the recommended
  // 100 kg is what you aim for), orange over the recommended maximum and red
  // over the maker's rating, as its check says.
  var GREEN = [46, 230, 166], ORANGE = [255, 166, 64], RED = [255, 93, 115];
  var NEUTRAL = [76, 201, 255], NONE = [120, 140, 180];
  var SHORT = { GVM: "GVM", GCM: "GCM", rating: "rating", "recommended maximum": "max", maximum: "max", "plated GVM": "GVM" };
  var SW = 700, SH = 410, TOP = -262;   // the scene, in rig units

  function kg(n) {
    return window.TOWING_CHECKS.kg(n);
  }

  function mix(a, b, t) {
    return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); });
  }

  function rgba(c, a) {
    return "rgba(" + c[0] + ", " + c[1] + ", " + c[2] + ", " + a + ")";
  }

  function tone(p, kind) {
    if (!p || p.kg === null) return { c: p && p.changeKg !== undefined ? NEUTRAL : NONE, f: null, pulse: false };
    if (p.limit === null) return { c: NEUTRAL, f: null, pulse: false };
    var f = p.kg / p.limit, c;
    if (kind === "towball") c = p.status === "fail" ? RED : f > 1 ? ORANGE : GREEN;
    else if (f <= 0.85) c = GREEN;
    else if (f <= 0.9) c = mix(GREEN, ORANGE, (f - 0.85) / 0.05);
    else if (f < 0.94) c = mix(ORANGE, RED, (f - 0.9) / 0.04);
    else c = RED;
    return { c: c, f: f, pulse: kind === "towball" ? p.status === "fail" : f > 1 };
  }

  var rigLive = (function () {
    var canvas = null, ctx = null, data = null, shown = {};
    var w = 0, h = 0, s = 1, running = false, visible = false, raf = 0, last = 0;

    function setUp() {
      canvas = document.createElement("canvas");
      canvas.className = "rig-live";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Side view of the rig with the mass on each axle, the tow ball, the vehicle, the trailer and the whole rig, coloured by how close each is to its limit. The same figures are in the table below.");
      ctx = canvas.getContext("2d");
      if ("ResizeObserver" in window) new ResizeObserver(function () { if (resize()) still(); }).observe(canvas);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; update(); }).observe(canvas);
      } else visible = true;
      document.addEventListener("visibilitychange", update);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(still);
    }

    function resize() {
      var cw = canvas.clientWidth;
      if (!cw) return false;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Text has a minimum size, so a narrow canvas gets a little taller.
      w = cw; h = (cw * SH) / SW + (cw < 440 ? 36 : 0); s = cw / SW;
      canvas.style.height = h + "px";
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }

    function items(d, type) {
      var list = [{ key: "vehicle", x: 150, top: true, name: "VEHICLE", p: d.vehicle, kind: "mass", to: ROOF[type] }];
      if (d.trailerCount) {
        list.push({ key: "towball", x: 334, top: true, name: "TOW BALL", p: d.towball, kind: "towball", to: -50 });
        list.push({ key: "trailer", x: 518, top: true, name: d.trailerCount > 1 ? d.trailerCount + " TRAILERS" : "TRAILER", p: d.trailer, kind: "mass", to: -148 });
      }
      list.push({ key: "front", x: 62, name: "FRONT AXLE", p: d.front, kind: "axle" });
      list.push({ key: "rear", x: 232, name: "REAR AXLE", p: d.rear, kind: "axle" });
      if (d.trailerCount) list.push({ key: "trailerAxles", x: 500, name: "TRAILER AXLE", p: d.trailerAxles, kind: "axle" });
      if (d.combined) list.push({ key: "combined", name: "WHOLE RIG", p: d.combined, kind: "mass", bar: true });
      list.forEach(function (it) { it.t = tone(it.p, it.kind); });
      return list;
    }

    function target(p) {
      if (!p) return null;
      if (p.kg !== null) return p.kg;
      return p.changeKg !== undefined ? p.changeKg : null;
    }

    function valueText(it) {
      var p = it.p, v = shown[it.key];
      if (!p || v === undefined || v === null) return "—";
      if (p.kg !== null) return kg(v);
      var r = Math.round(v);
      return (r >= 0 ? "+" : "−") + kg(Math.abs(r));
    }

    function subText(it) {
      var p = it.p;
      if (!p) return "";
      if (p.kg === null) return p.changeKg !== undefined ? "tow ball effect" : it.kind === "axle" ? "weigh to see" : "";
      if (p.limit !== null)
        return (it.t.f > 1 ? "over " : "of ") + kg(p.limit) + " " + (SHORT[p.limitLabel] || p.limitLabel) + " · " + Math.round(it.t.f * 100) + " %";
      if (p.source === "estimate") return "estimate";
      if (p.source === "plated") return "plated GVM";
      return "";
    }

    function font(weight, px, family) {
      return weight + " " + px / s + "px " + family;
    }

    function stroke(colour, width, blur) {
      ctx.strokeStyle = rgba(colour, 0.85);
      ctx.lineWidth = width / s;
      ctx.shadowColor = rgba(colour, 0.9);
      ctx.shadowBlur = blur;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    function draw(t, snap) {
      if (!data || !w || !canvas.isConnected) return;
      var time = t / 1000;
      var dt = last ? Math.min((t - last) / 1000, 0.1) : 0;
      last = t;
      var d = data, type = BODIES[d.vehicleType] ? d.vehicleType : "goodsVehicle", trailer = d.trailerCount > 0;
      var list = items(d, type), by = {};
      var ease = snap ? 1 : 1 - Math.exp(-dt * 6);
      list.forEach(function (it) {
        by[it.key] = it;
        var v = target(it.p);
        if (v === null) { shown[it.key] = null; return; }
        var cur = shown[it.key];
        shown[it.key] = cur === undefined || cur === null || Math.abs(v - cur) < 0.5 ? v : cur + (v - cur) * ease;
      });
      var part = function (key) {
        var it = by[key];
        return !it || it.t.c === NONE ? NEUTRAL : it.t.c;
      };
      var pulse = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(time * 4.5);
      var narrow = w < 440;
      var x1 = trailer ? 600 : 334, centre = trailer ? 300 : 167;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2 - centre * s, -TOP * s);
      ctx.scale(s, s);

      // Light pooled under the rig.
      var pool = ctx.createRadialGradient(centre, -40, 10, centre, -40, 380);
      pool.addColorStop(0, "rgba(47, 107, 255, 0.2)");
      pool.addColorStop(1, "rgba(47, 107, 255, 0)");
      ctx.fillStyle = pool;
      ctx.fillRect(centre - SW / 2, TOP, SW, SH);

      // The road sliding past (the rig drives left, so the world moves right).
      var L = centre - SW / 2, R = centre + SW / 2;
      var road = ctx.createLinearGradient(L, 0, R, 0);
      road.addColorStop(0, "rgba(76, 201, 255, 0)");
      road.addColorStop(0.15, "rgba(76, 201, 255, 0.6)");
      road.addColorStop(0.85, "rgba(76, 201, 255, 0.6)");
      road.addColorStop(1, "rgba(76, 201, 255, 0)");
      ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(R, 0);
      ctx.strokeStyle = road; ctx.lineWidth = 1.2 / s;
      ctx.shadowColor = "rgba(76, 201, 255, 0.9)"; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
      var move = reduceMotion ? 0 : time * 140;
      ctx.strokeStyle = "rgba(76, 201, 255, 0.3)";
      ctx.lineWidth = 2 / s;
      ctx.beginPath();
      for (var x = L - 60 + (move % 60); x < R; x += 60) { ctx.moveTo(x, 12); ctx.lineTo(x + 26, 12); }
      ctx.stroke();
      ctx.lineWidth = 0.8 / s;
      for (var gx = L - 40 + (move % 40); gx < R; gx += 40) {
        var edge = 1 - Math.min(1, Math.abs(gx - centre) / (SW / 2));
        ctx.strokeStyle = "rgba(76, 201, 255, " + 0.16 * edge + ")";
        ctx.beginPath(); ctx.moveTo(gx, 2); ctx.lineTo(centre + (gx - centre) * 1.3, 30); ctx.stroke();
      }
      ctx.strokeStyle = "rgba(76, 201, 255, 0.1)";
      ctx.beginPath(); ctx.moveTo(L, 24); ctx.lineTo(R, 24); ctx.stroke();

      // The rig, each part in its own colour.
      var bob = reduceMotion ? 0 : Math.sin(time * 7) * 0.7, lag = reduceMotion ? 0 : Math.sin(time * 7 - 0.9) * 0.7;
      var spin = reduceMotion ? 0 : -time * 5;
      var fillBody = function (path, colour) {
        ctx.save();
        ctx.beginPath(); path(ctx);
        var g = ctx.createLinearGradient(0, -155, 0, 0);
        g.addColorStop(0, rgba(colour, 0.13));
        g.addColorStop(1, rgba(colour, 0.02));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.clip();
        ctx.fillStyle = rgba(colour, 0.08);
        for (var ly = -156 + ((reduceMotion ? 0 : time * 12) % 4); ly < 0; ly += 4) ctx.fillRect(0, ly, 600, 1 / s);
        ctx.restore();
      };
      var cV = part("vehicle"), cB = part("towball"), cT = part("trailer");
      ctx.save(); ctx.translate(0, bob);
      fillBody(BODIES[type], cV);
      ctx.beginPath(); BODIES[type](ctx); stroke(cV, 1.6, 7);
      ctx.beginPath(); vehicleDetails(ctx, type); stroke(cV, 1.1, 4);
      if (trailer) { ctx.beginPath(); towbar(ctx); stroke(cB, 1.6, 8); }
      ctx.restore();
      if (trailer) {
        ctx.save(); ctx.translate(0, lag);
        fillBody(caravan, cT);
        ctx.beginPath(); caravan(ctx); stroke(cT, 1.6, 7);
        ctx.beginPath(); caravanDetails(ctx); stroke(cT, 1.1, 4);
        ctx.restore();
        ctx.save(); ctx.translate(0, (bob + lag) / 2);
        ctx.beginPath(); hitch(ctx); stroke(cB, 1.3, 6);
        ctx.restore();
      }
      [["front", WHEELS[0]], ["rear", WHEELS[1]], ["trailerAxles", WHEELS[2]]].forEach(function (pair) {
        if (pair[0] === "trailerAxles" && !trailer) return;
        ctx.beginPath(); wheel(ctx, pair[1], spin); stroke(part(pair[0]), 1.4, 6);
      });

      // Figures.
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      var valuePx = Math.max(13, 26 * s), namePx = Math.max(9, 11 * s), subPx = Math.max(9, 13 * s);
      var nameAt = function (str, x, y, align) {
        ctx.font = font(600, namePx, "Inter, system-ui, sans-serif");
        if ("letterSpacing" in ctx) ctx.letterSpacing = 1.4 / s + "px";
        ctx.fillStyle = "rgba(160, 190, 230, 0.85)";
        ctx.textAlign = align || "center";
        ctx.fillText(str, x, y);
        var width = ctx.measureText(str).width;
        if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
        return width;
      };
      var valueAt = function (it, x, y, align) {
        ctx.font = font(700, valuePx, "Sora, Inter, system-ui, sans-serif");
        ctx.textAlign = align || "center";
        ctx.fillStyle = it.t.c === NONE ? "rgba(150, 165, 200, 0.8)" : rgba(mix(it.t.c, [255, 255, 255], 0.15), 1);
        ctx.shadowColor = rgba(it.t.c, 0.8);
        ctx.shadowBlur = it.t.pulse ? 8 + 14 * pulse : 8;
        ctx.fillText(valueText(it), x, y);
        ctx.shadowBlur = 0;
      };
      var subAt = function (it, x, y, align) {
        if (narrow) return;
        var str = subText(it);
        if (!str) return;
        ctx.font = font(500, subPx, "Inter, system-ui, sans-serif");
        ctx.textAlign = align || "center";
        ctx.fillStyle = it.t.pulse ? rgba(RED, 0.75 + 0.25 * pulse) : "rgba(185, 205, 235, 0.8)";
        ctx.fillText(str, x, y);
      };
      var meter = function (it, x0, y, width) {
        ctx.fillStyle = "rgba(120, 170, 255, 0.16)";
        ctx.fillRect(x0, y, width, 4);
        if (it.t.f === null) return;
        ctx.fillStyle = rgba(it.t.c, it.t.pulse ? 0.7 + 0.3 * pulse : 0.95);
        ctx.shadowColor = rgba(it.t.c, 0.9);
        ctx.shadowBlur = 8;
        ctx.fillRect(x0, y, width * Math.min(it.t.f, 1), 4);
        ctx.shadowBlur = 0;
      };

      // Rows are spaced by the text's size on screen, which has a minimum.
      var topValue = -236 + (valuePx + 4) / s;
      var topMeter = (narrow ? topValue : topValue + (subPx + 5) / s) + 7 / s;
      var lowValue = 30 + (valuePx * 0.78 + 4) / s;
      var lowName = lowValue + (namePx + 6) / s;
      var barText = (narrow ? lowName : lowName + (subPx + 4) / s) + (namePx + 10) / s;

      list.forEach(function (it) {
        if (it.bar) return;
        if (it.top) {
          nameAt(it.name, it.x, -236);
          valueAt(it, it.x, topValue);
          subAt(it, it.x, topValue + (subPx + 5) / s);
          meter(it, it.x - 48, topMeter, 96);
          // a leader down to the part; the tow ball's flows down onto the ball
          var c = it.t.c === NONE ? NEUTRAL : it.t.c, flow = it.key === "towball";
          ctx.strokeStyle = rgba(c, flow ? 0.8 : 0.45);
          ctx.lineWidth = (flow ? 1.6 : 1) / s;
          ctx.setLineDash(flow ? [6 / s, 5 / s] : [3 / s, 4 / s]);
          ctx.lineDashOffset = flow && !reduceMotion ? -time * 26 / s : 0;
          ctx.beginPath(); ctx.moveTo(it.x, topMeter + 10 / s); ctx.lineTo(it.x, it.to - 8); ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          ctx.fillStyle = rgba(c, 0.95);
          ctx.beginPath(); ctx.moveTo(it.x - 5, it.to - 12); ctx.lineTo(it.x + 5, it.to - 12); ctx.lineTo(it.x, it.to - 3); ctx.closePath(); ctx.fill();
        } else {
          valueAt(it, it.x, lowValue);
          nameAt(it.name, it.x, lowName);
          subAt(it, it.x, lowName + (subPx + 4) / s);
        }
      });

      // The whole rig against its GCM, as a bar along the bottom.
      var all = by.combined;
      if (all) {
        var nameW = nameAt(all.name, 0, barText, "left") + 10 / s;
        var saved = valuePx;
        valuePx = Math.max(12, 18 * s);
        valueAt(all, nameW, barText + 1 / s, "left");
        valuePx = saved;
        subAt(all, x1, barText, "right");
        meter(all, 0, barText + 7 / s, x1);
      }

      // HUD corners and a "live" light.
      var hl = -44, hr = x1 + 44, ht = TOP + 6, hb = h / s + TOP - 6, k = 16;
      ctx.strokeStyle = "rgba(76, 201, 255, 0.45)";
      ctx.lineWidth = 1 / s;
      ctx.beginPath();
      ctx.moveTo(hl, ht + k); ctx.lineTo(hl, ht); ctx.lineTo(hl + k, ht);
      ctx.moveTo(hr - k, ht); ctx.lineTo(hr, ht); ctx.lineTo(hr, ht + k);
      ctx.moveTo(hl, hb - k); ctx.lineTo(hl, hb); ctx.lineTo(hl + k, hb);
      ctx.moveTo(hr - k, hb); ctx.lineTo(hr, hb); ctx.lineTo(hr, hb - k);
      ctx.stroke();
      ctx.fillStyle = "rgba(46, 230, 166, " + (reduceMotion ? 0.9 : 0.5 + 0.5 * pulse) + ")";
      ctx.beginPath(); ctx.arc(hl + 14, ht + 14, 3.2, 0, Math.PI * 2); ctx.fill();
      nameAt("LIVE", hl + 24, ht + 18, "left");
      ctx.restore();
    }

    function still() { draw(performance.now(), true); }

    function loop(t) { draw(t, false); raf = requestAnimationFrame(loop); }

    function update() {
      var should = !reduceMotion && visible && !document.hidden && canvas.isConnected;
      if (should && !running) { running = true; last = 0; raf = requestAnimationFrame(loop); }
      if (!should && running) { running = false; cancelAnimationFrame(raf); }
    }

    function show(d) {
      if (!canvas) setUp();
      data = d;
      requestAnimationFrame(function () {
        if (resize() && !running) still();
        update();
      });
      return canvas;
    }

    return { show: show };
  })();

  window.TOWING_RIGFX = { show: rigLive.show };

  function start() { setUpReveal(); setUpHologram(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
