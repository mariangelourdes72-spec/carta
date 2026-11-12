/* =====================================================================
   El Rinconcito San Nicolás — app
   SPA sin dependencias. Rutas por hash:
     #/                    Inicio
     #/categoria/:id       Categoría (cafeteria, desayunos, ..., todo)
     #/producto/:id        Detalle
     #/pedido              Pedido
     #/favoritos           Favoritos
     #/local               El local
     (cualquier otra)      404
   Mesa por QR: ?mesa=4 (o #/pedido?mesa=4)
   ===================================================================== */
(function () {
  "use strict";

  var CARTA = window.CARTA;
  var LOCAL = CARTA.LOCAL;
  var CATEGORIAS = CARTA.CATEGORIAS;
  var VENTA_CRUZADA = CARTA.VENTA_CRUZADA || {};
  var FILTROS = ["Sin gluten", "Veggie", "Proteico", "Sin azúcar", "Frío", "Para compartir"];

  /* ---------- Normalización de la carta ---------- */
  function normaliza(p) {
    return {
      id: p.id, nombre: p.nombre, descripcion: p.descripcion || "", precio: Number(p.precio) || 0,
      categoria: p.categoria, etiquetas: p.etiquetas || [], alergenos: p.alergenos || [],
      libreDe: p.libreDe || [], ingredientes: p.ingredientes || [],
      disponible: p.disponible !== false, destacado: !!p.destacado, foto: p.foto || "", recorte: p.recorte || "",
      nuevo: !!p.nuevo,
      opciones: (p.opciones || []).map(function (g) {
        return {
          grupo: g.grupo,
          opciones: g.opciones.map(function (o) {
            return typeof o === "string" ? { nombre: o, recargo: 0 } : { nombre: o.nombre, recargo: Number(o.recargo) || 0 };
          })
        };
      })
    };
  }
  var BASE = CARTA.PRODUCTOS;
  var LOCAL_BASE = { whatsapp: LOCAL.whatsapp, whatsappVisible: LOCAL.whatsappVisible, horarios: JSON.parse(JSON.stringify(LOCAL.horarios)) };
  var PRODUCTOS = [];
  var BY_ID = {};
  var AJUSTES = null;   // cambios hechos desde el panel de administración
  var REC = null, REC_HORA = true; // "Lo que recomienda la casa" elegidos desde el panel

  // Aplica los cambios del panel sobre la carta original (carta.js)
  function aplicarAjustes(a) {
    AJUSTES = a && typeof a === "object" ? a : null;
    var cambios = (AJUSTES && AJUSTES.productos) || {};
    var lista = BASE.concat(((AJUSTES && AJUSTES.nuevos) || []).map(function (n) { var c = Object.assign({}, n); c.nuevo = true; return c; }));
    PRODUCTOS.length = 0;
    Object.keys(BY_ID).forEach(function (k) { delete BY_ID[k]; });
    lista.forEach(function (raw) {
      if (!raw || !raw.id || !raw.categoria) return;
      var c = cambios[raw.id] || {};
      if (c.oculto) return;
      var p = normaliza(Object.assign({}, raw, c));
      PRODUCTOS.push(p); BY_ID[p.id] = p;
    });
    REC = AJUSTES && Array.isArray(AJUSTES.recomendados) ? AJUSTES.recomendados.filter(function (id) { return BY_ID[id]; }) : null;
    REC_HORA = !(AJUSTES && AJUSTES.recPorHora === false);
    if (REC) PRODUCTOS.forEach(function (p) { p.destacado = REC.indexOf(p.id) !== -1; });
    var L = (AJUSTES && AJUSTES.local) || {};
    LOCAL.whatsapp = (L.whatsapp || LOCAL_BASE.whatsapp).replace(/\D/g, "");
    LOCAL.whatsappVisible = L.whatsappVisible || LOCAL_BASE.whatsappVisible;
    LOCAL.horarios = L.horarios || JSON.parse(JSON.stringify(LOCAL_BASE.horarios));
    LOCAL.aviso = (AJUSTES && AJUSTES.aviso) || "";
  }
  aplicarAjustes(null);
  var CAT_BY_ID = {};
  CATEGORIAS.forEach(function (c) { CAT_BY_ID[c.id] = c; });

  /* ---------- Orden según la hora del día ---------- */
  var MOMENTOS = CARTA.MOMENTOS || [];
  function momento() {
    if (!MOMENTOS.length) return null;
    var m = ahoraMVD().min;
    for (var i = 0; i < MOMENTOS.length; i++) {
      var a = toMin(MOMENTOS[i].desde), b = toMin(MOMENTOS[i].hasta);
      if (m >= a && m < b) return MOMENTOS[i];
    }
    return MOMENTOS[0];
  }
  function ordenar(lista) {
    var mo = momento();
    if (!mo) return lista;
    var pri = {}, cat = {};
    mo.primero.forEach(function (id, i) { pri[id] = i; });
    mo.categorias.forEach(function (c, i) { cat[c] = i; });
    return lista.map(function (p, i) { return { p: p, i: i }; }).sort(function (x, y) {
      var a = x.p.id in pri ? pri[x.p.id] : 999, b = y.p.id in pri ? pri[y.p.id] : 999;
      if (a !== b) return a - b;
      var ca = x.p.categoria in cat ? cat[x.p.categoria] : 99, cb = y.p.categoria in cat ? cat[y.p.categoria] : 99;
      if (ca !== cb) return ca - cb;
      if (x.p.disponible !== y.p.disponible) return x.p.disponible ? -1 : 1;
      return x.i - y.i;
    }).map(function (x) { return x.p; });
  }
  // Las pestañas mantienen siempre el mismo orden (no saltan según la hora)
  function catsOrdenadas() { return [{ id: "todo", nombre: "Todo" }].concat(CATEGORIAS); }
  function deCat(cat) { return ordenar(cat === "todo" ? PRODUCTOS : PRODUCTOS.filter(function (p) { return p.categoria === cat; })); }
  function es18(p) { return p.etiquetas.indexOf("+18") !== -1; }

  /* ---------- Utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function fmt(n) { return "$ " + miles(n); }
  function norm(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } }
  function hashOf(i) { var h = 0; for (var k = 0; k < i.length; k++) h = (h * 31 + i.charCodeAt(k)) | 0; return Math.abs(h); }

  /* ---------- Íconos (línea fina) ---------- */
  var I = {
    cart: '<path d="M3 4h2.2l2.3 10.3a1.2 1.2 0 0 0 1.2.9h8.9a1.2 1.2 0 0 0 1.2-.9L20.5 7.5H6"/><path d="M9 11h8"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>',
    search: '<circle cx="11" cy="11" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
    arrow: '<path d="M4.5 12h15M13.5 6l6 6-6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4.5h6V7"/>',
    heart: '<path class="f" d="M12 20s-7.2-4.5-9.1-9.2A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 9.1 4.2C19.2 15.5 12 20 12 20Z"/>',
    home: '<path class="f" d="M4 10.4 12 4l8 6.4V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    bag: '<path class="f" d="M5 8.5h14l-1.1 11a1 1 0 0 1-1 .9H7.1a1 1 0 0 1-1-.9z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
    store: '<path class="f" d="M5 10.5V20h14v-9.5"/><path d="M3.5 10.5 5.2 4h13.6l1.7 6.5z"/><path d="M10 20v-5h4v5"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.4a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.6" r="2.4"/>',
    whatsapp: '<path d="M4.2 19.8 5.4 16A8.2 8.2 0 1 1 8.1 18.7z"/><path d="M9.2 8.4c-.3 3 3 6.5 6.4 6.4l.9-1.4-1.9-1-.9.8a4.7 4.7 0 0 1-2.4-2.4l.8-.9-1-1.9z"/>',
    instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".4"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.2l2.8 1.8"/>',
    moto: '<circle cx="6" cy="17" r="2.6"/><circle cx="18" cy="17" r="2.6"/><path d="M8.6 17h6.8M14 7h2.5l2.7 7.6M6 14.4 8.5 10H13l2 7"/><path d="M3.5 10h5"/>',
    table: '<path d="M3.5 9h17M6 9v11M18 9v11M6 14h12"/><path d="M8 9V6.5a4 4 0 0 1 8 0V9"/>',
    cash: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.4"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    transfer: '<path d="M4 8.5h15l-3.5-3.5M20 15.5H5l3.5 3.5"/>',
    pos: '<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M9 7h6v3H9zM9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01"/>',
    map: '<path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2Z"/><path d="M9 4.5v13M15 6.5v13"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 10h.01M15 10h.01"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z"/><path d="M5 19 13 11"/>'
  };
  function ic(name, cls) { return '<svg class="i' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + I[name] + "</svg>"; }

  /* ---------- Estado ---------- */
  var S = {
    cart: load("rc_cart", []),
    favs: load("rc_favs", []),
    pedido: load("rc_pedido", { modalidad: "", direccion: "", mesa: "", pago: "", nombre: "" })
  };
  // limpiar líneas de productos que ya no existen en la carta
  S.cart = S.cart.filter(function (l) { return BY_ID[l.id]; });
  S.favs = S.favs.filter(function (id) { return BY_ID[id]; });

  var RUTA = location.hash && location.hash.indexOf("#/") === 0 ? location.hash.split("?")[0] : "#/";
  var ui = { homeCat: "todo", q: "", filtros: {}, ready: false, prev: null, det: null, scroll: {}, mesaQR: null, lastRemoved: null, invalid: {} };

  // Mesa por QR (?mesa=4 en la URL o en el hash)
  (function () {
    var m = new URLSearchParams(location.search).get("mesa");
    var hq = location.hash.split("?")[1];
    if (!m && hq) m = new URLSearchParams(hq).get("mesa");
    if (m && /^\w{1,6}$/.test(m)) {
      ui.mesaQR = m;
      S.pedido.modalidad = "mesa";
      S.pedido.mesa = m;
      if (S.pedido.pago === "pos") S.pedido.pago = "";
      save("rc_pedido", S.pedido);
    }
  })();

  function lineKey(id, sel, nota) {
    var ks = Object.keys(sel || {}).sort().map(function (k) { return k + "=" + sel[k]; }).join("&");
    return id + "|" + ks + "|" + (nota || "").trim().toLowerCase();
  }
  function unitPrice(l) {
    var p = BY_ID[l.id], extra = 0;
    p.opciones.forEach(function (g) {
      var elegido = l.sel && l.sel[g.grupo];
      g.opciones.forEach(function (o) { if (o.nombre === elegido) extra += o.recargo; });
    });
    return p.precio + extra;
  }
  function cartCount() { return S.cart.reduce(function (a, l) { return a + l.qty; }, 0); }
  function cartTotal() { return S.cart.reduce(function (a, l) { return a + unitPrice(l) * l.qty; }, 0); }
  function qtyOf(id) { return S.cart.reduce(function (a, l) { return a + (l.id === id ? l.qty : 0); }, 0); }
  function saveCart() { save("rc_cart", S.cart); updateBadges(true); }

  function addLine(id, sel, nota, qty) {
    var key = lineKey(id, sel, nota);
    var found = S.cart.filter(function (l) { return l.key === key; })[0];
    if (found) found.qty += qty;
    else S.cart.push({ key: key, id: id, sel: sel || {}, nota: (nota || "").trim(), qty: qty });
    saveCart();
  }
  function removeOneOf(id) {
    for (var i = S.cart.length - 1; i >= 0; i--) {
      if (S.cart[i].id === id) {
        S.cart[i].qty -= 1;
        if (S.cart[i].qty <= 0) S.cart.splice(i, 1);
        saveCart();
        return;
      }
    }
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(html, ms) {
    var t = $("#toast");
    t.innerHTML = html;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, ms || 2600);
  }

  /* ---------- Modal +18 ---------- */
  function ensureAdult(p) {
    return new Promise(function (resolve) {
      if (!es18(p)) return resolve(true);
      try { if (sessionStorage.getItem("rc_18") === "1") return resolve(true); } catch (e) { /* */ }
      var root = $("#modal-root");
      var prevFocus = document.activeElement;
      root.innerHTML =
        '<div class="modal-backdrop" data-close>' +
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="m18t">' +
        '<div class="seal">+18</div>' +
        '<h2 id="m18t">¿Sos mayor de edad?</h2>' +
        "<p><b>" + esc(p.nombre) + "</b> contiene alcohol. Para agregarlo al pedido tenés que confirmar que tenés 18 años o más. Prohibida su venta a menores de 18 años.</p>" +
        '<div class="actions">' +
        '<button class="cta" data-yes><span class="lbl">Sí, tengo 18 o más</span></button>' +
        '<button class="cta ghost" data-no><span class="lbl">No, volver</span></button>' +
        "</div></div></div>";
      var yes = $("[data-yes]", root);
      yes.focus();
      function close(ok) {
        root.innerHTML = "";
        document.removeEventListener("keydown", onKey);
        if (ok) { try { sessionStorage.setItem("rc_18", "1"); } catch (e) { /* */ } }
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(ok);
      }
      function onKey(e) { if (e.key === "Escape") close(false); }
      document.addEventListener("keydown", onKey);
      root.querySelector(".modal-backdrop").addEventListener("click", function (e) {
        if (e.target.hasAttribute("data-close")) close(false);
        if (e.target.closest("[data-yes]")) close(true);
        if (e.target.closest("[data-no]")) close(false);
      });
    });
  }

  /* ---------- Piezas de UI ---------- */
  // size: "sm" (listados, carrito), "card" (carrusel), "lg" (detalle)
  // fotos subidas desde el panel con Firebase: "fs:<id>" → se guardan en la colección "fotos"
  var FOTOS_FS = {};
  function fotoURL(s) { return s && s.indexOf("fs:") === 0 ? (FOTOS_FS[s.slice(3)] || "") : s; }
  function media(p, size, eager) {
    if (!p.foto) return window.Ilustracion.svg(p);
    var f = fotoURL(p.foto);
    var full = esc(f), sm = esc(f.replace(/^fotos\//, "fotos/sm/").replace(/\.(jpe?g|png)$/i, ".webp"));
    var src = size === "lg" ? full : sm;
    var set = "";
    return '<img src="' + src + '"' + set + ' alt="' + esc(p.nombre) + '"' +
      (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async"' +
      ' onload="this.parentNode.classList.remove(\'loading\')"' +
      ' onerror="if(this.src.indexOf(\'/sm/\')>-1){this.removeAttribute(\'srcset\');this.src=\'' + full + '\'}">';
  }
  function photoCls(p) { return "photo" + (p.foto ? " loading" : ""); }
  // vista previa borrosa instantánea mientras baja la foto
  function lq(p) {
    var key = p.foto && p.foto.replace(/^.*\//, "").replace(/\.[a-z]+$/i, "");
    var d = key && window.LQIP && window.LQIP[key];
    return d ? ' style="background-image:url(' + d + ')"' : "";
  }
  // precargar la foto grande del detalle apenas se toca un producto
  var precargadas = {};
  document.addEventListener("pointerdown", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/producto/"]');
    if (!a) return;
    var p = BY_ID[a.getAttribute("href").split("/")[2]];
    if (p && p.foto && !precargadas[p.id]) { precargadas[p.id] = 1; var im = new Image(); im.src = fotoURL(p.foto); }
  }, { passive: true });

  function cartBtn() {
    var n = cartCount();
    return '<a class="icon-btn" href="#/pedido" aria-label="Ver pedido (' + n + ' productos)">' + ic("cart") +
      '<span class="badge" data-badge' + (n ? "" : " hidden") + ">" + n + "</span></a>";
  }
  // Logo de El Rinconcito (recreado de la carta de mesa del local)
  function logo() {
    return '<a class="brand" href="#/" aria-label="El Rinconcito San Nicolás — inicio">' +
      '<span class="brand-lockup" aria-hidden="true"><span class="brand-name">El Rinconcito</span>' +
      '<span class="brand-script">San Nicolás</span></span></a>';
  }
  // Sello circular completo (pantalla El local y 404)
  function sello(size) {
    var id = "arc" + Math.random().toString(36).slice(2, 7);
    return '<svg class="sello" viewBox="0 0 220 220" width="' + size + '" height="' + size + '" role="img" aria-label="El Rinconcito San Nicolás">' +
      '<defs><path id="' + id + '" d="M38 110 A72 72 0 0 1 182 110"/></defs>' +
      '<circle cx="110" cy="110" r="96" fill="none" stroke="#B3A35F" stroke-width="1.6"/>' +
      '<circle cx="110" cy="110" r="90" fill="none" stroke="#B3A35F" stroke-width=".6"/>' +
      '<text class="sello-arc"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">RESTAURANTE</textPath></text>' +
      '<text class="sello-name" x="110" y="118" text-anchor="middle">EL RINCONCITO</text>' +
      '<text class="sello-script" x="114" y="152" text-anchor="middle">San Nicolás</text>' +
      "</svg>";
  }
  function header(title, opts) {
    opts = opts || {};
    var left = opts.back ? '<button class="icon-btn" data-act="back" aria-label="Volver">' + ic("back") + "</button>" : "<span></span>";
    var right = opts.right != null ? opts.right : cartBtn();
    return '<header class="header">' + left + "<h1>" + esc(title) + "</h1>" + right + "</header>";
  }

  function card(p, i) {
    var off = !p.disponible;
    return '<article class="card' + (off ? " agotado" : "") + '">' +
      '<a class="' + photoCls(p) + '"' + lq(p) + ' href="#/producto/' + p.id + '" tabindex="-1" aria-hidden="true">' + media(p, "card", i < 2) +
      (off ? '<span class="flag">Agotado</span>' : "") + "</a>" +
      (off ? "" : '<button class="round-add add" data-act="quick" data-id="' + p.id + '" aria-label="Agregar ' + esc(p.nombre) + '">' + ic("plus") + "</button>") +
      '<a href="#/producto/' + p.id + '"><h3>' + esc(p.nombre) + '</h3><span class="price card-price">' + fmt(p.precio) + "</span><p>" + esc(p.descripcion) + "</p></a>" +
      "</article>";
  }
  function stepper(p) {
    var n = qtyOf(p.id);
    if (!p.disponible) return '<span class="opts-hint">Agotado</span>';
    return '<div class="stepper" aria-label="Cantidad de ' + esc(p.nombre) + '">' +
      '<button class="icon-btn" data-act="minus" data-id="' + p.id + '" aria-label="Quitar uno"' + (n ? "" : " disabled") + ">" + ic("minus") + "</button>" +
      '<span class="n' + (n ? "" : " zero") + '" aria-live="polite">' + n + "</span>" +
      '<button class="icon-btn" data-act="quick" data-id="' + p.id + '" aria-label="Agregar uno">' + ic("plus") + "</button></div>";
  }
  function row(p) {
    var off = !p.disponible;
    var tags = p.etiquetas.map(function (t) { return '<span class="' + (t === "+18" ? "adult" : "") + '">' + esc(t) + "</span>"; }).join("");
    return '<article class="row' + (off ? " agotado" : "") + '" data-row="' + p.id + '">' +
      '<a class="row-link" href="#/producto/' + p.id + '" aria-label="Ver ' + esc(p.nombre) + '"></a>' +
      '<div class="' + photoCls(p) + '"' + lq(p) + '>' + media(p, "sm") + (off ? '<span class="flag">Agotado</span>' : "") + "</div>" +
      '<div class="row-body"><h3>' + esc(p.nombre) + "</h3><p>" + esc(p.descripcion) + "</p>" +
      (tags ? '<div class="mini-tags">' + tags + "</div>" : "") +
      '<div class="row-foot"><span class="price">' + fmt(p.precio) + "</span>" + stepper(p) + "</div></div></article>";
  }
  function emptyState(icon, title, text, btn, big) {
    return '<div class="empty' + (big ? " big" : "") + '">' + (icon ? '<div class="art">' + ic(icon) + "</div>" : "") + "<h2>" + title + "</h2><p>" + text + "</p>" +
      (btn ? '<a class="btn-pill" href="' + btn[1] + '"><span class="arrow">' + ic("arrow") + "</span>" + btn[0] + "</a>" : "") + "</div>";
  }

  /* ---------- Vistas ---------- */

  // INICIO
  function viewHome() {
    return '<header class="header">' + logo() + cartBtn() + "</header>" +
      '<form class="search" role="search" data-form="search">' +
      '<label><span class="sr-only">Buscar en la carta</span>' +
      '<input id="q" type="search" autocomplete="off" enterkeyhint="search" placeholder="Buscar en la carta..." value="' + esc(ui.q) + '">' +
      '<button type="button" class="clear" data-act="clear-q" aria-label="Borrar búsqueda"' + (ui.q ? "" : " hidden") + ">" + ic("x") + "</button></label>" +
      '<button class="icon-btn" type="submit" aria-label="Buscar">' + ic("search") + "</button></form>" +
      avisoHTML() + '<div id="home-dyn">' + homeDyn() + "</div>";
  }
  function avisoHTML() {
    return LOCAL.aviso ? '<div class="aviso" role="note">' + ic("clock") + "<span>" + esc(LOCAL.aviso) + "</span></div>" : "";
  }
  function homeDyn() {
    if (ui.q.trim()) return searchResults();
    var cats = catsOrdenadas();
    var tabs = '<div class="tabs" role="tablist" aria-label="Categorías">' + cats.map(function (c) {
      return '<button class="tab' + (ui.homeCat === c.id ? " active" : "") + '" role="tab" aria-selected="' + (ui.homeCat === c.id) + '" data-act="homecat" data-cat="' + c.id + '">' +
        esc(c.nombre) + "<sup>(" + deCat(c.id).length + ")</sup></button>";
    }).join("") + "</div>";
    var items = deCat(ui.homeCat);
    var catName = ui.homeCat === "todo" ? "la carta" : CAT_BY_ID[ui.homeCat].nombre;
    var carousel = '<div class="carousel-wrap"><div class="carousel" id="carousel">' + items.map(card).join("") + "</div></div>";
    var verTodo = '<div class="section-head" style="margin-top:14px;justify-content:flex-end"><a class="link" href="#/categoria/' + ui.homeCat + '">Ver ' +
      (ui.homeCat === "todo" ? "toda la carta" : "todo " + esc(catName)) + " (" + items.length + ") " + ic("arrow") + "</a></div>";
    var destacados = REC ? REC.map(function (id) { return BY_ID[id]; }) : PRODUCTOS.filter(function (p) { return p.destacado; });
    if (!REC || REC_HORA) destacados = ordenar(destacados);
    var mo = momento();
    var deals = '<div class="section-head"><h2>Lo que recomienda la casa</h2>' + (mo && (!REC || REC_HORA) ? '<span class="momento">' + ic("clock") + esc(mo.titulo) + "</span>" : "") +
      '</div><div class="stack" aria-label="Recomendados">' +
      destacados.map(deal).join("") + "</div>";
    return tabs + carousel + verTodo + deals + footNote();
  }
  function deal(p) {
    // tamaño según el largo total y la palabra más larga, para que ninguna palabra se corte
    var n = p.nombre.length, larga = Math.max.apply(null, p.nombre.split(/\s+/).map(function (w) { return w.length; }));
    var px = n <= 7 ? 52 : n <= 11 ? 40 : n <= 16 ? 32 : 27;
    px = Math.min(px, Math.floor((window.innerWidth >= 720 ? 214 : 162) / (larga * 0.57)));
    var size = "font-size:" + px + "px" + (px < 30 ? ";letter-spacing:-.04em" : "");
    return '<a class="deal" href="#/producto/' + p.id + '" aria-label="' + esc(p.nombre) + '">' +
      '<h3 style="' + size + '">' + esc(p.nombre) + "</h3><p>" + esc(trunc(p.descripcion, 64)) + "</p>" +
      (p.recorte ? '<img class="deal-img" src="' + esc(p.recorte) + '" alt="" decoding="async" fetchpriority="low">' : '<span class="cut">' + media(p, "sm") + "</span>") +
      '<span class="deal-price">' + fmt(p.precio) + "</span></a>";
  }
  function trunc(s, n) { return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;]+\S*$/, "") + "…" : s; }
  function searchResults() {
    var q = norm(ui.q.trim());
    var words = q.split(/\s+/);
    var res = PRODUCTOS.filter(function (p) {
      var hay = norm([p.nombre, p.descripcion, p.etiquetas.join(" "), (CAT_BY_ID[p.categoria] || {}).nombre, p.ingredientes.join(" ")].join(" "));
      return words.every(function (w) { return hay.indexOf(w) !== -1; });
    });
    if (!res.length) {
      return emptyState("search", "Sin resultados", "No encontramos nada para “" + esc(ui.q.trim()) + "”. Probá con otra palabra, como <i>tostón</i>, <i>latte</i> o <i>sin gluten</i>.", null) +
        '<div style="text-align:center"><button class="btn-pill light" data-act="clear-q"><span class="arrow">' + ic("x") + "</span>Borrar búsqueda</button></div>";
    }
    return '<div class="section-head" style="margin-top:4px"><h2>' + res.length + " resultado" + (res.length === 1 ? "" : "s") + "</h2></div>" +
      '<div class="list">' + res.map(row).join("") + "</div>";
  }
  function footNote() {
    return '<p class="foot-note">' + esc(LOCAL.nombre) + " · " + esc(LOCAL.ciudad) + '<br><a href="#/local">Horarios, cómo llegar y cómo pedir</a></p>';
  }

  // CATEGORÍA
  function viewCategoria(id) {
    var cat = id === "todo" ? { id: "todo", nombre: "Toda la carta", bajada: "Cafetería, desayunos, cocina y más" } : CAT_BY_ID[id];
    var cats = catsOrdenadas();
    var tabs = '<div class="tabs" aria-label="Categorías">' + cats.map(function (c) {
      return '<a class="tab' + (id === c.id ? " active" : "") + '" href="#/categoria/' + c.id + '"' + (id === c.id ? ' aria-current="page"' : "") + ">" +
        esc(c.nombre) + "<sup>(" + deCat(c.id).length + ")</sup></a>";
    }).join("") + "</div>";
    return header(cat.nombre, { back: true }) +
      '<p class="cat-intro">' + esc(cat.bajada) + "</p>" + tabs +
      '<div id="cat-dyn">' + catDyn(id) + "</div>";
  }
  function catDyn(id) {
    var base = deCat(id);
    var activos = FILTROS.filter(function (f) { return ui.filtros[f]; });
    var chips = '<div class="chips" style="margin-top:18px" role="group" aria-label="Filtrar por etiqueta">' + FILTROS.map(function (f) {
      var n = base.filter(function (p) { return p.etiquetas.indexOf(f) !== -1; }).length;
      return '<button class="chip' + (ui.filtros[f] ? " on" : "") + '" aria-pressed="' + !!ui.filtros[f] + '" data-act="filtro" data-f="' + esc(f) + '">' +
        esc(f) + ' <span class="extra">' + n + "</span></button>";
    }).join("") + "</div>";
    var items = base.filter(function (p) {
      return activos.every(function (f) { return p.etiquetas.indexOf(f) !== -1; });
    });
    var list = items.length ? '<div class="list">' + items.map(row).join("") + "</div>" :
      emptyState("leaf", "Nada por acá", "No hay productos de esta categoría con " + (activos.length > 1 ? "esos filtros" : "ese filtro") + ". Probá sacando alguno.", null) +
      '<div style="text-align:center"><button class="btn-pill light" data-act="clear-filtros"><span class="arrow">' + ic("x") + "</span>Sacar filtros</button></div>";
    return chips + list;
  }

  // DETALLE
  function viewProducto(id) {
    var p = BY_ID[id];
    if (!ui.det || ui.det.id !== id) ui.det = { id: id, sel: {}, qty: 1, nota: "" };
    var d = ui.det;
    var fav = S.favs.indexOf(id) !== -1;
    var tags = p.etiquetas.length ? '<div class="chips">' + p.etiquetas.map(function (t) {
      return '<span class="chip static' + (t === "+18" ? " adult" : "") + '">' + esc(t) + "</span>";
    }).join("") + "</div>" : "";

    var grupos = p.opciones.map(function (g, gi) {
      return '<div class="opt-group" data-group="' + gi + '"><div class="field-label"><span>' + esc(g.grupo) + ":</span>" + reqBadge(g) + "</div>" +
        '<div class="chips wrap" role="radiogroup" aria-label="' + esc(g.grupo) + '">' + g.opciones.map(function (o) {
          var on = d.sel[g.grupo] === o.nombre;
          return '<button class="chip' + (on ? " on" : "") + '" role="radio" aria-checked="' + on + '" data-act="opt" data-g="' + gi + '" data-o="' + esc(o.nombre) + '">' +
            esc(o.nombre) + (o.recargo ? ' <span class="extra">+$' + miles(o.recargo) + "</span>" : "") + "</button>";
        }).join("") + "</div></div>";
    }).join("");

    var alerg = '<details class="accordion"' + (ui.accOpen ? " open" : "") + ' data-acc><summary>Ingredientes y alérgenos ' + ic("chevron") + '</summary><div class="acc-body">' +
      (p.ingredientes.length ? "<h4>Ingredientes</h4><p style=\"margin:0\">" + esc(p.ingredientes.join(", ")) + ".</p>" : "<h4>Ingredientes</h4><p style=\"margin:0\">" + esc(p.descripcion) + "</p>") +
      "<h4>Alérgenos</h4>" + (p.alergenos.length ? '<div class="pills warn">' + p.alergenos.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + "</div>" : '<p style="margin:0">Sin alérgenos declarados.</p>') +
      (p.libreDe.length ? '<h4>Libre de</h4><div class="pills free">' + p.libreDe.map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("") + "</div>" : "") +
      '<p class="hint" style="margin:14px 0 0">Si tenés alguna alergia o intolerancia, avisanos en las aclaraciones. Trabajamos en una cocina donde se manipulan otros alérgenos.</p>' +
      "</div></details>";

    return header("Detalle", { back: true }) +
      '<div class="detail-wrap">' +
      '<div class="detail-photo' + (!p.disponible ? " agotado" : "") + '"><div class="' + photoCls(p) + '"' + lq(p) + '>' + media(p, "lg", true) + (!p.disponible ? '<span class="flag" style="left:14px;right:auto">Agotado</span>' : "") + "</div>" +
      '<button class="icon-btn fav-btn' + (fav ? " on" : "") + '" data-act="fav" data-id="' + id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Quitar de" : "Guardar en") + ' favoritos">' + ic("heart") + "</button></div>" +
      '<section class="detail">' +
      "<h2>" + esc(p.nombre) + '</h2><p class="desc">' + esc(p.descripcion) + "</p>" +
      (/consult/i.test(p.descripcion) ? waLink("Hola, Rinconcito. ¿Qué opciones tienen hoy de " + p.nombre + "?", "Consultar por WhatsApp", "det-wa") : "") +
      '<div class="big-price"><span class="price" id="det-price">' + fmt(detUnit()) + '</span><small id="det-each"></small></div>' +
      tags + grupos + alerg +
      '<div class="field-label">Cantidad:</div>' +
      '<div class="qty"><button class="icon-btn" data-act="dqty" data-d="-1" aria-label="Restar">' + ic("minus") + '</button><span class="n" id="det-qty" aria-live="polite">' + d.qty + '</span><button class="icon-btn" data-act="dqty" data-d="1" aria-label="Sumar">' + ic("plus") + "</button></div>" +
      '<label class="field-label" for="nota">Aclaraciones para la cocina <span class="req">Opcional</span></label>' +
      '<textarea class="textarea" id="nota" maxlength="200" placeholder="Ej.: sin tomate, bien caliente, alergia a…">' + esc(d.nota) + "</textarea>" +
      upsellBlock((function () { var r = sugerirPara(p.categoria, p.id, 6); if (r) r.titulo = "Combina bien con"; return r; })(), "in-detail") +
      "</section></div>";
  }
  function reqBadge(g) {
    var ok = ui.det && ui.det.sel[g.grupo];
    var missing = !ok && ui.det && ui.det.tried;
    return '<span class="req' + (ok ? " ok" : missing ? " missing" : "") + '">' + (ok ? "✓ Listo" : "Obligatorio") + "</span>";
  }
  function detUnit() {
    var p = BY_ID[ui.det.id];
    return unitPrice({ id: p.id, sel: ui.det.sel });
  }
  function detMissing() {
    var p = BY_ID[ui.det.id];
    return p.opciones.filter(function (g) { return !ui.det.sel[g.grupo]; });
  }
  function ctaHTML(o) {
    // o: { cls, act, dis, lbl, sub, amt, icon }
    return '<div class="cta-bar"><button class="cta' + (o.cls ? " " + o.cls : "") + (o.dis ? " disabled" : "") + '"' +
      (o.act ? ' data-act="' + o.act + '"' : "") + ' aria-disabled="' + !!o.dis + '">' +
      '<span class="cta-txt"><span class="lbl">' + o.lbl + "</span>" + (o.sub ? '<span class="sub">' + o.sub + "</span>" : "") + "</span>" +
      (o.amt ? '<span class="amt">' + o.amt + "</span>" : "") +
      '<span class="arrow">' + ic(o.icon || "arrow") + "</span></button></div>";
  }
  function detCTA() {
    var p = BY_ID[ui.det.id];
    if (!p.disponible) return ctaHTML({ dis: true, lbl: "Agotado por hoy", sub: "Probá con otro producto de la carta", icon: "x" });
    var missing = detMissing();
    var total = detUnit() * ui.det.qty;
    if (missing.length) {
      return ctaHTML({ act: "add", dis: true, lbl: "Elegí " + esc(missing.map(function (g) { return g.grupo.toLowerCase(); }).join(" y ")),
        sub: missing.length === 1 ? "Falta 1 opción para agregarlo" : "Faltan " + missing.length + " opciones para agregarlo", icon: "arrow" });
    }
    var opts = Object.keys(ui.det.sel).map(function (k) { return ui.det.sel[k]; }).join(" · ");
    return ctaHTML({ act: "add", lbl: "Agregar al pedido", sub: esc(ui.det.qty + " × " + p.nombre + (opts ? " · " + opts : "")), amt: fmt(total) });
  }
  function refreshDetail() {
    var p = BY_ID[ui.det.id];
    $("#det-price").textContent = fmt(detUnit());
    $("#det-each").textContent = ui.det.qty > 1 ? "c/u · " + fmt(detUnit() * ui.det.qty) + " en total" : "";
    $("#det-qty").textContent = ui.det.qty;
    p.opciones.forEach(function (g, gi) {
      var box = $('[data-group="' + gi + '"]');
      if (!box) return;
      $$(".chip", box).forEach(function (c) {
        var on = ui.det.sel[g.grupo] === c.getAttribute("data-o");
        c.classList.toggle("on", on);
        c.setAttribute("aria-checked", on);
      });
      $(".req", box).outerHTML = reqBadge(g);
    });
    $("#cta-root").innerHTML = detCTA();
  }

  // PEDIDO
  function viewPedido() {
    var right = S.cart.length ? '<button class="icon-btn" data-act="vaciar" aria-label="Vaciar pedido">' + ic("trash") + "</button>" : "<span></span>";
    var h = header("Tu pedido", { back: true, right: right });
    if (!S.cart.length) {
      var mios = misPedidosHTML();
      if (mios) return h + mios + '<div style="text-align:center;margin-top:24px"><a class="btn-pill" href="#/"><span class="arrow">' + ic("arrow") + "</span>Pedir algo más</a></div>";
      return h + emptyState("bag", "Tu pedido está vacío", "Todavía no sumaste nada. Date una vuelta por la carta: hay café de especialidad, tostones y platos de la casa.", ["Ver la carta", "#/"]);
    }
    var P = S.pedido;
    var mesaBanner = ui.mesaQR ? '<div class="mesa-banner">' + ic("table") + "<span>Estás en la <b>mesa " + esc(ui.mesaQR) + "</b>. Te lo llevamos ahí.</span></div>" : "";
    var items = '<div class="cart-list">' + S.cart.map(function (l, i) {
      var p = BY_ID[l.id];
      var opts = Object.keys(l.sel || {}).map(function (k) { return esc(k) + ": " + esc(l.sel[k]); }).join(" · ");
      return '<article class="cart-item"><a class="' + photoCls(p) + '"' + lq(p) + ' href="#/producto/' + p.id + '" aria-label="Ver ' + esc(p.nombre) + '">' + media(p, "sm") + "</a><div>" +
        '<div class="head"><h3>' + esc(p.nombre) + '</h3><button class="rm" data-act="rm" data-i="' + i + '" aria-label="Quitar ' + esc(p.nombre) + '">' + ic("x") + "</button></div>" +
        (opts ? '<div class="opts">' + opts + "</div>" : "") +
        (l.nota ? '<div class="note">“' + esc(l.nota) + "”</div>" : "") +
        '<div class="foot"><div class="stepper"><button class="icon-btn" data-act="lqty" data-i="' + i + '" data-d="-1" aria-label="Restar">' + ic("minus") + '</button><span class="n">' + l.qty +
        '</span><button class="icon-btn" data-act="lqty" data-i="' + i + '" data-d="1" aria-label="Sumar">' + ic("plus") + "</button></div>" +
        '<div style="text-align:right"><div class="price">' + fmt(unitPrice(l) * l.qty) + "</div>" + (l.qty > 1 ? '<div class="unit">' + fmt(unitPrice(l)) + " c/u</div>" : "") + "</div></div>" +
        "</div></article>";
    }).join("") + "</div>";

    var mods = [["delivery", "Delivery", "moto", "Te lo llevamos"], ["retiro", "Retiro", "store", "Pasás por el local"], ["mesa", "En la mesa", "table", "Estás acá"]];
    var seg = '<div class="seg" role="radiogroup" aria-label="Modalidad">' + mods.map(function (m) {
      return '<button class="' + (P.modalidad === m[0] ? "on" : "") + '" role="radio" aria-checked="' + (P.modalidad === m[0]) + '" data-act="modalidad" data-v="' + m[0] + '">' + ic(m[2]) + m[1] + "<span>" + m[3] + "</span></button>";
    }).join("") + "</div>";
    var extra = "";
    if (P.modalidad === "delivery") {
      extra = '<div class="stack-fields"><label class="sr-only" for="dir">Dirección de entrega</label><input class="input' + (ui.invalid.direccion ? " invalid" : "") + '" id="dir" data-field="direccion" autocomplete="street-address" placeholder="Dirección (calle, número, apto)" value="' + esc(P.direccion) + '">' +
        '<label class="sr-only" for="tel">Teléfono</label><input class="input' + (ui.invalid.telefono ? " invalid" : "") + '" id="tel" data-field="telefono" type="tel" inputmode="tel" autocomplete="tel" placeholder="Teléfono de contacto" value="' + esc(P.telefono || "") + '">' +
        '<p class="hint">El costo de envío depende de la zona; el local te lo confirma.</p></div>';
    } else if (P.modalidad === "retiro") {
      extra = '<p class="hint" style="margin-top:12px">Acá mismo vas a ver cuando esté pronto para retirar.</p>';
    } else if (P.modalidad === "mesa") {
      extra = '<div class="stack-fields"><label class="sr-only" for="mesa">Número de mesa</label><input class="input' + (ui.invalid.mesa ? " invalid" : "") + '" id="mesa" data-field="mesa" inputmode="numeric" placeholder="Número de mesa" value="' + esc(P.mesa) + '">' +
        '<p class="hint">Lo encontrás en el QR o la tarjetita de la mesa.</p></div>';
    }
    var invMod = ui.invalid.modalidad ? '<p class="hint err">Elegí cómo querés recibir tu pedido.</p>' : "";

    var pagos = [["efectivo", "Efectivo", "cash", ""], ["transferencia", "Transferencia", "transfer", ""], ["pos", "Tarjeta (POS)", "pos", "Delivery o retiro"]];
    var segPago = '<div class="seg" role="radiogroup" aria-label="Forma de pago">' + pagos.map(function (m) {
      var dis = m[0] === "pos" && P.modalidad === "mesa";
      return '<button class="' + (P.pago === m[0] ? "on" : "") + '" role="radio" aria-checked="' + (P.pago === m[0]) + '" data-act="pago" data-v="' + m[0] + '"' + (dis ? " disabled" : "") + ">" + ic(m[2]) + m[1] + (m[3] ? "<span>" + m[3] + "</span>" : "") + "</button>";
    }).join("") + "</div>" + (ui.invalid.pago ? '<p class="hint err">Elegí una forma de pago.</p>' : "");

    var n = cartCount();
    var totals = '<div class="totals"><div class="line"><span>Subtotal (' + n + " producto" + (n === 1 ? "" : "s") + ")</span><span>" + fmt(cartTotal()) + "</span></div>" +
      (P.modalidad === "delivery" ? '<div class="line"><span>Envío</span><span>A coordinar</span></div>' : "") +
      '<div class="line total"><span>Total</span><span class="price">' + fmt(cartTotal()) + "</span></div></div>";

    return h + mesaBanner + '<div class="pedido-wrap"><div>' + items +
      '<div style="padding:14px 10px 0"><a class="link" href="#/" style="padding:0 10px">' + ic("plus") + " Sumar algo más</a></div>" +
      upsellBlock(sugerirPedido(), "in-cart") + "</div>" +
      '<div class="side">' +
      '<div class="block" id="b-mod"><h3>¿Cómo lo querés?</h3>' + seg + invMod + extra + "</div>" +
      '<div class="block"><h3>Tu nombre</h3><label class="sr-only" for="nom">Tu nombre</label><input class="input" id="nom" data-field="nombre" autocomplete="given-name" placeholder="Para saber a quién llamar (opcional)" value="' + esc(P.nombre) + '"></div>' +
      '<div class="block" id="b-pago"><h3>Forma de pago</h3>' + segPago + "</div>" +
      totals +
      '<p class="foot-note" style="margin-top:16px">Tu pedido llega directo al local. Después de enviarlo vas a ver acá cómo va.</p>' +
      "</div></div>";
  }
  function pedidoCTA() {
    if (!S.cart.length) return "";
    var n = cartCount(), m = { delivery: "Delivery", retiro: "Retiro en el local", mesa: "En la mesa" + (S.pedido.mesa ? " " + S.pedido.mesa : "") }[S.pedido.modalidad];
    var sub = n + " producto" + (n === 1 ? "" : "s") + (m ? " · " + m : "");
    return ctaHTML({ act: "enviar", dis: ui.enviando, lbl: ui.enviando ? "Enviando…" : "Enviar pedido", sub: sub, amt: fmt(cartTotal()), icon: "arrow" });
  }
  function mensajeWhatsApp() {
    var P = S.pedido;
    var mod = { delivery: "Delivery", retiro: "Retiro en el local", mesa: "En la mesa" }[P.modalidad];
    var pago = { efectivo: "Efectivo", transferencia: "Transferencia", pos: "Tarjeta (POS)" }[P.pago];
    var L = [];
    L.push("¡Hola, Rinconcito! Quiero hacer un pedido:");
    L.push("");
    S.cart.forEach(function (l) {
      var p = BY_ID[l.id];
      var opts = Object.keys(l.sel || {}).map(function (k) { return k + ": " + l.sel[k]; }).join(", ");
      L.push("• " + l.qty + " × " + p.nombre + (opts ? " (" + opts + ")" : "") + " — " + fmt(unitPrice(l) * l.qty));
      if (l.nota) L.push("   Aclaración: " + l.nota);
    });
    L.push("");
    L.push("*Total: " + fmt(cartTotal()) + "*" + (P.modalidad === "delivery" ? " + envío" : ""));
    L.push("");
    L.push("*Modalidad:* " + mod);
    if (P.modalidad === "delivery") L.push("*Dirección:* " + P.direccion.trim());
    if (P.modalidad === "mesa") L.push("*Mesa:* " + P.mesa.trim());
    L.push("*Pago:* " + pago);
    if (P.nombre.trim()) L.push("*Nombre:* " + P.nombre.trim());
    return L.join("\n");
  }
  function enviar() {
    var P = S.pedido;
    ui.invalid = {};
    if (!P.modalidad) ui.invalid.modalidad = true;
    if (P.modalidad === "delivery" && P.direccion.trim().length < 4) ui.invalid.direccion = true;
    if (P.modalidad === "delivery" && (P.telefono || "").replace(/\D/g, "").length < 8) ui.invalid.telefono = true;
    if (P.modalidad === "mesa" && !P.mesa.trim()) ui.invalid.mesa = true;
    if (!P.pago) ui.invalid.pago = true;
    if (Object.keys(ui.invalid).length) {
      render({ anim: false });
      var first = ui.invalid.modalidad || ui.invalid.direccion || ui.invalid.telefono || ui.invalid.mesa ? "#b-mod" : "#b-pago";
      var el = $(first);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      var msg = ui.invalid.modalidad ? "Elegí delivery, retiro o mesa" : ui.invalid.direccion ? "Falta la dirección de entrega" : ui.invalid.telefono ? "Falta un teléfono de contacto" : ui.invalid.mesa ? "Falta el número de mesa" : "Elegí una forma de pago";
      toast(msg);
      var inp = ui.invalid.direccion ? $("#dir") : ui.invalid.telefono ? $("#tel") : ui.invalid.mesa ? $("#mesa") : null;
      if (inp) setTimeout(function () { inp.focus({ preventScroll: true }); }, 350);
      return;
    }
    if (ui.enviando) return;
    ui.enviando = true; $("#cta-root").innerHTML = pedidoCTA();
    var o = armarPedido();
    Pedidos.registrar(o).then(function () {
      ui.enviando = false;
      var mios = load("rc_mis_pedidos", []); mios.push(o); save("rc_mis_pedidos", mios.slice(-15));
      S.cart = []; saveCart();
      render({ anim: false }); window.scrollTo(0, 0);
      toast("¡Listo! Tu pedido #" + o.num + " llegó al local", 4000);
    }, function (err) {
      ui.enviando = false; $("#cta-root").innerHTML = pedidoCTA();
      toast(err && err.sinPermiso ? (NUBE.estado === "sin-cuenta" ? "Para enviar pedidos tenés que iniciar sesión en Claude. Si no, pedí en el mostrador." : "Esta cuenta no puede enviar pedidos. Pedí en el mostrador o llamá al " + esc(LOCAL.whatsappVisible))
        : "No se pudo enviar. Revisá la conexión y probá de nuevo", 5000);
    });
  }

  // FAVORITOS
  function viewFavoritos() {
    var h = '<header class="header">' + '<a class="icon-btn" href="#/" aria-label="Inicio">' + ic("home") + "</a><h1>Favoritos</h1>" + cartBtn() + "</header>";
    var favs = S.favs.map(function (id) { return BY_ID[id]; }).filter(Boolean);
    if (!favs.length) return h + emptyState("heart", "Todavía no guardaste nada", "Tocá el corazón en cualquier producto y lo vas a encontrar acá la próxima vez.", ["Ver la carta", "#/"]);
    return h + '<p class="cat-intro">' + favs.length + " guardado" + (favs.length === 1 ? "" : "s") + " en este dispositivo</p>" +
      '<div class="grid">' + favs.map(card).join("") + "</div>";
  }

  // EL LOCAL
  var DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  function ahoraMVD() {
    var parts = {};
    new Intl.DateTimeFormat("en-US", { timeZone: LOCAL.zonaHoraria, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    var wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[parts.weekday];
    return { dia: wd, min: (Number(parts.hour) % 24) * 60 + Number(parts.minute) };
  }
  function toMin(hhmm) { var a = hhmm.split(":"); return Number(a[0]) * 60 + Number(a[1]); }
  function estado() {
    var now = ahoraMVD();
    var hoy = LOCAL.horarios[now.dia];
    if (hoy && now.min >= toMin(hoy[0]) && now.min < toMin(hoy[1])) {
      var faltan = toMin(hoy[1]) - now.min;
      return { abierto: true, texto: faltan <= 45 ? "Cierra en " + faltan + " min (a las " + hoy[1] + ")" : "Hoy hasta las " + hoy[1], dia: now.dia };
    }
    if (hoy && now.min < toMin(hoy[0])) return { abierto: false, texto: "Abre hoy a las " + hoy[0], dia: now.dia };
    for (var i = 1; i <= 7; i++) {
      var d = (now.dia + i) % 7;
      if (LOCAL.horarios[d]) return { abierto: false, texto: "Abre " + (i === 1 ? "mañana" : "el " + DIAS[d].toLowerCase()) + " a las " + LOCAL.horarios[d][0], dia: now.dia };
    }
    return { abierto: false, texto: "", dia: now.dia };
  }
  function statusCard() {
    var e = estado();
    var rows = [["Lunes a viernes", [1, 2, 3, 4, 5]], ["Sábado", [6]], ["Domingo", [0]]].map(function (r) {
      var h = LOCAL.horarios[r[1][0]];
      return '<div class="' + (r[1].indexOf(e.dia) !== -1 ? "today" : "") + '"><span>' + r[0] + "</span><span>" + (h ? h[0] + " a " + h[1] : "Cerrado") + "</span></div>";
    }).join("");
    return '<div class="status-card ' + (e.abierto ? "open" : "closed") + '" id="status"><span class="dot">' + (e.abierto ? "Abierto ahora" : "Cerrado") + "</span>" +
      "<h2>" + (e.abierto ? "Pasá, estamos." : "Volvemos pronto.") + "</h2><p>" + esc(e.texto) + "</p>" +
      '<div class="hours">' + rows + "</div></div>";
  }
  function viewLocal() {
    var h = '<header class="header">' + '<a class="icon-btn" href="#/" aria-label="Inicio">' + ic("home") + "</a><h1>El local</h1>" + cartBtn() + "</header>";
    var maps = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(LOCAL.mapsQuery);
    var info = '<div class="info-grid">' +
      '<a class="info-card" href="' + maps + '"><span class="ic">' + ic("map") + "</span><div><b>Cómo llegar</b><span>Abrir en Google Maps</span></div>" + ic("arrow", "go") + "</a>" +
      '<a class="info-card" href="https://wa.me/' + LOCAL.whatsapp + '"><span class="ic">' + ic("whatsapp") + "</span><div><b>WhatsApp</b><span>" + esc(LOCAL.whatsappVisible) + "</span></div>" + ic("arrow", "go") + "</a>" +
      '<a class="info-card" href="https://instagram.com/' + LOCAL.instagram + '"><span class="ic">' + ic("instagram") + "</span><div><b>Instagram</b><span>@" + esc(LOCAL.instagram) + "</span></div>" + ic("arrow", "go") + "</a>" +
      "</div>";
    var how = '<div class="how">' +
      '<div class="how-item"><h4>Delivery</h4><p>Armá tu pedido, poné tu dirección y envialo desde acá. Vas a ver cuándo sale para tu casa.</p></div>' +
      '<div class="how-item"><h4>Retiro</h4><p>Pedí desde acá y pasá a buscarlo. Te avisamos cuando esté pronto.</p></div>' +
      '<div class="how-item"><h4>En la mesa</h4><p>Escaneá el QR de tu mesa, elegí y enviá. Te lo llevamos sin que te levantes.</p></div>' +
      "</div>";
    var pagos = '<div class="block"><h3>Formas de pago</h3><div class="pay-row">' +
      '<span class="chip">' + ic("cash") + " Efectivo</span>" +
      '<span class="chip">' + ic("transfer") + " Transferencia</span>" +
      '<span class="chip">' + ic("pos") + " Tarjeta (POS)</span></div>" +
      '<p class="hint">Con tarjeta (POS) podés pagar en delivery y en retiro.</p></div>';
    var galeria = (LOCAL.fotos || []).length ? '<div class="gallery" aria-label="Fotos del local">' + LOCAL.fotos.map(function (f) {
      return '<figure class="photo loading"><img src="' + esc(f.src) + '" alt="' + esc(f.texto) + '" loading="lazy" decoding="async" onload="this.parentNode.classList.remove(\'loading\')"><figcaption>' + esc(f.texto) + "</figcaption></figure>";
    }).join("") + "</div>" : "";
    return h + '<div class="sello-wrap">' + sello(180) + "</div>" + statusCard() + galeria +
      '<div class="section-head"><h2>Encontranos</h2></div>' + info +
      '<div class="section-head"><h2>Cómo pedir</h2></div>' + how + pagos +
      '<div style="text-align:center;margin-top:28px"><a class="btn-pill" href="#/"><span class="arrow">' + ic("arrow") + "</span>Ver la carta</a></div>" +
      '<span class="marca-agua">' + sello(150) + "</span>" +
      '<p class="foot-note">' + esc(LOCAL.nombre) + " · " + esc(LOCAL.ciudad) +
      (puedeAdministrar() ? '<br><a href="#/admin">Administración</a>' : "") + "</p>";
  }

  // 404
  function view404() {
    return '<header class="header">' + logo() + cartBtn() + "</header>" +
      '<div style="padding-top:6vh"><div class="sello-wrap">' + sello(150) + "</div>" + emptyState(null, "Acá no hay nada", "La página que buscás no existe o se mudó de mesa.", ["Ver la carta", "#/"], true) + "</div>";
  }

  // SKELETON
  function viewSkeleton() {
    var sk = function (w, h, extra) { return '<div class="sk" style="width:' + w + ";height:" + h + "px;" + (extra || "") + '"></div>'; };
    var cards = "";
    for (var i = 0; i < 3; i++) cards += '<div class="sk-card"><div class="sk sk-photo"></div><div class="sk sk-line" style="width:60%;margin-top:12px"></div><div class="sk sk-line" style="width:90%"></div><div class="sk sk-line" style="width:70%"></div></div>';
    return '<div aria-busy="true" aria-label="Cargando la carta">' +
      '<header class="header">' + sk("52px", 52, "border-radius:50%") + "<span></span>" + sk("52px", 52, "border-radius:50%") + "</header>" +
      '<div class="pad">' + sk("100%", 52, "border-radius:26px;margin:8px 0 22px") + "</div>" +
      '<div class="pad" style="display:flex;gap:16px">' + sk("70px", 32) + sk("140px", 32) + sk("120px", 32) + "</div>" +
      '<div class="carousel-wrap"><div class="carousel" style="overflow:hidden">' + cards + "</div></div>" +
      '<div class="pad" style="margin-top:34px">' + sk("70%", 32) + "</div>" +
      '<div class="pad" style="display:flex;gap:12px;margin-top:24px">' + sk("180px", 240, "border-radius:26px;flex:none") + sk("180px", 240, "border-radius:26px;flex:none") + "</div></div>";
  }

  /* ---------- Tab bar ---------- */
  function renderTabbar(route) {
    var bar = $("#tabbar");
    var hide = route.name === "producto" || route.name === "admin" || (route.name === "pedido" && S.cart.length);
    bar.classList.toggle("hidden", !!hide);
    if (hide) { bar.innerHTML = ""; return; }
    var n = cartCount();
    function b(name, href, icon, label) {
      var on = route.name === name;
      return '<a class="icon-btn' + (on ? " active" : "") + '" href="' + href + '" aria-label="' + label + '"' + (on ? ' aria-current="page"' : "") + ">" + ic(icon) + '<span class="tlabel">' + label + "</span>" +
        (name === "pedido" ? '<span class="badge" data-badge' + (n ? "" : " hidden") + ">" + n + "</span>" : "") + "</a>";
    }
    bar.innerHTML = '<div class="tabbar-inner"><span class="tab-lens" aria-hidden="true"></span>' + b("home", "#/", "home", "Inicio") + b("favoritos", "#/favoritos", "heart", "Favoritos") +
      b("pedido", "#/pedido", "bag", "Pedido") + b("local", "#/local", "store", "El local") + "</div>";
    moverLente(bar);
  }
  // La gota de vidrio parte de donde estaba y se desliza a la pestaña nueva
  function moverLente(bar) {
    var lens = $(".tab-lens", bar), act = $(".icon-btn.active", bar), inner = $(".tabbar-inner", bar);
    if (!lens) return;
    if (!act) { lens.classList.add("hide"); if (ui.lens) lens.style.transform = "translateX(" + ui.lens.x + "px)"; return; }
    var to = { x: act.offsetLeft, w: act.offsetWidth };
    if (ui.lens) {
      lens.style.transition = "none";
      lens.style.transform = "translateX(" + ui.lens.x + "px)"; lens.style.width = ui.lens.w + "px";
      void lens.offsetWidth; lens.style.transition = "";
    }
    requestAnimationFrame(function () { lens.style.transform = "translateX(" + to.x + "px)"; lens.style.width = to.w + "px"; });
    ui.lens = to;
  }
  function updateBadges(pop) {
    var n = cartCount();
    $$("[data-badge]").forEach(function (b) {
      b.textContent = n;
      if (n) b.removeAttribute("hidden"); else b.setAttribute("hidden", "");
      if (pop) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
    });
    $$("[aria-label^='Ver pedido']").forEach(function (a) { a.setAttribute("aria-label", "Ver pedido (" + n + " productos)"); });
  }

  /* ---------- Router ---------- */
  var ORDER = { home: 0, favoritos: 1, local: 1, categoria: 2, producto: 3, pedido: 4, notfound: 0, admin: 2 };
  function parseRoute() {
    var h = RUTA.replace(/^#/, "") || "/";
    var parts = h.split("?")[0].split("/").filter(Boolean);
    if (!parts.length) return { name: "home" };
    if (parts[0] === "categoria" && parts.length === 2 && (parts[1] === "todo" || CAT_BY_ID[parts[1]])) return { name: "categoria", id: parts[1] };
    if (parts[0] === "producto" && parts.length === 2 && BY_ID[parts[1]]) return { name: "producto", id: parts[1] };
    if (parts.length === 1 && (parts[0] === "pedido" || parts[0] === "favoritos" || parts[0] === "local" || parts[0] === "admin")) return { name: parts[0] };
    return { name: "notfound" };
  }

  var current = null;
  function render(opts) {
    opts = opts || {};
    var route = parseRoute();
    var app = $("#app");
    var html;
    if (!ui.ready) html = viewSkeleton();
    else if (route.name === "home") html = viewHome();
    else if (route.name === "categoria") html = viewCategoria(route.id);
    else if (route.name === "producto") html = viewProducto(route.id);
    else if (route.name === "pedido") html = viewPedido();
    else if (route.name === "favoritos") html = viewFavoritos();
    else if (route.name === "local") html = viewLocal();
    else if (route.name === "admin") html = '<div id="admin-root"></div>';
    else html = view404();

    var back = current && ORDER[route.name] < ORDER[current.name];
    var anim = opts.anim !== false;
    app.innerHTML = '<div class="view' + (anim ? "" : "") + (back ? " back" : "") + '"' + (anim ? "" : ' style="animation:none"') + ">" + html + "</div>";

    var cta = "";
    if (ui.ready && route.name === "producto") cta = detCTA();
    if (ui.ready && route.name === "pedido") cta = pedidoCTA();
    $("#cta-root").innerHTML = cta;
    document.body.classList.toggle("has-cta", !!cta);
    renderTabbar(route);

    if (ui.ready) {
      var titles = {
        home: "Carta", categoria: route.id && (route.id === "todo" ? "Toda la carta" : (CAT_BY_ID[route.id] || {}).nombre),
        producto: route.id && BY_ID[route.id] && BY_ID[route.id].nombre, pedido: "Tu pedido", favoritos: "Favoritos", local: "El local", admin: "Administración", notfound: "Acá no hay nada"
      };
      document.title = (titles[route.name] || "Carta") + " · El Rinconcito San Nicolás";
    }
    current = route;
    centrarTab(false);
    if (ui.ready && route.name === "admin" && window.RCAdmin) window.RCAdmin.mount($("#admin-root"), API);
    onScroll();
  }

  /* ---------- Navegación ----------
     La ruta vive en la app (RUTA). Dentro de la página de Claude cambiar la
     dirección por código no siempre se permite, así que no dependemos de eso. */
  var PILA = [];
  function alCambiarRuta(oldHash, atras) {
    cerrarSheet();
    ui.scroll[oldHash] = window.scrollY;
    var prevRoute = current;
    if (prevRoute && prevRoute.name === "producto") ui.accOpen = false;
    var nr = parseRoute();
    if (nr.name === "categoria" && !(prevRoute && prevRoute.name === "categoria" && prevRoute.id === nr.id) && !(prevRoute && prevRoute.name === "producto")) ui.filtros = {};
    render();
    var goingBack = atras || (prevRoute && ORDER[current.name] < ORDER[prevRoute.name]);
    window.scrollTo(0, goingBack && ui.scroll[RUTA] ? ui.scroll[RUTA] : 0);
    ui.invalid = {};
  }
  function ir(h) {
    if (!h || h === RUTA) return;
    var old = RUTA;
    PILA.push(old); if (PILA.length > 40) PILA.shift();
    RUTA = h;
    try { if (location.hash !== h) history.pushState(null, "", h); } catch (e) { /* visor que no lo permite */ }
    alCambiarRuta(old, false);
  }
  // La pestaña elegida queda a la vista moviendo la fila lo mínimo (sin mover la página)
  var tabsX = 0;
  function centrarTab(suave) {
    var fila = $(".tabs"), a = $(".tabs .tab.active");
    if (!fila || !a) return;
    if (fila._x !== true) { fila.scrollLeft = tabsX; fila._x = true; } // al redibujar, mantener donde estaba
    var margen = 20, ini = fila.scrollLeft, fin = ini + fila.clientWidth;
    var izq = a.offsetLeft - margen, der = a.offsetLeft + a.offsetWidth + margen;
    var x = ini;
    if (izq < ini) x = izq; else if (der > fin) x = der - fila.clientWidth;
    x = Math.max(0, Math.min(x, fila.scrollWidth - fila.clientWidth));
    if (x !== ini) { if (suave && fila.scrollTo) fila.scrollTo({ left: x, behavior: "smooth" }); else fila.scrollLeft = x; }
    tabsX = x;
  }
  document.addEventListener("scroll", function (e) { if (e.target && e.target.classList && e.target.classList.contains("tabs")) tabsX = e.target.scrollLeft; }, true);
  function goBack(fallback) {
    var old = RUTA, dest = PILA.length ? PILA.pop() : (fallback || "#/");
    RUTA = dest;
    try { history.replaceState(null, "", dest); } catch (e) { /* */ }
    alCambiarRuta(old, true);
  }
  // Los links internos (#/...) navegan por la app
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    ir(a.getAttribute("href"));
  });
  // Botón atrás del navegador (cuando existe)
  window.addEventListener("popstate", function () {
    var h = location.hash || "#/";
    if (h === RUTA) return;
    var old = RUTA; RUTA = h; if (PILA.length) PILA.pop();
    alCambiarRuta(old, true);
  });
  window.addEventListener("hashchange", function () {
    var h = location.hash || "#/";
    if (h === RUTA) return;
    var old = RUTA; PILA.push(old); RUTA = h;
    alCambiarRuta(old, false);
  });

  /* ---------- Eventos ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-act]");
    if (!t) return;
    var act = t.getAttribute("data-act");
    var id = t.getAttribute("data-id");

    if (act === "back") {
      var r = parseRoute();
      goBack(r.name === "producto" ? "#/categoria/" + BY_ID[r.id].categoria : "#/");
    }
    else if (act === "homecat") {
      ui.homeCat = t.getAttribute("data-cat");
      $("#home-dyn").innerHTML = homeDyn();
      var c = $("#carousel"); if (c) c.scrollLeft = 0;
      centrarTab(true);
    }
    else if (act === "clear-q") {
      ui.q = "";
      var q = $("#q"); if (q) { q.value = ""; q.focus(); }
      $("#home-dyn").innerHTML = homeDyn();
      var cl = $("[data-act=clear-q].clear"); if (cl) cl.hidden = true;
    }
    else if (act === "quick") {
      e.preventDefault();
      quickAdd(id, t);
    }
    else if (act === "minus") {
      removeOneOf(id);
      refreshRow(id);
      toast("Quitamos uno de " + esc(BY_ID[id].nombre));
    }
    else if (act === "filtro") {
      var f = t.getAttribute("data-f");
      ui.filtros[f] = !ui.filtros[f];
      $("#cat-dyn").innerHTML = catDyn(parseRoute().id);
    }
    else if (act === "clear-filtros") {
      ui.filtros = {};
      $("#cat-dyn").innerHTML = catDyn(parseRoute().id);
    }
    else if (act === "fav") {
      var i = S.favs.indexOf(id);
      if (i === -1) S.favs.push(id); else S.favs.splice(i, 1);
      save("rc_favs", S.favs);
      var on = i === -1;
      t.classList.toggle("on", on);
      t.setAttribute("aria-pressed", on);
      t.setAttribute("aria-label", (on ? "Quitar de" : "Guardar en") + " favoritos");
      t.classList.remove("beat"); void t.offsetWidth; if (on) t.classList.add("beat");
      toast(on ? 'Guardado en favoritos · <a href="#/favoritos">Ver</a>' : "Lo sacamos de favoritos");
    }
    else if (act === "opt") {
      var p = BY_ID[ui.det.id];
      var g = p.opciones[Number(t.getAttribute("data-g"))];
      ui.det.sel[g.grupo] = t.getAttribute("data-o");
      refreshDetail();
    }
    else if (act === "dqty") {
      ui.det.qty = Math.max(1, Math.min(50, ui.det.qty + Number(t.getAttribute("data-d"))));
      refreshDetail();
    }
    else if (act === "add") {
      addFromDetail();
    }
    else if (act === "lqty") {
      var li = Number(t.getAttribute("data-i"));
      var l = S.cart[li];
      l.qty += Number(t.getAttribute("data-d"));
      if (l.qty <= 0) { removeLine(li); return; }
      saveCart();
      render({ anim: false });
    }
    else if (act === "rm") {
      removeLine(Number(t.getAttribute("data-i")));
    }
    else if (act === "undo") {
      if (ui.lastRemoved) {
        S.cart.splice(Math.min(ui.lastRemoved.i, S.cart.length), 0, ui.lastRemoved.l);
        ui.lastRemoved = null;
        saveCart();
        render({ anim: false });
        $("#toast").classList.remove("show");
      }
    }
    else if (act === "vaciar") {
      if (confirm("¿Vaciar todo el pedido?")) {
        S.cart = [];
        saveCart();
        render({ anim: false });
        toast("Pedido vacío");
      }
    }
    else if (act === "modalidad") {
      S.pedido.modalidad = t.getAttribute("data-v");
      if (S.pedido.pago === "pos" && S.pedido.modalidad === "mesa") S.pedido.pago = "";
      delete ui.invalid.modalidad;
      save("rc_pedido", S.pedido);
      render({ anim: false });
      var f2 = S.pedido.modalidad === "delivery" ? $("#dir") : S.pedido.modalidad === "mesa" && !S.pedido.mesa ? $("#mesa") : null;
      if (f2 && !f2.value) f2.focus({ preventScroll: true });
    }
    else if (act === "pago") {
      S.pedido.pago = t.getAttribute("data-v");
      delete ui.invalid.pago;
      save("rc_pedido", S.pedido);
      render({ anim: false });
    }
    else if (act === "cancelar") {
      var pid = t.getAttribute("data-pid"), mios = load("rc_mis_pedidos", []);
      var ped = mios.filter(function (x) { return x.id === pid; })[0];
      if (!ped || t.getAttribute("data-ok") !== "1") { t.setAttribute("data-ok", "1"); t.innerHTML = ic("x") + " Tocá de nuevo para confirmar"; return; }
      t.disabled = true;
      Pedidos.cancelar(ped).then(function () {
        save("rc_mis_pedidos", mios.map(function (x) { return x.id === pid ? Object.assign({}, x, { cancelado: true }) : x; }));
        render({ anim: false }); toast("Cancelamos tu pedido #" + (ped.num || ""));
      }, function (err) {
        render({ anim: false });
        toast(err && err.tarde ? "Ya lo están preparando: no se puede cancelar" : "No se pudo cancelar. Probá de nuevo", 4000);
      });
    }
    else if (act === "repetir") {
      repetirPedido(t.getAttribute("data-pid"));
    }
    else if (act === "upsell-add") {
      e.preventDefault();
      upsellAdd(id, t);
    }
    else if (act === "sheet-close") {
      cerrarSheet();
    }
    else if (act === "sheet-close-nav") {
      cerrarSheet();
    }
    else if (act === "enviar") {
      enviar();
    }
  });

  function removeLine(i) {
    var l = S.cart.splice(i, 1)[0];
    ui.lastRemoved = { i: i, l: l };
    saveCart();
    render({ anim: false });
    toast("Quitamos " + esc(BY_ID[l.id].nombre) + ' · <button data-act="undo" style="color:#D9C38A;font-weight:700">Deshacer</button>', 4500);
  }

  function refreshRow(id) {
    $$('[data-row="' + id + '"] .stepper').forEach(function (s) { s.outerHTML = stepper(BY_ID[id]); });
  }

  /* ---------- Ventas cruzadas ---------- */
  function enPedido(id) { return S.cart.some(function (l) { return l.id === id; }); }
  function sugerirPara(cat, excluir, max) {
    var r = VENTA_CRUZADA[cat];
    if (!r) return null;
    var items = r.sugerir.map(function (id) { return BY_ID[id]; }).filter(function (p) {
      return p && p.disponible && p.id !== excluir && !enPedido(p.id);
    }).slice(0, max || 4);
    return items.length ? { titulo: r.titulo, items: items } : null;
  }
  function sugerirPedido() {
    var cats = {};
    S.cart.forEach(function (l) { cats[BY_ID[l.id].categoria] = true; });
    var orden = [];
    if ((cats.cocina || cats.entradas) && !cats.bebidas) orden.push(cats.cocina ? "cocina" : "entradas");
    if (cats.desayunos && !cats.cafeteria) orden.push("desayunos");
    if (cats.cafeteria && !cats.desayunos && !cats.cocina) orden.push("cafeteria");
    if (cats.bebidas && Object.keys(cats).length === 1) orden.push("bebidas");
    for (var i = 0; i < orden.length; i++) { var r = sugerirPara(orden[i], null, 6); if (r) return r; }
    return null;
  }
  function miniCard(p) {
    var added = enPedido(p.id);
    return '<div class="mini">' +
      '<a class="mini-link" href="#/producto/' + p.id + '" data-act="sheet-close-nav"><span class="' + photoCls(p) + '"' + lq(p) + '>' + media(p, "sm") + "</span>" +
      '<span class="mini-txt"><b>' + esc(p.nombre) + '</b><span class="price">' + fmt(p.precio) + "</span></span></a>" +
      '<button class="round-add' + (added ? " done" : "") + '" data-act="upsell-add" data-id="' + p.id + '" aria-label="Sumar ' + esc(p.nombre) + '">' + ic(added ? "check" : "plus") + "</button></div>";
  }
  function upsellBlock(r, cls) {
    if (!r) return "";
    return '<section class="upsell ' + (cls || "") + '"><h3>' + esc(r.titulo) + '</h3><div class="mini-row">' + r.items.map(miniCard).join("") + "</div></section>";
  }
  function cerrarSheet() {
    var root = $("#modal-root"), sh = $(".sheet", root);
    if (!sh) return;
    if (root._off) root._off();
    sh.classList.add("out"); $(".sheet-backdrop", root).classList.add("out");
    setTimeout(function () { if ($(".sheet.out", root)) root.innerHTML = ""; }, 220);
  }
  function upsellAdd(id, btn) {
    var p = BY_ID[id];
    if (!p) return;
    if (p.opciones.length) { cerrarSheet(); ir("#/producto/" + id); return; }
    ensureAdult(p).then(function (ok) {
      if (!ok) return;
      addLine(id, {}, "", 1);
      if (btn) { btn.classList.add("done"); btn.innerHTML = ic("check"); }
      toast("Sumamos " + esc(p.nombre));
      if (current && current.name === "pedido" && !$(".sheet")) render({ anim: false });
    });
  }

  // El producto "vuela" al carrito
  function volarAlCarrito(desde, p) {
    try {
      if (!desde || !desde.getBoundingClientRect) return;
      var destino = $(".tabbar a[href='#/pedido']") || $(".header a[href='#/pedido']");
      if (!destino) return;
      var a = desde.getBoundingClientRect(), d = destino.getBoundingClientRect();
      var el = document.createElement("div"); el.className = "vuela";
      var src = p.foto ? fotoURL(p.foto).replace(/^fotos\//, "fotos/sm/") : "";
      if (src) el.style.backgroundImage = "url(" + src + ")"; else el.style.background = "var(--logo-gold)";
      el.style.left = (a.left + a.width / 2 - 28) + "px"; el.style.top = (a.top + a.height / 2 - 28) + "px";
      document.body.appendChild(el);
      requestAnimationFrame(function () {
        el.style.transform = "translate(" + (d.left + d.width / 2 - a.left - a.width / 2) + "px," + (d.top + d.height / 2 - a.top - a.height / 2) + "px) scale(.25)";
        el.style.opacity = ".2";
      });
      setTimeout(function () { el.remove(); destino.classList.remove("salta"); void destino.offsetWidth; destino.classList.add("salta"); }, 640);
    } catch (e) { /* */ }
  }
  function quickAdd(id, boton) {
    var p = BY_ID[id];
    if (!p || !p.disponible) return;
    if (p.opciones.length) {
      ir("#/producto/" + id);
      toast("Elegí " + p.opciones.map(function (g) { return g.grupo.toLowerCase(); }).join(" y ") + " para agregarlo");
      return;
    }
    ensureAdult(p).then(function (ok) {
      if (!ok) return;
      addLine(id, {}, "", 1);
      volarAlCarrito(boton, p);
      refreshRow(id);
      toast("Sumamos " + esc(p.nombre) + ' · <a href="#/pedido">Ver pedido</a>');
    });
  }

  function addFromDetail() {
    var p = BY_ID[ui.det.id];
    if (!p.disponible) return;
    var missing = detMissing();
    if (missing.length) {
      ui.det.tried = true;
      refreshDetail();
      var gi = p.opciones.indexOf(missing[0]);
      var box = $('[data-group="' + gi + '"]');
      if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Elegí " + missing.map(function (g) { return g.grupo.toLowerCase(); }).join(" y "));
      return;
    }
    ensureAdult(p).then(function (ok) {
      if (!ok) return;
      var nota = ($("#nota") || {}).value || "";
      addLine(p.id, JSON.parse(JSON.stringify(ui.det.sel)), nota, ui.det.qty);
      var qty = ui.det.qty;
      ui.det = null;
      goBack("#/categoria/" + p.categoria);
      toast((qty > 1 ? qty + " × " : "") + esc(p.nombre) + ' al pedido · <a href="#/pedido">Ver pedido</a>');
    });
  }

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "q") {
      ui.q = t.value;
      $("#home-dyn").innerHTML = homeDyn();
      var cl = $("[data-act=clear-q].clear"); if (cl) cl.hidden = !ui.q;
    } else if (t.id === "nota" && ui.det) {
      ui.det.nota = t.value;
    } else if (t.hasAttribute("data-field")) {
      S.pedido[t.getAttribute("data-field")] = t.value;
      save("rc_pedido", S.pedido);
      if (t.classList.contains("invalid") && t.value.trim()) { t.classList.remove("invalid"); delete ui.invalid[t.getAttribute("data-field")]; }
      if (current && current.name === "pedido") { $("#cta-root").innerHTML = pedidoCTA(); }
    }
  });
  document.addEventListener("submit", function (e) {
    if (e.target.getAttribute("data-form") === "search") {
      e.preventDefault();
      var q = $("#q"); if (q) q.blur();
    }
  });
  document.addEventListener("toggle", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-acc")) ui.accOpen = e.target.open;
  }, true);

  // El encabezado se esconde al bajar y vuelve apenas subís
  var lastY = 0, acc = 0;
  function onScroll() {
    var h = $(".header");
    var y = Math.max(0, window.scrollY), dy = y - lastY;
    lastY = y;
    if (!h) return;
    h.classList.toggle("scrolled", y > 8);
    if (y < 80 || h.classList.contains("adm-header")) { h.classList.remove("hidden-up"); acc = 0; return; }
    if ((dy > 0) !== (acc > 0)) acc = 0;
    acc += dy;
    if (acc > 70) h.classList.add("hidden-up");
    else if (acc < -12) h.classList.remove("hidden-up");
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  // Actualizar "Abierto ahora / Cerrado" cada minuto
  setInterval(function () {
    if (current && current.name === "local" && $("#status")) $("#status").outerHTML = statusCard();
  }, 60000);

  // Sincronizar carrito entre pestañas
  window.addEventListener("storage", function (e) {
    if (e.key === "rc_cart" || e.key === "rc_favs") {
      S.cart = load("rc_cart", []).filter(function (l) { return BY_ID[l.id]; });
      S.favs = load("rc_favs", []).filter(function (id) { return BY_ID[id]; });
      render({ anim: false });
    }
  });

  /* ---------- Pedidos y su estado ---------- */
  var ESTADOS = [
    ["recibido", "Recibido", "Lo recibimos. Podés cancelarlo hasta que empecemos a prepararlo."],
    ["preparando", "En preparación", "Lo estamos preparando"],
    ["enviado", "Enviado", "¡Ya va para vos!"],
    ["cancelado", "Cancelado", "Este pedido se canceló"]
  ];
  function estadoDe(o, delLocal) {
    var e = delLocal || "recibido";
    if (e === "listo" || e === "entregado") e = "enviado"; // estados viejos
    if (e === "recibido" && o.cancelado) e = "cancelado";
    return e;
  }
  function textoEnviado(o) { return { delivery: "¡Ya salió para tu casa!", retiro: "¡Está pronto para retirar!", mesa: "¡Ya va para tu mesa!" }[o.modalidad] || "¡Ya va para vos!"; }
  function waLink(texto, etiqueta, cls) {
    return '<a class="wa-link' + (cls ? " " + cls : "") + '" href="https://wa.me/' + LOCAL.whatsapp + "?text=" + encodeURIComponent(texto) + '">' + ic("whatsapp") + "<span>" + etiqueta + "</span></a>";
  }
  function nombreEstado(e, largo) { var x = ESTADOS.filter(function (z) { return z[0] === e; })[0] || ESTADOS[0]; return largo ? x[2] : x[1]; }
  function armarPedido() {
    var P = S.pedido;
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      num: String(Math.floor(1000 + Math.random() * 9000)),
      fecha: new Date().toISOString(),
      items: S.cart.map(function (l) { var p = BY_ID[l.id]; return { id: l.id, nombre: p.nombre, qty: l.qty, sel: l.sel || {}, nota: l.nota || "", unit: unitPrice(l) }; }),
      total: cartTotal(), modalidad: P.modalidad, direccion: P.modalidad === "delivery" ? P.direccion.trim() : "",
      mesa: P.modalidad === "mesa" ? P.mesa.trim() : "", pago: P.pago, nombre: P.nombre.trim(),
      telefono: P.modalidad === "delivery" ? (P.telefono || "").trim() : ""
    };
  }
  function misPedidosHTML() {
    var hace = Date.now() - 36 * 3600 * 1000;
    var mios = load("rc_mis_pedidos", []).filter(function (o) { return Date.parse(o.fecha) > hace; }).reverse();
    if (!mios.length) return "";
    var st = Pedidos.misEstados || {};
    return '<section class="mis-pedidos"><h3>Tus pedidos</h3>' + mios.map(function (o) {
      var e = estadoDe(o, st[o.id]), hora = new Date(o.fecha).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", timeZone: LOCAL.zonaHoraria });
      var paso = ["recibido", "preparando", "enviado"].indexOf(e);
      return '<article class="pedido-card est-' + e + '"><div class="pc-head"><b>' + (o.num ? "#" + o.num + " · " : "") + hora + " · " + esc({ delivery: "Delivery", retiro: "Retiro", mesa: "Mesa " + o.mesa }[o.modalidad] || "") + "</b>" +
        '<span class="estado est-' + e + '">' + nombreEstado(e) + "</span></div>" +
        (e !== "cancelado" ? '<div class="pasos">' + [0, 1, 2].map(function (i) { return '<i class="' + (i <= paso ? "on" : "") + '"></i>'; }).join("") + "</div>" : "") +
        '<p class="pc-msg">' + (e === "enviado" ? textoEnviado(o) : nombreEstado(e, true)) + "</p>" +
        '<p class="pc-items">' + o.items.map(function (i) { return i.qty + " × " + esc(i.nombre); }).join(" · ") + "</p>" +
        '<div class="pc-foot"><span class="price">' + fmt(o.total) + "</span>" +
        (e === "recibido" ? '<button class="link pc-cancel" data-act="cancelar" data-pid="' + o.id + '">' + ic("x") + " Cancelar pedido</button>"
          : '<button class="link" data-act="repetir" data-pid="' + o.id + '">' + ic("plus") + " Volver a pedir</button>") + "</div>" +
        (e !== "cancelado" ? waLink("Hola, Rinconcito. Consulto por mi pedido #" + (o.num || "") + (o.nombre ? " (a nombre de " + o.nombre + ")" : "") + ".", "¿Dudas con tu pedido? Escribinos", "pc-wa-link") : "") +
        "</article>";
    }).join("") + '<span class="marca-agua">' + sello(150) + "</span></section>";
  }
  function repetirPedido(pid) {
    var o = load("rc_mis_pedidos", []).filter(function (x) { return x.id === pid; })[0];
    if (!o) return;
    o.items.forEach(function (i) { if (BY_ID[i.id] && BY_ID[i.id].disponible) addLine(i.id, i.sel, i.nota, i.qty); });
    render({ anim: false }); toast("Lo sumamos de nuevo al pedido");
  }
  // Guarda pedidos en la base de la página (Claude) o, sin ella, en este dispositivo (modo prueba)
  var Pedidos = {
    misEstados: {}, conEstado: false, uid: null,
    registrar: function (o) {
      if (NUBE.db) {
        if (!Pedidos.uid) return Promise.reject({ sinPermiso: true });
        var ref = NUBE.db.doc("pedidos/" + Pedidos.uid);
        return ref.get().then(function (snap) {
          var lista = (snap.exists && snap.data().lista) || [];
          return ref.set({ lista: lista.concat([o]).slice(-30), actualizado: o.fecha });
        }).catch(function (e) { throw (e && e.code === "invalid_argument") ? { sinPermiso: true } : e; });
      }
      if (NUBE.estado !== "local") return Promise.reject({ sinPermiso: true });
      var all = load("rc_pedidos_local", []); all.push(Object.assign({ uid: "este-dispositivo" }, o)); save("rc_pedidos_local", all.slice(-100));
      Pedidos.conEstado = true;
      return Promise.resolve();
    },
    escucharMios: function () {
      if (NUBE.db && Pedidos.uid) {
        return NUBE.db.doc("estados/" + Pedidos.uid).onSnapshot(function (snap) {
          Pedidos.misEstados = snap.exists ? snap.data() : {}; Pedidos.conEstado = true;
          if (current && current.name === "pedido") render({ anim: false });
        }, function () {});
      } else if (!NUBE.db) { Pedidos.misEstados = load("rc_estados_local", {}); Pedidos.conEstado = true; }
    },
    // panel: todos los pedidos (cb recibe una lista)
    // el cliente cancela: solo si el local todavía no lo pasó a "En preparación"
    cancelar: function (o) {
      var marcar = function (lista) { return lista.map(function (x) { return x.id === o.id ? Object.assign({}, x, { cancelado: true }) : x; }); };
      if (NUBE.db && Pedidos.uid) {
        var ref = NUBE.db.doc("pedidos/" + Pedidos.uid);
        return NUBE.db.doc("estados/" + Pedidos.uid).get().then(function (st) {
          var e = st.exists ? (st.data() || {})[o.id] : null;
          if (e && e !== "recibido") throw { tarde: true };
          return ref.get();
        }).then(function (snap) {
          var lista = (snap.exists && snap.data().lista) || [];
          return ref.set({ lista: marcar(lista), actualizado: new Date().toISOString() });
        });
      }
      if (NUBE.estado !== "local") return Promise.reject({});
      var e0 = load("rc_estados_local", {})[o.id];
      if (e0 && e0 !== "recibido") return Promise.reject({ tarde: true });
      save("rc_pedidos_local", marcar(load("rc_pedidos_local", [])));
      return Promise.resolve();
    },
    escucharTodos: function (cb) {
      if (NUBE.db) {
        var docs = {}, est = {}, emitir = function () {
          var out = [];
          Object.keys(docs).forEach(function (uid) { (docs[uid].lista || []).forEach(function (o) { out.push(Object.assign({ uid: uid }, o, { estado: estadoDe(o, (est[uid] || {})[o.id]) })); }); });
          cb(out.sort(function (a, b) { return a.fecha < b.fecha ? 1 : -1; }));
        };
        var u1 = NUBE.db.collection("pedidos").onSnapshot(function (q) { docs = {}; q.docs.forEach(function (d) { docs[d.id] = d.data(); }); emitir(); }, function () { cb(null); });
        var u2 = NUBE.db.collection("estados").onSnapshot(function (q) { est = {}; q.docs.forEach(function (d) { est[d.id] = d.data(); }); emitir(); }, function () {});
        return function () { u1(); u2(); };
      }
      var est0 = load("rc_estados_local", {});
      cb(load("rc_pedidos_local", []).map(function (o) { return Object.assign({}, o, { estado: estadoDe(o, est0[o.id]) }); }).reverse());
      return function () {};
    },
    cambiarEstado: function (o, estado) {
      if (NUBE.db) {
        var ref = NUBE.db.doc("estados/" + o.uid);
        return ref.get().then(function (snap) { var d = Object.assign({}, snap.exists ? snap.data() : {}); d[o.id] = estado; return ref.set(d); });
      }
      var e = load("rc_estados_local", {}); e[o.id] = estado; save("rc_estados_local", e); Pedidos.misEstados = e;
      return Promise.resolve();
    }
  };

  /* ---------- Datos compartidos (panel de administración) ---------- */
  var EN_CLAUDE = !!(window.claude && window.claude.use);
  // Fuera de Claude: servidor propio (server.js, p. ej. en Railway) si responde; si no, Firebase si está configurado; si no, modo prueba
  var FUERA = !EN_CLAUDE && location.protocol.indexOf("http") === 0 && !!window.RCServidor;
  var CON_FIREBASE = !EN_CLAUDE && !!window.FIREBASE_CONFIG;
  var NUBE = { db: null, user: null, editor: null, estado: EN_CLAUDE || FUERA || CON_FIREBASE ? "conectando" : "local", ref: null, modo: EN_CLAUDE ? "claude" : FUERA || CON_FIREBASE ? "web" : "local", soloClave: false };
  function puedeAdministrar() { return NUBE.editor === true || NUBE.estado === "local"; }
  function enAdminConCambios() { return current && current.name === "admin" && window.RCAdmin && window.RCAdmin.sucio(); }
  function alRecibirAjustes(a) {
    aplicarAjustes(a);
    S.cart = S.cart.filter(function (l) { return BY_ID[l.id]; });
    if (enAdminConCambios()) { window.RCAdmin.nuevaBase(); return; }
    render({ anim: false });
  }
  function conectarNube() {
    if (FUERA) return probarServidor();
    if (CON_FIREBASE) return conectarFirebase();
    // Fuera de Claude (o sin sesión): modo prueba guardado en este dispositivo
    var local = load("rc_ajustes_local", null);
    if (!window.claude || typeof window.claude.use !== "function") { if (local) alRecibirAjustes(local); Pedidos.escucharMios(); return; }
    NUBE.estado = "conectando";
    Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
      NUBE.db = r[0]; NUBE.user = r[1];
      if (!NUBE.db) { NUBE.estado = "sin-cuenta"; render({ anim: false }); return; }
      NUBE.estado = "nube";
      NUBE.ref = NUBE.db.doc("carta/ajustes");
      NUBE.ref.onSnapshot(function (snap) { alRecibirAjustes(snap.exists ? snap.data() : null); },
        function () { NUBE.estado = "error"; render({ anim: false }); });
      var u = NUBE.user;
      if (u && u.id) Promise.resolve(u.id()).then(function (id) { if (id) { Pedidos.uid = id; Pedidos.escucharMios(); } });
      Promise.resolve(u ? (u.canEdit ? u.canEdit() : (u.isOwner ? u.isOwner() : false)) : false).then(function (ok) {
        NUBE.editor = !!ok; render({ anim: false });
      });
    }).catch(function () { NUBE.estado = "sin-cuenta"; });
  }
  /* ---------- Firebase (cuando la carta está publicada fuera de Claude) ---------- */
  var FB = null;
  function cargarScript(src) {
    return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  function probarServidor() {
    fetch("/api/yo", { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function () {
      NUBE.soloClave = true;
      iniciarNube(window.RCServidor());
    }, function () {
      if (CON_FIREBASE) return conectarFirebase();
      NUBE.estado = "local"; NUBE.modo = "local";
      var local = load("rc_ajustes_local", null); if (local) alRecibirAjustes(local);
      Pedidos.escucharMios(); render({ anim: false });
    });
  }
  function conectarFirebase() {
    var V = "https://www.gstatic.com/firebasejs/10.14.1/";
    cargarScript(V + "firebase-app-compat.js")
      .then(function () { return Promise.all([cargarScript(V + "firebase-auth-compat.js"), cargarScript(V + "firebase-firestore-compat.js")]); })
      .then(function () {
        var app = firebase.initializeApp(window.FIREBASE_CONFIG);
        iniciarNube({ auth: app.auth(), db: app.firestore() });
      })
      .catch(function () { NUBE.estado = "error"; render({ anim: false }); });
  }
  function iniciarNube(sdk) {
        FB = sdk;
        NUBE.db = FB.db;
        NUBE.ref = FB.db.doc("carta/ajustes");
        NUBE.ref.onSnapshot(function (snap) { NUBE.estado = "nube"; alRecibirAjustes(snap.exists ? snap.data() : null); },
          function () { NUBE.estado = "error"; render({ anim: false }); });
        FB.db.collection("fotos").onSnapshot(function (q) {
          q.docs.forEach(function (d) { FOTOS_FS[d.id] = d.data().src; });
          alRecibirAjustes(AJUSTES);
        }, function () {});
        var cortarMios = null;
        FB.auth.onAuthStateChanged(function (u) {
          if (!u) { FB.auth.signInAnonymously().catch(function () { NUBE.estado = "error"; render({ anim: false }); }); return; }
          Pedidos.uid = u.uid;
          NUBE.editor = !u.isAnonymous;   // la seguridad real está en firestore.rules (solo el UID del dueño)
          if (cortarMios) cortarMios();
          cortarMios = Pedidos.escucharMios();
          render({ anim: false });
        });
  }
  function fbLogin(email, pass) { return FB ? FB.auth.signInWithEmailAndPassword(email, pass) : Promise.reject({}); }
  function fbLogout() { if (FB) FB.auth.signOut().then(function () { toast("Sesión cerrada"); ir("#/local"); }); }
  // Foto subida desde el panel: se guarda achicada en la colección "fotos" (sin necesidad de Storage pago)
  function fbSubirFoto(canvas) {
    var c = document.createElement("canvas"), lado = Math.min(720, canvas.width);
    c.width = c.height = lado; c.getContext("2d").drawImage(canvas, 0, 0, lado, lado);
    var src = c.toDataURL("image/webp", .78);
    if (src.indexOf("data:image/webp") !== 0) src = c.toDataURL("image/jpeg", .78);
    var ref = FB.db.collection("fotos").doc();
    return ref.set({ src: src, fecha: new Date().toISOString() }).then(function () { FOTOS_FS[ref.id] = src; return "fs:" + ref.id; });
  }
  function guardarAjustes(a) {
    a = JSON.parse(JSON.stringify(a || {}));
    a.actualizado = new Date().toISOString();
    if (NUBE.ref) return NUBE.ref.set(a).then(function () { alRecibirAjustes(a); });
    save("rc_ajustes_local", a);
    alRecibirAjustes(a);
    return Promise.resolve();
  }
  var API = {
    base: function () { return BASE; }, ajustes: function () { return AJUSTES; }, local: function () { return LOCAL_BASE; },
    categorias: CATEGORIAS, filtros: FILTROS.concat(["+18"]), guardar: guardarAjustes, nube: NUBE,
    puede: puedeAdministrar, fmt: fmt, esc: esc, ic: ic, miles: miles, lq: function (p) { return lq(p); },
    media: function (p) { return media(p, "sm"); }, pedidos: Pedidos, estados: ESTADOS, zona: function () { return LOCAL.zonaHoraria; },
    assets: function () {
      if (FB) return Promise.resolve({ subirFoto: fbSubirFoto });
      return EN_CLAUDE ? window.claude.use("assets") : Promise.resolve(null);
    },
    login: fbLogin, logout: fbLogout, photoCls: photoCls, toast: toast, render: function () { render({ anim: false }); }
  };

  /* ---------- Arranque ---------- */
  // Se muestra al instante; las fotos tienen su propio esqueleto mientras cargan.
  ui.ready = true;
  render();
  conectarNube();
  // Precargar en segundo plano las fotos de más abajo (recomendados y listados)
  (function precargar() {
    var go = function () {
      var urls = [];
      PRODUCTOS.forEach(function (p) { if (p.destacado && p.recorte) urls.push(p.recorte); });
      ordenar(PRODUCTOS).forEach(function (p) { if (p.foto) urls.push(fotoURL(p.foto).replace(/^fotos\//, "fotos/sm/").replace(/\.(jpe?g|png)$/i, ".webp")); });
      var i = 0;
      (function siguiente() {
        for (var k = 0; k < 4 && i < urls.length; k++, i++) { var im = new Image(); im.decoding = "async"; im.src = urls[i]; }
        if (i < urls.length) setTimeout(siguiente, 120);
      })();
    };
    if (document.readyState === "complete") setTimeout(go, 300); else window.addEventListener("load", function () { setTimeout(go, 300); });
  })();
})();
