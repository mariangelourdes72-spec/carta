/* =====================================================================
   Ilustraciones cenitales automáticas (SVG) — se usan cuando el
   producto no tiene "foto" en carta.js. Estilo: mesa vista desde arriba,
   luz dura (sombras duras desplazadas), colores editoriales.
   ===================================================================== */
(function () {
  var uid = 0;

  function rng(seed) {
    var h = 2166136261;
    for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var MESAS = ["var(--t1)", "var(--t2)", "var(--t3)", "var(--t4)", "var(--t5)", "var(--t6)", "var(--t7)"]; // colores de fondo: ver css/styles.css
  var C = {
    crema: "#F7F1E6", cafe: "#6B3E26", cafeOsc: "#3E2215", espuma: "#E9D3B6",
    pan: "#D59A55", panIn: "#F1D3A2", palta: "#9BC15A", paltaOsc: "#5E8A2E",
    huevo: "#F7CF4A", tomate: "#E2412F", salmon: "#F28C6B", verde: "#6FAE45",
    verdeOsc: "#3F7D2B", blanco: "#FFFFFF", plato: "#FBFAF6", borde: "#E4DED2",
    chocolate: "#4A2A1A", dorado: "#E3A646", rojo: "#C8102E", matcha: "#9DBF5A",
    limon: "#F4E04D", naranja: "#F39A2C", vino: "#7A1330", azul: "#2F6DB5"
  };

  function g(content, extra) { return '<g' + (extra ? " " + extra : "") + ">" + content + "</g>"; }
  function circle(cx, cy, r, fill, extra) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra ? " " + extra : "") + "/>";
  }
  function ellipse(cx, cy, rx, ry, fill, rot, extra) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '"' +
      (rot ? ' transform="rotate(' + rot + " " + cx + " " + cy + ')"' : "") + (extra ? " " + extra : "") + "/>";
  }
  function rect(x, y, w, h, r, fill, rot, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + r + '" fill="' + fill + '"' +
      (rot ? ' transform="rotate(' + rot + " " + (x + w / 2) + " " + (y + h / 2) + ')"' : "") + (extra ? " " + extra : "") + "/>";
  }
  function path(d, fill, extra) { return '<path d="' + d + '" fill="' + fill + '"' + (extra ? " " + extra : "") + "/>"; }

  /* ---------- Piezas ---------- */

  function plato(cx, cy, r) {
    return circle(cx, cy, r, C.plato) + circle(cx, cy, r * 0.74, "none", 'stroke="' + C.borde + '" stroke-width="2"');
  }
  function platoBorde(cx, cy, r, color) {
    return circle(cx, cy, r, C.plato) + circle(cx, cy, r - 5, "none", 'stroke="' + color + '" stroke-width="3"') +
      circle(cx, cy, r * 0.74, "none", 'stroke="' + C.borde + '" stroke-width="2"');
  }
  function taza(cx, cy, r, liquido, arte, R) {
    var s = "";
    s += circle(cx, cy, r * 1.55, C.plato) + circle(cx, cy, r * 1.55 - 4, "none", 'stroke="' + C.borde + '" stroke-width="2"');
    s += rect(cx + r * 0.8, cy - r * 0.16, r * 0.62, r * 0.32, r * 0.16, C.blanco);
    s += circle(cx, cy, r, C.blanco);
    s += circle(cx, cy, r * 0.82, liquido);
    if (arte === "corazon") {
      s += path("M" + cx + " " + (cy + r * 0.42) + " C" + (cx - r * 0.7) + " " + (cy - r * 0.05) + " " + (cx - r * 0.35) + " " + (cy - r * 0.55) + " " + cx + " " + (cy - r * 0.18) +
        " C" + (cx + r * 0.35) + " " + (cy - r * 0.55) + " " + (cx + r * 0.7) + " " + (cy - r * 0.05) + " " + cx + " " + (cy + r * 0.42) + "Z", C.espuma);
    } else if (arte === "espuma") {
      s += circle(cx, cy, r * 0.62, C.espuma);
      s += circle(cx - r * 0.15, cy - r * 0.1, r * 0.08, "#C9A57E");
      s += circle(cx + r * 0.2, cy + r * 0.12, r * 0.06, "#C9A57E");
    } else if (arte === "crema") {
      s += circle(cx, cy, r * 0.5, "#B07A4B") + circle(cx, cy, r * 0.25, "#8A5634");
    } else if (arte === "caramelo") {
      s += circle(cx, cy, r * 0.62, C.espuma);
      s += path("M" + (cx - r * 0.5) + " " + (cy - r * 0.3) + " L" + (cx + r * 0.5) + " " + (cy - r * 0.3) + " M" + (cx - r * 0.5) + " " + cy + " L" + (cx + r * 0.5) + " " + cy + " M" + (cx - r * 0.5) + " " + (cy + r * 0.3) + " L" + (cx + r * 0.5) + " " + (cy + r * 0.3), "none", 'stroke="#B8752B" stroke-width="5" stroke-linecap="round"');
    } else if (arte === "chocolate") {
      s += rect(cx - r * 0.45, cy - r * 0.14, r * 0.9, r * 0.28, 4, C.chocolate, -18);
    } else if (arte === "te") {
      s += rect(cx + r * 1.0, cy + r * 0.7, r * 0.5, r * 0.6, 3, "#F0EBDD", 20);
      s += path("M" + cx + " " + cy + " L" + (cx + r * 1.2) + " " + (cy + r * 0.9), "none", 'stroke="#DDD3BE" stroke-width="2"');
    }
    s += rect(cx - r * 1.45, cy + r * 0.9, r * 0.9, r * 0.16, r * 0.08, "#C9C3B6", -35); // cucharita
    return s;
  }
  function vaso(cx, cy, r, liquido, tipo) {
    var s = circle(cx, cy, r, "rgba(255,255,255,.55)", 'stroke="rgba(255,255,255,.9)" stroke-width="4"');
    s += circle(cx, cy, r * 0.84, liquido, 'opacity=".92"');
    if (tipo === "hielo" || tipo === "limon") {
      s += rect(cx - r * 0.5, cy - r * 0.45, r * 0.42, r * 0.42, 6, "rgba(255,255,255,.55)", 18);
      s += rect(cx + r * 0.05, cy - r * 0.1, r * 0.4, r * 0.4, 6, "rgba(255,255,255,.5)", -12);
    }
    if (tipo === "limon") {
      s += circle(cx - r * 0.1, cy + r * 0.35, r * 0.34, C.limon) + circle(cx - r * 0.1, cy + r * 0.35, r * 0.27, "#FBF0A0");
      s += ellipse(cx + r * 0.35, cy - r * 0.45, r * 0.18, r * 0.09, C.verde, 30);
    }
    if (tipo === "naranja") {
      s += circle(cx + r * 0.3, cy - r * 0.3, r * 0.3, C.naranja) + circle(cx + r * 0.3, cy - r * 0.3, r * 0.23, "#FBC56B");
    }
    if (tipo === "batido") {
      s += circle(cx, cy, r * 0.6, "rgba(255,255,255,.45)");
      s += circle(cx - r * 0.2, cy - r * 0.15, r * 0.12, "#E35D7A") + circle(cx + r * 0.2, cy + r * 0.12, r * 0.1, "#E35D7A");
    }
    s += circle(cx + r * 0.25, cy - r * 0.2, r * 0.08, "#fff") + rect(cx + r * 0.2, cy - r * 0.25, r * 1.3, r * 0.1, r * 0.05, "#fff", -40, 'opacity=".9"');
    return s;
  }
  function copa(cx, cy, r, liquido) {
    return circle(cx, cy, r, "rgba(255,255,255,.5)", 'stroke="rgba(255,255,255,.95)" stroke-width="3"') +
      circle(cx, cy, r * 0.7, liquido) + circle(cx - r * 0.2, cy - r * 0.2, r * 0.12, "rgba(255,255,255,.4)");
  }
  function botella(cx, cy, largo, ancho, color, etiqueta, rot) {
    var s = "";
    s += rect(cx - largo / 2, cy - ancho / 2, largo * 0.7, ancho, ancho / 2.4, color);
    s += rect(cx - largo / 2 + largo * 0.62, cy - ancho * 0.22, largo * 0.36, ancho * 0.44, ancho * 0.2, color);
    s += rect(cx - largo / 2 + largo * 0.95, cy - ancho * 0.26, largo * 0.07, ancho * 0.52, 3, etiqueta === "corona" ? "#F0C24A" : "#2A2A2A");
    s += rect(cx - largo / 2 + largo * 0.15, cy - ancho / 2, largo * 0.3, ancho, 0, etiqueta === "corona" ? "#F8F4E8" : "#EFE6D2");
    s += rect(cx - largo / 2 + largo * 0.05, cy - ancho * 0.35, largo * 0.55, ancho * 0.1, 4, "rgba(255,255,255,.35)");
    return g(s, 'transform="rotate(' + (rot || 0) + " " + cx + " " + cy + ')"');
  }
  function lata(cx, cy, l, a, color, rot) {
    var s = rect(cx - l / 2, cy - a / 2, l, a, 10, color);
    s += rect(cx - l / 2 + 8, cy - a / 2, 8, a, 0, "#C9CDD3") + rect(cx + l / 2 - 16, cy - a / 2, 8, a, 0, "#C9CDD3");
    s += path("M" + (cx - 20) + " " + (cy + 6) + " L" + (cx - 4) + " " + (cy - 14) + " L" + (cx - 2) + " " + (cy + 2) + " L" + (cx + 16) + " " + (cy - 10) + " L" + cx + " " + (cy + 14) + " L" + (cx - 2) + " " + (cy) + "Z", "#F4E04D");
    s += rect(cx - l / 2 + 22, cy - a * 0.3, l * 0.7, a * 0.08, 3, "rgba(255,255,255,.35)");
    return g(s, 'transform="rotate(' + (rot || 0) + " " + cx + " " + cy + ')"');
  }
  function tostada(cx, cy, w, h, rot, toppings, r) {
    var s = rect(cx - w / 2, cy - h / 2, w, h, 26, C.pan) + rect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20, 20, C.panIn);
    var t = "";
    toppings.forEach(function (tp) {
      for (var i = 0; i < (tp.n || 6); i++) {
        var x = cx - w / 2 + 24 + r() * (w - 48), y = cy - h / 2 + 24 + r() * (h - 48);
        if (tp.k === "palta") t += ellipse(x, y, 22, 9, C.palta, r() * 180, 'stroke="' + C.paltaOsc + '" stroke-width="3"');
        else if (tp.k === "huevo") t += ellipse(x, y, 16 + r() * 8, 11 + r() * 6, C.huevo, r() * 180);
        else if (tp.k === "tomate") t += ellipse(x, y, 9, 6, "#B5332A", r() * 180);
        else if (tp.k === "salmon") t += path("M" + (x - 22) + " " + y + " q11 -14 22 0 t22 0 q-11 12 -22 0 t-22 0Z", C.salmon, 'stroke="#FAD0C0" stroke-width="2"');
        else if (tp.k === "pepino") t += circle(x, y, 11, "#BFDB8E", 'stroke="#4F7F2B" stroke-width="3"');
        else if (tp.k === "rucula") t += ellipse(x, y, 16, 6, C.verdeOsc, r() * 180);
        else if (tp.k === "semillas") t += ellipse(x, y, 2.5, 1.5, "#3B2A1F", r() * 180);
        else if (tp.k === "crema") t += ellipse(x, y, 26, 18, "#FFFDF6", r() * 180);
        else if (tp.k === "pollo") t += rect(x - 16, y - 8, 32, 16, 6, "#E8C08A", r() * 180, 'stroke="#B27A3E" stroke-width="2"');
        else if (tp.k === "berenjena") t += ellipse(x, y, 16, 10, "#5B2C5E", r() * 180);
        else if (tp.k === "cherry") t += circle(x, y, 8, C.tomate);
        else if (tp.k === "jamon") t += ellipse(x, y, 30, 20, "#F2A7A3", r() * 180, 'opacity=".9"');
        else if (tp.k === "queso") t += rect(x - 20, y - 20, 40, 40, 4, "#F8D96B", r() * 90, 'opacity=".95"');
        else if (tp.k === "frutos") t += circle(x, y, 7, ["#B8173A", "#5A2A6E", "#E2412F"][i % 3]);
        else if (tp.k === "granola") t += rect(x - 4, y - 3, 8, 6, 2, "#C08A4A", r() * 90);
        else if (tp.k === "nuez") t += ellipse(x, y, 6, 4, "#9C6B3E", r() * 180);
      }
    });
    return g(s + t, 'transform="rotate(' + (rot || 0) + " " + cx + " " + cy + ')"');
  }
  function medialuna(cx, cy, s, rot) {
    var d = "M" + (cx - 60 * s) + " " + (cy + 18 * s) + " C" + (cx - 70 * s) + " " + (cy - 40 * s) + " " + (cx + 70 * s) + " " + (cy - 40 * s) + " " + (cx + 60 * s) + " " + (cy + 18 * s) +
      " C" + (cx + 40 * s) + " " + (cy - 4 * s) + " " + (cx - 40 * s) + " " + (cy - 4 * s) + " " + (cx - 60 * s) + " " + (cy + 18 * s) + "Z";
    var out = path(d, C.dorado, 'stroke="#B8752B" stroke-width="2"');
    for (var i = -2; i <= 2; i++) out += path("M" + (cx + i * 18 * s) + " " + (cy - 22 * s) + " q" + (4 * s) + " " + (14 * s) + " " + (i * 3 * s) + " " + (24 * s), "none", 'stroke="#B8752B" stroke-width="2.5" stroke-linecap="round"');
    out += path(d, "rgba(255,255,255,.18)", 'transform="translate(0,-4)"');
    return g(out, 'transform="rotate(' + (rot || 0) + " " + cx + " " + cy + ')"');
  }
  function bolitas(cx, cy, n, rad, color, r) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + r(), d = rad * (0.4 + r() * 0.55);
      var x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      s += circle(x, y, 22, color, 'stroke="#B8752B" stroke-width="2"') + circle(x - 6, y - 6, 7, "rgba(255,255,255,.35)");
    }
    return s;
  }
  function galletas(cx, cy, n, color, chip, r) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var x = cx + (r() - 0.5) * 170, y = cy + (r() - 0.5) * 150;
      s += circle(x, y, 38, color, 'stroke="rgba(0,0,0,.08)" stroke-width="3"');
      for (var j = 0; j < 6; j++) s += ellipse(x + (r() - 0.5) * 50, y + (r() - 0.5) * 50, 5, 4, chip, r() * 180);
    }
    return s;
  }
  function bowl(cx, cy, r, colorBowl, relleno) {
    return circle(cx, cy, r, colorBowl) + circle(cx, cy, r * 0.84, relleno);
  }
  function hojas(cx, cy, rad, n, r) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var a = r() * Math.PI * 2, d = r() * rad;
      s += ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 26, 13, i % 3 ? C.verde : C.verdeOsc, r() * 180);
    }
    return s;
  }
  function cubiertos(x, y, rot) {
    var s = rect(x, y, 10, 150, 5, "#BFC3C7") + rect(x + 26, y, 10, 150, 5, "#BFC3C7") + rect(x + 22, y, 18, 50, 9, "#D3D6D9");
    s += path("M" + (x - 4) + " " + y + " h18 v30 h-18z", "#D3D6D9");
    return g(s, 'transform="rotate(' + rot + " " + (x + 18) + " " + (y + 75) + ')"');
  }
  function servilleta(x, y, rot, color) {
    return rect(x, y, 110, 110, 6, color || "#FFFFFF", rot, 'opacity=".95"') +
      path("M" + (x + 10) + " " + (y + 55) + " h90", "none", 'stroke="rgba(0,0,0,.06)" stroke-width="2" transform="rotate(' + rot + " " + (x + 55) + " " + (y + 55) + ')"');
  }
  function salsera(cx, cy, r, color) { return circle(cx, cy, r, C.plato) + circle(cx, cy, r * 0.72, color); }

  /* ---------- Escenas por producto ---------- */

  function escena(p, r) {
    var id = p.id, s = "", props = "";
    var cx = 200, cy = 200;

    // Props de mesa (servilletas / cubiertos / salseras)
    if (r() > 0.45) props += servilleta(20 + r() * 40, 250 + r() * 60, r() * 40 - 20, r() > 0.5 ? "#FFFFFF" : "#F7E9D7");
    if (r() > 0.55) props += salsera(330 + r() * 30, 50 + r() * 40, 26, ["#F4E04D", "#C8102E", "#E9D3B6", "#7A9E3B"][Math.floor(r() * 4)]);

    switch (true) {
      /* Cafetería */
      case id === "americano": s = taza(cx, cy, 70, C.cafeOsc, "crema", r); break;
      case id === "expresso": s = taza(cx, cy, 48, C.cafeOsc, "crema", r); break;
      case id === "expresso-doble": s = taza(cx - 70, cy - 30, 44, C.cafeOsc, "crema", r) + taza(cx + 80, cy + 60, 44, C.cafeOsc, "crema", r); break;
      case id === "capuchino": s = taza(cx, cy, 72, C.cafe, "espuma", r); break;
      case id === "cortado": s = taza(cx, cy, 52, C.cafe, "corazon", r); break;
      case id === "latte" || id === "flat-white": s = taza(cx, cy, 74, "#9A6440", "corazon", r); break;
      case id === "caramel-machiatto": s = taza(cx, cy, 74, "#A8743F", "caramelo", r); break;
      case id === "cafe-frappe": s = vaso(cx, cy, 82, "#C49A72", "hielo"); break;
      case id === "matcha-latte": s = taza(cx, cy, 74, C.matcha, "corazon", r); break;
      case id === "submarino": s = taza(cx, cy, 74, "#F3E6D0", "chocolate", r); break;
      case id === "te": s = taza(cx, cy, 68, "#B5651D", "te", r); break;

      /* Desayunos */
      case id === "toston-clasico":
        s = plato(cx, cy, 165) + tostada(cx, cy, 250, 160, -12, [{ k: "crema", n: 3 }, { k: "huevo", n: 6 }, { k: "palta", n: 5 }, { k: "tomate", n: 6 }], r); break;
      case id === "toston-casa-1":
        s = plato(cx, cy, 165) + tostada(cx, cy, 250, 160, 10, [{ k: "crema", n: 3 }, { k: "rucula", n: 6 }, { k: "pepino", n: 5 }, { k: "salmon", n: 4 }, { k: "semillas", n: 30 }], r); break;
      case id === "toston-casa-2":
        s = plato(cx, cy, 165) + tostada(cx, cy, 250, 160, -6, [{ k: "crema", n: 2 }, { k: "berenjena", n: 4 }, { k: "pollo", n: 5 }, { k: "cherry", n: 6 }, { k: "semillas", n: 24 }], r); break;
      case id === "sandwich-caliente" || id === "sandwich-pan-nuez":
        s = plato(cx, cy, 160) + tostada(cx - 30, cy - 10, 170, 150, -20, [{ k: "jamon", n: 2 }, { k: "queso", n: 2 }].concat(id === "sandwich-pan-nuez" ? [{ k: "nuez", n: 10 }] : []), r) +
          tostada(cx + 50, cy + 40, 170, 150, 15, id === "sandwich-pan-nuez" ? [{ k: "nuez", n: 10 }] : [], r); break;
      case id === "medialuna-clasica": s = plato(cx, cy, 130) + medialuna(cx, cy, 1.4, -15); break;
      case id === "medialuna-rellena": s = plato(cx, cy, 130) + medialuna(cx, cy, 1.4, 10) + ellipse(cx, cy + 4, 34, 8, "#F3D9A4"); break;
      case id === "chipa" || id === "chipa-relleno": s = bowl(cx, cy, 140, "#E7DCCB", "#F6EFE2") + bolitas(cx, cy, 7, 90, "#EBC478", r); break;
      case id === "panqueque-avena":
        s = plato(cx, cy, 160) + circle(cx, cy, 100, "#C9874A") + circle(cx, cy, 92, "#D9A061") + circle(cx + 6, cy - 6, 80, "#E1AE6E");
        for (var b = 0; b < 7; b++) s += circle(cx + Math.cos(b) * 50, cy + Math.sin(b) * 50, 15, "#F7E7A6", 'stroke="#E3CB72" stroke-width="2"');
        break;
      case id === "french-toast":
        s = plato(cx, cy, 165) + tostada(cx - 20, cy - 20, 160, 140, -15, [{ k: "frutos", n: 8 }, { k: "granola", n: 12 }], r) +
          tostada(cx + 40, cy + 40, 160, 140, 20, [{ k: "frutos", n: 6 }], r) + path("M120 140 q80 40 160 10", "none", 'stroke="#B8173A" stroke-width="10" stroke-linecap="round" opacity=".8"'); break;
      case id === "yogurt-granola":
        s = bowl(cx, cy, 140, "#2F6DB5", "#FFFDF6");
        for (var k = 0; k < 30; k++) s += rect(cx - 60 + r() * 120, cy - 60 + r() * 120, 10, 8, 2, "#C08A4A", r() * 90);
        for (var k2 = 0; k2 < 8; k2++) s += circle(cx - 60 + r() * 120, cy - 60 + r() * 120, 9, ["#B8173A", "#5A2A6E"][k2 % 2]);
        break;
      case id === "alfajores":
        s = plato(cx, cy, 160);
        [[-50, -40], [55, -20], [-10, 60]].forEach(function (o) { s += circle(cx + o[0], cy + o[1], 52, "#E7C79A", 'stroke="#C9A06A" stroke-width="5"') + circle(cx + o[0], cy + o[1], 40, "#EED4AD"); });
        break;
      case id === "cookies": s = plato(cx, cy, 165) + galletas(cx, cy, 4, "#D9A86A", "#5B3A22", r); break;
      case id === "cookies-pistacho": s = plato(cx, cy, 165) + galletas(cx, cy, 4, "#D8C08A", "#8DB255", r); break;
      case id === "barritas-proteicas":
        s = servilleta(110, 100, 8, "#FFFFFF") + servilleta(170, 170, -14, "#FFFFFF");
        [[150, 150, -15], [230, 230, 20]].forEach(function (o) { s += rect(o[0] - 80, o[1] - 26, 160, 52, 14, "#B98A5A", o[2]); for (var n = 0; n < 8; n++) s += ellipse(o[0] - 60 + n * 16, o[1] + (r() - .5) * 20, 6, 4, "#7A4E2A", r() * 180); });
        break;
      case id === "merienda-para-dos":
        s = rect(30, 40, 340, 320, 28, "#E9DFCF") + taza(110, 110, 34, "#9A6440", "corazon", r) + taza(290, 300, 34, C.cafe, "espuma", r) +
          vaso(290, 110, 36, C.naranja, "naranja") + vaso(110, 300, 36, "#F39A2C", "") +
          tostada(200, 205, 110, 70, -10, [{ k: "palta", n: 3 }, { k: "huevo", n: 3 }], r) + circle(200, 300, 22, "#D9A061") + circle(200, 110, 20, "#E7C79A");
        break;

      /* Entradas */
      case id === "tartar-salmon":
        s = platoBorde(cx, cy, 160, "#2F6DB5") + circle(cx, cy, 70, "#1F3B23") + circle(cx, cy, 60, C.salmon);
        for (var t = 0; t < 14; t++) s += circle(cx + (r() - .5) * 90, cy + (r() - .5) * 90, 5, "#F9B59A");
        for (var t2 = 0; t2 < 9; t2++) s += circle(cx + Math.cos(t2 * 0.7) * 115, cy + Math.sin(t2 * 0.7) * 115, 9, "#F4B740");
        s += ellipse(cx + 40, cy - 40, 18, 7, "#D07AB0", 30);
        break;
      case id === "sopa-estacion": s = platoBorde(cx, cy, 160, "#C8102E") + bowl(cx, cy, 110, "#F1EEE6", "#E8873A") + circle(cx - 20, cy - 10, 24, "#FFF4E0", 'opacity=".8"') + hojas(cx + 30, cy + 20, 20, 4, r); break;
      case id === "croquetitas":
        s = platoBorde(cx, cy, 160, "#2F6DB5");
        for (var q = 0; q < 6; q++) s += ellipse(cx + Math.cos(q) * 70, cy + Math.sin(q) * 70, 36, 22, "#D99A3E", q * 40, 'stroke="#A9661F" stroke-width="3"');
        s += salsera(cx, cy, 30, "#F4E04D");
        break;
      case id === "berenjenas-rellenas":
        s = plato(cx, cy, 165);
        for (var e = 0; e < 4; e++) s += circle(cx + Math.cos(e * 1.57 + .4) * 70, cy + Math.sin(e * 1.57 + .4) * 70, 44, "#D49340", 'stroke="#8A4B1F" stroke-width="4"') + circle(cx + Math.cos(e * 1.57 + .4) * 70, cy + Math.sin(e * 1.57 + .4) * 70, 20, C.tomate);
        s += path("M110 200 q90 -50 180 0", "none", 'stroke="#4A2A1A" stroke-width="7" stroke-linecap="round"');
        break;
      case id === "provolone":
        s = circle(cx, cy, 130, "#2B2B2B") + rect(cx + 110, cy - 15, 90, 30, 10, "#2B2B2B") + circle(cx, cy, 98, "#F3B74A") + circle(cx - 20, cy - 20, 30, "#F8D27A");
        for (var o = 0; o < 12; o++) s += ellipse(cx + (r() - .5) * 140, cy + (r() - .5) * 140, 6, 3, C.verdeOsc, r() * 180);
        break;

      /* Cocina */
      case id === "salmon-almendrado":
        s = plato(cx, cy, 165) + hojas(cx - 40, cy + 50, 50, 10, r) + ellipse(cx - 40, cy + 50, 60, 40, "rgba(255,255,240,.6)") + rect(cx - 30, cy - 90, 140, 90, 22, C.salmon, -15);
        for (var a = 0; a < 18; a++) s += ellipse(cx + 40 + (r() - .5) * 110, cy - 45 + (r() - .5) * 60, 7, 3, "#F2E1C2", r() * 180);
        break;
      case id === "suprema-grille" || id === "carnes-braseadas" || id === "ternera-macerada":
        s = plato(cx, cy, 165);
        var col = id === "suprema-grille" ? "#E3B67C" : id === "ternera-macerada" ? "#8A4A2E" : "#6E3420";
        s += ellipse(cx - 30, cy - 20, 85, 55, col, -20);
        for (var gl = -3; gl <= 3; gl++) s += path("M" + (cx - 90 + gl * 22) + " " + (cy - 70) + " l60 90", "none", 'stroke="rgba(60,30,10,.35)" stroke-width="5"');
        s += id === "ternera-macerada" ? bolitas(cx + 70, cy + 80, 6, 50, "#E8A35A", r) : hojas(cx + 70, cy + 80, 40, 8, r);
        break;
      case id === "lasana-sin-gluten" || id === "canelones-sin-gluten":
        s = rect(70, 90, 260, 220, 30, "#C94F2C") + rect(84, 104, 232, 192, 20, "#E8873A");
        if (id === "canelones-sin-gluten") for (var cn = 0; cn < 4; cn++) s += rect(100, 116 + cn * 44, 200, 36, 18, "#F3D6A0");
        for (var ls = 0; ls < 16; ls++) s += ellipse(110 + r() * 180, 120 + r() * 160, 16, 10, "#F6D88A", r() * 180, 'opacity=".9"');
        for (var lb = 0; lb < 10; lb++) s += circle(110 + r() * 180, 120 + r() * 160, 5, "#A33A1F");
        break;
      case id === "milanesa" || id === "milanesa-casa":
        s = plato(cx, cy, 165) + path("M90 180 C90 110 220 90 280 130 C330 165 300 260 220 270 C140 280 90 240 90 180Z", "#D99A3E", 'stroke="#A9661F" stroke-width="5"');
        for (var mi = 0; mi < 30; mi++) s += circle(110 + r() * 180, 120 + r() * 140, 3, "#B97A2C");
        if (id === "milanesa-casa") s += ellipse(180, 170, 50, 30, "#EADFC8") + ellipse(230, 210, 40, 22, "#7A3B2A") + bolitas(200, 190, 4, 40, "#9C6B3E", r);
        else s += circle(290, 270, 26, C.limon) + circle(290, 270, 20, "#FBF0A0");
        break;
      case id === "hamburguesa-casera":
        s = plato(cx, cy, 165) + circle(cx - 20, cy - 10, 95, "#D18A3A") + circle(cx - 20, cy - 10, 85, "#E09B48");
        for (var hs = 0; hs < 20; hs++) s += ellipse(cx - 20 + (r() - .5) * 130, cy - 10 + (r() - .5) * 130, 4, 2, "#FFF6DD", r() * 180);
        s += ellipse(cx - 20, cy + 76, 80, 12, C.verde);
        for (var pf = 0; pf < 8; pf++) s += rect(cx + 70 + r() * 40, cy + 40 + r() * 60, 12, 60, 4, "#F2C14E", r() * 180);
        break;
      case id === "wraps-sin-gluten":
        s = plato(cx, cy, 165);
        [[-40, -10, -30], [40, 30, -30]].forEach(function (o) { s += rect(cx + o[0] - 90, cy + o[1] - 32, 180, 64, 32, "#EFD6A6", o[2], 'stroke="#C9A06A" stroke-width="3"') + ellipse(cx + o[0] + 70, cy + o[1] - 40, 22, 26, C.verde, o[2]); });
        break;
      case id === "ensalada-pollo" || id === "ensalada-casa" || id === "ensalada-casa-veggie":
        s = bowl(cx, cy, 160, id === "ensalada-casa" ? "#F3C9C3" : "#E7DCCB", "#F7F4EC") + hojas(cx, cy, 110, 22, r);
        if (id === "ensalada-pollo") { for (var p1 = 0; p1 < 6; p1++) s += rect(cx - 70 + r() * 140, cy - 70 + r() * 140, 34, 20, 6, "#C9874A", r() * 180); for (var p2 = 0; p2 < 6; p2++) s += circle(cx - 80 + r() * 160, cy - 80 + r() * 160, 9, "#2B2B2B"); }
        if (id === "ensalada-casa") { for (var c1 = 0; c1 < 5; c1++) s += path("M" + (cx - 70 + r() * 140) + " " + (cy - 70 + r() * 140) + " q12 -14 24 0 t24 0 q-12 12 -24 0 t-24 0Z", C.salmon); for (var c2 = 0; c2 < 5; c2++) s += circle(cx - 80 + r() * 160, cy - 80 + r() * 160, 10, C.tomate); }
        if (id === "ensalada-casa-veggie") { s += ellipse(cx + 20, cy - 10, 40, 30, "#E9D6A8"); for (var v1 = 0; v1 < 40; v1++) s += circle(cx - 80 + r() * 160, cy - 80 + r() * 160, 2.5, "#F2E6C8"); }
        for (var pa = 0; pa < 4; pa++) s += ellipse(cx - 70 + r() * 140, cy - 70 + r() * 140, 24, 9, C.palta, r() * 180, 'stroke="' + C.paltaOsc + '" stroke-width="3"');
        if (id !== "ensalada-casa") s += circle(cx - 30, cy + 40, 24, "#FFFFFF") + circle(cx - 30, cy + 40, 12, C.huevo);
        break;
      case id === "pasta-del-dia":
        s = platoBorde(cx, cy, 165, "#C8102E") + circle(cx, cy, 95, "#F0C66B");
        for (var pp = 0; pp < 14; pp++) s += path("M" + (cx - 80 + r() * 60) + " " + (cy - 70 + r() * 140) + " q40 -30 80 0 t80 0", "none", 'stroke="#E2AE4C" stroke-width="5" fill="none"');
        s += circle(cx, cy, 40, "#C8412F", 'opacity=".9"') + hojas(cx + 10, cy - 10, 10, 2, r);
        break;

      /* Bebidas */
      case id === "limonada": s = vaso(cx, cy, 90, "#F2EBA0", "limon"); break;
      case id === "jugo-natural": s = vaso(cx, cy, 86, C.naranja, "naranja") + circle(320, 310, 40, C.naranja) + circle(320, 310, 32, "#FBC56B"); break;
      case id === "licuado": s = vaso(cx, cy, 86, "#F08AA8", "batido"); break;
      case id === "batido-proteina": s = vaso(cx, cy, 86, "#C9A27B", "batido"); break;
      case id === "agua-mineral": s = botella(cx, cy, 300, 80, "rgba(160,210,240,.85)", "agua", -30); break;
      case id === "refresco-600": s = botella(cx, cy, 300, 80, "#5B1A12", "refresco", 35); break;
      case id === "refresco-250": s = botella(cx, cy, 220, 64, "#5B1A12", "refresco", -20); break;
      case id === "jugo-cepita": s = rect(cx - 70, cy - 110, 140, 220, 10, C.naranja, 15) + rect(cx - 50, cy - 40, 100, 80, 40, "#FBC56B", 15) + rect(cx + 20, cy - 130, 14, 40, 4, "#FFFFFF", 15); break;
      case id === "energizante": s = lata(cx, cy, 250, 110, "#1B2A6B", -25); break;
      case id === "cerveza-corona": s = botella(cx, cy, 320, 84, "rgba(240,210,120,.9)", "corona", 30) + circle(80, 320, 30, "#9BD13A") + circle(80, 320, 24, "#C6E86F"); break;
      case id === "copa-vino": s = copa(cx, cy, 100, C.vino) + circle(300, 320, 26, "#5A2A6E") + circle(270, 335, 26, "#6B3480"); break;
      case id === "botella-vino": s = botella(cx, cy, 340, 86, "#1E3A24", "vino", -35) + copa(300, 300, 54, C.vino); break;

      default: s = plato(cx, cy, 150);
    }

    // cubiertos al costado de los platos principales
    if (p.categoria === "cocina" && r() > 0.3) props += cubiertos(352, 120, 8);
    return { props: props, main: s };
  }

  function svg(p) {
    var r = rng(p.id);
    var mesa = MESAS[Math.floor(r() * MESAS.length)];
    var id = "hs" + (++uid);
    var sc = escena(p, r);
    return '<svg class="ilu" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + p.nombre.replace(/"/g, "") + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><filter id="' + id + '" x="-20%" y="-20%" width="150%" height="150%">' +
      '<feOffset in="SourceAlpha" dx="12" dy="16" result="o"/><feFlood flood-color="#1c1a2e" flood-opacity=".24"/>' +
      '<feComposite in2="o" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<rect width="400" height="400" style="fill:' + mesa + '"/>' +
      '<g filter="url(#' + id + ')">' + sc.props + "</g>" +
      '<g filter="url(#' + id + ')">' + sc.main + "</g>" +
      "</svg>";
  }

  window.Ilustracion = { svg: svg };
})();
