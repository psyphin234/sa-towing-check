/* Visual effects, decoration only (nothing here touches the checks):
   - the rig hologram in the checker's header (canvas.hero-fx): a bakkie and
     caravan drawn in light, driving along a moving road while a scan beam sweeps
     over them and tags the front axle, rear axle, tow ball and trailer axle as
     it passes. It shows no figures, so it can't be mistaken for a result;
   - the form's fieldsets and the explainers fading in as they scroll into view.
   Under prefers-reduced-motion the hologram is drawn once, fully scanned, and
   the fade-ins are skipped. The circuit board behind the page is js/circuit.js. */
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

  function details(ctx) {
    // bakkie: windows, pillar, door, bed, lamp, towbar and ball
    ctx.moveTo(104, -82); ctx.lineTo(136, -118); ctx.lineTo(198, -120); ctx.lineTo(201, -82); ctx.closePath();
    ctx.moveTo(160, -82); ctx.lineTo(162, -119);
    ctx.moveTo(100, -76); ctx.lineTo(100, -40);
    ctx.moveTo(208, -80); ctx.lineTo(208, -36);
    ctx.moveTo(4, -55); ctx.lineTo(16, -57);
    ctx.moveTo(302, -36); ctx.lineTo(330, -36);
    ctx.moveTo(338, -40); ctx.arc(334, -40, 4, 0, Math.PI * 2);
    // drawbar and jockey wheel
    ctx.moveTo(334, -40); ctx.lineTo(392, -34);
    ctx.moveTo(334, -40); ctx.lineTo(392, -48);
    ctx.moveTo(372, -40); ctx.lineTo(372, -15);
    ctx.moveTo(377, -10); ctx.arc(372, -10, 5, 0, Math.PI * 2);
    // caravan: window, door, stripe
    ctx.moveTo(424, -118); ctx.lineTo(474, -118); ctx.lineTo(474, -92); ctx.lineTo(424, -92); ctx.closePath();
    ctx.moveTo(522, -118); ctx.lineTo(560, -118); ctx.lineTo(560, -40); ctx.lineTo(522, -40); ctx.closePath();
    ctx.moveTo(392, -62); ctx.lineTo(600, -62);
  }

  function wheels(ctx, spin) {
    WHEELS.forEach(function (w) {
      var cy = -w.r;
      ctx.moveTo(w.x + w.r, cy); ctx.arc(w.x, cy, w.r, 0, Math.PI * 2);
      ctx.moveTo(w.x + w.r * 0.36, cy); ctx.arc(w.x, cy, w.r * 0.36, 0, Math.PI * 2);
      for (var k = 0; k < 5; k++) {
        var a = spin + (k * Math.PI * 2) / 5;
        ctx.moveTo(w.x + Math.cos(a) * w.r * 0.36, cy + Math.sin(a) * w.r * 0.36);
        ctx.lineTo(w.x + Math.cos(a) * w.r * 0.86, cy + Math.sin(a) * w.r * 0.86);
      }
    });
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

  function start() { setUpReveal(); setUpHologram(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
