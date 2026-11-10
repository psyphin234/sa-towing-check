/* Visual effects, decoration only (nothing here touches the checks):
   - the rig hologram in the checker's header (canvas.hero-fx): a bakkie and
     caravan as a 3D wireframe in light, turning slowly as it drives along a
     road in perspective, while a scan beam sweeps down it and tags the front
     axle, rear axle, tow ball and trailer axle as it passes. It shows no
     figures, so it can't be mistaken for a result;
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

  function caravanDetails(ctx) {
    // window, door, stripe
    ctx.moveTo(424, -118); ctx.lineTo(474, -118); ctx.lineTo(474, -92); ctx.lineTo(424, -92); ctx.closePath();
    ctx.moveTo(522, -118); ctx.lineTo(560, -118); ctx.lineTo(560, -40); ctx.lineTo(522, -40); ctx.closePath();
    ctx.moveTo(392, -62); ctx.lineTo(600, -62);
  }

  // ------------------------------------------------------------ the rig in 3D
  // Both drawings show the rig as a wireframe with depth: each side-view shape
  // above is recorded as points, given a width, and seen through a camera that
  // can turn (yaw) and look down a little (pitch). Near side is z < 0.
  var TAU = Math.PI * 2;
  var HALF_WIDTH = { goodsVehicle: 52, motorCar: 50, motorHome: 58 }, CARAVAN_HALF = 60;

  // Stands in for a canvas context and keeps the points of what's drawn on it.
  function Rec() { this.lines = []; this.cur = null; }
  Rec.prototype.add = function (x, y, corner) {
    var p = this.cur.p, l = p[p.length - 1];
    if (l && Math.abs(l[0] - x) < 0.01 && Math.abs(l[1] - y) < 0.01) { if (corner) l[2] = 1; return; }
    p.push([x, y, corner ? 1 : 0]);
  };
  Rec.prototype.moveTo = function (x, y) {
    this.cur = { p: [], closed: false };
    this.lines.push(this.cur);
    this.add(x, y, true);
  };
  Rec.prototype.lineTo = function (x, y) { this.add(x, y, true); };
  Rec.prototype.arc = function (cx, cy, r, a0, a1, ccw) {
    var sweep = a1 - a0;
    if (ccw && sweep >= 0) sweep -= TAU;
    var n = Math.max(6, Math.ceil(Math.abs(sweep) / (Math.PI / 9)));
    for (var i = 0; i <= n; i++) {
      var a = a0 + (sweep * i) / n;
      this.add(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i === 0 || i === n);
    }
  };
  Rec.prototype.quadraticCurveTo = function (cx, cy, x, y) {
    var p = this.cur.p, from = p[p.length - 1];
    for (var i = 1; i <= 6; i++) {
      var t = i / 6, u = 1 - t;
      this.add(u * u * from[0] + 2 * u * t * cx + t * t * x, u * u * from[1] + 2 * u * t * cy + t * t * y, i === 6);
    }
  };
  Rec.prototype.closePath = function () { this.cur.closed = true; };

  function record(fn, arg) {
    var r = new Rec();
    fn(r, arg);
    return r.lines;
  }

  var MODELS = {};
  function modelFor(type) {
    if (!MODELS[type]) {
      MODELS[type] = type === "caravan"
        ? { outline: record(caravan), details: record(caravanDetails) }
        : { outline: record(BODIES[type]), details: record(vehicleDetails, type) };
    }
    return MODELS[type];
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  // The road's bumps under one wheel at a time: a ripple, and a pothole every
  // few seconds that the front, rear and trailer wheels each hit in turn.
  function bump(t) {
    var u = (((t % 5.5) + 5.5) % 5.5) - 0.6;
    return 0.8 * Math.sin(t * 6.1) + 0.5 * Math.sin(t * 9.7 + 1) + 7 * Math.exp(-(u * u) / 0.012);
  }

  function makeMotes(n) {
    var list = [];
    for (var i = 0; i < n; i++) list.push({ p: Math.random(), a: Math.random(), b: Math.random(), v: 0.25 + Math.random() * 0.5 });
    return list;
  }

  // A camera and a pile of line segments. Segments are sorted into buckets by
  // colour and brightness, so a frame is a few dozen strokes however many lines
  // the rig has; each bucket is stroked wide and faint, then thin and bright,
  // which glows without the cost of a canvas shadow.
  function Scene(ctx) {
    var centre = 0, sinYaw = 0, cosYaw = 1, sinPitch = 0, cosPitch = 1, D = 1600;
    var pivot = 0, lift = 0, tilt = 0;
    var buckets = {};
    var self = { X: 0, Y: 0, lit: null, hot: null, palette: [] };

    self.camera = function (c, yaw, pitch) {
      centre = c;
      sinYaw = Math.sin(yaw); cosYaw = Math.cos(yaw);
      sinPitch = Math.sin(pitch); cosPitch = Math.cos(pitch);
    };

    // What follows rides on a body that has risen by `rise` at x = `at` and
    // leans by `lean` (suspension). body() with nothing is the ground.
    self.body = function (at, rise, lean) { pivot = at || 0; lift = rise || 0; tilt = lean || 0; };

    self.pt = function (x, y, z) {
      y += lift + (x - pivot) * tilt;
      var X = x - centre;
      var X1 = X * cosYaw + z * sinYaw, Z1 = -X * sinYaw + z * cosYaw;
      var Y1 = y * cosPitch - Z1 * sinPitch, Z2 = y * sinPitch + Z1 * cosPitch;
      var k = D / (D + Z2);
      self.X = centre + X1 * k;
      self.Y = Y1 * k;
    };

    self.seg = function (x1, y1, z1, x2, y2, z2, ci, a) {
      var mid = (x1 + x2) / 2, hq = 0;
      if (self.lit) a *= self.lit(mid);
      if (self.hot) hq = Math.round(self.hot(mid) * 2);
      var aq = Math.min(10, Math.round(a * 10));
      if (aq < 1) return;
      var key = ci * 100 + aq * 3 + hq;
      var b = buckets[key] || (buckets[key] = { ci: ci, a: aq / 10, h: hq / 2, pts: [], n: 0 });
      self.pt(x1, y1, z1); b.pts[b.n++] = self.X; b.pts[b.n++] = self.Y;
      self.pt(x2, y2, z2); b.pts[b.n++] = self.X; b.pts[b.n++] = self.Y;
    };

    self.poly = function (line, z, ci, a) {
      var p = line.p, n = p.length, m = line.closed ? n : n - 1;
      for (var i = 0; i < m; i++) {
        var q = p[(i + 1) % n];
        self.seg(p[i][0], p[i][1], z, q[0], q[1], z, ci, a);
      }
    };

    self.polys = function (lines, z, ci, a) {
      lines.forEach(function (line) { self.poly(line, z, ci, a); });
    };

    // A side-view outline given width: near side, far side, and an edge across
    // at every corner.
    self.extrude = function (lines, hw, ci, near, far, across) {
      lines.forEach(function (line) {
        self.poly(line, -hw, ci, near);
        self.poly(line, hw, ci, far);
        line.p.forEach(function (p) {
          if (p[2]) self.seg(p[0], p[1], -hw, p[0], p[1], hw, ci, across);
        });
      });
    };

    self.ring = function (x, y, z, r, n, ci, a) {
      for (var i = 0; i < n; i++) {
        var a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
        self.seg(x + Math.cos(a0) * r, y + Math.sin(a0) * r, z, x + Math.cos(a1) * r, y + Math.sin(a1) * r, z, ci, a);
      }
    };

    // A wheel standing on the ground: both tyre walls, the hub, spokes and
    // tread bars that turn with it.
    self.wheel = function (x, r, z, zin, rise, spin, ci, a) {
      var cy = -r - rise;
      self.ring(x, cy, z, r, 22, ci, a);
      self.ring(x, cy, zin, r, 22, ci, a * 0.4);
      self.ring(x, cy, z, r * 0.36, 11, ci, a);
      for (var k = 0; k < 5; k++) {
        var ang = spin + (k * TAU) / 5, c = Math.cos(ang), s = Math.sin(ang);
        self.seg(x + c * r * 0.36, cy + s * r * 0.36, z, x + c * r * 0.86, cy + s * r * 0.86, z, ci, a * 0.9);
        self.seg(x + c * r, cy + s * r, z, x + c * r, cy + s * r, zin, ci, a * 0.6);
      }
    };

    // Puts one outline on the canvas as a path (for fills).
    self.trace = function (line, z) {
      line.p.forEach(function (p, i) {
        self.pt(p[0], p[1], z);
        if (i) ctx.lineTo(self.X, self.Y); else ctx.moveTo(self.X, self.Y);
      });
      ctx.closePath();
    };

    self.flush = function (s, width) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      Object.keys(buckets).forEach(function (key) {
        var b = buckets[key];
        if (!b.n) return;
        var c = mix(self.palette[b.ci] || NEUTRAL, [255, 255, 255], b.h * 0.7);
        ctx.beginPath();
        for (var i = 0; i < b.n; i += 4) { ctx.moveTo(b.pts[i], b.pts[i + 1]); ctx.lineTo(b.pts[i + 2], b.pts[i + 3]); }
        ctx.strokeStyle = rgba(c, b.a * (0.16 + b.h * 0.14));
        ctx.lineWidth = (width * (4.5 + b.h * 3)) / s;
        ctx.stroke();
        ctx.strokeStyle = rgba(c, b.a);
        ctx.lineWidth = (width * (1 + b.h * 0.3)) / s;
        ctx.stroke();
        b.n = 0;
      });
    };

    return self;
  }

  // The road as a floor in perspective, sliding past (the rig drives left, so
  // the world moves right): a lit near edge, a dashed far lane line, a grid.
  function floor(ctx, sc, s, centre, half, zw, move) {
    sc.body();
    var x0 = centre - half, x1 = centre + half, lane = (zw * 2) / 3;
    var along = function (z, alpha, width) {
      sc.pt(x0, 0, z); var ax = sc.X, ay = sc.Y;
      sc.pt(x1, 0, z);
      var g = ctx.createLinearGradient(ax, ay, sc.X, sc.Y);
      g.addColorStop(0, "rgba(76, 201, 255, 0)");
      g.addColorStop(0.2, "rgba(76, 201, 255, " + alpha + ")");
      g.addColorStop(0.8, "rgba(76, 201, 255, " + alpha + ")");
      g.addColorStop(1, "rgba(76, 201, 255, 0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = width / s;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sc.X, sc.Y); ctx.stroke();
    };
    for (var i = -3; i <= 3; i++) {
      if (i === -2) along(-lane, 0.14, 5);
      along((i * zw) / 3, i === -2 ? 0.7 : 0.15, i === -2 ? 1.3 : 0.8);
    }
    var x, edge;
    ctx.lineWidth = 0.8 / s;
    for (x = x0 + (move % 50); x < x1; x += 50) {
      edge = 1 - Math.abs(x - centre) / half;
      ctx.strokeStyle = "rgba(76, 201, 255, " + 0.2 * edge + ")";
      sc.pt(x, 0, -zw); ctx.beginPath(); ctx.moveTo(sc.X, sc.Y);
      sc.pt(x, 0, zw); ctx.lineTo(sc.X, sc.Y); ctx.stroke();
    }
    ctx.lineWidth = 2.2 / s;
    for (x = x0 - 70 + (move % 70); x < x1; x += 70) {
      var from = Math.max(x, x0), to = Math.min(x + 30, x1);
      if (to <= from) continue;
      edge = 1 - Math.abs(x + 15 - centre) / half;
      ctx.strokeStyle = "rgba(150, 220, 255, " + 0.6 * clamp01(edge * 1.4) + ")";
      sc.pt(from, 0, lane); ctx.beginPath(); ctx.moveTo(sc.X, sc.Y);
      sc.pt(to, 0, lane); ctx.lineTo(sc.X, sc.Y); ctx.stroke();
    }
  }

  // Dust lifting off the back wheels (sources are [x, z] where a tyre meets the road).
  function dust(ctx, sc, s, motes, time, sources, alpha) {
    sc.body();
    ctx.fillStyle = "rgb(150, 210, 255)";
    motes.forEach(function (d, i) {
      var src = sources[i % sources.length], p = (d.p + time * d.v * 0.5) % 1;
      sc.pt(src[0] + 14 + p * 170, -3 - p * (10 + d.a * 34), src[1] + (d.b - 0.5) * 50 * p);
      ctx.globalAlpha = alpha * (1 - p) * 0.55;
      var size = (1.6 + p * 2.2) / s;
      ctx.fillRect(sc.X, sc.Y, size, size);
    });
    ctx.globalAlpha = alpha;
  }

  // Air rushing past on either side of the rig.
  function streaks(ctx, sc, s, motes, time, centre, half, height, alpha) {
    sc.body();
    ctx.strokeStyle = "rgb(170, 225, 255)";
    ctx.lineWidth = 1 / s;
    motes.forEach(function (d) {
      var p = (d.p + time * d.v * 0.55) % 1, x = centre - half + p * 2 * half;
      var y = -18 - d.a * height, z = (d.b < 0.5 ? -1 : 1) * (90 + d.b * 130), len = 30 + d.a * 60;
      sc.pt(x, y, z); var ax = sc.X, ay = sc.Y;
      sc.pt(x + len, y, z);
      ctx.globalAlpha = alpha * Math.sin(Math.PI * p) * 0.4;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sc.X, sc.Y); ctx.stroke();
    });
    ctx.globalAlpha = alpha;
  }

  // The near side of a body, faintly filled, with hologram scan lines in it.
  function fillFace(ctx, sc, s, outline, z, colour, shift) {
    ctx.save();
    ctx.beginPath(); sc.trace(outline[0], z);
    var g = ctx.createLinearGradient(0, -155, 0, 0);
    g.addColorStop(0, rgba(colour, 0.15));
    g.addColorStop(1, rgba(colour, 0.03));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = rgba(colour, 0.08);
    for (var ly = -176 + (shift % 4); ly < 24; ly += 4) ctx.fillRect(-80, ly, 760, 1 / s);
    ctx.restore();
  }

  function headlamps(ctx, sc, hw) {
    [-(hw - 12), hw - 12].forEach(function (z) {
      sc.pt(3, -56, z); var ax = sc.X, ay = sc.Y;
      sc.pt(-115, -84, z * 1.4); var bx = sc.X, by = sc.Y;
      sc.pt(-115, -4, z * 1.4);
      var g = ctx.createLinearGradient(ax, ay, (bx + sc.X) / 2, (by + sc.Y) / 2);
      g.addColorStop(0, "rgba(215, 240, 255, 0.2)");
      g.addColorStop(1, "rgba(215, 240, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(sc.X, sc.Y); ctx.closePath(); ctx.fill();
    });
  }

  // Puts the whole rig into the scene: o = { time, moving, type, trailer, ci },
  // where ci gives the palette index for each part. The caller flushes.
  function rig3d(ctx, sc, s, o) {
    var t = o.time, ci = o.ci, hw = HALF_WIDTH[o.type], body = modelFor(o.type);
    var lf = o.moving ? bump(t) : 0, lr = o.moving ? bump(t - 1.21) : 0, lt = o.moving ? bump(t - 3.13) : 0;
    var rise = -lf * 0.8, lean = (-(lr - lf) * 0.8) / 170;
    var ball = rise + (334 - 62) * lean;
    var spin = o.moving ? -t * 5 : 0, shift = o.moving ? t * 12 : 0;

    sc.body(62, rise, lean);
    fillFace(ctx, sc, s, body.outline, -hw, sc.palette[ci.vehicle], shift);
    if (o.lamps) headlamps(ctx, sc, hw);
    sc.extrude(body.outline, hw, ci.vehicle, 0.9, 0.3, 0.42);
    sc.polys(body.details, -hw, ci.vehicle, 0.6);
    sc.polys(body.details, hw, ci.vehicle, 0.14);
    if (o.trailer) {
      sc.seg(302, -36, 0, 330, -36, 0, ci.towball, 0.95);
      sc.ring(334, -40, 0, 4.5, 10, ci.towball, 0.95);

      var van = modelFor("caravan");
      sc.body(334, ball, (-lt * 0.8 - ball) / 166);
      fillFace(ctx, sc, s, van.outline, -CARAVAN_HALF, sc.palette[ci.trailer], shift);
      sc.extrude(van.outline, CARAVAN_HALF, ci.trailer, 0.9, 0.3, 0.42);
      sc.polys(van.details, -CARAVAN_HALF, ci.trailer, 0.6);
      sc.polys(van.details, CARAVAN_HALF, ci.trailer, 0.14);
      // A-frame drawbar and jockey wheel
      sc.seg(334, -40, 0, 392, -38, -44, ci.towball, 0.85);
      sc.seg(334, -40, 0, 392, -38, 44, ci.towball, 0.6);
      sc.seg(372, -39, 0, 372, -15, 0, ci.towball, 0.8);
      sc.ring(372, -10, 0, 5, 10, ci.towball, 0.8);
    }

    sc.body();
    [[WHEELS[0], hw, lf, ci.front], [WHEELS[1], hw, lr, ci.rear], [WHEELS[2], CARAVAN_HALF, lt, ci.trailerAxles]].forEach(function (q, i) {
      if (i === 2 && !o.trailer) return;
      var w = q[0], out = q[1] - 3;
      sc.wheel(w.x, w.r, -out, -out + 17, q[2], spin, q[3], 0.9);
      sc.wheel(w.x, w.r, out, out - 17, q[2], spin, q[3], 0.3);
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
    var dust_motes = makeMotes(28);

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
        s = Math.min(room / 730, (h - 36) / 300);
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

    var sc = Scene(ctx);
    sc.palette = [NEUTRAL];
    var CI = { vehicle: 0, towball: 0, trailer: 0, front: 0, rear: 0, trailerAxles: 0 };
    var TAG_Z = [-49, -49, 0, -57];
    var REAR_TYRES = [[232, -49], [232, 49], [500, -57], [500, 57]];
    var wind = makeMotes(12);

    function frame(t) {
      var time = t / 1000;
      ctx.clearRect(0, 0, w, h);
      tx += (mx - tx) * 0.05; ty += (my - ty) * 0.05;
      var phase = reduceMotion ? SWEEP + 0.6 : time % CYCLE;
      var beamX = -40 + (phase / SWEEP) * 680;
      var out = phase > CYCLE - 0.45 ? (CYCLE - phase) / 0.45 : 1;

      ctx.save();
      ctx.translate(ox, gy);
      ctx.scale(s, s);
      ctx.globalAlpha = fade;
      // The rig turns slowly from side-on to three-quarter view, and leans
      // towards the pointer.
      sc.camera(300, reduceMotion ? -0.3 : -0.18 + 0.32 * Math.sin(time * 0.33) + tx * 0.5, 0.2 + ty * 0.14);

      // Light pooled under the rig.
      var pool = ctx.createRadialGradient(300, -40, 10, 300, -40, 360);
      pool.addColorStop(0, "rgba(47, 107, 255, 0.22)");
      pool.addColorStop(1, "rgba(47, 107, 255, 0)");
      ctx.fillStyle = pool;
      ctx.fillRect(-100, -420, 800, 800);

      floor(ctx, sc, s, 300, 420, 150, reduceMotion ? 0 : time * 140);
      if (!reduceMotion) {
        dust(ctx, sc, s, dust_motes, time, REAR_TYRES, fade);
        streaks(ctx, sc, s, wind, time, 300, 420, 120, fade);
      }

      // The rig in light: dim until the scan beam has passed over it, white
      // hot right behind the beam.
      sc.lit = function (x) { return 0.5 + 0.5 * clamp01((beamX - x) / 40) * out; };
      sc.hot = phase < SWEEP ? function (x) { var d = beamX - x; return d < 0 || d > 90 ? 0 : 1 - d / 90; } : null;
      rig3d(ctx, sc, s, { time: time, moving: !reduceMotion, type: "goodsVehicle", trailer: true, lamps: true, ci: CI });
      ctx.globalCompositeOperation = "lighter";
      sc.flush(s, 1.4);
      ctx.globalCompositeOperation = "source-over";

      // The scan beam: a sheet of light across the road, moving down the rig.
      sc.body();
      if (phase < SWEEP) {
        ctx.beginPath();
        sc.pt(beamX, 14, -95); ctx.moveTo(sc.X, sc.Y);
        sc.pt(beamX, -180, -95); ctx.lineTo(sc.X, sc.Y);
        sc.pt(beamX, -180, 95); ctx.lineTo(sc.X, sc.Y);
        sc.pt(beamX, 14, 95); ctx.lineTo(sc.X, sc.Y);
        ctx.closePath();
        ctx.fillStyle = "rgba(76, 201, 255, 0.1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(220, 245, 255, 0.9)";
        ctx.lineWidth = 1.4 / s;
        ctx.shadowColor = "rgba(76, 201, 255, 1)"; ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Tags: each appears as the beam passes, then fades before the next sweep.
      if (labels) {
        ctx.font = "600 " + (10.5 / s) + "px Inter, system-ui, sans-serif";
        if ("letterSpacing" in ctx) ctx.letterSpacing = (1.6 / s) + "px";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        TAGS.forEach(function (tag, i) {
          var a = clamp01((beamX - tag.x) / 50) * out;
          if (a <= 0) return;
          sc.pt(tag.x, tag.y, TAG_Z[i]);
          var px = sc.X, py = sc.Y;
          var top = tag.row ? -218 : -192;
          ctx.globalAlpha = fade * a;
          // leader: a dashed line down to the point, with an arrowhead
          ctx.strokeStyle = "rgba(76, 201, 255, 0.8)";
          ctx.lineWidth = 1 / s;
          ctx.setLineDash([3 / s, 3 / s]);
          ctx.beginPath(); ctx.moveTo(px, top + 14); ctx.lineTo(px, py - 6); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(76, 201, 255, 0.95)";
          ctx.beginPath(); ctx.moveTo(px - 4, py - 10); ctx.lineTo(px + 4, py - 10); ctx.lineTo(px, py - 3); ctx.closePath(); ctx.fill();
          // a ring that pulses on the point
          var ring = (time * 1.4 + tag.x / 200) % 1;
          ctx.strokeStyle = "rgba(160, 230, 255, " + (1 - ring) * 0.8 + ")";
          ctx.beginPath(); ctx.arc(px, py, 3 + ring * 9, 0, Math.PI * 2); ctx.stroke();
          // the label and a small meter that fills
          ctx.fillStyle = "rgba(225, 242, 255, 0.95)";
          ctx.shadowColor = "rgba(76, 201, 255, 0.9)"; ctx.shadowBlur = 8;
          ctx.fillText(tag.label, px, top);
          ctx.shadowBlur = 0;
          var mw = 54, fill = tag.fill * Math.min(1, (beamX - tag.x) / 140);
          ctx.fillStyle = "rgba(76, 201, 255, 0.18)";
          ctx.fillRect(px - mw / 2, top + 4, mw, 3);
          ctx.fillStyle = "rgba(76, 201, 255, 0.95)";
          ctx.fillRect(px - mw / 2, top + 4, mw * fill, 3);
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
    var canvas = null, ctx = null, sc = null, data = null, shown = {};
    var LIVE_CI = { vehicle: 0, towball: 1, trailer: 2, front: 3, rear: 4, trailerAxles: 5 };
    var REAR_TYRES = [[232, -49], [232, 49], [500, -57], [500, 57]];
    var motes = makeMotes(24), wind = makeMotes(10);
    var w = 0, h = 0, s = 1, running = false, visible = false, raf = 0, last = 0;

    function setUp() {
      canvas = document.createElement("canvas");
      canvas.className = "rig-live";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Side view of the rig with the mass on each axle, the tow ball, the vehicle, the trailer and the whole rig, coloured by how close each is to its limit. The same figures are in the table below.");
      ctx = canvas.getContext("2d");
      sc = Scene(ctx);
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

      // The camera sits a little ahead of the rig and above it, and sways
      // gently, so the rig has depth but every figure stays over its part.
      var mt = reduceMotion ? 0 : time;
      sc.camera(centre, -0.17 + (reduceMotion ? 0 : 0.05 * Math.sin(time * 0.45)), 0.14);
      floor(ctx, sc, s, centre, SW / 2, 120, mt * 140);
      if (!reduceMotion) {
        dust(ctx, sc, s, motes, time, trailer ? REAR_TYRES : REAR_TYRES.slice(0, 2), 1);
        streaks(ctx, sc, s, wind, time, centre, SW / 2, 110, 1);
      }

      // The rig, each part in its own colour.
      sc.palette = [part("vehicle"), part("towball"), part("trailer"), part("front"), part("rear"), part("trailerAxles")];
      rig3d(ctx, sc, s, { time: mt, moving: !reduceMotion, type: type, trailer: trailer, lamps: !trailer, ci: LIVE_CI });
      ctx.globalCompositeOperation = "lighter";
      sc.flush(s, 1.6);
      ctx.globalCompositeOperation = "source-over";
      sc.body();

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
          sc.pt(it.x, it.to, 0);
          var ax = sc.X, ay = sc.Y;
          ctx.beginPath(); ctx.moveTo(it.x, topMeter + 10 / s); ctx.lineTo(ax, ay - 10); ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
          ctx.fillStyle = rgba(c, 0.95);
          ctx.beginPath(); ctx.moveTo(ax - 5, ay - 12); ctx.lineTo(ax + 5, ay - 12); ctx.lineTo(ax, ay - 3); ctx.closePath(); ctx.fill();
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
